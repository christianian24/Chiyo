import { MangaSource } from '../src/sources/types';

interface CacheEntry {
  data: any;
  expiry: number;
}

export class SourceManager {
  private cache: Map<string, CacheEntry> = new Map();
  private sources: Map<string, MangaSource> = new Map();
  private pruneTimer: NodeJS.Timeout;

  constructor() {
    this.pruneTimer = setInterval(() => this.pruneCache(), 30 * 60 * 1000);
  }

  registerSource(source: MangaSource) {
    this.sources.set(source.id, source);
    console.log(`SourceManager: Registered source ${source.name} (${source.id})`);
  }

  getSource(id: string): MangaSource | undefined {
    return this.sources.get(id);
  }

  // Caching with logic
  async getOrFetch<T>(sourceId: string, mangaId: string, type: 'search' | 'details' | 'chapters' | 'pages', id: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.getCache(sourceId, mangaId, type, id);
    if (cached) return cached;

    const data = await fetcher();
    if (!(data as any)?.__stale) {
      this.setCache(sourceId, mangaId, type, id, data);
    }
    return data;
  }

  private getCacheKey(sourceId: string, mangaId: string, type: string, id: string = ''): string {
    return `${sourceId}:${mangaId}:${type}:${id}`;
  }

  setCache(sourceId: string, mangaId: string, type: 'search' | 'details' | 'chapters' | 'pages', id: string, data: any) {
    if (data?.__stale) return;

    let ttl = 0;
    switch (type) {
      case 'search': ttl = 60 * 60 * 1000; break;
      case 'details': ttl = 60 * 60 * 1000; break;
      case 'chapters': ttl = 10 * 60 * 1000; break;
      case 'pages': ttl = 24 * 60 * 60 * 1000; break;
    }

    const key = this.getCacheKey(sourceId, mangaId, type, id);
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  getCache(sourceId: string, mangaId: string, type: string, id: string = ''): any | null {
    const key = this.getCacheKey(sourceId, mangaId, type, id);
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.expiry) {
      if (entry) this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private pruneCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) this.cache.delete(key);
    }
  }

  destroy() {
    clearInterval(this.pruneTimer);
  }
}
