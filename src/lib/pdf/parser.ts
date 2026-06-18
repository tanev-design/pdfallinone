import * as pdfjsLib from 'pdfjs-dist';
// For Vite, you can import the worker URL directly if configured correctly,
// or use the standard public CDN as fallback.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

import type { Doc, TextObject, TextRun, FontRecord } from '../../models/Doc';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const GOOGLE_FONTS_MAP: Record<string, string> = {
  'Helvetica': 'Roboto',
  'Arial': 'Roboto',
  'Times': 'Merriweather',
  'Courier': 'Roboto Mono',
};

function loadGoogleFont(fontFamily: string) {
  if (typeof document === 'undefined') return;
  const id = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

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
    const commonObjs = page.commonObjs; 

    const textObjects: TextObject[] = [];

    let lastObj: TextObject | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        const transform = item.transform; 
        const x = transform[4];
        const y = transform[5];
        const size = Math.hypot(transform[2], transform[3]) || item.height;
        
        const isSameLine = lastObj && Math.abs(lastObj.y - y) < size * 0.3;
        const gap = lastObj ? x - (lastObj.x + lastObj.width) : Infinity;
        const isClose = gap > -size * 0.5 && gap < size * 1.5; 

        if (isSameLine && isClose && lastObj) {
          let textToAdd = item.str;
          if (gap > size * 0.15 && !lastObj.runs[0].text.endsWith(' ') && !textToAdd.startsWith(' ')) {
            textToAdd = ' ' + textToAdd;
          }
          lastObj.runs[0].text += textToAdd;
          lastObj.width = (x + item.width) - lastObj.x;
          continue;
        }

        if (item.str.trim() === '') continue;

        const fontName = item.fontName;
        let fontId = fontName;

        if (fontName && !fontMap.has(fontName)) {
          try {
            const fontObj = commonObjs.get(fontName) as any;
            if (fontObj) {
              const family = fontObj.name || fontName;
              const strippedFamily = family.replace(/^[A-Z]{6}\+/, '');
              
              let mappedFamily = 'sans-serif'; // fallback
              for (const [key, val] of Object.entries(GOOGLE_FONTS_MAP)) {
                if (strippedFamily.toLowerCase().includes(key.toLowerCase())) {
                  mappedFamily = val;
                  loadGoogleFont(val);
                  break;
                }
              }

              fontMap.set(fontName, {
                id: fontName,
                family: mappedFamily,
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
          color: [0, 0, 0],
        };

        const textObj: TextObject = {
          id: `text_${pageNum}_${x}_${y}_${Math.random().toString(36).substring(7)}`,
          kind: 'text',
          x,
          y,
          rotation: 0,
          width: item.width,
          runs: [run],
          align: 'left',
          lineHeight: 1.2,
          origin: 'imported',
        };

        textObjects.push(textObj);
        lastObj = textObj;
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
