import { useMemo } from 'react';
import { SourceChapter } from '../sources/types';
import { compareChaptersAsc } from '../utils/chapterSort';

export interface MangaProgressEntryLike {
  id_chapter: string;
  current_page: number;
  total_pages: number;
}

export type ChapterProgressStatus = 'UNREAD' | 'CONTINUE' | 'COMPLETED';

export interface ChapterState {
  chapter: SourceChapter;
  progress: number; // 0..1
  status: ChapterProgressStatus;
}

export interface ChapterStateResult {
  orderedChapters: SourceChapter[];
  chapterStates: ChapterState[];
  getProgressValue: (chapterId: string) => number;
  getStatus: (chapterId: string) => { label: 'READ' | 'CONTINUE' | 'ARCHIVED'; progress: number; completed: boolean };

  lastReadIndex: number;
  continueTargetIndex: number;
  nextUnreadIndex: number;

  nextChapter?: SourceChapter;
  lastReadChapterNumber: number;
  lastCompletedChapterNumber: number;
}

function normalizeProgress(entry?: MangaProgressEntryLike): number {
  if (!entry || entry.total_pages <= 0) return 0;
  const value = entry.current_page / entry.total_pages;
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function useChapterState(
  chapters: SourceChapter[],
  mangaProgress: MangaProgressEntryLike[]
): ChapterStateResult {
  return useMemo(() => {
    const orderedChapters = [...chapters].sort(compareChaptersAsc);

    const progressById = new Map<string, MangaProgressEntryLike>();
    for (const p of mangaProgress) progressById.set(p.id_chapter, p);

    const getProgressValue = (chapterId: string) => normalizeProgress(progressById.get(chapterId));

    const chapterStates: ChapterState[] = orderedChapters.map((chapter) => {
      const progress = getProgressValue(chapter.id);
      const status: ChapterProgressStatus =
        progress === 0 ? 'UNREAD' : progress === 1 ? 'COMPLETED' : 'CONTINUE';
      return { chapter, progress, status };
    });

    let lastReadIndex = -1;
    let continueTargetIndex = -1;
    let nextUnreadIndex = -1;
    let lastReadChapterNumber = 0;
    let lastCompletedChapterNumber = 0;

    for (let i = 0; i < chapterStates.length; i++) {
      const { chapter, progress } = chapterStates[i];
      if (progress > 0) {
        lastReadIndex = i;
        lastReadChapterNumber = chapter.chapterNumber;
      }
      if (progress > 0 && progress < 1) {
        continueTargetIndex = i; // keep max index
      }
      if (progress === 1) {
        lastCompletedChapterNumber = chapter.chapterNumber;
      }
    }

    for (let i = 0; i < chapterStates.length; i++) {
      if (chapterStates[i].progress === 0 && i > lastReadIndex) {
        nextUnreadIndex = i;
        break;
      }
    }

    const nextChapter =
      (continueTargetIndex >= 0 ? chapterStates[continueTargetIndex]?.chapter : undefined) ||
      (nextUnreadIndex >= 0 ? chapterStates[nextUnreadIndex]?.chapter : undefined) ||
      chapterStates[0]?.chapter;

    const getStatus = (chapterId: string) => {
      const progress = getProgressValue(chapterId);
      if (progress === 1) return { label: 'ARCHIVED' as const, progress: 1, completed: true };
      if (progress > 0 && progress < 1) return { label: 'CONTINUE' as const, progress, completed: false };
      return { label: 'READ' as const, progress: 0, completed: false };
    };

    return {
      orderedChapters,
      chapterStates,
      getProgressValue,
      getStatus,
      lastReadIndex,
      continueTargetIndex,
      nextUnreadIndex,
      nextChapter,
      lastReadChapterNumber,
      lastCompletedChapterNumber
    };
  }, [chapters, mangaProgress]);
}

