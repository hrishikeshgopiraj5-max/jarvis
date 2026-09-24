import { describe, expect, test } from 'bun:test';
import { parseMarkdown, parseInline, markdownToPlain } from '../markdown';

describe('markdown parser', () => {
  test('headings, paragraphs, hr', () => {
    const b = parseMarkdown('# Title\n\nSome text.\n\n---\n### Sub');
    expect(b.map(x => x.t)).toEqual(['h1', 'p', 'hr', 'h3']);
  });

  test('lists', () => {
    const b = parseMarkdown('- alpha\n- beta\n\n1. one\n2. two');
    expect(b[0].t).toBe('ul');
    if (b[0].t === 'ul') expect(b[0].items.length).toBe(2);
    expect(b[1].t).toBe('ol');
    if (b[1].t === 'ol') expect(b[1].items[1][0].v).toBe('two');
  });

  test('fenced code preserves content verbatim', () => {
    const b = parseMarkdown('```python\nx = 1 < 2\nprint(x)\n```');
    expect(b[0].t).toBe('code');
    expect((b[0] as { lang: string }).lang).toBe('python');
    expect((b[0] as { v: string }).v).toBe('x = 1 < 2\nprint(x)');
  });

  test('blockquote groups contiguous lines', () => {
    const b = parseMarkdown('> line one\n> line two');
    expect(b[0].t).toBe('quote');
  });

  test('inline: bold, em, code, link with safe schemes only', () => {
    const out = parseInline('**bold** and *em* and `code` and [site](https://x.y)');
    expect(out.map(o => o.t)).toEqual(['bold', 'text', 'em', 'text', 'code', 'text', 'link']);
    const bad = parseInline('[click](javascript:alert(1))');
    // unsafe href → not a link, stays literal text
    expect(bad.some(o => o.t === 'link')).toBe(false);
  });

  test('angle brackets are escaped in text nodes', () => {
    const out = parseInline('a < b');
    expect(out[0].v).toBe('a &lt; b');
  });

  test('plain text conversion for TTS', () => {
    const p = markdownToPlain('## Heading\n\n**Bold** and `code` and [link](https://x.y)\n- item one\n- item two');
    expect(p).toContain('Heading');
    expect(p).toContain('Bold');
    expect(p).toContain('• item one');
    expect(p).not.toContain('**');
    expect(p).not.toContain('https://x.y');
  });
});
