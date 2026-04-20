export interface SourceManga {
  id: string; // source-specific id
  title: string;
  coverUrl: string;
  description?: string;
  author?: string;
  artist?: string;
  status?: string;
  genres?: string[];
}

export interface SourceChapter {
  id: string; // source-specific id
  title: string;
  chapterNumber: number;
  dateUpload?: string;
}

export interface SourcePage {
  url: string;
  index: number;
}

export interface MangaSource {
  id: string;
  name: string;
  baseUrl: string;

  search(query: string): Promise<SourceManga[]>;
  getMangaDetails(mangaId: string): Promise<SourceManga>;
  getChapters(mangaId: string): Promise<SourceChapter[]>;
  getPages(chapterId: string): Promise<SourcePage[]>;
}

export interface StaleResponse {
  __stale: true;
}

export type SourceResponse<T> = T | StaleResponse;
