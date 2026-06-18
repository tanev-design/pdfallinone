import React, { useRef } from "react";
import { useDocStore } from "../../store/useDocStore";
import { parsePdf } from "../../lib/pdf/parser";
import { exportPdf } from "../../lib/pdf/exporter";

export const Toolbar: React.FC = () => {
  const { loadDoc, doc, undo, redo, historyIndex, history, activePage, setActivePage, closeDoc, originalPdfBytes } = useDocStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      const newDoc = await parsePdf(buffer);
      loadDoc(newDoc, buffer);
    }
  };

  const handleExport = async () => {
    if (doc && originalPdfBytes) {
      const pdfBytes = await exportPdf(originalPdfBytes, doc);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ padding: "10px", backgroundColor: "#333", color: "white", display: "flex", gap: "10px", alignItems: "center" }}>
      <input 
        type="file" 
        accept="application/pdf" 
        style={{ display: "none" }} 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      
      {!doc ? (
        <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>Open PDF</button>
      ) : (
        <button onClick={closeDoc} style={{ ...btnStyle, backgroundColor: "#dc3545" }}>Close PDF</button>
      )}
      
      <div style={{ width: "1px", height: "20px", backgroundColor: "#555", margin: "0 10px" }} />
      
      <button onClick={undo} disabled={historyIndex <= 0} style={btnStyle}>Undo</button>
      <button onClick={redo} disabled={historyIndex >= history.length - 1} style={btnStyle}>Redo</button>
      
      <div style={{ width: "1px", height: "20px", backgroundColor: "#555", margin: "0 10px" }} />
      
      <button 
        onClick={() => setActivePage(Math.max(0, activePage - 1))} 
        disabled={!doc || activePage <= 0} 
        style={btnStyle}
      >
        Prev
      </button>
      <span style={{ fontSize: "14px" }}>
        Page {doc ? activePage + 1 : 0} / {doc ? doc.pages.length : 0}
      </span>
      <button 
        onClick={() => setActivePage(Math.min((doc?.pages.length || 1) - 1, activePage + 1))} 
        disabled={!doc || activePage >= doc.pages.length - 1} 
        style={btnStyle}
      >
        Next
      </button>
      
      <div style={{ flex: 1 }} />
      
      <button onClick={handleExport} disabled={!doc} style={{ ...btnStyle, backgroundColor: "#4CAF50" }}>Export PDF</button>
    </div>
  );
};

const btnStyle = {
  padding: "6px 12px",
  backgroundColor: "#555",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer"
};
