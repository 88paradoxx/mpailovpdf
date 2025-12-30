import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import EditTool from '../components/tools/EditTool';
import CropOverlay from '../components/CropOverlay';
import { ImageState } from '../types';
import { retrieveFile, clearFile } from '../services/fileHandoff';

function ImageEditorPage() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropState, setCropState] = useState({ x: 10, y: 10, w: 80, h: 80 });



  useEffect(() => {
    const initFile = async () => {
      try {
        const f = await retrieveFile();
        if (f) {
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
            const section = document.getElementById('static-upload-section');
            if (section) section.style.display = 'none';
            clearFile();
          };
          img.src = url;
        }
      } catch (e) {
        console.error("Failed to retrieve file", e);
      }
    };
    initFile();
  }, []);

  useEffect(() => {
    const input = document.getElementById('static-image-upload') as HTMLInputElement;
    const section = document.getElementById('static-upload-section');

    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      const f = t.files?.[0];
      if (!f) return;

      const isImage = f.type.startsWith('image/');
      if (!isImage) { alert('Please select an image'); return; }
      if (f.size > 100 * 1024 * 1024) { alert('Max 100MB'); return; }

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
    link.download = `edited-${image.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!image) return null;

  return (
    <div className="w-full h-screen bg-[#0d0d12] flex flex-col">
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="flex w-48 md:w-64 lg:w-80 h-full bg-[#0d0d12] border-r border-white/5 overflow-hidden shrink-0 transition-all duration-300 z-[70]">
          <EditTool
            image={image}
            updateImage={updateImage}
            setIsProcessing={setIsProcessing}
            cropState={cropState}
            setCropState={setCropState}
            onCropModeToggle={setIsCropMode}
            onDownload={handleDownload}
            onBack={() => {
              const section = document.getElementById('static-upload-section');
              if (section) section.style.display = 'block';
              setImage(null);
            }}
          />
        </aside>

        {/* Main Preview Area */}
        <div className="flex flex-1 relative bg-[#08080c] flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
          <div className="relative max-w-full max-h-full">
            <img
              src={image.currentUrl}
              alt="Preview"
              className="max-w-full max-h-[calc(100vh-120px)] object-contain shadow-2xl rounded-lg"
            />
            {isCropMode && (
              <CropOverlay crop={cropState} setCrop={setCropState} />
            )}
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

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ImageEditorPage />
    </React.StrictMode>
  );
}


