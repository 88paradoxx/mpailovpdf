import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Type, Hand, Minus, Plus, Undo, X,
  FileEdit, ChevronDown, ChevronUp, Download, Save, Check,
  Bold, Italic, Home
} from 'lucide-react';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { applyNativeEdits } from '../../services/pdfEditorService';
import { NativeTextEdit, NativeTextItem, DrawingSettings, TextLayer, PdfPage } from '../../types';


// --- Components ---

// --- Components ---

const InlineTextEditor = ({
  initialValue,
  onSave,
  onCancel,
  style,
  initialColor,
  initialBackgroundColor,
  initialFontSize,
  initialFontFamily,
  initialFontWeight,
  initialFontStyle,
  allowedTabs = ['text', 'bg', 'font']
}: {
  initialValue: string,
  onSave: (text: string, color?: string, bg?: string, size?: number, family?: string, weight?: string, fontStyle?: string) => void,
  onCancel: () => void,
  style: React.CSSProperties,
  initialColor?: string,
  initialBackgroundColor?: string,
  initialFontSize?: number,
  initialFontFamily?: string,
  initialFontWeight?: string,
  initialFontStyle?: string,
  allowedTabs?: ('text' | 'bg' | 'font')[]
}) => {
  const [text, setText] = useState(initialValue);
  const [color, setColor] = useState(initialColor || '#000000');
  const [bgColor, setBgColor] = useState(initialBackgroundColor || 'transparent');
  const [fontSize, setFontSize] = useState(initialFontSize || 16);
  const [fontFamily, setFontFamily] = useState(initialFontFamily || 'sans-serif');
  const [fontWeight, setFontWeight] = useState(initialFontWeight || 'normal');
  const [fontStyle, setFontStyle] = useState(initialFontStyle || 'normal');
  const [mode, setMode] = useState<'text' | 'bg' | 'font'>(allowedTabs[0] || 'text');

  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!allowedTabs.includes(mode)) {
      setMode(allowedTabs[0] || 'text');
    }
    // Focus and select contents
    if (divRef.current) {
      divRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(divRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [allowedTabs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(divRef.current?.innerText || text, color, bgColor, fontSize, fontFamily, fontWeight, fontStyle);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const colors = [
    '#000000', '#ffffff', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', 'transparent'
  ];

  const fonts = [
    { name: 'Sans', val: 'sans-serif' },
    { name: 'Serif', val: 'serif' },
    { name: 'Mono', val: 'monospace' },
    { name: 'Cursive', val: 'cursive' }
  ];

  return (
    <div className="absolute z-50 text-xs" style={{ left: style.left, top: style.top }}>
      {/* Toolbar */}
      <div
        className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl w-48 text-white"
        onMouseDown={e => e.preventDefault()}
      >
        <div className="flex gap-1 border-b border-white/10 pb-2">
          {allowedTabs.includes('text') && <button onClick={() => setMode('text')} className={`flex-1 py-1 rounded ${mode === 'text' ? 'bg-purple-600' : 'hover:bg-white/10'}`}>Color</button>}
          {allowedTabs.includes('bg') && <button onClick={() => setMode('bg')} className={`flex-1 py-1 rounded ${mode === 'bg' ? 'bg-purple-600' : 'hover:bg-white/10'}`}>Bg</button>}
          {allowedTabs.includes('font') && <button onClick={() => setMode('font')} className={`flex-1 py-1 rounded ${mode === 'font' ? 'bg-purple-600' : 'hover:bg-white/10'}`}>Font</button>}
        </div>

        <div className="py-1">
          {mode === 'text' && allowedTabs.includes('text') && (
            <div className="flex gap-1 flex-wrap">
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border border-white/20 ${color === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }} />
              ))}
            </div>
          )}
          {mode === 'bg' && allowedTabs.includes('bg') && (
            <div className="flex gap-1 flex-wrap">
              {colors.map(c => (
                <button key={c} onClick={() => setBgColor(c)} className={`w-5 h-5 rounded-full border border-white/20 ${bgColor === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }} />
              ))}
            </div>
          )}
          {mode === 'font' && allowedTabs.includes('font') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button onClick={() => setFontSize(s => Math.max(8, s - 2))} className="p-1 hover:bg-white/10 rounded"><Minus size={12} /></button>
                <span className="font-mono">{fontSize}px</span>
                <button onClick={() => setFontSize(s => Math.min(72, s + 2))} className="p-1 hover:bg-white/10 rounded"><Plus size={12} /></button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setFontWeight(prev => prev === 'bold' ? 'normal' : 'bold')}
                  className={`flex-1 py-1 rounded flex items-center justify-center border border-white/10 ${fontWeight === 'bold' ? 'bg-purple-600' : 'hover:bg-white/10'}`}
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => setFontStyle(prev => prev === 'italic' ? 'normal' : 'italic')}
                  className={`flex-1 py-1 rounded flex items-center justify-center border border-white/10 ${fontStyle === 'italic' ? 'bg-purple-600' : 'hover:bg-white/10'}`}
                >
                  <Italic size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {fonts.map(f => (
                  <button key={f.val} onClick={() => setFontFamily(f.val)} className={`px-2 py-1 rounded text-left ${fontFamily === f.val ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t border-white/10 mt-1">
          <button onMouseDown={onCancel} className="text-white/50 hover:text-white"><X size={14} /></button>
          <button onMouseDown={() => onSave(divRef.current?.innerText || text, color, bgColor, fontSize, fontFamily, fontWeight, fontStyle)} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
        </div>
      </div>

      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setText(e.currentTarget.innerText)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(divRef.current?.innerText || text, color, bgColor, fontSize, fontFamily, fontWeight, fontStyle)}
        className="outline-none overflow-hidden selection:bg-purple-500/30 whitespace-pre-wrap word-break-all"
        style={{
          ...style,
          left: 0, top: 0,
          background: bgColor,
          boxShadow: '0 0 0 1px #8b5cf6',
          borderRadius: '2px',
          color: color,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          fontStyle: fontStyle,
          minWidth: style.minWidth || style.width || '100px',
          width: 'auto',
          height: 'auto',
          minHeight: style.minHeight || '1.2em',
          lineHeight: '1.2',
          display: 'inline-block'
        }}
      >
        {initialValue}
      </div>
    </div>
  );
};


// --- Types ---
interface Viewport { x: number; y: number; scale: number; }

const PdfPageRenderer = ({
  page,
  pdfDoc,
  scale,
  textLayers,
  nativeTextItems,
  nativeEdits,
  onTextAction,
  editingId,
  onSaveEdit,
  onCancelEdit,
  tool
}: {
  page: PdfPage,
  pdfDoc: any,
  scale: number,
  textLayers: TextLayer[],
  nativeTextItems: NativeTextItem[],
  nativeEdits: Record<string, NativeTextEdit>,
  onTextAction: (action: string, id: string | null, extra?: any) => void,
  editingId: string | null,
  onSaveEdit: (val: string, color?: string, bg?: string, size?: number, family?: string, weight?: string, fontStyle?: string) => void,
  onCancelEdit: () => void,
  tool: string
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const p = await pdfDoc.getPage(page.index + 1);
        const viewport = p.getViewport({ scale: scale * 2 }); // Render at 2x quality
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await p.render({ canvasContext: ctx, viewport }).promise;
            if (active) setLoaded(true);
          }
        }
      } catch (err) { console.error(err); }
    };
    render();
    return () => { active = false; };
  }, [pdfDoc, page.index, scale]);

  const canEdit = tool === 'edit';

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const getBackgroundColor = (x: number, y: number, w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return '#ffffff';
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#ffffff';

    const s = scale * 2;
    // Sample a small region just outside the top-left to avoid text anti-aliasing
    const rx = Math.max(0, Math.floor(x * s) - 4);
    const ry = Math.max(0, Math.floor((page.height - y - h) * s) - 4);

    try {
      const data = ctx.getImageData(rx, ry, 3, 3).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          count++;
        }
      }
      if (count === 0) return '#ffffff';
      return rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count));
    } catch (e) {
      return '#ffffff';
    }
  };

  const getTextColor = (x: number, y: number, w: number, h: number, bgHex: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return '#000000';
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#000000';

    const s = scale * 2;
    // Sample the entire bounding box to find the actual text color
    const rx = Math.max(0, Math.floor(x * s));
    const ry = Math.max(0, Math.floor((page.height - y - h) * s));
    const rw = Math.max(1, Math.floor(w * s));
    const rh = Math.max(1, Math.floor(h * s));

    try {
      // Limit size to avoid performance issues on large blocks, but cover typical text
      const data = ctx.getImageData(rx, ry, Math.min(rw, 100), Math.min(rh, 50)).data;

      const bgR = parseInt(bgHex.slice(1, 3), 16);
      const bgG = parseInt(bgHex.slice(3, 5), 16);
      const bgB = parseInt(bgHex.slice(5, 7), 16);

      let bestColor = (bgR + bgG + bgB) / 3 > 128 ? '#000000' : '#ffffff';
      let maxDiff = -1;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // Skip semi-transparent pixels
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Weighted contrast for better perceptual matching
        const diff = (Math.abs(r - bgR) * 0.299) + (Math.abs(g - bgG) * 0.587) + (Math.abs(b - bgB) * 0.114);
        if (diff > maxDiff) {
          maxDiff = diff;
          bestColor = rgbToHex(r, g, b);
        }
      }

      return bestColor;
    } catch (e) {
      return '#000000';
    }
  };

  return (
    <div
      data-page-index={page.index}
      className="relative bg-white shadow-2xl mb-8 select-none origin-top-left"
      style={{
        width: page.width * scale,
        height: page.height * scale,
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Native Text Overlays */}
      <div className={`absolute inset-0 ${canEdit ? 'z-40' : 'z-10 pointer-events-none'}`}>
        {nativeTextItems.map(item => {
          const edit = nativeEdits[item.id];
          const isEdited = !!edit;
          const isEditing = editingId === item.id;

          const fontSize = edit?.fontSize || item.h || 12;

          let fontFam = 'sans-serif';
          let weight = edit?.fontWeight || 'normal';
          let style_val = edit?.fontStyle || 'normal';

          if (edit?.fontFamily) {
            fontFam = edit.fontFamily;
          } else if (item.fontName) {
            const low = item.fontName.toLowerCase();
            if (low.includes('serif') || low.includes('times')) fontFam = 'serif';
            else if (low.includes('mono') || low.includes('courier')) fontFam = 'monospace';

            if (!edit) {
              if (low.includes('bold') || low.includes('700')) weight = 'bold';
              if (low.includes('italic') || low.includes('oblique')) style_val = 'italic';
            }
          }

          if (isEditing) {
            // Auto detect bg if not set
            const autoBg = edit?.backgroundColor || getBackgroundColor(item.x, item.y, item.w, item.h);
            // Auto detect text color if not set
            const autoColor = edit?.color || getTextColor(item.x, item.y, item.w, item.h, autoBg);

            return (
              <InlineTextEditor
                key={item.id}
                initialValue={edit?.text || item.str || ''}
                initialColor={autoColor}
                initialBackgroundColor={autoBg}
                initialFontSize={fontSize * scale}
                initialFontFamily={fontFam}
                initialFontWeight={weight}
                initialFontStyle={style_val}
                allowedTabs={['text', 'font']}
                onSave={(val, c, bg, sz, fam, w, s) => {
                  if (!isEdited && val === item.str && c === autoColor && w === weight && s === style_val) {
                    onCancelEdit();
                  } else {
                    onSaveEdit(val, c, autoBg, sz, fam, w, s);
                  }
                }}
                onCancel={onCancelEdit}
                style={{
                  left: item.x * scale,
                  top: (page.height - item.y - item.h) * scale,
                  minWidth: item.w * scale,
                  minHeight: item.h * scale,
                  width: 'auto',
                  height: 'auto',
                }}
              />
            );
          }

          return (
            <div
              key={item.id}
              className={`absolute cursor-text transition-colors pointer-events-auto flex items-center whitespace-pre
                  ${isEdited ? 'z-20' : `z-10 ${canEdit ? 'hover:bg-purple-500/10' : ''}`}
               `}
              style={{
                left: item.x * scale,
                top: (page.height - item.y - item.h) * scale,
                width: item.w * scale,
                height: item.h * scale * 1.3,
                fontSize: `${fontSize * scale}px`,
                lineHeight: 1,
                color: isEdited ? (edit.color || '#000000') : 'transparent',
                backgroundColor: isEdited ? (edit.backgroundColor || '#ffffff') : 'transparent',
                fontFamily: fontFam,
                fontWeight: weight,
                fontStyle: style_val
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) onTextAction('editNative', item.id, item);
              }}
            >
              {isEdited ? edit?.text : ''}
            </div>
          );
        })}
      </div>

      {/* Added User Text Layers */}
      <div className={`absolute inset-0 overflow-hidden z-30 ${canEdit ? '' : 'pointer-events-none'}`}>
        {textLayers.filter(l => l.pageId === page.id).map(layer => {
          const isEditing = editingId === layer.id;
          if (isEditing) {
            return (
              <InlineTextEditor
                key={layer.id}
                initialValue={layer.text}
                initialColor={layer.color}
                initialFontSize={layer.fontSize * scale}
                initialFontFamily={layer.fontFamily}
                initialFontWeight={layer.fontWeight}
                initialFontStyle={layer.fontStyle}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: 'translate(-50%, -50%)',
                  minWidth: '50px'
                }}
              />
            )
          }
          return (
            <div
              key={layer.id}
              className={`absolute cursor-move group rounded pointer-events-auto ${canEdit ? 'hover:ring-2 ring-purple-500/50' : ''}`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: 'translate(-50%, -50%)',
                minWidth: '20px',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (canEdit) onTextAction('startDragLayer', layer.id, { x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (canEdit) onTextAction('editLayer', layer.id);
              }}
            >
              <div
                className="px-2 py-1 whitespace-pre-wrap select-none"
                style={{
                  fontSize: `${layer.fontSize * scale}px`,
                  color: layer.color,
                  fontFamily: layer.fontFamily,
                  fontWeight: layer.fontWeight,
                  fontStyle: layer.fontStyle,
                  lineHeight: 1.2
                }}
              >
                {layer.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main Component ---
export default function PdfEditorTool({
  file,
  onBack,
  setIsProcessing
}: any) {
  // State
  const [tool, setTool] = useState<'hand' | 'edit'>('edit');
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Data
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [detectedText, setDetectedText] = useState<Record<string, NativeTextItem[]>>({});
  const [nativeEdits, setNativeEdits] = useState<Record<string, NativeTextEdit>>({});

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'layer' | 'native' | null>(null);
  const [settings, setSettings] = useState<DrawingSettings>({ color: '#000000', brushSize: 20, mode: 'brush', opacity: 1, style: 'solid' });

  // Dragging State
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nativeEditsRef = useRef<Record<string, NativeTextEdit>>(nativeEdits);
  const textLayersRef = useRef<TextLayer[]>(textLayers);

  // Sync refs with state for reliable access in async handlers/closures
  useEffect(() => { nativeEditsRef.current = nativeEdits; }, [nativeEdits]);
  useEffect(() => { textLayersRef.current = textLayers; }, [textLayers]);

  // Gestures
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Load PDF & Extract Text
  useEffect(() => {
    if (!file) return;
    const load = async () => {
      if (setIsProcessing) setIsProcessing(true);
      try {
        const lib = (pdfjsLib as any).default || pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const arrayBuffer = await file.arrayBuffer();
        const doc = await lib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        setPdfDoc(doc);

        const ps: PdfPage[] = [];
        const textData: Record<string, NativeTextItem[]> = {};

        for (let i = 0; i < doc.numPages; i++) {
          const p = await doc.getPage(i + 1);
          const v = p.getViewport({ scale: 1 });
          const pageId = `p${i}`;
          ps.push({ id: pageId, index: i, width: v.width, height: v.height });

          // Extract Text
          const content = await p.getTextContent();
          textData[pageId] = content.items.map((item: any, idx: number) => ({
            id: `n_${pageId}_${idx}`,
            str: item.str,
            dir: item.dir,
            width: item.width,
            height: item.height || Math.hypot(item.transform[0], item.transform[1]),
            transform: item.transform,
            fontName: item.fontName,
            x: item.transform[4],
            y: item.transform[5],
            pageIndex: i,
            w: item.width,
            h: item.height || Math.hypot(item.transform[0], item.transform[1]),
            bgColor: { r: 255, g: 255, b: 255 } // assumption
          }));
        }
        setPages(ps);
        setDetectedText(textData);

        // Initial fit - align to sidebar edge
        if (containerRef.current && ps.length > 0) {
          const rect = containerRef.current.getBoundingClientRect();
          const margin = 10; // Near the edge of the sidebar
          const scale = (rect.width - 40) / ps[0].width;
          const initialV = { x: margin, y: 20, scale };

          // Total height calculation: sum of all pages + 32px gap between pages
          const totalHeight = ps.reduce((acc, p) => acc + p.height, 0) + (ps.length - 1) * 32;
          const scaledHeight = totalHeight * scale;
          const scaledWidth = ps[0].width * scale;

          const maxY = 20;
          const minY = rect.height > scaledHeight ? 20 : rect.height - scaledHeight - 40;
          const maxX = 10;
          const minX = rect.width > scaledWidth ? 10 : rect.width - scaledWidth - 40;

          setViewport({
            ...initialV,
            x: Math.max(minX, Math.min(maxX, initialV.x)),
            y: Math.max(minY, Math.min(maxY, initialV.y))
          });
        }
      } catch (e) { console.error(e); }
      if (setIsProcessing) setIsProcessing(false);
    };
    load();
  }, [file, setIsProcessing, pages.length]); // pages.length to ensure we can re-clamp if needed

  const clampViewport = useCallback((v: Viewport, currentScale?: number) => {
    if (!containerRef.current || pages.length === 0) return v;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = currentScale ?? v.scale;

    // Total height calculation: sum of all pages + 32px gap between pages
    const totalHeight = pages.reduce((acc, p) => acc + p.height, 0) + (pages.length - 1) * 32;
    const scaledHeight = totalHeight * scale;
    const scaledWidth = pages[0].width * scale;

    const maxY = 20;
    const minY = rect.height > scaledHeight ? 20 : rect.height - scaledHeight - 40;

    const maxX = 10;
    const minX = rect.width > scaledWidth ? 10 : rect.width - scaledWidth - 40;

    return {
      ...v,
      scale,
      x: Math.max(minX, Math.min(maxX, v.x)),
      y: Math.max(minY, Math.min(maxY, v.y))
    };
  }, [pages]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingId) return;
    if (draggingLayerId) return;

    if (tool === 'hand') {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingLayerId) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      const layer = textLayers.find(l => l.id === draggingLayerId);
      const page = pages.find(p => p.id === layer?.pageId);

      if (layer && page) {
        const contentDx = dx / viewport.scale;
        const contentDy = dy / viewport.scale;

        setTextLayers(prev => prev.map(l => {
          if (l.id === draggingLayerId) {
            const dPx = (contentDx / page.width) * 100;
            const dPy = (contentDy / page.height) * 100;
            return { ...l, x: l.x + dPx, y: l.y + dPy };
          }
          return l;
        }));
      }
      return;
    }

    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setViewport(v => clampViewport({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    setDraggingLayerId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const d = -e.deltaY * zoomSensitivity;
      setViewport(v => {
        const newScale = Math.max(0.1, Math.min(5, v.scale + d));
        return clampViewport(v, newScale);
      });
    } else {
      setViewport(v => clampViewport({ ...v, y: v.y - e.deltaY }));
    }
  };

  const scrollToPage = (pageIdx: number) => {
    if (pages.length === 0) return;
    const safeIdx = Math.max(0, Math.min(pages.length - 1, pageIdx));

    // Calculate offset: Sum of heights of all previous pages + gaps
    const yOffset = pages.slice(0, safeIdx).reduce((acc, p) => acc + p.height, 0) + (safeIdx * 32);
    const scaledY = yOffset * viewport.scale;

    setViewport(v => clampViewport({ ...v, y: 20 - scaledY }));
    setCurrentPage(safeIdx + 1);
  };

  // Update current page based on scroll position
  useEffect(() => {
    if (pages.length === 0) return;

    // Using simple calculation: viewport.y mapping back to document space
    const docY = (20 - viewport.y) / viewport.scale;

    let accumulatedHeight = 0;
    let foundPage = 0;

    for (let i = 0; i < pages.length; i++) {
      const pageHeight = pages[i].height + 32; // basic page height + gap
      if (docY < accumulatedHeight + (pageHeight * 0.7)) { // 70% threshold
        foundPage = i;
        break;
      }
      accumulatedHeight += pageHeight;
      foundPage = i;
    }

    if (foundPage + 1 !== currentPage) {
      setCurrentPage(foundPage + 1);
      setPageInput((foundPage + 1).toString());
    }
  }, [viewport.y, viewport.scale, pages, currentPage]);

  const handleTextAction = (action: string, id: string | null, extra?: any) => {
    if (action === 'startDragLayer' && id && extra) {
      setDraggingLayerId(id);
      lastPos.current = { x: extra.x, y: extra.y };
    }
    else if (action === 'editNative' && id) {
      setEditingId(id);
      setEditingType('native');
    }
    else if (action === 'editLayer' && id) {
      setEditingId(id);
      setEditingType('layer');
    }
  };

  const handleSave = async () => {
    if (!file) return;
    if (setIsProcessing) setIsProcessing(true);
    try {
      const currentNativeEdits = nativeEditsRef.current;
      const currentTextLayers = textLayersRef.current;

      const arrayBuffer = await file.arrayBuffer();
      // Prepare map for services
      const layersMap: Record<string, TextLayer[]> = {};
      currentTextLayers.forEach(l => {
        if (!l.pageId) return;
        if (!layersMap[l.pageId]) layersMap[l.pageId] = [];
        layersMap[l.pageId].push(l);
      });

      const pageIds = pages.map(p => p.id);

      const blob = await applyNativeEdits(
        arrayBuffer,
        currentNativeEdits,
        detectedText,
        layersMap,
        pageIds,
        pages,
        [] // No drawing paths for now
      );

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to save PDF. See console.");
    }
    if (setIsProcessing) setIsProcessing(false);
  };

  // Custom save handler for inline editor
  const handleInlineSave = (val: string, color?: string, bg?: string, size?: number, family?: string, weight?: string, fontStyle?: string) => {
    if (!editingId) return;

    if (editingType === 'native') {
      let foundItem: NativeTextItem | undefined;
      for (const items of Object.values(detectedText)) {
        const match = items.find(i => i.id === editingId);
        if (match) { foundItem = match; break; }
      }

      const updatedEdits = {
        ...nativeEditsRef.current,
        [editingId]: {
          originalId: editingId,
          pageIndex: foundItem?.pageIndex ?? nativeEditsRef.current[editingId]?.pageIndex ?? 0,
          text: val,
          color: color || nativeEditsRef.current[editingId]?.color || '#000000',
          backgroundColor: bg || nativeEditsRef.current[editingId]?.backgroundColor,
          fontSize: size || nativeEditsRef.current[editingId]?.fontSize || foundItem?.h,
          fontFamily: family || nativeEditsRef.current[editingId]?.fontFamily,
          fontWeight: weight || nativeEditsRef.current[editingId]?.fontWeight || 'normal',
          fontStyle: fontStyle || nativeEditsRef.current[editingId]?.fontStyle || 'normal'
        }
      };
      setNativeEdits(updatedEdits);
      nativeEditsRef.current = updatedEdits;

    } else if (editingType === 'layer') {
      const updatedLayers = textLayersRef.current.map(l => l.id === editingId ? {
        ...l,
        text: val,
        color: color || l.color,
        fontSize: size || l.fontSize,
        fontFamily: family || l.fontFamily,
        fontWeight: weight || l.fontWeight,
        fontStyle: (fontStyle as any) || l.fontStyle
      } : l);
      setTextLayers(updatedLayers);
      textLayersRef.current = updatedLayers;
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[#1a1a1a] overflow-hidden text-white">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-[#0d0d12] border-b border-white/10 flex items-center justify-between px-4 z-50 shrink-0">
        <button onClick={onBack} className="p-2"><ArrowLeft size={18} /></button>
        <div className="flex gap-2">
          <button onClick={handleSave} className="p-2 text-purple-400 font-bold">Save</button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0d0d12] border-r border-white/10 flex-col p-4 gap-4 z-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <FileEdit className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">PDF Editor</h3>
            <p className="text-[10px] text-orange-500/80 font-bold uppercase tracking-widest">Stack Architect</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 group"
          >
            <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest">Back</span>
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 group"
          >
            <Home size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setTool('hand')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tool === 'hand' ? 'bg-purple-600' : 'hover:bg-white/5'}`}
          >
            <Hand size={18} /> <span className="text-sm font-medium">Pan Tool</span>
          </button>
          <button
            onClick={() => setTool('edit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tool === 'edit' ? 'bg-purple-600' : 'hover:bg-white/5'}`}
          >
            <FileEdit size={18} /> <span className="text-sm font-medium">Edit Text</span>
          </button>
        </div>

        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-xs text-blue-200 leading-relaxed">
            <strong>Tip:</strong> Select 'Edit Text' to modify existing content.
          </p>
        </div>

        {/* Page Navigator */}
        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Navigation</h4>
            <span className="text-[10px] font-bold text-purple-400">{pages.length} Pages</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollToPage(currentPage - 2)}
              disabled={currentPage <= 1}
              className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg flex items-center justify-center transition-colors"
            >
              <ChevronUp size={14} />
            </button>
            <div className="flex-1 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 h-9 px-3 gap-2">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(pageInput);
                    if (!isNaN(p)) scrollToPage(p - 1);
                  }
                }}
                onBlur={() => {
                  const p = parseInt(pageInput);
                  if (!isNaN(p)) scrollToPage(p - 1);
                  else setPageInput(currentPage.toString());
                }}
                className="w-10 bg-transparent text-center text-sm font-black text-white outline-none"
              />
              <span className="text-[10px] text-white/40 border-l border-white/10 pl-2 font-medium">of {pages.length}</span>
            </div>
            <button
              onClick={() => scrollToPage(currentPage)}
              disabled={currentPage >= pages.length}
              className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg flex items-center justify-center transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <button onClick={handleSave} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 flex items-center justify-center gap-2">
            <Download size={18} /> Export PDF
          </button>
          <button onClick={onBack} className="w-full py-3 mt-2 text-white/50 hover:text-white text-xs font-medium">Exit Editor</button>
        </div>
      </aside>

      {/* Canvas */}
      <main
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-[#252525] touch-none ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            width: '100%',
            height: '100%'
          }}
        >
          <div className="flex flex-col items-start pb-20">
            {pages.map(page => (
              <PdfPageRenderer
                key={page.id}
                page={page}
                pdfDoc={pdfDoc}
                scale={1}
                textLayers={textLayers}
                nativeTextItems={detectedText[page.id] || []}
                nativeEdits={nativeEdits}
                onTextAction={handleTextAction}
                editingId={editingId}
                onSaveEdit={handleInlineSave}
                onCancelEdit={() => setEditingId(null)}
                tool={tool}
              />
            ))}
          </div>
        </div>

        {/* Floating Scale Controls */}
        <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/10 rounded-full px-4 py-2 gap-4 items-center">
          <button onClick={() => setViewport(v => clampViewport(v, v.scale * 0.9))}><Minus size={16} /></button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(viewport.scale * 100)}%</span>
          <button onClick={() => setViewport(v => clampViewport(v, v.scale * 1.1))}><Plus size={16} /></button>
        </div>
      </main>

      {/* Mobile Toolbar */}
      <div className="md:hidden h-16 bg-[#0d0d12] border-t border-white/10 flex items-center justify-evenly shrink-0 z-50 pb-safe">
        <button onClick={() => setTool('hand')} className={`p-2 rounded-lg ${tool === 'hand' ? 'bg-purple-600' : ''}`}><Hand size={20} /></button>
        <button onClick={() => setTool('edit')} className={`p-2 rounded-lg ${tool === 'edit' ? 'bg-purple-600' : ''}`}><FileEdit size={20} /></button>

        <div className="w-px h-8 bg-white/10" />
        <button onClick={() => alert("Undo not impl")} className="p-2 text-white/50"><Undo size={20} /></button>
      </div>

    </div>
  );
}
