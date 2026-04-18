import { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initDatabase, mangaQueries } from '../db/index'
import { saveCoverImage, deleteCoverImage, getCoverPath } from '../storage/imageHandler'

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
  { scheme: 'chiyo-asset', privileges: { secure: true, standard: true, supportFetchAPI: true } }
])

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  initDatabase()
  await cleanupOrphanedCovers() // Background cleanup

  // --- PROTOCOL HANDLER [DETERMINISTIC] ---
  // Register the handler before creating the first window
  protocol.handle('chiyo-asset', (request) => {
    try {
      const url = new URL(request.url)
      
      // On Windows, drive letters like C: often end up as the hostname 'c'
      // We need to reconstruct the absolute path carefully.
      let decodedPath = ''
      if (url.hostname && url.hostname.length === 1) {
        // Case: chiyo-asset://C:/path...
        decodedPath = decodeURIComponent(url.hostname + ':' + url.pathname)
      } else if (url.hostname) {
        // Case: chiyo-asset://hostname/path...
        decodedPath = decodeURIComponent(url.hostname + url.pathname)
      } else {
        // Case: chiyo-asset:///path...
        decodedPath = decodeURIComponent(url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname)
      }

      // Remove trailing slash if present (Windows paths can have this from URL normalization)
      if (decodedPath.endsWith('/') || decodedPath.endsWith('\\')) {
        decodedPath = decodedPath.slice(0, -1)
      }

      // Resolve the actual file path
      const finalPath = path.isAbsolute(decodedPath) ? decodedPath : getCoverPath(decodedPath)
      const normalizedPath = path.normalize(finalPath)
      
      if (!fs.existsSync(normalizedPath)) {
        console.warn('Asset not found:', normalizedPath)
        return new Response('Not Found', { status: 404 })
      }
      
      return net.fetch(pathToFileURL(normalizedPath).toString())
    } catch (error) {
      console.error('Protocol handler error:', error)
      return new Response('Error', { status: 500 })
    }
  })

  createWindow()
})

// --- Concurrency & Maintenance Logic ---

// Simple Async Mutex for per-manga operations
const locks = new Map<number | string, Promise<void>>();
async function withLock(id: number | string, op: () => Promise<any>) {
  while (locks.has(id)) await locks.get(id);
  const promise = (async () => {
    try { await op(); } finally { locks.delete(id); }
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
    const mangas = mangaQueries.getAll();
    const referencedFiles = new Set(mangas.map((m: any) => m.cover_path).filter(Boolean));

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
  const mangas = mangaQueries.getAll()
  return mangas.map((m: any) => ({
    ...m,
    cover_url: m.cover_path ? `chiyo-asset://${m.cover_path}` : null
  }))
})

ipcMain.handle('get-maintenance-status', () => lastCleanupResult)

ipcMain.handle('add-manga', async (_, manga: any) => {
  return withLock('global', async () => {
    let fileName = '';
    try {
      if (manga.temp_cover_path) {
        fileName = await saveCoverImage(manga.temp_cover_path);
      }
      return mangaQueries.add({ ...manga, cover_path: fileName });
    } catch (error) {
      if (fileName) deleteCoverImage(fileName);
      throw error;
    }
  });
});

ipcMain.handle('update-manga', async (_, manga: any) => {
  return withLock(manga.id, async () => {
    let finalFileName = manga.cover_path;
    const oldFileName = manga.cover_path;

    try {
      if (manga.temp_cover_path) {
        finalFileName = await saveCoverImage(manga.temp_cover_path);
        if (oldFileName) deleteCoverImage(oldFileName);
      }
      return mangaQueries.update({ ...manga, cover_path: finalFileName });
    } catch (error) {
      if (finalFileName !== oldFileName) deleteCoverImage(finalFileName);
      throw error;
    }
  });
});

ipcMain.handle('delete-manga', async (_, { id, cover_path }) => {
  return withLock(id, async () => {
    try {
      if (cover_path) deleteCoverImage(cover_path);
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
