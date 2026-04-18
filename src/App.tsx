import { useState, useEffect, useRef } from 'react'
import { Plus, Search, BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Manga } from './types'
import Library from './pages/Library'
import Detail from './pages/Detail'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import AddEditModal from './components/AddEditModal'
import SplashScreen from './components/SplashScreen'
import ConfirmModal from './components/ConfirmModal'
import CustomSelect from './components/CustomSelect'
import { AchievementService } from './services/AchievementService'


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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('Any')
  const [selectedFormat, setSelectedFormat] = useState<string>('Any')
  const [selectedPubStatus, setSelectedPubStatus] = useState<string>('Any')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('latest')
  const [view, setView] = useState<'library' | 'detail' | 'profile' | 'settings'>('library')
  const [showSplash, setShowSplash] = useState(true)
  const [mangaToDelete, setMangaToDelete] = useState<Manga | null>(null)

  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [selectedMangaId])

  const SORT_OPTIONS = [
    { value: 'latest', label: 'Last Read' },
    { value: 'title', label: 'Alphabetical' },
    { value: 'progress', label: 'Progression' }
  ]

  const isElectron = !!window.electron

  const fetchMangas = async () => {
    if (!isElectron) {
      setLoading(false)
      return []
    }
    try {
      const result = await window.electron.invoke('get-mangas')
      setMangas(result)
      // Background maintenance (non-blocking)
      checkAchievementsAndXP(result).catch(err => console.error('BG Check failed:', err))
      return result
    } catch (error) {
      console.error('Failed to fetch mangas:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const checkAchievementsAndXP = async (mangaList: Manga[]) => {
    if (!isElectron) return;
    
    try {
      // 1. Calculate and save XP
      const totalXP = AchievementService.calculateXP(mangaList);
      await window.electron.invoke('set-setting', { key: 'total_xp', value: totalXP.toString() });

      // 2. Check for achievement unlocks
      const existingAchievements = await window.electron.invoke('get-achievements');
      const existingIds = existingAchievements.map((a: any) => a.id);
      
      const newUnlocks = AchievementService.checkUnlocks(mangaList, existingIds);
      
      for (const achievement of newUnlocks) {
        await window.electron.invoke('add-achievement', achievement);
        console.log('Achievement Unlocked:', achievement.name);
      }
    } catch (error) {
      console.error('Achievement/XP sync failed:', error);
    }
  }

  useEffect(() => {
    const init = async () => {
      const preloading = Promise.all([
        fetchMangas(),
        window.electron.invoke('get-maintenance-status'),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);

      await preloading;
      setShowSplash(false);
    };

    init();
  }, [])

  // Navigation Logic
  const navigateToDetail = (id: number) => {
    setSelectedMangaId(id)
    setView('detail')
  }

  const navigateToLibrary = () => {
    setSelectedMangaId(null)
    setView('library')
  }

  const navigateToProfile = () => {
    setView('profile')
  }

  const navigateToSettings = () => {
    setView('settings')
  }

  const handleAddManga = async (mangaData: any) => {
    if (!isElectron) return
    try {
      await window.electron.invoke('add-manga', mangaData)
      await fetchMangas()
      setIsAddModalOpen(false)
    } catch (error) {
       console.error('Add failed:', error)
       throw error;
    }
  }

  const handleUpdateManga = async (mangaData: any) => {
    if (!isElectron) return
    try {
      await window.electron.invoke('update-manga', mangaData)
      await fetchMangas()
      setEditingManga(null)
    } catch (error) {
      console.error('Update failed:', error)
      throw error;
    }
  }

  const handleDeleteManga = (id: number) => {
    const manga = mangas.find(m => m.id === id)
    if (manga) setMangaToDelete(manga)
  }

  const processDelete = async () => {
    if (!isElectron || !mangaToDelete) return
    await window.electron.invoke('delete-manga', {
      id: mangaToDelete.id,
      cover_path: mangaToDelete.cover_path
    })
    await fetchMangas()
    setSelectedMangaId(null)
    setMangaToDelete(null)
    setView('library')
  }

  const handleUpdateChapter = async (id: number, chapter: number) => {
    if (!isElectron) return
    await window.electron.invoke('update-chapter', { id, chapter })
    fetchMangas()
  }

  const handleToggleFeatured = async (id: number, isFeatured: boolean) => {
    if (!isElectron) return
    await window.electron.invoke('toggle-featured', { id, isFeatured })
    fetchMangas()
  }

  const isFiltering = searchQuery !== '' || statusFilter !== 'all' || selectedGenre !== 'Any' || selectedFormat !== 'Any' || selectedPubStatus !== 'Any'

  const filteredMangas = mangas
    .filter((m: Manga) => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      const matchesGenre = selectedGenre === 'Any' || (m.genres && m.genres.split(',').includes(selectedGenre))
      const matchesFormat = selectedFormat === 'Any' || m.format === selectedFormat
      const matchesPubStatus = selectedPubStatus === 'Any' || m.publishing_status === selectedPubStatus
      return matchesSearch && matchesStatus && matchesGenre && matchesFormat && matchesPubStatus
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'progress') {
        const progA = a.current_chapter / (a.total_chapters || 1)
        const progB = b.current_chapter / (b.total_chapters || 1)
        return progB - progA
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  const selectedManga = mangas.find((m: Manga) => m.id === selectedMangaId)

  return (
    <div className="h-screen bg-background text-text select-none overflow-hidden relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onLoaded={() => {}} />
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="h-screen flex flex-col relative"
          >
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="pt-6 pb-2 px-10 bg-background z-20 shrink-0 flex flex-col gap-4 relative group/header">
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-b-[3rem]">
                <div className="absolute -top-28 -right-10 w-96 h-96 opacity-[0.1] grayscale transition-opacity duration-1000 group-hover/header:opacity-[0.15]">
                  <img src="logo.jpg" className="w-full h-full object-cover rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/50 to-background" />
                </div>
              </div>

              <div className="flex items-center justify-between h-12">
                <div className="flex items-center cursor-pointer group" onClick={navigateToProfile}>
                  <h1 className="text-3xl font-syncopate font-bold tracking-tighter uppercase italic text-white flex items-baseline gap-0 group drop-shadow-2xl">
                    <span className="group-hover:text-accent transition-all duration-700 ease-out">Chi</span>
                    <span className="text-accent group-hover:text-white transition-all duration-700 ease-out">yo</span>
                    <span className="w-2 h-2 rounded-full bg-accent ml-1.5 mb-1.5 block scale-0 group-hover:scale-100 transition-all duration-500 shadow-lg shadow-accent/40" />
                  </h1>
                </div>

                {view === 'library' && (
                  <div className="flex items-center gap-8">
                    {['all', 'reading', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`relative py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${statusFilter === status ? 'text-accent' : 'text-text-muted hover:text-white'}`}
                      >
                        {status}
                        {statusFilter === status && <motion.div layoutId="activeTab" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full" />}
                      </button>
                    ))}
                  </div>
                )}
                <div className="w-[180px]" />
              </div>

              {view === 'library' && (
                <div className="flex items-center gap-3 relative z-10">
                  <CustomSelect value={selectedGenre} options={['Any', ...GENRES]} onChange={setSelectedGenre} placeholder="Genre" className="w-[130px]" />
                  <CustomSelect value={selectedFormat} options={['Any', ...FORMATS]} onChange={setSelectedFormat} placeholder="Format" className="w-[120px]" />
                  <CustomSelect value={selectedPubStatus} options={['Any', ...PUB_STATUSES]} onChange={setSelectedPubStatus} placeholder="Status" className="w-[120px]" />
                  <div className="w-[1px] h-6 bg-white/5 mx-2" />
                  <CustomSelect value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} placeholder="Sort" className="w-[140px]" />
                  
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

                  <button onClick={navigateToSettings} className="w-10 h-10 flex items-center justify-center bg-surface/50 rounded-xl border border-white/5 hover:bg-white/5 transition-colors text-text-muted hover:text-white self-end mb-0.5">
                    <SettingsIcon size={18} />
                  </button>

                  <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary h-10 flex items-center gap-2 px-6 self-end mb-0.5">
                    <Plus size={18} strokeWidth={3} />
                    <span className="text-xs uppercase tracking-[0.2em] font-black">Add New</span>
                  </button>
                </div>
              )}
            </header>

            <main ref={mainRef} className="flex-1 overflow-auto p-10 scrollbar-hide relative">
              <AnimatePresence mode="popLayout" initial={false}>
                {view === 'detail' && selectedManga ? (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Detail manga={selectedManga} onBack={navigateToLibrary} onDelete={handleDeleteManga} onUpdateChapter={handleUpdateChapter} onEdit={(m) => setEditingManga(m)} onToggleFeatured={handleToggleFeatured} />
                  </motion.div>
                ) : view === 'profile' ? (
                  <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Profile mangas={mangas} onBack={navigateToLibrary} />
                  </motion.div>
                ) : view === 'settings' ? (
                  <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Settings onBack={navigateToLibrary} />
                  </motion.div>
                ) : (
                  <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                    <Library allMangas={mangas} mangas={filteredMangas} onSelect={navigateToDetail} loading={loading} onQuickUpdate={handleUpdateChapter} isFiltering={isFiltering} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <AnimatePresence>
              {(isAddModalOpen || editingManga) && (
                <AddEditModal
                  onClose={() => { setIsAddModalOpen(false); setEditingManga(null); }}
                  onSubmit={editingManga ? handleUpdateManga : handleAddManga}
                  initialData={editingManga}
                  isElectron={isElectron}
                />
              )}
              {mangaToDelete && (
                <ConfirmModal
                  title="Permanently Purge?"
                  message={`Are you absolutely sure you want to remove "${mangaToDelete.title}" from your collection?`}
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
