import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, EngineMode, InputMode, ProcessProgress, ScanResult, SavedScan } from './types';
import { P2TEngine } from './lib/p2tEngine';
import {
  getAllSavedScans,
  saveScanToHistory,
  deleteScanFromHistory,
  toggleScanFavorite,
  clearAllHistory,
} from './lib/storage';
import { parseTextToMathBlocks } from './lib/latexToOmml';

import { Header } from './components/Header';
import { MobileBottomNav, MobilePane } from './components/MobileBottomNav';
import { ModelLoadingBar } from './components/ModelLoadingBar';
import { WebcamScanner } from './components/WebcamScanner';
import { PdfScanner } from './components/PdfScanner';
import { ImageDropzone } from './components/ImageDropzone';
import { LatexEditor } from './components/LatexEditor';
import { KatexViewer } from './components/KatexViewer';
import { ExportModal } from './components/ExportModal';
import { HistoryDrawer } from './components/HistoryDrawer';

import { Cloud, Cpu } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>('ar');
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [mobilePane, setMobilePane] = useState<MobilePane>('scanner');
  const [engineMode, setEngineMode] = useState<EngineMode>('cloud_ai');
  const [hasNewResult, setHasNewResult] = useState<boolean>(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scanner_theme') === 'dark';
    }
    return false;
  });

  const [progress, setProgress] = useState<ProcessProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const [activeScan, setActiveScan] = useState<ScanResult | null>(null);
  const [manualLatex, setManualLatex] = useState<string>('');

  const [historyList, setHistoryList] = useState<SavedScan[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const engineRef = useRef<P2TEngine | null>(null);

  const isArabic = language === 'ar';

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('scanner_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Sync lang & dir on <html>
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [language, isArabic]);

  // Load history and default sample on mount
  useEffect(() => {
    loadHistory();
    initEngine();

    const defaultSample = `\\text{Quadratic Formula Solution:}\n\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n\n\\text{For the system of equations:}\n\n\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} e \\\\ f \\end{bmatrix}\n\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}`;

    const sampleResult: ScanResult = {
      id: 'sample_01',
      timestamp: Date.now(),
      title: 'Sample Quadratic & Matrix Equation',
      sourceType: 'editor',
      rawLatex: defaultSample,
      blocks: parseTextToMathBlocks(defaultSample),
      language: 'en',
      confidence: 100,
    };

    setActiveScan(sampleResult);
    setManualLatex(defaultSample);

    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  const loadHistory = async () => {
    try {
      const scans = await getAllSavedScans();
      setHistoryList(scans);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const initEngine = async () => {
    try {
      if (!engineRef.current) {
        engineRef.current = new P2TEngine((prog) => {
          setProgress(prog);
        });
      }
      await engineRef.current.init();
      setTimeout(() => {
        setProgress((prev) => (prev.status === 'done' ? { status: 'idle', progress: 0, message: '' } : prev));
      }, 2500);
    } catch (err) {
      console.error('Engine init error:', err);
    }
  };

  const handleProcessImage = async (dataUrl: string) => {
    setIsSaved(false);
    setProgress({
      status: 'ocr',
      progress: 10,
      message: isArabic
        ? engineMode === 'cloud_ai'
          ? 'بدء تحليل الصورة عبر AI Studio (gemini-4-hydrogen)...'
          : 'بدء تحليل الصورة بالمحرك المحلي...'
        : engineMode === 'cloud_ai'
          ? 'Initializing AI Studio (gemini-4-hydrogen) scan...'
          : 'Initializing local OCR scan...',
    });

    try {
      if (!engineRef.current) {
        engineRef.current = new P2TEngine((prog) => setProgress(prog));
      }

      const result = await engineRef.current.processImage(dataUrl, inputMode, engineMode);
      setActiveScan(result);
      setManualLatex(result.rawLatex);

      await saveScanToHistory(result);
      setIsSaved(true);
      await loadHistory();

      // On Android / mobile screens, automatically switch to result pane after scan
      if (window.innerWidth < 1024) {
        setMobilePane('preview');
        setHasNewResult(false);
      } else {
        setHasNewResult(true);
      }

      setTimeout(() => {
        setProgress((prev) => (prev.status === 'done' ? { status: 'idle', progress: 0, message: '' } : prev));
      }, 3000);
    } catch (err: any) {
      console.error('Processing error:', err);
      setProgress({
        status: 'error',
        progress: 0,
        message: err?.message || 'Error processing scan',
      });
    }
  };

  const handleProcessManualText = () => {
    if (!manualLatex.trim()) return;

    const blocks = parseTextToMathBlocks(manualLatex);
    const result: ScanResult = {
      id: `manual_${Date.now()}`,
      timestamp: Date.now(),
      title: `Manual Edit ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      sourceType: 'editor',
      rawLatex: manualLatex,
      blocks,
      language: /[\u0600-\u06FF]/.test(manualLatex) ? 'ar' : 'en',
      confidence: 100,
    };

    setActiveScan(result);
    setIsSaved(false);
    if (window.innerWidth < 1024) {
      setMobilePane('preview');
    }
  };

  const handleSaveActiveScan = async () => {
    if (!activeScan) return;
    await saveScanToHistory(activeScan);
    setIsSaved(true);
    await loadHistory();
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleScanFavorite(id);
    await loadHistory();
  };

  const handleDeleteScan = async (id: string) => {
    await deleteScanFromHistory(id);
    await loadHistory();
  };

  const handleClearAllHistory = async () => {
    await clearAllHistory();
    await loadHistory();
  };

  const handleSelectHistoricalScan = (scan: SavedScan) => {
    setActiveScan(scan);
    setManualLatex(scan.rawLatex);
    setIsSaved(true);
    if (window.innerWidth < 1024) {
      setMobilePane('preview');
    }
  };

  const handleSelectInputMode = (mode: InputMode) => {
    setInputMode(mode);
    setMobilePane('scanner');
  };

  const isProcessing = progress.status !== 'idle' && progress.status !== 'done' && progress.status !== 'error';

  return (
    <div
      className="min-h-dvh bg-[#F4F7F6] dark:bg-[#0C1211] text-slate-900 dark:text-slate-100 flex flex-col transition-colors"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Compact Android / Desktop Top App Bar */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        activeInputMode={inputMode}
        onInputModeChange={handleSelectInputMode}
        onOpenHistory={() => setIsHistoryOpen(true)}
        savedCount={historyList.length}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-10 space-y-4 sm:space-y-6">
        {/* Workspace Control Bar: Model Selector & Mobile Pane Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span>{isArabic ? 'النموذج النشط:' : 'Active Model:'}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {engineMode === 'cloud_ai'
                ? 'AI Studio · gemini-4-hydrogen'
                : isArabic ? 'المحرك المحلي أوفلاين' : 'Local Offline'}
            </span>
          </div>

          {/* Segmented Engine Selector */}
          <div className="grid grid-cols-2 sm:inline-flex items-center bg-stone-200/70 dark:bg-[#151D1C] p-1 rounded-xl border border-stone-200 dark:border-zinc-800">
            <button
              onClick={() => setEngineMode('cloud_ai')}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                engineMode === 'cloud_ai'
                  ? 'bg-teal-700 dark:bg-teal-500 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>AI Studio (Hydrogen)</span>
            </button>

            <button
              onClick={() => setEngineMode('local_offline')}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                engineMode === 'local_offline'
                  ? 'bg-teal-700 dark:bg-teal-500 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isArabic ? 'أوفلاين محلي' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* Status / Progress Banner */}
        <ModelLoadingBar progress={progress} isArabic={isArabic} />

        {/* Two-Column Desktop Split / Tab-Switched Mobile Panes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Column 1: Scanner Input */}
          <div className={`${mobilePane === 'scanner' ? 'block' : 'hidden'} lg:block`}>
            {inputMode === 'upload' && (
              <ImageDropzone
                onImageSelect={handleProcessImage}
                isArabic={isArabic}
                isProcessing={isProcessing}
              />
            )}

            {inputMode === 'camera' && (
              <WebcamScanner
                onCapture={handleProcessImage}
                isArabic={isArabic}
                isProcessing={isProcessing}
              />
            )}

            {inputMode === 'pdf' && (
              <PdfScanner
                onScanPage={handleProcessImage}
                isArabic={isArabic}
                isProcessing={isProcessing}
              />
            )}

            {inputMode === 'editor' && (
              <LatexEditor
                value={manualLatex}
                onChange={setManualLatex}
                isArabic={isArabic}
                onProcessManualText={handleProcessManualText}
                isProcessing={isProcessing}
              />
            )}
          </div>

          {/* Column 2: Rendered Result Preview */}
          <div className={`${mobilePane === 'preview' ? 'block' : 'hidden'} lg:block`}>
            <KatexViewer
              scanResult={activeScan}
              isArabic={isArabic}
              onOpenExportModal={() => setIsExportOpen(true)}
              onSaveToHistory={handleSaveActiveScan}
              isSaved={isSaved}
            />
          </div>
        </div>
      </main>

      {/* Desktop Quiet Footer */}
      <footer className="hidden lg:block border-t border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-[#111817]/60 py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <p>
            {isArabic
              ? 'الماسح الذكي للنصوص والمعادلات © 2026'
              : 'Smart Math & Text Scanner © 2026'}
          </p>
          <div className="flex items-center gap-3">
            <span>Arabic & English</span>
            <span aria-hidden="true">·</span>
            <span>LaTeX & KaTeX</span>
            <span aria-hidden="true">·</span>
            <span>DOCX & PDF</span>
          </div>
        </div>
      </footer>

      {/* Android Material 3 Bottom Navigation Bar */}
      <MobileBottomNav
        activeInputMode={inputMode}
        mobilePane={mobilePane}
        onSelectInput={handleSelectInputMode}
        onSelectPreview={() => {
          setMobilePane('preview');
          setHasNewResult(false);
        }}
        isArabic={isArabic}
        hasNewResult={hasNewResult}
      />

      {/* Export Bottom Sheet / Modal */}
      {activeScan && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          scanResult={activeScan}
          isArabic={isArabic}
        />
      )}

      {/* History Bottom Sheet / Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
        onSelectScan={handleSelectHistoricalScan}
        onToggleFavorite={handleToggleFavorite}
        onDeleteScan={handleDeleteScan}
        onClearAll={handleClearAllHistory}
        isArabic={isArabic}
      />
    </div>
  );
}
