import { Manga } from '../types'
import MangaCard from '../components/MangaCard'
import Dashboard from '../components/Dashboard'
import { Library as LibraryIcon, Loader2, Cpu, Database } from 'lucide-react'
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
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-accent opacity-20" size={64} strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Cpu className="text-accent animate-pulse" size={24} />
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.6em] font-black text-accent/40 animate-pulse italic">Synchronizing Neural Vault</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
      <div className="flex items-center justify-between px-2 pt-4 pb-6">
        <div className="flex items-center gap-4">
          <Database size={16} className="text-accent/40" />
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-white">
            <span className="text-accent">Chiyo</span> Core Library
          </h2>
          <div className="flex items-center gap-2 px-3 py-0.5 bg-white/5 rounded-md border border-white/5">
             <span className="text-[8px] font-mono-tech font-bold text-text-muted/60 uppercase">{mangas.length} SECTORS</span>
          </div>
        </div>
        <div className="h-[1px] flex-1 mx-8 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      {mangas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-[50vh] flex flex-col items-center justify-center text-text-muted gap-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-accent/10 blur-[100px] rounded-full scale-150 group-hover:bg-accent/20 transition-colors" />
            <div className="relative p-12 bg-[#0d0e12] backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl">
              <LibraryIcon size={80} strokeWidth={0.5} className="text-white/10" />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Zero Data Detected</h3>
            <div className="flex flex-col items-center gap-2 opacity-50">
              <span className="text-[9px] uppercase tracking-[0.4em] font-black text-accent/60">Search parameters yielding null results</span>
              <p className="text-[8px] uppercase tracking-[0.2em] font-bold italic">Clear active filters to restore library visibility</p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 px-10 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:border-accent/40 hover:text-white"
            >
              Reset All Sectors
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-8 px-2"
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
