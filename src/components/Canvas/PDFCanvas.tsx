import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useDocStore } from "../../store/useDocStore";
import type { Doc } from "../../models/Doc";
import "./PDFCanvas.css";

// The PDF Canvas needs to take a Doc, render its background using pdf.js to a background canvas,
// and then instantiate fabric on the foreground canvas.
export const PDFCanvas: React.FC = () => {
  const { doc, updateObject } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  const [activePage] = useState(0);

  useEffect(() => {
    if (!doc || doc.pages.length === 0) return;
    const page = doc.pages[activePage];

    const initCanvas = async () => {
      // Setup bg canvas (pdf.js background)
      const bgCanvas = bgCanvasElRef.current;
      if (!bgCanvas) return;
      bgCanvas.width = page.width;
      bgCanvas.height = page.height;

      // In a real app we need to keep the loaded pdf object,
      // here we assume we have a way to render it, or we skip background rendering for this skeleton
      // For now, we'll just fill the bg white.
      const ctx = bgCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, page.width, page.height);
      }

      // Setup fabric canvas
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const canvasEl = canvasElRef.current;
      if (!canvasEl) return;
      canvasEl.width = page.width;
      canvasEl.height = page.height;

      const fCanvas = new fabric.Canvas(canvasEl, {
        width: page.width,
        height: page.height,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = fCanvas;

      // Populate fabric with text objects
      page.objects.forEach((obj) => {
        if (obj.kind === "text") {
          const run = obj.runs[0];
          // PDF Origin is Bottom-Left. Fabric Origin is Top-Left.
          // PDF Y goes up, Fabric Y goes down.
          const top = page.height - obj.y;

          const textObj = new fabric.IText(run.text, {
            left: obj.x,
            top: top - run.size, // Fabric top is top of bounding box
            fontSize: run.size,
            fontFamily: run.fontId,
            fill: `rgb(${run.color.map((c) => c * 255).join(",")})`,
            textAlign: obj.align,
            data: { id: obj.id }, // store original id to sync back
          });
          fCanvas.add(textObj);
        }
      });

      // Listen for text editing / movement to sync back to store
      fCanvas.on("object:modified", (e) => {
        const target = e.target as any;
        if (target && target.data?.id) {
          // Sync changes
          updateObject(activePage, target.data.id, {
            x: target.left,
            y: page.height - (target.top || 0) - (target.fontSize || 0), // convert back
          });
        }
      });
    };

    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [doc, activePage, updateObject]);

  if (!doc) {
    return <div className="pdf-empty-state">Load a PDF to start editing</div>;
  }

  return (
    <div className="pdf-canvas-container" ref={containerRef}>
      <div className="pdf-canvas-wrapper" style={{ position: "relative" }}>
        {/* Background layer for untouchable vectors and images */}
        <canvas
          ref={bgCanvasElRef}
          style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
        />
        {/* Fabric layer for interactive objects */}
        <canvas
          ref={canvasElRef}
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        />
      </div>
    </div>
  );
};
