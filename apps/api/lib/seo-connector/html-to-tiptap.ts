/**
 * #1665 SEO Agent Hub connector: the draft `body` arrives as HTML, `Post.content` is TipTap JSON (a string).
 *
 * Only the nodes the admin editor can store and `RichPostBody` can draw are produced: paragraph, heading 2-6, bullet and
 * ordered list, blockquote, code block, horizontal rule, hard break, inline image, table (row, header, cell) and the marks
 * bold, italic, underline, strike, code, subscript, superscript, link. Everything else is flattened to its text; script,
 * style, iframe, forms and the like are dropped with their content. Links accept http(s), site-relative, mailto, tel and
 * `#`; images accept http(s) and site-relative addresses (the same rules as the public renderer), so no raw HTML ever
 * reaches a page. Pure: no I/O.
 */
import { parseDocument } from 'htmlparser2';

export type TipTapMark = { type: string; attrs?: Record<string, unknown> };
export type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
};

/** Thrown when the body is too big or too deep to convert; the route answers `invalid`. */
export class BodyTooComplexError extends Error {}

const MAX_NODES = 50_000;
const MAX_DEPTH = 40;

interface HtmlNode {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
}

/** Removed with everything inside them. */
const DROP = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'noscript', 'template',
  'svg', 'canvas', 'audio', 'video', 'head', 'title', 'meta', 'link', 'base', 'frame', 'frameset', 'applet',
]);

const INLINE = new Set([
  'a', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code', 'sup', 'sub', 'span', 'small', 'mark', 'abbr', 'cite',
  'time', 'label', 'font', 'big', 'ins', 'kbd', 'samp', 'var', 'q', 'br', 'img', 'bdi', 'bdo', 'data', 'dfn', 'wbr',
]);

const MARK_BY_TAG: Record<string, string> = {
  strong: 'bold', b: 'bold', em: 'italic', i: 'italic', u: 'underline', s: 'strike', strike: 'strike', del: 'strike',
  code: 'code', sup: 'superscript', sub: 'subscript',
};

/** Same rules as `safeUrl` in `apps/client/lib/public-content/RichPostBody.tsx`. */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v) || /^(mailto:|tel:|#)/i.test(v)) return v;
  return undefined;
}
export function safeImageSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v) ? v : undefined;
}

class Converter {
  private nodes = 0;

  private count(): void {
    if (++this.nodes > MAX_NODES) throw new BodyTooComplexError('Body has too many elements.');
  }

  private text(value: string, marks: TipTapMark[]): TipTapNode {
    this.count();
    const node: TipTapNode = { type: 'text', text: value };
    if (marks.length) node.marks = marks.map((m) => ({ ...m }));
    return node;
  }

  /** Inline content of a run of HTML nodes (text with marks, hard breaks, inline images). */
  inline(children: HtmlNode[] | undefined, marks: TipTapMark[], out: TipTapNode[], depth: number): void {
    if (depth > MAX_DEPTH) throw new BodyTooComplexError('Body is nested too deeply.');
    for (const child of children ?? []) {
      if (child.type === 'text') {
        const value = (child.data ?? '').replace(/\s+/g, ' ');
        if (value) out.push(this.text(value, marks));
        continue;
      }
      if (child.type !== 'tag') continue;
      const name = (child.name ?? '').toLowerCase();
      if (DROP.has(name)) continue;
      if (name === 'br') {
        this.count();
        out.push({ type: 'hardBreak' });
      } else if (name === 'img') {
        const src = safeImageSrc(child.attribs?.src);
        if (src) {
          this.count();
          const attrs: Record<string, unknown> = { src, alt: (child.attribs?.alt ?? '').slice(0, 300) };
          if (child.attribs?.title) attrs.title = child.attribs.title.slice(0, 300);
          out.push({ type: 'image', attrs });
        }
      } else if (name === 'a') {
        const href = safeHref(child.attribs?.href);
        this.inline(child.children, href ? [...marks, { type: 'link', attrs: { href } }] : marks, out, depth + 1);
      } else if (MARK_BY_TAG[name]) {
        this.inline(child.children, [...marks, { type: MARK_BY_TAG[name] }], out, depth + 1);
      } else {
        // span, small, mark... and any block tag met inside inline content: keep the text, drop the tag
        this.inline(child.children, marks, out, depth + 1);
        if (!INLINE.has(name) && out.length && out[out.length - 1].type === 'text') {
          const last = out[out.length - 1];
          if (last.text && !last.text.endsWith(' ')) out.push(this.text(' ', marks));
        }
      }
    }
  }

  /** A paragraph from inline nodes: edges trimmed, empty text removed; null when nothing is left. */
  paragraph(inline: TipTapNode[]): TipTapNode | null {
    const content = inline.filter((n) => n.type !== 'text' || (n.text ?? '').length > 0);
    while (content.length && content[0].type === 'text' && !content[0].text!.trim()) content.shift();
    while (content.length && content[content.length - 1].type === 'text' && !content[content.length - 1].text!.trim()) content.pop();
    if (content.length && content[0].type === 'text') content[0] = { ...content[0], text: content[0].text!.replace(/^\s+/, '') };
    const last = content.length - 1;
    if (last >= 0 && content[last].type === 'text') content[last] = { ...content[last], text: content[last].text!.replace(/\s+$/, '') };
    if (!content.length) return null;
    this.count();
    return { type: 'paragraph', content };
  }

  /** Block content of a run of HTML nodes. Loose inline content between blocks becomes paragraphs. */
  blocks(children: HtmlNode[] | undefined, depth: number): TipTapNode[] {
    if (depth > MAX_DEPTH) throw new BodyTooComplexError('Body is nested too deeply.');
    const out: TipTapNode[] = [];
    let buffer: TipTapNode[] = [];
    const flush = () => {
      const p = this.paragraph(buffer);
      if (p) out.push(p);
      buffer = [];
    };
    for (const child of children ?? []) {
      if (child.type === 'text') {
        this.inline([child], [], buffer, depth + 1);
        continue;
      }
      if (child.type !== 'tag') continue;
      const name = (child.name ?? '').toLowerCase();
      if (DROP.has(name)) continue;
      if (INLINE.has(name)) {
        this.inline([child], [], buffer, depth + 1);
        continue;
      }
      flush();
      out.push(...this.block(child, name, depth + 1));
    }
    flush();
    return out;
  }

  private block(node: HtmlNode, name: string, depth: number): TipTapNode[] {
    if (/^h[1-6]$/.test(name)) {
      const inline: TipTapNode[] = [];
      this.inline(node.children, [], inline, depth + 1);
      const p = this.paragraph(inline);
      if (!p) return [];
      this.count();
      return [{ type: 'heading', attrs: { level: Math.max(2, Number(name[1])) }, content: p.content }];
    }
    switch (name) {
      case 'p':
      case 'figcaption':
      case 'dt':
      case 'dd':
      case 'summary': {
        const inline: TipTapNode[] = [];
        this.inline(node.children, [], inline, depth + 1);
        const p = this.paragraph(inline);
        return p ? [p] : [];
      }
      case 'ul':
      case 'ol': {
        const items: TipTapNode[] = [];
        for (const li of node.children ?? []) {
          if (li.type !== 'tag' || (li.name ?? '').toLowerCase() !== 'li') continue;
          const content = this.blocks(li.children, depth + 1);
          this.count();
          items.push({ type: 'listItem', content: content.length ? content : [{ type: 'paragraph' }] });
        }
        if (!items.length) return [];
        this.count();
        return [{ type: name === 'ul' ? 'bulletList' : 'orderedList', content: items }];
      }
      case 'blockquote': {
        const content = this.blocks(node.children, depth + 1);
        if (!content.length) return [];
        this.count();
        return [{ type: 'blockquote', content }];
      }
      case 'pre': {
        const text = plainText(node).replace(/^\n+|\n+$/g, '');
        if (!text) return [];
        this.count();
        return [{ type: 'codeBlock', content: [this.text(text, [])] }];
      }
      case 'hr':
        this.count();
        return [{ type: 'horizontalRule' }];
      case 'table':
        return this.table(node, depth + 1);
      default:
        // div, section, article, figure, thead/tbody outside a table... : transparent container
        return this.blocks(node.children, depth + 1);
    }
  }

  private table(node: HtmlNode, depth: number): TipTapNode[] {
    const rows: HtmlNode[] = [];
    const collect = (parent: HtmlNode) => {
      for (const c of parent.children ?? []) {
        if (c.type !== 'tag') continue;
        const n = (c.name ?? '').toLowerCase();
        if (n === 'tr') rows.push(c);
        else if (n === 'thead' || n === 'tbody' || n === 'tfoot') collect(c);
      }
    };
    collect(node);
    const tableRows: TipTapNode[] = [];
    for (const tr of rows) {
      const cells: TipTapNode[] = [];
      for (const cell of tr.children ?? []) {
        if (cell.type !== 'tag') continue;
        const n = (cell.name ?? '').toLowerCase();
        if (n !== 'td' && n !== 'th') continue;
        const content = this.blocks(cell.children, depth + 1);
        this.count();
        cells.push({ type: n === 'th' ? 'tableHeader' : 'tableCell', content: content.length ? content : [{ type: 'paragraph' }] });
      }
      if (cells.length) {
        this.count();
        tableRows.push({ type: 'tableRow', content: cells });
      }
    }
    if (!tableRows.length) return [];
    this.count();
    return [{ type: 'table', content: tableRows }];
  }
}

function plainText(node: HtmlNode): string {
  if (node.type === 'text') return node.data ?? '';
  if (node.type !== 'tag') return '';
  if (DROP.has((node.name ?? '').toLowerCase())) return '';
  if ((node.name ?? '').toLowerCase() === 'br') return '\n';
  return (node.children ?? []).map(plainText).join('');
}

/** HTML -> TipTap document. An empty or text-less body gives a document with one empty paragraph. */
export function htmlToTipTap(html: string): TipTapNode {
  const dom = parseDocument(html, { decodeEntities: true, lowerCaseTags: true }) as unknown as HtmlNode;
  const content = new Converter().blocks(dom.children, 0);
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/** Words of the visible text of a TipTap document (images and marks ignored); used by the checks and the tests. */
export function tipTapText(node: TipTapNode): string {
  if (node.type === 'text') return node.text ?? '';
  const parts = (node.content ?? []).map(tipTapText);
  return ['paragraph', 'heading', 'listItem', 'tableRow'].includes(node.type) ? parts.join(' ') + '\n' : parts.join(' ');
}
