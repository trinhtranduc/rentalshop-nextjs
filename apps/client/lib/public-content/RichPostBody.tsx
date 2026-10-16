import React from 'react';

type Node = { type?: string; text?: string; content?: Node[]; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[] };
function safeUrl(value: unknown, image = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value) || (!image && /^(mailto:|tel:|#)/i.test(value))) return value;
  return undefined;
}
/** Render stored Tiptap JSON on the server for crawlers; never insert untrusted raw HTML. */
export function RichPostBody({ content }: { content: string }) {
  let document: Node;
  try { document = JSON.parse(content); } catch { return <p>{content}</p>; }
  function render(node: Node, key: number): React.ReactNode {
    if (!node || typeof node !== 'object') return null;
    const children = Array.isArray(node.content) ? node.content.map(render) : undefined;
    if (node.type === 'text') {
      let text: React.ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') text = <strong>{text}</strong>;
        else if (mark.type === 'italic') text = <em>{text}</em>;
        else if (mark.type === 'strike') text = <s>{text}</s>;
        else if (mark.type === 'underline') text = <u>{text}</u>;
        else if (mark.type === 'code') text = <code>{text}</code>;
        else if (mark.type === 'link' && safeUrl(mark.attrs?.href)) text = <a href={safeUrl(mark.attrs?.href)} rel="nofollow noopener">{text}</a>;
      }
      return <React.Fragment key={key}>{text}</React.Fragment>;
    }
    if (node.type === 'image') {
      const src = safeUrl(node.attrs?.src, true);
      return src ? <img key={key} src={src} alt={String(node.attrs?.alt ?? '')} loading="lazy" /> : null;
    }
    if (node.type === 'hardBreak') return <br key={key} />;
    if (node.type === 'horizontalRule') return <hr key={key} />;
    const heading = Math.max(2, Math.min(6, Number(node.attrs?.level) || 2));
    const tags: Record<string, string> = { paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote', codeBlock: 'pre', table: 'table', tableRow: 'tr', tableHeader: 'th', tableCell: 'td' };
    const tag = node.type === 'heading' ? `h${heading}` : tags[node.type ?? ''];
    return tag ? React.createElement(tag, { key }, children) : <React.Fragment key={key}>{children}</React.Fragment>;
  }
  return <>{render(document, 0)}</>;
}
