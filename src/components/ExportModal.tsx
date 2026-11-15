import React, { useState } from 'react';
import { ScanResult, ExportOptions } from '../types';
import { generateDocxBlob } from '../lib/latexToOmml';
import { exportToPdf } from '../lib/pdfExporter';
import { X, FileSpreadsheet, FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResult;
  isArabic: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  isArabic,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    documentTitle: scanResult?.title || 'Smart Scan Document',
    author: 'Smart Scanner User',
    fontSize: 12,
    includeImage: false,
    paperSize: 'a4',
    docxMathFormat: 'omml',
  });

  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    setSuccessMessage(null);

    try {
      const blob = await generateDocxBlob(options.documentTitle, scanResult.rawLatex, {
        mathFormat: options.docxMathFormat,
        fontSize: options.fontSize,
      });
      const filename = `${options.documentTitle.replace(/\s+/g, '_')}_equations.docx`;
      triggerDownload(blob, filename);

      setSuccessMessage(
        isArabic
          ? 'تم تصدير مستند Word بمعادلات قابلة للتعديل بنجاح.'
          : 'Word document exported successfully.'
      );
    } catch (err: any) {
      console.error('DOCX Export Error:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setSuccessMessage(null);

    try {
      const blob = await exportToPdf(options.documentTitle, scanResult.rawLatex, options);
      const filename = `${options.documentTitle.replace(/\s+/g, '_')}.pdf`;
      triggerDownload(blob, filename);

      setSuccessMessage(
        isArabic ? 'تم إنشاء وتنزيل ملف PDF بنجاح.' : 'PDF document exported successfully.'
      );
    } catch (err: any) {
      console.error('PDF Export Error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#151D1C] border-t sm:border border-stone-200 dark:border-zinc-800 rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[90dvh] overflow-y-auto space-y-5 pb-safe">
        {/* Android Bottom Sheet Drag Handle */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {isArabic ? 'تصدير المستند' : 'Export Document'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isArabic
                ? 'Word (.docx) للتحرير أو PDF للطباعة'
                : 'Editable Word (.docx) or print-ready PDF'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={isArabic ? 'إغلاق' : 'Close'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              {isArabic ? 'عنوان المستند' : 'Document Title'}
            </label>
            <input
              type="text"
              value={options.documentTitle}
              onChange={(e) => setOptions({ ...options, documentTitle: e.target.value })}
              className="w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              {isArabic ? 'اسم المؤلف' : 'Author Name'}
            </label>
            <input
              type="text"
              value={options.author}
              onChange={(e) => setOptions({ ...options, author: e.target.value })}
              className="w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              {isArabic ? 'تنسيق معادلات Word' : 'Word Equation Format'}
            </label>
            <select
              value={options.docxMathFormat || 'omml'}
              onChange={(e) => setOptions({ ...options, docxMathFormat: e.target.value as any })}
              className="w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none"
            >
              <option value="omml">
                {isArabic
                  ? 'معادلات Word مدمجة (OMML قابلة للتعديل)'
                  : 'Native Word Equations (Editable OMML)'}
              </option>
              <option value="high-res-image">
                {isArabic
                  ? 'صور عالية الدقة للمعادلات (PNG)'
                  : 'High-Res Rendered Image (PNG)'}
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {isArabic ? 'حجم الخط' : 'Font Size'}
              </label>
              <select
                value={options.fontSize}
                onChange={(e) => setOptions({ ...options, fontSize: Number(e.target.value) })}
                className="w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none"
              >
                <option value={10}>10 pt</option>
                <option value={12}>12 pt</option>
                <option value={14}>14 pt</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {isArabic ? 'حجم الورق' : 'Paper Size'}
              </label>
              <select
                value={options.paperSize}
                onChange={(e) => setOptions({ ...options, paperSize: e.target.value as any })}
                className="w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none"
              >
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
              </select>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Export Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportDocx}
            disabled={exportingDocx || exportingPdf}
            className="min-h-[56px] p-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 flex items-center justify-between gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-3 text-start">
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-bold leading-tight">
                  {isArabic ? 'تصدير Word' : 'Export DOCX'}
                </div>
                <div className="text-[11px] opacity-85">
                  {isArabic ? 'ملف .docx قابل للتعديل' : 'Editable .docx file'}
                </div>
              </div>
            </div>
            {exportingDocx ? (
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <Download className="w-5 h-5 shrink-0" />
            )}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingDocx || exportingPdf}
            className="min-h-[56px] p-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-zinc-700 flex items-center justify-between gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-3 text-start">
              <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold leading-tight">
                  {isArabic ? 'تصدير PDF' : 'Export PDF'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isArabic ? 'جاهز للطباعة والمشاركة' : 'Print-ready PDF'}
                </div>
              </div>
            </div>
            {exportingPdf ? (
              <Loader2 className="w-5 h-5 animate-spin text-teal-700 dark:text-teal-400 shrink-0" />
            ) : (
              <Download className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
