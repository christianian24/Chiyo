import React, { useState } from 'react';
import { Search, Loader2, Globe } from 'lucide-react';
import { SourceManga } from '../sources/types';
import { SmartImage } from '../components/SmartImage';
import CustomSelect from '../components/CustomSelect';

interface DiscoverProps {
  onSelectManga: (sourceId: string, mangaId: string) => void;
}

const SOURCES = [
  { id: 'mangabuddy', name: 'MangaBuddy' },
];

export const Discover: React.FC<DiscoverProps> = ({ onSelectManga }) => {
  const [selectedSource, setSelectedSource] = useState('mangabuddy');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SourceManga[]>([]);
  const [loading, setLoading] = useState(false);


  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const result = await (window as any).electron.invoke('source:search', { sourceId: selectedSource, query });
      if (result.__stale) return;
      if (result.error) {
        console.error('Search error:', result.error);
        return;
      }
      setResults(result);
    } catch (err: any) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="relative flex flex-col gap-10">
      <div className="absolute -top-20 right-0 w-[420px] h-[420px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative p-8 bg-[#0d0e12] border border-white/10 rounded-[2rem] overflow-visible shadow-2xl">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <svg width="100%" height="100%">
            <pattern id="discover-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#discover-grid)" />
          </svg>
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-[2px] bg-accent" />
            <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
              <Globe className="text-accent" />
              Discovery Console
            </h2>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[180px]">
              <CustomSelect
                label="Source Node"
                value={selectedSource}
                options={SOURCES.map((s) => ({ value: s.id, label: s.name }))}
                onChange={setSelectedSource}
                className="w-full"
              />
            </div>

            <form onSubmit={handleSearch} className="flex-1 relative group min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="Scan title signatures..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 h-11 bg-surface/70 border border-white/10 rounded-xl text-sm outline-none focus:border-accent/50 transition-colors"
              />
            </form>

            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="h-11 px-8 rounded-xl bg-accent text-background flex items-center gap-2 uppercase tracking-[0.2em] text-xs font-black shadow-[0_10px_25px_rgba(255,77,77,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {results.map((manga) => (
          <button
            key={manga.id}
            onClick={() => onSelectManga(selectedSource, manga.id)}
            className="group text-left cursor-pointer flex flex-col gap-3"
            type="button"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-[1.03] group-hover:-translate-y-1 group-hover:border-accent/40 group-hover:shadow-[0_18px_40px_rgba(255,77,77,0.25)]">
              <SmartImage
                src={manga.coverUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={manga.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-70" />
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-accent">
                {selectedSource}
              </div>
            </div>
            <h3 className="text-sm font-bold line-clamp-2 group-hover:text-accent transition-colors leading-tight uppercase tracking-[0.04em]">
              {manga.title}
            </h3>
          </button>
        ))}

        {loading && (
          <div className="col-span-full py-20 text-center">
            <div className="inline-flex items-center gap-3 text-accent text-xs font-black uppercase tracking-[0.3em]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning Source
            </div>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="col-span-full py-20 text-center text-text-muted/70 text-xs uppercase tracking-[0.3em] font-black">
            No signatures found.
          </div>
        )}
      </section>
    </div>
  );
};
