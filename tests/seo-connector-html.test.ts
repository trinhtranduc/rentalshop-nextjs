/**
 * #1665 SEO Agent Hub connector: HTML body of a draft -> TipTap JSON (`Post.content`).
 * Only nodes the admin editor stores and the public renderer draws; no raw HTML survives.
 */
import { BodyTooComplexError, htmlToTipTap, safeHref, safeImageSrc, tipTapText } from '../apps/api/lib/seo-connector/html-to-tiptap';

const types = (node: any): string[] => [node.type, ...(node.content ?? []).flatMap(types)];

describe('htmlToTipTap', () => {
  it('turns headings, paragraphs and marks into TipTap nodes (h1 becomes level 2)', () => {
    const doc = htmlToTipTap('<h1>Tiêu đề</h1><h3>Phần nhỏ</h3><p>Xin <strong>chào</strong> và <em>cảm ơn</em></p>');
    expect(doc.type).toBe('doc');
    expect(doc.content![0]).toEqual({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tiêu đề' }] });
    expect(doc.content![1]).toMatchObject({ type: 'heading', attrs: { level: 3 } });
    const p = doc.content![2];
    expect(p.type).toBe('paragraph');
    expect(p.content).toEqual([
      { type: 'text', text: 'Xin ' },
      { type: 'text', text: 'chào', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' và ' },
      { type: 'text', text: 'cảm ơn', marks: [{ type: 'italic' }] },
    ]);
  });

  it('builds bullet and ordered lists with list items holding paragraphs, and nested lists', () => {
    const doc = htmlToTipTap('<ul><li>Một</li><li>Hai<ul><li>Hai a</li></ul></li></ul><ol><li><p>Ba</p></li></ol>');
    expect(doc.content![0].type).toBe('bulletList');
    expect(doc.content![0].content![0]).toEqual({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Một' }] }] });
    expect(types(doc.content![0].content![1])).toEqual(expect.arrayContaining(['listItem', 'paragraph', 'bulletList']));
    expect(doc.content![1].type).toBe('orderedList');
  });

  it('keeps tables with header and body cells; every cell holds at least one paragraph', () => {
    const doc = htmlToTipTap('<table><thead><tr><th>Gói</th><th>Giá</th></tr></thead><tbody><tr><td>Basic</td><td></td></tr></tbody></table>');
    const table = doc.content![0];
    expect(table.type).toBe('table');
    expect(table.content!.map((r) => r.type)).toEqual(['tableRow', 'tableRow']);
    expect(table.content![0].content!.map((c) => c.type)).toEqual(['tableHeader', 'tableHeader']);
    expect(table.content![1].content![1]).toEqual({ type: 'tableCell', content: [{ type: 'paragraph' }] });
  });

  it('keeps safe links and drops the link (not the text) for javascript: and data: addresses', () => {
    const doc = htmlToTipTap(
      '<p><a href="https://anyrent.shop/pricing">giá</a> <a href="/features">tính năng</a> <a href="javascript:alert(1)">xấu</a> <a href="data:text/html,x">data</a> <a href="//evil.example">cdn</a></p>'
    );
    const nodes = doc.content![0].content!;
    const linkOf = (text: string) => nodes.find((n) => n.text === text)!.marks?.find((m) => m.type === 'link')?.attrs?.href;
    expect(linkOf('giá')).toBe('https://anyrent.shop/pricing');
    expect(linkOf('tính năng')).toBe('/features');
    expect(linkOf('xấu')).toBeUndefined();
    expect(linkOf('data')).toBeUndefined();
    expect(linkOf('cdn')).toBeUndefined();
    expect(nodes.some((n) => n.text === 'xấu')).toBe(true);
  });

  it('puts an image inline in its paragraph and refuses unsafe sources', () => {
    const doc = htmlToTipTap('<p>Ảnh: <img src="https://cdn.example/a.jpg" alt="Cửa hàng"></p><p><img src="javascript:x"><img src="data:image/png;base64,AAA"></p>');
    expect(doc.content![0].content![1]).toEqual({ type: 'image', attrs: { src: 'https://cdn.example/a.jpg', alt: 'Cửa hàng' } });
    expect(JSON.stringify(doc)).not.toMatch(/javascript|base64/);
    expect(doc.content!.length).toBe(1); // the paragraph with only refused images is empty and dropped
  });

  it('drops script, style, iframe and forms with their content, and event attributes never survive', () => {
    const doc = htmlToTipTap(
      '<p onclick="steal()">An toàn</p><script>alert(1)</script><style>p{display:none}</style><iframe src="https://evil.example"></iframe><form><input value="x"><button>Gửi</button></form><p>Hết</p>'
    );
    const json = JSON.stringify(doc);
    expect(json).not.toMatch(/alert|display|evil|steal|onclick|Gửi/);
    expect(tipTapText(doc)).toContain('An toàn');
    expect(tipTapText(doc)).toContain('Hết');
  });

  it('keeps blockquote, code block, horizontal rule and hard break; decodes entities', () => {
    const doc = htmlToTipTap('<blockquote><p>Trích</p></blockquote><pre><code>a &lt; b\nc</code></pre><hr><p>dòng 1<br>dòng 2 &amp; hết</p>');
    expect(doc.content!.map((n) => n.type)).toEqual(['blockquote', 'codeBlock', 'horizontalRule', 'paragraph']);
    expect(doc.content![1].content![0].text).toBe('a < b\nc');
    expect(doc.content![3].content!.map((n) => n.type)).toEqual(['text', 'hardBreak', 'text']);
    expect(doc.content![3].content![2].text).toBe('dòng 2 & hết');
  });

  it('wraps loose text and flattens unknown containers; collapses whitespace; trims paragraph edges', () => {
    const doc = htmlToTipTap('<div>\n  Lời mở   đầu <section><p>  Đoạn   một  </p></section></div>');
    expect(doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Lời mở đầu' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Đoạn một' }] },
    ]);
  });

  it('gives a document with one empty paragraph for an empty body', () => {
    expect(htmlToTipTap('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(htmlToTipTap('<p>   </p><script>x</script>')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('never emits an empty text node (TipTap rejects them)', () => {
    const doc = JSON.stringify(htmlToTipTap('<p><strong> </strong><em></em>Có chữ</p>'));
    expect(doc).not.toMatch(/"text":""/);
  });

  it('refuses a body that is nested or large beyond the limits', () => {
    expect(() => htmlToTipTap('<div>'.repeat(60) + 'x' + '</div>'.repeat(60))).toThrow(BodyTooComplexError);
    expect(() => htmlToTipTap('<p>a</p>'.repeat(30_000))).toThrow(BodyTooComplexError);
  });
});

describe('address rules (same as the public renderer)', () => {
  it('links', () => {
    expect(safeHref('https://a.b')).toBe('https://a.b');
    expect(safeHref('/x')).toBe('/x');
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c');
    expect(safeHref('#top')).toBe('#top');
    expect(safeHref('//x.y')).toBeUndefined();
    expect(safeHref('javascript:1')).toBeUndefined();
    expect(safeHref(5)).toBeUndefined();
  });
  it('images take only http(s) and site-relative', () => {
    expect(safeImageSrc('https://a.b/c.png')).toBe('https://a.b/c.png');
    expect(safeImageSrc('/media/c.png')).toBe('/media/c.png');
    expect(safeImageSrc('mailto:x')).toBeUndefined();
    expect(safeImageSrc('data:image/png;base64,AAA')).toBeUndefined();
  });
});
