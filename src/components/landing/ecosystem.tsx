"use client";

// Landing — "The Ecosystem", Figma IDEEZA Website V-2 18532:53762
// (1440 × 1062, page y 10120). The visual is a deck of six numbered cards
// (F-1 … F-6, Figma 18532:53785 – 53846): F-6 "$IDZ Token" lies on top, the
// others fan out behind it at ±6°. The deck is a working carousel — click or
// tap it (or use the arrow keys) and the top card goes to the back, so every
// card can be read. The six-dot pill (18532:53775) sits behind the deck in
// Figma, so it is drawn there too, as decoration.

import * as React from "react";
import { cn } from "@/lib/utils";
import { LandingSectionHeader } from "./section-header";

const A = "/landing/ecosystem";

const TRIM = "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

type Card = {
  n: number;
  name: string;
  body: React.ReactNode;
  icon: string;
  /** F-2 is drawn with raw colours and trimmed type; the rest bind tokens. */
  variant?: "manufacturing";
  /** Base fill under the two gradients: rgb(29,78,216), F-2 rgb(51,40,148). */
  base: string;
};

// Figma F-1 … F-6. Text exactly as drawn (hyphens and hard line breaks too).
const CARDS: Card[] = [
  {
    n: 1,
    name: "AI Engine",
    body: "Transform your ideas into real hard-ware using AI-driven design, auto-mation, and smart guidance.",
    icon: `${A}/icon-ai-engine.svg`,
    base: "rgb(29,78,216)",
  },
  {
    n: 2,
    name: "Manufacturing Network",
    body: (
      <>
        Seamlessly connect your designs <br />
        to trusted global manufacturing partners for real-world production.
      </>
    ),
    icon: `${A}/icon-manufacturing.svg`,
    variant: "manufacturing",
    base: "rgb(51,40,148)",
  },
  {
    n: 3,
    name: "Creator Feed",
    body: (
      <>
        Share your creations, explore inno-
        <br />
        vations, and get inspired by a global community of hardware creators.
      </>
    ),
    icon: `${A}/icon-creator-feed.svg`,
    base: "rgb(29,78,216)",
  },
  {
    n: 4,
    name: "Digital Ownership",
    body: "Secure your designs with verifiable ownership, licensing rights, and built-in royalty protection.",
    icon: `${A}/icon-ownership.svg`,
    base: "rgb(29,78,216)",
  },
  {
    n: 5,
    name: "Marketplace",
    body: "Buy, sell, and monetize hardware designs in a unified marketplace built for creators and innovators.",
    icon: `${A}/icon-marketplace.svg`,
    base: "rgb(29,78,216)",
  },
  {
    n: 6,
    name: "$IDZ Token",
    body: "Power transactions, rewards, and ecosystem value through IDEEZA’s native digital token.",
    icon: `${A}/icon-token.svg`,
    base: "rgb(29,78,216)",
  },
];

/**
 * The six places in the deck, top first, as Figma draws them inside the
 * 372 × 460 frame 18532:53783: F-6 straight (centre +1, 0), F-5 −6°
 * (−2.52, −0.24), F-4 +6° (+2.48, −0.24), F-3 −6°, F-2 +6°, F-1 straight.
 */
const SLOTS = [
  { dx: 1, dy: 0, r: 0 },
  { dx: -2.52, dy: -0.24, r: -6 },
  { dx: 2.48, dy: -0.24, r: 6 },
  { dx: -2.52, dy: -0.24, r: -6 },
  { dx: 2.48, dy: -0.24, r: 6 },
  { dx: 1, dy: 0, r: 0 },
];

const slotTransform = (slot: number) => {
  const s = SLOTS[slot];
  return `translate(-50%, -50%) translate(${s.dx}px, ${s.dy}px) rotate(${s.r}deg)`;
};

/** One card — Figma F-n, 324 × 428. */
function EcoCard({ card }: { card: Card }) {
  const m = card.variant === "manufacturing";
  return (
    <div className="relative h-[428px] w-[324px] overflow-hidden rounded-[22px] border border-solid border-[#dfd4fe]">
      {/* Figma fills, top first: 180° rgba(22,19,53,.6)→rgb(134,122,245); 158° rgba(23,19,62,.95)→rgba(20,17,47,.95); the base */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[22px]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(22,19,53,0.6) 34.977%, rgb(134,122,245) 124.77%), linear-gradient(158.14deg, rgba(23,19,62,0.95) -66.51%, rgba(20,17,47,0.95) 133.79%), linear-gradient(90deg, ${card.base} 0%, ${card.base} 100%)`,
        }}
      />
      {/* BG 1 (Union grid) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${A}/card-grid.svg`}
        alt=""
        width={1181}
        height={684}
        className="pointer-events-none absolute left-[-482px] top-[-186px] h-[684px] w-[1181px] max-w-none -scale-y-100"
      />
      {m ? (
        <p className={cn("absolute left-[23px] top-[31px] w-[276px] font-display text-[16px] font-medium leading-[1.46] text-[#d7d3fd]", TRIM)}>{card.body}</p>
      ) : (
        <p className="absolute left-[23px] top-[25px] w-[276px] font-display text-lg font-medium leading-lg tracking-normal text-[color:var(--color-tag-neutral-text)]">
          {card.body}
        </p>
      )}
      <div className="absolute left-[23px] top-[382px] flex h-[17px] items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.icon} alt="" width={28} height={28} className="size-[28px] shrink-0" />
        {m ? (
          <h3 className={cn("whitespace-nowrap font-display text-[20px] font-bold leading-[1.1] text-[#e2dffe]", TRIM)}>{card.name}</h3>
        ) : (
          <h3 className="whitespace-nowrap font-display text-2xl font-semibold leading-2xl tracking-normal text-[color:var(--color-blue-100)]">{card.name}</h3>
        )}
      </div>
      <span
        aria-hidden
        className={cn("absolute left-[291px] top-[308px] -translate-x-full -translate-y-full whitespace-nowrap text-right font-display text-[80px] font-bold leading-[1.1] text-[#453e83]", TRIM)}
      >
        {card.n}
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_4px_22px_13px_rgba(119,104,247,0.2)]" />
    </div>
  );
}

export function Ecosystem() {
  // Index into CARDS of the card in front. Figma: F-6.
  const [front, setFront] = React.useState(CARDS.length - 1);
  const cardRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const count = CARDS.length;

  // Card i's place in the deck: the top card is slot 0, then F-(n-1) … down.
  const slotOf = (i: number) => (front - i + count) % count;

  const go = (dir: 1 | -1) => {
    const leaving = dir === 1 ? front : (front + 1) % count;
    const el = cardRefs.current[leaving];
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el && !reduce && typeof el.animate === "function") {
      // The card being shuffled slides out to the side and back into its slot.
      const from = slotTransform(dir === 1 ? 0 : count - 1);
      const to = slotTransform(dir === 1 ? count - 1 : 0);
      el.animate(
        [
          { transform: from },
          { transform: `translate(-50%, -50%) translate(${dir * 210}px, -12px) rotate(${dir * 10}deg)`, offset: 0.45 },
          { transform: to },
        ],
        { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
    }
    setFront((f) => (f - dir + count) % count);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(-1);
    }
  };

  const current = CARDS[front];
  const next = CARDS[(front - 1 + count) % count];

  return (
    <section aria-labelledby="ecosystem-title" className="relative overflow-hidden bg-[var(--color-bg-page)] py-40 xl:pb-[154px] xl:pt-[150px]">
      {/* Figma 18532:53763 "BG 3" — Union grid, mirrored on y */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${A}/bg-grid.svg`}
        alt=""
        width={1440}
        height={1116}
        className="pointer-events-none absolute left-1/2 top-[-68px] h-[1116px] w-[1440px] max-w-none -translate-x-1/2 -scale-y-100"
      />
      {/* Figma 18532:53765 — the photo (crop from Figma), blur 54 → CSS 27, 20 % */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 flex h-[1035px] w-[1440px] -translate-x-1/2 items-center justify-center">
        <div className="relative h-[1440px] w-[1035px] shrink-0 -rotate-90 overflow-hidden opacity-20 blur-[27px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${A}/section-glow.png`} alt="" width={1199} height={685} className="absolute left-[-142.65%] top-0 h-[99.97%] w-[242.65%] max-w-none" />
        </div>
      </div>

      {/* Figma 18532:53766 */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-24 px-8 xl:gap-[92px] xl:px-0">
        {/* Figma 18532:53767 */}
        <LandingSectionHeader
          id="ecosystem-title"
          eyebrow="The Ecosystem"
          title="One Platform. Complete Ecosystem."
          lead={
            <>
              <span className="md:block">Everything you need to create, launch, and scale hardware products </span>
              <span className="md:block">in one unified ecosystem.</span>
            </>
          }
        />

        {/* Figma 18532:53774 */}
        <div className="relative h-[391px] w-full sm:h-[458px]">
          {/* Figma 18532:53775 — six dots, behind the deck */}
          <div
            aria-hidden
            className="absolute left-[calc(50%+150px)] top-[192px] hidden w-[15px] items-center justify-center rounded-[32px] border border-solid border-[#4b476f] bg-[#3d395f] px-[2px] py-[3px] sm:flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${A}/dots.svg`} alt="" width={10} height={80} className="h-[80px] w-[10px]" />
          </div>

          {/* Figma 18532:53783 — the deck, 372 × 460; 85 % below 640 */}
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="IDEEZA ecosystem"
            className="absolute left-1/2 top-0 h-[391px] w-[316.2px] -translate-x-1/2 sm:top-1/2 sm:h-[460px] sm:w-[372px] sm:-translate-y-1/2"
          >
            <div className="absolute left-0 top-0 h-[460px] w-[372px] origin-top-left scale-[0.85] sm:scale-100">
              {CARDS.map((card, i) => {
                const slot = slotOf(i);
                return (
                  <div
                    key={card.n}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${card.n} of ${count}: ${card.name}`}
                    aria-hidden={slot !== 0}
                    className="absolute left-1/2 top-1/2 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
                    style={{ transform: slotTransform(slot), zIndex: count - slot }}
                  >
                    <EcoCard card={card} />
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => go(1)}
                onKeyDown={onKeyDown}
                aria-label={`Show the next card: ${next.name}`}
                className="absolute left-[25px] top-[16px] z-10 h-[428px] w-[324px] cursor-pointer rounded-[22px] outline-none focus-visible:shadow-focus-brand"
              />
            </div>
            <p aria-live="polite" className="sr-only">
              {`Card ${current.n} of ${count}: ${current.name}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
