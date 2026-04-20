import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { SmartImage } from '../components/SmartImage';
import { SourcePage, SourceChapter as Chapter } from '../sources/types';
import { ChevronLeft, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionManager } from '../services/ReaderSessionManager';
import { compareChaptersAsc } from '../utils/chapterSort';

interface ReaderProps {
  chapterId: string;
  mangaId: string;
  sourceId: string;
  dbId?: number;
  chapterNumber?: number;
  autoAdvance?: boolean;
  referer?: string;
  onBack: () => void;
  onLibraryUpdate?: () => Promise<void> | void;
}

export const Reader: React.FC<ReaderProps> = ({ 
  chapterId: initialChapterId, 
  mangaId, 
  sourceId, 
  dbId, 
  chapterNumber: initialChapterNumber, 
  referer, 
  onBack,
  onLibraryUpdate
}) => {
  type AppSizePreset = 'default' | '800x1024';
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
  const PREFETCH_THRESHOLD = 0.55;
  const APPEND_THRESHOLD = 0.75;

  type StreamItem =
    | {
        kind: 'chapter-marker';
        key: string;
        chapterId: string;
        chapterTitle: string;
      }
    | {
        kind: 'page';
        key: string;
        chapterId: string;
        chapterTitle: string;
        src: string;
        pageInChapter: number;
      };

  // --- READER RUNTIME STATE (ISOLATED) ---
  const [streamItems, setStreamItems] = useState<StreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appending, setAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [visibleChapterId, setVisibleChapterId] = useState(initialChapterId);
  const [visibleChapterPage, setVisibleChapterPage] = useState(1);
  const [chapterToast, setChapterToast] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'fit-width' | 'original'>('fit-width');
  const [appSizePreset, setAppSizePreset] = useState<AppSizePreset>('default');
  const [uiVisible, setUiVisible] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inFlightChapterIds = useRef<Set<string>>(new Set());
  const prefetchPromises = useRef<Map<string, Promise<PrefetchedChapterData | null>>>(new Map());
  const prefetchedChapter = useRef<PrefetchedChapterData | null>(null);
  const loadedChapterIds = useRef<Set<string>>(new Set());
  const chapterPageCounts = useRef<Map<string, number>>(new Map());
  const appendCursor = useRef(-1);
  const pendingRestore = useRef<{ chapterId: string; page: number } | null>(null);
  const pendingScrollAnchor = useRef<{ key: string; top: number } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const overlayTimerRef = useRef<number | null>(null);

  interface PrefetchedChapterData {
    index: number;
    chapterId: string;
    chapterTitle: string;
    pageCount: number;
    delta: StreamItem[];
  }

  const orderedChapters = useMemo(() => [...chapters].sort(compareChaptersAsc), [chapters]);
  const chapterById = useMemo(() => {
    const map = new Map<string, Chapter>();
    orderedChapters.forEach(c => map.set(c.id, c));
    return map;
  }, [orderedChapters]);
  const chapterIndexById = useMemo(() => {
    const map = new Map<string, number>();
    orderedChapters.forEach((c, idx) => map.set(c.id, idx));
    return map;
  }, [orderedChapters]);
  const pageItems = useMemo(
    () => streamItems.filter((item): item is Extract<StreamItem, { kind: 'page' }> => item.kind === 'page'),
    [streamItems]
  );
  const previousVisibleChapterId = useRef(initialChapterId);

  const showOverlay = () => {
    setUiVisible(true);
    if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = window.setTimeout(() => setUiVisible(false), 1600);
  };

  const showChapterToast = (title: string) => {
    setChapterToast(title);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setChapterToast(null), 900);
  };

  const buildChapterDelta = (
    chapter: Chapter,
    pagesForChapter: SourcePage[]
  ): StreamItem[] => [
    {
      kind: 'chapter-marker',
      key: `marker-${chapter.id}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title
    },
    ...pagesForChapter.map((page, pageIndex) => ({
      kind: 'page' as const,
      key: `page-${chapter.id}-${page.index}-${pageIndex}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      src: page.url,
      pageInChapter: pageIndex + 1
    }))
  ];

  const captureScrollAnchor = () => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    let best: { key: string; top: number } | null = null;

    pageRefs.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect();
      const intersectsViewport = rect.bottom > containerRect.top && rect.top < containerRect.bottom;
      if (!intersectsViewport) return;
      if (!best || rect.top < best.top) {
        best = { key, top: rect.top };
      }
    });

    pendingScrollAnchor.current = best;
  };

  const startPrefetchForIndex = (index: number, chapterList: Chapter[] = orderedChapters) => {
    if (index < 0 || index >= chapterList.length) return;
    const chapter = chapterList[index];
    if (!chapter) return;
    if (loadedChapterIds.current.has(chapter.id)) return;
    if (prefetchedChapter.current?.chapterId === chapter.id) return;
    if (prefetchPromises.current.has(chapter.id)) return;

    const promise = (async (): Promise<PrefetchedChapterData | null> => {
      const result = await (window as any).electron.invoke('source:get-pages', {
        sourceId,
        chapterId: chapter.id,
        mangaId
      });
      if (result?.__stale) return null;

      const pagesForChapter = (result || []) as SourcePage[];
      return {
        index,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        pageCount: pagesForChapter.length || 1,
        delta: buildChapterDelta(chapter, pagesForChapter)
      };
    })()
      .then((payload) => {
        if (!payload || loadedChapterIds.current.has(payload.chapterId)) return payload;
        if (!prefetchedChapter.current || payload.index >= prefetchedChapter.current.index) {
          prefetchedChapter.current = payload;
        }
        return payload;
      })
      .finally(() => {
        prefetchPromises.current.delete(chapter.id);
      });

    prefetchPromises.current.set(chapter.id, promise);
  };

  const appendChapterByIndex = async (
    index: number,
    source: { initial?: boolean; chapterList?: Chapter[] } = {}
  ) => {
    const chapterList = source.chapterList || orderedChapters;
    if (index < 0 || index >= chapterList.length) return false;
    const chapter = chapterList[index];
    if (!chapter) return false;
    if (loadedChapterIds.current.has(chapter.id) || inFlightChapterIds.current.has(chapter.id)) return false;

    inFlightChapterIds.current.add(chapter.id);
    if (!source.initial) setAppending(true);
    try {
      let payload: PrefetchedChapterData | null = null;
      if (prefetchedChapter.current?.chapterId === chapter.id) {
        payload = prefetchedChapter.current;
      } else if (prefetchPromises.current.has(chapter.id)) {
        payload = await prefetchPromises.current.get(chapter.id)!;
      }

      if (!payload) {
        const result = await (window as any).electron.invoke('source:get-pages', {
          sourceId,
          chapterId: chapter.id,
          mangaId
        });
        if (result?.__stale) return false;
        const pagesForChapter = (result || []) as SourcePage[];
        payload = {
          index,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          pageCount: pagesForChapter.length || 1,
          delta: buildChapterDelta(chapter, pagesForChapter)
        };
      }

      chapterPageCounts.current.set(chapter.id, payload.pageCount);
      if (!source.initial) captureScrollAnchor();
      setStreamItems(prev => [...prev, ...payload.delta]);
      if (prefetchedChapter.current?.chapterId === chapter.id) {
        prefetchedChapter.current = null;
      }

      loadedChapterIds.current.add(chapter.id);
      appendCursor.current = index;
      return true;
    } finally {
      inFlightChapterIds.current.delete(chapter.id);
      setLoading(false);
      setAppending(false);
    }
  };

  // Load chapters + initial chapter stream
  useEffect(() => {
    const initReader = async () => {
      setLoading(true);
      setError(null);
      setUiVisible(true);
      setStreamItems([]);
      setVisibleChapterPage(1);
      setChapterToast(null);
      previousVisibleChapterId.current = initialChapterId;
      pageRefs.current.clear();
      inFlightChapterIds.current.clear();
      prefetchPromises.current.clear();
      prefetchedChapter.current = null;
      loadedChapterIds.current.clear();
      chapterPageCounts.current.clear();
      appendCursor.current = -1;
      pendingRestore.current = null;
      pendingScrollAnchor.current = null;
      
      try {
        const [progressResult, chaptersResult] = await Promise.all([
          (window as any).electron.invoke('manga:get-chapter-progress', { sourceId, mangaId, chapterId: initialChapterId }),
          (window as any).electron.invoke('source:get-chapters', { sourceId, mangaId })
        ]);
        setChapters(chaptersResult);

        const sorted = [...chaptersResult].sort(compareChaptersAsc) as Chapter[];
        const currentIndex = sorted.findIndex(c => c.id === initialChapterId);
        const startIndex = currentIndex >= 0 ? currentIndex : 0;
        const startChapter = sorted[startIndex];
        if (!startChapter) {
          setError('No chapters available.');
          setLoading(false);
          return;
        }

        setVisibleChapterId(startChapter.id);
        showChapterToast(startChapter.title);

        if (progressResult && progressResult.current_page > 0) {
          pendingRestore.current = {
            chapterId: initialChapterId,
            page: progressResult.current_page
          };
        }

        // First chapter visible immediately
        await appendChapterByIndex(startIndex, { initial: true, chapterList: sorted });
        startPrefetchForIndex(startIndex + 1, sorted);
      } catch (err) {
        setError('Failed to fetch chapter contents.');
        setLoading(false);
      }
    };

    initReader();
  }, [initialChapterId, sourceId, mangaId]);

  // Restore visual position to saved page once first chapter is in DOM
  useEffect(() => {
    if (!pendingRestore.current) return;
    const restore = pendingRestore.current;
    const targetItem = pageItems.find(
      item => item.chapterId === restore.chapterId && item.pageInChapter === restore.page
    );
    if (!targetItem) return;
    const target = pageRefs.current.get(targetItem.key);
    if (!target) return;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    pendingRestore.current = null;
  }, [pageItems]);

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    if (!anchor) return;
    const container = containerRef.current;
    const target = pageRefs.current.get(anchor.key);
    if (container && target) {
      const nextTop = target.getBoundingClientRect().top;
      const delta = nextTop - anchor.top;
      if (delta) {
        container.scrollTop += delta;
      }
    }
    pendingScrollAnchor.current = null;
  }, [streamItems]);

  useEffect(() => {
    const previousChapterId = previousVisibleChapterId.current;
    if (!previousChapterId || previousChapterId === visibleChapterId) return;

    const previousIndex = chapterIndexById.get(previousChapterId);
    const currentIndex = chapterIndexById.get(visibleChapterId);
    const movedForward =
      typeof previousIndex === 'number' &&
      typeof currentIndex === 'number' &&
      currentIndex > previousIndex;

    if (movedForward) {
      const previousChapter = chapterById.get(previousChapterId);
      const totalInPrevious = chapterPageCounts.current.get(previousChapterId) || 1;
      sessionManager.markChapterCompleted({
        sourceId,
        mangaId,
        chapterId: previousChapterId,
        total: totalInPrevious,
        dbId,
        chapterNumber: previousChapter?.chapterNumber
      });
      // Fire-and-forget lifecycle commit so fast readers don't lose completion.
      void sessionManager.commit();
    }

    previousVisibleChapterId.current = visibleChapterId;
  }, [visibleChapterId, chapterById, chapterIndexById, sourceId, mangaId, dbId]);

  // Track viewport chapter + progress snapshot by most-visible page
  useEffect(() => {
    if (!pageItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          const target = visible[0].target as HTMLDivElement;
          const chapterId = target.dataset.chapterId || '';
          const pageInChapter = parseInt(target.dataset.pageInChapter || '1', 10);
          const chapter = chapterById.get(chapterId);
          const totalInChapter = chapterPageCounts.current.get(chapterId) || 1;

          if (!chapterId) return;

          setVisibleChapterPage(pageInChapter);
          setVisibleChapterId(prev => {
            if (prev !== chapterId) {
              showChapterToast(chapter?.title || `Chapter ${chapter?.chapterNumber || ''}`);
            }
            return chapterId;
          });

          sessionManager.update({
            sourceId,
            mangaId,
            chapterId,
            page: pageInChapter,
            total: totalInChapter,
            dbId,
            chapterNumber: chapter?.chapterNumber
          });
        }
      },
      { threshold: [0.2, 0.6], root: null }
    );

    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pageItems, sourceId, mangaId, dbId, chapterById]);

  useEffect(() => {
    const loadAppSize = async () => {
      try {
        const raw = await (window as any).electron.invoke('get-setting', 'app_window_size_preset');
        if (raw === '800x1024' || raw === 'default') {
          setAppSizePreset(raw);
        }
      } catch {
        // Non-fatal: keep default preset.
      }
    };
    loadAppSize();
  }, []);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Native scroll remains default; append next chapter lazily near 75%
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onScroll = async () => {
      setUiVisible(false);
      if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
      if (!orderedChapters.length || appending || loading) return;

      const ratio = (node.scrollTop + node.clientHeight) / Math.max(node.scrollHeight, 1);
      const nextIndex = appendCursor.current + 1;
      if (ratio >= PREFETCH_THRESHOLD && nextIndex < orderedChapters.length) {
        startPrefetchForIndex(nextIndex);
      }
      if (ratio < APPEND_THRESHOLD) return;

      if (nextIndex < orderedChapters.length) {
        await appendChapterByIndex(nextIndex);
      }
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [orderedChapters, appending, loading]);

  // Lifecycle Commit Triggers
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Soft commit: non-blocking sync on backgrounding
        sessionManager.commit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // Hard commit: ensure progress is saved on exit/unmount
      sessionManager.commit(onLibraryUpdate);
    };
  }, [onLibraryUpdate]);

  const handleBack = async () => {
    await sessionManager.commit(onLibraryUpdate);
    onBack();
  };

  const changeZoom = (delta: number) => setZoom(prev => clampZoom(prev + delta));
  const resetZoom = () => setZoom(1);
  const applyAppSizePreset = async (preset: AppSizePreset) => {
    setAppSizePreset(preset);
    try {
      await (window as any).electron.invoke('app:set-window-size-preset', { preset });
    } catch {
      // Non-fatal: local state already updated.
    }
  };

  const jumpToPage = (delta: number) => {
    const currentGlobalIndex = pageItems.findIndex(
      p => p.chapterId === visibleChapterId && p.pageInChapter === visibleChapterPage
    );
    if (currentGlobalIndex === -1) return;
    const target = Math.min(pageItems.length - 1, Math.max(0, currentGlobalIndex + delta));
    const targetKey = pageItems[target]?.key;
    if (!targetKey) return;
    const targetEl = pageRefs.current.get(targetKey);
    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReaderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    showOverlay();
    const width = window.innerWidth || 1;
    const x = e.clientX;
    if (x < width / 3) {
      jumpToPage(-1);
      return;
    }
    if (x > (width * 2) / 3) {
      jumpToPage(1);
      return;
    }
    setUiVisible(v => !v);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 bg-[#0a0b0d]">
        <Loader2 className="w-16 h-16 text-accent animate-spin" strokeWidth={1} />
        <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] italic">Loading Chapter Content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#0a0b0d]">
        <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] italic">{error}</p>
        <button onClick={handleBack} className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all uppercase text-[10px] font-black tracking-widest italic text-white/40">Return to Library</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0b0d] z-50 flex flex-col font-sans select-none">
      {/* Tactical Reader Header */}
      <div
        className={`h-20 px-6 flex items-center justify-between border-b border-white/5 bg-background/85 backdrop-blur-2xl fixed top-0 inset-x-0 z-30 transition-all duration-200 pointer-events-none ${
          uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <button onClick={handleBack} className="pointer-events-auto flex items-center gap-4 text-text-muted hover:text-white transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-background transition-all">
            <ChevronLeft size={20} strokeWidth={3} />
          </div>
          <span className="font-black uppercase tracking-[0.4em] text-[10px] italic">Close Reader</span>
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-1 text-text-muted/40 font-black text-[8px] uppercase tracking-[0.6em] italic">
             Active Segment
          </div>
          <div className="text-sm font-black uppercase tracking-[0.2em] text-white italic drop-shadow-2xl">
             Chapter {chapterById.get(visibleChapterId)?.chapterNumber ?? initialChapterNumber}
          </div>
        </div>

        <div className="pointer-events-auto flex justify-end items-center gap-2">
          <button onClick={() => changeZoom(-0.1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetZoom} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors">
            <RotateCcw size={14} />
          </button>
          <button onClick={() => changeZoom(0.1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors">
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setFitMode(m => (m === 'fit-width' ? 'original' : 'fit-width'))}
            className="px-3 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] uppercase tracking-widest font-black text-text-muted hover:text-white transition-colors"
          >
            {fitMode === 'fit-width' ? 'Fit Width' : 'Original'}
          </button>
          <div className="h-9 px-1.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-1">
            {(['default', '800x1024'] as AppSizePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyAppSizePreset(preset)}
                className={`h-7 px-2 rounded-md text-[8px] uppercase tracking-[0.16em] font-black transition-colors ${
                  appSizePreset === preset
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-text-muted hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {preset === 'default' ? 'App Default' : '800x1024'}
              </button>
            ))}
          </div>
          <div className="h-9 px-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
            <span className="text-[9px] font-black text-text-muted/60 uppercase tracking-[0.12em]">
              {Math.round(zoom * 100)}%
            </span>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono-tech text-accent font-black">{visibleChapterPage}</span>
              <span className="text-[8px] font-mono-tech text-text-muted/20">/</span>
              <span className="text-[9px] font-mono-tech text-text-muted/40 font-bold">
                {chapterPageCounts.current.get(visibleChapterId) || 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        onMouseMove={showOverlay}
        onClick={handleReaderTap}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            changeZoom(-e.deltaY * 0.002);
          }
        }}
        className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth bg-[#0d0e12] text-[0] leading-none"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center pt-20 pb-0 m-0 gap-0">
          {streamItems.map((item) =>
            item.kind === 'chapter-marker' ? (
              <div
                key={item.key}
                data-chapter-id={item.chapterId}
                className="h-0 w-full m-0 p-0 pointer-events-none"
                aria-hidden="true"
              />
            ) : (
              <div
                key={item.key}
                ref={el => {
                  if (el) pageRefs.current.set(item.key, el);
                  else pageRefs.current.delete(item.key);
                }}
                data-chapter-id={item.chapterId}
                data-page-in-chapter={item.pageInChapter}
                className="w-full m-0 p-0 relative leading-none"
              >
                <div className="w-full m-0 p-0 flex justify-center items-start leading-none overflow-x-auto">
                  <SmartImage
                    src={item.src}
                    referer={referer}
                    className="block m-0 p-0 h-auto align-top"
                    style={
                      fitMode === 'fit-width'
                        ? { width: `${zoom * 100}%`, maxWidth: 'none' }
                        : { width: 'auto', maxWidth: `${zoom * 100}%` }
                    }
                    alt={`${item.chapterTitle} - Page ${item.pageInChapter}`}
                  />
                </div>
              </div>
            )
          )}

          {appending && (
            <div className="w-full py-8 flex items-center justify-center pointer-events-none">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Mihon-style chapter transition toast */}
      <AnimatePresence>
        {chapterToast && (
          <motion.div
            key={chapterToast}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-black/60 text-white text-[10px] uppercase tracking-[0.2em] font-black pointer-events-none"
          >
            {chapterToast}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`h-1.5 w-full bg-white/5 relative z-30 overflow-hidden transition-opacity duration-200 pointer-events-none ${
          uiVisible ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <motion.div 
          animate={{
            width: `${(((pageItems.findIndex(p => p.chapterId === visibleChapterId && p.pageInChapter === visibleChapterPage) + 1) || 1) /
              Math.max(pageItems.length, 1)) * 100}%`
          }}
          className="h-full bg-accent"
          transition={{ type: 'spring', stiffness: 80, damping: 25 }}
        />
      </div>
    </div>
  );
};
