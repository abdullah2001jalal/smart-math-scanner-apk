import { Capacitor } from '@capacitor/core';
import { EngineMode, ProcessProgress, ScanResult } from '../types';
import { parseTextToMathBlocks } from './latexToOmml';
import { runLocalTesseractOcr } from './localMathOcr';

const DEFAULT_NATIVE_API_BASE = 'https://ais-pre-5fa2w6ybjfyi3g53gsvxrc-339772095803.europe-west3.run.app';

export class P2TEngine {
  private onProgressCallback?: (progress: ProcessProgress) => void;

  constructor(onProgress?: (progress: ProcessProgress) => void) {
    this.onProgressCallback = onProgress;
  }

  public async init(): Promise<void> {
    // No worker initialization needed; local OCR runs safely on-demand
    return Promise.resolve();
  }

  /**
   * Universal processing method for Webcam, Image Uploads, PDF Canvas, or Pasted Text.
   * Supports local_offline (100% in-browser WebAssembly execution) with instant server fallback if needed.
   */
  public async processImage(
    imageDataUrl: string,
    sourceType: ScanResult['sourceType'] = 'upload',
    engineMode: EngineMode = 'cloud_ai'
  ): Promise<ScanResult> {
    // 1. Send initial progress update
    if (this.onProgressCallback) {
      this.onProgressCallback({
        status: 'ocr',
        progress: 20,
        message:
          engineMode === 'cloud_ai'
            ? 'جاري إرسال الصورة إلى منصة AI Studio (gemini-4-hydrogen)...'
            : 'جاري تشغيل المحرك المحلي أوفلاين لتحليل النص...',
      });
    }

    // Function to run ultra-fast high-precision AI Studio vision scan (gemini-4-hydrogen)
    const runCloudAiScan = async (): Promise<ScanResult> => {
      if (this.onProgressCallback) {
        this.onProgressCallback({
          status: 'ocr',
          progress: 50,
          message: 'جاري التعرف على الصيغ الرياضية والنصوص عبر نموذج gemini-4-hydrogen...',
        });
      }

      const apiBase =
        import.meta.env.VITE_API_BASE_URL ||
        (Capacitor.isNativePlatform() ? DEFAULT_NATIVE_API_BASE : '');

      const response = await fetch(`${apiBase}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `Server returned status ${response.status}`);
      }

      if (!data || !data.rawLatex) {
        throw new Error('Invalid response from AI Studio scan server');
      }

      if (this.onProgressCallback) {
        this.onProgressCallback({
          status: 'math_detect',
          progress: 90,
          message: 'جاري تنسيق معادلات LaTeX وتحسين المخرجات...',
        });
      }

      const rawLatex = data.rawLatex;
      const blocks = parseTextToMathBlocks(rawLatex);

      if (this.onProgressCallback) {
        this.onProgressCallback({
          status: 'done',
          progress: 100,
          message: 'تم المسح الضوئي بنجاح عبر AI Studio (gemini-4-hydrogen)!',
        });
      }

      return {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        title: `Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        sourceType,
        imageUrl: imageDataUrl.startsWith('data:image') ? imageDataUrl : undefined,
        rawLatex,
        blocks,
        language: data.language || 'mixed',
        confidence: data.confidence || 99.5,
      };
    };

    // 2. If cloud_ai mode is selected, run AI Studio gemini-4-hydrogen directly
    if (engineMode === 'cloud_ai') {
      return await runCloudAiScan();
    }

    // 3. Try Local Browser Tesseract WebAssembly execution with 4s timeout safeguard
    try {
      const localOcrPromise = runLocalTesseractOcr(imageDataUrl, this.onProgressCallback);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Local OCR timeout')), 4000);
      });

      const { rawLatex, language, confidence } = await Promise.race([localOcrPromise, timeoutPromise]);
      const blocks = parseTextToMathBlocks(rawLatex);

      if (this.onProgressCallback) {
        this.onProgressCallback({
          status: 'done',
          progress: 100,
          message: 'تم المسح الضوئي أوفلاين بنجاح!',
        });
      }

      return {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        title: `Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        sourceType,
        imageUrl: imageDataUrl.startsWith('data:image') ? imageDataUrl : undefined,
        rawLatex,
        blocks,
        language,
        confidence,
      };
    } catch (localErr: any) {
      console.warn('Local OCR execution unavailable or timed out, running AI Studio scan:', localErr);
      return await runCloudAiScan();
    }
  }

  public terminate(): void {
    // Clean up
  }
}
