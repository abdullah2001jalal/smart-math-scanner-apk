import React from 'react';
import { InputMode } from '../types';
import { FileUp, Camera, FileText, Edit3, Eye } from 'lucide-react';

export type MobilePane = 'scanner' | 'preview';

interface MobileBottomNavProps {
  activeInputMode: InputMode;
  mobilePane: MobilePane;
  onSelectInput: (mode: InputMode) => void;
  onSelectPreview: () => void;
  isArabic: boolean;
  hasNewResult: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeInputMode,
  mobilePane,
  onSelectInput,
  onSelectPreview,
  isArabic,
  hasNewResult,
}) => {
  const inputItems: { mode: InputMode; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { mode: 'upload', labelAr: 'صورة', labelEn: 'Image', icon: <FileUp className="w-5 h-5" /> },
    { mode: 'camera', labelAr: 'كاميرا', labelEn: 'Camera', icon: <Camera className="w-5 h-5" /> },
    { mode: 'pdf', labelAr: 'PDF', labelEn: 'PDF', icon: <FileText className="w-5 h-5" /> },
    { mode: 'editor', labelAr: 'محرر', labelEn: 'Editor', icon: <Edit3 className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-[#111817]/95 backdrop-blur-md border-t border-stone-200 dark:border-zinc-800 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-[58px] max-w-lg mx-auto px-1">
        {inputItems.map((item) => {
          const isActive = mobilePane === 'scanner' && activeInputMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onSelectInput(item.mode)}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform focus-visible:outline-none"
            >
              <div
                className={`px-3.5 py-1 rounded-full transition-colors ${
                  isActive
                    ? 'bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-200'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] leading-none tracking-tight whitespace-nowrap ${
                  isActive
                    ? 'font-bold text-teal-800 dark:text-teal-300'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {isArabic ? item.labelAr : item.labelEn}
              </span>
            </button>
          );
        })}

        {/* 5th Tab: Result Preview */}
        <button
          onClick={onSelectPreview}
          className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform focus-visible:outline-none relative"
        >
          <div
            className={`px-3.5 py-1 rounded-full transition-colors relative ${
              mobilePane === 'preview'
                ? 'bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-200'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Eye className="w-5 h-5" />
            {hasNewResult && mobilePane !== 'preview' && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" />
            )}
          </div>
          <span
            className={`text-[10px] leading-none tracking-tight whitespace-nowrap ${
              mobilePane === 'preview'
                ? 'font-bold text-teal-800 dark:text-teal-300'
                : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            {isArabic ? 'النتيجة' : 'Result'}
          </span>
        </button>
      </div>
    </nav>
  );
};
