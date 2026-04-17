import { AlertTriangle, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ 
  title, 
  message, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop - Targeted blur for focus */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/40 backdrop-blur-md" 
        onClick={onCancel}
      />
      
      {/* Modal - Aligned with Chiyo's rounded premium look */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="relative w-full max-w-sm bg-surface border border-red-500/10 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 animate-pulse">
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>
          
          <h3 className="text-xl font-black tracking-tight text-white mb-2 uppercase italic">{title}</h3>
          <p className="text-xs text-text-muted leading-relaxed px-4">
            {message}
          </p>
        </div>

        <div className="p-6 pt-2 flex flex-col gap-2">
          <button 
            onClick={onConfirm}
            className="w-full py-4 rounded-xl bg-red-500 text-background text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20"
          >
            {confirmLabel}
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-4 rounded-xl hover:bg-white/5 text-text-muted text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
