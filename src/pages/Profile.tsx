import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, BookOpen, Hash, Star, Layout, Clock, CheckCircle2, XCircle, TrendingUp, Calendar, Zap } from 'lucide-react';
import { Manga } from '../types';

interface ProfileProps {
  mangas: Manga[];
  onBack: () => void;
}

const Profile: React.FC<ProfileProps> = ({ mangas, onBack }) => {
  // Statistics Calculations
  const totalSeries = mangas.length;
  const totalChapters = mangas.reduce((sum, m) => sum + (m.current_chapter || 0), 0);
  const completedCount = mangas.filter(m => m.status === 'completed').length;
  const readingCount = mangas.filter(m => m.status === 'reading').length;
  const masteryRate = totalSeries > 0 ? Math.round((completedCount / totalSeries) * 100) : 0;

  // Genre analysis
  const genreCounts: Record<string, number> = {};
  mangas.forEach(m => {
    if (m.genres) {
      m.genres.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = sortedGenres[0]?.[0] || 'Unknown';

  // Recent activity (Last 4 updated)
  const recentActivity = [...mangas]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  return (
    <div className="relative min-h-screen">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 mb-12 group relative z-10 text-text-muted hover:text-white transition-colors py-2"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase font-black tracking-[0.3em]">Return to Library</span>
      </motion.button>

      <div className="relative z-10 space-y-16">
        {/* HERO: Profile Identity & Mastery */}
        <section className="flex flex-col lg:flex-row gap-12 items-start">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-96 p-12 bg-surface/40 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-2xl flex flex-col items-center text-center space-y-8"
          >
            <div className="relative">
              <div className="absolute -inset-6 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative w-32 h-32 rounded-full bg-surface-lighter border-2 border-accent/50 flex items-center justify-center p-1 shadow-2xl">
                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                   <span className="text-5xl font-syncopate font-bold text-accent italic">C</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-2xl flex items-center justify-center shadow-lg border-4 border-surface rotate-12">
                <Zap size={16} className="text-background fill-background" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Chiyo Voyager</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                <Star size={10} className="text-accent fill-accent" />
                <span className="text-[9px] uppercase tracking-[0.3em] font-black text-white/60">Elite Collector</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 pt-4">
               <div className="p-4 bg-white/[0.02] rounded-3xl border border-white/5">
                  <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mb-1">Rank</p>
                  <p className="text-xl font-syncopate font-bold text-white">#01</p>
               </div>
               <div className="p-4 bg-white/[0.02] rounded-3xl border border-white/5">
                  <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mb-1">Status</p>
                  <p className="text-xl font-syncopate font-bold text-accent italic">Active</p>
               </div>
            </div>
          </motion.div>

          {/* Core Metrics Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {[
              { label: 'Collection Scope', value: totalSeries, sub: 'Total Series Registered', icon: Layout, color: 'text-blue-400' },
              { label: 'Chapters Consumed', value: totalChapters, sub: 'Total Progression', icon: Hash, color: 'text-accent' },
              { label: 'Library Mastery', value: `${masteryRate}%`, sub: 'Series Completed', icon: Trophy, color: 'text-yellow-400' },
              { label: 'Reading Streak', value: readingCount, sub: 'Currently Active', icon: BookOpen, color: 'text-green-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] flex flex-col justify-between group hover:border-white/10 transition-all shadow-2xl"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <TrendingUp size={14} className="text-text-muted opacity-20" />
                </div>
                <div className="mt-8 space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-[0.3em] text-text-muted/60">{stat.label}</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-syncopate font-bold italic tracking-tighter text-white">{stat.value}</p>
                    <p className="text-[10px] font-bold text-text-muted/30 italic uppercase">{stat.sub}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* DETAILED INSIGHTS: Genres & Records */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Genre Distribution */}
          <div className="lg:col-span-1 p-10 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Interest Map</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
            
            <div className="space-y-6">
              {sortedGenres.slice(0, 5).map(([genre, count], i) => (
                <div key={genre} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest leading-none px-1">
                    <span className="text-white/80">{genre}</span>
                    <span className="text-accent italic">{Math.round((count / totalSeries) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / totalSeries) * 100}%` }}
                      transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                      className="h-full bg-accent opacity-60 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log / Modern Chronicles */}
          <div className="lg:col-span-2 p-10 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Recent Chronicles</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentActivity.map((manga, i) => (
                <div key={manga.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-5 items-center hover:bg-white/[0.04] transition-colors group">
                  <div className="w-16 h-20 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all shadow-lg shrink-0">
                    <img src={manga.cover_url || ''} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2 overflow-hidden">
                    <h4 className="text-[11px] font-black uppercase tracking-tight text-white leading-tight line-clamp-1 italic">{manga.title}</h4>
                    <div className="flex items-center gap-2">
                      <Clock size={10} className="text-accent" />
                      <span className="text-[8px] font-bold text-text-muted/60 uppercase tracking-widest">
                        {new Date(manga.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md inline-block">
                       <span className="text-[7px] font-black uppercase text-accent tracking-[0.1em]">Chap {manga.current_chapter} +</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Lifecycle Stats */}
        <section className="p-10 bg-accent/5 border border-accent/10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center shadow-xl shadow-accent/20">
                <Calendar size={24} className="text-background" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-accent/60">Deployment Date</p>
                <p className="text-xl font-syncopate font-bold uppercase italic">System Initialized 2024</p>
              </div>
           </div>
           
           <div className="flex gap-12">
              <div className="text-center">
                <p className="text-3xl font-syncopate font-bold text-white leading-none">0</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mt-2 opacity-40">Achievements Unlocked</p>
              </div>
              <div className="w-[1px] h-12 bg-white/5" />
              <div className="text-center">
                <p className="text-3xl font-syncopate font-bold text-white leading-none">{totalSeries}</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mt-2 opacity-40">Records Archived</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
