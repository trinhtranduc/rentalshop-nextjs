'use client'

import React from "react";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";

/**
 * Shop web auth look (style 4A, #510): white page, dotted grid fading down,
 * 72px brand mark. Used only when a form gets `appearance="shop"`, so apps/admin
 * keeps the classic look.
 */

export const shopFieldClass =
  "h-[52px] w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3.5 text-base text-slate-900 placeholder:text-slate-400 " +
  "focus:outline-none focus:border-[1.5px] focus:border-blue-700 focus:ring-[3px] focus:ring-blue-100 focus-visible:ring-[3px] focus-visible:ring-blue-100 focus-visible:ring-offset-0";

export const shopFieldErrorClass = "border-red-600 focus:border-red-600 focus:ring-red-100";

export const shopLabelClass = "text-[15px] font-semibold text-slate-900";

export const shopPrimaryButtonClass =
  "h-[54px] w-full rounded-[14px] bg-blue-700 text-base font-bold text-white shadow-[0_6px_16px_rgba(29,78,216,0.25)] hover:bg-blue-800 disabled:opacity-60";

export const shopIconClass = "absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500";

interface ShopAuthPageProps {
  children: React.ReactNode;
  termsLabel: string;
  privacyLabel: string;
  onNavigate?: (path: string) => void;
}

export function ShopAuthPage({ children, termsLabel, privacyLabel, onNavigate }: ShopAuthPageProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden bg-white px-4 pb-10 text-slate-900"
      style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          WebkitMaskImage: "linear-gradient(180deg, #000 30%, transparent 100%)",
          maskImage: "linear-gradient(180deg, #000 30%, transparent 100%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-2.5 pt-16 sm:pt-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/anyrent-brandmark-ribbon.png"
          alt="AnyRent"
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-[20px] shadow-[0_8px_24px_rgba(29,78,216,0.18)]"
        />
        <span className="text-[22px] font-extrabold text-blue-900">AnyRent</span>
      </div>
      <section className="relative mt-10 flex w-full max-w-[400px] flex-col gap-5 sm:mt-12">{children}</section>
      <footer className="relative mt-auto flex items-center gap-4 pt-12 text-sm text-slate-600">
        <button type="button" onClick={() => onNavigate?.("/terms")} className="hover:text-blue-700">
          {termsLabel}
        </button>
        <button type="button" onClick={() => onNavigate?.("/privacy")} className="hover:text-blue-700">
          {privacyLabel}
        </button>
        <LanguageSwitcher variant="compact" />
      </footer>
    </div>
  );
}

export function ShopAuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <h1 className="m-0 text-[28px] font-extrabold leading-9 tracking-[-0.02em]">{title}</h1>
      {subtitle ? <p className="m-0 text-base text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
