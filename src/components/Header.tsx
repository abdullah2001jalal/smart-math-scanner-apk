import React from 'react';
import { AppLanguage, InputMode } from '../types';
import { History, Globe, Sun, Moon, ScanLine } from 'lucide-react';

interface HeaderProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  activeInputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  onOpenHistory: () => void;
  savedCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  activeInputMode,
  onInputModeChange,
  onOpenHistory,
  savedCount,
  isDark,
  onToggleTheme,
}) => {
  const isArabic = language === 'ar';

  const navItems: { mode: InputMode; labelAr: string; labelEn: string }[] = [
    { mode: 'upload', labelAr: 'رفع صورة', labelEn: 'Image' },
    { mode: 'camera', labelAr: 'الكاميرا', labelEn: 'Camera' },
    { mode: 'pdf', labelAr: 'ملف PDF', labelEn: 'PDF' },
    { mode: 'editor', labelAr: 'المحرر', labelEn: 'Editor' },
  ];

  return (
    <header className="sticky top-0 z-30 h-[52px] md:h-16 bg-white/95 dark:bg-[#111817]/95 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-teal-700 dark:bg-teal-500 flex items-center justify-center text-white dark:text-slate-950 shrink-0">
            <ScanLine className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-sm md:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            {isArabic ? 'الماسح الذكي' : 'Smart Scanner'}
          </span>
        </div>

        {/* Zone 2: Clean Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium" aria-label="Scanner Modes">
          {navItems.map((item) => {
            const active = activeInputMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => onInputModeChange(item.mode)}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-md px-1 ${
                  active
                    ? 'text-teal-700 dark:text-teal-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {isArabic ? item.labelAr : item.labelEn}
                {active && (
                  <span className="absolute inset-x-1 -bottom-[15px] h-0.5 bg-teal-700 dark:bg-teal-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Touch Utility Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={onToggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            aria-label={isDark ? (isArabic ? 'الوضع النهاري' : 'Light Mode') : (isArabic ? 'الوضع الليلي' : 'Dark Mode')}
            title={isDark ? (isArabic ? 'الوضع النهاري' : 'Light Mode') : (isArabic ? 'الوضع الليلي' : 'Dark Mode')}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => onLanguageChange(isArabic ? 'en' : 'ar')}
            className="min-h-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all whitespace-nowrap shrink-0"
            aria-label={isArabic ? 'Switch to English' : 'التبديل للعربية'}
          >
            <Globe className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>{isArabic ? 'EN' : 'عربي'}</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="min-h-[44px] px-3 sm:px-4 flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-xs font-semibold active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? 'السجل' : 'History'}</span>
            {savedCount > 0 && (
              <span className="tabular-nums font-bold opacity-90">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
