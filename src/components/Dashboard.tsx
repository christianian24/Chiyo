import React from 'react';
import { motion } from 'framer-motion';
import { Play, BookOpen } from 'lucide-react';
import { Manga } from '../types';

interface DashboardProps {
  manga: Manga[];
  onSelect: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ manga, onSelect }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const recentManga = manga
    .filter(m => m.status === 'reading')
    .slice(0, 5);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 10,
          behavior: 'smooth'
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  if (recentManga.length === 0) return null;

  return (
    <div className="mb-12 space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted/60">Continuing Reading</h2>
        <div className="h-[1px] flex-1 mx-6 bg-white/5" />
      </div>

      <div className="relative group/dash">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 custom-scrollbar scroll-smooth"
        >
          {recentManga.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[280px] group cursor-pointer"
              onClick={() => onSelect(item.id)}
            >
              <div className="relative aspect-[16/9] rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-accent/40 group-hover:shadow-accent/5">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-lighter flex items-center justify-center">
                    <BookOpen className="text-text-muted/20" size={40} />
                  </div>
                )}

                {/* Premium Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex flex-col justify-end p-5">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-white italic uppercase tracking-tight line-clamp-1 group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted/80 uppercase">Chapter {item.current_chapter}</span>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-md border border-accent/20">
                        <Play size={8} className="fill-accent text-accent" />
                        <span className="text-[8px] font-black uppercase text-accent">Resume</span>
                      </div>
                    </div>

                    {/* Progress Line */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.current_chapter / (item.total_chapters || 1)) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-accent shadow-[0_0_10px_rgba(255,46,46,0.3)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
        {/* Cinematic Right Fade Mask */}
        <div className="absolute top-0 bottom-6 right-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 opacity-0 group-hover/dash:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
};

export default Dashboard;
