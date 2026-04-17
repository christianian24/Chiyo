import { X, Shield, HardDrive, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    window.electron.invoke('get-maintenance-status').then(setStatus);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-surface border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-8 border-b border-white/[0.03]">
          <h2 className="text-xl font-black tracking-tight uppercase italic">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-50 hover:opacity-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Health Status */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
              <Shield size={12} className="text-success" />
              System Integrity
            </h3>
            <div className="glass p-5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                  <HardDrive size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Storage Sanitization</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                    {status?.checkedAt ? `Last checked: ${status.checkedAt}` : 'Checking...'}
                  </p>
                </div>
              </div>
              {status?.orphanedDeleted > 0 && (
                <div className="px-3 py-1 bg-success/20 rounded-full text-[10px] font-black text-success uppercase tracking-widest">
                  +{status.orphanedDeleted} files purged
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
              <Info size={12} />
              Application Info
            </h3>
            <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/[0.03] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Chiyo Core</span>
                <span className="text-sm font-black text-white italic">v1.1.0</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Engine</span>
                <span className="text-sm font-black text-white italic">Electron + Sharp</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 pt-0">
          <button 
            onClick={onClose}
            className="btn btn-secondary w-full py-4 text-[10px] font-black uppercase tracking-[0.3em]"
          >
            Acknowledge
          </button>
        </div>
      </motion.div>
    </div>
  )
}
