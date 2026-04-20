import { SourceChapter } from '../sources/types';

function toSortableChapterNumber(value: number): number {
  // Keep non-positive chapter numbers (used for specials) at the end.
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

export function compareChaptersAsc(a: SourceChapter, b: SourceChapter): number {
  const primary = toSortableChapterNumber(a.chapterNumber) - toSortableChapterNumber(b.chapterNumber);
  if (primary !== 0) return primary;

  const titleOrder = a.title.localeCompare(b.title, 'en', { numeric: true, sensitivity: 'base' });
  if (titleOrder !== 0) return titleOrder;

  return a.id.localeCompare(b.id, 'en', { numeric: true, sensitivity: 'base' });
}

export function compareChaptersDesc(a: SourceChapter, b: SourceChapter): number {
  return compareChaptersAsc(b, a);
}
