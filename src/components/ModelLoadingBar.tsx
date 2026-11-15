import React from 'react';
import { ProcessProgress } from '../types';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModelLoadingBarProps {
  progress: ProcessProgress;
  isArabic: boolean;
}

export const ModelLoadingBar: React.FC<ModelLoadingBarProps> = ({ progress, isArabic }) => {
  if (progress.status === 'idle') return null;

  const isError = progress.status === 'error';
  const isDone = progress.status === 'done';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-2xl p-4 border transition-colors ${
        isError
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
          : isDone
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
          : 'bg-white dark:bg-[#151D1C] border-stone-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-teal-700 dark:text-teal-400 animate-spin shrink-0" />
          )}

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {isDone
                ? isArabic ? 'اكتمل المسح الضوئي' : 'Scan Completed'
                : isError
                ? isArabic ? 'تعذر إتمام المسح' : 'Scan Failed'
                : isArabic ? 'جاري التحليل عبر AI Studio' : 'Scanning via AI Studio'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{progress.message}</p>
          </div>
        </div>

        <span className="text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          {Math.min(100, Math.max(0, Math.round(progress.progress)))}%
        </span>
      </div>

      {/* Linear Material Progress Indicator */}
      <div className="w-full bg-stone-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isError
              ? 'bg-rose-600 dark:bg-rose-500'
              : isDone
              ? 'bg-emerald-600 dark:bg-emerald-500'
              : 'bg-teal-700 dark:bg-teal-400'
          }`}
          style={{ width: `${Math.max(5, progress.progress)}%` }}
        />
      </div>
    </div>
  );
};
