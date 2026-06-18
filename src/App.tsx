import React from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { PDFCanvas } from './components/Canvas/PDFCanvas';
import { LayersPanel } from './components/Sidebar/LayersPanel';
import './App.css'; // Just keeping it to not break if Vite requires it, though we use inline

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: "sans-serif" }}>
      <Toolbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <PDFCanvas />
        </div>
        <LayersPanel />
      </div>
    </div>
  );
}

export default App;
