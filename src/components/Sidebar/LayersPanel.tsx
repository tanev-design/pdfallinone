import React from "react";
import { useDocStore } from "../../store/useDocStore";

export const LayersPanel: React.FC = () => {
  const { doc } = useDocStore();

  if (!doc) return null;

  // Render objects from the first page for simplicity
  const objects = [...(doc.pages[0]?.objects || [])].reverse();

  return (
    <div style={{ width: "250px", backgroundColor: "#fafafa", borderLeft: "1px solid #ddd", padding: "10px", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", textTransform: "uppercase", color: "#666" }}>Layers</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {objects.map((obj, i) => (
          <div key={obj.id} style={{ padding: "8px", backgroundColor: "white", border: "1px solid #eee", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
            {obj.kind === "text" ? `Text: ${(obj as any).runs[0]?.text.substring(0, 15)}...` : obj.kind}
          </div>
        ))}
      </div>
    </div>
  );
};
