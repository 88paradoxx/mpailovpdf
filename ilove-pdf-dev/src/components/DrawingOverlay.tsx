
import React, { useRef, useEffect, useState } from 'react';
import { DrawingPath, DrawingSettings } from '../types';

interface Props {
  paths: DrawingPath[];
  setPaths: (p: DrawingPath[] | ((prev: DrawingPath[]) => DrawingPath[])) => void;
  settings: DrawingSettings;
  readOnly?: boolean;
  zoom?: number;
}

export default function DrawingOverlay({ paths, setPaths, settings, readOnly = false, zoom = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  const getCoordinates = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    
    // Normalize coordinates to 0-100 percentage of the container
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  };

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !previewCanvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      const newWidth = Math.round(rect.width);
      const newHeight = Math.round(rect.height);
      
      if (canvasRef.current.width !== newWidth || canvasRef.current.height !== newHeight) {
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;
        previewCanvasRef.current.width = newWidth;
        previewCanvasRef.current.height = newHeight;
      }
      
      // Always redraw when paths change or zoom changes (even if dimensions didn't change, 
      // paths might have been added or zoom might have changed the coordinate calculation)
      redrawAll();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [paths, zoom]);

  const redrawAll = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    paths.filter(p => !p.hidden).forEach(path => drawPathToCtx(ctx, path));
  };

  const drawPathToCtx = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    const { width, height } = ctx.canvas;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Calculate line width as a percentage of canvas width, consistent with App.tsx
    const lineWidth = (path.width / 100) * width;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = path.opacity;

    if (path.style === 'dashed') ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
    else if (path.style === 'dotted') ctx.setLineDash([lineWidth, lineWidth]);
    else if (path.style === 'neon') {
      ctx.shadowBlur = lineWidth * 2;
      ctx.shadowColor = path.color;
    }

    if (path.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color;
    }

    const toX = (px: number) => (px / 100) * width;
    const toY = (py: number) => (py / 100) * height;

    if (path.type === 'brush' || path.type === 'eraser') {
      if (path.points.length < 1) { ctx.restore(); return; }
      ctx.beginPath();
      ctx.moveTo(toX(path.points[0].x), toY(path.points[0].y));
      path.points.forEach(p => ctx.lineTo(toX(p.x), toY(p.y)));
      ctx.stroke();
    } else if (path.type === 'rect') {
      if (path.points.length < 2) { ctx.restore(); return; }
      const p1 = path.points[0];
      const p2 = path.points[path.points.length - 1];
      ctx.strokeRect(
        toX(p1.x), 
        toY(p1.y), 
        toX(p2.x - p1.x), 
        toY(p2.y - p1.y)
      );
    } else if (path.type === 'circle') {
      if (path.points.length < 2) { ctx.restore(); return; }
      const p1 = path.points[0];
      const p2 = path.points[path.points.length - 1];
      const cx = toX(p1.x);
      const cy = toY(p1.y);
      const dx = toX(p2.x - p1.x);
      const dy = toY(p2.y - p1.y);
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (readOnly) return;
    const { x, y } = getCoordinates(clientX, clientY);
    setIsDrawing(true);
    setCurrentPath({
      id: Date.now().toString(),
      points: [{ x, y }],
      color: settings.color,
      width: settings.brushSize,
      opacity: settings.opacity,
      style: settings.style,
      type: settings.mode
    });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (readOnly || !isDrawing || !currentPath) return;
    const { x, y } = getCoordinates(clientX, clientY);
    
    const nextPoints = (settings.mode === 'brush' || settings.mode === 'eraser') 
      ? [...currentPath.points, { x, y }]
      : [currentPath.points[0], { x, y }];

    const updated = { ...currentPath, points: nextPoints };
    setCurrentPath(updated);

    const ctx = previewCanvasRef.current?.getContext('2d');
    if (ctx && previewCanvasRef.current) {
      ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
      drawPathToCtx(ctx, updated);
    }
  };

  const handleEnd = () => {
    if (readOnly) return;
    if (isDrawing && currentPath) {
      setPaths(prev => [...prev, currentPath]);
      const ctx = previewCanvasRef.current?.getContext('2d');
      if (ctx && previewCanvasRef.current) {
        ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
      }
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 touch-none overflow-hidden bg-transparent select-none ${readOnly ? 'pointer-events-none' : 'cursor-crosshair pointer-events-auto'}`}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={handleEnd}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <canvas ref={previewCanvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}

