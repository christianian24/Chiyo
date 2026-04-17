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
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="card group cursor-pointer"
      onClick={() => onClick(manga.id)}
    >
      <div className="aspect-[3/4] overflow-hidden relative">
        {manga.cover_url ? (
          <img 
            src={manga.cover_url} 
            alt={manga.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-text-muted">
            <BookOpen size={40} strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-50">No Cover</span>
          </div>
        )}
        
        {/* Overlay Gradients */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

        {/* Quick Add Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ opacity: 0 }}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-accent text-background flex items-center justify-center shadow-lg group-hover:opacity-100 transition-opacity z-10"
          onClick={handleQuickAdd}
        >
          <Plus size={20} strokeWidth={2.5} />
        </motion.button>
        
        {/* Progress Badge */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Chapter</div>
          <div className="text-xl font-black text-white italic">
            {manga.current_chapter}
            <span className="text-sm font-normal text-text-muted not-italic ml-1">
              {manga.total_chapters ? `/ ${manga.total_chapters}` : ''}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-bold truncate text-base mb-2 text-white" title={manga.title}>
          {manga.title}
        </h3>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
          <StatusIcon size={12} />
          {status.label}
        </div>
      </div>
    </motion.div>
  )
}
