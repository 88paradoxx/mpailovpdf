
import React, { useState, useRef, useEffect } from 'react';
import { ImageState } from '../../types';
import { loadImage } from '../../services/imageService';
import { saveBackground, getBackgrounds, deleteBackground, StoredBackground } from '../../services/storageService';
import { 
  Sparkles, 
  Download, 
  CheckCircle, 
  Loader2, 
  ShieldCheck, 
  Wand2, 
  Plus, 
  Palette,
  Undo2,
  Trash2,
  History,
  CheckCircle2,
  RefreshCcw,
  ArrowLeft,
  Home
} from 'lucide-react';

interface Props {
  image: ImageState;
  updateImage: (url: string, updates?: Partial<ImageState>, skipHistory?: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  onDownload: () => void;
  onBack?: () => void;
}

const PRESET_BACKGROUNDS = [
  { id: 'studio', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=60&w=400', name: 'Studio' },
  { id: 'minimalist', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=60&w=400', name: 'Minimal' },
  { id: 'office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=60&w=400', name: 'Office' },
  { id: 'marble', url: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&q=60&w=400', name: 'Marble' },
  { id: 'nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=60&w=400', name: 'Nature' },
  { id: 'beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=60&w=400', name: 'Beach' },
  { id: 'mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=60&w=400', name: 'Peak' },
  { id: 'urban', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=60&w=400', name: 'Urban' },
  { id: 'night', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=60&w=400', name: 'City' },
  { id: 'wood', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=60&w=400', name: 'Wood' },
  { id: 'abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=60&w=400', name: 'Abstract' },
  { id: 'clouds', url: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&q=60&w=400', name: 'Sky' },
];

const PRESET_COLORS = ['#ffffff', '#f3f4f6', '#3b82f6', '#ef4444', '#10b981', '#000000', '#6366f1'];

export default function BackgroundRemoverTool({ image, updateImage, setIsProcessing, onDownload, onBack }: Props) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [subjectUrl, setSubjectUrl] = useState<string | null>(null);
  const [activeBg, setActiveBg] = useState<{ type: 'transparent' | 'color' | 'image', value: string }>({ type: 'transparent', value: 'transparent' });
  const [library, setLibrary] = useState<StoredBackground[]>([]);
  const [isBaked, setIsBaked] = useState(false);
  const customBgInputRef = useRef<HTMLInputElement>(null);
  const prevPreviewUrl = useRef<string | null>(null);

  useEffect(() => {
    refreshLibrary();
  }, []);

  const refreshLibrary = async () => {
    const items = await getBackgrounds();
    setLibrary(items);
  };

  const removeBackground = async () => {
    setIsRemoving(true);
    setIsProcessing(true);
    setProgress(0);
    setStatus('Loading Engine');

    try {
      // Dynamic import to keep initial bundle size low
      const imglyModule = await import('@imgly/background-removal');
      // @imgly/background-removal exports removeBackground directly
      const removeBackgroundFn = imglyModule.removeBackground;

      setStatus('AI Analysis');
      const blob = await removeBackgroundFn(image.originalUrl, {
        progress: (key: string, current: number, total: number) => {
          if (key === 'compute') {
            const p = Math.round((current / total) * 100);
            setProgress(p);
            setStatus(`Processing: ${p}%`);
          }
        }
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        setSubjectUrl(url);
        updateImage(url, { format: 'image/png', size: blob.size }, true);
        setStatus('Ready!');
        setProgress(100);
      }
    } catch (err) {
      console.error("Background removal failed:", err);
      alert("Removal failed. The image might be too complex or your device memory is low.");
    } finally {
      setIsRemoving(false);
      setIsProcessing(false);
      setTimeout(() => {
        setStatus(null);
        setProgress(0);
      }, 2000);
    }
  };

  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setActiveBg({ type: 'image', value: url });
      await saveBackground(file, file.name);
      refreshLibrary();
    }
  };

  const removeLibraryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteBackground(id);
    refreshLibrary();
  };

  const composeImage = async (isFinal: boolean = false) => {
    if (!subjectUrl) return null;
    
    try {
      const subjectImg = await loadImage(subjectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = subjectImg.width;
      canvas.height = subjectImg.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      if (activeBg.type === 'color') {
        ctx.fillStyle = activeBg.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (activeBg.type === 'image') {
        const bgImg = await loadImage(activeBg.value);
        const ratio = bgImg.width / bgImg.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawW, drawH, dx, dy;

        if (ratio > canvasRatio) {
          drawH = canvas.height; drawW = drawH * ratio;
          dx = (canvas.width - drawW) / 2; dy = 0;
        } else {
          drawW = canvas.width; drawH = drawW / ratio;
          dx = 0; dy = (canvas.height - drawH) / 2;
        }
        ctx.drawImage(bgImg, dx, dy, drawW, drawH);
      }

      ctx.drawImage(subjectImg, 0, 0);

      const format = activeBg.type === 'transparent' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, format, isFinal ? 0.95 : 0.7));
      return blob ? { blob, format } : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!subjectUrl || isBaked) return;
    let active = true;
    const updatePreview = async () => {
      const result = await composeImage(false);
      if (result && active) {
        const url = URL.createObjectURL(result.blob);
        if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
        prevPreviewUrl.current = url;
        updateImage(url, { size: result.blob.size, format: result.format }, true);
      }
    };
    const timer = setTimeout(updatePreview, 50);
    return () => { active = false; clearTimeout(timer); };
  }, [activeBg, subjectUrl, isBaked]);

  const handleApply = async () => {
    setIsProcessing(true);
    const result = await composeImage(true);
    if (result) {
      const url = URL.createObjectURL(result.blob);
      updateImage(url, { originalUrl: url, size: result.blob.size, format: result.format }, false);
      setIsBaked(true);
    }
    setIsProcessing(false);
  };

  const handleReset = () => {
    setSubjectUrl(null);
    setActiveBg({ type: 'transparent', value: 'transparent' });
    setIsBaked(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111114] text-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 flex flex-col p-3 md:p-4 overflow-y-auto scrollbar-hide space-y-4 md:space-y-5">
        {/* Navigation & Title - Compact */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-fuchsia-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shadow-fuchsia-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[13px] leading-none text-white">Magic Eraser Pro</h3>
                <p className="text-[9px] font-bold uppercase opacity-60 mt-1.5 tracking-widest text-fuchsia-400">AI Composition Studio</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 group mr-2"
            >
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-widest">Back</span>
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 group ml-2"
            >
              <Home size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 md:space-y-4 scrollbar-hide">
        {isBaked ? (
          <div className="glass-surface-soft p-4 md:p-6 rounded-[24px] md:rounded-[28px] text-center space-y-3 md:space-y-4 animate-in zoom-in-95 duration-500">
             <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={28} className="md:size-10" />
             </div>
             <div className="space-y-1">
               <h4 className="text-[11px] md:text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest">Image Ready!</h4>
               <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-2 md:px-4">Your background removal and composition has been committed to the project.</p>
             </div>
                 <button 
                  onClick={handleReset}
                  className="w-full py-2.5 md:py-3 glass-button-secondary text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                 >
               <RefreshCcw size={10} className="md:size-3.5" /> Start New Removal
             </button>
          </div>
        ) : !subjectUrl ? (
          <div className="glass-surface-soft p-3.5 md:p-5 rounded-[24px] md:rounded-[28px] space-y-4 md:space-y-5">
            <div className="text-center space-y-2 md:space-y-3 py-3 md:py-6">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded-[18px] md:rounded-[24px] flex items-center justify-center mx-auto border border-fuchsia-100 dark:border-fuchsia-900/30">
                 {isRemoving ? <Loader2 size={20} className="text-fuchsia-600 animate-spin md:size-8" /> : <Wand2 size={20} className="text-fuchsia-600 md:size-8" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-[8px] md:text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">Remove Background</h4>
                <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase leading-relaxed max-w-[160px] md:max-w-[200px] mx-auto">
                  Automatically isolate your subject using local AI processing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4 animate-in slide-in-from-top-4 duration-500">
            <div className="glass-surface-soft p-2.5 md:p-3 rounded-2xl md:rounded-3xl space-y-3 md:space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 md:gap-2">
                   <History size={12} className="text-slate-400 md:size-3" />
                   <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Backdrop Library</span>
                </div>
                <button onClick={handleReset} className="text-[8px] md:text-[9px] text-fuchsia-600 font-black uppercase flex items-center gap-1 hover:underline">
                  <Undo2 size={10} className="md:size-2.5"/> Reset AI
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 md:gap-2.5">
                <button 
                  onClick={() => setActiveBg({ type: 'transparent', value: 'transparent' })}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${activeBg.type === 'transparent' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-fuchsia-200'}`}
                >
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-md" />
                  <span className="text-[6px] md:text-[7px] font-black uppercase text-slate-400">PNG</span>
                </button>

                {PRESET_BACKGROUNDS.map(bg => (
                  <button 
                    key={bg.id}
                    onClick={() => setActiveBg({ type: 'image', value: bg.url })}
                    className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${activeBg.value === bg.url ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20' : 'border-transparent'}`}
                  >
                    <img src={bg.url} className="w-full h-full object-cover" alt={bg.name} />
                  </button>
                ))}

                {library.slice(0, 3).map(item => {
                  const url = URL.createObjectURL(item.blob);
                  return (
                    <button 
                      key={item.id}
                      onClick={() => setActiveBg({ type: 'image', value: url })}
                      className={`relative group aspect-square rounded-xl border-2 overflow-hidden transition-all ${activeBg.value === url ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20' : 'border-transparent'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="Stored" />
                      <button 
                        onClick={(e) => removeLibraryItem(item.id, e)}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </button>
                  );
                })}

                <button 
                  onClick={() => customBgInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/20 transition-all"
                >
                  <Plus size={16} className="text-slate-400 md:size-[18px]" />
                  <span className="text-[7px] md:text-[8px] font-black uppercase text-slate-400">Add</span>
                </button>
                <input type="file" ref={customBgInputRef} onChange={handleCustomBgUpload} className="hidden" accept="image/*" />
              </div>

              <div className="pt-2 md:pt-2.5 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-2.5 px-1">
                  <Palette size={12} className="text-slate-400 md:size-3" />
                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Solid Environment</span>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-2.5">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setActiveBg({ type: 'color', value: c })}
                      className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 transition-all ${activeBg.value === c ? 'border-fuchsia-500 scale-110 shadow-lg' : 'border-slate-100 dark:border-slate-700'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
                    <input 
                      type="color" 
                      onChange={(e) => setActiveBg({ type: 'color', value: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer scale-150" 
                    />
                    <Plus size={10} className="text-slate-400 md:size-2.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={handleApply}
                className="glass-button-primary text-white py-3 md:py-3.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} className="md:size-3.5" /> Commit
              </button>
              <button 
                onClick={onDownload}
                className="glass-button-secondary text-white dark:text-slate-100 py-3 md:py-3.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} className="md:size-3.5" /> Export
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className="bg-fuchsia-600/10 border border-fuchsia-500/30 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xl animate-in zoom-in-95 space-y-2.5 md:space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <span className="text-[8px] md:text-[9px] font-black uppercase text-fuchsia-500 tracking-[0.2em]">{status}</span>
              {progress > 0 && <span className="text-[9px] md:text-[10px] font-black text-fuchsia-500">{progress}%</span>}
            </div>
            <div className="w-full h-1 md:h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
               <div 
                 className={`h-full bg-fuchsia-500 transition-all duration-300 rounded-full ${!progress ? 'w-1/3 animate-shimmer-progress' : ''}`} 
                 style={progress ? { width: `${progress}%` } : {}} 
               />
            </div>
          </div>
        )}

        <div className="glass-surface-soft border border-blue-500/30 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-start gap-2.5 md:gap-3">
           <ShieldCheck className="text-blue-600 shrink-0 mt-0.5 md:size-4" size={14} />
           <p className="text-[8px] md:text-[9px] font-bold text-blue-900 dark:text-blue-300 uppercase leading-relaxed tracking-tight">
             Privacy Guarantee: Your images never leave your device. All processing is 100% local.
           </p>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        {isBaked ? (
          <button 
            onClick={onDownload} 
            className="col-span-2 glass-button-primary text-white dark:text-slate-100 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Download size={16} className="md:size-5" /> DOWNLOAD NOW
          </button>
        ) : !subjectUrl ? (
          <button 
            onClick={removeBackground} 
            disabled={isRemoving}
            className="col-span-2 glass-button-primary text-white py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
          >
            {isRemoving ? <Loader2 size={14} className="md:size-[18px] animate-spin" /> : <Sparkles size={14} className="md:size-[18px]" />}
            {isRemoving ? 'ERASING...' : 'REMOVE BACKGROUND'}
          </button>
        ) : (
          <>
            <button 
              onClick={handleApply} 
              className="glass-button-primary text-white py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle size={14} className="md:size-[18px]" /> BAKE IMAGE
            </button>
            <button 
              onClick={onDownload} 
              className="glass-button-secondary text-white dark:text-slate-100 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Download size={14} className="md:size-[18px]" /> EXPORT
            </button>
          </>
        )}
      </div>
    </div>
  );
}

