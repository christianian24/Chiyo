import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, HardDrive, Info, Share, Database, User, Palette, ChevronRight, Check, AlertCircle, RefreshCw, Loader2, Download, Upload, AlertTriangle, X } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [status, setStatus] = useState<any>(null);
  const [backupStats, setBackupStats] = useState<{ count: number; lastBackup: string | null }>({ count: 0, lastBackup: null });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [username, setUsername] = useState('Chiyo Voyager');
  const [avatarPath, setAvatarPath] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const maint = await window.electron.invoke('get-maintenance-status');
    setStatus(maint);
    
    const stats = await window.electron.invoke('get-backup-stats');
    setBackupStats(stats);

    const name = await window.electron.invoke('get-setting', 'username');
    if (name) {
      setUsername(name);
      setTempName(name);
    }
    
    const path = await window.electron.invoke('get-setting', 'avatar_path');
    if (path) setAvatarPath(path);
  };

  const handleManualBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      await window.electron.invoke('perform-manual-backup');
      const stats = await window.electron.invoke('get-backup-stats');
      setBackupStats(stats);
    } catch (err) {
      console.error('Manual backup failed:', err);
    } finally {
      setTimeout(() => setIsBackingUp(false), 1000);
    }
  };

  const handleMasterExport = async () => {
    setIsExporting(true);
    try {
      const result = await window.electron.invoke('export-master-archive');
      if (result.success) {
        console.log('Master Export Complete:', result.path);
      }
    } catch (err) {
      console.error('Master Export Failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMasterRestore = async () => {
    try {
      const result = await window.electron.invoke('import-master-archive');
      // If successful, app will relaunch, so we don't need to handle state
      if (!result.success) {
        console.error('Restore failed or cancelled');
      }
    } catch (err) {
      console.error('Restore engine error:', err);
    } finally {
      setShowRestoreConfirm(false);
    }
  };

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
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl font-black uppercase italic tracking-tighter"
          >
            Command Center
          </motion.h2>
          <p className="text-text-muted text-xs uppercase tracking-[0.4em] font-bold opacity-60 italic">System Configuration & Data Integrity</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
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
                {/* Storage Sanitization */}
                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
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
                </div>

                {/* Auto-Backup Engine */}
                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all relative overflow-hidden">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isBackingUp ? 'bg-accent text-background' : 'bg-white/5 text-accent'} group-hover:scale-110`}>
                      {isBackingUp ? <Loader2 size={18} className="animate-spin" /> : <Database size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">Rolling Backups</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-widest font-black opacity-40">
                        {backupStats.count} / 05 Snapshots
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleManualBackup}
                    disabled={isBackingUp}
                    className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20"
                  >
                    <RefreshCw size={16} className={isBackingUp ? 'animate-spin' : ''} />
                  </button>
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
                    className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 overflow-hidden group cursor-pointer shadow-premium"
                  >
                    {avatarPath ? (
                      <img src={`chiyo-asset://${avatarPath}?t=${avatarTimestamp}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                         <User size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <span className="text-[8px] font-black uppercase text-background tracking-widest">Update</span>
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
                          className="w-full bg-white/5 border border-accent/20 rounded-xl px-4 py-2 text-white font-syncopate text-xs font-bold outline-none focus:border-accent shadow-inner transition-all"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveName} className="px-3 py-1.5 bg-accent text-background rounded-lg text-[9px] font-black uppercase tracking-widest">Save</button>
                          <button onClick={() => setIsEditingName(false)} className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-[9px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setIsEditingName(true)} className="group cursor-pointer p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-accent/40 transition-colors">
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
            {/* Master Archive (NEW Sector) */}
            <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-4">
                <Share size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Data Sovereignty</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleMasterExport}
                  disabled={isExporting}
                  className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-4 group hover:bg-white/[0.04] transition-all relative"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    {isExporting ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted group-hover:text-white">Master Export</span>
                  <p className="text-[7px] text-center text-text-muted/40 uppercase tracking-tighter leading-none">Database + Covers</p>
                </button>

                <button 
                  onClick={() => setShowRestoreConfirm(true)}
                  className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-4 group hover:bg-white/[0.04] transition-all relative"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted group-hover:text-white">Master Restore</span>
                  <p className="text-[7px] text-center text-text-muted/40 uppercase tracking-tighter leading-none">Complete Overwrite</p>
                </button>
              </div>

              {/* Progress Overlay */}
              <AnimatePresence>
                {isExporting && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-full h-full bg-accent"
                       />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent animate-pulse">Archiving Library...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Application Manifesto */}
            <section className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative group/info">
              <div className="flex items-center gap-4">
                <Info size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">System Architecture</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/[0.03] space-y-6">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-40">Core Processor</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-syncopate font-bold text-white italic tracking-tighter uppercase">Chiyo Core</span>
                      <span className="text-xs font-black text-accent italic">v1.2.3</span>
                    </div>
                 </div>

                 <div className="h-[1px] w-full bg-white/5" />

                 <div className="space-y-4">
                    {[
                      { label: 'Runtime Engine', value: 'Electron v33' },
                      { label: 'Graphics Core', value: 'React 18' },
                      { label: 'Database Module', value: 'SQLite 3' },
                      { label: 'Compression Core', value: 'AdmZip 0.5' }
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
      </div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showRestoreConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRestoreConfirm(false)}
              className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-accent/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-accent"
                />
              </div>

              <div className="flex items-center justify-center">
                 <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <AlertTriangle size={32} />
                 </div>
              </div>

              <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Neural Reconstitution</h3>
                 <p className="text-xs text-text-muted uppercase tracking-widest font-black leading-relaxed">
                   Initiating a Master Restore will <span className="text-accent underline">completely overwrite</span> your current library and every cover image.
                 </p>
              </div>

              <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl space-y-3">
                 <div className="flex items-center gap-2">
                    <Check size={12} className="text-accent" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Library Sync Overwrite</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Check size={12} className="text-accent" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Image Archive Replacement</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <RefreshCw size={12} className="text-accent" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Automated System Relaunch</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={handleMasterRestore}
                  className="w-full py-4 bg-accent text-background rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent/20"
                 >
                   Establish Connection
                 </button>
                 <button 
                  onClick={() => setShowRestoreConfirm(false)}
                  className="w-full py-4 bg-white/5 text-text-muted rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                 >
                   Abort Sequence
                 </button>
              </div>
              
              <button 
                onClick={() => setShowRestoreConfirm(false)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
