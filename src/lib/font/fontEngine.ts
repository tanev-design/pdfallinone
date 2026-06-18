import type { FontRecord, MetricOverrides } from "../../models/Doc";

// Fallback logic and metric overrides
export function resolveFont(fontId: string, family: string): FontRecord {
  // In a full implementation, we would check bundled fonts, 
  // query Local Font Access API, etc.
  
  // For now, we return a fallback system font setup.
  return {
    id: fontId,
    family: family || "sans-serif",
    weight: 400,
    style: "normal",
    source: {
      type: "fallback",
      matchedFrom: "system",
      overrides: calculateMetricOverrides(1000, 800, -200, 0), // dummy metrics
    },
    metrics: {
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
      italicAngle: 0,
    },
    coverage: new Set(),
  };
}

export function calculateMetricOverrides(
  upm: number,
  ascent: number,
  descent: number,
  lineGap: number
): MetricOverrides {
  // Simple capsize/fontaine math
  // (originalMetric / substituteMetric) * 100 + "%"
  // Here we just mock it for the structure
  return {
    sizeAdjust: "100%",
    ascentOverride: `${(ascent / upm) * 100}%`,
    descentOverride: `${(Math.abs(descent) / upm) * 100}%`,
    lineGapOverride: `${(lineGap / upm) * 100}%`,
  };
}

export function generateFontCss(fonts: FontRecord[]): string {
  let css = "";
  for (const font of fonts) {
    if (font.source.type === "fallback") {
      css += `
        @font-face {
          font-family: "${font.id}_fallback";
          src: local("${font.family}"), local("sans-serif");
          size-adjust: ${font.source.overrides.sizeAdjust};
          ascent-override: ${font.source.overrides.ascentOverride};
          descent-override: ${font.source.overrides.descentOverride};
          line-gap-override: ${font.source.overrides.lineGapOverride};
        }
      `;
    } else if (font.source.type === "embedded") {
      // Create blob URL from bytes and map it
      const blob = new Blob([font.source.bytes]);
      const url = URL.createObjectURL(blob);
      css += `
        @font-face {
          font-family: "${font.id}";
          src: url("${url}");
        }
      `;
    }
  }
  return css;
}
