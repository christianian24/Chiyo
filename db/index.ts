import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database;

export function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database connection closed.');
  }
}

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'chiyo.db');
  const coversPath = path.join(userDataPath, 'covers');

  // Ensure directories exist
  if (!fs.existsSync(coversPath)) {
    fs.mkdirSync(coversPath, { recursive: true });
  }

  const backupsPath = path.join(userDataPath, 'backups');
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true });
  }

  db = new Database(dbPath);
  
  // 1. Initialize schema first
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_path TEXT,
      cover_remote_url TEXT DEFAULT "",
      status TEXT, 
      genres TEXT DEFAULT "",
      format TEXT DEFAULT "",
      publishing_status TEXT DEFAULT "",
      current_chapter INTEGER DEFAULT 0,
      total_chapters INTEGER,
      rating REAL DEFAULT 0.0,
      date_started TEXT,
      date_finished TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      tags TEXT DEFAULT "",
      source_url TEXT DEFAULT "",
      id_source TEXT,
      id_manga TEXT,
      is_featured INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS chapter_progress (
      id_source TEXT,
      id_manga TEXT,
      id_chapter TEXT,
      progress REAL DEFAULT 0.0,
      current_page INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_source, id_manga, id_chapter)
    );
  `);

  // 2. Safe Migration Logic
  runMigrations();

  // 3. Initialize Settings
  const username = db.prepare('SELECT value FROM settings WHERE key = ?').get('username');
  if (!username) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('username', 'Chiyo Voyager');
  }

  const avatar = db.prepare('SELECT value FROM settings WHERE key = ?').get('avatar_path');
  if (!avatar) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('avatar_path', '');
  }

  const autoAdvance = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_advance');
  if (!autoAdvance) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('auto_advance', 'true');
  }

  // 4. Perform initial backup on startup
  performBackup().catch(err => console.error('Startup backup failed:', err));

  console.log('Database initialized at:', dbPath);
}

async function runMigrations() {
  // 1. Migrate manga table
  const mangaInfo = db.prepare("PRAGMA table_info(manga)").all();
  const mangaColumns = mangaInfo.map((col: any) => col.name);

  const mangaMigrations = [
    { name: 'genres', sql: 'ALTER TABLE manga ADD COLUMN genres TEXT DEFAULT ""' },
    { name: 'format', sql: 'ALTER TABLE manga ADD COLUMN format TEXT DEFAULT ""' },
    { name: 'publishing_status', sql: 'ALTER TABLE manga ADD COLUMN publishing_status TEXT DEFAULT ""' },
    { name: 'updated_at', sql: "ALTER TABLE manga ADD COLUMN updated_at TEXT DEFAULT '2000-01-01 00:00:00'" },
    { name: 'tags', sql: 'ALTER TABLE manga ADD COLUMN tags TEXT DEFAULT ""' },
    { name: 'source_url', sql: 'ALTER TABLE manga ADD COLUMN source_url TEXT DEFAULT ""' },
    { name: 'is_featured', sql: 'ALTER TABLE manga ADD COLUMN is_featured INTEGER DEFAULT 0' },
    { name: 'rating', sql: 'ALTER TABLE manga ADD COLUMN rating REAL DEFAULT 0.0' },
    { name: 'id_source', sql: 'ALTER TABLE manga ADD COLUMN id_source TEXT' },
    { name: 'id_manga', sql: 'ALTER TABLE manga ADD COLUMN id_manga TEXT' },
    { name: 'cover_remote_url', sql: 'ALTER TABLE manga ADD COLUMN cover_remote_url TEXT DEFAULT ""' }
  ];

  for (const m of mangaMigrations) {
    if (!mangaColumns.includes(m.name)) {
      try {
        db.exec(m.sql);
        console.log(`Migration [manga]: Added ${m.name} column`);
      } catch (e) {
        console.error(`Migration [manga] failed for ${m.name}:`, e);
      }
    }
  }

  // 2. Migrate chapter_progress table
  const progressInfo = db.prepare("PRAGMA table_info(chapter_progress)").all();
  const progressColumns = progressInfo.map((col: any) => col.name);

  const progressMigrations = [
    { name: 'current_page', sql: 'ALTER TABLE chapter_progress ADD COLUMN current_page INTEGER DEFAULT 0' },
    { name: 'total_pages', sql: 'ALTER TABLE chapter_progress ADD COLUMN total_pages INTEGER DEFAULT 0' }
  ];

  for (const m of progressMigrations) {
    if (!progressColumns.includes(m.name)) {
      try {
        db.exec(m.sql);
        console.log(`Migration [chapter_progress]: Added ${m.name} column`);
      } catch (e) {
        console.error(`Migration [chapter_progress] failed for ${m.name}:`, e);
      }
    }
  }

  // 3. Ensure source identity uniqueness for tracked titles
  try {
    const duplicateRows = db.prepare(`
      SELECT id_source, id_manga, COUNT(*) as cnt
      FROM manga
      WHERE id_source IS NOT NULL AND id_source != '' AND id_manga IS NOT NULL AND id_manga != ''
      GROUP BY id_source, id_manga
      HAVING COUNT(*) > 1
    `).all() as Array<{ id_source: string; id_manga: string; cnt: number }>;

    if (duplicateRows.length > 0) {
      const selectDupes = db.prepare(`
        SELECT id, cover_path
        FROM manga
        WHERE id_source = ? AND id_manga = ?
        ORDER BY updated_at DESC, id DESC
      `);
      const deleteById = db.prepare('DELETE FROM manga WHERE id = ?');

      const cleanupDuplicateTxn = db.transaction((rows: Array<{ id_source: string; id_manga: string }>) => {
        for (const row of rows) {
          const entries = selectDupes.all(row.id_source, row.id_manga) as Array<{ id: number; cover_path: string | null }>;
          // Keep the newest row and remove the rest.
          for (const duplicate of entries.slice(1)) {
            deleteById.run(duplicate.id);
          }
        }
      });

      cleanupDuplicateTxn(duplicateRows);
      console.warn(`Migration [manga]: Removed duplicate tracked rows for ${duplicateRows.length} source entries`);
    }

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_manga_source_identity
      ON manga (id_source, id_manga)
      WHERE id_source IS NOT NULL AND id_source != '' AND id_manga IS NOT NULL AND id_manga != '';
    `);
  } catch (e) {
    console.error('Migration [manga] source uniqueness failed:', e);
  }
}

export async function performBackup() {
  const userDataPath = app.getPath('userData');
  const backupsPath = path.join(userDataPath, 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `chiyo-${timestamp}.db`;
  const tempBackupPath = path.join(backupsPath, `${backupFile}.tmp`);
  const finalBackupPath = path.join(backupsPath, backupFile);

  try {
    await db.backup(tempBackupPath);
    if (fs.existsSync(tempBackupPath)) {
      fs.renameSync(tempBackupPath, finalBackupPath);
      const backups = fs.readdirSync(backupsPath)
        .filter(f => f.startsWith('chiyo-') && f.endsWith('.db'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupsPath, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
      if (backups.length > 5) {
        backups.slice(5).forEach(f => fs.unlinkSync(path.join(backupsPath, f.name)));
      }
      return { success: true, path: finalBackupPath, timestamp: new Date().toLocaleString() };
    }
    throw new Error('Backup failed');
  } catch (err) {
    if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);
    console.error('Backup Engine Failure:', err);
    throw err;
  }
}

export function getBackupStats() {
  const userDataPath = app.getPath('userData');
  const backupsPath = path.join(userDataPath, 'backups');
  if (!fs.existsSync(backupsPath)) return { count: 0, lastBackup: null };
  const backups = fs.readdirSync(backupsPath)
    .filter(f => f.startsWith('chiyo-') && f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupsPath, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
  return { count: backups.length, lastBackup: backups[0] ? new Date(backups[0].time).toLocaleString() : null };
}

export const mangaQueries = {
  getAll: () => db.prepare('SELECT * FROM manga ORDER BY updated_at DESC').all(),
  getById: (id: number) => db.prepare('SELECT * FROM manga WHERE id = ?').get(id),
  updateCovers: (id: number, cover_path: string, cover_remote_url: string) =>
    db.prepare('UPDATE manga SET cover_path = ?, cover_remote_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(cover_path, cover_remote_url, id),
  add: (manga: any) => {
    const stmt = db.prepare(`
      INSERT INTO manga (title, cover_path, cover_remote_url, status, genres, format, publishing_status, current_chapter, total_chapters, rating, date_started, date_finished, tags, source_url, id_source, id_manga)
      VALUES (@title, @cover_path, @cover_remote_url, @status, @genres, @format, @publishing_status, @current_chapter, @total_chapters, @rating, @date_started, @date_finished, @tags, @source_url, @id_source, @id_manga)
    `);
    return stmt.run({ ...manga, rating: manga.rating || 0.0 });
  },
  getBySourceInfo: (id_source: string, id_manga: string) => 
    db.prepare('SELECT * FROM manga WHERE id_source = ? AND id_manga = ?').get(id_source, id_manga),
  update: (manga: any) => {
    const stmt = db.prepare(`
      UPDATE manga 
      SET title = @title, cover_path = @cover_path, cover_remote_url = @cover_remote_url, status = @status, 
          genres = @genres, format = @format, publishing_status = @publishing_status,
          current_chapter = @current_chapter, total_chapters = @total_chapters, 
          rating = @rating, date_started = @date_started, date_finished = @date_finished,
          tags = @tags, source_url = @source_url,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    return stmt.run({ ...manga, rating: manga.rating || 0.0 });
  },
  delete: (id: number) => db.prepare('DELETE FROM manga WHERE id = ?').run(id),
  updateChapter: (id: number, chapter: number) => 
    db.prepare('UPDATE manga SET current_chapter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chapter, id),
  toggleFeatured: (id: number, isFeatured: boolean) => {
    if (isFeatured) db.prepare('UPDATE manga SET is_featured = 0').run();
    return db.prepare('UPDATE manga SET is_featured = ? WHERE id = ?').run(isFeatured ? 1 : 0, id);
  },
  getSetting: (key: string) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key),
  setSetting: (key: string, value: string) => 
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value),
  getAchievements: () => db.prepare('SELECT * FROM achievements ORDER BY unlocked_at DESC').all(),
  addAchievement: (achievement: any) => 
    db.prepare('INSERT INTO achievements (id, name, description, icon) VALUES (@id, @name, @description, @icon)').run(achievement),
  
  saveProgress: (data: { id_source: string, id_manga: string, id_chapter: string, progress: number, current_page: number, total_pages: number, completed: number }) => {
    return db.prepare(`
      INSERT INTO chapter_progress (id_source, id_manga, id_chapter, progress, current_page, total_pages, completed, updated_at)
      VALUES (@id_source, @id_manga, @id_chapter, @progress, @current_page, @total_pages, @completed, CURRENT_TIMESTAMP)
      ON CONFLICT(id_source, id_manga, id_chapter) DO UPDATE SET
        progress = @progress,
        current_page = @current_page,
        total_pages = @total_pages,
        completed = @completed,
        updated_at = CURRENT_TIMESTAMP
    `).run(data);
  },
  getChapterProgress: (sourceId: string, mangaId: string, chapterId: string) => 
    db.prepare('SELECT * FROM chapter_progress WHERE id_source = ? AND id_manga = ? AND id_chapter = ?').get(sourceId, mangaId, chapterId),
  getMangaProgress: (sourceId: string, mangaId: string) => 
    db.prepare('SELECT * FROM chapter_progress WHERE id_source = ? AND id_manga = ?').all(sourceId, mangaId),
  resetMangaProgress: (id: number) => {
    const row = db.prepare('SELECT id_source, id_manga FROM manga WHERE id = ?').get(id) as { id_source?: string; id_manga?: string } | undefined;
    const tx = db.transaction(() => {
      db.prepare('UPDATE manga SET current_chapter = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      if (row?.id_source && row?.id_manga) {
        db.prepare('DELETE FROM chapter_progress WHERE id_source = ? AND id_manga = ?').run(row.id_source, row.id_manga);
      }
    });
    tx();
    return { success: true };
  },
  resetAllProgress: () => {
    const tx = db.transaction(() => {
      db.prepare('UPDATE manga SET current_chapter = 0, updated_at = CURRENT_TIMESTAMP').run();
      db.prepare('DELETE FROM chapter_progress').run();
    });
    tx();
    return { success: true };
  }
};
