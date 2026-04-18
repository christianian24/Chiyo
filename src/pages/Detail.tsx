import { Manga } from '../types'
import { ArrowLeft, Edit2, Trash2, Plus, Minus, Calendar, BookOpen, Clock, CheckCircle2, XCircle, Hash, Layers, Info, Zap } from 'lucide-react'
import { motion, Variants } from 'framer-motion'

interface DetailProps {
  manga: Manga;
  onBack: () => void;
  onDelete: (id: number, cover_path: string) => void;
  onEdit: (manga: Manga) => void;
  onUpdateChapter: (id: number, chapter: number) => void;
}

const statusConfig = {
  'plan-to-read': { icon: Clock, color: 'text-text-muted', label: 'Not Started', bg: 'bg-white/5' },
  reading: { icon: BookOpen, color: 'text-accent', label: 'Reading', bg: 'bg-accent/10' },
  completed: { icon: CheckCircle2, color: 'text-success', label: 'Completed', bg: 'bg-success/10' },
  'on-hold': { icon: Clock, color: 'text-warning', label: 'On Hold', bg: 'bg-warning/10' },
  dropped: { icon: XCircle, color: 'text-error', label: 'Dropped', bg: 'bg-error/10' },
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
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } }
};

export default function Detail({ manga, onBack, onDelete, onEdit, onUpdateChapter }: DetailProps) {
  const status = statusConfig[manga.status] || statusConfig.reading;
  const StatusIcon = status.icon;

  const handleChapterChange = (delta: number) => {
    const newChapter = Math.max(0, manga.current_chapter + delta);
    onUpdateChapter(manga.id, newChapter);
  };

  const progressPercent = Math.min((manga.current_chapter / (manga.total_chapters || 1)) * 100, 100);

  return (
    <div className="relative min-h-[80vh] pb-10">
      {/* Cinematic Background Glow */}
      <div className="absolute inset-x-0 -top-40 h-[600px] pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/10 blur-[140px] rounded-full animate-pulse"
          style={{ transition: 'background-color 1s ease' }}
        />
        {manga.cover_url && (
          <img 
            src={manga.cover_url} 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.05] blur-[80px] scale-150"
          />
        )}
      </div>

      <motion.button 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 mb-12 group relative z-10 text-text-muted hover:text-white transition-colors py-2"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase font-black tracking-[0.3em]">Return to Library</span>
      </motion.button>

      <div className="flex flex-col lg:flex-row gap-16 relative z-10">
        {/* HERO SIDEBAR: Cover Artwork */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-80 shrink-0"
        >
          <div className="relative group">
            <div className="absolute -inset-4 bg-accent/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative aspect-[3/4.5] bg-surface-lighter rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10 ring-1 ring-white/5">
              {manga.cover_url ? (
                <img src={manga.cover_url} alt={manga.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-10">
                  <BookOpen size={64} strokeWidth={0.5} />
                  <span className="text-xs uppercase tracking-widest font-black">Missing Artwork</span>
                </div>
              )}
              {/* Quick Status Overlay */}
              <div className="absolute top-6 right-6">
                <div className={`px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 ${status.bg}`}>
                  <StatusIcon size={12} className={status.color} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{status.label}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CONTENT SIDE: Metrics & Metadata */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 space-y-12"
        >
          {/* HEADER: Title & Basic Info */}
          <motion.div variants={item} className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter italic uppercase">
              {manga.title}
            </h1>
            <div className="flex items-center gap-6 text-text-muted/40 font-black text-[10px] uppercase tracking-[0.2em] ml-1">
               <div className="flex items-center gap-2">
                 <Calendar size={12} />
                 <span>Started {new Date(manga.created_at).toLocaleDateString()}</span>
               </div>
               <div className="w-[1px] h-3 bg-white/10" />
               <div className="flex items-center gap-2">
                 <Layers size={12} />
                 <span>{manga.format || 'Standard Format'}</span>
               </div>
            </div>
          </motion.div>

          {/* METRICS: Progress Tracking */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dynamic Progress Card */}
            <div className="bg-surface/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl">

              
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Dynamic Progress</span>
                  <div className="flex gap-2">
                     <button 
                       onClick={() => handleChapterChange(-1)}
                       className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                     >
                       <Minus size={16} />
                     </button>
                     <button 
                       onClick={() => handleChapterChange(1)}
                       className="w-10 h-10 rounded-xl bg-accent text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                     >
                       <Plus size={16} strokeWidth={3} />
                     </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-white italic leading-none">{manga.current_chapter}</span>
                  <span className="text-xs font-bold text-text-muted/40 uppercase tracking-widest mb-1">Chapters Read</span>
                </div>

                {/* Progress Bar Visualizer */}
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-accent relative"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-text-muted/30">
                    <span>Journey Started</span>
                    <span>{manga.total_chapters || '∞'} Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Scope Card */}
            <div className="bg-surface/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl">

              <div className="flex flex-col gap-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted/40">Series Specifications</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-text-muted/20 uppercase tracking-widest leading-none">Status</p>
                    <p className="text-sm font-black uppercase italic text-white/90">{manga.publishing_status || 'Ongoing'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-text-muted/20 uppercase tracking-widest leading-none">Format</p>
                    <p className="text-sm font-black uppercase italic text-white/90">{manga.format || 'Standard'}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <p className="text-[8px] font-black text-text-muted/20 uppercase tracking-widest leading-none">Category Overview</p>
                  <div className="flex flex-wrap gap-2">
                    {manga.genres ? manga.genres.split(',').map(genre => (
                      <span key={genre} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5">
                        {genre}
                      </span>
                    )) : (
                      <span className="text-[9px] font-black uppercase text-white/10 italic">No Genres Assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* TIMELINE: Operational Lifecycle */}
          <motion.div variants={item} className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-40">Lifecycle Timeline</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 leading-none">
              <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-colors">
                 <div className="space-y-2">
                   <p className="text-[8px] uppercase tracking-[0.2em] font-black text-text-muted/30">Start Date</p>
                   <p className="text-base font-black italic">{manga.date_started || '—'}</p>
                 </div>
                 <Calendar size={20} className="text-white opacity-10 group-hover:opacity-30 transition-opacity" />
              </div>
              <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-colors">
                 <div className="space-y-2">
                   <p className="text-[8px] uppercase tracking-[0.2em] font-black text-text-muted/30">Finish Date</p>
                   <p className="text-base font-black italic">{manga.date_finished || '—'}</p>
                 </div>
                 <CheckCircle2 size={20} className="text-white opacity-10 group-hover:opacity-30 transition-opacity" />
              </div>
            </div>
          </motion.div>

          {/* ACTIONS: Operational Control */}
          <motion.div variants={item} className="flex gap-4 pt-8">
            <button 
              onClick={() => onEdit(manga)}
              className="flex-[4] h-16 rounded-[1.25rem] bg-white/[0.03] border border-white/5 flex items-center justify-center gap-4 hover:bg-white/5 transition-all group overflow-hidden relative shadow-2xl"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Edit2 size={18} className="text-accent opacity-60 relative z-10" />
              <span className="text-[11px] uppercase tracking-[0.35em] font-black relative z-10">Refine Collection Data</span>
            </button>
            <button 
              onClick={() => onDelete(manga.id, manga.cover_path)}
              className="w-16 h-16 rounded-[1.25rem] bg-red-500/5 text-red-500/30 hover:bg-red-500/10 hover:text-red-500 border border-white/5 flex items-center justify-center transition-all group shadow-2xl"
            >
              <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
