import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, BookOpen, Hash, Star, Layout, Clock, Calendar, Zap, Share2, TrendingUp, Lock, Activity, ShieldCheck } from 'lucide-react';
import { Manga } from '../types';
import { AchievementService, Achievement, ACHIEVEMENTS } from '../services/AchievementService';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import { GenreRadar } from '../components/charts/GenreRadar';
import { toPng } from 'html-to-image';
import { SmartImage } from '../components/SmartImage';
import { resolveMangaCoverSrc } from '../utils/coverResolver';

interface ProfileProps {
  mangas: Manga[];
  onBack: () => void;
}

const Profile: React.FC<ProfileProps> = ({ mangas, onBack }) => {
  const [installDate, setInstallDate] = useState<string | null>(null);
  const [username, setUsername] = useState('Chiyo Voyager');
  const [avatarPath, setAvatarPath] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [avatarTimestamp] = useState(Date.now());
  const profileRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const date = await window.electron.invoke('get-installation-date');
      setInstallDate(date);
      
      const name = await window.electron.invoke('get-setting', 'username');
      if (name) setUsername(name);
      
      const path = await window.electron.invoke('get-setting', 'avatar_path');
      if (path) setAvatarPath(path);

      const xp = await window.electron.invoke('get-setting', 'total_xp');
      if (xp) setTotalXP(parseInt(xp));

      const achs = await window.electron.invoke('get-achievements');
      if (achs) setAchievements(achs);
    };
    fetchData();
  }, []);

  // Statistics Calculations
  const totalSeries = mangas.length;
  const totalChapters = mangas.reduce((sum, m) => sum + (m.current_chapter || 0), 0);
  const completedCount = mangas.filter(m => {
    if (m.status === 'completed') return true;
    const total = m.total_chapters || 0;
    return total > 0 && (m.current_chapter || 0) >= total;
  }).length;
  const readingCount = mangas.filter(m => m.status === 'reading').length;
  const masteryRate = totalSeries > 0 ? Math.round((completedCount / totalSeries) * 100) : 0;

  // Genre analysis
  const genreCounts: Record<string, number> = {};
  mangas.forEach(m => {
    if (!Array.isArray(m.genres)) return;
    m.genres.forEach((genre) => {
      if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);

  // Activity data for Heatmap
  const activityData = mangas.map(m => ({
    date: m.updated_at.split(' ')[0],
    count: 1
  })).reduce((acc: any[], current) => {
    const existing = acc.find(item => item.date === current.date);
    if (existing) existing.count++;
    else acc.push(current);
    return acc;
  }, []);

  // Radar data
  const radarData = sortedGenres.slice(0, 6).map(([label, value]) => ({ label, value }));

  // Recent activity (Last 6 updated)
  const recentActivity = [...mangas]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  const handleExport = async () => {
    if (profileRef.current === null) return;
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(profileRef.current!, {
          cacheBust: true,
          backgroundColor: '#0a0b0d',
          style: { padding: '40px', borderRadius: '40px' }
        });
        const link = document.createElement('a');
        link.download = `chiyo-profile-${username.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Snapshot failed:', err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <div ref={profileRef} className={`relative min-h-screen ${isExporting ? 'p-10' : ''}`}>
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      {!isExporting && (
        <div className="flex justify-between items-center mb-12 relative z-20">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="flex items-center gap-2 group text-accent hover:text-white transition-colors py-2"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] uppercase font-black tracking-[0.3em]">Return to Library</span>
          </motion.button>

          <button
            onClick={handleExport}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent/40 transition-all hover:scale-105 active:scale-95"
          >
            <Share2 size={16} />
            Capture Snapshot
          </button>
        </div>
      )}

      <div className="relative z-10 space-y-16">
        {/* HERO: Profile Identity & Mastery */}
        <section className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* COLUMN 1: System Identity */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-96 p-10 bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden group/hero"
          >
            <div className="relative flex flex-col items-center text-center space-y-10">
              <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -inset-10 bg-accent/20 blur-[60px] rounded-full pointer-events-none" 
                />
                
                <div className="relative w-36 h-36">
                   <div className="absolute inset-0 rounded-full border border-white/5 p-1.5 bg-gradient-to-tr from-accent/20 to-transparent">
                      <div className="w-full h-full rounded-full bg-surface-lighter border-2 border-accent flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/[0.02]">
                        {avatarPath && !imgError ? (
                          <img 
                            src={`chiyo-asset://${avatarPath}?t=${avatarTimestamp}`} 
                            className="w-full h-full object-cover rounded-full" 
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-surface-lighter flex items-center justify-center">
                            <span className="text-6xl font-syncopate font-bold text-accent italic drop-shadow-[0_0_15px_rgba(255,107,0,0.4)]">{username.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-accent rounded-[1.25rem] flex items-center justify-center shadow-2xl border-4 border-[#0d0e11] rotate-12 group-hover/hero:rotate-0 transition-all duration-500">
                  <Zap size={20} className="text-background fill-background" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl line-clamp-1">{username}</h2>
                  <div className="flex justify-center items-center gap-3">
                    <div className="h-0.5 w-6 bg-accent/20" />
                    <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/40 italic">System Identity</span>
                    <div className="h-0.5 w-6 bg-accent/20" />
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 rounded-full border border-accent/20 backdrop-blur-sm grayscale group-hover/hero:grayscale-0 transition-all duration-700">
                  <Star size={12} className="text-accent fill-accent" />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-black text-accent drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]">Elite Collector</span>
                </div>
              </div>

              <div className="w-full space-y-6 pt-6 relative">
                 <div className="p-8 bg-white/[0.01] rounded-[2.5rem] border border-white/5 space-y-6 relative overflow-hidden group/xp">
                    <div className="flex justify-between items-end relative z-10">
                      <div className="text-left space-y-1">
                        <p className="text-[9px] uppercase font-black tracking-[0.4em] text-text-muted/40 italic">Voyager Code</p>
                        <p className="text-4xl font-syncopate font-bold text-accent italic leading-none drop-shadow-[0_0_20px_rgba(255,107,0,0.3)]">LVL {AchievementService.getLevel(totalXP).level}</p>
                      </div>
                      <div className="text-right">
                         <div className="flex items-center gap-2 mb-1">
                            <Hash size={12} className="text-accent opacity-40" />
                            <p className="text-[12px] font-syncopate font-bold text-white italic">{totalXP}<span className="text-white/20 ml-1">XP</span></p>
                         </div>
                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest italic leading-none">Next Phase @ {AchievementService.getLevel(totalXP).nextLevelXP}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${AchievementService.getLevel(totalXP).progress}%` }}
                          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full relative overflow-hidden shadow-[0_0_15px_rgba(255,107,0,0.4)]"
                        />
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* COLUMN 2: Collection Core & Trophies */}
          <div className="flex-1 flex flex-col gap-6">
            {/* LARGE CENTERED: Collection Scope */}
            <div className="p-8 bg-surface/30 backdrop-blur-md border border-white/10 rounded-[2.5rem] relative overflow-hidden group shadow-[0_0_50px_rgba(255,107,0,0.05)] border-accent/20">
               {/* Technical Background */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                  <svg width="100%" height="100%">
                    <pattern id="grid-center" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid-center)" />
                  </svg>
                </div>

               <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 py-6">
                  <div className="flex items-center gap-6">
                    <div className="h-px w-12 bg-accent/20" />
                    <span className="text-[12px] font-black uppercase tracking-[0.5em] text-accent italic">Collection Scope</span>
                    <div className="h-px w-12 bg-accent/20" />
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <motion.p 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-8xl font-syncopate font-bold italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    >
                      {totalSeries}
                    </motion.p>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], filter: ["drop-shadow(0 0 0px red)", "drop-shadow(0 0 15px red)", "drop-shadow(0 0 0px red)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Zap size={48} className="text-red-500 fill-red-500" />
                    </motion.div>
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Total Registered Series in Command Hub</p>
               </div>
            </div>

            {/* Achievement Showcase */}
            <div className="flex-1 p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] relative overflow-hidden group shadow-2xl flex flex-col justify-start gap-6">
               <div className="flex items-center gap-4 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Elite Trophies</span>
                  <div className="h-[1px] flex-1 bg-white/5" />
               </div>
               
               <div className="grid grid-cols-1 gap-4 relative z-10 overflow-y-auto pr-2 scrollbar-hide">
                 {achievements.slice(0, 3).map((ach, i) => (
                   <motion.div 
                     key={ach.id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className="p-4 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex items-center gap-5 group/item hover:bg-white/[0.06] transition-all"
                   >
                     <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-background shadow-[0_0_20px_rgba(255,107,0,0.3)] group-hover/item:scale-110 transition-transform"><Trophy size={20} /></div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">{ach.name}</p>
                        <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-tight italic line-clamp-1">{ach.description}</p>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </div>
          </div>

          {/* COLUMN 3: Sub Metrics */}
          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 flex-1">
               {[
                { label: 'Library Mastery', value: `${masteryRate}%`, unit: 'COMPLETE', icon: Trophy, color: 'text-yellow-400', trail: 'Analyzing...' },
                { label: 'Reading Streak', value: readingCount, unit: 'ACTIVE', icon: BookOpen, color: 'text-green-400', trail: 'Realtime' },
                { label: 'Neural Activity', value: totalChapters, unit: 'CHPS', icon: Zap, color: 'text-accent', trail: 'Synced' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative p-6 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 transition-all shadow-xl flex flex-col justify-center"
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                        <stat.icon size={18} className={stat.color} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/60">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-syncopate font-bold italic text-white">{stat.value}</span>
                          <span className="text-[8px] font-black text-text-muted/40 tracking-widest">{stat.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end opacity-20 group-hover:opacity-100 transition-opacity">
                      <TrendingUp size={12} className="text-text-muted mb-1" />
                      <span className="text-[7px] font-black text-accent uppercase tracking-widest">{stat.trail}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* System Status Readout */}
            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-[2rem] space-y-4">
               <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/40">Hardware Pulse</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-3 bg-accent/20 rounded-full" />)}
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Neural Link Active</span>
                  </div>
                  <ShieldCheck size={12} className="text-accent opacity-50" />
               </div>
            </div>
          </div>
        </section>

        {/* ANALYTICS: Intelligence Dashboard */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-6 shadow-2xl overflow-hidden relative group">
              <div className="flex items-center gap-4 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Taste Profile</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="flex justify-center"><GenreRadar data={radarData} /></div>
           </div>

           <div className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-6 shadow-2xl relative group">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Activity Spectrum</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="flex-1 flex items-center justify-center"><ActivityHeatmap data={activityData} /></div>
           </div>
        </section>

        {/* ACHIEVEMENT ROADMAP & CHRONICLES */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recognition Module Redesign: FULL ROADMAP */}
          <div className="lg:col-span-1 p-10 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden group/trophy">
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Recognition Module</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-2 relative z-10">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = achievements.some(a => a.id === ach.id);
                return (
                  <div 
                    key={ach.id} 
                    className={`p-5 rounded-3xl flex items-center gap-5 transition-all duration-500 border ${
                      isUnlocked 
                      ? 'bg-accent/10 border-accent/20' 
                      : 'bg-white/[0.02] border-white/5 opacity-40 grayscale'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${
                      isUnlocked ? 'bg-accent text-background' : 'bg-white/5 text-white/20'
                    }`}>
                      {isUnlocked ? <Trophy size={20} /> : <Lock size={20} />}
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[11px] font-black uppercase tracking-widest leading-none ${isUnlocked ? 'text-accent' : 'text-white/40'}`}>
                        {ach.name}
                      </p>
                      <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-tight leading-none italic">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronicle Feed */}
          <div className="lg:col-span-2 p-10 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[3rem] space-y-8 shadow-2xl relative group/chronicles">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Chronicle Feed</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recentActivity.map((manga: Manga, i) => (
                <motion.div 
                  key={manga.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex gap-6 items-center hover:bg-white/[0.04] transition-all duration-700 group/card relative overflow-hidden"
                >
                  <span className="absolute -bottom-4 -right-4 text-7xl font-syncopate font-bold text-white/[0.02] pointer-events-none group-hover/card:text-accent/[0.05] transition-colors">0{i + 1}</span>
                  <div className="w-20 h-28 rounded-2xl overflow-hidden shadow-2xl group-hover/card:scale-105 transition-transform duration-700 relative z-10 shrink-0">
                    <SmartImage src={resolveMangaCoverSrc(manga)} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-3 overflow-hidden relative z-10">
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-black uppercase tracking-tighter text-white leading-tight line-clamp-1 italic group-hover/card:text-accent transition-colors">{manga.title}</h4>
                      <div className="flex items-center gap-2">
                        <Calendar size={10} className="text-text-muted/40" />
                        <span className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest italic">{new Date(manga.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="h-0.5 w-4 bg-accent/20" />
                       <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                          <span className="text-[9px] font-black uppercase text-accent tracking-[0.1em] drop-shadow-[0_0_5px_rgba(255,107,0,0.3)]">CH. {manga.current_chapter}</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Footer Stats */}
        <section className="p-10 bg-accent/5 border border-accent/10 rounded-[3.5rem] flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group/footer">
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center shadow-xl shadow-accent/20 group-hover/footer:rotate-12 transition-transform duration-500"><Calendar size={24} className="text-background" /></div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-accent/60">Deployment Date</p>
                <p className="text-xl font-syncopate font-bold uppercase italic">{installDate ? new Date(installDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'System Initialization'}</p>
              </div>
           </div>
           
           <div className="flex gap-12 relative z-10">
              <div className="text-center">
                <p className="text-3xl font-syncopate font-bold text-white leading-none">{achievements.length}</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mt-2 opacity-40 italic font-syncopate">Recognition Keys</p>
              </div>
              <div className="w-[1px] h-12 bg-white/5" />
              <div className="text-center">
                <p className="text-3xl font-syncopate font-bold text-white leading-none">{totalSeries}</p>
                <p className="text-[8px] uppercase font-black tracking-widest text-text-muted mt-2 opacity-40 italic font-syncopate">Archives Synced</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
