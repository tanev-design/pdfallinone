import * as pdfjsLib from 'pdfjs-dist';
// For Vite, you can import the worker URL directly if configured correctly,
// or use the standard public CDN as fallback.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

import type { Doc, TextObject, TextRun, FontRecord } from '../../models/Doc';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parsePdf(fileBuffer: ArrayBuffer): Promise<Doc> {
  const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
  const pdfDocument = await loadingTask.promise;

  const doc: Doc = {
    pages: [],
    fonts: [],
  };

  const fontMap = new Map<string, FontRecord>();

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    const textContent = await page.getTextContent();
    const commonObjs = page.commonObjs; // where fonts are stored

    const textObjects: TextObject[] = [];

    // Process text items. Each item is a run. 
    // We group them into simple boxes or just make 1 run = 1 object for now.
    // The spec asks for a simple structure, we'll keep 1 run per box to start with 
    // unless we need to group by Y-coordinate. Let's do 1 run per box for simplicity of the scene graph
    // or group adjacent runs.

    for (const item of textContent.items) {
      if ('str' in item) {
        // PDF point space origin is bottom-left
        const transform = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
        
        const x = transform[4];
        const y = transform[5];
        const size = Math.hypot(transform[2], transform[3]) || item.height; // approximate size
        
        const fontName = item.fontName;
        let fontId = fontName;

        // Try to resolve font from commonObjs
        if (fontName && !fontMap.has(fontName)) {
          try {
            const fontObj = commonObjs.get(fontName) as any;
            if (fontObj) {
              const family = fontObj.name || fontName;
              // Add to fontMap with dummy metrics for now, will be populated by font engine
              fontMap.set(fontName, {
                id: fontName,
                family: family.replace(/^[A-Z]{6}\+/, ''), // Strip subset tag
                weight: 400,
                style: 'normal',
                source: { type: 'fallback', matchedFrom: 'system', overrides: { sizeAdjust: '100%', ascentOverride: 'normal', descentOverride: 'normal', lineGapOverride: 'normal' } },
                metrics: { unitsPerEm: 1000, ascent: 800, descent: -200, lineGap: 0, capHeight: 700, xHeight: 500, italicAngle: 0 },
                coverage: new Set(),
              });
            }
          } catch (e) {
            console.warn(`Failed to extract font ${fontName}`, e);
          }
        }

        const run: TextRun = {
          text: item.str,
          fontId,
          size,
          color: [0, 0, 0], // pdfjs color extraction is more complex, default black
        };

        const textObj: TextObject = {
          id: `text_${pageNum}_${x}_${y}_${Math.random().toString(36).substring(7)}`,
          kind: 'text',
          x,
          y,
          rotation: 0, // Should be computed from skew
          width: item.width,
          runs: [run],
          align: 'left',
          lineHeight: 1.2,
          origin: 'imported',
        };

        textObjects.push(textObj);
      }
    }

    doc.pages.push({
      width: viewport.width,
      height: viewport.height,
      background: { pageIndex: pageNum - 1 },
      objects: textObjects,
    });
  }

  doc.fonts = Array.from(fontMap.values());
  return doc;
}
