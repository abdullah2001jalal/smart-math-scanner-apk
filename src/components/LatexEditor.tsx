import React from 'react';
import { Edit3, Copy, Trash2, Check, Play } from 'lucide-react';

interface LatexEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  isArabic: boolean;
  onProcessManualText: () => void;
  isProcessing: boolean;
}

export const LatexEditor: React.FC<LatexEditorProps> = ({
  value,
  onChange,
  isArabic,
  onProcessManualText,
  isProcessing,
}) => {
  const [copied, setCopied] = React.useState(false);

  const insertSnippet = (snippet: string, cursorOffset = 0) => {
    const textarea = document.getElementById('latex-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      onChange(value + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + snippet + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickSnippets = [
    { label: 'a/b', snippet: '\\frac{a}{b}', offset: -4 },
    { label: '√x', snippet: '\\sqrt{x}', offset: -1 },
    { label: 'x²', snippet: 'x^{2}', offset: -1 },
    { label: 'x₀', snippet: 'x_{0}', offset: -1 },
    { label: '∫', snippet: '\\int_{0}^{\\infty} f(x) dx ', offset: 0 },
    { label: '∑', snippet: '\\sum_{i=1}^{n} a_i ', offset: 0 },
    { label: '[Matrix]', snippet: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', offset: 0 },
    { label: 'α', snippet: '\\alpha ', offset: 0 },
    { label: 'β', snippet: '\\beta ', offset: 0 },
    { label: 'θ', snippet: '\\theta ', offset: 0 },
    { label: 'π', snippet: '\\pi ', offset: 0 },
    { label: '∞', snippet: '\\infty ', offset: 0 },
    { label: '≤', snippet: '\\leq ', offset: 0 },
    { label: '≥', snippet: '\\geq ', offset: 0 },
    { label: '≠', snippet: '\\neq ', offset: 0 },
  ];

  return (
    <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
            <span className="truncate">
              {isArabic ? 'المحرر المباشر (LaTeX)' : 'Direct LaTeX Editor'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isArabic
              ? 'أدخل النصوص والمعادلات أو استخدم شريط الرموز السريع.'
              : 'Type text and formulas or tap symbols below to insert.'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title={isArabic ? 'نسخ الكود' : 'Copy Code'}
            aria-label={isArabic ? 'نسخ الكود' : 'Copy Code'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {copied ? (isArabic ? 'تم' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}
            </span>
          </button>
          <button
            onClick={() => onChange('')}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-stone-100 hover:bg-rose-100 dark:bg-zinc-800 dark:hover:bg-rose-950/60 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-semibold active:scale-95 transition-all flex items-center justify-center"
            title={isArabic ? 'مسح الكود' : 'Clear Editor'}
            aria-label={isArabic ? 'مسح الكود' : 'Clear Editor'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Touch-friendly Horizontal Scrollable Formula Bar on Mobile */}
      <div className="mb-3">
        <div className="flex overflow-x-auto sm:flex-wrap gap-2 pb-1 no-scrollbar">
          {quickSnippets.map((item, index) => (
            <button
              key={index}
              onClick={() => insertSnippet(item.snippet, item.offset)}
              className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-stone-100 hover:bg-teal-50 dark:bg-[#0E1413] dark:hover:bg-teal-950/60 text-slate-800 dark:text-teal-300 border border-stone-200 dark:border-zinc-800 hover:border-teal-600/40 text-xs font-mono font-semibold shrink-0 active:scale-95 transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Editor */}
      <div className="relative">
        <textarea
          id="latex-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isArabic
              ? 'أدخل النصوص والمعادلات باستخدام $...$ أو $$...$$...'
              : 'Type text and math equations using $...$ or $$...$$...'
          }
          className="w-full h-52 sm:h-60 bg-stone-50 dark:bg-[#0C1110] text-slate-900 dark:text-slate-100 font-mono text-sm p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 focus:border-teal-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-700/20 outline-none resize-none leading-relaxed"
          dir={isArabic ? 'rtl' : 'ltr'}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{isArabic ? 'صيغة LaTeX و Markdown' : 'LaTeX & Markdown supported'}</span>
          <span className="font-mono tabular-nums">
            {value.length} {isArabic ? 'حرف' : 'chars'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onProcessManualText}
          disabled={isProcessing || !value.trim()}
          className="w-full sm:w-auto min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          {isArabic ? 'عرض ومعالجة النص' : 'Render LaTeX'}
        </button>
      </div>
    </section>
  );
};
