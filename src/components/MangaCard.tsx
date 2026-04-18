import { Manga } from '../types'
import { BookOpen, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface MangaCardProps {
  manga: Manga;
  onClick: (id: number) => void;
  onQuickUpdate?: (id: number, chapter: number) => void;
}

const statusConfig = {
  reading: { icon: BookOpen, color: 'text-primary', label: 'Reading' },
  completed: { icon: CheckCircle2, color: 'text-success', label: 'Completed' },
  'on-hold': { icon: Clock, color: 'text-warning', label: 'On Hold' },
  dropped: { icon: XCircle, color: 'text-error', label: 'Dropped' },
  'plan-to-read': { icon: Clock, color: 'text-text-muted', label: 'Not Started' },
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group cursor-pointer relative aspect-[3/4.5] bg-surface-lighter rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 hover:border-accent/30 hover:shadow-accent/5"
      onClick={() => onClick(manga.id)}
    >
      {/* Cover Image */}
      {manga.cover_url ? (
        <img 
          src={manga.cover_url} 
          alt={manga.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
          <BookOpen size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Artwork Missing</span>
        </div>
      )}
      
      {/* Premium Overlay (Matches Live Preview) */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col justify-end p-4">
        <div className="space-y-1.5">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/5">
            <StatusIcon size={9} className={status.color} />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/90">{status.label}</span>
          </div>
          
          <h3 className="text-sm font-black text-white leading-tight line-clamp-2 italic uppercase tracking-tight group-hover:text-accent transition-colors" title={manga.title}>
            {manga.title}
          </h3>

          <div className="flex items-center justify-between text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">
            <span>Ch. {manga.current_chapter}</span>
          </div>

          {/* Integrated Progress Bar */}
          <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden mt-1">
             <div 
               className="h-full bg-accent transition-all duration-700 ease-out" 
               style={{ width: `${Math.min((manga.current_chapter / (manga.total_chapters || 1)) * 100, 100)}%` }} 
             />
          </div>
        </div>
      </div>

      {/* Quick Add Button Overlay */}
      {onQuickUpdate && (
        <button 
          onClick={handleQuickAdd}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-accent/20 z-20"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      )}
    </motion.div>
  )
}
