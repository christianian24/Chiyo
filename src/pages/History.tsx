import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock3, BookOpen, Activity } from 'lucide-react';
import { Manga } from '../types';
import { SmartImage } from '../components/SmartImage';
import { resolveMangaCoverSrc } from '../utils/coverResolver';

interface HistoryProps {
  mangas: Manga[];
  onBack: () => void;
  onSelect: (id: number) => void;
}

type HistoryItem = {
  mangaId: number;
  title: string;
  coverSrc: string;
  currentChapter: number;
  status: Manga['status'];
  lastReadTimestamp: number;
};

type HistoryGroup = {
  label: 'Today' | 'Yesterday' | 'Last 7 days' | 'Older';
  items: HistoryItem[];
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getGroupLabel(timestamp: number): HistoryGroup['label'] {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Last 7 days';
  return 'Older';
}

function HistoryRow({
  item,
  index,
  onSelect
}: {
  item: HistoryItem;
  index: number;
  onSelect: (id: number) => void;
}) {
  return (
    <motion.button
      key={item.mangaId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      onClick={() => onSelect(item.mangaId)}
      className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-accent/40 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface shrink-0">
          <SmartImage src={item.coverSrc} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white truncate uppercase">{item.title}</h3>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-text-muted whitespace-nowrap">
              {formatRelativeTime(item.lastReadTimestamp)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-[10px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <BookOpen size={12} className="text-accent" />
              Ch. {item.currentChapter}
            </span>
            <span className="inline-flex items-center gap-1 uppercase">
              <Activity size={12} className="text-accent" />
              {item.status}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export const History: React.FC<HistoryProps> = ({ mangas, onBack, onSelect }) => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const historyItems: HistoryItem[] = [...mangas]
    .map((manga) => ({
      mangaId: manga.id,
      title: manga.title,
      coverSrc: resolveMangaCoverSrc(manga),
      currentChapter: manga.current_chapter,
      status: manga.status,
      lastReadTimestamp: new Date(manga.updated_at).getTime()
    }))
    .filter((item) => Number.isFinite(item.lastReadTimestamp) && item.lastReadTimestamp >= sevenDaysAgo)
    .sort((a, b) => b.lastReadTimestamp - a.lastReadTimestamp)
    .slice(0, 50);

  const orderedGroupLabels: HistoryGroup['label'][] = ['Today', 'Yesterday', 'Last 7 days', 'Older'];
  const groupedMap = new Map<HistoryGroup['label'], HistoryItem[]>();
  orderedGroupLabels.forEach((label) => groupedMap.set(label, []));

  historyItems.forEach((item) => {
    const label = getGroupLabel(item.lastReadTimestamp);
    groupedMap.get(label)?.push(item);
  });

  const groups: HistoryGroup[] = orderedGroupLabels
    .map((label) => ({ label, items: groupedMap.get(label) || [] }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Back to Library</span>
        </button>
      </div>

      <section className="relative p-6 rounded-[2rem] border border-white/10 bg-[#0d0e12] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <svg width="100%" height="100%">
            <pattern id="history-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 L 0 0 0 34" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#history-grid)" />
          </svg>
        </div>

        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <Clock3 size={16} className="text-accent" />
            <h2 className="text-sm font-black uppercase italic tracking-[0.2em] text-white">
              Reading History
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">
              {historyItems.length} Entries
            </span>
          </div>

          <div className="space-y-5 max-h-[70vh] overflow-auto pr-1 scrollbar-hide">
            {groups.map((group) => (
              <div key={group.label} className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-accent/90">
                  {group.label}
                </h3>
                {group.items.map((item, index) => (
                  <HistoryRow key={item.mangaId} item={item} index={index} onSelect={onSelect} />
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted/70 py-6">
                No recent history in the last 7 days.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
