import type { ReactNode } from 'react';

// Turns bare URLs inside plain message text into clickable links.
// Matches http(s):// and www.-prefixed URLs only — no bare "example.com",
// which produces too many false positives on ordinary sentences.
//
// target="_blank" is what makes this work in the Capacitor wrapper too:
// both the iOS and Android bridges hand off-origin navigations to the
// system browser, so the webview never leaves the app.

const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;

// An explicit scheme is enough on its own; a bare www. match still needs a
// host that looks like a host (something.tld) after trailing punctuation is off.
const LOOKS_LIKE_URL = /^https?:\/\/\S/i;
const LOOKS_LIKE_HOST = /^[^\s/]+\.[a-z]{2,}(?:[/:?#]|$)/i;

// Trailing punctuation usually belongs to the sentence, not the URL.
// A closing bracket only counts as part of the URL if it was opened inside it.
function trimTrailing(url: string): string {
  let end = url.length;
  while (end > 0) {
    const ch = url[end - 1];
    if ('.,;:!?"\'<>'.includes(ch)) { end -= 1; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      const open = ch === ')' ? '(' : ch === ']' ? '[' : '{';
      const slice = url.slice(0, end);
      let opens = 0;
      let closes = 0;
      for (const c of slice) {
        if (c === open) opens += 1;
        else if (c === ch) closes += 1;
      }
      if (closes > opens) { end -= 1; continue; }
    }
    break;
  }
  return url.slice(0, end);
}

export default function Linkify({ text }: { text: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(URL_RE)) {
    const raw = trimTrailing(match[0]);
    if (!raw) continue;
    if (!LOOKS_LIKE_URL.test(raw) && !LOOKS_LIKE_HOST.test(raw)) continue;
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="underline underline-offset-2 break-words hover:opacity-70 transition-opacity"
      >
        {raw}
      </a>
    );
    cursor = start + raw.length;
  }

  if (cursor === 0) return text;
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
