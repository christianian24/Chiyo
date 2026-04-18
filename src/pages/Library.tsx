import { Manga } from '../types'
import MangaCard from '../components/MangaCard'
import Dashboard from '../components/Dashboard'
import { Library as LibraryIcon, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LibraryProps {
  mangas: Manga[];
  allMangas: Manga[];
  onSelect: (id: number) => void;
  onQuickUpdate: (id: number, chapter: number) => void;
  loading: boolean;
  isFiltering: boolean;
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

export default function Library({ mangas, allMangas, onSelect, onQuickUpdate, loading, isFiltering }: LibraryProps) {
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent opacity-40" size={48} strokeWidth={1} />
        <span className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30 animate-pulse">Synchronizing Chiyo Vault</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {!isFiltering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Dashboard manga={allMangas} onSelect={onSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Library Header */}
      <div className="flex items-center justify-between px-2 pt-4 pb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted/60">Chiyo Library List</h2>
        <div className="h-[1px] flex-1 mx-6 bg-white/5" />
      </div>

      {mangas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-[50vh] flex flex-col items-center justify-center text-text-muted gap-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full scale-150 group-hover:bg-accent/30 transition-colors" />
            <div className="relative p-12 bg-surface/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl">
              <LibraryIcon size={80} strokeWidth={0.5} className="text-white/20" />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">No Results Found</h3>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <span className="text-[10px] uppercase tracking-[0.3em] font-black">Your current filters are too specific</span>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold italic">Or maybe it's time to start a new journey?</p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Reset Filters
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
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
      )}
    </div>
  )
}
