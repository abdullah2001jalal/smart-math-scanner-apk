import React, { useState } from 'react';
import katex from 'katex';
import { ScanResult } from '../types';
import { Eye, Code, Layers, Copy, Check, Bookmark, Download } from 'lucide-react';

interface KatexViewerProps {
  scanResult: ScanResult | null;
  isArabic: boolean;
  onOpenExportModal: () => void;
  onSaveToHistory: () => void;
  isSaved: boolean;
}

export const KatexViewer: React.FC<KatexViewerProps> = ({
  scanResult,
  isArabic,
  onOpenExportModal,
  onSaveToHistory,
  isSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'blocks'>('preview');
  const [copied, setCopied] = useState(false);

  if (!scanResult) {
    return (
      <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-10 border border-stone-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <Eye className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {isArabic ? 'لا توجد نتيجة عرض بعد' : 'No Scan Result Yet'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          {isArabic
            ? 'التقط صورة أو ارفع ملفاً أو اكتب معادلة لمشاهدة النتيجة هنا.'
            : 'Capture a photo, upload an image/PDF, or enter LaTeX to preview.'}
        </p>
      </section>
    );
  }

  const handleCopyAll = () => {
    navigator.clipboard.writeText(scanResult.rawLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderKaTexHtml = (mathStr: string, isDisplay = false): string => {
    try {
      return katex.renderToString(mathStr, {
        displayMode: isDisplay,
        throwOnError: false,
      });
    } catch (err) {
      return `<span class="text-rose-600 dark:text-rose-400 font-mono text-xs">[Math Error: ${mathStr}]</span>`;
    }
  };

  return (
    <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-zinc-800">
      {/* Header & Material Segmented View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-stone-200 dark:border-zinc-800">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
            {isArabic ? 'المعاينة والنتيجة' : 'Rendered Result'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
            <span className="truncate">{scanResult.title}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums shrink-0">
              {scanResult.blocks.length} {isArabic ? 'كتل' : 'blocks'}
            </span>
          </p>
        </div>

        {/* Segmented Control */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-stone-100 dark:bg-[#0D1312] p-1 rounded-xl border border-stone-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('preview')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {isArabic ? 'المعاينة' : 'Preview'}
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            LaTeX
          </button>

          <button
            onClick={() => setActiveTab('blocks')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'blocks'
                ? 'bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {isArabic ? 'الكتل' : 'Blocks'}
          </button>
        </div>
      </div>

      {/* Main Preview Canvas */}
      <div className="min-h-[260px] max-h-[460px] overflow-y-auto rounded-2xl bg-stone-50 dark:bg-[#0C1110] p-4 sm:p-5 border border-stone-200/80 dark:border-zinc-800 mb-5">
        {activeTab === 'preview' && (
          <div
            className="max-w-none space-y-4 text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed"
            dir={scanResult.language === 'ar' ? 'rtl' : 'ltr'}
          >
            {scanResult.blocks.map((block) => {
              if (block.type === 'text') {
                return (
                  <p key={block.id} className="whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">
                    {block.content}
                  </p>
                );
              } else if (block.type === 'display-math') {
                return (
                  <div
                    key={block.id}
                    className="my-3 py-3 px-4 rounded-xl bg-white dark:bg-[#151D1C] text-center overflow-x-auto"
                    dangerouslySetInnerHTML={{
                      __html: renderKaTexHtml(block.content, true),
                    }}
                  />
                );
              } else {
                return (
                  <span
                    key={block.id}
                    className="inline-block px-1 mx-0.5 rounded bg-teal-50/70 dark:bg-teal-950/40"
                    dangerouslySetInnerHTML={{
                      __html: renderKaTexHtml(block.content, false),
                    }}
                  />
                );
              }
            })}
          </div>
        )}

        {activeTab === 'code' && (
          <pre className="font-mono text-xs sm:text-sm text-slate-800 dark:text-teal-200 leading-relaxed whitespace-pre-wrap break-words" dir="ltr">
            {scanResult.rawLatex}
          </pre>
        )}

        {activeTab === 'blocks' && (
          <div className="divide-y divide-stone-200 dark:divide-zinc-800">
            {scanResult.blocks.map((block, idx) => (
              <div
                key={block.id}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1 overflow-x-auto">
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    #{idx + 1} · {block.type}
                  </div>
                  {block.type === 'text' ? (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">{block.content}</p>
                  ) : (
                    <div
                      className="text-sm py-1 text-slate-900 dark:text-slate-100"
                      dangerouslySetInnerHTML={{
                        __html: renderKaTexHtml(block.content, block.type === 'display-math'),
                      }}
                    />
                  )}
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(block.content)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 border border-stone-200 dark:border-zinc-700 active:scale-95 transition-all shrink-0"
                  title={isArabic ? 'نسخ هذه الكتلة' : 'Copy block'}
                  aria-label={isArabic ? 'نسخ هذه الكتلة' : 'Copy block'}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="min-h-[48px] px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ الكود' : 'Copy LaTeX')}
          </button>

          <button
            onClick={onSaveToHistory}
            className={`min-h-[48px] px-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap border ${
              isSaved
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border-transparent'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? (isArabic ? 'محفوظ' : 'Saved') : (isArabic ? 'حفظ' : 'Save')}
          </button>
        </div>

        <button
          onClick={onOpenExportModal}
          className="min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          {isArabic ? 'تصدير Word أو PDF' : 'Export DOCX / PDF'}
        </button>
      </div>
    </section>
  );
};
