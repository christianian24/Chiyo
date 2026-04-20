import React, { useState, useEffect, useMemo } from 'react';
import { Manga } from '../types'
import { ArrowLeft, Trash2, Plus, Minus, Calendar, BookOpen, Clock, CheckCircle2, XCircle, Layers, Zap, Activity, Cpu, Play, Loader2 } from 'lucide-react'
import { motion, Variants, AnimatePresence } from 'framer-motion'
import { SourceChapter } from '../sources/types';
import { compareChaptersAsc } from '../utils/chapterSort';
import { useChapterState } from '../hooks/useChapterState';
import { SmartImage } from '../components/SmartImage';
import { resolveMangaCoverSrc } from '../utils/coverResolver';

interface DetailProps {
  manga: Manga;
  libraryVersion: number;
  onBack: () => void;
  onDelete: (id: number) => void;
  onEdit: (manga: Manga) => void;
  onUpdateChapter: (id: number, chapter: number) => void;
  onReadChapter: (chapterId: string, sourceId?: string, mangaId?: string, options?: { dbId?: number, chapterNumber?: number }) => void;
}

const statusConfig = {
  'plan-to-read': { icon: Clock, color: 'text-text-muted/40', label: 'Queued', bg: 'bg-white/5' },
  reading: { icon: Activity, color: 'text-accent', label: 'Active Link', bg: 'bg-accent/10' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Archived', bg: 'bg-green-500/10' },
  'on-hold': { icon: Clock, color: 'text-yellow-500', label: 'Standby', bg: 'bg-yellow-500/10' },
  dropped: { icon: XCircle, color: 'text-red-600', label: 'Severed', bg: 'bg-red-600/10' },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

interface MangaProgressEntry {
  id_chapter: string;
  progress: number;
  current_page: number;
  total_pages: number;
  completed: number;
}

export default function Detail({ manga: initialManga, libraryVersion, onBack, onDelete, onEdit, onUpdateChapter, onReadChapter }: DetailProps) {
  const [chapters, setChapters] = useState<SourceChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [mangaProgress, setMangaProgress] = useState<MangaProgressEntry[]>([]);
  const [syncedManga, setSyncedManga] = useState<Manga>(initialManga);
  const [refreshTick, setRefreshTick] = useState(0);

  // Sync initial prop to state
  useEffect(() => {
    setSyncedManga(initialManga);
  }, [initialManga]);

  const status = statusConfig[syncedManga.status] || statusConfig.reading;

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      if (!syncedManga.id_source || !syncedManga.id_manga) return;
      
      setLoadingChapters(true);
      try {
        const [list, progress, freshManga] = await Promise.all([
          (window as any).electron.invoke('source:get-chapters', { 
            sourceId: syncedManga.id_source, 
            mangaId: syncedManga.id_manga 
          }),
          (window as any).electron.invoke('manga:get-manga-progress', {
            sourceId: syncedManga.id_source,
            mangaId: syncedManga.id_manga
          }),
          (window as any).electron.invoke('manga:check-tracked', {
            id_source: syncedManga.id_source,
            id_manga: syncedManga.id_manga
          })
        ]);

        if (didCancel) return;

        if (!list.__stale) {
          setChapters([...list].sort(compareChaptersAsc));
        }
        setMangaProgress(progress || []);
        if (freshManga) {
          setSyncedManga(freshManga);
        }
      } catch (err) {
        if (didCancel) return;
        console.error('Failed to fetch library details:', err);
      } finally {
        if (didCancel) return;
        setLoadingChapters(false);
      }
    };

    fetchData();

    return () => {
      didCancel = true;
    };
  }, [libraryVersion, refreshTick, syncedManga.id_source, syncedManga.id_manga]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onFocus = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshTick(t => t + 1);
      }, 100);
    };

    window.addEventListener('focus', onFocus);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const chapterState = useChapterState(chapters, mangaProgress);
  const lastReadChapter = chapterState.lastReadChapterNumber;
  const lastCompletedChapter = chapterState.lastCompletedChapterNumber;
  const nextChapter = chapterState.nextChapter;
  const coverSrc = useMemo(() => resolveMangaCoverSrc(syncedManga), [syncedManga]);

  /**
   * MANUAL OVERRIDE: User-initiated chapter change from Detail view.
   * This bypasses the Reader's session commit flow because it's a direct
   * library edit, not a reading session. The user is explicitly setting
   * their progress, not reading.
   *
   * Architecture: Library edits → direct IPC → DB (no session manager involved)
   */
  const handleChapterChange = async (delta: number) => {
    const newChapter = Math.max(0, lastReadChapter + delta);
    await onUpdateChapter(syncedManga.id, newChapter);
    setRefreshTick(t => t + 1);
  };

  const progressPercent = Math.min((lastReadChapter / (syncedManga.total_chapters || 100)) * 100, 100);
  const nextChapterStatus = nextChapter ? chapterState.getStatus(nextChapter.id) : null;

  return (
    <div className="relative min-h-[80vh] pb-20 auto-fade-in">
      {/* RedMagic Prismatic Glow */}
      <div className="absolute inset-x-0 -top-40 h-[600px] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/5 blur-[160px] rounded-full" />
        {coverSrc && (
          <img
            src={coverSrc}
            className="absolute inset-0 w-full h-full object-cover opacity-[0.03] blur-[100px] scale-150 grayscale"
            alt=""
          />
        )}
      </div>

      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 mb-12 group relative z-10 text-accent hover:text-white transition-colors py-2"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase font-black tracking-[0.4em] italic">Return to Library</span>
      </motion.button>

      <div className="flex flex-col lg:flex-row gap-20 relative z-10 font-sans">
        {/* HARDWARE COMPONENT: Tactical Artwork */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full lg:w-[400px] shrink-0"
        >
          <div className="relative group p-4 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent shadow-[0_0_15px_rgba(255,77,77,0.4)] rounded-tl-[2rem]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent shadow-[0_0_15px_rgba(255,77,77,0.4)] rounded-br-[2rem]" />
            
            <div className="relative aspect-[3/4.5] bg-[#0d0e12] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-700">
              {coverSrc ? (
                <SmartImage src={coverSrc} alt={syncedManga.title} className="w-full h-full object-cover grayscale-[0.2] brightness-90 group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-105 transition-all duration-1000 ease-out" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-10">
                  <Cpu size={64} strokeWidth={1} />
                  <span className="text-xs uppercase tracking-[0.4em] font-black">Null Data</span>
                </div>
              )}
              
              <div className="absolute top-6 right-6">
                <div className={`px-5 py-2 rounded-xl backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3 ${status.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${syncedManga.status === 'reading' ? 'bg-accent animate-pulse' : 'bg-white/20'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">{status.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <p className="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.3em]">Module Index</p>
                <p className="text-sm font-mono-tech text-white italic">CHIYO-S-{syncedManga.id.toString().padStart(4, '0')}</p>
             </div>
             <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <p className="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.3em]">Neural Stability</p>
                <p className="text-sm font-mono-tech text-accent italic">{syncedManga.rating ? syncedManga.rating.toFixed(1) : '0.0'} / 10.0</p>
             </div>
          </div>
        </motion.div>

        {/* INTELLIGENCE READOUT: Data & Metrics */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex-1 space-y-16">
          <motion.div variants={item} className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-[2px] bg-accent" />
               <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent italic">Series Intelligence Dossier</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-black text-white leading-[0.85] tracking-tighter italic uppercase drop-shadow-2xl">
              {syncedManga.title}
            </h1>
            <div className="flex flex-wrap items-center gap-8 text-text-muted/40 font-black text-[9px] uppercase tracking-[0.4em] italic ml-1">
              <div className="flex items-center gap-3">
                <Calendar size={12} className="text-accent/40" />
                <span>Link Established {new Date(syncedManga.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Layers size={12} className="text-accent/40" />
                <span>Architecture: {syncedManga.format || 'Standard'}</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] p-10 relative overflow-hidden group">
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent italic">Neural Progress</span>
                  <div className="flex gap-3">
                    <button onClick={() => handleChapterChange(-1)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white">
                      <Minus size={18} />
                    </button>
                    <button onClick={() => handleChapterChange(1)} className="w-12 h-12 rounded-2xl bg-accent text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,77,77,0.3)]">
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl font-syncopate font-black text-white italic leading-none">{lastReadChapter.toString().padStart(2, '0')}</span>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">Modules</p>
                     <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest italic">Synchronized</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-accent relative" />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono-tech font-bold uppercase tracking-[0.2em] text-text-muted/30 italic">
                    <span>Baseline Sync (C:{lastCompletedChapter})</span>
                    <span>{syncedManga.total_chapters || 'INF.'} Total Modules</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] p-10 space-y-8">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-text-muted/40 italic">System Specs</span>
                <p className="text-sm text-text-muted leading-relaxed italic line-clamp-4">{syncedManga.description || 'No neural description registered for this dossier.'}</p>
                <div className="flex flex-wrap gap-2">
                  {syncedManga.genres?.length ? syncedManga.genres.map(genre => (
                    <span key={genre} className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-text-muted border border-white/5">
                      {genre}
                    </span>
                  )) : null}
                </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="flex gap-6 pt-0">
            {nextChapter && (
              <button
                onClick={() => {
                  onReadChapter(nextChapter.id, syncedManga.id_source, syncedManga.id_manga, { dbId: syncedManga.id, chapterNumber: nextChapter.chapterNumber });
                }}
                className="h-20 flex-[3] bg-accent text-background rounded-3xl shadow-[0_15px_30px_rgba(255,77,77,0.3)] group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-4">
                  <Play size={20} fill="currentColor" />
                  <span className="text-[12px] uppercase tracking-[0.6em] font-black italic">
                    {nextChapterStatus?.label} CH. {nextChapter.chapterNumber}
                  </span>
                </span>
              </button>
            )}
            <button onClick={() => onEdit(syncedManga)} className="flex-[2] h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center gap-5 hover:bg-white/10 hover:border-accent/40 transition-all group overflow-hidden relative">
              <span className="text-[12px] uppercase tracking-[0.6em] font-black relative z-10 italic text-text-muted group-hover:text-white">Parameters</span>
            </button>
            <button onClick={() => onDelete(syncedManga.id)} className="w-20 h-20 rounded-3xl bg-red-600/5 text-red-600/30 hover:bg-red-600 hover:text-background border border-white/5 flex items-center justify-center transition-all group shadow-2xl active:scale-95">
              <Trash2 size={24} />
            </button>
          </motion.div>

          {/* CHAPTERS ENGINE: Integrated Reader Access */}
          {syncedManga.id_source && (
            <motion.div variants={item} className="space-y-8 pt-10">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white italic">Neural Chapters</h3>
                {loadingChapters && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-auto pr-2 scrollbar-hide">
                <AnimatePresence>
                  {chapterState.orderedChapters.map((chapter) => {
                    const status = chapterState.getStatus(chapter.id);
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => {
                          onReadChapter(chapter.id, syncedManga.id_source, syncedManga.id_manga, { dbId: syncedManga.id, chapterNumber: chapter.chapterNumber });
                        }}
                        className="flex flex-col p-5 bg-surface/40 rounded-2xl border border-white/5 hover:border-accent/40 hover:bg-surface transition-all group group/chapter relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between w-full relative z-10">
                          <div className="flex flex-col items-start gap-1 text-left">
                            <span className="text-xs font-bold text-white group-hover/chapter:text-accent transition-colors line-clamp-1">{chapter.title}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">Module {chapter.chapterNumber}</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-[7px] font-black tracking-widest ${status.completed ? 'bg-green-500/20 text-green-500' : 'bg-accent/10 text-accent'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {status.label}
                          </div>
                        </div>

                        {/* Progress Bar Overlay */}
                        {status.progress > 0 && (
                          <div className="absolute bottom-0 left-0 h-[2px] bg-accent shadow-[0_0_8px_rgba(255,77,77,0.8)]" style={{ width: `${status.progress * 100}%` }} />
                        )}
                      </button>
                    );
                  })}
                </AnimatePresence>

                {!loadingChapters && chapters.length === 0 && (
                   <div className="col-span-full py-10 text-center text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-30 italic">
                      Zero Module Links Discovered
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
