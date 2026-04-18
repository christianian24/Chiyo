import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, Settings, Filter, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Manga } from './types'
import Library from './pages/Library'
import Detail from './pages/Detail'
import AddEditModal from './components/AddEditModal'
import SettingsModal from './components/SettingsModal'
import SplashScreen from './components/SplashScreen'
import ConfirmModal from './components/ConfirmModal'
import CustomSelect from './components/CustomSelect'

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Slice of Life", "Sci-Fi", "Mystery"]
const FORMATS = ["Manga", "Manhwa", "Manhua", "Light Novel", "One-shot"]
const PUB_STATUSES = ["Ongoing", "Completed", "Hiatus", "Cancelled"]

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
  const [selectedGenre, setSelectedGenre] = useState<string>('Any')
  const [selectedFormat, setSelectedFormat] = useState<string>('Any')
  const [selectedPubStatus, setSelectedPubStatus] = useState<string>('Any')
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
    const matchesGenre = selectedGenre === 'Any' || (m.genres && m.genres.split(',').includes(selectedGenre))
    const matchesFormat = selectedFormat === 'Any' || m.format === selectedFormat
    const matchesPubStatus = selectedPubStatus === 'Any' || m.publishing_status === selectedPubStatus
    return matchesSearch && matchesStatus && matchesGenre && matchesFormat && matchesPubStatus
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
            <header className="pt-6 pb-2 px-10 bg-background z-20 shrink-0 flex flex-col gap-4 relative group/header">
              {/* Decorative Background Logo Container */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-b-[3rem]">
                <div className="absolute -top-28 -right-10 w-96 h-96 opacity-[0.1] grayscale transition-opacity duration-1000 group-hover/header:opacity-[0.15]">
                  <img 
                    src="logo.jpg" 
                    className="w-full h-full object-cover rounded-full" 
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/50 to-background" />
                </div>
              </div>

              {/* Tier 1: Logo & Tabs */}
              <div className="flex items-center justify-between h-12">
                <div 
                  className="flex items-center cursor-pointer group"
                  onClick={() => setSelectedMangaId(null)}
                >
                  <h1 className="text-3xl font-syncopate font-bold tracking-tighter uppercase italic text-white flex items-baseline gap-0 group drop-shadow-2xl">
                    <span className="group-hover:text-accent transition-all duration-700 ease-out">Chi</span>
                    <span className="text-accent group-hover:text-white transition-all duration-700 ease-out">yo</span>
                    <span className="w-2 h-2 rounded-full bg-accent ml-1.5 mb-1.5 block scale-0 group-hover:scale-100 transition-all duration-500 shadow-lg shadow-accent/40" />
                  </h1>
                </div>

                {!selectedMangaId && (
                  <div className="flex items-center gap-8">
                    {['all', 'reading', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`relative py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                          statusFilter === status 
                          ? 'text-accent' 
                          : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {status}
                        {statusFilter === status && (
                          <motion.div 
                            layoutId="activeTab"
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="w-[180px]" /> {/* Balancing spacer */}
              </div>

              {/* Separator Line */}
              {!selectedMangaId && (
                <div className="h-[1px] w-full bg-white/[0.03]" />
              )}
              
              {/* Tier 2: Search & Actions */}
              {!selectedMangaId && (
                <div className="flex items-center gap-3">
                  {/* Genres Picker */}
                  <CustomSelect 
                    value={selectedGenre}
                    options={['Any', ...GENRES]}
                    onChange={setSelectedGenre}
                    placeholder="Genre"
                    className="w-[130px]"
                  />

                  {/* Format Picker */}
                  <CustomSelect 
                    value={selectedFormat}
                    options={['Any', ...FORMATS]}
                    onChange={setSelectedFormat}
                    placeholder="Format"
                    className="w-[120px]"
                  />

                  {/* Status Picker */}
                  <CustomSelect 
                    value={selectedPubStatus}
                    options={['Any', ...PUB_STATUSES]}
                    onChange={setSelectedPubStatus}
                    placeholder="Status"
                    className="w-[120px]"
                  />

                  <div className="relative flex-1 group self-end mb-0.5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search series..." 
                      className="input pl-11 h-10 bg-surface/50 border-white/5 focus:border-accent/40 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-10 h-10 flex items-center justify-center bg-surface/50 rounded-xl border border-white/5 hover:bg-white/5 transition-colors text-text-muted hover:text-white self-end mb-0.5"
                  >
                    <Settings size={18} />
                  </button>

                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary h-10 flex items-center gap-2 px-6 self-end mb-0.5"
                  >
                    <Plus size={18} strokeWidth={3} />
                    <span className="text-xs uppercase tracking-[0.2em] font-black">Add New</span>
                  </button>
                </div>
              )}
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
