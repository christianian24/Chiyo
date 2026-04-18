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

  // 4. Perform initial backup on startup
  performBackup().catch(err => console.error('Startup backup failed:', err));

  console.log('Database initialized at:', dbPath);
}

async function runMigrations() {
  const tableInfo = db.prepare("PRAGMA table_info(manga)").all();
  const columns = tableInfo.map((col: any) => col.name);

  const migrations = [
    { name: 'genres', sql: 'ALTER TABLE manga ADD COLUMN genres TEXT DEFAULT ""' },
    { name: 'format', sql: 'ALTER TABLE manga ADD COLUMN format TEXT DEFAULT ""' },
    { name: 'publishing_status', sql: 'ALTER TABLE manga ADD COLUMN publishing_status TEXT DEFAULT ""' },
    { name: 'updated_at', sql: "ALTER TABLE manga ADD COLUMN updated_at TEXT DEFAULT '2000-01-01 00:00:00'" },
    { name: 'tags', sql: 'ALTER TABLE manga ADD COLUMN tags TEXT DEFAULT ""' },
    { name: 'source_url', sql: 'ALTER TABLE manga ADD COLUMN source_url TEXT DEFAULT ""' },
    { name: 'is_featured', sql: 'ALTER TABLE manga ADD COLUMN is_featured INTEGER DEFAULT 0' },
    { name: 'rating', sql: 'ALTER TABLE manga ADD COLUMN rating REAL DEFAULT 0.0' }
  ];

  for (const m of migrations) {
    if (!columns.includes(m.name)) {
      try {
        db.exec(m.sql);
        console.log(`Migration: Added ${m.name} column`);
      } catch (e) {
        console.error(`Migration failed for ${m.name}:`, e);
      }
    }
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
  add: (manga: any) => {
    const stmt = db.prepare(`
      INSERT INTO manga (title, cover_path, status, genres, format, publishing_status, current_chapter, total_chapters, rating, date_started, date_finished, tags, source_url)
      VALUES (@title, @cover_path, @status, @genres, @format, @publishing_status, @current_chapter, @total_chapters, @rating, @date_started, @date_finished, @tags, @source_url)
    `);
    return stmt.run({ ...manga, rating: manga.rating || 0.0 });
  },
  update: (manga: any) => {
    const stmt = db.prepare(`
      UPDATE manga 
      SET title = @title, cover_path = @cover_path, status = @status, 
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
    db.prepare('INSERT INTO achievements (id, name, description, icon) VALUES (@id, @name, @description, @icon)').run(achievement)
};
