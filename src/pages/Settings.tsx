import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, HardDrive, Info, Share, Database, User, Palette, ChevronRight, Check, AlertCircle, RefreshCw, Loader2, Download, Upload, AlertTriangle, X, Cpu, Activity } from 'lucide-react';

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
      </div>

      {/* Navigation */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 mb-12 group relative z-10 text-accent hover:text-white transition-colors py-2"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase font-black tracking-[0.4em] italic">Return to Library</span>
      </motion.button>

      <div className="relative z-10 max-w-5xl">
        <header className="mb-20 space-y-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-[2px] bg-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent italic">Global Kernel Controller</span>
           </div>
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl font-black uppercase italic tracking-tighter drop-shadow-2xl"
          >
            Command Center
          </motion.h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-20">
          {/* Left Column: System & Identity */}
          <div className="space-y-10">
            {/* System Integrity */}
            <section className="p-10 bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] space-y-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Shield size={100} />
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <Cpu size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Kernel Sanity</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-6 relative z-10">
                {/* Storage Sanitization */}
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-accent/20 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                      <HardDrive size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-text-muted/30 uppercase tracking-[0.3em] mb-1">Storage Module</p>
                      <p className="text-sm font-bold text-white tracking-tight uppercase italic">
                        {status?.checkedAt ? `Last Sync: ${status.checkedAt}` : 'Analyzing Files...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-Backup Engine */}
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-accent/40 transition-all relative overflow-hidden">
                  <div className="flex items-center gap-5 relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isBackingUp ? 'bg-accent text-background shadow-[0_0_15px_rgba(255,77,77,0.4)]' : 'bg-white/5 text-accent'} group-hover:scale-110`}>
                      {isBackingUp ? <Loader2 size={24} className="animate-spin" /> : <Database size={24} strokeWidth={1.5} />}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-text-muted/30 uppercase tracking-[0.3em] mb-1">Neural Snapshot Engine</p>
                      <p className="text-sm font-mono-tech font-bold text-white italic">
                        {backupStats.count.toString().padStart(2, '0')} / 05 REVISIONS
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleManualBackup}
                    disabled={isBackingUp}
                    className="p-3 rounded-xl bg-white/5 text-text-muted hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20 relative z-10"
                  >
                    <RefreshCw size={18} className={isBackingUp ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </section>

            {/* Identity Settings */}
             <section className="p-10 bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] space-y-10 shadow-2xl">
              <div className="flex items-center gap-4">
                <User size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Personnel ID</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-8">
                  <div 
                    onClick={handleChangeAvatar}
                    className="relative w-28 h-28 rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden group cursor-pointer shadow-premium"
                  >
                    {avatarPath ? (
                      <img src={`chiyo-asset://${avatarPath}?t=${avatarTimestamp}`} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                         <User size={40} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <span className="text-[9px] font-black uppercase text-background tracking-widest">Upload ID</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {isEditingName ? (
                      <div className="space-y-4">
                        <input
                          autoFocus
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          className="w-full bg-[#0a0b0d] border border-accent/20 rounded-xl px-5 py-3 text-white font-mono-tech text-xs font-bold outline-none focus:border-accent shadow-inner transition-all"
                        />
                        <div className="flex gap-3">
                          <button onClick={handleSaveName} className="px-5 py-2 bg-accent text-background rounded-lg text-[9px] font-black uppercase tracking-widest italic">Save ID</button>
                          <button onClick={() => setIsEditingName(false)} className="px-5 py-2 bg-white/5 text-white/40 rounded-lg text-[9px] font-black uppercase tracking-widest">Abort</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setIsEditingName(true)} className="group cursor-pointer p-6 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-accent/40 transition-all">
                        <p className="text-[8px] font-black text-text-muted/30 uppercase tracking-[0.4em] mb-1">Global Operator</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-syncopate font-bold text-white italic tracking-tighter uppercase">{username}</p>
                          <ChevronRight size={18} className="text-accent opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Data & About */}
          <div className="space-y-10">
            {/* Master Archive (NEW Sector) */}
            <section className="p-10 bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] space-y-10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-4">
                <Share size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Data Sovereignty</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <button 
                  onClick={handleMasterExport}
                  disabled={isExporting}
                  className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-5 group hover:bg-white/[0.04] hover:border-accent/40 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-5 transition-opacity">
                    <Download size={40} />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    {isExporting ? <Loader2 size={28} className="animate-spin" /> : <Download size={28} strokeWidth={1.5} />}
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted group-hover:text-white transition-colors">Master Export</span>
                    <p className="text-[7px] text-text-muted/40 uppercase tracking-widest font-black italic">DATABASE + COVERS</p>
                  </div>
                </button>

                <button 
                  onClick={() => setShowRestoreConfirm(true)}
                  className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-5 group hover:bg-white/[0.04] hover:border-red-600/40 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-5 transition-opacity text-red-600">
                    <Upload size={40} />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-red-600/60 group-hover:scale-110 group-hover:text-red-500 transition-all">
                    <Upload size={28} strokeWidth={1.5} />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted group-hover:text-white transition-colors">Neural Overwrite</span>
                    <p className="text-[7px] text-red-600/40 uppercase tracking-widest font-black italic italic">RESTORE SYSTEM</p>
                  </div>
                </button>
              </div>

              <AnimatePresence>
                {isExporting && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-6"
                  >
                    <div className="w-24 h-[2px] bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-accent shadow-[0_0_10px_rgba(255,77,77,1)]"
                       />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-accent animate-pulse italic">Archiving Neural Library...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Application Manifesto */}
            <section className="p-10 bg-[#0d0e12] border border-white/[0.03] rounded-[3rem] space-y-10 shadow-2xl relative group/info">
              <div className="flex items-center gap-4">
                <Info size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted/40 italic">Architecture Specs</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="bg-white/[0.01] p-10 rounded-[2.5rem] border border-white/[0.03] space-y-8">
                 <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.6em] text-text-muted opacity-30">CORE PROCESSOR</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-syncopate font-bold text-white italic tracking-tighter uppercase whitespace-nowrap">Chiyo Kernel</span>
                      <span className="text-xs font-mono-tech text-accent">v1.1.0-REDMAGIC</span>
                    </div>
                 </div>

                 <div className="h-[1px] w-full bg-white/5" />

                 <div className="space-y-5">
                    {[
                      { label: 'OS Engine', value: 'Electron v33' },
                      { label: 'Neural Matrix', value: 'React 18' },
                      { label: 'Data Hub', value: 'SQLite 3' },
                      { label: 'Archive Core', value: 'AdmZip 0.5' }
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center text-[9px] font-mono-tech font-bold uppercase tracking-widest">
                        <span className="text-text-muted/40">{item.label}</span>
                        <div className="flex-1 border-b border-white/5 mx-6" />
                        <span className="text-white italic">{item.value}</span>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRestoreConfirm(false)}
              className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0d0e12] border border-white/[0.05] rounded-[4rem] p-12 shadow-2xl space-y-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)]"
                />
              </div>

              <div className="flex items-center justify-center">
                 <div className="w-20 h-20 rounded-3xl bg-red-600/10 flex items-center justify-center text-red-600 animate-pulse">
                    <AlertTriangle size={40} />
                 </div>
              </div>

              <div className="text-center space-y-3">
                 <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Neural Reconstitution</h3>
                 <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-red-600/60 uppercase tracking-[0.4em] font-black">CRITICAL DATA OVERWRITE</span>
                    <p className="text-[11px] text-text-muted uppercase tracking-widest font-black leading-relaxed max-w-sm mx-auto">
                      Initiating this sequence will <span className="text-red-600 underline decoration-2 underline-offset-4">permanently purge</span> your current local core.
                    </p>
                 </div>
              </div>

              <div className="p-8 bg-red-600/5 border border-red-600/10 rounded-3xl space-y-4">
                 {[
                   'Full Database Sync Replacement',
                   'Complete Cover Archive Substitution',
                   'Automated Relaunch Sequence'
                 ].map((task) => (
                   <div key={task} className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded bg-red-600/20 flex items-center justify-center">
                        <Check size={10} className="text-red-500" />
                      </div>
                      <span className="text-[10px] font-mono-tech font-bold uppercase tracking-[0.2em] text-white/50">{task}</span>
                   </div>
                 ))}
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={handleMasterRestore}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.5em] italic hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(220,38,38,0.3)]"
                 >
                   Establish Link
                 </button>
                 <button 
                  onClick={() => setShowRestoreConfirm(false)}
                  className="w-full py-5 bg-white/5 text-text-muted rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] hover:text-white transition-colors"
                 >
                   Abort Sequence
                 </button>
              </div>
              
              <button 
                onClick={() => setShowRestoreConfirm(false)}
                className="absolute top-8 right-8 p-2 text-text-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
