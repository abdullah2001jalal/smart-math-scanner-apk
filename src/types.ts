export type AppLanguage = 'en' | 'ar';

export type InputMode = 'upload' | 'camera' | 'pdf' | 'editor';

export type EngineMode = 'local_offline' | 'cloud_ai';

export interface ProcessProgress {
  status: 'idle' | 'downloading' | 'loading_model' | 'ocr' | 'math_detect' | 'done' | 'error';
  progress: number; // 0 to 100
  message: string;
}

export interface MathBlock {
  id: string;
  type: 'text' | 'inline-math' | 'display-math';
  content: string; // Plain text or LaTeX string without delimiters
}

export interface ScanResult {
  id: string;
  timestamp: number;
  title: string;
  sourceType: InputMode;
  imageUrl?: string;
  rawLatex: string;
  blocks: MathBlock[];
  language?: 'en' | 'ar' | 'mixed';
  confidence?: number;
}

export interface ExportOptions {
  documentTitle: string;
  author: string;
  fontSize: number; // pt
  includeImage: boolean;
  paperSize: 'a4' | 'letter';
  docxMathFormat?: 'omml' | 'high-res-image';
}

export interface SavedScan extends ScanResult {
  favorite?: boolean;
}
