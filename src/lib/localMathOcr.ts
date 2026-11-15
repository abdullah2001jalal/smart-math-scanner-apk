import Tesseract from 'tesseract.js';
import { ProcessProgress, ScanResult } from '../types';
import { parseTextToMathBlocks } from './latexToOmml';

/**
 * Intelligent LaTeX mathematical formula reconstruction heuristic.
 * Parses raw OCR characters into structured, formatted LaTeX syntax.
 */
export function parseMathFormulaFromRegion(text: string): { latex: string; isDisplay: boolean } | null {
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

export function convertOcrTextToFormattedLatex(rawText: string): { finalRawLatex: string; language: 'ar' | 'en' | 'mixed' } {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const outputBlocks: string[] = [];
  let hasArabic = false;
  let hasEnglish = false;

  for (const line of lines) {
    if (/[\u0600-\u06FF]/.test(line)) hasArabic = true;
    if (/[a-zA-Z]/.test(line)) hasEnglish = true;

    const mathMatch = parseMathFormulaFromRegion(line);
    if (mathMatch) {
      if (mathMatch.isDisplay) {
        outputBlocks.push(`$$\n${mathMatch.latex}\n$$`);
      } else {
        outputBlocks.push(`$${mathMatch.latex}$`);
      }
    } else {
      outputBlocks.push(line);
    }
  }

  const finalRawLatex = outputBlocks.join('\n\n');
  const language = hasArabic && hasEnglish ? 'mixed' : hasArabic ? 'ar' : 'en';

  return { finalRawLatex, language };
}

/**
 * Runs local Tesseract OCR in browser with progress tracking
 */
export async function runLocalTesseractOcr(
  imageDataUrl: string,
  onProgress?: (progress: ProcessProgress) => void
): Promise<{ rawLatex: string; language: 'ar' | 'en' | 'mixed'; confidence: number }> {
  onProgress?.({
    status: 'ocr',
    progress: 30,
    message: 'جاري استخراج وتفسير المعادلة والرموز بالمعالج المحلي...',
  });

  const res = await Tesseract.recognize(imageDataUrl, 'eng+ara', {
    logger: (m) => {
      if (m && typeof m.progress === 'number') {
        const p = Math.min(85, Math.round(30 + m.progress * 55));
        onProgress?.({
          status: 'ocr',
          progress: p,
          message: m.status === 'recognizing text'
            ? 'جاري التعرف على المعادلات والرموز الرياضية...'
            : `تحميل بيانات القراءة أوفلاين: ${Math.round(m.progress * 100)}%`,
        });
      }
    },
  });

  onProgress?.({
    status: 'math_detect',
    progress: 90,
    message: 'جاري تنظيم وبناء معادلات LaTeX...',
  });

  const rawText = res.data.text || '';
  const confidence = Math.round((res.data.confidence || 88) * 10) / 10;
  const { finalRawLatex, language } = convertOcrTextToFormattedLatex(rawText);

  return {
    rawLatex: finalRawLatex || 'لم يتم العثور على نصوص أو معادلات واضحة.',
    language,
    confidence,
  };
}
