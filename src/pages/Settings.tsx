import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, HardDrive, Info, Share, Database, User, Palette, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [status, setStatus] = useState<any>(null);
  const [username, setUsername] = useState('Chiyo Voyager');
  const [avatarPath, setAvatarPath] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  useEffect(() => {
    window.electron.invoke('get-maintenance-status').then(setStatus);
    window.electron.invoke('get-setting', 'username').then(name => {
      if (name) {
        setUsername(name);
        setTempName(name);
      }
    });
    window.electron.invoke('get-setting', 'avatar_path').then(path => {
      if (path) setAvatarPath(path);
    });
  }, []);

  const handleSaveName = async () => {
    if (tempName.trim()) {
      await window.electron.invoke('set-setting', { key: 'username', value: tempName.trim() });
      setUsername(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleChangeAvatar = async () => {
    const path = await window.electron.invoke('pick-cover');
    if (path) {
      const fileName = await window.electron.invoke('save-avatar', path);
      setAvatarPath(fileName);
      setAvatarTimestamp(Date.now());
    }
  };

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

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div 
                    onClick={handleChangeAvatar}
                    className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 overflow-hidden group cursor-pointer"
                  >
                    {avatarPath ? (
                      <img src={`chiyo-asset://${avatarPath}?t=${avatarTimestamp}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                         <User size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] font-black uppercase text-white tracking-widest">Change</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {isEditingName ? (
                      <div className="space-y-3">
                        <input
                          autoFocus
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          className="w-full bg-white/5 border border-accent/20 rounded-xl px-4 py-2 text-white font-syncopate text-xs font-bold outline-none focus:border-accent transition-all"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveName}
                            className="px-3 py-1.5 bg-accent text-background rounded-lg text-[9px] font-black uppercase tracking-widest"
                          >
                            Save Name
                          </button>
                          <button 
                            onClick={() => setIsEditingName(false)}
                            className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-[9px] font-black uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setIsEditingName(true)}
                        className="group cursor-pointer p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-accent/40 transition-colors"
                      >
                        <p className="text-[9px] text-text-muted uppercase tracking-widest font-black mb-1">Global Username</p>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-syncopate font-bold text-white italic">{username}</p>
                          <ChevronRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
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
