export interface Manga {
  id: number;
  title: string;
  cover_path: string;
  cover_url: string | null;
  status: 'reading' | 'completed' | 'dropped' | 'on-hold' | 'plan-to-read';
  genres: string; // Comma-separated
  format: 'Manga' | 'Manhwa' | 'Manhua' | 'Light Novel' | 'One-shot' | '';
  publishing_status: 'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled' | '';
  current_chapter: number;
  total_chapters: number | null;
  date_started: string | null;
  date_finished: string | null;
  created_at: string;
  updated_at: string;
  tags: string; // Comma-separated custom tags
  source_url: string; // External reading link
  is_featured: number; // 0 or 1
}

export type MangaFormData = Omit<Manga, 'id' | 'created_at' | 'cover_url'> & {
  temp_cover_path?: string;
};
