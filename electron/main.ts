import { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initDatabase, mangaQueries, performBackup, getBackupStats, closeDatabase } from '../db/index'
import AdmZip from 'adm-zip'
import { saveCoverImage, deleteCoverImage, getCoverPath } from '../storage/imageHandler'
import { BrowserManager } from './BrowserManager'
import { setupImageProxy } from './ImageProxy'
import { SourceManager } from './SourceManager'
import { MangaBuddy } from '../sources/MangaBuddy'
import { genresToString, processGenresFromUnknown } from '../src/utils/genres'

// --- DIAGNOSTICS [DETERMINISTIC] ---
console.log('--- Startup Diagnostics ---');
console.log('Electron Version:', process.versions.electron);
console.log('Node Version:', process.versions.node);
console.log('Module ABI (NODE_MODULE_VERSION):', process.versions.modules);
console.log('Architecture:', process.arch);
console.log('Platform:', process.platform);
console.log('---------------------------');

Menu.setApplicationMenu(null);

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Register custom protocol for local assets
protocol.registerSchemesAsPrivileged([
  { scheme: 'chiyo-asset', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  { scheme: 'chiyo-proxy', privileges: { secure: true, standard: true, supportFetchAPI: true } }
])

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let browserManager: BrowserManager | null
let sourceManager: SourceManager = new SourceManager()
let isRefreshingAllCovers = false;
let isRefreshingAllData = false;
type AppWindowSizePreset = 'default' | '800x1024';
const SOURCE_SESSION_PARTITION = 'persist:chiyo-sources';
const SOURCE_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function hydrateMangaGenres<T extends Record<string, any>>(row: T): T {
  const rawGenres = typeof row?.genres === 'string' ? row.genres : '';
  return {
    ...row,
    rawGenres,
    genres: processGenresFromUnknown(rawGenres)
  };
}

function inferFormatFromGenres(genres: string[], currentFormat?: string): string {
  const set = new Set(genres.map((g) => g.toLowerCase()));
  if (set.has('webtoon') || set.has('webtoons')) return 'Webtoon';
  if (set.has('manhwa')) return 'Manhwa';
  if (set.has('manhua')) return 'Manhua';
  if (set.has('light novel')) return 'Light Novel';
  if (set.has('one-shot') || set.has('oneshot')) return 'One-shot';
  if (set.has('manga')) return 'Manga';
  return currentFormat || '';
}

function resolveAppWindowSizePreset(rawPreset: unknown): { preset: AppWindowSizePreset; width: number; height: number } {
  if (rawPreset === '800x1024') {
    return { preset: '800x1024', width: 800, height: 1024 };
  }
  return { preset: 'default', width: 1400, height: 900 };
}

async function refreshAllCoversSafeMode() {
  if (isRefreshingAllCovers) {
    console.log('Main: Cover refresh already running; skipping duplicate request.');
    return;
  }
  isRefreshingAllCovers = true;
  console.log('Main: Starting safe cover refresh job...');

  try {
    const mangas = mangaQueries.getAll() as any[];
    let checked = 0;
    let updated = 0;

    for (const row of mangas) {
      checked++;
      if (!row?.id_source || !row?.id_manga) continue;

      const source = sourceManager.getSource(row.id_source);
      if (!source) continue;

      // Per requirement: re-fetch metadata for each manga.
      const details = await source.getMangaDetails(row.id_manga);
      const fetchedRemote = ((details as any)?.coverUrl || '').trim();
      if (!fetchedRemote) continue;

      const needsRepair = !row.cover_path && !row.cover_remote_url;

      // Safe mode: only repair missing/invalid/placeholder cover records.
      if (!needsRepair) continue;

      let coverPath = '';
      try {
        coverPath = await saveCoverImage(fetchedRemote);
      } catch {
        coverPath = '';
      }

      mangaQueries.updateCovers(row.id, coverPath, fetchedRemote);
      updated++;
    }

    console.log(`Main: Safe cover refresh complete. Checked=${checked}, Updated=${updated}`);
  } catch (err) {
    console.error('Main: Safe cover refresh failed:', err);
  } finally {
    isRefreshingAllCovers = false;
  }
}

async function refreshAllMangaData() {
  if (isRefreshingAllData) {
    console.log('Main: Manga data refresh already running; skipping duplicate request.');
    return { started: false, running: true };
  }

  isRefreshingAllData = true;
  console.log('Main: Starting full manga data refresh job...');

  let checked = 0;
  let refreshed = 0;
  let failed = 0;

  try {
    const mangas = mangaQueries.getAll() as any[];

    for (const row of mangas) {
      if (!row?.id_source || !row?.id_manga) continue;
      checked++;

      const source = sourceManager.getSource(row.id_source);
      if (!source) {
        failed++;
        continue;
      }

      try {
        const [details, chapterList] = await Promise.all([
          source.getMangaDetails(row.id_manga),
          source.getChapters(row.id_manga)
        ]);

        const fetchedTitle = ((details as any)?.title || '').trim();
        const fetchedRemote = ((details as any)?.coverUrl || '').trim();
        const fetchedGenres = processGenresFromUnknown((details as any)?.genres);
        const fetchedStatus = ((details as any)?.status || '').trim();
        const inferredFormat = inferFormatFromGenres(fetchedGenres, row.format);
        const fetchedTotal = Array.isArray(chapterList) && chapterList.length > 0 ? chapterList.length : row.total_chapters;
        const chapterNumberById = new Map<string, number>();
        if (Array.isArray(chapterList)) {
          for (const chapter of chapterList as any[]) {
            if (!chapter?.id) continue;
            const n = Number(chapter.chapterNumber);
            if (Number.isFinite(n)) chapterNumberById.set(chapter.id, n);
          }
        }

        const chapterProgress = mangaQueries.getMangaProgress(row.id_source, row.id_manga) as any[];
        let inferredCurrentChapter = Number(row.current_chapter) || 0;
        if (Array.isArray(chapterProgress)) {
          for (const entry of chapterProgress) {
            const chapterNumber = chapterNumberById.get(entry.id_chapter);
            if (typeof chapterNumber !== 'number') continue;
            const hasReadSignal = Number(entry.current_page) > 0 || Number(entry.progress) > 0 || Number(entry.completed) === 1;
            if (hasReadSignal && chapterNumber > inferredCurrentChapter) {
              inferredCurrentChapter = chapterNumber;
            }
          }
        }

        mangaQueries.update({
          ...row,
          title: fetchedTitle || row.title,
          cover_remote_url: fetchedRemote || row.cover_remote_url || '',
          // Persist latest source genres so older library entries get backfilled.
          genres: fetchedGenres.length > 0 ? genresToString(fetchedGenres) : row.genres || '',
          format: inferredFormat,
          publishing_status: fetchedStatus || row.publishing_status || '',
          total_chapters: fetchedTotal,
          current_chapter: inferredCurrentChapter
        });

        refreshed++;
      } catch (err) {
        failed++;
        console.error(`Main: Failed refreshing manga ${row.id} (${row.title})`, err);
      }
    }

    console.log(`Main: Full manga data refresh complete. Checked=${checked}, Refreshed=${refreshed}, Failed=${failed}`);
    return { started: true, checked, refreshed, failed };
  } finally {
    isRefreshingAllData = false;
  }
}

function createScraperWindow() {
  const scraperWin = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: SOURCE_SESSION_PARTITION,
      offscreen: false, // Hidden but not offscreen to avoid some Cloudflare detection
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Isolated scraping context: keep renderer hardened while allowing
      // cross-site source fetches used by BrowserManager.
      webSecurity: false
    }
  })
  scraperWin.webContents.setUserAgent(SOURCE_BROWSER_UA)
  scraperWin.webContents.session.setUserAgent(SOURCE_BROWSER_UA, 'en-US,en;q=0.9')
  scraperWin.loadURL('about:blank')
  return scraperWin
}



function resolveAllowedAssetPath(rawPath: string): string | null {
  const coverPath = getCoverPath(path.basename(rawPath));
  const normalizedCoverPath = path.resolve(coverPath);
  const coversRoot = path.resolve(path.dirname(getCoverPath('placeholder')));
  const relativeToRoot = path.relative(coversRoot, normalizedCoverPath);

  // Only allow files within app-managed covers directory.
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return normalizedCoverPath;
}

function createWindow() {
  const savedPreset = (mangaQueries.getSetting('app_window_size_preset') as { value?: string } | undefined)?.value;
  const sizePreset = resolveAppWindowSizePreset(savedPreset);

  win = new BrowserWindow({
    width: sizePreset.width,
    height: sizePreset.height,
    minWidth: 800,
    minHeight: 700,
    show: false, // Prevent flicker
    icon: path.join(process.env.VITE_PUBLIC || '', 'logo.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    backgroundColor: '#0a0b0d',
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('closed', () => {
    win = null
  })
}

// --- SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  // Create myWindow, load the rest of the app, etc...
  app.whenReady().then(async () => {
    initDatabase()
    await cleanupOrphanedCovers() // Background cleanup

    // --- PROTOCOL HANDLER [DETERMINISTIC] ---
    protocol.handle('chiyo-asset', (request) => {
      try {
        const url = new URL(request.url)
        let decodedPath = ''
        if (url.hostname && url.hostname.length === 1) {
          decodedPath = decodeURIComponent(url.hostname + ':' + url.pathname)
        } else if (url.hostname) {
          decodedPath = decodeURIComponent(url.hostname + url.pathname)
        } else {
          decodedPath = decodeURIComponent(url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname)
        }
        if (decodedPath.endsWith('/') || decodedPath.endsWith('\\')) {
          decodedPath = decodedPath.slice(0, -1)
        }
        const normalizedPath = resolveAllowedAssetPath(decodedPath)
        if (!normalizedPath) {
          return new Response('Forbidden', { status: 403 })
        }

        if (!fs.existsSync(normalizedPath)) {
          return new Response('Not Found', { status: 404 })
        }

        return net.fetch(pathToFileURL(normalizedPath).toString())
      } catch (error) {
        return new Response('Error', { status: 500 })
      }
    })

    setupImageProxy()

    const scraperWin = createScraperWindow()
    browserManager = new BrowserManager(scraperWin, createScraperWindow)

    // Register sources
    sourceManager.registerSource(new MangaBuddy(browserManager))

    createWindow()
  })
}

// --- Global Exit Flush Management ---
let isFlushing = false;
let flushFinishedResolver: (() => void) | null = null;

ipcMain.handle('session:flush-finished', () => {
  if (flushFinishedResolver) {
    flushFinishedResolver();
    flushFinishedResolver = null;
  }
});

app.on('before-quit', async (e) => {
  if (isFlushing) return;
  
  const activeWindows = BrowserWindow.getAllWindows();
  if (activeWindows.length === 0) return;

  // Stop the quit process temporarily
  e.preventDefault();
  isFlushing = true;

  console.log('Main: Initiating global session flush before exit...');
  
  const flushPromise = new Promise<void>((resolve) => {
    flushFinishedResolver = resolve;
    // Broadcast flush request to all renderer processes
    activeWindows.forEach(w => {
      if (!w.isDestroyed()) w.webContents.send('session:flush-request');
    });
    
    // Hard timeout to prevent hang
    setTimeout(() => {
      console.warn('Main: Session flush timed out (2s)');
      resolve();
    }, 2000);
  });

  await flushPromise;
  console.log('Main: Flush complete or timed out. Terminating.');
  app.exit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    browserManager?.destroy()
    sourceManager.destroy()
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// --- Concurrency & Maintenance Logic ---

// Simple Async Mutex for per-manga operations
const locks = new Map<number | string, Promise<any>>();
async function withLock(id: number | string, op: () => Promise<any>) {
  while (locks.has(id)) await locks.get(id);
  const promise = (async () => {
    try {
      return await op();
    } finally {
      locks.delete(id);
    }
  })();
  locks.set(id, promise);
  return promise;
}

let lastCleanupResult = { orphanedDeleted: 0, checkedAt: null as string | null };

async function cleanupOrphanedCovers() {
  try {
    const userDataPath = app.getPath('userData');
    const coversPath = path.join(userDataPath, 'covers');
    if (!fs.existsSync(coversPath)) return;

    const files = fs.readdirSync(coversPath).filter(f => !f.endsWith('.tmp'));
    const lastResult = mangaQueries.getAll();
    const referencedFiles = new Set(lastResult.map((m: any) => m.cover_path).filter(Boolean));

    // Protect the profile avatar
    const avatar = mangaQueries.getSetting('avatar_path') as { value: string } | undefined;
    if (avatar?.value) {
      referencedFiles.add(avatar.value);
    }

    let deletedCount = 0;
    for (const file of files) {
      if (!referencedFiles.has(file)) {
        fs.unlinkSync(path.join(coversPath, file));
        deletedCount++;
      }
    }

    lastCleanupResult = { orphanedDeleted: deletedCount, checkedAt: new Date().toLocaleString() };
    console.log(`Maintenance: Deleted ${deletedCount} orphaned images.`);
  } catch (error) {
    console.error('Maintenance failed:', error);
  }
}

// --- IPC Handlers ---

ipcMain.handle('get-mangas', async () => {
  return (mangaQueries.getAll() as any[]).map(hydrateMangaGenres)
})

ipcMain.handle('get-maintenance-status', () => lastCleanupResult)
ipcMain.handle('manga:check-tracked', async (_, { id_source, id_manga }) => {
  const manga = mangaQueries.getBySourceInfo(id_source, id_manga) as any;
  if (!manga) return null;
  return hydrateMangaGenres(manga);
})

ipcMain.handle('add-manga', async (_, manga: any) => {
  return withLock('global', async () => {
    try {
      const normalizedGenres = processGenresFromUnknown(manga?.genres);
      const inferredFormat = inferFormatFromGenres(normalizedGenres, manga?.format);
      return mangaQueries.add({
        ...manga,
        genres: genresToString(normalizedGenres),
        format: inferredFormat,
        cover_path: manga.cover_path || '',
        cover_remote_url: manga.cover_remote_url || ''
      });
    } catch (error) {
      throw error;
    }
  });
});

ipcMain.handle('update-manga', async (_, manga: any) => {
  return withLock(manga.id, async () => {
    try {
      const normalizedGenres = processGenresFromUnknown(manga?.genres);
      const inferredFormat = inferFormatFromGenres(normalizedGenres, manga?.format);
      return mangaQueries.update({
        ...manga,
        genres: genresToString(normalizedGenres),
        format: inferredFormat,
        cover_path: manga.cover_path || '',
        cover_remote_url: manga.cover_remote_url || ''
      });
    } catch (error) {
      throw error;
    }
  });
});

ipcMain.handle('delete-manga', async (_, { id }) => {
  return withLock(id, async () => {
    try {
      const existing = mangaQueries.getById(id) as any;
      if (existing?.cover_path) deleteCoverImage(existing.cover_path);
      return mangaQueries.delete(id);
    } catch (error) {
      throw error;
    }
  });
});

ipcMain.handle('update-chapter', async (_, { id, chapter }) => {
  return withLock(id, async () => {
    return mangaQueries.updateChapter(id, chapter)
  });
})

ipcMain.handle('manga:save-progress', async (_, data) => {
  return mangaQueries.saveProgress(data);
})

ipcMain.handle('manga:get-chapter-progress', async (_, { sourceId, mangaId, chapterId }) => {
  return mangaQueries.getChapterProgress(sourceId, mangaId, chapterId);
})

ipcMain.handle('manga:get-manga-progress', async (_, { sourceId, mangaId }) => {
  return mangaQueries.getMangaProgress(sourceId, mangaId);
})

ipcMain.handle('toggle-featured', async (_, { id, isFeatured }) => {
  return withLock('global', async () => {
    return mangaQueries.toggleFeatured(id, isFeatured);
  });
})

ipcMain.handle('pick-cover', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('open-url', async (_, url: string) => {
  if (url) shell.openExternal(url);
})

ipcMain.handle('get-installation-date', async () => {
  const result = mangaQueries.getSetting('installation_date') as { value: string } | undefined;
  return result ? result.value : null;
})

ipcMain.handle('get-setting', async (_, key: string) => {
  const result = mangaQueries.getSetting(key) as { value: string } | undefined;
  return result ? result.value : null;
})

ipcMain.handle('set-setting', async (_, { key, value }) => {
  return mangaQueries.setSetting(key, value);
})

ipcMain.handle('app:set-window-size-preset', async (_, { preset }) => {
  const resolved = resolveAppWindowSizePreset(preset);
  mangaQueries.setSetting('app_window_size_preset', resolved.preset);

  if (win && !win.isDestroyed()) {
    win.setSize(resolved.width, resolved.height, true);
    win.center();
  }

  return { success: true, preset: resolved.preset, width: resolved.width, height: resolved.height };
})

ipcMain.handle('manga:refresh-all-covers', async () => {
  void refreshAllCoversSafeMode();
  return { started: true, mode: 'safe' };
})

ipcMain.handle('manga:refresh-all-data', async () => {
  return refreshAllMangaData();
})

ipcMain.handle('manga:reset-progress', async (_, { id }) => {
  return withLock(id, async () => {
    return mangaQueries.resetMangaProgress(id);
  });
})

ipcMain.handle('manga:reset-all-progress', async () => {
  return withLock('global', async () => {
    return mangaQueries.resetAllProgress();
  });
})

ipcMain.handle('save-avatar', async (_, tempPath: string) => {
  return withLock('profile', async () => {
    const fileName = await saveCoverImage(tempPath);
    await mangaQueries.setSetting('avatar_path', fileName);
    return fileName;
  });
})

ipcMain.handle('get-achievements', async () => {
  return mangaQueries.getAchievements();
})

ipcMain.handle('add-achievement', async (_, achievement: any) => {
  return mangaQueries.addAchievement(achievement);
})
ipcMain.handle('get-backup-stats', async () => {
  return getBackupStats();
})

ipcMain.handle('perform-manual-backup', async () => {
  return withLock('global', async () => {
    return performBackup();
  });
})

ipcMain.handle('export-master-archive', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Export Master Archive',
    defaultPath: path.join(app.getPath('downloads'), `chiyo-backup-${new Date().toISOString().split('T')[0]}.zip`),
    filters: [{ name: 'Chiyo Archive', extensions: ['zip'] }]
  });

  if (result.canceled || !result.filePath) return { success: false };

  return withLock('global', async () => {
    try {
      const zip = new AdmZip();
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'chiyo.db');
      const coversPath = path.join(userDataPath, 'covers');

      if (fs.existsSync(dbPath)) zip.addLocalFile(dbPath);
      if (fs.existsSync(coversPath)) zip.addLocalFolder(coversPath, 'covers');

      zip.writeZip(result.filePath);
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error('Export failed:', err);
      return { success: false, error: String(err) };
    }
  });
});

ipcMain.handle('import-master-archive', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Master Archive for Restore',
    filters: [{ name: 'Chiyo Archive', extensions: ['zip'] }],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths[0]) return { success: false };

  return withLock('global', async () => {
    try {
      const zip = new AdmZip(result.filePaths[0]);
      const zipEntries = zip.getEntries();
      const hasDb = zipEntries.some(e => e.entryName === 'chiyo.db');

      if (!hasDb) throw new Error('Invalid Archive: chiyo.db missing');

      closeDatabase();

      const userDataPath = app.getPath('userData');
      const coversPath = path.join(userDataPath, 'covers');

      if (fs.existsSync(coversPath)) {
        fs.rmSync(coversPath, { recursive: true, force: true });
      }

      zip.extractAllTo(userDataPath, true);

      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (err) {
      console.error('Import failed:', err);
      initDatabase();
      return { success: false, error: String(err) };
    }
  });
});

// --- Manga Reader IPC Handlers ---

ipcMain.handle('browser:fetch-json', async (_, { url, headers }) => {
  if (!browserManager) throw new Error('BrowserManager not initialized');
  return browserManager.fetchJSON(url, headers);
});

ipcMain.handle('browser:fetch-html', async (_, { url, headers }) => {
  if (!browserManager) throw new Error('BrowserManager not initialized');
  return browserManager.fetchHTML(url, headers);
});

ipcMain.handle('browser:navigate', async (_, { url }) => {
  if (!browserManager) throw new Error('BrowserManager not initialized');
  return browserManager.navigate(url);
});

ipcMain.handle('source:search', async (_, { sourceId, query }) => {
  const source = sourceManager.getSource(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  return sourceManager.getOrFetch(sourceId, 'global', 'search', query, () => source.search(query));
});

ipcMain.handle('source:get-details', async (_, { sourceId, mangaId, force }) => {
  const source = sourceManager.getSource(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  if (force) {
    const fresh = await source.getMangaDetails(mangaId);
    sourceManager.setCache(sourceId, mangaId, 'details', '', fresh);
    return fresh;
  }

  return sourceManager.getOrFetch(sourceId, mangaId, 'details', '', () => source.getMangaDetails(mangaId));
});

ipcMain.handle('source:get-chapters', async (_, { sourceId, mangaId }) => {
  const source = sourceManager.getSource(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  return sourceManager.getOrFetch(sourceId, mangaId, 'chapters', '', () => source.getChapters(mangaId));
});

ipcMain.handle('source:get-pages', async (_, { sourceId, chapterId, mangaId }) => {
  const source = sourceManager.getSource(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  // Use mangaId if provided for better cache isolation, fallback to chapterId
  const cacheMangaId = mangaId || chapterId;
  return sourceManager.getOrFetch(sourceId, cacheMangaId, 'pages', chapterId, () => source.getPages(chapterId));
});

ipcMain.handle('source:preload-chapter', async (_, { sourceId, chapterId, mangaId }) => {
  const source = sourceManager.getSource(sourceId);
  if (!source) return;

  const cacheMangaId = mangaId || chapterId;
  // Fire and forget - just populate the cache
  sourceManager.getOrFetch(sourceId, cacheMangaId, 'pages', chapterId, () => source.getPages(chapterId)).catch(() => {});
  return { success: true };
});


