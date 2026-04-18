import { Manga } from '../types'
import { BookOpen, CheckCircle2, Clock, XCircle, Plus, Cpu, Activity } from 'lucide-react'
import { motion } from 'framer-motion'

interface MangaCardProps {
  manga: Manga;
  onClick: (id: number) => void;
  onQuickUpdate?: (id: number, chapter: number) => void;
}

const statusConfig = {
  reading: { icon: BookOpen, color: 'text-accent', label: 'Active Link' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Archived' },
  'on-hold': { icon: Clock, color: 'text-yellow-500', label: 'Standby' },
  dropped: { icon: XCircle, color: 'text-red-600', label: 'Severed' },
  'plan-to-read': { icon: Clock, color: 'text-text-muted/40', label: 'Queued' },
};

export default function MangaCard({ manga, onClick, onQuickUpdate }: MangaCardProps) {
  const status = statusConfig[manga.status] || statusConfig.reading;
  const StatusIcon = status.icon;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(manga.id, manga.current_chapter + 1);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer relative aspect-[3/4.5] bg-[#0d0e12] rounded-2xl overflow-hidden border border-white/[0.03] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-accent/40"
      onClick={() => onClick(manga.id)}
    >
      {/* RedMagic Tactical Brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent/0 group-hover:border-accent/60 transition-all duration-500 z-30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent/0 group-hover:border-accent/60 transition-all duration-500 z-30" />

      {/* Cover Image with Cooling Fan Pulse */}
      {manga.cover_url ? (
        <div className="relative w-full h-full overflow-hidden">
          <img 
            src={manga.cover_url} 
            alt={manga.title} 
            className="w-full h-full object-cover grayscale-[0.2] brightness-90 group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-110 transition-all duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-500" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-10">
          <Cpu size={32} />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-center px-4">Missing Core</span>
        </div>
      )}

      {/* Hardware Interface Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent flex flex-col justify-end p-5">
        <div className="space-y-2">
          {/* Diagnostic Status */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${manga.status === 'reading' ? 'bg-accent animate-pulse' : 'bg-white/20'}`} />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/40 italic">{status.label}</span>
          </div>

          <h3 className="text-sm font-black text-white leading-tight line-clamp-2 italic uppercase tracking-tighter group-hover:text-accent transition-colors">
            {manga.title}
          </h3>

          <div className="flex items-center justify-between">
             <div className="flex items-baseline gap-1">
                <span className="text-lg font-syncopate font-bold text-white leading-none">
                  {manga.current_chapter.toString().padStart(2, '0')}
                </span>
                <span className="text-[8px] font-mono-tech font-bold text-text-muted/40 uppercase">
                   / {manga.total_chapters || '??'}
                </span>
             </div>
             
             {/* Read percentage indicator */}
             <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <Activity size={10} className="text-accent" />
                <span className="text-[7px] font-mono-tech text-white/60">SYNCED</span>
             </div>
          </div>

          {/* Micro-Progress Bar */}
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-accent shadow-[0_0_8px_rgba(255,77,77,0.8)] transition-all duration-700 ease-out"
              style={{ width: `${Math.min((manga.current_chapter / (manga.total_chapters || 100)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Sync Trigger */}
      {onQuickUpdate && (
        <button
          onClick={handleQuickAdd}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-accent text-background flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 shadow-[0_10px_20px_rgba(255,77,77,0.3)] z-40 hover:scale-110 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      )}
    </motion.div>
  )
}
