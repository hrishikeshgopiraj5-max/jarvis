'use client';

/**
 * MarkdownView — renders parsed markdown blocks as React elements.
 * No HTML injection surface: model output never becomes raw HTML.
 */

import { Fragment, useMemo } from 'react';
import { parseMarkdown, Block, Inline } from '@/lib/markdown';

function InlineRun({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <Fragment key={i}>{n.v}</Fragment>;
          case 'bold': return <strong key={i}><InlineRun nodes={n.v} /></strong>;
          case 'em': return <em key={i}><InlineRun nodes={n.v} /></em>;
          case 'code': return <code key={i}>{n.v}</code>;
          case 'link':
            return <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">{n.v}</a>;
          default: return null;
        }
      })}
    </>
  );
}

export default function MarkdownView({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p': return <p key={i}><InlineRun nodes={b.v} /></p>;
          case 'h1': return <h1 key={i}><InlineRun nodes={b.v} /></h1>;
          case 'h2': return <h2 key={i}><InlineRun nodes={b.v} /></h2>;
          case 'h3': return <h3 key={i}><InlineRun nodes={b.v} /></h3>;
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((item, j) => <li key={j}><InlineRun nodes={item} /></li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((item, j) => <li key={j}><InlineRun nodes={item} /></li>)}
              </ol>
            );
          case 'code':
            return (
              <pre key={i}><code>{b.v}</code></pre>
            );
          case 'quote': return <blockquote key={i}><InlineRun nodes={b.v} /></blockquote>;
          case 'hr': return <hr key={i} />;
          default: return null;
        }
      })}
    </div>
  );
}
