import { Manga } from '../types';

export const COVER_PLACEHOLDER = 'logo.jpg';

function isValidHttpCover(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function warnMalformedCoverInput(manga: Manga): void {
  const isDev = (import.meta as any)?.env?.DEV === true;
  if (!isDev) return;
  const title = typeof manga?.title === 'string' ? manga.title : '<unknown>';
  const hasPath = typeof manga?.cover_path !== 'string';
  const hasRemote =
    manga?.cover_remote_url !== undefined && manga?.cover_remote_url !== null && typeof manga.cover_remote_url !== 'string';
  if (hasPath || hasRemote) {
    console.warn('resolveMangaCoverSrc: malformed cover fields', {
      title,
      cover_path_type: typeof manga?.cover_path,
      cover_remote_url_type: typeof manga?.cover_remote_url
    });
  }
}

export function resolveMangaCoverSrc(manga: Manga): string {
  warnMalformedCoverInput(manga);
  if (manga.cover_path?.trim()) return `chiyo-asset://${manga.cover_path}`;
  if (manga.cover_remote_url?.trim() && isValidHttpCover(manga.cover_remote_url)) return manga.cover_remote_url;
  return COVER_PLACEHOLDER;
}

