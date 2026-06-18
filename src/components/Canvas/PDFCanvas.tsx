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
      if (!canvasEl) return;
      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;

      const fCanvas = new fabric.Canvas(canvasEl, {
        width: viewport.width,
        height: viewport.height,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = fCanvas;

      // Populate fabric with text objects
      pageModel.objects.forEach((obj) => {
        if (obj.kind === "text") {
          const run = obj.runs[0];
          
          // Improved positioning: y is baseline in PDF points.
          // Fabric 'top' expects the top bounding box. 
          // For simplicity, we approximate ascent as 80% of font size.
          const top = viewport.height - obj.y - (run.size * 0.8);

          const textObj = new fabric.IText(run.text, {
            left: obj.x,
            top: top, 
            fontSize: run.size,
            fontFamily: run.fontId,
            fill: `rgb(${run.color.map((c) => c * 255).join(",")})`,
            textAlign: obj.align,
            data: { id: obj.id },
            originX: "left",
            originY: "top",
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
            y: viewport.height - (target.top || 0) - ((target.fontSize || 0) * 0.8), 
          });
        }
      });

      // --- PAN & ZOOM ---
      fCanvas.on('mouse:wheel', function(opt) {
        const delta = opt.e.deltaY;
        let zoom = fCanvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 5) zoom = 5;
        if (zoom < 0.1) zoom = 0.1;
        fCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        
        const vpt = fCanvas.viewportTransform;
        if (vpt && bgCanvas) {
          bgCanvas.style.transformOrigin = "0 0";
          bgCanvas.style.transform = `matrix(${vpt[0]}, ${vpt[1]}, ${vpt[2]}, ${vpt[3]}, ${vpt[4]}, ${vpt[5]})`;
        }
      });

      fCanvas.on('mouse:down', function(opt) {
        const evt = opt.e as MouseEvent;
        if (evt.altKey || evt.button === 1) { // Alt key or middle mouse
          (this as any).isDragging = true;
          (this as any).selection = false;
          (this as any).lastPosX = evt.clientX;
          (this as any).lastPosY = evt.clientY;
        }
      });

      fCanvas.on('mouse:move', function(opt) {
        if ((this as any).isDragging) {
          const e = opt.e as MouseEvent;
          const vpt = this.viewportTransform;
          if (vpt) {
            vpt[4] += e.clientX - (this as any).lastPosX;
            vpt[5] += e.clientY - (this as any).lastPosY;
            this.requestRenderAll();
            
            if (bgCanvas) {
              bgCanvas.style.transformOrigin = "0 0";
              bgCanvas.style.transform = `matrix(${vpt[0]}, ${vpt[1]}, ${vpt[2]}, ${vpt[3]}, ${vpt[4]}, ${vpt[5]})`;
            }
          }
          (this as any).lastPosX = e.clientX;
          (this as any).lastPosY = e.clientY;
        }
      });

      fCanvas.on('mouse:up', function() {
        const vpt = this.viewportTransform;
        if (vpt) this.setViewportTransform(vpt);
        (this as any).isDragging = false;
        (this as any).selection = true;
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
      <div className="pdf-canvas-wrapper" style={{ position: "relative" }}>
        <canvas
          ref={bgCanvasElRef}
          style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
        />
        <canvas
          ref={canvasElRef}
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        />
      </div>
    </div>
  );
};
