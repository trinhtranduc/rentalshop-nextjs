"""Export a published Vietnamese post into a work folder for translation (#1115).

    python3 -I export_source.py <vi-slug> <work-dir> [--api https://api.anyrent.shop]

Writes <work-dir>/source.json (the post as the public API returns it) and <work-dir>/blocks.json: one block per
top-level TipTap node, in order. Block kinds: h2/h3 (heading), p (paragraph, inline HTML with <strong>, <em>,
<a href>), img (image paragraph; text = alt), cap (italic-only paragraph right after an image; text = caption).
Read-only: it only calls GET /api/posts/public.
"""
import html
import json
import os
import sys
import urllib.parse
import urllib.request


def fetch_post(api, slug):
    page = 1
    while True:
        q = urllib.parse.urlencode({'locale': 'vi', 'limit': 50, 'page': page})
        req = urllib.request.Request(f'{api}/api/posts/public?{q}', headers={'User-Agent': 'anyrent-translate-post'})
        with urllib.request.urlopen(req, timeout=60) as r:  # the API answers 403 to the default Python agent
            data = json.load(r)['data']
        for p in data['data']:
            if p['slug'] == slug:
                return p
        if not data.get('hasMore'):
            raise SystemExit(f'No published vi post with slug "{slug}"')
        page += 1


def inline_html(nodes):
    out = []
    for n in nodes or []:
        if n.get('type') == 'hardBreak':
            out.append('<br>')
            continue
        if n.get('type') != 'text':
            raise SystemExit(f'Unsupported inline node {n.get("type")}; extend export_source.py')
        t = html.escape(n['text'], quote=False)
        for m in n.get('marks', []):
            if m['type'] == 'bold':
                t = f'<strong>{t}</strong>'
            elif m['type'] == 'italic':
                t = f'<em>{t}</em>'
            elif m['type'] == 'link':
                t = f'<a href="{html.escape(m["attrs"]["href"], quote=True)}">{t}</a>'
        out.append(t)
    return ''.join(out)


def blocks_of(content):
    blocks, prev_img = [], False
    for i, n in enumerate(content):
        kids = n.get('content', [])
        if n['type'] == 'heading':
            blocks.append({'i': i, 't': f'h{n["attrs"]["level"]}', 'h': inline_html(kids)})
            prev_img = False
        elif n['type'] == 'paragraph' and any(k['type'] == 'image' for k in kids):
            img = next(k for k in kids if k['type'] == 'image')
            blocks.append({'i': i, 't': 'img', 'src': img['attrs']['src'], 'h': img['attrs'].get('alt') or ''})
            prev_img = True
        elif n['type'] == 'paragraph':
            italic_only = kids and all(any(m['type'] == 'italic' for m in k.get('marks', [])) for k in kids)
            if prev_img and italic_only:
                blocks.append({'i': i, 't': 'cap', 'h': ''.join(k['text'] for k in kids)})
            else:
                blocks.append({'i': i, 't': 'p', 'h': inline_html(kids)})
            prev_img = False
        else:
            raise SystemExit(f'Unsupported block node {n["type"]} at {i}; extend export_source.py')
    return blocks


def main():
    args = sys.argv[1:]
    api = 'https://api.anyrent.shop'
    if '--api' in args:
        api = args[args.index('--api') + 1].rstrip('/')
        args = [a for a in args if a not in ('--api', api)]
    slug, work = args[0], args[1]
    os.makedirs(work, exist_ok=True)
    post = fetch_post(api, slug)
    content = json.loads(post['content'])['content']
    blocks = blocks_of(content)
    json.dump(post, open(os.path.join(work, 'source.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(blocks, open(os.path.join(work, 'blocks.json'), 'w'), ensure_ascii=False, indent=1)
    kinds = {}
    for b in blocks:
        kinds[b['t']] = kinds.get(b['t'], 0) + 1
    print(f'post {post["id"]} "{post["title"]}" · {len(blocks)} blocks {kinds} · translationKey={post.get("translationKey")}')


if __name__ == '__main__':
    main()
