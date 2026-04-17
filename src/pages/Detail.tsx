import { Manga } from '../types'
import { ArrowLeft, Edit2, Trash2, Plus, Minus, Calendar, BookOpen, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface DetailProps {
  manga: Manga;
  onBack: () => void;
  onDelete: (id: number, cover_path: string) => void;
  onEdit: (manga: Manga) => void;
  onUpdateChapter: (id: number, chapter: number) => void;
}

const statusConfig = {
  reading: { icon: BookOpen, color: 'text-primary', label: 'Reading' },
  completed: { icon: CheckCircle2, color: 'text-success', label: 'Completed' },
  'on-hold': { icon: Clock, color: 'text-warning', label: 'On Hold' },
  dropped: { icon: XCircle, color: 'text-error', label: 'Dropped' },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function Detail({ manga, onBack, onDelete, onEdit, onUpdateChapter }: DetailProps) {
  const status = statusConfig[manga.status] || statusConfig.reading;
  const StatusIcon = status.icon;

  const handleChapterChange = (delta: number) => {
    const newChapter = Math.max(0, manga.current_chapter + delta);
    onUpdateChapter(manga.id, newChapter);
  };

  return (
    <div className="relative min-h-[80vh]">
      {/* Hero Background Decor */}
      <div className="absolute inset-0 -top-20 -mx-10 overflow-hidden pointer-events-none opacity-[0.15] blur-[120px]">
        {manga.cover_url && (
          <img src={manga.cover_url} className="w-full h-full object-cover scale-150 rotate-6" />
        )}
      </div>

      <motion.button 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="btn flex items-center gap-2 mb-8 group relative z-10 px-0 bg-transparent hover:bg-transparent text-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase font-black tracking-[0.2em]">Return to Library</span>
      </motion.button>

      <div className="flex flex-col lg:flex-row gap-10 relative z-10">
        {/* Cover Image Side (Hero card) - Compact Width */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-64 shrink-0"
        >
          <div className="card shadow-2xl overflow-hidden ring-1 ring-white/5 group rounded-[2rem]">
            {manga.cover_url ? (
              <img src={manga.cover_url} alt={manga.title} className="w-full h-full object-cover" />
            ) : (
              <div className="aspect-[3/4] w-full bg-white/[0.02] flex items-center justify-center text-text-muted">
                <BookOpen size={48} strokeWidth={0.5} className="opacity-10" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Info Side */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 space-y-10"
        >
          <motion.div variants={item} className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.03] border border-white/5 ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </div>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tighter italic uppercase underline underline-offset-8 decoration-white/5">
              {manga.title}
            </h2>
            <div className="flex items-center gap-3 text-text-muted text-[9px] uppercase tracking-widest font-black opacity-50">
              <Clock size={10} />
              <span>Initialized</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>{new Date(manga.created_at).toLocaleDateString()}</span>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Progress Card - Tightened */}
            <div className="glass p-6 rounded-2xl relative overflow-hidden group border-white/5">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookOpen size={48} />
              </div>
              <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.25em] mb-4 opacity-40">Dynamic Progress</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white italic">{manga.current_chapter}</span>
                  <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Chapter</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleChapterChange(-1)}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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
            </div>

            {/* Total Card - Tightened */}
            <div className="glass p-6 rounded-2xl relative overflow-hidden group border-white/5">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 size={48} />
              </div>
              <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.25em] mb-4 opacity-40">Volume Scope</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black italic">{manga.total_chapters || '—'}</span>
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Available</span>
              </div>
            </div>
          </motion.div>

          {/* Operational Timeline - Compact */}
          <motion.div variants={item} className="space-y-4">
            <h4 className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-30">
              <Calendar size={12} />
              Lifecycle
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.015] p-5 rounded-xl border border-white/[0.03]">
                <p className="text-text-muted text-[8px] uppercase tracking-widest font-black mb-2 opacity-30">Commenced</p>
                <p className="font-black text-sm italic">{manga.date_started || '—'}</p>
              </div>
              <div className="bg-white/[0.015] p-5 rounded-xl border border-white/[0.03]">
                <p className="text-text-muted text-[8px] uppercase tracking-widest font-black mb-2 opacity-30">Concluded</p>
                <p className="font-black text-sm italic">{manga.date_finished || '—'}</p>
              </div>
            </div>
          </motion.div>

          {/* Action Footer - Low Profile */}
          <motion.div variants={item} className="flex gap-3 pt-6">
            <button 
              onClick={() => onEdit(manga)}
              className="px-6 py-3 rounded-xl bg-white/[0.02] border border-white/5 flex-[4] flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
            >
              <Edit2 size={16} className="opacity-30" />
              <span className="text-[10px] uppercase tracking-[0.25em] font-black">Refine Data</span>
            </button>
            <button 
              onClick={() => onDelete(manga.id, manga.cover_path)}
              className="w-12 h-12 rounded-xl bg-red-500/5 text-red-500/30 hover:bg-red-500/10 hover:text-red-500 border border-white/5 flex items-center justify-center transition-all"
            >
              <Trash2 size={18} />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
