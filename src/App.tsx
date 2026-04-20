import { useState, useEffect, useRef } from 'react'
import { Search, BookOpen, Settings as SettingsIcon } from 'lucide-react'
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
import { Discover } from './pages/Discover'
import { MangaView } from './pages/MangaView'
import { Reader } from './pages/Reader'
import { History } from './pages/History'
import { collectGenres } from './utils/genres'


const FORMATS = [
  "Manga",
  "Manhwa",
  "Manhua",
  { value: "Webtoon", label: "Webtoons" },
  "Light Novel",
  "One-shot"
]
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
  const [readerContext, setReaderContext] = useState<{ dbId?: number; chapterNumber?: number }>({})
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('Any')
  const [selectedFormat, setSelectedFormat] = useState<string>('Any')
  const [selectedPubStatus, setSelectedPubStatus] = useState<string>('Any')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('latest')
  const [view, setView] = useState<'library' | 'detail' | 'profile' | 'settings' | 'discover' | 'mangaView' | 'reader' | 'history'>('library')
  const [showSplash, setShowSplash] = useState(true)
  const [mangaToDelete, setMangaToDelete] = useState<Manga | null>(null)
  const [previousView, setPreviousView] = useState<'library' | 'detail' | 'profile' | 'settings' | 'discover' | 'mangaView' | 'reader' | 'history'>('library')

  // New state for Reader/Discovery
  const [remoteContext, setRemoteContext] = useState<{ sourceId: string; mangaId: string; chapterId?: string }>({ sourceId: '', mangaId: '' })
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'info' }[]>([])
  const [libraryVersion, setLibraryVersion] = useState(0)

  const addToast = (message: string, type: 'error' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  // Wrapped invoke with error handling
  const safeInvoke = async (channel: string, data?: any) => {
    try {
      const result = await window.electron.invoke(channel, data)
      if (result && result.error) {
        addToast(result.error, 'error')
      }
      return result
    } catch (err: any) {
      addToast(err.message || 'Unknown IPC Error', 'error')
      console.error(`IPC Error [${channel}]:`, err)
      throw err
    }
  }

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
  const genreOptions = [
    { value: 'Any', label: 'Any' },
    ...collectGenres(mangas).map((genre) => ({
      value: genre,
      label: genre.replace(/\b\w/g, (c) => c.toUpperCase())
    }))
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
      const adv = await window.electron.invoke('get-setting', 'auto_advance');
      setAutoAdvance(adv === 'true');
      setShowSplash(false);
    };

    init();
  }, [])

  const handleLibraryUpdate = async () => {
    setLibraryVersion(v => v + 1);
  };

  useEffect(() => {
    if (libraryVersion === 0) return;
    fetchMangas().catch((error) => {
      console.error('Library sync failed:', error);
    });
  }, [libraryVersion]);

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

  const navigateToDiscover = () => {
    setView('discover')
  }

  const navigateToHistory = () => {
    setView('history')
  }

  const navigateTopTab = (tab: 'library' | 'history' | 'discover' | 'profile') => {
    if (tab === 'library') return navigateToLibrary();
    if (tab === 'history') return navigateToHistory();
    if (tab === 'discover') return navigateToDiscover();
    return navigateToProfile();
  }

  const handleSelectRemoteManga = (sourceId: string, mangaId: string) => {
    setRemoteContext({ sourceId, mangaId })
    setView('mangaView')
  }

  const handleReadChapter = (chapterId: string, sourceId?: string, mangaId?: string, options?: { dbId?: number, chapterNumber?: number }) => {
    setPreviousView(view);
    setRemoteContext(prev => ({
      sourceId: sourceId || prev.sourceId,
      mangaId: mangaId || prev.mangaId,
      chapterId
    }))
    setReaderContext({ 
      dbId: options?.dbId, 
      chapterNumber: options?.chapterNumber 
    });
    setView('reader')
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
    await window.electron.invoke('delete-manga', { id: mangaToDelete.id })
    await fetchMangas()
    setSelectedMangaId(null)
    setMangaToDelete(null)
    setView('library')
  }

  /**
   * MANUAL OVERRIDE: Direct library chapter update from Library/Detail views.
   * Bypasses Reader session commit flow - this is intentional for manual edits.
   *
   * Architecture: Library edits → direct IPC → DB (no session manager involved)
   */
  const handleUpdateChapter = async (id: number, chapter: number) => {
    if (!isElectron) return
    await window.electron.invoke('update-chapter', { id, chapter })
    fetchMangas()
  }

  const isFiltering = searchQuery !== '' || statusFilter !== 'all' || selectedGenre !== 'Any' || selectedFormat !== 'Any' || selectedPubStatus !== 'Any'

  const filteredMangas = mangas
    .filter((m: Manga) => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      const matchesGenre = selectedGenre === 'Any' || (Array.isArray(m.genres) && m.genres.includes(selectedGenre))
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
          <SplashScreen key="splash" onLoaded={() => { }} />
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
                <div className="absolute -top-28 -right-10 w-96 h-96 opacity-[0.18] transition-opacity duration-1000 group-hover/header:opacity-[0.24]">
                  <img src="logo.jpg" className="w-full h-full object-cover rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 via-35% via-background/35 via-60% to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/35" />
                </div>
              </div>

              <div className="flex items-center justify-between min-h-12 gap-3 mt-4">
                <div className="flex items-center cursor-pointer group" onClick={navigateToProfile}>
                  <h1 className="text-3xl font-syncopate font-bold tracking-tighter uppercase italic text-white flex items-baseline gap-0 group drop-shadow-2xl">
                    <span className="group-hover:text-accent transition-all duration-700 ease-out">Chi</span>
                    <span className="text-accent group-hover:text-white transition-all duration-700 ease-out">yo</span>
                    <span className="w-2 h-2 rounded-full bg-accent ml-1.5 mb-1.5 block scale-0 group-hover:scale-100 transition-all duration-500 shadow-lg shadow-accent/40" />
                  </h1>
                </div>

                <div className="relative flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/10 bg-[#0d0e12]/55 backdrop-blur-xl shadow-[0_14px_35px_rgba(0,0,0,0.35)] overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                    <svg width="100%" height="100%">
                      <pattern id="top-nav-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                        <path d="M 26 0 L 0 0 0 26" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#top-nav-grid)" />
                    </svg>
                  </div>
                  {(['library', 'history', 'discover', 'profile'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => navigateTopTab(v)}
                      className={`relative px-3 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.25em] rounded-xl transition-all whitespace-nowrap ${
                        view === v
                          ? 'text-accent bg-accent/12 border border-accent/40 shadow-[0_0_18px_rgba(255,77,77,0.2)]'
                          : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {v}
                      {view === v && (
                        <motion.div
                          layoutId="activeTopTab"
                          className="absolute inset-0 rounded-xl border border-accent/30 pointer-events-none"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="hidden xl:block w-[180px]" />
              </div>

              {view === 'library' && (
                <div className="relative z-30 p-3 rounded-2xl border border-white/10 bg-[#0d0e12]/28 backdrop-blur-xl shadow-2xl overflow-visible mt-2">
                  <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                    <svg width="100%" height="100%">
                      <pattern id="library-controls-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.45" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#library-controls-grid)" />
                    </svg>
                  </div>
                  <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                  <div className="flex flex-wrap items-center gap-3 relative z-20">
                  <CustomSelect value={selectedGenre} options={genreOptions} onChange={setSelectedGenre} placeholder="Genre" className="w-[120px] sm:w-[130px]" maxVisibleOptions={10} />
                  <CustomSelect value={selectedFormat} options={['Any', ...FORMATS]} onChange={setSelectedFormat} placeholder="Format" className="w-[110px] sm:w-[120px]" />
                  <CustomSelect value={selectedPubStatus} options={['Any', ...PUB_STATUSES]} onChange={setSelectedPubStatus} placeholder="Status" className="w-[110px] sm:w-[120px]" />
                  <div className="hidden lg:block w-[1px] h-6 bg-white/10 mx-1" />
                  <CustomSelect value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} placeholder="Sort" className="w-[120px] sm:w-[140px]" />

                  <div className="relative flex-1 min-w-[320px] lg:min-w-[420px] group self-end mb-0.5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      placeholder="Search series..."
                      className="input w-full pl-11 h-10 bg-surface/40 border-white/10 focus:border-accent/50 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <button onClick={navigateToSettings} className="w-10 h-10 flex items-center justify-center bg-surface/40 rounded-xl border border-white/10 hover:bg-accent/10 hover:border-accent/40 transition-colors text-text-muted hover:text-white self-end mb-0.5 shrink-0">
                    <SettingsIcon size={18} />
                  </button>

                </div>
                </div>
              )}
            </header>

            <main ref={mainRef} className="flex-1 overflow-auto p-10 scrollbar-hide relative">
              <AnimatePresence mode="popLayout" initial={false}>
                {view === 'detail' && selectedManga ? (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Detail
                      manga={selectedManga}
                      libraryVersion={libraryVersion}
                      onBack={navigateToLibrary}
                      onDelete={handleDeleteManga}
                      onUpdateChapter={handleUpdateChapter}
                      onEdit={(m) => setEditingManga(m)}
                      onReadChapter={(chapterId) => handleReadChapter(chapterId, selectedManga.id_source, selectedManga.id_manga)}
                    />
                  </motion.div>
                ) : view === 'profile' ? (
                  <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Profile mangas={mangas} onBack={navigateToLibrary} />
                  </motion.div>
                ) : view === 'settings' ? (
                  <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <Settings onBack={navigateToLibrary} onAddCustomEntry={() => setIsAddModalOpen(true)} />
                  </motion.div>
                ) : view === 'discover' ? (
                  <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                    <Discover onSelectManga={handleSelectRemoteManga} />
                  </motion.div>
                ) : view === 'history' ? (
                  <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                    <History mangas={mangas} onBack={navigateToLibrary} onSelect={navigateToDetail} />
                  </motion.div>
                ) : view === 'mangaView' ? (
                  <motion.div key="mangaView" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                    <MangaView 
                      sourceId={remoteContext.sourceId} 
                      mangaId={remoteContext.mangaId} 
                      onBack={navigateToDiscover} 
                      onReadChapter={handleReadChapter}
                      onAddManga={handleAddManga} 
                    />
                  </motion.div>
                ) : view === 'reader' && remoteContext.chapterId ? (
                  <motion.div key="reader" className="fixed inset-0 z-[100]">
                    <Reader
                      sourceId={remoteContext.sourceId}
                      mangaId={remoteContext.mangaId}
                      chapterId={remoteContext.chapterId}
                      dbId={readerContext.dbId}
                      chapterNumber={readerContext.chapterNumber}
                      autoAdvance={autoAdvance}
                      onBack={() => setView(previousView)}
                      onLibraryUpdate={handleLibraryUpdate}
                    />
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

      {/* Toasts */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-[1000] pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl pointer-events-auto border-white/10 ${toast.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-accent/20 text-accent-light'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-500' : 'bg-accent'} animate-pulse`} />
                <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
