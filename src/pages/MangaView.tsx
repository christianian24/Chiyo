import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Play, BookOpen, Clock, User, Check } from 'lucide-react';
import { SourceManga, SourceChapter } from '../sources/types';
import { Manga } from '../types';
import { SmartImage } from '../components/SmartImage';
import { compareChaptersAsc } from '../utils/chapterSort';
import { genresToString, processGenresFromUnknown } from '../utils/genres';

interface MangaViewProps {
  sourceId: string;
  mangaId: string;
  onBack: () => void;
  onReadChapter: (chapterId: string, sourceId?: string, mangaId?: string, options?: { dbId?: number, chapterNumber?: number }) => void;
  onAddManga: (mangaData: any) => Promise<void>;
}

export const MangaView: React.FC<MangaViewProps> = ({ sourceId, mangaId, onBack, onReadChapter, onAddManga }) => {
  const [manga, setManga] = useState<SourceManga | null>(null);
  const [chapters, setChapters] = useState<SourceChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [trackedManga, setTrackedManga] = useState<Manga | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const displayGenres = processGenresFromUnknown(manga?.genres);
  const SOURCE_BASE_URLS: Record<string, string> = {
    mangabuddy: 'https://mangabuddy.com',
    mangafire: 'https://mangafire.to',
    manhwaclan: 'https://manhwaclan.com'
  };
  const sourceBaseUrl = SOURCE_BASE_URLS[sourceId] || '';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let [mangaDetails, chapterList, tracked] = await Promise.all([
          (window as any).electron.invoke('source:get-details', { sourceId, mangaId }),
          (window as any).electron.invoke('source:get-chapters', { sourceId, mangaId }),
          (window as any).electron.invoke('manga:check-tracked', { id_source: sourceId, id_manga: mangaId })
        ]);

        if (mangaDetails.__stale || chapterList.__stale) return;

        // Recover from stale cached details that predate genre parser improvements.
        if (!processGenresFromUnknown(mangaDetails?.genres).length) {
          const forced = await (window as any).electron.invoke('source:get-details', { sourceId, mangaId, force: true });
          if (!forced?.__stale) {
            mangaDetails = forced;
          }
        }

        setManga(mangaDetails);
        setChapters([...chapterList].sort(compareChaptersAsc));
        setTrackedManga(tracked || null);
        setIsTracked(!!tracked);
      } catch (err) {
        console.error('Failed to load manga details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sourceId, mangaId]);

  const handleTrack = async () => {
    if (!manga || isTracked || trackLoading) return;

    setTrackLoading(true);
    try {
      const normalizedGenres = displayGenres;
      // Ensure ALL named parameters mentioned in db/index.ts are present
      const mangaData = {
        title: manga.title,
        cover_path: '',
        cover_remote_url: manga.coverUrl || '',
        // Always track discovered titles as "reading" so they appear in continuation history.
        status: 'reading',
        genres: normalizedGenres,
        rawGenres: genresToString(normalizedGenres),
        id_source: sourceId,
        id_manga: mangaId,
        current_chapter: 0,
        total_chapters: chapters.length,
        source_url: sourceBaseUrl ? `${sourceBaseUrl}/${mangaId}` : '',
        // Missing fields expected by DB:
        format: 'Manga',
        publishing_status: manga.status || 'Ongoing',
        rating: 0.0,
        date_started: '',
        date_finished: '',
        tags: '',
      };

      await onAddManga(mangaData);
      const tracked = await (window as any).electron.invoke('manga:check-tracked', { id_source: sourceId, id_manga: mangaId });
      setTrackedManga(tracked || null);
      setIsTracked(!!tracked);
    } catch (err) {
      console.error('Failed to add tracking:', err);
    } finally {
      setTrackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-text-muted uppercase tracking-widest text-xs font-bold">Fetching Metadata</p>
      </div>
    );
  }

  if (!manga) return <div>Failed to load manga.</div>;

  return (
    <div className="flex flex-col gap-10 auto-fade-in">
      <header className="flex flex-col gap-6">
        <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-white transition-colors w-fit">
          <ChevronLeft size={24} />
          <span className="font-bold uppercase tracking-wider text-xs">Back to Discover</span>
        </button>

        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-[300px] shrink-0">
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/5 bg-surface relative group">
              <SmartImage
                src={manga.coverUrl}
                referer={sourceBaseUrl ? `${sourceBaseUrl}/` : undefined}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={manga.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6 justify-center">
            <div className="flex flex-col gap-2">
              <span className="text-accent text-[10px] font-black uppercase tracking-[0.4em]">{sourceId}</span>
              <h1 className="text-5xl font-bold tracking-tight text-white leading-[0.9]">{manga.title}</h1>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-text-muted">
              {manga.author && (
                <div className="flex items-center gap-2">
                  <User size={16} className="text-accent" />
                  <span className="font-bold">{manga.author}</span>
                </div>
              )}
              {manga.status && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-accent" />
                  <span className="font-bold uppercase tracking-widest text-[10px] bg-white/5 px-2 py-0.5 rounded text-white">{manga.status}</span>
                </div>
              )}
            </div>

            <p className="text-text-muted leading-relaxed line-clamp-4 text-sm max-w-2xl italic">
              {manga.description || 'No description available for this title.'}
            </p>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Genres</p>
              {displayGenres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayGenres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-text-muted"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-text-muted/70 italic">Genre metadata unavailable for this title.</span>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() =>
                  chapters[0] &&
                  onReadChapter(chapters[0].id, sourceId, mangaId, {
                    dbId: trackedManga?.id,
                    chapterNumber: chapters[0].chapterNumber
                  })
                }
                className="btn btn-primary h-14 px-10 flex items-center gap-3"
              >
                <Play size={20} fill="currentColor" />
                <span className="text-sm uppercase tracking-[0.2em] font-black">Read Now</span>
              </button>

              <button
                onClick={handleTrack}
                disabled={isTracked || trackLoading}
                className={`btn h-14 px-8 flex items-center gap-3 transition-all duration-500 ${isTracked
                    ? 'bg-accent/10 border-accent/20 text-accent cursor-default'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
              >
                {trackLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isTracked ? (
                  <Check size={20} />
                ) : (
                  <BookOpen size={20} />
                )}
                <span className="text-sm uppercase tracking-[0.2em] font-black italic">
                  {isTracked ? 'In Library' : 'Add Tracking'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-widest text-white italic">Chapters</h2>
          <div className="flex flex-col items-end gap-1">
            <span className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">{chapters.length} Total</span>
            {displayGenres.length > 0 && (
              <span className="text-text-muted/70 text-[10px] font-black uppercase tracking-[0.15em]">
                {genresToString(displayGenres)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() =>
                  onReadChapter(chapter.id, sourceId, mangaId, {
                    dbId: trackedManga?.id,
                    chapterNumber: chapter.chapterNumber
                  })
                }
                className="flex items-center justify-between p-5 bg-surface/40 rounded-2xl border border-white/5 hover:border-accent/40 hover:bg-surface transition-all group group/chapter"
              >
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs font-bold text-white group-hover/chapter:text-accent transition-colors">{chapter.title}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Chapter {chapter.chapterNumber}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={12} fill="currentColor" className="text-accent" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
