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

  // Perform rolling backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `chiyo-${timestamp}.db`;
    const tempBackupPath = path.join(backupsPath, `${backupFile}.tmp`);
    const finalBackupPath = path.join(backupsPath, backupFile);

    // Initial backup creation using better-sqlite3's online backup
    db.backup(tempBackupPath)
      .then(() => {
        fs.renameSync(tempBackupPath, finalBackupPath);
        console.log('Database backup created:', finalBackupPath);

        // Manage rotation (keep last 5)
        const backups = fs.readdirSync(backupsPath)
          .filter(f => f.startsWith('chiyo-') && f.endsWith('.db'))
          .sort((a, b) => fs.statSync(path.join(backupsPath, b)).mtime.getTime() - fs.statSync(path.join(backupsPath, a)).mtime.getTime());

        if (backups.length > 5) {
          backups.slice(5).forEach(f => {
            fs.unlinkSync(path.join(backupsPath, f));
          });
        }
      })
      .catch(err => console.error('Backup failed:', err));
  } catch (err) {
    console.error('Failed to initiate backup:', err);
  }

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_path TEXT,
      status TEXT, -- reading / completed / dropped / on-hold
      current_chapter INTEGER DEFAULT 0,
      total_chapters INTEGER,
      date_started TEXT,
      date_finished TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized at:', dbPath);
}

// Queries
export const mangaQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM manga ORDER BY created_at DESC').all();
  },
  getById: (id: number) => {
    return db.prepare('SELECT * FROM manga WHERE id = ?').get(id);
  },
  add: (manga: any) => {
    const stmt = db.prepare(`
      INSERT INTO manga (title, cover_path, status, current_chapter, total_chapters, date_started, date_finished)
      VALUES (@title, @cover_path, @status, @current_chapter, @total_chapters, @date_started, @date_finished)
    `);
    return stmt.run(manga);
  },
  update: (manga: any) => {
    const stmt = db.prepare(`
      UPDATE manga 
      SET title = @title, cover_path = @cover_path, status = @status, 
          current_chapter = @current_chapter, total_chapters = @total_chapters, 
          date_started = @date_started, date_finished = @date_finished
      WHERE id = @id
    `);
    return stmt.run(manga);
  },
  delete: (id: number) => {
    return db.prepare('DELETE FROM manga WHERE id = ?').run(id);
  },
  updateChapter: (id: number, chapter: number) => {
    return db.prepare('UPDATE manga SET current_chapter = ? WHERE id = ?').run(chapter, id);
  }
};
