import * as pdfjsLib from 'pdfjs-dist';

// Configure CDN worker for PDF.js to avoid worker bundling issues
if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface PdfPageInfo {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfDocumentDetails {
  numPages: number;
  getPageDataUrl: (pageIndex: number, scale?: number) => Promise<PdfPageInfo>;
}

/**
 * Loads a PDF file and returns document controller with page rendering capabilities.
 */
export async function loadPdfDocument(file: File): Promise<PdfDocumentDetails> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  return {
    numPages: pdfDoc.numPages,
    async getPageDataUrl(pageIndex: number, scale = 1.5): Promise<PdfPageInfo> {
      const pageNumber = Math.min(Math.max(1, pageIndex), pdfDoc.numPages);
      const page = await pdfDoc.getPage(pageNumber);

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        }).promise;
      }

      return {
        pageNumber,
        dataUrl: canvas.toDataURL('image/png'),
        width: viewport.width,
        height: viewport.height,
      };
    },
  };
}
