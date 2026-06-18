export type Doc = {
  pages: Page[];
  fonts: FontRecord[]; // resolved font registry, shared across pages
};

export type Page = {
  width: number; // PDF points (1pt = 1/72")
  height: number;
  background: PageBackground; // untouched original content
  objects: SceneObject[]; // editable layer, ordered by z (index = paint order)
};

export type PageBackground = {
  pageIndex: number;
  // This could optionally hold cached rendering info if needed,
  // but for the model it just represents the source PDF page.
};

export type SceneObject = TextObject | ImageObject | VectorObject;

export type TextObject = {
  id: string;
  kind: "text";
  // geometry in PDF point space, origin BOTTOM-LEFT
  x: number;
  y: number;
  rotation: number;
  width: number; // box width for wrapping when user reflows
  runs: TextRun[]; // a paragraph = ordered runs sharing a box
  align: "left" | "center" | "right" | "justify";
  lineHeight: number;
  origin: "imported" | "user"; // imported = lifted from PDF; user = newly added
};

export type ImageObject = {
  id: string;
  kind: "image";
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  dataUrl: string; // simplistic representation for now
};

export type VectorObject = {
  id: string;
  kind: "vector";
  x: number;
  y: number;
  rotation: number;
  path: string; // SVG path string or similar
};

export type TextRun = {
  text: string;
  fontId: string; // -> FontRecord.id
  size: number; // pt
  color: [number, number, number]; // 0..1 rgb
  letterSpacing?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type FontRecord = {
  id: string;
  family: string; // normalized, subset tag stripped
  weight: number;
  style: "normal" | "italic";
  source:
    | { type: "embedded"; bytes: ArrayBuffer } // extracted from the PDF (best fidelity)
    | { type: "bundled"; url: string } // shipped with the app
    | { type: "google"; family: string } // loaded on demand
    | { type: "system"; postscriptName: string } // via Local Font Access API
    | { type: "fallback"; matchedFrom: string; overrides: MetricOverrides };
  metrics: FontMetrics; // UPM-normalized
  coverage: Set<number>; // unicode codepoints this font can render
};

export type FontMetrics = {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  lineGap: number;
  capHeight: number;
  xHeight: number;
  italicAngle: number;
};

export type MetricOverrides = {
  sizeAdjust: string;
  ascentOverride: string;
  descentOverride: string;
  lineGapOverride: string;
};
