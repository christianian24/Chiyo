import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database;

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
      status TEXT, -- reading / completed / dropped / on-hold / plan-to-read
      genres TEXT DEFAULT "",
      format TEXT DEFAULT "",
      publishing_status TEXT DEFAULT "",
      current_chapter INTEGER DEFAULT 0,
      total_chapters INTEGER,
      date_started TEXT,
      date_finished TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      tags TEXT DEFAULT "",
      source_url TEXT DEFAULT ""
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

  // 3. Initialize Installation Date
  const installationDate = db.prepare('SELECT value FROM settings WHERE key = ?').get('installation_date');
  if (!installationDate) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('installation_date', new Date().toISOString());
  }

  // Initialize Profile Settings
  const username = db.prepare('SELECT value FROM settings WHERE key = ?').get('username');
  if (!username) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('username', 'Chiyo Voyager');
  }

  const avatar = db.prepare('SELECT value FROM settings WHERE key = ?').get('avatar_path');
  if (!avatar) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('avatar_path', '');
  }

  // 4. Perform rolling backup (async)
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `chiyo-${timestamp}.db`;
    const tempBackupPath = path.join(backupsPath, `${backupFile}.tmp`);
    const finalBackupPath = path.join(backupsPath, backupFile);

    db.backup(tempBackupPath)
      .then(() => {
        fs.renameSync(tempBackupPath, finalBackupPath);
        console.log('Database backup created:', finalBackupPath);

        const backups = fs.readdirSync(backupsPath)
          .filter(f => f.startsWith('chiyo-') && f.endsWith('.db'))
          .sort((a, b) => fs.statSync(path.join(backupsPath, b)).mtime.getTime() - fs.statSync(path.join(backupsPath, a)).mtime.getTime());

        if (backups.length > 5) {
          backups.slice(5).forEach(f => fs.unlinkSync(path.join(backupsPath, f)));
        }
      })
      .catch(err => console.error('Backup failed:', err));
  } catch (err) {
    console.error('Failed to initiate backup:', err);
  }

  console.log('Database initialized at:', dbPath);
}

function runMigrations() {
  const tableInfo = db.prepare('PRAGMA table_info(manga)').all();
  const columns = tableInfo.map((col: any) => col.name);

  if (!columns.includes('genres')) {
    db.exec('ALTER TABLE manga ADD COLUMN genres TEXT DEFAULT ""');
    console.log('Migration: Added genres column');
  }
  if (!columns.includes('format')) {
    db.exec('ALTER TABLE manga ADD COLUMN format TEXT DEFAULT ""');
    console.log('Migration: Added format column');
  }
  if (!columns.includes('publishing_status')) {
    db.exec('ALTER TABLE manga ADD COLUMN publishing_status TEXT DEFAULT ""');
    console.log('Migration: Added publishing_status column');
  }
  if (!columns.includes('updated_at')) {
    db.exec("ALTER TABLE manga ADD COLUMN updated_at TEXT DEFAULT '2000-01-01 00:00:00'");
    console.log('Migration: Added updated_at column');
  }
  if (!columns.includes('tags')) {
    db.exec('ALTER TABLE manga ADD COLUMN tags TEXT DEFAULT ""');
    console.log('Migration: Added tags column');
  }
  if (!columns.includes('source_url')) {
    db.exec('ALTER TABLE manga ADD COLUMN source_url TEXT DEFAULT ""');
    console.log('Migration: Added source_url column');
  }
  if (!columns.includes('is_featured')) {
    db.exec('ALTER TABLE manga ADD COLUMN is_featured INTEGER DEFAULT 0');
    console.log('Migration: Added is_featured column');
  }
}

// Queries
export const mangaQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM manga ORDER BY updated_at DESC').all();
  },
  getById: (id: number) => {
    return db.prepare('SELECT * FROM manga WHERE id = ?').get(id);
  },
  add: (manga: any) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO manga (title, cover_path, status, genres, format, publishing_status, current_chapter, total_chapters, date_started, date_finished, tags, source_url)
        VALUES (@title, @cover_path, @status, @genres, @format, @publishing_status, @current_chapter, @total_chapters, @date_started, @date_finished, @tags, @source_url)
      `);
      return stmt.run(manga);
    } catch (e) {
      console.error('Database Error [Add Manga]:', e);
      throw e;
    }
  },
  update: (manga: any) => {
    try {
      const stmt = db.prepare(`
        UPDATE manga 
        SET title = @title, cover_path = @cover_path, status = @status, 
            genres = @genres, format = @format, publishing_status = @publishing_status,
            current_chapter = @current_chapter, total_chapters = @total_chapters, 
            date_started = @date_started, date_finished = @date_finished,
            tags = @tags, source_url = @source_url,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `);
      return stmt.run(manga);
    } catch (e) {
      console.error('Database Error [Update Manga]:', e);
      throw e;
    }
  },
  delete: (id: number) => {
    return db.prepare('DELETE FROM manga WHERE id = ?').run(id);
  },
  updateChapter: (id: number, chapter: number) => {
    return db.prepare('UPDATE manga SET current_chapter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chapter, id);
  },
  toggleFeatured: (id: number, isFeatured: boolean) => {
    if (isFeatured) {
      db.prepare('UPDATE manga SET is_featured = 0').run();
    }
    return db.prepare('UPDATE manga SET is_featured = ? WHERE id = ?').run(isFeatured ? 1 : 0, id);
  },
  getSetting: (key: string) => {
    return db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  },
  setSetting: (key: string, value: string) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    return stmt.run(key, value);
  },
  getAchievements: () => {
    return db.prepare('SELECT * FROM achievements ORDER BY unlocked_at DESC').all();
  },
  addAchievement: (achievement: any) => {
    const stmt = db.prepare('INSERT INTO achievements (id, name, description, icon) VALUES (@id, @name, @description, @icon)');
    return stmt.run(achievement);
  }
};
