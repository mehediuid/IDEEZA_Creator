"use client";

// Onboarding (the owner's design, 2026-11-09): four screens between the
// Splash and Welcome, the first time the app opens signed out. Each is an
// illustration, a title and one line, with dots, Next (Continue on the last)
// and Skip; swipe works too. Skip, or Continue on the last, marks the phone as onboarded and
// opens Welcome (the ways in), carrying where the person was going. On the
// brand's night like the Splash, whatever the phone's theme; the
// illustrations are drawn from DS tokens and stand still under reduced
// motion.

import * as React from "react";
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  CursorPointer01Icon,
  EthereumIcon,
  Factory01Icon,
  HashtagIcon,
  Layers01Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Button } from "@/components/ideeza/button";
import { cn } from "@/lib/utils";
import { HomeIndicator } from "../home-indicator";
import { StatusBar } from "../status-bar";
import { T } from "../type";
import { SplashBackdrop } from "./parts";

type Slide = { title: string; body: string; art: () => React.ReactNode };

const SLIDES: Slide[] = [
  {
    title: "Turn Your Idea Into a Real Product",
    body: "Describe your hardware idea in a single prompt. Our AI instantly generates the PCB, Coding, and 3D enclosure.",
    art: () => <GlobeArt />,
  },
  {
    title: "No Engineering Skills? No Problem",
    body: "Let AI build it for you, or dive in manually if you're an engineer. Both paths lead to the same place.",
    art: () => <PathsArt />,
  },
  {
    title: "From Design to Manufacturing",
    body: "Ready to build it for real? Connect with verified manufacturing partners and bring your product to life.",
    art: () => <PipelineArt />,
  },
  {
    title: "Your Invention, Now your Digital Asset",
    body: "Register your product as a digital asset, own it as an NFT, and showcase it to a global creator community.",
    art: () => <NftArt />,
  },
];

/** Glass on the night: the cards and chips the illustrations are made of. */
const GLASS =
  "border-[length:var(--border-width-1)] border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_45%,transparent)] [background-color:color-mix(in_srgb,var(--color-violet-500)_22%,transparent)] backdrop-blur-sm";
const DASHED =
  "border-[length:var(--border-width-1)] border-dashed border-[color:color-mix(in_srgb,var(--color-violet-300)_60%,transparent)] [background-color:color-mix(in_srgb,var(--color-violet-600)_28%,transparent)]";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = React.useState(0);
  const start = React.useRef<number | null>(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const go = (to: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, to)));
  const next = () => (last ? onDone() : go(index + 1));

  return (
    <div data-theme="dark" className="relative isolate flex h-full flex-col overflow-hidden bg-bg-page text-text-primary">
      <SplashBackdrop />
      <StatusBar tone="media" />
      <div className="flex shrink-0 justify-end px-4">
        <button
          type="button"
          onClick={onDone}
          className={cn(T.bodyLg, "inline-flex min-h-[44px] items-center gap-1 rounded-lg px-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
        >
          Skip
          <Icon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
      <section
        aria-roledescription="carousel"
        aria-label="What IDEEZA does"
        className="flex min-h-0 flex-1 touch-pan-y flex-col"
        onPointerDown={(e) => {
          start.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (dx < -50) next();
          else if (dx > 50) go(index - 1);
        }}
      >
        <div
          key={index}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${SLIDES.length}`}
          className="flex min-h-0 flex-1 flex-col motion-safe:animate-[m-onb-in_320ms_ease-out]"
        >
          <div aria-hidden className="relative mx-auto flex min-h-[320px] w-full max-w-[375px] flex-1 items-center justify-center">
            {slide.art()}
          </div>
          {/* One height for every screen's words, so the titles sit on one line across the four. */}
          <div className="flex h-[152px] shrink-0 flex-col items-center gap-4 px-8 text-center">
            <h1 className={cn(T.display, "text-balance")}>{slide.title}</h1>
            <p className={cn(T.body, "max-w-[311px] text-balance")}>{slide.body}</p>
          </div>
        </div>
      </section>
      <div className="flex shrink-0 flex-col gap-8 px-8 pb-2 pt-8">
        <div aria-hidden className="flex items-center justify-center gap-3">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={cn(
                "h-[8px] rounded-full transition-[width,background-color] duration-200",
                i === index ? "w-[24px] bg-[var(--color-violet-500)]" : "w-[8px] [background-color:color-mix(in_srgb,var(--color-white)_30%,transparent)]",
              )}
            />
          ))}
        </div>
        <Button size="xl" className="w-full" onClick={next}>
          {last ? "Continue" : "Next"}
        </Button>
      </div>
      <HomeIndicator tone="media" />
    </div>
  );
}

// ─────────────────────────── 1 · the idea becomes a product ───────────────────────────

function GlobeArt() {
  return (
    <div className="relative h-[340px] w-[343px]">
      <svg viewBox="0 0 343 340" className="absolute inset-0 size-full" fill="none">
        <defs>
          <radialGradient id="onb-globe" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--color-violet-400)" stopOpacity="0.55" />
            <stop offset="70%" stopColor="var(--color-violet-800)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-violet-950)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="onb-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="55%" stopColor="#fff" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="onb-globe-mask">
            <rect width="343" height="340" fill="url(#onb-fade)" />
          </mask>
        </defs>
        <g mask="url(#onb-globe-mask)">
          <circle cx="171.5" cy="200" r="118" fill="url(#onb-globe)" />
          <g stroke="var(--color-violet-200)" strokeOpacity="0.45" strokeDasharray="1.5 5" strokeLinecap="round">
            {[0.25, 0.5, 0.75].map((k) => (
              <ellipse key={`lat${k}`} cx="171.5" cy={200 - 118 + 236 * k} rx={118 * Math.sin(Math.PI * k)} ry={118 * Math.sin(Math.PI * k) * 0.22} />
            ))}
            {[0.3, 0.6, 0.85].map((k) => (
              <ellipse key={`lon${k}`} cx="171.5" cy="200" rx={118 * k} ry="118" />
            ))}
            <line x1="171.5" y1="82" x2="171.5" y2="318" />
          </g>
          <circle cx="171.5" cy="200" r="118" stroke="var(--color-violet-300)" strokeOpacity="0.35" />
        </g>
        <ellipse cx="171.5" cy="200" rx="164" ry="58" transform="rotate(-14 171.5 200)" stroke="var(--color-violet-400)" strokeOpacity="0.45" />
      </svg>
      <Chip label="PCB Design" className="left-[20px] top-[34px] -rotate-[20deg]" />
      <Chip label="3D Enclosure" className="right-[6px] top-[86px] rotate-[14deg]" />
      <Chip label="Firmware Code" className="bottom-[34px] left-[64px] -rotate-[16deg]" />
      <div className="absolute left-1/2 top-[150px] flex h-[48px] w-[316px] -translate-x-1/2 items-center justify-between rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-violet-200)] bg-[var(--color-gray-950)] px-6 shadow-[0_0_28px_color-mix(in_srgb,var(--color-violet-500)_70%,transparent)]">
        <span className={T.rowTitle}>Describe your hardware idea...</span>
        <Icon icon={SparklesIcon} size={18} />
      </div>
    </div>
  );
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("absolute flex items-center gap-2 rounded-lg px-4 py-2", DASHED, className)}>
      <span className="text-[color:var(--color-violet-200)] motion-safe:animate-spin">
        <Icon icon={Loading03Icon} size={14} />
      </span>
      <span className={cn(T.rowTitle)}>{label}</span>
    </span>
  );
}

// ─────────────────────────── 2 · two ways, one place ───────────────────────────

function PathsArt() {
  return (
    <div className="relative h-[340px] w-[343px]">
      <svg viewBox="0 0 343 340" className="absolute inset-0 size-full" fill="none">
        <path d="M18 112 C 0 160, 30 180, 80 176" stroke="var(--color-violet-300)" strokeOpacity="0.5" strokeDasharray="3 4" />
        <path d="M262 176 C 320 176, 330 200, 322 222" stroke="var(--color-violet-300)" strokeOpacity="0.5" strokeDasharray="3 4" />
      </svg>
      <PathCard
        title="For Creators"
        body="Just describe what you want. Our AI handles the technical complexity. No CAD skills needed. No coding."
        className="left-[8px] top-[18px] -rotate-[4deg]"
      />
      <div className="absolute left-1/2 top-[158px] flex h-[38px] -translate-x-1/2 -rotate-[3deg] items-center gap-5 rounded-lg border-[length:var(--border-width-1)] border-solid border-[color:color-mix(in_srgb,var(--color-white)_22%,transparent)] bg-[var(--color-gray-950)] px-5">
        <IdeezaLogo height={18} decorative className="opacity-80" />
        <span className={T.meta}>AI Generating…</span>
      </div>
      <PathCard
        title="For Engineers"
        body="All the professional tools you know, supercharged with AI. Edit every trace, every line of code, every dimension."
        bright
        className="bottom-[16px] right-[4px] -rotate-[2deg]"
      />
    </div>
  );
}

function PathCard({ title, body, bright, className }: { title: string; body: string; bright?: boolean; className: string }) {
  return (
    <div
      className={cn(
        "absolute flex w-[300px] flex-col gap-2 rounded-xl p-6",
        GLASS,
        bright && "[background-color:color-mix(in_srgb,var(--color-violet-500)_45%,transparent)] shadow-[0_0_32px_color-mix(in_srgb,var(--color-violet-500)_40%,transparent)]",
        className,
      )}
    >
      <span className={cn(T.rowTitle, "flex items-center gap-2")}>
        <Icon icon={SparklesIcon} size={16} />
        {title}
      </span>
      <span className={T.meta}>{body}</span>
    </div>
  );
}

// ─────────────────────────── 3 · design to manufacturing ───────────────────────────

const PIPELINE: { icon: IconValue; title: string; body: string }[] = [
  { icon: HashtagIcon, title: "Your Design", body: "Upload or Create Your Product Design" },
  { icon: Layers01Icon, title: "Prototype", body: "Rapid Prototyping with Smart Manufacturing" },
  { icon: CheckmarkCircle01Icon, title: "Review & Approve", body: "Review, Validate & Approve Your Design" },
  { icon: Factory01Icon, title: "Production", body: "Scale Your Product To Full Manufacturing" },
];

function PipelineArt() {
  return (
    <div className="relative flex w-[311px] flex-col gap-5">
      {PIPELINE.map((row, i) => {
        const lifted = i === 1;
        return (
          <div
            key={row.title}
            className={cn(
              "relative flex flex-col gap-1 rounded-lg px-5 py-4",
              DASHED,
              lifted && "-rotate-[3deg] translate-x-[6px] [background-color:color-mix(in_srgb,var(--color-violet-500)_50%,transparent)] shadow-[0_0_28px_color-mix(in_srgb,var(--color-violet-500)_45%,transparent)]",
            )}
          >
            <span className={cn(T.rowTitle, "flex items-center gap-3")}>
              <Icon icon={row.icon} size={18} />
              {row.title}
            </span>
            <span className={T.caption}>{row.body}</span>
            {lifted && (
              <span className="absolute -bottom-[14px] -right-[10px] text-[color:var(--color-white)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                <Icon icon={CursorPointer01Icon} size={30} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── 4 · a digital asset ───────────────────────────

function NftArt() {
  return (
    <div className="relative h-[330px] w-[343px]">
      <div className="absolute left-[84px] top-[6px] h-[250px] w-[190px] rotate-[6deg] rounded-2xl [background-color:color-mix(in_srgb,var(--color-violet-700)_45%,transparent)] blur-[2px]" />
      <NftCard className="left-[10px] top-[22px] -rotate-[9deg]" />
      <NftCard className="right-[8px] top-[70px] rotate-[16deg]" back />
    </div>
  );
}

function NftCard({ className, back }: { className: string; back?: boolean }) {
  return (
    <div
      className={cn(
        "absolute flex h-[240px] w-[172px] flex-col items-center justify-between overflow-hidden rounded-2xl border-[length:var(--border-width-2)] border-solid p-6 text-center shadow-[0_0_36px_color-mix(in_srgb,var(--color-violet-500)_45%,transparent)]",
        back ? "border-[var(--color-blue-400)]" : "border-[var(--color-violet-300)]",
        "bg-[radial-gradient(120%_80%_at_30%_10%,var(--color-violet-500)_0%,var(--color-violet-900)_55%,var(--color-violet-950)_100%)]",
        className,
      )}
    >
      <span aria-hidden className="absolute -bottom-[30px] -left-[20px] size-[120px] rounded-full bg-[var(--color-blue-500)] opacity-30 blur-[30px]" />
      <span />
      <span className="relative flex flex-col items-center gap-2">
        <span className={T.section}>
          Enter The
          <br />
          IDZ NFT
        </span>
        <span className={cn(T.overline, "text-text-secondary")}>NFT Collection</span>
        <span className={cn(T.meta, "flex items-center gap-1 tabular-nums")}>
          <Icon icon={EthereumIcon} size={12} />
          12:75
        </span>
      </span>
      <span className={cn(T.micro, "relative")}>2026</span>
    </div>
  );
}
