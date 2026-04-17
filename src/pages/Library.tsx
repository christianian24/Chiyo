import { Manga } from '../types'
import MangaCard from '../components/MangaCard'
import { Library as LibraryIcon, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface LibraryProps {
  mangas: Manga[];
  onSelect: (id: number) => void;
  onQuickUpdate: (id: number, chapter: number) => void;
  loading: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export default function Library({ mangas, onSelect, onQuickUpdate, loading }: LibraryProps) {
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white opacity-20" size={48} strokeWidth={1} />
        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-30">Synchronizing Library</span>
      </div>
    )
  }

  if (mangas.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-[60vh] flex flex-col items-center justify-center text-text-muted gap-6"
      >
        <div className="relative">
          <LibraryIcon size={120} strokeWidth={0.5} className="opacity-10" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-accent/5 blur-[60px] rounded-full"
          />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-white italic tracking-tighter">EMPTY COLLECTION</h3>
          <p className="text-xs uppercase tracking-widest opacity-40">Your journey hasn't started yet</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-8"
    >
      {mangas.map(manga => (
        <MangaCard 
          key={manga.id} 
          manga={manga} 
          onClick={onSelect}
          onQuickUpdate={onQuickUpdate}
        />
      ))}
    </motion.div>
  )
}
