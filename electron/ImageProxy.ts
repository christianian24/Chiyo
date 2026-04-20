import { protocol, net, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

interface MemoryCacheEntry {
  buffer: Buffer;
  expiresAt: number;
  contentType: string;
}

// 2-Level Cache Store
const memoryCache = new Map<string, MemoryCacheEntry>();
const userDataPath = app.getPath('userData');
const cacheDir = path.join(userDataPath, 'image-cache');
const DISK_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MEMORY_ENTRIES = 100;

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function getCachePaths(imageUrl: string) {
  const hash = crypto.createHash('sha256').update(imageUrl).digest('hex');
  return {
    dataPath: path.join(cacheDir, `${hash}.bin`),
    metaPath: path.join(cacheDir, `${hash}.json`)
  };
}

function pruneMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }

  while (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
}

/**
 * Image Proxy with 2-Level Caching (Mihon-style)
 * 1. Memory Cache (LRU-like via Map)
 * 2. Disk Cache (Persistent sha256 hashed files)
 * 3. Network Fallback
 */
export function setupImageProxy() {
  protocol.handle('chiyo-proxy', async (request) => {
    try {
      const urlObj = new URL(request.url);
      const imageUrl = urlObj.searchParams.get('url');
      const referer = urlObj.searchParams.get('referer');

      if (!imageUrl) return new Response('Missing URL', { status: 400 });

      const parsedImageUrl = new URL(imageUrl);
      if (parsedImageUrl.protocol !== 'http:' && parsedImageUrl.protocol !== 'https:') {
        return new Response('Invalid protocol', { status: 400 });
      }

      // 1. Memory Cache Hit
      const now = Date.now();
      const cachedEntry = memoryCache.get(imageUrl);
      if (cachedEntry && cachedEntry.expiresAt > now) {
        return new Response(new Uint8Array(cachedEntry.buffer), {
          headers: {
            'content-type': cachedEntry.contentType,
            'cache-control': 'public, max-age=31536000'
          }
        });
      }
      if (cachedEntry && cachedEntry.expiresAt <= now) memoryCache.delete(imageUrl);

      // 2. Disk Cache Hit
      const { dataPath, metaPath } = getCachePaths(imageUrl);

      if (fs.existsSync(dataPath) && fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { expiresAt: number; contentType?: string };
          if (meta.expiresAt > now) {
            const diskData = fs.readFileSync(dataPath);
            const contentType = meta.contentType || 'image/jpeg';
            memoryCache.set(imageUrl, { buffer: diskData, expiresAt: meta.expiresAt, contentType });
            pruneMemoryCache();
            return new Response(new Uint8Array(diskData), {
              headers: {
                'content-type': contentType,
                'cache-control': 'public, max-age=31536000'
              }
            });
          }
        } catch (e) {
          console.warn('ImageProxy: Corrupt cache metadata, refetching', e);
        }

        fs.rmSync(dataPath, { force: true });
        fs.rmSync(metaPath, { force: true });
      }

      // 3. Network Fetch
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (referer) headers['Referer'] = referer;

      const response = await net.fetch(parsedImageUrl.toString(), {
        headers,
        bypassCustomProtocolHandlers: true
      });

      if (!response.ok) return response;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const expiresAt = Date.now() + DISK_TTL_MS;

      // Save to caches
      memoryCache.set(imageUrl, { buffer, expiresAt, contentType });
      pruneMemoryCache();
      
      // Async write to disk to avoid blocking the response
      fs.writeFile(dataPath, buffer, (err) => {
        if (err) console.error('ImageProxy: Disk cache write failed', err);
      });
      fs.writeFile(metaPath, JSON.stringify({ expiresAt, contentType }), (err) => {
        if (err) console.error('ImageProxy: Metadata cache write failed', err);
      });

      return new Response(new Uint8Array(buffer), {
        headers: {
          'content-type': contentType,
          'cache-control': 'public, max-age=31536000'
        }
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
}
