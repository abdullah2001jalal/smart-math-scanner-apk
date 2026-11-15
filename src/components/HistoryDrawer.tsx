import React, { useState } from 'react';
import { SavedScan } from '../types';
import { History, X, Search, Star, Trash2, ExternalLink, Trash } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: SavedScan[];
  onSelectScan: (scan: SavedScan) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteScan: (id: string) => void;
  onClearAll: () => void;
  isArabic: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  historyList,
  onSelectScan,
  onToggleFavorite,
  onDeleteScan,
  onClearAll,
  isArabic,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  if (!isOpen) return null;

  const filteredList = historyList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rawLatex.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorite = filterFavorites ? item.favorite : true;
    return matchesSearch && matchesFavorite;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/50 backdrop-blur-xs">
      <div
        className={`w-full sm:max-w-md bg-white dark:bg-[#151D1C] border-t sm:border-t-0 ${
          isArabic ? 'sm:border-r' : 'sm:border-l'
        } border-stone-200 dark:border-zinc-800 rounded-t-[28px] sm:rounded-none h-[85dvh] sm:h-full flex flex-col p-5 space-y-4 pb-safe`}
      >
        {/* Android Bottom Sheet Drag Handle */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isArabic ? 'سجل المسح المحفوظ' : 'Scan History'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {historyList.length} {isArabic ? 'عنصر محفوظ' : 'saved items'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={isArabic ? 'إغلاق' : 'Close'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2.5 shrink-0">
          <div className="relative">
            <Search
              className={`w-4 h-4 text-slate-400 absolute top-3.5 ${
                isArabic ? 'right-3.5' : 'left-3.5'
              }`}
            />
            <input
              type="text"
              placeholder={isArabic ? 'ابحث في السجل أو LaTeX...' : 'Search scans or LaTeX...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full min-h-[44px] bg-stone-50 dark:bg-[#0C1110] border border-stone-200 dark:border-zinc-800 rounded-xl ${
                isArabic ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'
              } py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-700 dark:focus:border-teal-400 outline-none`}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                filterFavorites
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-current' : ''}`} />
              {isArabic ? 'المفضلة فقط' : 'Favorites'}
            </button>

            {historyList.length > 0 && (
              <button
                onClick={onClearAll}
                className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5"
              >
                <Trash className="w-3.5 h-3.5" />
                {isArabic ? 'مسح الكل' : 'Clear All'}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-200 dark:divide-zinc-800">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-xs">
                {isArabic ? 'لا توجد عناصر مطابقة للبحث' : 'No saved scans found'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      aria-label={isArabic ? 'مفضلة' : 'Favorite'}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${item.favorite ? 'fill-amber-500 text-amber-500' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => onDeleteScan(item.id)}
                      aria-label={isArabic ? 'حذف' : 'Delete'}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="font-mono text-xs text-slate-600 dark:text-teal-300 bg-stone-50 dark:bg-[#0C1110] px-3 py-2 rounded-xl truncate" dir="ltr">
                  {item.rawLatex}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      onSelectScan(item);
                      onClose();
                    }}
                    className="min-h-[40px] px-4 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isArabic ? 'فتح في المحرر' : 'Open'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
