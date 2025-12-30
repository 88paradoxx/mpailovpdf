import { NativeTextEdit, NativeTextItem, TextLayer, DrawingPath, PdfPage } from '../types';

/**
 * High-Precision Structural PDF Engine
 * Converts browser-space percentages to native PDF coordinates (Bottom-Left origin).
 */
export const applyNativeEdits = async (
  originalBuffer: ArrayBuffer,
  nativeEdits: Record<string, NativeTextEdit>,
  detectedText: Record<string, NativeTextItem[]>,
  layersMap: Record<string, TextLayer[]>,
  pageIds: string[],
  pagesMetadata: PdfPage[],
  drawingPaths: DrawingPath[]
): Promise<Blob> => {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  if (!PDFDocument || !rgb || !StandardFonts) {
    throw new Error("PDF library core components not found.");
  }

  const pdfDoc = await PDFDocument.load(originalBuffer);
  const pages = pdfDoc.getPages();

  const fontCache: Record<string, any> = {};

  const loadCustomFont = async (url: string) => {
    if (fontCache[url]) return fontCache[url];
    try {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const font = await pdfDoc.embedFont(arrayBuffer);
      fontCache[url] = font;
      return font;
    } catch (e) {
      console.warn(`Failed to load font from ${url}, falling back to standard.`, e);
      return null;
    }
  };

  const resolvePdfFont = async (pdfjsFontName: string = '', overrideWeight?: string, overrideStyle?: string, overrideFamily?: string) => {
    const name = (overrideFamily || pdfjsFontName || '').toLowerCase();

    const isBold = overrideWeight === '700' || overrideWeight === 'bold' || name.includes('bold') || name.includes('heavy') || name.includes('black') || name.includes('700') || name.includes('800');
    const isItalic = overrideStyle === 'italic' || name.includes('italic') || name.includes('oblique');

    // --- Custom High-Fidelity Font Mapping ---
    // If the font is Inter, Roboto, or Montserrat, try to load the high-quality TTF version
    if (name.includes('inter')) {
      const weight = isBold ? '700' : '400';
      const font = await loadCustomFont(`https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyMZhrib2Bg-4.ttf`); // Simplified URL for example
      if (font) return font;
    }

    // --- Fallback Standard Logic ---
    let fontKey = StandardFonts.Helvetica;
    const isSerif = name.includes('serif') || name.includes('times') || name.includes('georgia') || name.includes('roman') || name.includes('playfair');
    const isMono = name.includes('mono') || name.includes('courier') || name.includes('console') || name.includes('fixed') || name.includes('fira');

    if (isSerif) {
      if (isBold && isItalic) fontKey = StandardFonts.TimesRomanBoldItalic;
      else if (isBold) fontKey = StandardFonts.TimesRomanBold;
      else if (isItalic) fontKey = StandardFonts.TimesRomanItalic;
      else fontKey = StandardFonts.TimesRoman;
    } else if (isMono) {
      if (isBold && isItalic) fontKey = StandardFonts.CourierBoldOblique;
      else if (isBold) fontKey = StandardFonts.CourierBold;
      else if (isItalic) fontKey = StandardFonts.CourierOblique;
      else fontKey = StandardFonts.Courier;
    } else {
      if (isBold && isItalic) fontKey = StandardFonts.HelveticaBoldOblique;
      else if (isBold) fontKey = StandardFonts.HelveticaBold;
      else if (isItalic) fontKey = StandardFonts.HelveticaOblique;
      else fontKey = StandardFonts.Helvetica;
    }

    if (!fontCache[fontKey]) {
      fontCache[fontKey] = await pdfDoc.embedFont(fontKey);
    }
    return fontCache[fontKey];
  };

  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '').trim() || '000000';
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b_final = parseInt(h.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b_final) ? 0 : b_final);
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageId = pageIds[i];
    if (!pageId) continue;

    const { width, height } = page.getSize();
    const pageTextItems = detectedText[pageId] || [];
    const pageNativeEdits = Object.values(nativeEdits).filter(e => e.pageIndex === i);

    for (const edit of pageNativeEdits) {
      const item = pageTextItems.find(it => it.id === edit.originalId);
      if (!item) continue;

      const isModified = edit.text !== (item.str || '');
      const hasColorChange = !!edit.color;
      const hasSizeChange = !!edit.fontSize;
      const hasWeightChange = !!edit.fontWeight;
      const hasStyleChange = !!edit.fontStyle;

      if (isModified || hasColorChange || hasSizeChange || hasWeightChange || hasStyleChange) {
        const pX = item.x;
        const pW = item.w;
        const pH = item.h;
        // Transform[5] from pdf.js is already distance from bottom (PDF origin)
        const pY = item.y;

        // Refined Masking Logic
        let maskColor;
        if (edit.backgroundColor && edit.backgroundColor !== 'transparent') {
          maskColor = hexToRgb(edit.backgroundColor);
        } else {
          maskColor = item.bgColor
            ? rgb(item.bgColor.r / 255, item.bgColor.g / 255, item.bgColor.b / 255)
            : rgb(1, 1, 1);
        }

        // Descenders typically go ~20-30% below the baseline. 
        // We expand the mask to ensure the original text is fully covered.
        const vBleed = pH * 0.25;
        const hBleed = pW * 0.05;

        page.drawRectangle({
          x: pX - hBleed,
          y: pY - (pH * 0.2), // Shift down slightly more to cover descenders
          width: pW + (hBleed * 4),
          height: pH + vBleed,
          color: maskColor,
        });

        const matchedFont = await resolvePdfFont(item.fontName, edit.fontWeight, edit.fontStyle, edit.fontFamily);

        if (edit.text.length > 0) {
          let fontSize = edit.fontSize || pH;
          const targetWidth = pW;

          // Measure with standard font metrics
          let measured = matchedFont.widthOfTextAtSize(edit.text, fontSize);

          // If the text is significantly wider, we compress it slightly to avoid overlap.
          // However, we allow a small margin (5%) for variant metrics.
          if (measured > targetWidth * 1.05) {
            const scale = (targetWidth * 1.05) / measured;
            fontSize = Math.max(fontSize * 0.7, fontSize * scale);
          }

          // Use the sampled color or fallback to black
          const textColor = edit.color ? hexToRgb(edit.color) : rgb(0, 0, 0);

          page.drawText(edit.text, {
            x: pX,
            y: pY, // Draw at original baseline
            size: fontSize,
            font: matchedFont,
            color: textColor,
          });
        }
      }
    }

    const pageOverlays = layersMap[pageId] || [];
    for (const l of pageOverlays) {
      // Scale percentages to absolute PDF points
      const pX_perc = (l.x / 100) * width;
      const pY_perc = height - ((l.y / 100) * height); // CSS y is top-down

      const overlayFont = await resolvePdfFont(l.fontFamily, l.fontWeight, l.fontStyle);
      const fontSize = l.fontSize || 12;

      page.drawText(l.text, {
        x: pX_perc,
        y: pY_perc,
        size: fontSize,
        font: overlayFont,
        color: hexToRgb(l.color),
        opacity: l.opacity || 1
      });
    }

    const pagePaths = drawingPaths.filter(p => p.pageId === pageId);
    for (const path of pagePaths) {
      if (path.points.length < 2) continue;
      const color = hexToRgb(path.color);
      const opacity = path.opacity || 1;
      const thickness = path.width;

      for (let j = 0; j < path.points.length - 1; j++) {
        const p1 = path.points[j];
        const p2 = path.points[j + 1];
        page.drawLine({
          start: { x: p1.x, y: height - p1.y },
          end: { x: p2.x, y: height - p2.y },
          thickness,
          color,
          opacity,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
};

