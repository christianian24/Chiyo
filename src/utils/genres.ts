import { Manga } from '../types';

export function parseGenres(raw: string): string[] {
  return raw
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

const GENRE_MAP: Record<string, string> = {
  'sci-fi': 'science fiction',
  'sci fi': 'science fiction',
  shounen: 'shonen',
  'shōnen': 'shonen',
  romcom: 'romance',
};

export function normalizeGenre(g: string): string {
  const key = g.toLowerCase().trim();
  return GENRE_MAP[key] || key;
}

export function processGenres(raw: string): string[] {
  const parsed = parseGenres(raw).map(normalizeGenre);
  return Array.from(new Set(parsed));
}

export function processGenresFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((genre) => normalizeGenre(String(genre)))
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    return processGenres(value);
  }

  return [];
}

export function genresToString(genres: string[]): string {
  return genres.join(', ');
}

export function collectGenres(mangaList: Manga[]): string[] {
  const set = new Set<string>();
  mangaList.forEach((m) => m.genres.forEach((g) => set.add(g)));
  return Array.from(set).sort();
}
