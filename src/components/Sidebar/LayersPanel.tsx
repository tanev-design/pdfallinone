import React from "react";
import { useDocStore } from "../../store/useDocStore";

export const LayersPanel: React.FC = () => {
  const { doc, activePage, deleteObject } = useDocStore();

  if (!doc) return null;

  const objects = [...(doc.pages[activePage]?.objects || [])].reverse();

  return (
    <div style={{ width: "250px", backgroundColor: "#fafafa", borderLeft: "1px solid #ddd", padding: "10px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", textTransform: "uppercase", color: "#666" }}>Layers</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {objects.map((obj) => {
          let label = obj.kind;
          if (obj.kind === "text") {
            const textContent = (obj as any).runs[0]?.text.trim() || "Empty Text";
            label = `T: ${textContent.substring(0, 20)}${textContent.length > 20 ? "..." : ""}`;
          }

          return (
            <div 
              key={obj.id} 
              style={{ 
                padding: "8px", 
                backgroundColor: "white", 
                border: "1px solid #eee", 
                borderRadius: "4px", 
                fontSize: "12px", 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
                {label}
              </span>
              <button 
                onClick={() => deleteObject(activePage, obj.id)}
                style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}
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
