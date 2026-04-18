import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Manga } from './types'
import Library from './pages/Library'
import Detail from './pages/Detail'
import AddEditModal from './components/AddEditModal'
import SettingsModal from './components/SettingsModal'
import SplashScreen from './components/SplashScreen'
import ConfirmModal from './components/ConfirmModal'

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, func: (...args: any[]) => void) => void;
    }
  }
}

function App() {
  const [mangas, setMangas] = useState<Manga[]>([])
  const [selectedMangaId, setSelectedMangaId] = useState<number | null>(null)
  const [editingManga, setEditingManga] = useState<Manga | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [isLogoLoaded, setIsLogoLoaded] = useState(false)
  const [mangaToDelete, setMangaToDelete] = useState<Manga | null>(null)

  const isElectron = !!window.electron

  const fetchMangas = async () => {
    if (!isElectron) {
      setLoading(false)
      return []
    }
    try {
      const result = await window.electron.invoke('get-mangas')
      setMangas(result)
      return result
    } catch (error) {
      console.error('Failed to fetch mangas:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      // Parallel Preloading: Data + Minimum Timer
      const preloading = Promise.all([
        fetchMangas(),
        window.electron.invoke('get-maintenance-status'),
        new Promise(resolve => setTimeout(resolve, 2500)) // 2.5s Elegant Pause
      ]);

      await preloading;
      setShowSplash(false);
    };

    init();
  }, [])

  const handleAddManga = async (mangaData: any) => {
    if (!isElectron) return
    await window.electron.invoke('add-manga', mangaData)
    fetchMangas()
    setIsAddModalOpen(false)
  }

  const handleUpdateManga = async (mangaData: any) => {
    if (!isElectron) return
    await window.electron.invoke('update-manga', mangaData)
    fetchMangas()
    setEditingManga(null)
  }

  const handleDeleteManga = (id: number, cover_path: string) => {
    const manga = mangas.find(m => m.id === id)
    if (manga) setMangaToDelete(manga)
  }

  const processDelete = async () => {
    if (!isElectron || !mangaToDelete) return
    await window.electron.invoke('delete-manga', { 
      id: mangaToDelete.id, 
      cover_path: mangaToDelete.cover_path 
    })
    fetchMangas()
    setSelectedMangaId(null)
    setMangaToDelete(null)
  }

  const handleUpdateChapter = async (id: number, chapter: number) => {
    if (!isElectron) return
    await window.electron.invoke('update-chapter', { id, chapter })
    fetchMangas()
  }

  const filteredMangas = mangas.filter((m: Manga) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedManga = mangas.find((m: Manga) => m.id === selectedMangaId)

  return (
    <div className="h-screen bg-background text-text select-none overflow-hidden relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen 
            key="splash" 
            onLoaded={() => setIsLogoLoaded(true)} 
          />
        ) : (
          <motion.div 
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="h-screen flex flex-col relative"
          >
            {/* Background Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
            
            {/* Header */}
            <header className="h-20 border-b border-white/[0.03] flex items-center justify-between px-10 bg-background/80 backdrop-blur-xl z-20 shrink-0">
              <div className="flex items-center gap-10">
                <div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setSelectedMangaId(null)}
                >
                  <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-500">
                    {/* Logo Glow */}
                    <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img 
                      src="logo.jpg" 
                      alt="Chiyo Logo" 
                      className="w-full h-full object-contain relative z-10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center text-background font-black">千</div>';
                      }}
                    />
                  </div>
                  <h1 className="text-xl font-black tracking-tight uppercase italic underline underline-offset-4 decoration-white/20">Chiyo</h1>
                </div>
                
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors opacity-30 hover:opacity-100"
                >
                  <Settings size={20} />
                </button>
              </div>

              {!selectedMangaId && (
                <div className="flex items-center gap-6 flex-1 max-w-2xl mx-12">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-white transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search series..." 
                      className="input pl-12 h-11 bg-white/[0.02] border-white/5"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1 p-1.5 bg-white/[0.03] rounded-2xl border border-white/5">
                    {['all', 'reading', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          statusFilter === status 
                          ? 'bg-accent text-background shadow-lg shadow-white/5' 
                          : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-primary flex items-center gap-2 px-6"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span className="text-xs uppercase tracking-widest font-black">Add New</span>
              </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-10 scrollbar-hide relative">
              <AnimatePresence mode="wait">
                {selectedManga ? (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Detail 
                      manga={selectedManga} 
                      onBack={() => setSelectedMangaId(null)}
                      onDelete={handleDeleteManga}
                      onUpdateChapter={handleUpdateChapter}
                      onEdit={(m) => setEditingManga(m)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Library 
                      mangas={filteredMangas} 
                      onSelect={setSelectedMangaId}
                      loading={loading}
                      onQuickUpdate={handleUpdateChapter}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Modals */}
            <AnimatePresence>
              {(isAddModalOpen || editingManga) && (
                <AddEditModal 
                  onClose={() => {
                    setIsAddModalOpen(false)
                    setEditingManga(null)
                  }} 
                  onSubmit={editingManga ? handleUpdateManga : handleAddManga}
                  initialData={editingManga}
                  isElectron={isElectron}
                />
              )}
              {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
              )}
              {mangaToDelete && (
                <ConfirmModal 
                  title="Permanently Purge?"
                  message={`Are you absolutely sure you want to remove "${mangaToDelete.title}" from your collection? This action cannot be undone.`}
                  confirmLabel="Purge Series"
                  cancelLabel="Retain"
                  onConfirm={processDelete}
                  onCancel={() => setMangaToDelete(null)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
