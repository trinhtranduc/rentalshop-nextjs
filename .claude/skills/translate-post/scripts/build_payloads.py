"""Build one POST /api/posts body per language from source.json + tr/<locale>.json, and check them (#1115).

    python3 -I build_payloads.py <work-dir>

tr/<locale>.json = {"fields": {"title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords"},
                    "blocks": [one string per block of blocks.json, same order: inline HTML for h/p,
                               alt text for img, plain caption text for cap]}
Writes publish/<locale>.json and preview/<locale>.html. Exits non-zero on any check failure.
"""
import copy
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

LIMITS = {'title': 255, 'seoTitle': 60, 'seoDescription': 320, 'excerpt': 1000, 'seoKeywords': 255}
VI_CHARS = re.compile('[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂĐƠƯ]')


class Inline(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out, self.marks = [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('strong', 'b'):
            self.marks.append({'type': 'bold'})
        elif tag in ('em', 'i'):
            self.marks.append({'type': 'italic'})
        elif tag == 'a':
            self.marks.append({'type': 'link', 'attrs': {'href': a.get('href'), 'target': '_blank',
                                                         'rel': 'noopener noreferrer nofollow', 'class': None}})
        elif tag == 'br':
            self.out.append({'type': 'hardBreak'})
        else:
            self.marks.append(None)

    def handle_endtag(self, tag):
        if tag != 'br' and self.marks:
            self.marks.pop()

    def handle_data(self, d):
        if d:
            n = {'type': 'text', 'text': d}
            m = [x for x in self.marks if x]
            if m:
                n['marks'] = copy.deepcopy(m)
            self.out.append(n)


def inline(h):
    p = Inline()
    p.feed(h)
    p.close()
    return [n for n in p.out if n.get('type') == 'hardBreak' or n['text']]


def counts(h):
    return len(re.findall(r'<a\s', h)), len(re.findall(r'<strong>', h))


def main():
    work = sys.argv[1]
    src = json.load(open(os.path.join(work, 'source.json'), encoding='utf-8'))
    blocks = json.load(open(os.path.join(work, 'blocks.json'), encoding='utf-8'))
    nodes = json.loads(src['content'])['content']
    os.makedirs(os.path.join(work, 'publish'), exist_ok=True)
    os.makedirs(os.path.join(work, 'preview'), exist_ok=True)
    failed = False
    for name in sorted(os.listdir(os.path.join(work, 'tr'))):
        if not name.endswith('.json'):
            continue
        loc = name[:-5]
        tr = json.load(open(os.path.join(work, 'tr', name), encoding='utf-8'))
        f, texts, problems = tr['fields'], tr['blocks'], []
        if len(texts) != len(blocks):
            problems.append(f'{len(texts)} blocks, source has {len(blocks)}')
        new, preview = [], []
        for b, t in zip(blocks, texts):
            n, t = copy.deepcopy(nodes[b['i']]), t.strip()
            if not t:
                problems.append(f'block {b["i"]} empty')
            if VI_CHARS.search(re.sub(r'href="[^"]*"', '', t)):
                problems.append(f'block {b["i"]} still has Vietnamese: {t[:50]}')
            if b['t'] == 'img':
                img = next(k for k in n['content'] if k['type'] == 'image')
                img['attrs']['alt'] = img['attrs']['title'] = html.unescape(t)
                preview.append(f'<p><img src="{b["src"]}" alt="{html.escape(t, quote=True)}" style="max-width:100%"></p>')
            elif b['t'] == 'cap':
                n['content'] = [{'type': 'text', 'text': html.unescape(re.sub('<[^>]+>', '', t)), 'marks': [{'type': 'italic'}]}]
                preview.append(f'<p><em>{t}</em></p>')
            else:
                if counts(b['h']) != counts(t):
                    problems.append(f'block {b["i"]} links/bold {counts(t)} != source {counts(b["h"])}')
                n['content'] = inline(t)
                tag = b['t'] if b['t'] != 'p' else 'p'
                preview.append(f'<{tag}>{t}</{tag}>')
            new.append(n)
        body = {
            'title': f['title'], 'slug': f['slug'], 'locale': loc, 'translationSourceId': src['id'],
            'content': json.dumps({'type': 'doc', 'content': new}, ensure_ascii=False),
            'excerpt': f.get('excerpt') or None, 'seoTitle': f.get('seoTitle') or None,
            'seoDescription': f.get('seoDescription') or None, 'seoKeywords': f.get('seoKeywords') or None,
            'status': 'PUBLISHED', 'featuredImage': src.get('featuredImage') or None,
        }
        for k, lim in LIMITS.items():
            if body.get(k) and len(body[k]) > lim:
                problems.append(f'{k} is {len(body[k])} chars, limit {lim}')
        if not re.fullmatch(r'[a-z0-9-]+', body['slug']):
            problems.append(f'slug "{body["slug"]}" must be lowercase ASCII letters, digits and hyphens')
        body = {k: v for k, v in body.items() if v is not None}
        json.dump(body, open(os.path.join(work, 'publish', f'{loc}.json'), 'w'), ensure_ascii=False, indent=1)
        open(os.path.join(work, 'preview', f'{loc}.html'), 'w', encoding='utf-8').write(
            f'<!doctype html><meta charset="utf-8"><title>{html.escape(f["title"])}</title>'
            f'<body style="max-width:760px;margin:24px auto;font-family:system-ui;line-height:1.6">'
            f'<h1>{html.escape(f["title"])}</h1>{"".join(preview)}</body>')
        status = 'OK' if not problems else 'FAIL: ' + '; '.join(problems[:5])
        failed |= bool(problems)
        print(f'{loc:6} {body["slug"]} · {len(new)} blocks · {status}')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
