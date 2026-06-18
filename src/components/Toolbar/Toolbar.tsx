import React, { useRef } from "react";
import { useDocStore } from "../../store/useDocStore";
import { parsePdf } from "../../lib/pdf/parser";
import { exportPdf } from "../../lib/pdf/exporter";

export const Toolbar: React.FC = () => {
  const { loadDoc, doc, undo, redo, historyIndex, history } = useDocStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalBytes, setOriginalBytes] = React.useState<ArrayBuffer | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      setOriginalBytes(buffer);
      const newDoc = await parsePdf(buffer);
      loadDoc(newDoc);
    }
  };

  const handleExport = async () => {
    if (doc && originalBytes) {
      const pdfBytes = await exportPdf(originalBytes, doc);
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
      <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>Open PDF</button>
      
      <div style={{ width: "1px", height: "20px", backgroundColor: "#555", margin: "0 10px" }} />
      
      <button onClick={undo} disabled={historyIndex <= 0} style={btnStyle}>Undo</button>
      <button onClick={redo} disabled={historyIndex >= history.length - 1} style={btnStyle}>Redo</button>
      
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
