# MEMORY.md - Smart Math & Text Scanner Web App

## Current Overall Status
100% Completed! Full-featured client-side Smart Scanner Web App with Pix2Text (P2T) OCR & Math engine running in Web Worker, KaTeX live preview rendering, PDF/DOCX exports (with native Word OMML equations), bilingual English & Arabic support, and IndexedDB caching & history management.

## Completed Features
- **P2T Web Worker Engine**: 100% in-browser offline OCR & math recognition using `onnxruntime-web` and `tesseract.js` in a non-blocking Web Worker.
- **IndexedDB Model Caching & Document History**: Caches model assets and saves document history with localforage.
- **Input Mechanisms**:
  - Live WebRTC Camera Capture with camera switching and boundary grid overlay.
  - Image Upload Dropzone with drag-and-drop support.
  - PDF File Import: Renders PDF pages onto canvas using `pdf.js` for scanning.
  - Manual Text & LaTeX Editor: Interactive editing with quick formula insertion toolbar (Fractions, Roots, Integrals, Summations, Matrices, Greek letters, Symbols).
- **Live KaTeX Preview**: Textbook-quality live math rendering with tabbed views (Rendered Document, Raw LaTeX code, and Block Inspector).
- **Native DOCX Export**: Converts LaTeX equations directly into Microsoft Word native OMML (`m:oMath`, `m:f`, `m:rad`, `m:sSubSup`, `m:nary`) XML tags inside a valid `.docx` ZIP package built via `JSZip`.
- **PDF Export**: Generates printable PDF documents using `jsPDF` and KaTeX canvas rendering.
- **Bilingual Interface**: Toggle between English and Arabic UI with RTL layout adjustments and Cairo font integration.
- **Saved History Drawer**: Search, filter favorites, load past scans into the editor, and delete saved items.

## Technical Decisions & Context
- **Framework**: Vite + React 19 + TypeScript + Tailwind CSS.
- **Math Engine**: Pix2Text (P2T) math & OCR processor implemented via Web Worker (`/src/workers/p2t.worker.ts`).
- **KaTeX**: Textbook-quality LaTeX rendering in browser.
- **DOCX Export**: Manual ZIP package generation (`/src/lib/latexToOmml.ts`) containing `word/document.xml` with native Microsoft Word `m:oMath` (OMML) tags converted directly from LaTeX.
- **PDF Export**: jsPDF + KaTeX SVG/canvas renderer (`/src/lib/pdfExporter.ts`).
- **Storage**: `localforage` IndexedDB for history and model binary caching.
