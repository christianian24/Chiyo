import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, HardDrive, Info, Share, Database, User, Palette, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    window.electron.invoke('get-maintenance-status').then(setStatus);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full" />
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

      <div className="relative z-10 max-w-4xl">
        <header className="mb-16 space-y-4">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">Command Center</h2>
          <p className="text-text-muted text-xs uppercase tracking-[0.4em] font-bold opacity-60 italic">System Configuration & Data Integrity</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: System & Identity */}
          <div className="space-y-8">
            {/* System Integrity */}
            <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <Shield size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">System Integrity</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">Storage Sanitization</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-widest font-black opacity-40">
                        {status?.checkedAt ? `Last Sync: ${status.checkedAt}` : 'Analyzing Files...'}
                      </p>
                    </div>
                  </div>
                  {status?.orphanedDeleted > 0 && (
                    <div className="px-3 py-1 bg-accent/20 rounded-full text-[9px] font-black text-accent uppercase tracking-[0.2em]">
                      {status.orphanedDeleted} Purged
                    </div>
                  )}
                </div>

                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between opacity-50 grayscale cursor-not-allowed">
                  <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                      <Database size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/40 tracking-tight">Auto-Backup Engine</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-widest font-black">Coming in v1.3.0</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Identity Settings */}
             <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <User size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Account Identity</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-accent/40 transition-colors cursor-pointer">
                  <div>
                    <p className="text-[9px] text-text-muted uppercase tracking-widest font-black mb-1">Global Username</p>
                    <p className="text-lg font-syncopate font-bold text-white italic">Chiyo Voyager</p>
                  </div>
                  <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Data & About */}
          <div className="space-y-8">
            {/* Data Management */}
            <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <Share size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Data Management</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-4 group hover:bg-white/[0.04] transition-all grayscale opacity-50 cursor-not-allowed">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white transition-transform">
                    <Database size={20} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Export Library</span>
                </button>
                <button className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-4 group hover:bg-white/[0.04] transition-all grayscale opacity-50 cursor-not-allowed">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white transition-transform">
                    <AlertCircle size={20} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Reset Factory</span>
                </button>
              </div>
            </section>

            {/* Application Manifesto */}
            <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <Info size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Application Info</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/[0.03] space-y-6">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-40">Software Architecture</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-syncopate font-bold text-white italic tracking-tighter uppercase">Chiyo Core</span>
                      <span className="text-xs font-black text-accent italic">v1.2.3</span>
                    </div>
                 </div>

                 <div className="h-[1px] w-full bg-white/5" />

                 <div className="space-y-4">
                    {[
                      { label: 'Runtime Engine', value: 'Electron v33' },
                      { label: 'Graphics Core', value: 'Vite + React' },
                      { label: 'Database Module', value: 'SQLite 3' },
                      { label: 'Image Pipeline', value: 'Sharp Engine' }
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-text-muted/60">{item.label}</span>
                        <div className="flex-1 border-b border-dotted border-white/10 mx-4" />
                        <span className="text-white">{item.value}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Credit */}
        <footer className="mt-16 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
           <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white">Engraved by Christianian & Antigravity</p>
        </footer>
      </div>
    </div>
  );
};

export default Settings;
