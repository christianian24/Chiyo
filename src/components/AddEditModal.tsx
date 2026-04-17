import { useState } from 'react'
import { X, Upload, Image as ImageIcon, Calendar, BookOpen, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AddEditModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isElectron?: boolean;
}

export default function AddEditModal({ onClose, onSubmit, initialData, isElectron }: AddEditModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    status: initialData?.status || 'reading',
    current_chapter: initialData?.current_chapter || 0,
    total_chapters: initialData?.total_chapters || '',
    date_started: initialData?.date_started || '',
    date_finished: initialData?.date_finished || '',
    temp_cover_path: '',
    cover_path: initialData?.cover_path || ''
  });

  const [errors, setErrors] = useState<{title?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    if (!isElectron) {
      alert('File picking is only available in the desktop application.');
      return;
    }
    const path = await window.electron.invoke('pick-cover');
    if (path) {
      setFormData(prev => ({ ...prev, temp_cover_path: path }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    try {
      setIsSubmitting(true);
      // Ensure the ID is included if we are editing
      await onSubmit(initialData?.id ? { ...formData, id: initialData.id } : formData);
    } catch (error) {
      console.error('Submission failed:', error);
      setIsSubmitting(false);
    }
  };

  const currentCover = formData.temp_cover_path 
    ? `chiyo-asset://${formData.temp_cover_path}` 
    : (formData.cover_path ? `chiyo-asset://${formData.cover_path}` : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl bg-surface border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 px-8 border-b border-white/[0.03]">
          <h2 className="text-xl font-black tracking-tight uppercase italic">{initialData ? 'Refine Series' : 'New Collection'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-50 hover:opacity-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-8">
          <div className="flex gap-8 items-start">
            {/* Image Preview - Card Style */}
            <div className="w-[140px] shrink-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 ml-1">Artwork</div>
              <motion.div 
                whileHover={{ y: -5 }}
                onClick={handlePickImage}
                className="aspect-[3/4] bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/30 hover:bg-white/5 transition-all overflow-hidden relative group shadow-xl"
              >
                {currentCover ? (
                  <img src={currentCover} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-text-muted opacity-20" />
                    <span className="text-[8px] uppercase tracking-widest text-text-muted font-black">Missing</span>
                  </>
                )}
                <div className="absolute inset-0 bg-accent/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Upload size={20} className="text-background" strokeWidth={3} />
                </div>
              </motion.div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Series Title</label>
                <input 
                  type="text" 
                  autoFocus
                  className={`input h-12 bg-white/[0.02] border-white/5 focus:border-accent/30 transition-all ${errors.title ? 'border-red-500/50' : ''}`}
                  placeholder="Enter Title..."
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
                    <BookOpen size={10} /> Status
                  </label>
                  <select 
                    className="input h-11 bg-white/[0.02] border-white/5 appearance-none"
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
                    <Hash size={10} /> Progress
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="input h-11 bg-white/[0.02] border-white/5 text-center px-1"
                      placeholder="Vol"
                      value={formData.current_chapter}
                      onChange={e => setFormData(prev => ({ ...prev, current_chapter: parseInt(e.target.value) || 0 }))}
                    />
                    <span className="text-white/20 font-black">/</span>
                    <input 
                      type="number" 
                      placeholder="Total"
                      className="input h-11 bg-white/[0.02] border-white/5 text-center px-1"
                      value={formData.total_chapters}
                      onChange={e => setFormData(prev => ({ ...prev, total_chapters: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 ml-1 flex items-center gap-2">
                  <Calendar size={10} /> Commencement Date
                </label>
                <input 
                  type="date" 
                  className="input h-11 bg-white/[0.02] border-white/5"
                  value={formData.date_started}
                  onChange={e => setFormData(prev => ({ ...prev, date_started: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex-1 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              Discard
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex-[2] py-4 shadow-xl shadow-accent/10"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Updating...
                </div>
              ) : (
                initialData ? 'Save Changes' : 'Add to Vault'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
