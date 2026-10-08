'use client'

import React from "react";
import { useAuthTranslations } from "@rentalshop/hooks";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";

/**
 * Shop web auth look (style 4A, #510): white page, dotted grid fading down,
 * 72px brand mark. Used only when a form gets `appearance="shop"`, so apps/admin
 * keeps the classic look. From lg up the page splits (#679): product intro left, form right.
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

/**
 * One step per feature. `cover` crops photos to the frame; the mockups are shown whole on `bg`,
 * their own background colour, so the frame has no visible inner box.
 */
const showcaseSteps = [
  { key: "intro", src: "/anyrent-landing-hero-soft.png", cover: true, bg: "#ffffff" },
  { key: "calendar", src: "/anyrent-landing-feature-calendar.png", cover: true, bg: "#ffffff" },
  { key: "orders", src: "/anyrent-landing-feature-orders.png", cover: true, bg: "#ffffff" },
  { key: "conflict", src: "/anyrent-landing-duplicate-alert.png", cover: false, bg: "#d8ebfd" },
  { key: "imageSearch", src: "/anyrent-ai-phone-results.png", cover: false, bg: "#d0e3f8" },
] as const;

const showcaseCss = `
@keyframes ar-showcase-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes ar-showcase-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: no-preference) {
  .ar-showcase-in { animation: ar-showcase-in 600ms cubic-bezier(.2,.7,.2,1) both; }
  .ar-showcase-in-late { animation: ar-showcase-in 600ms 120ms cubic-bezier(.2,.7,.2,1) both; }
  .ar-showcase-img { transition: opacity 700ms ease, transform 900ms cubic-bezier(.2,.7,.2,1); }
  .ar-showcase-fill { animation: ar-showcase-fill ${SHOWCASE_STEP_MS}ms linear both; }
  .ar-showcase:hover .ar-showcase-fill { animation-play-state: paused; }
}
`;

/**
 * Left half of the split auth page; not shown below lg. Steps advance when the active progress bar
 * finishes filling, so hover pauses them and reduced motion leaves the viewer on the step they chose.
 */
function ShopAuthShowcase() {
  const t = useAuthTranslations();
  const [step, setStep] = React.useState(0);
  const current = showcaseSteps[step];
  const next = () => setStep((i) => (i + 1) % showcaseSteps.length);

  return (
    <aside className="ar-showcase sticky top-0 hidden h-screen flex-col gap-8 overflow-hidden bg-gradient-to-b from-blue-50 to-slate-50 px-12 pb-10 pt-12 xl:px-16 lg:flex">
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
        <span className="text-xl font-extrabold text-blue-900">AnyRent</span>
      </div>

      <div key={current.key} aria-live="polite" className="flex min-h-[132px] max-w-[520px] flex-col gap-3">
        <h2 className="ar-showcase-in m-0 text-[34px] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900">
          {t(`showcase.${current.key}.title`)}
        </h2>
        <p className="ar-showcase-in-late m-0 text-[17px] leading-relaxed text-slate-600">
          {t(`showcase.${current.key}.desc`)}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-start">
        <div
          className="relative aspect-[3/2] max-h-full w-full overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(15,23,42,0.08)] transition-colors duration-700"
          style={{ backgroundColor: current.bg }}
        >
          {showcaseSteps.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.key}
              src={s.src}
              alt=""
              loading="lazy"
              className={`ar-showcase-img absolute inset-0 h-full w-full ${s.cover ? "object-cover" : "object-contain"} ${
                i === step ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {showcaseSteps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            aria-label={t("showcase.goTo", { n: i + 1 })}
            aria-current={i === step ? "step" : undefined}
            className="group flex h-6 flex-1 items-center"
          >
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-slate-300/70 group-hover:bg-slate-400/70">
              {i < step ? <span className="absolute inset-0 bg-blue-700" /> : null}
              {i === step ? (
                <span
                  key={`fill-${step}`}
                  onAnimationEnd={next}
                  className="ar-showcase-fill absolute inset-0 origin-left bg-blue-700"
                />
              ) : null}
            </span>
          </button>
        ))}
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
