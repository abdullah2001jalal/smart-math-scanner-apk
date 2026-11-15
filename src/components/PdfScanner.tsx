import React, { useState } from 'react';
import { loadPdfDocument, PdfDocumentDetails, PdfPageInfo } from '../lib/pdfParser';
import { FileText, ChevronLeft, ChevronRight, ScanLine, Loader2, UploadCloud } from 'lucide-react';

interface PdfScannerProps {
  onScanPage: (imageDataUrl: string) => void;
  isArabic: boolean;
  isProcessing: boolean;
}

export const PdfScanner: React.FC<PdfScannerProps> = ({
  onScanPage,
  isArabic,
  isProcessing,
}) => {
  const [pdfDetails, setPdfDetails] = useState<PdfDocumentDetails | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInfo, setPageInfo] = useState<PdfPageInfo | null>(null);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingPdf(true);
    setErrorMsg(null);

    try {
      const docDetails = await loadPdfDocument(file);
      setPdfDetails(docDetails);
      setCurrentPage(1);

      const page = await docDetails.getPageDataUrl(1);
      setPageInfo(page);
    } catch (err: any) {
      console.error('PDF Load Error:', err);
      setErrorMsg(
        isArabic
          ? 'فشل تحميل ملف PDF. يرجى التأكد من أن الملف سليم.'
          : 'Failed to load PDF file. Please ensure the file is valid.'
      );
    } finally {
      setLoadingPdf(false);
    }
  };

  const changePage = async (newPage: number) => {
    if (!pdfDetails) return;
    if (newPage < 1 || newPage > pdfDetails.numPages) return;

    setLoadingPdf(true);
    setCurrentPage(newPage);

    try {
      const page = await pdfDetails.getPageDataUrl(newPage);
      setPageInfo(page);
    } catch (err) {
      console.error('Page render error:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleScanCurrentPage = () => {
    if (pageInfo?.dataUrl) {
      onScanPage(pageInfo.dataUrl);
    }
  };

  return (
    <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-zinc-800">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          {isArabic ? 'استيراد ومسح ملفات PDF' : 'Import & Scan PDF'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isArabic
            ? 'افتح ملف PDF وتنقّل بين صفحاته لمسح أي صفحة وتحويلها إلى LaTeX.'
            : 'Open a PDF, flip through pages, and extract LaTeX math and text.'}
        </p>
      </div>

      {!pdfDetails ? (
        <label className="border-2 border-dashed border-stone-300 dark:border-zinc-700 hover:border-teal-600/70 bg-stone-50/70 dark:bg-[#0E1413] rounded-2xl px-5 py-10 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/70 flex items-center justify-center mb-3 text-teal-700 dark:text-teal-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 text-center">
            {isArabic ? 'اضغط لاختيار ملف PDF' : 'Tap to choose a PDF file'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 text-center">
            {isArabic ? 'الملازم الدراسية والأبحاث والكتب' : 'Academic papers, notes, and textbooks'}
          </p>
          <span className="min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center justify-center active:scale-[0.98] transition-all">
            {isArabic ? 'تصفح الملفات' : 'Browse Files'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-100 dark:bg-[#0E1413] p-2 rounded-2xl">
            <div className="flex items-center gap-1">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1 || loadingPdf}
                aria-label={isArabic ? 'الصفحة السابقة' : 'Previous page'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {isArabic
                  ? `${currentPage} / ${pdfDetails.numPages}`
                  : `Page ${currentPage} / ${pdfDetails.numPages}`}
              </span>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= pdfDetails.numPages || loadingPdf}
                aria-label={isArabic ? 'الصفحة التالية' : 'Next page'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 active:scale-95 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <label className="min-h-[44px] px-4 rounded-xl bg-white dark:bg-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center cursor-pointer active:scale-95 transition-all">
              {isArabic ? 'تغيير الملف' : 'Change PDF'}
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-h-[440px] bg-stone-100 dark:bg-[#0A0F0E] flex items-center justify-center p-2">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-2 text-teal-700 dark:text-teal-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-medium">
                  {isArabic ? 'جاري تحضير الصفحة...' : 'Rendering Page...'}
                </span>
              </div>
            ) : pageInfo ? (
              <img
                src={pageInfo.dataUrl}
                alt={`PDF Page ${currentPage}`}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : null}
          </div>

          <button
            onClick={handleScanCurrentPage}
            disabled={isProcessing || !pageInfo}
            className="w-full sm:w-auto sm:ml-auto min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <ScanLine className="w-5 h-5" />
            {isArabic ? `مسح الصفحة (${currentPage})` : `Scan Page (${currentPage})`}
          </button>
        </div>
      )}

      {errorMsg && (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium text-center">{errorMsg}</p>
      )}
    </section>
  );
};
