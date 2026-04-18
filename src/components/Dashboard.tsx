import React from 'react';
import { motion } from 'framer-motion';
import { Play, BookOpen, Clock, Activity } from 'lucide-react';
import { Manga } from '../types';

interface DashboardProps {
  manga: Manga[];
  onSelect: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ manga, onSelect }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const recentManga = manga
    .filter(m => m.status === 'reading')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 6,
          behavior: 'smooth'
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  if (recentManga.length === 0) return null;

  return (
    <div className="mb-0 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-accent animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white">
            <span className="text-accent">Continuation</span> Sequence
          </h2>
        </div>
        <div className="h-[1px] flex-1 mx-8 bg-white/5" />
      </div>

      <div className="relative group/dash">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 custom-scrollbar scroll-smooth"
        >
          {recentManga.map((item, index) => {
            const progress = (item.current_chapter / (item.total_chapters || 100)) * 100;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
                className="flex-shrink-0 w-[220px] group cursor-pointer"
                onClick={() => onSelect(item.id)}
              >
                <div className="relative aspect-[3/4.5] rounded-[2rem] overflow-hidden border border-white/[0.04] shadow-2xl transition-all duration-700 group-hover:border-accent/30 group-hover:shadow-[0_0_30px_rgba(255,77,77,0.1)]">
                  {/* Background Artwork */}
                  {item.cover_url ? (
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover grayscale-[0.3] brightness-90 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105 transition-all duration-1000 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-lighter flex items-center justify-center">
                      <BookOpen className="text-text-muted/10" size={48} />
                    </div>
                  )}

                  {/* Information Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent flex flex-col justify-end p-5">
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-white italic uppercase tracking-tight line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-syncopate font-bold text-white leading-none">
                            {item.current_chapter}
                          </span>
                          <span className="text-[8px] font-bold text-text-muted/50 uppercase tracking-widest">
                            / {item.total_chapters || '??'}
                          </span>
                        </div>

                        <div className="w-8 h-8 flex items-center justify-center bg-accent/10 border border-accent/20 rounded-full group-hover:bg-accent group-hover:border-accent transition-all duration-500">
                          <Play size={10} className="fill-accent text-accent group-hover:fill-background group-hover:text-background transition-colors" />
                        </div>
                      </div>

                      {/* Active Progress Monitor */}
                      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 1.5 }}
                          className="h-full bg-accent relative"
                        >
                          <div className="absolute inset-0 bg-white/20 shadow-[0_0_5px_rgba(255,77,77,1)]" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Top Status */}
                  <div className="absolute top-4 left-4">
                    <div className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/5">
                      <span className="text-[7px] font-black uppercase tracking-widest text-accent italic">Neural Link</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Gradient Mask */}
        <div className="absolute top-0 bottom-8 right-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 opacity-60" />
      </div>
    </div>
  );
};

export default Dashboard;
