import React, { useState } from 'react';
import { ImageState } from '../../types';
import { loadImage } from '../../services/imageService';
import { CheckCircle, Download, RefreshCcw, ArrowLeft, Home } from 'lucide-react';

interface Props {
  image: ImageState;
  updateImage: (url: string, updates?: Partial<ImageState>, skipHistory?: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  onDownload: () => void;
  onBack?: () => void;
}

export default function ConverterTool({ image, updateImage, setIsProcessing, onDownload, onBack }: Props) {
  const [targetMime, setTargetMime] = useState(image.format);
  const formats = [{ label: 'JPEG', val: 'image/jpeg' }, { label: 'PNG', val: 'image/png' }, { label: 'WebP', val: 'image/webp' }];

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const img = await loadImage(image.currentUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (targetMime === 'image/jpeg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, targetMime, 0.95));
        if (blob) {
          const url = URL.createObjectURL(blob);
          updateImage(url, { format: targetMime, size: blob.size, originalUrl: url });
        }
      }
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111114] text-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 flex flex-col p-3 md:p-4 overflow-y-auto scrollbar-hide space-y-4 md:space-y-5">
        {/* Navigation & Title - Compact */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shadow-amber-500/20">
                <RefreshCcw size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[13px] leading-none text-white">Image Converter</h3>
                <p className="text-[9px] font-bold uppercase opacity-60 mt-1.5 tracking-widest text-amber-400">Conversion Suite</p>
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

        <div className="glass-surface-soft p-3 md:p-4 rounded-2xl space-y-2 flex-1 overflow-y-auto">
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 md:mb-1.5">Target Encoding</p>
        <div className="space-y-1.5 md:space-y-2">
          {formats.map(f => (
            <button key={f.val} onClick={() => setTargetMime(f.val)} className={`w-full flex items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all ${targetMime === f.val ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-200'}`}>
              <span className="text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-300">{f.label}</span>
              {targetMime === f.val && <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />}
            </button>
          ))}
        </div>
      </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <button onClick={handleApply} className="glass-button-primary text-white py-3 md:py-3.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
          <CheckCircle size={14} className="md:size-3.5" /> Apply
        </button>
        <button onClick={onDownload} className="glass-button-secondary text-white dark:text-slate-100 py-3 md:py-3.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
          <Download size={14} className="md:size-3.5" /> Export
        </button>
      </div>
    </div>
  );
}

