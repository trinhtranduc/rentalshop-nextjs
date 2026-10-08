'use client'

import React from "react";
import { Camera, Sparkles, AlertTriangle } from "lucide-react";
import { useAuthTranslations } from "@rentalshop/hooks";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";

/**
 * Shop web auth look (style 4A, #510): white page, dotted grid fading down,
 * 72px brand mark. Used only when a form gets `appearance="shop"`, so apps/admin
 * keeps the classic look. From lg up the page splits (#679): product steps left, form right.
 */

const shopFieldBase =
  "h-[52px] w-full rounded-xl border bg-white pl-11 pr-3.5 text-base text-slate-900 placeholder:text-slate-400 " +
  "focus:outline-none focus:border-[1.5px] focus:ring-[3px] focus-visible:ring-[3px] focus-visible:ring-offset-0";

/** One border set at a time; stacking both lets CSS order pick the colour. */
export function shopFieldClass(invalid = false): string {
  return invalid
    ? `${shopFieldBase} border-red-600 focus:border-red-600 focus:ring-red-100 focus-visible:ring-red-100`
    : `${shopFieldBase} border-slate-300 focus:border-blue-700 focus:ring-blue-100 focus-visible:ring-blue-100`;
}

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

const SHOWCASE_STEP_MS = 5000;

/** One step per feature: the web screen behind, the phone screen in front (real captures, #679). */
const showcaseSteps = [
  { key: "conflict", web: "/auth-showcase/web-products.jpg", phone: "/auth-showcase/phone-conflict.jpg" },
  { key: "imageSearch", web: "/auth-showcase/web-image-search.jpg", phone: "/auth-showcase/phone-products.jpg" },
  { key: "status", web: "/auth-showcase/web-order.jpg", phone: "/auth-showcase/phone-order.jpg" },
  { key: "calendar", web: "/auth-showcase/web-calendar.jpg", phone: "/auth-showcase/phone-calendar.jpg" },
] as const;

type ShowcaseKey = (typeof showcaseSteps)[number]["key"];

const showcaseCss = `
@keyframes ar-showcase-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .ar-showcase-in { animation: ar-showcase-in 550ms cubic-bezier(.2,.7,.2,1) both; }
  .ar-showcase-in-2 { animation: ar-showcase-in 550ms 120ms cubic-bezier(.2,.7,.2,1) both; }
  .ar-showcase-in-3 { animation: ar-showcase-in 600ms 260ms cubic-bezier(.2,.7,.2,1) both; }
}
`;

const cardClass =
  "ar-showcase-in-3 absolute bottom-[8%] left-[-12px] z-10 flex rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]";

function ShowcaseCard({ step, t }: { step: ShowcaseKey; t: (key: string) => string }) {
  if (step === "conflict") {
    return (
      <div className={`${cardClass} w-[268px] gap-3 p-4`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-100 text-red-700">
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-bold">{t("showcase.card.conflictTitle")}</span>
          <span className="text-[13px] leading-snug text-slate-600">{t("showcase.card.conflictBody")}</span>
        </span>
      </div>
    );
  }
  if (step === "imageSearch") {
    return (
      <div className={`${cardClass} w-[236px] flex-col gap-2.5 p-3`}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auth-showcase/query-photo.jpg" alt="" className="h-[150px] w-full rounded-xl object-cover" />
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white">
            <Camera aria-hidden="true" className="h-3.5 w-3.5" />
            {t("showcase.card.customerPhoto")}
          </span>
        </div>
        <span className="flex items-center gap-2 text-[13px] font-bold text-blue-700">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          {t("showcase.card.aiSearching")}
        </span>
      </div>
    );
  }
  if (step === "status") {
    return (
      <div className={`${cardClass} w-[276px] flex-col gap-3.5 px-[18px] py-4`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{t("showcase.card.order")}</span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{t("showcase.card.reserved")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <span className="flex flex-col gap-1.5"><span className="h-1 rounded-sm bg-blue-700" /><b>{t("showcase.card.stepBook")}</b></span>
          <span className="flex flex-col gap-1.5 text-slate-500"><span className="h-1 rounded-sm bg-slate-300" />{t("showcase.card.stepPickup")}</span>
          <span className="flex flex-col gap-1.5 text-slate-500"><span className="h-1 rounded-sm bg-slate-300" />{t("showcase.card.stepReturn")}</span>
        </div>
        <span className="text-[13px] text-slate-600">
          {t("showcase.card.collect")} <b className="text-slate-900">4.850.000</b>
        </span>
      </div>
    );
  }
  return (
    <div className={`${cardClass} w-[240px] flex-col gap-2.5 px-[18px] py-4`}>
      <span className="text-[13px] font-bold uppercase text-slate-500">{t("showcase.card.today")}</span>
      <div className="flex gap-2 text-xs text-slate-700">
        <span className="flex flex-1 flex-col rounded-[10px] bg-blue-50 px-2.5 py-2"><b className="text-lg text-blue-700">3</b>{t("showcase.card.pickups")}</span>
        <span className="flex flex-1 flex-col rounded-[10px] bg-violet-50 px-2.5 py-2"><b className="text-lg text-violet-700">3</b>{t("showcase.card.returns")}</span>
        <span className="flex flex-1 flex-col rounded-[10px] bg-red-50 px-2.5 py-2"><b className="text-lg text-red-700">1</b>{t("showcase.card.late")}</span>
      </div>
    </div>
  );
}

/**
 * Left part of the split auth page (#679); not shown below lg. Four feature steps change on their own every
 * few seconds; there are no step controls on purpose. Hover pauses, and reduced motion stays on the first step.
 */
function ShopAuthShowcase() {
  const t = useAuthTranslations();
  const [step, setStep] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const current = showcaseSteps[step];

  React.useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setStep((i) => (i + 1) % showcaseSteps.length), SHOWCASE_STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, paused]);

  return (
    <aside
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="sticky top-0 hidden h-screen flex-col gap-7 overflow-hidden bg-[#F1F5FD] px-12 py-11 xl:px-14 lg:flex"
    >
      <style>{showcaseCss}</style>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/anyrent-brandmark-ribbon.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-xl shadow-[0_6px_16px_rgba(29,78,216,0.18)]"
        />
        <span className="text-[22px] font-extrabold text-blue-900">AnyRent</span>
      </div>

      <div key={current.key} aria-live="polite" className="flex min-h-[176px] max-w-[640px] flex-col gap-3">
        <span className="ar-showcase-in text-[13px] font-bold uppercase tracking-[0.08em] text-blue-700">
          {`0${step + 1} · ${t(`showcase.${current.key}.eyebrow`)}`}
        </span>
        <h2 className="ar-showcase-in m-0 text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900 xl:text-[36px]">
          {t(`showcase.${current.key}.title`)}
        </h2>
        <p className="ar-showcase-in-2 m-0 text-[17px] leading-relaxed text-slate-600">{t(`showcase.${current.key}.desc`)}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-start">
        <div key={current.key} className="relative aspect-[8/5] h-full max-w-full">
          <div className="absolute left-0 top-0 w-[80%] overflow-hidden rounded-[14px] bg-white shadow-[0_30px_60px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.06)]">
            <div className="flex h-[30px] items-center gap-[7px] border-b border-slate-200 bg-slate-100 px-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.web} alt={t("showcase.webAlt")} className="ar-showcase-in block aspect-[8/5] w-full object-cover object-left-top" />
          </div>
          <div className="absolute bottom-0 right-0 h-[92%] rounded-[38px] bg-slate-900 p-2 shadow-[0_30px_60px_rgba(15,23,42,0.28)]">
            <div className="flex h-full aspect-[198/431] flex-col overflow-hidden rounded-[30px] bg-white">
              <div className="flex h-[6%] shrink-0 items-center justify-center">
                <span className="h-[60%] w-[32%] rounded-full bg-slate-900" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.phone} alt={t("showcase.phoneAlt")} className="ar-showcase-in min-h-0 flex-1 object-cover object-top" />
            </div>
          </div>
          <ShowcaseCard step={current.key} t={t} />
        </div>
      </div>
    </aside>
  );
}

export function ShopAuthPage({ children, termsLabel, privacyLabel, onNavigate }: ShopAuthPageProps) {
  return (
    <div
      className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-2 xl:grid-cols-[3fr_2fr]"
      style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}
    >
      <ShopAuthShowcase />
      <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-10">
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
        <div className="relative flex flex-col items-center gap-2.5 pt-16 sm:pt-28 lg:hidden">
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
        <section className="relative mt-10 flex w-full max-w-[400px] flex-col gap-5 sm:mt-12 lg:mt-auto lg:pt-12">{children}</section>
        <footer className="relative mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-12 text-sm text-slate-600">
          <button type="button" onClick={() => onNavigate?.("/terms")} className="whitespace-nowrap hover:text-blue-700">
            {termsLabel}
          </button>
          <button type="button" onClick={() => onNavigate?.("/privacy")} className="whitespace-nowrap hover:text-blue-700">
            {privacyLabel}
          </button>
          <LanguageSwitcher variant="compact" />
        </footer>
      </div>
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
