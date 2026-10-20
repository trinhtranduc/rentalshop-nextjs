import React from 'react';
import { Sparkles } from 'lucide-react';

/** lucide `ScanSearch` (ISC). Inline: the lucide-react version in this repo (0.263) does not ship it yet. */
export function ScanSearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <path d="m16 16-1.9-1.9" />
    </svg>
  );
}

/**
 * #1128 icon A (owner: the camera emoji was not impressive): ScanSearch in white on a conic gradient tile, a small
 * white badge with Sparkles, a soft breathing ring (`ai-search-tile`, off under prefers-reduced-motion).
 */
export function AiSearchTile() {
  return (
    <span className="ai-search-tile relative flex h-[50px] w-[50px] flex-none items-center justify-center rounded-[14px]" aria-hidden>
      <ScanSearchIcon className="h-[26px] w-[26px] text-white" />
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
        <Sparkles className="h-[13px] w-[13px] text-[#7C3AED]" />
      </span>
    </span>
  );
}
