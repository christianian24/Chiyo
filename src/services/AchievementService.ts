import { Manga } from '../types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_manga', name: 'First Collection', description: 'Added your first manga to the library', icon: 'BookOpen' },
  { id: 'genre_specialist', name: 'Genre Specialist', description: 'Read a manga from 3 different genres', icon: 'Star' },
  { id: 'marathon_reader', name: 'Marathon Reader', description: 'Read a total of 100 chapters', icon: 'Zap' },
  { id: 'completionist_i', name: 'Completionist I', description: 'Successfully completed 5 series', icon: 'Trophy' },
  { id: 'dedicated_explorer', name: 'Dedicated Explorer', description: 'System initialized for more than 7 days', icon: 'Calendar' }
];

export class AchievementService {
  static calculateXP(mangas: Manga[]): number {
    const chapterXP = mangas.reduce((sum, m) => sum + (m.current_chapter || 0), 0) * 10;
    const completedXP = mangas.filter(m => m.status === 'completed').length * 100;
    const seriesXP = mangas.length * 20;
    return chapterXP + completedXP + seriesXP;
  }

  static getLevel(xp: number): { level: number; nextLevelXP: number; progress: number } {
    // Level = floor(sqrt(XP / 100))
    const level = Math.floor(Math.sqrt(xp / 100)) || 1;
    const currentLevelXP = Math.pow(level, 2) * 100;
    const nextLevelXP = Math.pow(level + 1, 2) * 100;
    const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return { level, nextLevelXP, progress: Math.max(0, Math.min(100, progress)) };
  }

  static checkUnlocks(mangas: Manga[], existingAchievementIds: string[]): Achievement[] {
    const toUnlock: Achievement[] = [];
    const unlockedSet = new Set(existingAchievementIds);

    // 1. First Manga
    if (mangas.length >= 1 && !unlockedSet.has('first_manga')) {
      toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'first_manga')!);
    }

    // 2. Genre Specialist
    const uniqueGenres = new Set<string>();
    mangas.forEach(m => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach((genre) => {
          if (genre) uniqueGenres.add(genre);
        });
      }
    });
    if (uniqueGenres.size >= 3 && !unlockedSet.has('genre_specialist')) {
      toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'genre_specialist')!);
    }

    // 3. Marathon Reader
    const totalChapters = mangas.reduce((sum, m) => sum + (m.current_chapter || 0), 0);
    if (totalChapters >= 100 && !unlockedSet.has('marathon_reader')) {
      toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'marathon_reader')!);
    }

    // 4. Completionist I
    const completedCount = mangas.filter(m => m.status === 'completed').length;
    if (completedCount >= 5 && !unlockedSet.has('completionist_i')) {
      toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'completionist_i')!);
    }

    return toUnlock;
  }
}
