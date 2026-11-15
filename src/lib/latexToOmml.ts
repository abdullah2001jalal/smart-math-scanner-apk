import JSZip from 'jszip';
import katex from 'katex';
import temml from 'temml';
import { mml2omml } from 'mathml2omml';
import { MathBlock } from '../types';

// Map common LaTeX command symbols to unicode characters for OMML
const GREEK_AND_SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ',
  psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ',
  Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ',
  Psi: 'Ψ', Omega: 'Ω', infty: '∞', pm: '±', mp: '∓',
  times: '×', div: '÷', cdot: '·', leq: '≤', geq: '≥',
  neq: '≠', approx: '≈', equiv: '≡', partial: '∂', nabla: '∇',
  forall: '∀', exists: '∃', in: '∈', notin: '∉', subset: '⊂',
  subseteq: '⊆', cap: '∩', cup: '∪', rightarrow: '→', leftarrow: '←',
  Rightarrow: '⇒', Leftarrow: '⇐', iff: '⇔', to: '→',
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  log: 'log', ln: 'ln', exp: 'exp', max: 'max', min: 'min', lim: 'lim',
};

// Helper to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Split text containing LaTeX delimiters into MathBlocks.
 * Recognizes $$...$$, \[...\], $...$, and \(...\).
 */
export function parseTextToMathBlocks(rawText: string): MathBlock[] {
  const blocks: MathBlock[] = [];
  let idCounter = 1;

  // Regex for math delimiters
  const pattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)[\s\S]*?\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawText)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      const textPart = rawText.substring(lastIndex, matchIndex);
      if (textPart.length > 0) {
        blocks.push({
          id: `b_${idCounter++}`,
          type: 'text',
          content: textPart,
        });
      }
    }

    const fullMath = match[0];
    let content = fullMath;
    let type: 'display-math' | 'inline-math' = 'inline-math';

    if (fullMath.startsWith('$$') && fullMath.endsWith('$$')) {
      type = 'display-math';
      content = fullMath.slice(2, -2).trim();
    } else if (fullMath.startsWith('\\[') && fullMath.endsWith('\\]')) {
      type = 'display-math';
      content = fullMath.slice(2, -2).trim();
    } else if (fullMath.startsWith('$') && fullMath.endsWith('$')) {
      type = 'inline-math';
      content = fullMath.slice(1, -1).trim();
    } else if (fullMath.startsWith('\\(') && fullMath.endsWith('\\)')) {
      type = 'inline-math';
      content = fullMath.slice(2, -2).trim();
    }

    blocks.push({
      id: `b_${idCounter++}`,
      type,
      content,
    });

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < rawText.length) {
    const trailingText = rawText.substring(lastIndex);
    if (trailingText.length > 0) {
      blocks.push({
        id: `b_${idCounter++}`,
        type: 'text',
        content: trailingText,
      });
    }
  }

  return blocks;
}

/**
 * Convert a LaTeX formula into Microsoft Word OMML (Office Math Markup Language) XML.
 * Uses temml (MathML generator) + mathml2omml for 100% accurate Word math structure.
 */
export function latexToOmml(latex: string, isDisplay = false): string {
  const cleanLatex = latex.trim();
  if (!cleanLatex) return '';

  try {
    const mml = temml.renderToString(cleanLatex, {
      xml: true,
      displayMode: isDisplay,
      throwOnError: false,
    });

    let omml = mml2omml(mml);
    if (isDisplay) {
      if (!omml.includes('<m:oMathPara')) {
        omml = `<m:oMathPara>${omml}</m:oMathPara>`;
      }
    }
    return omml;
  } catch (err) {
    console.warn('temml/mml2omml conversion error, falling back:', err);
    try {
      const ommlBody = convertLatexToOmmlCore(cleanLatex);
      if (isDisplay) {
        return `<m:oMathPara><m:oMath>${ommlBody}</m:oMath></m:oMathPara>`;
      }
      return `<m:oMath>${ommlBody}</m:oMath>`;
    } catch {
      return `<m:oMath><m:r><m:t>${escapeXml(cleanLatex)}</m:t></m:r></m:oMath>`;
    }
  }
}

function convertLatexToOmmlCore(latex: string): string {
  const cleanLatex = latex.trim();
  if (!cleanLatex) return '';

  let xml = '';
  let i = 0;

  while (i < cleanLatex.length) {
    // 1. Fractions \frac{num}{den} or \dfrac{num}{den}
    if (cleanLatex.startsWith('\\frac', i) || cleanLatex.startsWith('\\dfrac', i)) {
      const isDfrac = cleanLatex.startsWith('\\dfrac', i);
      i += isDfrac ? 6 : 5;
      const numResult = extractGroup(cleanLatex, i);
      i = numResult.nextIndex;
      const denResult = extractGroup(cleanLatex, i);
      i = denResult.nextIndex;

      const numXml = convertLatexToOmmlCore(numResult.content);
      const denXml = convertLatexToOmmlCore(denResult.content);

      xml += `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${numXml}</m:num><m:den>${denXml}</m:den></m:f>`;
      continue;
    }

    // 2. Radicals \sqrt{body} or \sqrt[deg]{body}
    if (cleanLatex.startsWith('\\sqrt', i)) {
      i += 5;
      let degXml = '';
      if (cleanLatex[i] === '[') {
        const degClose = cleanLatex.indexOf(']', i);
        if (degClose !== -1) {
          const degContent = cleanLatex.substring(i + 1, degClose);
          degXml = convertLatexToOmmlCore(degContent);
          i = degClose + 1;
        }
      }

      const bodyResult = extractGroup(cleanLatex, i);
      i = bodyResult.nextIndex;
      const bodyXml = convertLatexToOmmlCore(bodyResult.content);

      if (degXml) {
        xml += `<m:rad><m:deg>${degXml}</m:deg><m:e>${bodyXml}</m:e></m:rad>`;
      } else {
        xml += `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${bodyXml}</m:e></m:rad>`;
      }
      continue;
    }

    // 3. Matrices & Cases \begin{matrix}, \begin{pmatrix}, \begin{bmatrix}, \begin{cases}
    if (cleanLatex.startsWith('\\begin{', i)) {
      const endEnvIdx = cleanLatex.indexOf('}', i + 7);
      if (endEnvIdx !== -1) {
        const envName = cleanLatex.substring(i + 7, endEnvIdx);
        const endPattern = `\\end{${envName}}`;
        const endIdx = cleanLatex.indexOf(endPattern, endEnvIdx);
        if (endIdx !== -1) {
          const innerContent = cleanLatex.substring(endEnvIdx + 1, endIdx);
          i = endIdx + endPattern.length;

          const rows = innerContent.split('\\\\');
          let matrixRowsXml = '';

          for (const row of rows) {
            const cols = row.split('&');
            let rowXml = '';
            for (const col of cols) {
              rowXml += `<m:e>${convertLatexToOmmlCore(col.trim())}</m:e>`;
            }
            matrixRowsXml += `<m:mr>${rowXml}</m:mr>`;
          }

          let matrixXml = `<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="${rows[0]?.split('&').length || 1}"/></m:mcPr></m:mc></m:mcs></m:mPr>${matrixRowsXml}</m:m>`;

          if (envName === 'pmatrix') {
            xml += `<m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>${matrixXml}</m:e></m:d>`;
          } else if (envName === 'bmatrix') {
            xml += `<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr><m:e>${matrixXml}</m:e></m:d>`;
          } else if (envName === 'cases') {
            xml += `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>${matrixXml}</m:e></m:d>`;
          } else {
            xml += matrixXml;
          }
          continue;
        }
      }
    }

    // 4. Summations, Integrals, Products, Limits
    if (
      cleanLatex.startsWith('\\sum', i) ||
      cleanLatex.startsWith('\\int', i) ||
      cleanLatex.startsWith('\\iint', i) ||
      cleanLatex.startsWith('\\prod', i) ||
      cleanLatex.startsWith('\\lim', i)
    ) {
      let char = '∑';
      let cmdLen = 4;
      if (cleanLatex.startsWith('\\int', i)) {
        char = '∫';
      } else if (cleanLatex.startsWith('\\iint', i)) {
        char = '∬';
        cmdLen = 5;
      } else if (cleanLatex.startsWith('\\prod', i)) {
        char = '∏';
      } else if (cleanLatex.startsWith('\\lim', i)) {
        char = 'lim';
      }

      i += cmdLen;

      let subXml = '';
      let supXml = '';

      while (i < cleanLatex.length && (cleanLatex[i] === '_' || cleanLatex[i] === '^')) {
        if (cleanLatex[i] === '_') {
          i++;
          const subRes = extractGroup(cleanLatex, i);
          i = subRes.nextIndex;
          subXml = convertLatexToOmmlCore(subRes.content);
        } else if (cleanLatex[i] === '^') {
          i++;
          const supRes = extractGroup(cleanLatex, i);
          i = supRes.nextIndex;
          supXml = convertLatexToOmmlCore(supRes.content);
        }
      }

      // Extract subsequent expression for n-ary body
      const bodyRes = extractGroup(cleanLatex, i);
      let bodyXml = '';
      if (bodyRes.content) {
        i = bodyRes.nextIndex;
        bodyXml = convertLatexToOmmlCore(bodyRes.content);
      }

      xml += `<m:nary><m:naryPr><m:chr m:val="${escapeXml(char)}"/><m:limLoc m:val="undOvr"/></m:naryPr><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup><m:e>${bodyXml}</m:e></m:nary>`;
      continue;
    }

    // 5. Subscript / Superscript handling on base
    if (cleanLatex[i] === '_' || cleanLatex[i] === '^') {
      let subXml = '';
      let supXml = '';

      while (i < cleanLatex.length && (cleanLatex[i] === '_' || cleanLatex[i] === '^')) {
        if (cleanLatex[i] === '_') {
          i++;
          const subRes = extractGroup(cleanLatex, i);
          i = subRes.nextIndex;
          subXml = convertLatexToOmmlCore(subRes.content);
        } else if (cleanLatex[i] === '^') {
          i++;
          const supRes = extractGroup(cleanLatex, i);
          i = supRes.nextIndex;
          supXml = convertLatexToOmmlCore(supRes.content);
        }
      }

      // Try to wrap previous xml snippet or create subscript/superscript element
      if (subXml && supXml) {
        xml = `<m:sSubSup><m:e>${xml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
      } else if (subXml) {
        xml = `<m:sSub><m:e>${xml}</m:e><m:sub>${subXml}</m:sub></m:sSub>`;
      } else if (supXml) {
        xml = `<m:sSup><m:e>${xml}</m:e><m:sup>${supXml}</m:sup></m:sSup>`;
      }
      continue;
    }

    // 6. LaTeX Text mode \text{...} or \mathrm{...}
    if (cleanLatex.startsWith('\\text', i) || cleanLatex.startsWith('\\mathrm', i)) {
      const isText = cleanLatex.startsWith('\\text', i);
      i += isText ? 5 : 7;
      const textRes = extractGroup(cleanLatex, i);
      i = textRes.nextIndex;
      xml += `<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${escapeXml(textRes.content)}</m:t></m:r>`;
      continue;
    }

    // 7. Generic Command \alpha, \pm, \matrix, etc.
    if (cleanLatex[i] === '\\') {
      let cmd = '';
      let j = i + 1;
      while (j < cleanLatex.length && /[a-zA-Z]/.test(cleanLatex[j])) {
        cmd += cleanLatex[j];
        j++;
      }
      if (cmd) {
        i = j;
        if (GREEK_AND_SYMBOLS[cmd]) {
          xml += `<m:r><m:t>${escapeXml(GREEK_AND_SYMBOLS[cmd])}</m:t></m:r>`;
        } else {
          xml += `<m:r><m:t>${escapeXml('\\' + cmd)}</m:t></m:r>`;
        }
        continue;
      }
    }

    // 8. Grouping braces { ... }
    if (cleanLatex[i] === '{') {
      const grp = extractGroup(cleanLatex, i);
      i = grp.nextIndex;
      xml += convertLatexToOmmlCore(grp.content);
      continue;
    }

    // 9. Plain literal character
    const c = cleanLatex[i];
    if (c !== '}') {
      xml += `<m:r><m:t>${escapeXml(c)}</m:t></m:r>`;
    }
    i++;
  }

  return xml;
}

function extractGroup(str: string, startIndex: number): { content: string; nextIndex: number } {
  let i = startIndex;
  while (i < str.length && /\s/.test(str[i])) i++;

  if (i >= str.length) return { content: '', nextIndex: i };

  if (str[i] === '{') {
    let depth = 1;
    let start = i + 1;
    i++;
    while (i < str.length && depth > 0) {
      if (str[i] === '{' && str[i - 1] !== '\\') depth++;
      else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
      i++;
    }
    return { content: str.substring(start, i - 1), nextIndex: i };
  } else {
    // Single character argument
    return { content: str[i], nextIndex: i + 1 };
  }
}

/**
 * Helper to extract KaTeX CSS rules without external font url() references that taint SVG canvases.
 */
function getInlineKatexCss(): string {
  let cssText = '';
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        if (sheet.cssRules) {
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j];
            if (rule.cssText.includes('katex') && !rule.cssText.includes('url(')) {
              cssText += rule.cssText + '\n';
            }
          }
        }
      } catch {
        // Cross-origin stylesheet protection
      }
    }
  } catch {
    // Ignore
  }

  if (!cssText) {
    cssText = `
      .katex { font-family: 'Times New Roman', serif; line-height: 1.2; text-indent: 0; }
      .katex .katex-html { display: inline-block; }
      .katex .base { display: inline-block; }
      .katex .mord { display: inline-block; }
      .katex .mbin { display: inline-block; margin: 0 0.22222em; }
      .katex .mrel { display: inline-block; margin: 0 0.27778em; }
      .katex .mop { display: inline-block; }
      .katex .frac-line { border-bottom-width: 0.04em; border-bottom-style: solid; display: inline-block; width: 100%; }
      .katex .mfrac { display: inline-flex; flex-direction: column; vertical-align: -0.5em; text-align: center; }
    `;
  }
  return cssText;
}

/**
 * Render KaTeX LaTeX formula to high-resolution PNG image Data URL using Canvas
 */
export async function renderKatexToPng(
  latex: string,
  isDisplay: boolean
): Promise<{ dataUrl: string; widthPt: number; heightPt: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const htmlStr = katex.renderToString(latex, {
      displayMode: isDisplay,
      throwOnError: false,
    });

    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.style.visibility = 'hidden';
    div.style.display = 'inline-block';
    div.style.fontSize = isDisplay ? '22px' : '18px';
    div.style.padding = '6px 12px';
    div.style.color = '#000000';
    div.style.background = '#ffffff';
    div.innerHTML = htmlStr;

    document.body.appendChild(div);
    const rect = div.getBoundingClientRect();
    const width = Math.max(Math.ceil(rect.width) + 16, 40);
    const height = Math.max(Math.ceil(rect.height) + 12, 24);
    document.body.removeChild(div);

    const katexCss = getInlineKatexCss();
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${katexCss}
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff; color:#000000; font-size:${isDisplay ? '22px' : '18px'}; padding:4px 8px; font-family:serif;">
          ${htmlStr}
        </div>
      </foreignObject>
    </svg>`;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            const dataUrl = canvas.toDataURL('image/png');
            resolve({
              dataUrl,
              widthPt: Math.round(width * 0.75),
              heightPt: Math.round(height * 0.75),
            });
          } else {
            URL.revokeObjectURL(url);
            resolve(null);
          }
        } catch (err) {
          console.warn('Canvas export failed due to security/taint:', err);
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (err) {
    console.warn('KaTeX PNG render fallback triggered:', err);
    return null;
  }
}

interface DocxRun {
  type: 'text' | 'math';
  xml: string;
  isArabic?: boolean;
}

/**
 * Generate a complete Microsoft Word .docx Blob with embedded OMML math equations
 * or high-resolution rendered equation images, preserving exact positioning.
 */
export async function generateDocxBlob(
  title: string,
  rawLatexOrMarkdown: string,
  options?: { mathFormat?: 'omml' | 'high-res-image'; fontSize?: number }
): Promise<Blob> {
  const blocks = parseTextToMathBlocks(rawLatexOrMarkdown);
  const mathFormat = options?.mathFormat || 'omml';

  let documentXmlContent = '';
  let currentParaRuns: DocxRun[] = [];

  const mediaFiles: { id: number; dataUrl: string }[] = [];
  let imageCounter = 1;

  const flushParagraph = () => {
    if (currentParaRuns.length === 0) {
      return;
    }

    const hasArabic = currentParaRuns.some((r) => r.isArabic);
    const pPr = hasArabic
      ? `<w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>`
      : `<w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>`;

    const innerXml = currentParaRuns.map((r) => r.xml).join('');
    documentXmlContent += `<w:p>${pPr}${innerXml}</w:p>`;
    currentParaRuns = [];
  };

  const createDrawingXml = (imgId: number, widthPt: number, heightPt: number): string => {
    const cx = Math.round(widthPt * 12700);
    const cy = Math.round(heightPt * 12700);

    return `<w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:docPr id="${imgId}" name="Math Equation ${imgId}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${imgId}" name="math_eq_${imgId}.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="rIdImg${imgId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${cx}" cy="${cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>`;
  };

  const displayPPr = `<w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr>`;

  for (const block of blocks) {
    if (block.type === 'display-math') {
      flushParagraph();

      if (mathFormat === 'high-res-image') {
        const rendered = await renderKatexToPng(block.content, true);
        if (rendered) {
          const imgId = imageCounter++;
          mediaFiles.push({ id: imgId, dataUrl: rendered.dataUrl });
          const drawingXml = createDrawingXml(imgId, rendered.widthPt, rendered.heightPt);
          documentXmlContent += `<w:p>${displayPPr}${drawingXml}</w:p>`;
        } else {
          const omml = latexToOmml(block.content, true);
          documentXmlContent += `<w:p>${displayPPr}${omml}</w:p>`;
        }
      } else {
        const omml = latexToOmml(block.content, true);
        documentXmlContent += `<w:p>${displayPPr}${omml}</w:p>`;
      }

    } else if (block.type === 'inline-math') {
      if (mathFormat === 'high-res-image') {
        const rendered = await renderKatexToPng(block.content, false);
        if (rendered) {
          const imgId = imageCounter++;
          mediaFiles.push({ id: imgId, dataUrl: rendered.dataUrl });
          const drawingXml = createDrawingXml(imgId, rendered.widthPt, rendered.heightPt);
          currentParaRuns.push({ type: 'math', xml: drawingXml });
        } else {
          const omml = latexToOmml(block.content, false);
          currentParaRuns.push({ type: 'math', xml: omml });
        }
      } else {
        const omml = latexToOmml(block.content, false);
        currentParaRuns.push({ type: 'math', xml: omml });
      }

    } else if (block.type === 'text') {
      const lines = block.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          if (currentParaRuns.length > 0) {
            flushParagraph();
          }
          const isArabic = /[\u0600-\u06FF]/.test(line);
          currentParaRuns.push({
            type: 'text',
            xml: `<w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`,
            isArabic,
          });
        }
      }
    }
  }

  if (currentParaRuns.length > 0) {
    flushParagraph();
  }

  if (!documentXmlContent) {
    documentXmlContent = `<w:p><w:r><w:t>Empty Document</w:t></w:r></w:p>`;
  }

  const isTitleArabic = /[\u0600-\u06FF]/.test(title);
  const titlePPr = isTitleArabic
    ? `<w:pPr><w:pStyle w:val="Heading1"/><w:bidi/><w:jc w:val="center"/></w:pPr>`
    : `<w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      ${titlePPr}
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${documentXmlContent}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  let imageRelsXml = '';
  for (const media of mediaFiles) {
    imageRelsXml += `<Relationship Id="rIdImg${media.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${media.id}.png"/>\n`;
  }

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRelsXml}
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);

  for (const media of mediaFiles) {
    const base64Data = media.dataUrl.replace(/^data:image\/png;base64,/, '');
    zip.file(`word/media/image${media.id}.png`, base64Data, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
