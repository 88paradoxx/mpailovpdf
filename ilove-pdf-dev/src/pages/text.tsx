import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import TextTool from '../components/tools/TextTool';
import { ImageState, TextLayer } from '../types';

function TextPage() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layers, setLayers] = useState<TextLayer[]>([]);

  useEffect(() => {
    const input = document.getElementById('static-image-upload') as HTMLInputElement;
    const section = document.getElementById('static-upload-section');

    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      const f = t.files?.[0];
      if (!f) return;

      const isImage = f.type.startsWith('image/');
      if (!isImage) { alert('Please select an image'); return; }
      if (f.size > 50 * 1024 * 1024) { alert('Max 50MB'); return; }

      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const initial: ImageState = {
          originalUrl: url,
          currentUrl: url,
          width: img.width,
          height: img.height,
          format: f.type,
          size: f.size,
          name: f.name
        };
        setImage(initial);
        if (section) section.style.display = 'none';
      };
      img.src = url;
    };

    input?.addEventListener('change', onChange);
    return () => input?.removeEventListener('change', onChange);
  }, []);

  const updateImage = (url: string, updates?: Partial<ImageState>) => {
    setImage(prev => prev ? { ...prev, currentUrl: url, ...updates } : null);
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.currentUrl;
    link.download = `text-overlay-${image.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!image) return null;

  return (
    <div className="w-full h-screen bg-[#111114] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="flex w-48 md:w-64 lg:w-80 h-full bg-[#111114] border-r border-white/5 overflow-hidden shrink-0 transition-all duration-300 z-[70]">
          <TextTool
            image={image}
            layers={layers}
            setLayers={setLayers}
            onDownload={handleDownload}
            onBack={() => {
              const section = document.getElementById('static-upload-section');
              if (section) section.style.display = 'block';
              setImage(null);
            }}
          />
        </aside>

        {/* Main Preview Area */}
        <div className="flex-1 relative bg-[#0f1012] flex-col items-center justify-center p-4 md:p-8 overflow-hidden z-[50]">
          <div className="relative max-w-full max-h-full">
            <img
              src={image.currentUrl}
              alt="Preview"
              className="max-w-full max-h-[calc(100vh-120px)] object-contain shadow-2xl rounded-lg"
            />
          </div>
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center pointer-events-none z-50">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-white">Processing</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<TextPage />);
}
