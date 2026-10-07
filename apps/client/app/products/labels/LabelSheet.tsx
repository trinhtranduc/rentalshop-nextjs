'use client';

/**
 * Barcode labels (#623): name (2 lines), Code 128 bars, the code. Sized in mm so the screen preview and
 * the print are the same. Black on white in every theme: it is what prints.
 *
 * Print isolation is the Hoá đơn pattern: the print copy is a child of <body>; while this page is open a
 * print stylesheet hides every other child and sets `@page` to one label row, no margin.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { code128Bars } from './code128';
import { toPages, type PrintLabel } from './labels-model';
import { labelPageCss, type LabelLayout } from '../../../lib/print-settings';

/** Barcode icon for the In tem buttons (shell icon format). */
export const BARCODE_ICON = 'M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14';

/** Label look on screen and paper; no print rules, so a preview can sit on any page (#626). */
export const LABEL_SCREEN_CSS = `
.lb-page{display:flex;box-sizing:border-box;overflow:hidden;background:#fff;color:#000}
.lb-label{display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;padding:1.2mm 2mm;background:#fff;color:#000;
  font-family:var(--font-be-vietnam),Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.lb-name{flex:none;font-weight:600;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.lb-bars{flex:1 1 auto;min-height:0;display:block;width:100%;margin-top:.8mm}
.lb-code{flex:none;text-align:center;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.04em;font-variant-numeric:tabular-nums}
`;

export const LABEL_CSS = LABEL_SCREEN_CSS + `
.ar-labels-print{display:none}
@media print {
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(.ar-labels-print) { display: none !important; }
  .ar-labels-print { display: block !important; }
  .ar-labels-print .lb-page { break-after: page; page-break-after: always; }
  .ar-labels-print .lb-page:last-child { break-after: auto; page-break-after: auto; }
}
`;

/** Code 128 bars as one SVG path (bars are 1 unit high, stretched to the box; edges stay crisp). */
export function Barcode({ code, className }: { code: string; className?: string }) {
  const bars = code128Bars(code);
  if (!bars) return null;
  const d = bars.bars.map(([x, w]) => `M${x} 0h${w}v1h-${w}z`).join('');
  return (
    <svg className={className} viewBox={`0 0 ${bars.width} 1`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} fill="#000" />
    </svg>
  );
}

/** Font sizes follow the label height: small rolls (≤ 25 mm) get smaller text so the bars keep room. */
function fontsFor(layout: LabelLayout) {
  const small = layout.labelH <= 25;
  return { name: small ? '2.4mm' : '2.9mm', code: small ? '2.2mm' : '2.7mm' };
}

export function LabelPage({ labels, layout }: { labels: PrintLabel[]; layout: LabelLayout }) {
  const f = fontsFor(layout);
  return (
    <div className="lb-page" style={{ width: `${layout.pageW}mm`, height: `${layout.pageH}mm` }}>
      {labels.map((l) => (
        <div key={l.key} className="lb-label" style={{ width: `${layout.labelW}mm`, height: `${layout.labelH}mm` }}>
          <div className="lb-name" style={{ fontSize: f.name }}>
            {l.name}
          </div>
          <Barcode code={l.code} className="lb-bars" />
          <div className="lb-code" style={{ fontSize: f.code }}>
            {l.code}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Styles + the print-only copy of every label (portal to <body>). Mounted while the page is open. */
export function LabelPrintRoot({ labels, layout }: { labels: PrintLabel[]; layout: LabelLayout }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="ar-labels-print">
      <style>{LABEL_CSS + labelPageCss(layout)}</style>
      {toPages(labels, layout.perRow).map((page) => (
        <LabelPage key={page[0].key} labels={page} layout={layout} />
      ))}
    </div>,
    document.body,
  );
}
