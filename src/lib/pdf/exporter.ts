import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Doc } from "../../models/Doc";

export async function exportPdf(originalPdfBytes: ArrayBuffer, doc: Doc): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // We will iterate over the pages and draw the edited text objects
  // The original text runs are still there. In a full implementation, 
  // we would redact the area under the edited text. 
  // For this prototype, we will draw a white rectangle to cover the old text, then draw new text.

  for (let i = 0; i < doc.pages.length; i++) {
    const pageModel = doc.pages[i];
    const pdfPage = pdfDoc.getPage(i);

    for (const obj of pageModel.objects) {
      if (obj.kind === "text") {
        const run = obj.runs[0]; // assuming 1 run per box for now

        // 1. Redact original (naive white box)
        // PDF Y goes up, obj.y is from bottom
        pdfPage.drawRectangle({
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: run.size * obj.lineHeight,
          color: rgb(1, 1, 1),
        });

        // 2. Resolve font bytes
        // In a real app we need to use the actual font bytes if it's not standard
        // We will just use the standard font for this demo export if no bytes are found
        let customFont;
        const fontRecord = doc.fonts.find((f) => f.id === run.fontId);
        
        if (fontRecord && fontRecord.source.type === "embedded") {
          customFont = await pdfDoc.embedFont(fontRecord.source.bytes, { subset: true });
        } else {
          // Fallback to standard font if no custom font bytes are available
          // (pdf-lib has StandardFonts enum, but using string here)
          customFont = await pdfDoc.embedFont("Helvetica"); 
        }

        // 3. Draw new text
        pdfPage.drawText(run.text, {
          x: obj.x,
          y: obj.y,
          size: run.size,
          font: customFont,
          color: rgb(run.color[0], run.color[1], run.color[2]),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
