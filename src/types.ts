export interface Manga {
  id: number;
  title: string;
  cover_path: string;
  cover_remote_url?: string;
  status: 'reading' | 'completed' | 'dropped' | 'on-hold' | 'plan-to-read';
  genres: string[]; // Normalized genres (lowercase)
  rawGenres?: string; // Original source string
  format: 'Manga' | 'Manhwa' | 'Manhua' | 'Webtoon' | 'Light Novel' | 'One-shot' | '';
  publishing_status: 'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled' | '';
  current_chapter: number;
  total_chapters: number | null;
  date_started: string | null;
  date_finished: string | null;
  created_at: string;
  updated_at: string;
  tags: string; // Comma-separated custom tags
  description?: string;
  source_url: string; // External reading link
  id_source?: string;
  id_manga?: string;
  is_featured: number; // 0 or 1
  rating: number;
}

export type MangaFormData = Omit<Manga, 'id' | 'created_at'>;
