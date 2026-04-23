import type { ReactNode } from 'react';

// Minimal markdown renderer for coach session notes.
// Handles: # / ## / ### headings, * or - bullets, **bold**.
// Anything fancier (code blocks, links, tables) falls through as plain text
// — intentional: keeps the dependency footprint zero and the output
// predictable.

function renderInline(text: string, keyBase: string): ReactNode[] {
  // Split on **bold** keeping the delimiters.
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*\n]+\*\*$/.test(p)) {
      return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

export default function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let bulletBuffer: ReactNode[] = [];
  let bulletKey = 0;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      nodes.push(
        <ul key={`ul-${bulletKey++}`} className="list-disc pl-6 my-2 space-y-[2px]">
          {bulletBuffer}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    if (/^### /.test(line)) {
      flushBullets();
      nodes.push(
        <h3 key={i} className="font-display text-[17px] leading-[1.2] mt-4 mb-1 text-text">
          {renderInline(line.slice(4), `h3-${i}`)}
        </h3>
      );
    } else if (/^## /.test(line)) {
      flushBullets();
      nodes.push(
        <h2 key={i} className="font-display text-[19px] leading-[1.15] mt-5 mb-1.5 text-text">
          {renderInline(line.slice(3), `h2-${i}`)}
        </h2>
      );
    } else if (/^# /.test(line)) {
      flushBullets();
      nodes.push(
        <h1 key={i} className="font-display text-[22px] leading-[1.1] mt-5 mb-2 text-text">
          {renderInline(line.slice(2), `h1-${i}`)}
        </h1>
      );
    } else if (/^[*\-] /.test(line)) {
      bulletBuffer.push(<li key={i}>{renderInline(line.slice(2), `li-${i}`)}</li>);
    } else if (line.trim() === '') {
      flushBullets();
      // Collapse consecutive blank lines; produce a small spacer.
      if (nodes.length > 0 && nodes[nodes.length - 1] !== null) {
        nodes.push(<div key={`sp-${i}`} className="h-2" />);
      }
    } else {
      flushBullets();
      nodes.push(
        <p key={i} className="leading-[1.55] text-text-secondary">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });
  flushBullets();

  return <div className={`text-[14px] ${className}`}>{nodes}</div>;
}
