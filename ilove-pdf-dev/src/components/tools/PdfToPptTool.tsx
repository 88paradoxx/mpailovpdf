import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageState } from '../../types';

import { 
  Presentation, 
  Type,
  Image as ImageIcon,
  Plus, 
  Download, 
  Loader2, 
  X, 
  FileCheck, 
  Search, 
  Check, 
  Trash2, 
  Zap, 
  ShieldCheck,
  FileText,
  Layout,
  ArrowLeft,
  Home
} from 'lucide-react';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

interface Props {
  image: ImageState;
  setIsProcessing: (v: boolean) => void;
  setLivePreview?: (node: React.ReactNode) => void;
  file?: File | null;
  onBack?: () => void;
}

interface PdfSlide {
  id: string;
  originalIndex: number;
  thumbnail: string;
}

interface Theme {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

const THEMES: Theme[] = [
  { id: 'standard', name: 'Standard', bgColor: '#ffffff', textColor: '#000000', accentColor: '#ea580c' },
  { id: 'dark', name: 'Midnight', bgColor: '#1e293b', textColor: '#f8fafc', accentColor: '#38bdf8' },
  { id: 'royal', name: 'Royal', bgColor: '#4c1d95', textColor: '#f5f3ff', accentColor: '#fcd34d' },
  { id: 'minimal', name: 'Minimal Grey', bgColor: '#f1f5f9', textColor: '#334155', accentColor: '#475569' },
  { id: 'vibrant', name: 'Vibrant', bgColor: '#fdf2f8', textColor: '#831843', accentColor: '#db2777' }
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function PdfToPptTool({ image, setIsProcessing, setLivePreview, file, onBack }: Props) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [presentationTitle, setPresentationTitle] = useState('My Presentation');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [isConverting, setIsConverting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(!!file);
  const [progress, setProgress] = useState(0);
  const [slides, setSlides] = useState<PdfSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [hasProcessedPropFile, setHasProcessedPropFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidate Live Preview
  useEffect(() => {
    if (!setLivePreview) return;

    if (slides.length === 0) {
      setLivePreview(
        <div className="w-full h-full bg-[#0d0d12] flex flex-col items-center justify-center text-slate-600">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/5 animate-pulse">
            <Presentation size={32} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting PDF Source</p>
        </div>
      );
      return;
    }

    if (isAnalyzing) {
      setLivePreview(
        <div className="w-full h-full bg-[#0d0d12] flex flex-col items-center justify-center text-orange-500">
          <div className="relative mb-6">
            <Loader2 size={48} className="animate-spin opacity-20" />
            <Search size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Analyzing Document</p>
        </div>
      );
      return;
    }

    setLivePreview(
      <div className="w-full h-full bg-[#0d0d12] overflow-y-auto p-4 md:p-12 scrollbar-hide flex flex-col items-center gap-12">
        <div className="w-full max-w-3xl space-y-12">
          <div className="flex flex-col gap-12">
            {slides.map((slide, idx) => (
              <div 
                  key={slide.id} 
                  className={`group relative w-full aspect-[16/9] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-500 border transition-all hover:scale-[1.01] ${
                    currentSlideIndex === idx ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-white/5'
                  }`}
                  style={{ 
                    animationDelay: `${idx * 100}ms`,
                    backgroundColor: selectedTheme.bgColor 
                  }}
                  onClick={() => setCurrentSlideIndex(idx)}
                >
                  <div className="absolute top-6 left-6 z-20 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black rounded-lg uppercase tracking-widest border border-white/10 shadow-xl">
                    Slide {idx + 1}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlide(slide.id);
                    }}
                    className="absolute top-6 right-6 z-20 w-8 h-8 bg-red-500/80 hover:bg-red-500 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    title="Remove Slide"
                  >
                    <X size={14} />
                  </button>
                  <img 
                    src={slide.thumbnail} 
                    className="w-full h-full object-contain select-none" 
                    alt={`Slide ${idx + 1}`} 
                    draggable={false} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            ))}
          </div>
          <div className="h-20 shrink-0" />
        </div>
      </div>
    );
  }, [slides, isAnalyzing, selectedTheme, currentSlideIndex, setLivePreview]);

  const analyzePdf = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setIsProcessing(true);
    setPresentationTitle(file.name.replace(/\.pdf$/i, ''));
    setProgress(0);
    
    try {
      const pdfjsModule = await import('pdfjs-dist');
      const pdfjsLib = pdfjsModule.default || pdfjsModule;
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.449/cmaps/',
        cMapPacked: true,
      });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      const newSlides: PdfSlide[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (context) {
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          newSlides.push({
            id: `slide-${i}-${Date.now()}`,
            originalIndex: i,
            thumbnail: canvas.toDataURL('image/jpeg', 0.5)
          });
        }
        setProgress(Math.round((i / numPages) * 100));
      }
      
      setSlides(newSlides);
      setPdfFiles(prev => [...prev, file]);
      setCurrentFileIndex(pdfFiles.length);
      
      await pdfDoc.destroy();
    } catch (err) {
      console.error("PDF analysis failed:", err);
      alert("Failed to analyze PDF. Check for encryption.");
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
      setProgress(0);
    }
  }, [pdfFiles.length, setIsProcessing]);

  useEffect(() => {
    if (file && !hasProcessedPropFile) {
      setHasProcessedPropFile(true);
      analyzePdf(file);
    }
  }, [file, analyzePdf, hasProcessedPropFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      analyzePdf(selectedFile);
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Adjust current slide index if necessary
      if (currentSlideIndex >= filtered.length && filtered.length > 0) {
        setCurrentSlideIndex(filtered.length - 1);
      }
      return filtered;
    });
  };

  const handleDownload = async () => {
    if (slides.length === 0) return;
    
    setIsConverting(true);
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const { default: pptxgen } = await import('pptxgenjs');
      const pres = new pptxgen();
      
      pres.title = presentationTitle;
      
      slides.forEach((slide, index) => {
        const pptSlide = pres.addSlide();
        pptSlide.background = { fill: selectedTheme.bgColor };
        
        // Add image to slide
        pptSlide.addImage({
          data: slide.thumbnail,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%'
        });
        
        setProgress(Math.round(((index + 1) / slides.length) * 100));
      });
      
      await pres.writeFile({ fileName: `${presentationTitle}.pptx` });
    } catch (err) {
      console.error("PPT generation failed:", err);
      alert("Failed to generate PowerPoint file.");
    } finally {
      setIsConverting(false);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0d12] text-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 flex flex-col p-3 md:p-4 overflow-y-auto scrollbar-hide space-y-4 md:space-y-5">
        {/* Navigation & Title - Compact */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shadow-orange-600/20">
                <Presentation size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[13px] leading-none text-white">PDF to PPT</h3>
                <p className="text-[9px] font-bold uppercase opacity-60 mt-1.5 tracking-widest text-orange-400">Presentation Pro</p>
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
          
          {slides.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSlides([]);
                  setPdfFiles([]);
                  setCurrentFileIndex(0);
                  setCurrentSlideIndex(0);
                  setIsAnalyzing(false);
                  setIsProcessing(false);
                  setProgress(0);
                  setHasProcessedPropFile(true); // Prevent re-triggering from prop
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                className="flex-[3] py-2.5 px-4 rounded-xl bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 transition-all border border-orange-500/10 flex items-center justify-center gap-2 group"
              >
                <Plus size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Upload New PDF</span>
              </button>
              <button 
                onClick={() => {
                  setSlides([]);
                  setPdfFiles([]);
                  setCurrentFileIndex(0);
                  setCurrentSlideIndex(0);
                  setIsAnalyzing(false);
                  setIsProcessing(false);
                  setProgress(0);
                  setHasProcessedPropFile(true); // Prevent re-triggering from prop
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/10 flex items-center justify-center gap-2 group"
                title="Clear All"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* PDF Upload Area */}
        {slides.length === 0 && !isAnalyzing && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[32px] bg-white/[0.02] hover:bg-white/[0.05] hover:border-orange-500/30 transition-all cursor-pointer group min-h-[300px] my-4"
          >
            <div className="w-20 h-20 bg-orange-600/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 border border-orange-500/20">
              <Plus size={32} className="text-orange-500" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-2">Upload PDF File</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select a document to convert</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileChange} 
            />
          </div>
        )}

        {/* Loading/Analysis State */}
        {isAnalyzing && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
              <Loader2 size={48} className="text-orange-500 animate-spin relative z-10" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-4">Analyzing Document</h4>
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <span className="text-[9px] font-black text-orange-500 mt-3 tracking-widest">{progress}%</span>
          </div>
        )}

        {/* Theme Selection */}
        {slides.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Select Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className={`p-3 rounded-xl border transition-all text-left space-y-2 group ${
                    selectedTheme.id === theme.id 
                      ? 'bg-white/10 border-orange-500/50 shadow-lg shadow-orange-500/10' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-full h-8 rounded-md mb-2 overflow-hidden border border-white/10 flex">
                    <div className="w-2/3 h-full" style={{ backgroundColor: theme.bgColor }} />
                    <div className="w-1/3 h-full" style={{ backgroundColor: theme.accentColor }} />
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-wider">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slides List */}
        {slides.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Presentation Slides ({slides.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {slides.map((slide, index) => (
                <div 
                  key={slide.id} 
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`relative aspect-[16/9] rounded-lg border overflow-hidden group cursor-pointer transition-all ${
                    currentSlideIndex === index 
                      ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg' 
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <img src={slide.thumbnail} alt={`Slide ${index + 1}`} className={`w-full h-full object-cover transition-opacity ${currentSlideIndex === index ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                  <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${currentSlideIndex === index ? 'bg-orange-500 text-white' : 'bg-black/60 text-white/60'}`}>
                    {index + 1}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlide(slide.id);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Slide"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleDownload}
            disabled={isConverting || slides.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 group"
          >
            {isConverting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest">Converting {progress}%</span>
              </>
            ) : (
              <>
                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest">Download PPTX</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

