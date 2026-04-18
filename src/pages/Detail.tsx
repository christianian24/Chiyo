import { Manga } from '../types'
import { ArrowLeft, Edit2, Trash2, Plus, Minus, Calendar, BookOpen, Clock, CheckCircle2, XCircle, Hash, Layers, Info, Zap, Activity, Cpu } from 'lucide-react'
import { motion, Variants } from 'framer-motion'

interface DetailProps {
  manga: Manga;
  onBack: () => void;
  onDelete: (id: number, cover_path: string) => void;
  onEdit: (manga: Manga) => void;
  onUpdateChapter: (id: number, chapter: number) => void;
  onToggleFeatured: (id: number, isFeatured: boolean) => void;
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

export default function Detail({ manga, onBack, onDelete, onEdit, onUpdateChapter }: DetailProps) {
  const status = statusConfig[manga.status] || statusConfig.reading;
  const StatusIcon = status.icon;

  const handleChapterChange = (delta: number) => {
    const newChapter = Math.max(0, manga.current_chapter + delta);
    onUpdateChapter(manga.id, newChapter);
  };

  const progressPercent = Math.min((manga.current_chapter / (manga.total_chapters || 100)) * 100, 100);

  return (
    <div className="relative min-h-[80vh] pb-20">
      {/* RedMagic Prismatic Glow */}
      <div className="absolute inset-x-0 -top-40 h-[600px] pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/5 blur-[160px] rounded-full"
        />
        {manga.cover_url && (
          <img
            src={manga.cover_url}
            className="absolute inset-0 w-full h-full object-cover opacity-[0.03] blur-[100px] scale-150 grayscale"
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
            {/* Tactical Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent shadow-[0_0_15px_rgba(255,77,77,0.4)] rounded-tl-[2rem]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent shadow-[0_0_15px_rgba(255,77,77,0.4)] rounded-br-[2rem]" />
            
            <div className="relative aspect-[3/4.5] bg-[#0d0e12] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-700">
              {manga.cover_url ? (
                <img src={manga.cover_url} alt={manga.title} className="w-full h-full object-cover grayscale-[0.2] brightness-90 group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-105 transition-all duration-1000 ease-out" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-10">
                  <Cpu size={64} strokeWidth={1} />
                  <span className="text-xs uppercase tracking-[0.4em] font-black">Null Data</span>
                </div>
              )}
              
              {/* Dynamic Status Engine */}
              <div className="absolute top-6 right-6">
                <div className={`px-5 py-2 rounded-xl backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3 ${status.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${manga.status === 'reading' ? 'bg-accent animate-pulse' : 'bg-white/20'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">{status.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Hardware Specs Readout */}
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <p className="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.3em]">Module Index</p>
                <p className="text-sm font-mono-tech text-white italic">CHIYO-S-{manga.id.toString().padStart(4, '0')}</p>
             </div>
             <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <p className="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.3em]">Neural Stability</p>
                <p className="text-sm font-mono-tech text-accent italic">{manga.rating ? manga.rating.toFixed(1) : '0.0'} / 10.0</p>
             </div>
          </div>
        </motion.div>

        {/* INTELLIGENCE READOUT: Data & Metrics */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 space-y-16"
        >
          {/* DOSSIER HEADER */}
          <motion.div variants={item} className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-[2px] bg-accent" />
               <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent italic">Series Intelligence Dossier</span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.85] tracking-tighter italic uppercase drop-shadow-2xl">
              {manga.title}
            </h1>
            <div className="flex flex-wrap items-center gap-8 text-text-muted/40 font-black text-[9px] uppercase tracking-[0.4em] italic ml-1">
              <div className="flex items-center gap-3">
                <Calendar size={12} className="text-accent/40" />
                <span>Link Established {new Date(manga.created_at).toLocaleDateString()}</span>
              </div>
              <div className="w-[1.5px] h-3 bg-white/10" />
              <div className="flex items-center gap-3">
                <Layers size={12} className="text-accent/40" />
                <span>Architecture: {manga.format || 'Standard'}</span>
              </div>
            </div>
          </motion.div>

          {/* TELEMETRY: Progression Systems */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Neural Progress Matrix */}
            <div className="bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Activity size={100} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent italic">Neural Progress</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleChapterChange(-1)}
                      className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => handleChapterChange(1)}
                      className="w-12 h-12 rounded-2xl bg-accent text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,77,77,0.3)]"
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-4">
                  <span className="text-7xl font-syncopate font-black text-white italic leading-none">{manga.current_chapter.toString().padStart(2, '0')}</span>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">Modules</p>
                     <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest italic">Synchronized</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-accent relative"
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      <div className="absolute inset-0 shadow-[0_0_15px_rgba(255,77,77,0.8)]" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono-tech font-bold uppercase tracking-[0.2em] text-text-muted/30 italic">
                    <span>Baseline Sync</span>
                    <span>{manga.total_chapters || 'INF.'} Total Modules</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logical Identifiers */}
            <div className="bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] p-10 space-y-10">
              <div className="space-y-8">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-text-muted/40 italic">System Specs</span>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-accent/40 uppercase tracking-widest leading-none">Sync Status</p>
                    <p className="text-base font-black uppercase italic text-white leading-none">{manga.publishing_status || 'Ongoing'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-accent/40 uppercase tracking-widest leading-none">Engine Type</p>
                    <p className="text-base font-black uppercase italic text-white leading-none">{manga.format || 'Standard'}</p>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-white/5" />
                <div className="flex flex-wrap gap-2">
                  {manga.genres ? manga.genres.split(',').map(genre => (
                    <span key={genre} className="px-4 py-1.5 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-text-muted hover:bg-white/10 hover:text-white transition-all border border-white/5">
                      {genre}
                    </span>
                  )) : (
                    <span className="text-[9px] font-black uppercase text-accent/20 italic tracking-widest">Null Classifiers</span>
                  )}
                </div>
              </div>

              {manga.tags && (
                <div className="space-y-6 pt-4">
                  <div className="h-[1px] w-full bg-white/5" />
                  <p className="text-[9px] font-black text-accent/40 uppercase tracking-[0.4em] italic leading-none">Personnel Encrypts</p>
                  <div className="flex flex-wrap gap-3">
                    {manga.tags.split(',').map(tag => (
                      <span key={tag} className="px-4 py-2 bg-accent/5 rounded-xl text-[9px] font-mono-tech font-black uppercase tracking-widest text-accent group hover:bg-accent/10 transition-all border border-accent/10">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ACTIONS: Tactical Command */}
          <motion.div variants={item} className="flex gap-6 pt-10">
            {manga.source_url && (
              <button
                onClick={() => window.electron.invoke('open-url', manga.source_url)}
                className="h-20 flex-[2] bg-accent text-background rounded-3xl shadow-[0_15px_30px_rgba(255,77,77,0.3)] group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-4">
                  <Zap size={20} fill="currentColor" />
                  <span className="text-[12px] uppercase tracking-[0.6em] font-black italic">Initiate Link</span>
                </span>
              </button>
            )}
            <button
              onClick={() => onEdit(manga)}
              className="flex-[4] h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center gap-5 hover:bg-white/10 hover:border-accent/40 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-accent/10 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
              <Cpu size={20} className="text-accent relative z-10" />
              <span className="text-[12px] uppercase tracking-[0.6em] font-black relative z-10 italic">Modify Parameters</span>
            </button>
            <button
              onClick={() => onDelete(manga.id, manga.cover_path)}
              className="w-20 h-20 rounded-3xl bg-red-600/5 text-red-600/30 hover:bg-red-600 hover:text-background border border-white/5 flex items-center justify-center transition-all group shadow-2xl active:scale-95"
            >
              <Trash2 size={24} className="group-hover:scale-110 transition-transform duration-500" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
