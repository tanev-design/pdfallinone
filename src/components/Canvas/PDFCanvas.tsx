import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useDocStore } from "../../store/useDocStore";
import * as pdfjsLib from "pdfjs-dist";
import "./PDFCanvas.css";

export const PDFCanvas: React.FC = () => {
  const { doc, updateObject, activePage, originalPdfBytes } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!doc || doc.pages.length === 0 || !originalPdfBytes) return;
    const pageModel = doc.pages[activePage];

    let isActive = true;

    const initCanvas = async () => {
      // 1. Render actual PDF background
      const loadingTask = pdfjsLib.getDocument({ data: originalPdfBytes.slice(0) });
      const pdfDocument = await loadingTask.promise;
      if (!isActive) return;

      const pdfPage = await pdfDocument.getPage(activePage + 1);
      const viewport = pdfPage.getViewport({ scale: 1.0 });

      const bgCanvas = bgCanvasElRef.current;
      if (!bgCanvas) return;
      bgCanvas.width = viewport.width;
      bgCanvas.height = viewport.height;

      const ctx = bgCanvas.getContext("2d");
      if (ctx) {
        // Render PDF
        await pdfPage.render({ canvasContext: ctx, viewport } as any).promise;
        if (!isActive) return;

        // Redact original text to prevent ghosting/doubling
        // We draw white boxes over the original text runs
        ctx.fillStyle = "white"; // Simple whiteout for now
        pageModel.objects.forEach((obj) => {
          if (obj.kind === "text") {
            const run = obj.runs[0];
            const top = viewport.height - obj.y - run.size;
            // A naive bounding box to hide the original text
            ctx.fillRect(obj.x, top, obj.width, run.size * 1.2);
          }
        });
      }

      // 2. Setup fabric canvas
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const canvasEl = canvasElRef.current;
      const containerEl = containerRef.current;
      if (!canvasEl || !containerEl) return;
      
      const screenW = containerEl.clientWidth;
      const screenH = containerEl.clientHeight;

      canvasEl.width = screenW;
      canvasEl.height = screenH;

      const fCanvas = new fabric.Canvas(canvasEl, {
        width: screenW,
        height: screenH,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = fCanvas;

      // Center PDF on screen initially
      const initialPanX = (screenW - viewport.width) / 2;
      const initialPanY = (screenH - viewport.height) / 2;
      const initialVpt: fabric.TMat2D = [1, 0, 0, 1, initialPanX, initialPanY];
      fCanvas.setViewportTransform(initialVpt);

      if (bgCanvas) {
        bgCanvas.style.transformOrigin = "0 0";
        bgCanvas.style.transform = `matrix(1, 0, 0, 1, ${initialPanX}, ${initialPanY})`;
      }

      // Handle Resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          fCanvas.setDimensions({ width, height });
        }
      });
      resizeObserver.observe(containerEl);

      // Populate fabric with text objects
      pageModel.objects.forEach((obj) => {
        if (obj.kind === "text") {
          const run = obj.runs[0];
          
          const fontRecord = doc.fonts.find(f => f.id === run.fontId);
          const fontFamily = fontRecord ? fontRecord.family : 'sans-serif';

          const textObj = new fabric.IText(run.text, {
            left: obj.x,
            top: viewport.height - obj.y, 
            fontSize: run.size,
            fontFamily: fontFamily,
            fill: `rgb(${run.color.map((c) => c * 255).join(",")})`,
            textAlign: obj.align,
            data: { id: obj.id },
            originX: "left",
            originY: "bottom",
          });
          fCanvas.add(textObj);
        }
      });

      // Listen for text editing / movement to sync back to store
      fCanvas.on("object:modified", (e) => {
        const target = e.target as any;
        if (target && target.data?.id) {
          // Convert back
          updateObject(activePage, target.data.id, {
            x: target.left,
            y: viewport.height - (target.top || 0), 
          });
        }
      });

      // --- PAN & ZOOM ---
      fCanvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoom = fCanvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 5) zoom = 5;
        if (zoom < 0.1) zoom = 0.1;
        fCanvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        
        const vpt = fCanvas.viewportTransform;
        if (vpt && bgCanvas) {
          bgCanvas.style.transformOrigin = "0 0";
          bgCanvas.style.transform = `matrix(${vpt[0]}, ${vpt[1]}, ${vpt[2]}, ${vpt[3]}, ${vpt[4]}, ${vpt[5]})`;
        }
      });

      fCanvas.on('mouse:down', (opt) => {
        const evt = opt.e as MouseEvent;
        if (evt.altKey || evt.button === 1) { // Alt key or middle mouse
          (fCanvas as any).isDragging = true;
          fCanvas.selection = false;
          (fCanvas as any).lastPosX = evt.clientX;
          (fCanvas as any).lastPosY = evt.clientY;
        }
      });

      fCanvas.on('mouse:move', (opt) => {
        if ((fCanvas as any).isDragging) {
          const e = opt.e as MouseEvent;
          const vpt = fCanvas.viewportTransform;
          if (vpt) {
            vpt[4] += e.clientX - (fCanvas as any).lastPosX;
            vpt[5] += e.clientY - (fCanvas as any).lastPosY;
            fCanvas.requestRenderAll();
            
            if (bgCanvas) {
              bgCanvas.style.transformOrigin = "0 0";
              bgCanvas.style.transform = `matrix(${vpt[0]}, ${vpt[1]}, ${vpt[2]}, ${vpt[3]}, ${vpt[4]}, ${vpt[5]})`;
            }
          }
          (fCanvas as any).lastPosX = e.clientX;
          (fCanvas as any).lastPosY = e.clientY;
        }
      });

      fCanvas.on('mouse:up', () => {
        const vpt = fCanvas.viewportTransform;
        if (vpt) fCanvas.setViewportTransform(vpt);
        (fCanvas as any).isDragging = false;
        fCanvas.selection = true;
      });
    };

    initCanvas();

    return () => {
      isActive = false;
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [doc, activePage, originalPdfBytes, updateObject]);

  if (!doc) {
    return <div className="pdf-empty-state">Load a PDF to start editing</div>;
  }

  return (
    <div className="pdf-canvas-container" ref={containerRef}>
      <canvas ref={bgCanvasElRef} className="pdf-canvas-bg" />
      <canvas ref={canvasElRef} className="pdf-canvas-fabric" />
    </div>
  );
};
