import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const SCANNER_MODEL = 'gemini-4-hydrogen';

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Body parser limits for high resolution image scans
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS support for native Android Capacitor WebView origins
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: `Google AI Studio (${SCANNER_MODEL})` });
});

// High Precision Math & Document OCR API Route using AI Studio gemini-4-hydrogen
app.post('/api/scan', async (req, res) => {
  try {
    const { imageDataUrl } = req.body;

    if (!imageDataUrl) {
      return res.status(400).json({ error: 'imageDataUrl is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY missing on server side. Please configure it in Settings > Secrets.',
        fallbackRequired: true,
      });
    }

    // Extract mime type and base64 string
    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let base64Data = imageDataUrl;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else if (imageDataUrl.includes(',')) {
      base64Data = imageDataUrl.split(',')[1];
    }

    const ai = createGeminiClient(apiKey);

    const systemInstruction = `You are a world-class Mathematical OCR and Document Layout Recognition AI.
Analyze the provided image carefully and extract all text and mathematical formulas into textbook-quality LaTeX Markdown format.

STRICT INSTRUCTIONS:
1. Extract ALL mathematical formulas (fractions, square roots, integrals, summations, matrices, limits, powers, subscripts, equations, systems of equations, trigonometric functions, etc.) into pristine LaTeX.
2. Use inline math delimiters $...$ for equations embedded in text.
3. Use display math delimiters $$...$$ for standalone display equations and complex multi-line formulas.
4. Keep original Arabic and English text clear, properly ordered, and formatted.
5. Place stacked equations directly one under another on consecutive lines matching their vertical order in the image. Do NOT add unnecessary empty lines between equations.
6. Do NOT include markdown code fence block backticks (\`\`\`markdown, \`\`\`latex, or \`\`\`), output raw formatted text with LaTeX math directly.
7. If handwritten math is detected, carefully infer symbols and numbers with maximum precision.`;

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: 'Extract all text and mathematical formulas from this image into clean LaTeX Markdown.',
        },
      ],
    };

    let lastError: any = null;
    let response: GenerateContentResponse | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: SCANNER_MODEL,
          contents,
          config: {
            systemInstruction,
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const msg = String(err?.message || '');
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand');

        if (isTransient && attempt < 3) {
          console.warn(
            `Gemini model ${SCANNER_MODEL} returned transient error (attempt ${attempt}/3). Retrying in ${attempt * 1000}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        } else {
          console.error(`Gemini model ${SCANNER_MODEL} failed on attempt ${attempt}:`, msg || err);
          break;
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error(`Failed to generate content from ${SCANNER_MODEL}.`);
    }

    let rawLatex = (response.text || '').trim();
    // Strip accidental markdown code fences if present
    rawLatex = rawLatex
      .replace(/^```(?:markdown|latex|tex)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Simple language detection on output
    const hasArabic = /[\u0600-\u06FF]/.test(rawLatex);
    const hasEnglish = /[a-zA-Z]/.test(rawLatex);
    const detectedLanguage = hasArabic && hasEnglish ? 'mixed' : hasArabic ? 'ar' : 'en';

    return res.json({
      rawLatex,
      language: detectedLanguage,
      confidence: 99.5,
      engine: `Google AI Studio (${SCANNER_MODEL})`,
    });
  } catch (err: any) {
    console.error('Server scan API error:', err);
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status).json({
      error: err?.message || 'Math scan failed',
      fallbackRequired: status >= 500,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v4 route catch-all
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Math Scanner Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
