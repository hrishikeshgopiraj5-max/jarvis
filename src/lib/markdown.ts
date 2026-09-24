/**
 * Markdown → typed block parser for ASTRA chat.
 *
 * Deliberately tiny and dependency-free: the mesh models answer with
 * headings, lists, bold/italic/code, blockquotes, hrules, and fenced
 * code — this covers exactly that surface. Renders via React elements
 * (no dangerouslySetInnerHTML), so model output can never inject HTML.
 *
 * Block grammar:
 *   # / ## / ###      → h1/h2/h3
 *   - / * / 1. 2.     → lists (contiguous lines)
 *   >                 → blockquote (contiguous lines)
 *   ```               → fenced code block (verbatim)
 *   --- / ***         → hr
 *   blank line        → block separator
 *   otherwise         → paragraph
 *
 * Inline: **bold** *em* `code` [text](url) — URL schemes whitelisted.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: Inline[] }
  | { t: 'em'; v: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; v: string; href: string };

export type Block =
  | { t: 'p'; v: Inline[] }
  | { t: 'h1' | 'h2' | 'h3'; v: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'quote'; v: Inline[] }
  | { t: 'hr' };

const SAFE_HREF = /^(https?:|mailto:)/i;

// ── Inline parsing ──────────────────────────────────────────────

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) { out.push({ t: 'text', v: buf }); buf = ''; }
  };

  while (i < src.length) {
    // fenced inline code has backticks
    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // bold **…**
    if (src[i] === '*' && src[i + 1] === '*') {
      const end = src.indexOf('**', i + 2);
      if (end > i + 1) {
        flush();
        out.push({ t: 'bold', v: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    // em *…*
    if (src[i] === '*') {
      const end = src.indexOf('*', i + 1);
      if (end > i) {
        const inner = src.slice(i + 1, end);
        if (inner.trim().length > 0 && !inner.includes('\n')) {
          flush();
          out.push({ t: 'em', v: parseInline(inner) });
          i = end + 1;
          continue;
        }
      }
    }
    // link [text](url)
    if (src[i] === '[') {
      const close = src.indexOf('](', i + 1);
      if (close > i) {
        const end = src.indexOf(')', close + 2);
        if (end > close) {
          const label = src.slice(i + 1, close);
          const href = src.slice(close + 2, end);
          if (label && SAFE_HREF.test(href)) {
            flush();
            out.push({ t: 'link', v: label, href });
            i = end + 1;
            continue;
          }
        }
      }
    }
    // & escaping for raw < > to keep React text safe
    if (src[i] === '<') { buf += '&lt;'; i++; continue; }
    if (src[i] === '>') {
      // '> ' at block start is handled by block parser; here escape raw
      buf += '&gt;'; i++; continue;
    }
    buf += src[i];
    i++;
  }
  flush();
  return out;
}

// ── Block parsing ───────────────────────────────────────────────

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ t: 'p', v: parseInline(para.join(' ')) });
      para = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushPara();
      const lang = fence[1] || '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence (or EOF)
      blocks.push({ t: 'code', lang, v: body.join('\n') });
      continue;
    }

    // blank → paragraph break
    if (!line.trim()) { flushPara(); i++; continue; }

    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      const t = h[1].length as 1 | 2 | 3;
      blocks.push({ t: t === 1 ? 'h1' : t === 2 ? 'h2' : 'h3', v: parseInline(h[2]) });
      i++;
      continue;
    }

    // hr
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushPara();
      blocks.push({ t: 'hr' });
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*[-*]\s+/, '')));
        i++;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*\d+[.)]\s+/, '')));
        i++;
      }
      blocks.push({ t: 'ol', items });
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ t: 'quote', v: parseInline(body.join(' ')) });
      continue;
    }

    // paragraph line
    para.push(line.trim());
    i++;
  }
  flushPara();
  return blocks;
}

// ── Plaintext (for TTS + exports) ───────────────────────────────

export function markdownToPlain(src: string): string {
  return src
    .replace(/```[\w]*\n?([\s\S]*?)```/g, ' code block. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/^\s*([-*]|\d+[.)])\s+/gm, '• ')
    .replace(/^>\s?/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
