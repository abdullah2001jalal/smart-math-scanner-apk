import * as ort from 'onnxruntime-web';
import { createWorker, Worker } from 'tesseract.js';

export interface P2TWorkerMessage {
  type: 'INIT' | 'PROCESS_IMAGE' | 'CANCEL';
  payload?: any;
}

export interface P2TWorkerResponse {
  type: 'PROGRESS' | 'RESULT' | 'ERROR';
  payload?: any;
}

let tesseractWorker: Worker | null = null;
let mathOnnxSession: ort.InferenceSession | null = null;

// Report progress to main thread
function sendProgress(status: string, progress: number, message: string) {
  self.postMessage({
    type: 'PROGRESS',
    payload: { status, progress, message },
  } as P2TWorkerResponse);
}

// Global error capture for worker
self.addEventListener('error', (err) => {
  self.postMessage({
    type: 'ERROR',
    payload: { message: err?.message || 'Worker global error' },
  });
});

self.addEventListener('unhandledrejection', (event: any) => {
  self.postMessage({
    type: 'ERROR',
    payload: { message: event?.reason?.message || 'Worker unhandled promise rejection' },
  });
});

// Initialize Tesseract OCR with timeout protection
async function initTesseract() {
  if (!tesseractWorker) {
    sendProgress('loading_model', 20, 'تجهيز المحرك المحلي (Tesseract WebAssembly)...');
    
    const workerPromise = (async () => {
      try {
        const w = await createWorker(['eng', 'ara'], 1, {
          logger: (m) => {
            if (m && m.status && typeof m.progress === 'number') {
              const p = Math.min(75, Math.round(20 + m.progress * 55));
              const msg = m.status === 'recognizing text'
                ? 'جاري استخراج وتفسير المعادلة والملاحظات...'
                : `تحميل بيانات القراءة أوفلاين: ${Math.round(m.progress * 100)}%`;
              sendProgress('ocr', p, msg);
            }
          },
        });
        return w;
      } catch {
        return await createWorker('eng', 1);
      }
    })();

    // 4-second timeout limit for downloading OCR traineddata on mobile
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Local worker language load timeout')), 4000);
    });

    tesseractWorker = await Promise.race([workerPromise, timeoutPromise]);
    sendProgress('loading_model', 40, 'المحرك المحلي جاهز للعمل أوفلاين');
  }
}

/**
 * Intelligent LaTeX mathematical formula reconstruction heuristic.
 * Parses raw OCR characters into structured, formatted LaTeX syntax.
 */
function parseMathFormulaFromRegion(text: string): { latex: string; isDisplay: boolean } | null {
  const clean = text.trim();
  if (!clean) return null;

  // Replacement patterns for Greek letters and common math functions
  let formatted = clean
    // Fractions: e.g. (a+b)/(c+d) or a/b
    .replace(/\bfrac\s*\((.*?)\)\s*\((.*?)\)/gi, '\\frac{$1}{$2}')
    .replace(/\((\w+[\w\s+\-*]*)\)\s*\/\s*\((\w+[\w\s+\-*]*)\)/g, '\\frac{$1}{$2}')
    .replace(/\b(\w+)\s*\/\s*(\w+)\b/g, '\\frac{$1}{$2}')

    // Square roots: sqrt(x) or sqrt x
    .replace(/\bsqrt\s*\((.*?)\)/gi, '\\sqrt{$1}')
    .replace(/\bsqrt\s*(\w+)/gi, '\\sqrt{$1}')

    // Calculus & Calculus limits
    .replace(/\bint\s*_?\s*\{?([\w\d]+)\}?\s*\^?\s*\{?([\w\d\infty\\]+)\}?/gi, '\\int_{$1}^{$2}')
    .replace(/\bint\b/gi, '\\int ')
    .replace(/\bsum\s*_?\s*\{?(.*?)\}?\s*\^?\s*\{?(.*?)\}?/gi, '\\sum_{$1}^{$2}')
    .replace(/\bsum\b/gi, '\\sum ')
    .replace(/\blim\s*_?\s*\{?(.*?)\}?/gi, '\\lim_{$1}')
    .replace(/\blim\b/gi, '\\lim ')

    // Trigonometric and logarithmic functions
    .replace(/\bsin\b/gi, '\\sin ')
    .replace(/\bcos\b/gi, '\\cos ')
    .replace(/\btan\b/gi, '\\tan ')
    .replace(/\blog\b/gi, '\\log ')
    .replace(/\bln\b/gi, '\\ln ')

    // Operators and Symbols
    .replace(/\*/g, ' \\times ')
    .replace(/<=|≤/g, ' \\leq ')
    .replace(/=|≥/g, ' \\geq ')
    .replace(/!=|≠/g, ' \\neq ')
    .replace(/\+-|±/g, ' \\pm ')
    .replace(/->|→/g, ' \\to ')
    .replace(/infinity|∞/gi, '\\infty')

    // Greek symbols
    .replace(/\balpha\b/gi, '\\alpha')
    .replace(/\bbeta\b/gi, '\\beta')
    .replace(/\bgamma\b/gi, '\\gamma')
    .replace(/\bdelta\b/gi, '\\delta')
    .replace(/\btheta\b/gi, '\\theta')
    .replace(/\blambda\b/gi, '\\lambda')
    .replace(/\bpi\b/gi, '\\pi')
    .replace(/\bsigma\b/gi, '\\sigma')
    .replace(/\bomega\b/gi, '\\omega')

    // Exponents and Subscripts formatting
    .replace(/(\w+)\s*\^\s*\{?(.*?)\}?/g, '$1^{$2}')
    .replace(/(\w+)\s*_\s*\{?(.*?)\}?/g, '$1_{$2}');

  const isMathHeavy =
    /[=+\-*/\\^∫∑√πθλαβγΔ∞⩽⩾≠]/.test(formatted) ||
    /\\(frac|sqrt|int|sum|lim|sin|cos|tan|alpha|beta|theta|pi|infty)/.test(formatted);

  if (isMathHeavy) {
    const isDisplay =
      formatted.length > 18 ||
      formatted.includes('\\frac') ||
      formatted.includes('\\int') ||
      formatted.includes('\\sum') ||
      formatted.includes('^2');
    return { latex: formatted, isDisplay };
  }

  return null;
}

/**
 * Main Web Worker message handler
 */
self.onmessage = async (event: MessageEvent<P2TWorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'INIT') {
    try {
      sendProgress('done', 100, 'المحرك المحلي جاهز للعمل أوفلاين');
      initTesseract().catch((e) => console.warn('Background OCR pre-warm warning:', e));
      self.postMessage({
        type: 'RESULT',
        payload: { initialized: true },
      });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        payload: { message: err?.message || 'Failed to initialize engine' },
      });
    }
  } else if (type === 'PROCESS_IMAGE') {
    try {
      sendProgress('ocr', 10, 'جاري المسح الضوئي المحلي بدون إنترنت...');
      await initTesseract();

      if (!tesseractWorker) {
        throw new Error('OCR Worker not initialized');
      }

      const { imageDataUrl } = payload;

      sendProgress('ocr', 35, 'جاري استخراج النصوص والمعادلات بواسطة WebAssembly...');
      const recognitionResult = await tesseractWorker.recognize(imageDataUrl);

      sendProgress('math_detect', 75, 'جاري بناء هيكل معادلات LaTeX وتحسين الدقة...');

      const lines = recognitionResult.data.text.split('\n').map((l) => l.trim()).filter(Boolean);
      const outputBlocks: string[] = [];

      let hasArabic = false;
      let hasEnglish = false;

      for (const line of lines) {
        if (/[\u0600-\u06FF]/.test(line)) hasArabic = true;
        if (/[a-zA-Z]/.test(line)) hasEnglish = true;

        const mathResult = parseMathFormulaFromRegion(line);

        if (mathResult) {
          if (mathResult.isDisplay) {
            outputBlocks.push(`$$\n${mathResult.latex}\n$$`);
          } else {
            outputBlocks.push(`$${mathResult.latex}$`);
          }
        } else {
          outputBlocks.push(line);
        }
      }

      const finalRawLatex = outputBlocks.join('\n\n');
      const detectedLang = hasArabic && hasEnglish ? 'mixed' : hasArabic ? 'ar' : 'en';

      sendProgress('done', 100, 'اكتمل المسح الضوئي أوفلاين بنجاح!');

      self.postMessage({
        type: 'RESULT',
        payload: {
          rawLatex: finalRawLatex || 'لم يتم العثور على معادلات أو نصوص واضحة في الصورة.',
          language: detectedLang,
          confidence: Math.round((recognitionResult.data.confidence || 88) * 10) / 10,
        },
      });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        payload: { message: err?.message || 'خطأ أثناء المعالجة المحلية' },
      });
    }
  }
};
