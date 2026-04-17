export interface Manga {
  id: number;
  title: string;
  cover_path: string;
  cover_url: string | null;
  status: 'reading' | 'completed' | 'dropped' | 'on-hold';
  current_chapter: number;
  total_chapters: number | null;
  date_started: string | null;
  date_finished: string | null;
  created_at: string;
}

export type MangaFormData = Omit<Manga, 'id' | 'created_at' | 'cover_url'> & {
  temp_cover_path?: string;
};
