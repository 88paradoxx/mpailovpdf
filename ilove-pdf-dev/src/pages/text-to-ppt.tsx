import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import TextToPptTool from '../components/tools/TextToPptTool';

function TextToPptPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [livePreview, setLivePreview] = useState<React.ReactNode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    const startBtn = document.getElementById('start-creating-btn');
    const section = document.getElementById('static-upload-section');
    const onStart = () => {
      setIsStarted(true);
      if (section) section.style.display = 'none';
    };
    startBtn?.addEventListener('click', onStart);
    return () => startBtn?.removeEventListener('click', onStart);
  }, []);

  if (!isStarted) return null;

  return (
    <div className="w-full h-screen bg-[#0d0d12] flex flex-col overflow-hidden">
      <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Controls */}
        <aside className={`
          ${mobileView === 'editor' ? 'flex' : 'hidden'} 
          md:flex w-full md:w-72 lg:w-80 h-full bg-[#0d0d12] border-r border-white/5 overflow-hidden shrink-0 transition-all duration-500 z-30
        `}>
          <TextToPptTool 
            setIsProcessing={setIsProcessing} 
            setLivePreview={setLivePreview}
            onBack={() => {
              const section = document.getElementById('static-upload-section');
              if (section) section.style.display = 'block';
              setIsStarted(false);
            }}
          />
        </aside>

        {/* Mobile Toggle */}
        {!isProcessing && (
          <div className="md:hidden fixed bottom-1 left-1/2 -translate-x-1/2 z-[100] flex bg-black/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <button
              onClick={() => setMobileView('editor')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mobileView === 'editor' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setMobileView('preview')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mobileView === 'preview' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'
              }`}
            >
              Preview
            </button>
          </div>
        )}

        {/* Main Preview Area */}
        <main className={`
          ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}
          flex-1 relative bg-[#08080c] flex flex-col overflow-hidden
        `}>
          {livePreview}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center pointer-events-none z-50">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-white">Generating PPTX</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <TextToPptPage />
    </React.StrictMode>
  );
}


