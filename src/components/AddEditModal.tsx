import { useState, useRef, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, Calendar, BookOpen, Hash, Tag, Layers, Info, CheckCircle2, Clock, XCircle, Zap, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AddEditModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isElectron?: boolean;
}

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Slice of Life", "Sci-Fi", "Mystery"];
const FORMATS = ["Manga", "Manhwa", "Manhua", "Light Novel", "One-shot"];
const PUB_STATUSES = ["Ongoing", "Completed", "Hiatus", "Cancelled"];

const statusConfig = {
  reading: { icon: BookOpen, color: 'text-primary', label: 'Reading' },
  completed: { icon: CheckCircle2, color: 'text-success', label: 'Completed' },
  'on-hold': { icon: Clock, color: 'text-warning', label: 'On Hold' },
  dropped: { icon: XCircle, color: 'text-error', label: 'Dropped' },
  'plan-to-read': { icon: Clock, color: 'text-text-muted', label: 'Not Started' },
};

export default function AddEditModal({ onClose, onSubmit, initialData, isElectron }: AddEditModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    status: initialData?.status || 'reading',
    current_chapter: initialData?.current_chapter || 0,
    total_chapters: initialData?.total_chapters || '',
    date_started: initialData?.date_started || '',
    date_finished: initialData?.date_finished || '',
    genres: initialData?.genres || '',
    format: initialData?.format || '',
    publishing_status: initialData?.publishing_status || '',
    temp_cover_path: '',
    cover_path: initialData?.cover_path || ''
  });

  const [errors, setErrors] = useState<{title?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGenre = (genre: string) => {
    const currentGenres = formData.genres ? formData.genres.split(',') : [];
    if (currentGenres.includes(genre)) {
      setFormData(prev => ({ ...prev, genres: currentGenres.filter((g: string) => g !== genre).join(',') }));
    } else {
      setFormData(prev => ({ ...prev, genres: [...currentGenres, genre].join(',') }));
    }
  };

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
      await onSubmit(initialData?.id ? { ...formData, id: initialData.id } : formData);
    } catch (error) {
      console.error('Submission failed:', error);
      setIsSubmitting(false);
    }
  };

  const currentCover = formData.temp_cover_path 
    ? `chiyo-asset://${formData.temp_cover_path}` 
    : (formData.cover_path ? `chiyo-asset://${formData.cover_path}` : null);

  // Custom Selector Component
  const CustomSelect = ({ label, value, options, onChange, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => (typeof o === 'string' ? o === value : o.value === value));
    const displayValue = typeof selectedOption === 'string' ? selectedOption : selectedOption?.label || value || 'Select...';

    return (
      <div className="space-y-2 flex-1" ref={containerRef}>
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
          {Icon && <Icon size={10} />} {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full h-11 bg-white/[0.02] border border-white/5 rounded-xl px-4 flex items-center justify-between hover:bg-white/5 transition-all text-[11px] font-bold text-white/90 focus:border-accent/40 outline-none"
          >
            <span className="truncate italic uppercase">{displayValue}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : 'opacity-30'}`} />
          </button>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 left-0 right-0 mt-2 py-2 bg-surface border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl"
              >
                {options.map((opt: any) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const lbl = typeof opt === 'string' ? opt : opt.label;
                  const isSelected = val === value;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        onChange(val);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-[10px] font-bold text-left uppercase tracking-widest transition-colors flex items-center justify-between ${
                        isSelected ? 'text-accent bg-accent/5' : 'text-text-muted hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {lbl}
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl bg-surface border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 px-8 border-b border-white/[0.03]">
          <h2 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-3">
            <Zap size={20} className="text-accent fill-accent/20" />
            {initialData ? 'Refine Series' : 'New Collection'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-50 hover:opacity-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-8 overflow-y-auto max-h-[80vh] scrollbar-hide">
          <div className="flex gap-8 items-start">
            {/* Live Card Preview Column */}
            <div className="w-[150px] shrink-0 space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">Live Preview</div>
              <motion.div 
                className="aspect-[3/4.5] bg-surface-lighter rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group"
              >
                {currentCover ? (
                  <img src={currentCover} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                    <ImageIcon size={32} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Artwork Missing</span>
                  </div>
                )}
                
                {/* Preview Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col justify-end p-3">
                  <div className="space-y-1">
                    {/* Status Badge Preview */}
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/5">
                      {(() => {
                        const statusKey = formData.status as keyof typeof statusConfig;
                        const config = statusConfig[statusKey] || statusConfig.reading;
                        const Icon = config.icon;
                        return (
                          <>
                            <Icon size={8} className={config.color} />
                            <span className="text-[7px] font-black uppercase tracking-widest text-white/90">{config.label}</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-[10px] font-black text-white leading-tight line-clamp-2 italic uppercase">
                      {formData.title || 'Series Title'}
                    </div>
                    {/* Progress Bar Preview */}
                    <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                       <div 
                         className="h-full bg-accent transition-all duration-500" 
                         style={{ width: `${Math.min((formData.current_chapter / (parseInt(formData.total_chapters as string) || 1)) * 100, 100)}%` }} 
                       />
                    </div>
                  </div>
                </div>

                {/* Change Cover Hover */}
                <button 
                  type="button"
                  onClick={handlePickImage}
                  className="absolute inset-0 bg-accent/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <Upload size={24} className="text-background" strokeWidth={3} />
                </button>
              </motion.div>
              <button 
                type="button" 
                onClick={handlePickImage}
                className="w-full py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Change Artwork
              </button>
            </div>

            {/* Form Fields Column */}
            <div className="flex-1 space-y-8">
              {/* SECTION: IDENTITY */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-[1px] flex-1 bg-white/5" />
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent opacity-60">Identity</span>
                   <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div>
                  <input 
                    type="text" 
                    autoFocus
                    className={`w-full bg-transparent border-b-2 border-white/5 px-1 py-3 text-2xl font-black italic uppercase tracking-tighter outline-none focus:border-accent transition-all placeholder:text-white/10 ${errors.title ? 'border-red-500/50' : ''}`}
                    placeholder="ENTER SERIES TITLE..."
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                  {errors.title && <p className="text-[9px] font-bold text-red-500 mt-2 ml-1 uppercase tracking-widest">{errors.title}</p>}
                </div>

                <div className="flex gap-4">
                  <CustomSelect 
                    label="Format"
                    icon={Layers}
                    value={formData.format}
                    options={FORMATS}
                    onChange={(val: any) => setFormData(prev => ({ ...prev, format: val }))}
                  />
                  <CustomSelect 
                    label="Pub. Status"
                    icon={Info}
                    value={formData.publishing_status}
                    options={PUB_STATUSES}
                    onChange={(val: any) => setFormData(prev => ({ ...prev, publishing_status: val }))}
                  />
                </div>
              </div>

              {/* SECTION: TRACKING */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                   <div className="h-[1px] flex-1 bg-white/5" />
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent opacity-60">Tracking</span>
                   <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect 
                    label="Reading Status"
                    icon={BookOpen}
                    value={formData.status}
                    options={[
                      { value: 'plan-to-read', label: 'Not Started' },
                      { value: 'reading', label: 'Reading' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'on-hold', label: 'On Hold' },
                      { value: 'dropped', label: 'Dropped' }
                    ]}
                    onChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                  />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
                      <Hash size={10} /> Progress
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="input h-11 bg-white/[0.02] border-white/5 text-center px-1 text-xs font-bold font-mono focus:border-accent/40 transition-all shadow-inner"
                        placeholder="VOL"
                        value={formData.current_chapter}
                        onChange={e => setFormData(prev => ({ ...prev, current_chapter: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="text-white/10 font-black">/</span>
                      <input 
                        type="number" 
                        placeholder="TOTAL"
                        className="input h-11 bg-white/[0.02] border-white/5 text-center px-1 text-xs font-bold font-mono focus:border-accent/40 transition-all shadow-inner"
                        value={formData.total_chapters}
                        onChange={e => setFormData(prev => ({ ...prev, total_chapters: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
                       <Calendar size={10} /> Start Date
                    </label>
                    <input 
                      type="date" 
                      className="input h-11 bg-white/[0.02] border-white/5 focus:border-accent/40"
                      value={formData.date_started}
                      onChange={e => setFormData(prev => ({ ...prev, date_started: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 flex items-center gap-2">
                      <CheckCircle2 size={10} /> Finish Date
                    </label>
                    <input 
                      type="date" 
                      className="input h-11 bg-white/[0.02] border-white/5 focus:border-accent/40"
                      value={formData.date_finished}
                      onChange={e => setFormData(prev => ({ ...prev, date_finished: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-[1px] flex-1 bg-white/5" />
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent opacity-60">Attributes</span>
                   <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="flex flex-wrap gap-2 p-4 bg-white/[0.01] border border-white/5 rounded-2xl shadow-inner">
                  {GENRES.map(genre => {
                    const isSelected = formData.genres.split(',').includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all duration-300 border ${
                          isSelected 
                          ? 'bg-accent border-accent text-background shadow-lg shadow-accent/20 scale-105' 
                          : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {genre}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* COMMIT ACTIONS (Moved inside scrollable content) */}
              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex-1 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 text-text-muted"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary flex-[2] py-4 shadow-2xl shadow-accent/20 group relative overflow-hidden"
                  disabled={isSubmitting}
                >
                  <div className="absolute inset-0 bg-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        Committing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} strokeWidth={3} />
                        {initialData ? 'Save Collection' : 'Add to Vault'}
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
