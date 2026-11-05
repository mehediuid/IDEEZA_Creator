"use client";

// "What You Can Do" — Figma IDEEZA Website V-2, 18532:51957 (1440 x 1089).
// The section header, the feature cards as a horizontal slider, and the
// two-bar pager under it (18836:46224).
//
// The file draws three cards and nothing past them. At the Figma width
// (>= 1280) all three fit the 1260 row, so the pager rests on its first bar
// and its bars stay inert (there is nothing to slide to). Where the row is
// narrower than the cards it scrolls / swipes with snap; the pager then
// follows the scroll (first bar = start half, second bar = end half) and a
// click on a bar slides to the start or the end.

import * as React from "react";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";

const ASSETS = "/landing/what-you-can-do";

type Card = {
  /** Figma node of the card frame. */
  node: string;
  icon: string;
  /** Figma breaks every title onto two lines. */
  title: [string, string];
  body: string;
};

const CARDS: Card[] = [
  {
    node: "18532:51968",
    icon: "icon-ai-design.svg", // Figma 18532:51970
    title: ["AI Design", "Generation"], // Figma 18532:51975
    body: "Create complete hardware designs using AI. Describe your idea and instantly generate PCB layouts, firmware a matching 3D enclosure.", // Figma 18532:51977
  },
  {
    node: "18532:51978",
    icon: "icon-engineer-mode.svg", // Figma 18532:51980
    title: ["Engineer", "Mode"], // Figma 18532:51987
    body: "Take full control with advanced engineering tools. Edit schematics, modify firmware, and fine-tune every component as needed.", // Figma 18532:51989
  },
  {
    node: "18532:51990",
    icon: "icon-digital-ownership.svg", // Figma 18532:51992
    title: ["Digital", "Ownership"], // Figma 18532:51997
    body: "Secure your design with verified digital ownership. Register your ideas to protect intellectual property and confirm authorship.", // Figma 18532:51999
  },
];

// Figma 18532:51968 / 51978 / 51990 — the card frame: a 1px
// rgba(210,197,252,0.2) stroke, radius 20, 32 padding, no fill. Figma's glass
// effect on it (it has no CSS export) lights the stroke from the left and
// shades the inner edge dark at top-left, light at bottom-right. The ring
// (::before, masked to 1px so it takes no layout room, like Figma's inside
// stroke) and the two inset shadows rebuild that, measured off the render.
const CARD_GLASS = cn(
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:content-['']",
  "before:[background:linear-gradient(100deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.31)_17%,rgba(255,255,255,0.13)_42%,rgba(255,255,255,0.07)_58%,rgba(255,255,255,0.2)_80%,rgba(255,255,255,0.19)_100%),linear-gradient(rgba(210,197,252,0.2),rgba(210,197,252,0.2))]",
  "before:[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]",
  "shadow-[inset_6px_6px_12px_rgba(0,0,8,0.95),inset_-6px_-6px_12px_rgba(255,255,255,0.035)]",
);

function FeatureCard({ card, index }: { card: Card; index: number }) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${CARDS.length}`}
      data-figma={card.node}
      className={cn(
        "relative flex w-[min(404px,calc(100vw-72px))] shrink-0 snap-start items-center rounded-[20px] p-16",
        CARD_GLASS,
      )}
    >
      {/* Figma 18532:51969 — the icon, then the text block 96 below it. */}
      <div className="flex w-full flex-col items-start gap-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSETS}/${card.icon}`}
          width={64}
          height={64}
          alt=""
          className="size-[64px] shrink-0"
        />
        {/* Figma 18532:51973 — title + rule, then the body 28 below. */}
        <div className="flex w-full flex-col items-start gap-[28px]">
          {/* Figma 18532:51974 — Heading/H1 title, the rule 24 under it. */}
          <div className="flex w-full flex-col items-start gap-[24px]">
            <h3 className="w-full font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">
              {card.title[0]}
              <br />
              {card.title[1]}
            </h3>
            {/* Figma "Rectangle 42456" — #d0d8f5 at 30%. */}
            <div aria-hidden="true" className="h-px w-full shrink-0 bg-[#d0d8f5] opacity-30" />
          </div>
          {/* Body/LG Medium. */}
          <p className="w-full font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
            {card.body}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Which pager bar the track's scroll position belongs to, and whether it scrolls at all. */
function useTrackPosition(trackRef: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = React.useState({ page: 0, scrollable: false });

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const scrollable = max > 1;
      const page = scrollable && el.scrollLeft > max / 2 ? 1 : 0;
      setState((prev) => (prev.page === page && prev.scrollable === scrollable ? prev : { page, scrollable }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [trackRef]);

  return state;
}

const PAGES = ["Show the first cards", "Show the last cards"] as const;

export function WhatYouCanDo() {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const { page, scrollable } = useTrackPosition(trackRef);

  const goTo = (target: number) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target === 0 ? 0 : el.scrollWidth - el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-labelledby="what-you-can-do-title" className="relative overflow-hidden bg-[var(--color-bg-page)]">
      {/* Figma 18532:51958 — "Rectangle 2336", the blurred violet haze turned
          180° over the top of the section (export of its visible 1440 x 647,
          drawn on the page colour). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSETS}/glow.png`}
        width={1440}
        height={647}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-1/2 top-0 h-[647px] w-[1440px] max-w-none -translate-x-1/2 select-none"
      />

      {/* Figma 18532:51959 — the header, then the card row 92 below it. */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-[92px] px-8 pt-[150px] xl:px-0">
        {/* Figma 18532:51960 */}
        <LandingSectionHeader
          id="what-you-can-do-title"
          eyebrow="What You Can Do"
          title="Everything You Need to Build, Own & Sell"
          lead={
            <>
              From idea to product — design, develop, protect, and manufacture your hardware in{" "}
              <br className="hidden md:inline" />
              one seamless workflow.
            </>
          }
        />

        {/* Figma 18532:51967 — the card row (3 x 404, 24 apart = 1260). */}
        <div
          ref={trackRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="What you can do"
          tabIndex={scrollable ? 0 : undefined}
          className="flex snap-x snap-mandatory gap-[24px] overflow-x-auto [scrollbar-width:none] focus-visible:outline-none focus-visible:shadow-focus-brand [&::-webkit-scrollbar]:hidden"
        >
          {CARDS.map((card, i) => (
            <FeatureCard key={card.node} card={card} index={i} />
          ))}
        </div>
      </div>

      {/* Figma 18836:46224 — the pager, 80 under the cards: two 92 x 3 bars,
          8 apart. The active bar is Figma's gradient image fill (Rectangle
          42474) under an 8% white wash; the other is glass/border-subtle
          (Rectangle 42475). */}
      <div
        aria-hidden={scrollable ? undefined : true}
        className="relative mt-[80px] flex items-center justify-center gap-[8px] pb-[87px]"
      >
        {PAGES.map((label, i) => {
          const active = page === i;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={active ? "true" : undefined}
              disabled={!scrollable}
              tabIndex={scrollable ? 0 : -1}
              onClick={() => goTo(i)}
              className={cn(
                "relative h-[3px] w-[92px] shrink-0 cursor-pointer rounded-sm bg-[var(--color-glass-border-subtle)] disabled:cursor-default",
                // A taller hit area than the 3px bar.
                "before:absolute before:inset-x-0 before:-inset-y-[10px] before:content-['']",
                "focus-visible:outline-none focus-visible:shadow-focus-brand",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-sm bg-[url('/landing/what-you-can-do/pager-active.png')] bg-cover bg-center transition-opacity duration-fast ease-standard",
                  active ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="absolute inset-0 rounded-sm bg-[rgba(255,255,255,0.08)]" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
