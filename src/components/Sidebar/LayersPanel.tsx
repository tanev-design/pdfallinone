import React from "react";
import { useDocStore } from "../../store/useDocStore";
import "./LayersPanel.css";

export const LayersPanel: React.FC = () => {
  const { doc, activePage, deleteObject } = useDocStore();

  if (!doc) return null;

  const objects = [...(doc.pages[activePage]?.objects || [])].reverse();

  return (
    <div className="layers-panel">
      <h3 className="layers-title">Layers</h3>
      <div className="layers-list">
        {objects.map((obj) => {
          let label: string = obj.kind;
          if (obj.kind === "text") {
            const textContent = (obj as any).runs[0]?.text.trim() || "Empty Text";
            label = `T: ${textContent}`;
          }

          return (
            <div key={obj.id} className="layer-item">
              <span className="layer-text" title={label}>
                {label}
              </span>
              <button 
                onClick={() => deleteObject(activePage, obj.id)}
                className="layer-delete"
                title="Delete Layer"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
