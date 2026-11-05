"use client";

// Landing — "Manufacturing Network", Figma IDEEZA Website V-2 18836:45562
// (1440 × 1215, page y 8905). The section frame draws step 1 ("Your Design");
// the same file draws the other three steps as sibling frames on the
// "Whole Landing page" board — 18836:45133 (Prototype), 18836:45434
// (Review & Approve) and 18836:46039 (Production) — so the four tabs are real
// tabs and each one shows its own Figma panel.
//
// Every panel card (623 × 514) is a mirrored frame in Figma (scale −1 on x).
// The photo and the BG 1 grid keep Figma's own transforms; everything else is
// placed at its on-screen position in the card, read from the frames'
// absolute bounding boxes, so no text is drawn through a mirror.

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { LandingSectionHeader } from "./section-header";

const A = "/landing/manufacturing";

// Figma trims these labels to their cap height (text-box-trim). Gradient ink is
// clipped to the element's box, so trimmed gradient text gets 10 px of padding
// for the glyphs to paint into (browsers without text-box-trim keep it whole).
const TRIM = "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";
const GLOW = "bg-clip-text text-transparent";
// Figma's gradient handles reach past the text boxes; the CSS stops below are
// re-projected from those handles (the codegen output loses their minus signs).
// The gray captions: #9da2b6 under a 90 % gradient.
const GRAY_INK =
  "bg-[linear-gradient(270deg,rgba(1,9,23,0.54)_-15.69%,rgba(216,221,254,0.72)_56.89%,rgba(216,221,254,0.018)_123.36%),linear-gradient(#9da2b6,#9da2b6)]";

type StepId = "design" | "prototype" | "review" | "production";

type Step = {
  id: StepId;
  label: string;
  /** 24 px tab icon — Figma 18836:45578 / 45587 / 45595 / 45602. */
  icon: string;
  /** 14 px icon in the panel's chip — Figma 18836:45838 / 45231 / 45538 / 46212. */
  chipIcon: string;
  /** The active tab's arrow shape at this position (Figma "image 482"). */
  shape: { src: string; width: number };
  title: React.ReactNode;
  body: string;
  /** Steps 2–4 set the title in raw #fff; step 1 binds color/text/primary. */
  rawWhiteTitle?: boolean;
  /** Card on the left, copy on the right (steps 1 and 3); else mirrored. */
  cardLeft: boolean;
  art: React.ReactNode;
  artLabel: string;
  grid: string;
};

/* ───────────────────────────── badges ───────────────────────────── */

type Tone = "blue" | "brand" | "neutral" | "success";

const TONE: Record<Tone, string> = {
  blue: "bg-[var(--color-badge-blue-bg)] text-[color:var(--color-badge-blue-text)]",
  brand: "bg-[var(--color-badge-brand-bg)] text-[color:var(--color-badge-brand-text)]",
  neutral: "bg-[var(--color-bg-subtle)] text-[color:var(--color-text-secondary)]",
  success: "bg-[var(--color-badge-success-bg)] text-[color:var(--color-badge-success-text)]",
};

/**
 * DS A17 Badge · Dot · MD with the Code/SM label (Roboto Mono 12/18) these
 * cards use. The DS <Badge> is a rounded-full Manrope chip, so this is local.
 * Figma's dot is the badge's text colour in every tone drawn here.
 */
function CodeBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 font-mono text-sm font-regular leading-sm tracking-normal",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className="size-[6px] shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** DS A17 Badge · MD with the Caption/SM label (Manrope 11/16) — step 3's rows. */
function CaptionBadge({ tone, check, children }: { tone: "blue" | "brand"; check?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 font-display text-xs font-regular leading-xs tracking-normal",
        TONE[tone],
      )}
    >
      {check ? (
        // Figma icon/checkmark-circle-01 (I18836:45496;491:289)
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} color="currentColor" strokeWidth={1.5} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

/* ───────────────────────────── the card frame ───────────────────────────── */

/**
 * Frame 2147224509 / 2147224511 — the 623 × 514 card every step draws: white
 * 4 % fill, radius 24, the blurred workshop photo and the BG 1 grid. Figma's
 * GLASS effect has no CSS twin; the rim it lights is a 1 px white-14 % line.
 */
function StepCard({ grid, label, children }: { grid: string; label: string; children: React.ReactNode }) {
  return (
    <div role="img" aria-label={label} className="relative h-[514px] w-[623px] overflow-hidden rounded-[24px] bg-[rgba(255,255,255,0.04)]">
      {/* Figma 18836:45608 — the photo (crop from Figma), blur 14 → CSS 7, 30 %, inside the frame's mirror */}
      <div aria-hidden className="absolute inset-0 flex -scale-x-100 items-center justify-center">
        <div className="relative h-[623px] w-[514px] shrink-0 -rotate-90 overflow-hidden rounded-[24px] opacity-30 blur-[7px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${A}/card-photo.png`}
            alt=""
            width={1024}
            height={586}
            className="absolute left-[-68.1%] top-[-17.38%] h-[127.23%] w-[270.27%] max-w-none"
          />
        </div>
      </div>
      {/* Figma 18836:45609 — BG 1 (Union grid) */}
      <Art src={grid} w={1439} h={954} className="left-[14px] top-[-116px] h-[954px] w-[1439px] -scale-y-100" />
      {children}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px] border border-solid border-[rgba(255,255,255,0.14)]" />
    </div>
  );
}

/** A decorative image placed inside a card. */
function Art({ src, w, h, className }: { src: string; w: number; h: number; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={w} height={h} className={cn("pointer-events-none absolute max-w-none", className)} />
  );
}

/* ───────────────────────────── step 1 · Your Design ───────────────────────────── */

function DesignArt() {
  return (
    <>
      {/* Figma 18836:45611 — circuit traces */}
      <Art src={`${A}/circuit.svg`} w={418} h={334} className="left-[-61px] top-[76px] h-[334px] w-[418px] -scale-y-100" />
      {/* Figma 18836:45617 — the PCB chip (45618 body, 45800 face, 45802 core, 45805/45813/45821/45828 pins) */}
      <Art src={`${A}/chip-body.svg`} w={124.725} h={135.637} className="left-[312.8px] top-[130.3px] h-[135.637px] w-[124.725px]" />
      <Art src={`${A}/chip-face.svg`} w={96.7485} h={110.75} className="left-[323.6px] top-[134.5px] h-[110.75px] w-[96.7485px]" />
      <Art src={`${A}/chip-core.svg`} w={70.5137} h={81.7666} className="left-[332.1px] top-[154.8px] h-[81.7666px] w-[70.5137px]" />
      <Art src={`${A}/chip-pins-top.svg`} w={45.9958} h={15.6541} className="left-[343.2px] top-[130.3px] h-[15.6541px] w-[45.9958px]" />
      <Art src={`${A}/chip-pins-bottom.svg`} w={45.9947} h={15.5884} className="left-[343.2px] top-[238.6px] h-[15.5884px] w-[45.9947px]" />
      <Art src={`${A}/chip-pins-right.svg`} w={14.6175} h={41.5549} className="left-[411.6px] top-[167.7px] h-[41.5549px] w-[14.6175px]" />
      <Art src={`${A}/chip-pins-left.svg`} w={13.9968} h={47.964} className="left-[312.8px] top-[168.3px] h-[47.964px] w-[13.9968px]" />
      {/* Figma 18836:45803 / 45804 — Advent Pro Medium, gradient ink */}
      <span
        className={cn(
          "absolute right-[238px] top-[183px] -translate-y-1/2 whitespace-nowrap py-[10px] bg-[linear-gradient(10.78deg,rgba(152,147,244,0.9)_-11.98%,rgba(182,172,239,0.9)_70.45%,rgba(3,1,23,0.54)_160.47%)] [font-family:'Advent_Pro',var(--font-family-display)] text-[26px] font-medium leading-[1.5] tracking-[-0.26px]",
          GLOW,
          TRIM,
        )}
      >
        PCB
      </span>
      <span
        className={cn(
          "absolute right-[245px] top-[213.5px] -translate-y-1/2 whitespace-nowrap py-[10px] bg-[linear-gradient(12.51deg,rgba(152,147,244,0.9)_-8%,rgba(182,172,239,0.9)_67.87%,rgba(3,1,23,0.54)_150.72%)] [font-family:'Advent_Pro',var(--font-family-display)] text-[16px] font-medium leading-[1.5] tracking-[-0.16px]",
          GLOW,
          TRIM,
        )}
      >
        V 1.0
      </span>
      {/* Figma 18836:45614 / 45615 / 45616 — A17 Badges (Figma spells it "Al", a typo for AI) */}
      <CodeBadge tone="blue" className="absolute left-[373px] top-[297px] w-[149px]">
        PCB · AUTO-ROUTED
      </CodeBadge>
      <CodeBadge tone="brand" className="absolute left-[327px] top-[339px]">
        AI Generated • 0.8s
      </CodeBadge>
      <CodeBadge tone="neutral" className="absolute left-[359px] top-[381px]">
        FIRMWARE CODE • 0.9s
      </CodeBadge>
    </>
  );
}

/* ───────────────────────────── step 2 · Prototype ───────────────────────────── */

const ROW_LIT = "bg-[linear-gradient(111.72deg,rgb(67,61,121)_-25.49%,rgb(21,18,50)_101.96%)]";
const ROW_DIM = "bg-[linear-gradient(111.72deg,rgb(23,19,62)_-25.49%,rgb(20,17,47)_101.96%)]";

const BUILD_STEPS = [
  // Figma 18836:45186 / 45195 / 45204 / 45213
  { title: "Design Verified", note: "PCB & firmware validated", icon: "status-verified.svg", bg: ROW_LIT },
  { title: "Components Sourced", note: "BOM confirmed, parts ordered", icon: "status-sourced.svg", bg: ROW_DIM },
  { title: "PCB Fabrication", note: "In progress - Est. 3 days", icon: "status-in-progress.svg", bg: "bg-[#292556]" },
  { title: "Assembly & Testing", note: "Pending", icon: "status-pending.svg", bg: ROW_DIM },
];

function PrototypeArt() {
  return (
    <>
      {/* Figma 18836:45222 — #9da2b6 under a 90 % gradient */}
      <p className={cn("absolute left-[64px] top-[87px] w-[284px] whitespace-pre font-display text-md font-medium leading-md tracking-normal", GRAY_INK, GLOW)}>
        {"Spy Drone version 2.0  (In-Process)"}
      </p>
      {/* Figma 18836:45185 — the build list */}
      <ul className="absolute left-[64px] top-[139px] flex w-[284px] flex-col gap-8">
        {BUILD_STEPS.map((s) => (
          <li
            key={s.title}
            className={cn("flex h-[60px] w-full items-center gap-6 rounded-[10px] border border-solid border-[#38354c] pl-[13px] backdrop-blur-[17px]", s.bg)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${A}/${s.icon}`} alt="" width={24} height={24} className="size-[24px] shrink-0" />
            <span className="flex flex-col whitespace-nowrap tracking-normal">
              <span className="font-display text-md font-medium leading-md text-white">{s.title}</span>
              <span className="font-display text-sm font-regular leading-xs text-[color:var(--color-text-secondary)]">{s.note}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* Figma 18836:45223 — build progress */}
      <div className="absolute left-[381px] top-[191.5px] flex w-[178px] flex-col items-center gap-[34px]">
        <div className="flex w-full flex-col items-center gap-[20px]">
          <p className="w-full text-center font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-ai)]">BUILD PROGRESS</p>
          <p
            className={cn(
              "-my-[10px] w-full py-[10px] text-center bg-[linear-gradient(270deg,rgba(217,204,254,0)_7.86%,rgb(217,204,254)_54.89%,rgba(217,204,254,0)_95.6%)] font-display text-[34px] font-bold leading-[16px]",
              GLOW,
              TRIM,
            )}
          >
            72%
          </p>
        </div>
        <CodeBadge tone="blue">Est. Delivery: 7 days</CodeBadge>
      </div>
    </>
  );
}

/* ───────────────────────────── step 3 · Review & Approve ───────────────────────────── */

const REVIEW_LIT = "bg-[linear-gradient(106.29deg,rgb(67,61,121)_-23.46%,rgb(21,18,50)_100.38%)]";
const REVIEW_DIM = "bg-[linear-gradient(106.29deg,rgb(23,19,62)_-23.46%,rgb(20,17,47)_100.38%)]";

const REVIEW_ROWS = [
  // Figma 18836:45487 / 45497 / 45507
  { label: "PCB Layers", value: "4-Layer", tone: "blue" as const, check: true, bg: REVIEW_LIT },
  { label: "Min Trace Width", value: "0.15mm", tone: "blue" as const, check: true, bg: REVIEW_DIM },
  { label: "BOM Cost", value: "$12.40 / unit", tone: "brand" as const, check: false, bg: "bg-[#292556]" },
];

function ReviewArt() {
  return (
    <>
      {/* Figma 18836:45522 — the reviewer */}
      <div className="absolute left-[60px] top-[108px] flex items-center gap-6">
        {/* Figma 18836:45523 */}
        <span className="relative size-[42px] shrink-0 overflow-hidden rounded-full border border-solid border-[#dfd4fe] bg-[rgba(197,198,254,0.6)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${A}/reviewer-avatar.png`}
            alt=""
            width={169}
            height={192}
            className="absolute left-[-3.1%] top-[10.2%] h-[122.11%] w-[107.91%] max-w-none"
          />
        </span>
        <span className="flex items-start gap-4 whitespace-nowrap">
          <span className="flex flex-col gap-[3px]">
            {/* Figma 18836:45526 — same ink as 18836:45222 */}
            <span className={cn("font-display text-md font-semibold leading-md tracking-wide", GRAY_INK, GLOW)}>Piter Anderson</span>
            <span className="font-display text-sm font-regular leading-xs tracking-normal text-[color:var(--color-text-secondary)]">
              Lead Engineer • IDEEZA
            </span>
          </span>
          {/* Figma 18836:45528 — A17 Badge · Warning · SM */}
          <span className="rounded-sm bg-[var(--color-badge-warning-bg)] px-3 py-1 font-display text-xs font-regular leading-xs tracking-normal text-[color:var(--color-badge-warning-text)]">
            Reviewing
          </span>
        </span>
      </div>
      {/* Figma 18836:45486 — the checks */}
      <ul className="absolute left-[60px] top-[182px] flex w-[284px] flex-col gap-6">
        {REVIEW_ROWS.map((r) => (
          <li
            key={r.label}
            className={cn(
              "flex h-[44px] w-full items-center gap-6 rounded-[8px] border border-solid border-[#38354c] pl-[13px] pr-[9px] backdrop-blur-[17px]",
              r.bg,
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${A}/review-row-icon.svg`} alt="" width={16} height={16} className="size-[16px] shrink-0" />
            <span className="flex min-w-0 flex-1 items-center justify-between">
              <span className="whitespace-nowrap font-display text-md font-medium leading-md tracking-normal text-[#ece0fe]">{r.label}</span>
              <CaptionBadge tone={r.tone} check={r.check}>
                {r.value}
              </CaptionBadge>
            </span>
          </li>
        ))}
        {/* Figma 18836:45517 — drawn inside the illustration, not a control */}
        <li className="flex h-[56px] w-full items-center justify-center rounded-[8px] border border-solid border-[#38354c] bg-[linear-gradient(110.41deg,rgb(23,19,62)_-24.94%,rgb(20,17,47)_101.54%)] px-[13px] backdrop-blur-[17px]">
          <span
            className={cn(
              "whitespace-nowrap text-center bg-[linear-gradient(246.4deg,rgba(217,204,254,0)_-26.42%,rgb(217,204,254)_52.87%,rgba(217,204,254,0)_129.23%)] font-display text-md font-semibold leading-md tracking-wide",
              GLOW,
            )}
          >
            Approve &amp; Proceed
            <br />
            to Production
          </span>
        </li>
      </ul>
      {/* Figma 18836:45529 — manufacturability */}
      <div className="absolute left-[382px] top-[172px] flex w-[181px] flex-col items-center gap-[34px]">
        <div className="flex flex-col items-center gap-4 whitespace-nowrap">
          <p className="font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-ai)]">Manufacturability</p>
          <p
            className={cn(
              "bg-[linear-gradient(254.46deg,rgba(217,204,254,0)_-21.87%,rgb(217,204,254)_55.38%,rgba(217,204,254,0)_129.78%)] font-display text-4xl font-semibold leading-4xl tracking-near",
              GLOW,
            )}
          >
            Score: 94/100
          </p>
        </div>
        <div className="flex w-[149px] flex-col gap-6">
          <CodeBadge tone="blue" className="w-full">
            Lead Time- 10Days
          </CodeBadge>
          <CodeBadge tone="neutral" className="w-full">
            PCB · AUTO-ROUTED
          </CodeBadge>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── step 4 · Production ───────────────────────────── */

const STAT_LIT = "bg-[linear-gradient(124.91deg,rgb(67,61,121)_-33.09%,rgb(21,18,50)_107.85%)]";
const STAT_DIM = "bg-[linear-gradient(124.91deg,rgb(23,19,62)_-33.09%,rgb(20,17,47)_107.85%)]";

const STATS = [
  // Figma 18836:46206 / 46202 / 46198 (top to bottom on screen)
  { label: "Min. Order", value: "1000+", bg: STAT_LIT, ink: "bg-[linear-gradient(235.04deg,rgba(217,204,254,0)_-35.72%,rgb(217,204,254)_47.78%,rgba(217,204,254,0)_128.19%)]" },
  { label: "Partners", value: "24", bg: STAT_LIT, ink: "bg-[linear-gradient(209.52deg,rgba(217,204,254,0)_-64.55%,rgb(217,204,254)_31.96%,rgba(217,204,254,0)_124.91%)]" },
  { label: "Lead Time", value: "14 Days", bg: STAT_DIM, ink: "bg-[linear-gradient(239.94deg,rgba(217,204,254,0)_-31.31%,rgb(217,204,254)_50.19%,rgba(217,204,254,0)_128.68%)]" },
];

const PARTNER_INK = "bg-[linear-gradient(263.36deg,rgba(217,204,254,0)_-31.67%,rgb(217,204,254)_56.96%,rgba(217,204,254,0)_133.07%)]";

function ProductionArt() {
  return (
    <>
      {/* Figma 18836:46089 — headline + badges */}
      <div className="absolute left-[119.5px] top-[90px] flex w-[332px] flex-col items-center gap-[24px]">
        <p className={cn("-my-[10px] whitespace-nowrap py-[10px] text-center font-display text-[24px] font-bold leading-[16px]", PARTNER_INK, GLOW, TRIM)}>
          <span className="font-regular">Global </span>
          Partner: 24
        </p>
        <div className="flex items-center gap-6">
          <CodeBadge tone="success" className="w-[149px]">
            Production Live
          </CodeBadge>
          <CodeBadge tone="blue">Real-time production</CodeBadge>
        </div>
      </div>

      {/* Figma 18836:46096 — the production-run chart */}
      <Art src={`${A}/chart-rule.svg`} w={84} h={1} className="left-[460px] top-[204.5px] h-[1px] w-[84px]" />
      <Art src={`${A}/chart-line-run.svg`} w={439.493} h={142.214} className="left-[187.5px] top-[204px] h-[142.214px] w-[439.493px]" />
      {/* Figma 18836:46099 — clipped area under the run */}
      <div className="absolute left-[231px] top-[205px] h-[203px] w-[396px] overflow-hidden">
        <Art src={`${A}/chart-area.svg`} w={342.973} h={203} className="left-[53px] top-0 h-[203px] w-[342.973px]" />
        {/* Figma 18836:46101 — 84 bars (#6f66bf, 2.823 wide, 39.32°) masked by Vector 12 */}
        <span
          aria-hidden
          className="absolute left-[53px] top-0 h-[203px] w-[342.973px] bg-[repeating-linear-gradient(50.68deg,#6f66bf_0_2.823px,transparent_2.823px_5.77px)] [mask-image:url(/landing/manufacturing/chart-mask.svg)] [mask-repeat:no-repeat] [mask-size:100%_100%]"
        />
        {/* Figma 18836:46189 — the marker under the dot */}
        <Art src={`${A}/chart-marker.svg`} w={49.5} h={1} className="left-[329.65px] top-[25.15px] h-[1px] w-[49.5px] -rotate-90" />
        {/* Figma 18836:46190 */}
        <p className={cn("absolute left-[156px] top-[177px] whitespace-nowrap text-right font-display text-lg font-semibold leading-lg tracking-normal", "bg-[linear-gradient(254.9deg,rgba(217,204,254,0)_-23.06%,rgb(217,204,254)_55.37%,rgba(217,204,254,0)_122.71%)]", GLOW)}>
          Production Run
        </p>
      </div>
      <Art src={`${A}/chart-line-plan.svg`} w={439.503} h={75} className="left-[187.5px] top-[247px] h-[75px] w-[439.503px]" />
      {/* Figma 18836:46192 — "72% Complete" (its ring is a conic-gradient stroke) */}
      <span className="absolute left-[394px] top-[192px] flex h-[28px] items-center gap-2 rounded-[28px] bg-[var(--color-card-bg-hover)] pl-[9px] pr-[13px] backdrop-blur-[8.5px]">
        <span
          aria-hidden
          className="size-[10px] shrink-0 rounded-full bg-[conic-gradient(from_90deg,rgba(103,98,151,0)_0deg,rgba(173,165,253,1)_12.26deg,rgba(103,98,151,0)_360deg)] [mask-image:radial-gradient(circle,transparent_4px,#000_4px)]"
        />
        <span className="whitespace-pre font-display text-xs font-regular leading-xs tracking-normal text-white">{"72%  Complete"}</span>
      </span>
      {/* Figma 18836:46196 */}
      <Art src={`${A}/chart-dot.svg`} w={9} h={9} className="left-[581px] top-[200.5px] size-[9px]" />

      {/* Figma 18836:46197 — key numbers */}
      <ul className="absolute left-[60px] top-[184px] flex flex-col gap-[7px] rounded-[10px] bg-[#19192d] p-[6px] backdrop-blur-[12px]">
        {STATS.map((s) => (
          <li key={s.label} className={cn("relative h-[54px] w-[146px] rounded-[6px] border border-solid border-[#38354c] backdrop-blur-[17px]", s.bg)}>
            <span className="absolute left-[15px] top-[calc(50%-0.5px)] flex -translate-y-1/2 flex-col items-start gap-2 whitespace-nowrap">
              <span className="font-display text-sm font-semibold leading-xs tracking-wide text-[color:var(--color-text-ai)]">{s.label}</span>
              <span className={cn("font-display text-lg font-semibold leading-lg tracking-wide", s.ink, GLOW)}>{s.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ───────────────────────────── the four steps ───────────────────────────── */

const STEPS: Step[] = [
  {
    id: "design",
    label: "Your Design",
    icon: `${A}/icon-design.svg`,
    chipIcon: `${A}/pill-design.svg`,
    shape: { src: `${A}/tab-active-1.svg`, width: 302 },
    title: "Upload or Create Your Product Design",
    body: "Start with your PCB, firmware, and 3D design in one unified workspace where you can create, manage, and prepare your product for manufacturing.",
    cardLeft: true,
    art: <DesignArt />,
    artLabel: "A PCB chip on auto-routed circuit traces, tagged PCB auto-routed, AI generated in 0.8 s and firmware code in 0.9 s.",
    grid: `${A}/card-grid.svg`,
  },
  {
    id: "prototype",
    label: "Prototype",
    icon: `${A}/icon-prototype.svg`,
    chipIcon: `${A}/pill-prototype.svg`,
    shape: { src: `${A}/tab-active-2.svg`, width: 300.851 },
    title: "Rapid Prototyping with Smart Manufacturing",
    body: "Quickly build and test working prototypes through connected manufacturing partners to validate your design before moving to full production.",
    rawWhiteTitle: true,
    cardLeft: false,
    art: <PrototypeArt />,
    artLabel:
      "Build tracker for Spy Drone version 2.0: design verified, components sourced, PCB fabrication in progress, assembly and testing pending. Build progress 72 %, estimated delivery 7 days.",
    grid: `${A}/card-grid.svg`,
  },
  {
    id: "review",
    label: "Review & Approve",
    icon: `${A}/icon-review.svg`,
    chipIcon: `${A}/pill-review.svg`,
    shape: { src: `${A}/tab-active-3.svg`, width: 300.851 },
    title: "Review, Validate & Approve Your Design",
    body: "Review specifications, pricing, and manufacturability details to ensure everything is correct before approving your design for production.",
    rawWhiteTitle: true,
    cardLeft: true,
    art: <ReviewArt />,
    artLabel:
      "Design review by Piter Anderson, lead engineer: 4-layer PCB, 0.15 mm minimum trace width, BOM cost $12.40 per unit. Manufacturability score 94 of 100, lead time 10 days.",
    grid: `${A}/card-grid.svg`,
  },
  {
    id: "production",
    label: "Production",
    icon: `${A}/icon-production.svg`,
    chipIcon: `${A}/pill-production.svg`,
    shape: { src: `${A}/tab-active-4.svg`, width: 300.851 },
    title: (
      <>
        Scale Your Product To Full
        <br />
        Manufacturing
      </>
    ),
    body: "Seamlessly move from prototype to full-scale manufacturing with trusted global production partners connected to IDEEZA.",
    rawWhiteTitle: true,
    cardLeft: false,
    art: <ProductionArt />,
    artLabel: "Production dashboard: 24 global partners, production live, minimum order 1000+, lead time 14 days, production run 72 % complete.",
    grid: `${A}/card-grid-production.svg`,
  },
];

/* ───────────────────────────── section ───────────────────────────── */

export function Manufacturing() {
  const [active, setActive] = React.useState(0);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const select = (i: number) => {
    const next = (i + STEPS.length) % STEPS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: STEPS.length - 1 };
    if (e.key in keys) {
      e.preventDefault();
      select(keys[e.key]);
    }
  };

  return (
    <section
      id="manufacturing"
      aria-labelledby="manufacturing-title"
      className="relative overflow-hidden bg-[var(--color-bg-page)] py-40 xl:pb-[115px] xl:pt-[150px]"
    >
      {/* Advent Pro, subset to the glyphs of "PCB V 1.0" — step 1's chip label (Figma 18836:45803).
          Only this section uses it; React hoists the link into <head>. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Advent+Pro:wght@500&text=PCBV%201.0&display=swap" precedence="default" />

      {/* Figma 18836:45563 "image 374" — the photo (crop from Figma), blur 74 → CSS 37, 20 % */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 flex h-[1215px] w-[1440px] -translate-x-1/2 items-center justify-center">
        <div className="relative h-[1440px] w-[1215px] shrink-0 rotate-90 -scale-y-100 overflow-hidden opacity-20 blur-[37px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${A}/section-glow.png`} alt="" width={683} height={1024} className="absolute left-0 top-[-9.95%] h-[126.58%] w-full max-w-none" />
        </div>
      </div>

      {/* Figma 18836:45564 */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-16 px-8 xl:gap-[80px] xl:px-0">
        {/* Figma 18836:45565 */}
        <div className="flex flex-col gap-24 xl:gap-[92px]">
          {/* Figma 18836:45566 */}
          <LandingSectionHeader
            id="manufacturing-title"
            eyebrow="Manufacturing Network"
            title="From Design to Delivery, Fully Connected"
            lead="Production-ready manufacturing partners, globally connected to IDEEZA."
          />

          {/* Figma 18836:45573 — the four steps */}
          <div
            role="tablist"
            aria-label="From design to delivery"
            className="grid grid-cols-2 gap-4 rounded-2xl border-2 border-solid border-[rgba(255,255,255,0.1)] bg-[rgba(26,26,26,0.1)] p-4 md:grid-cols-4 xl:flex xl:h-[84px] xl:gap-6"
          >
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`manufacturing-tab-${s.id}`}
                  aria-selected={on}
                  aria-controls={`manufacturing-panel-${s.id}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className="group relative flex min-h-[52px] min-w-0 cursor-pointer items-center justify-center gap-3 rounded-xl px-3 py-2 outline-none focus-visible:shadow-focus-brand md:gap-4 md:px-4 xl:h-[68px] xl:w-[302px] xl:shrink-0 xl:p-0"
                >
                  {on ? (
                    <>
                      {/* < 1280: a plain highlight in the shape's gradient */}
                      <span aria-hidden className="absolute inset-0 rounded-xl bg-[linear-gradient(77deg,rgba(123,130,211,0.4),rgba(120,127,197,0.1))] xl:hidden" />
                      {/* Figma 18836:45576 (and 45156 / 45465 / 46077) — "image 482", the active arrow */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.shape.src}
                        alt=""
                        width={s.shape.width}
                        height={68}
                        className="pointer-events-none absolute left-0 top-0 hidden h-[68px] max-w-none xl:block"
                      />
                    </>
                  ) : (
                    <span aria-hidden className="absolute inset-0 rounded-xl transition-colors group-hover:bg-[rgba(255,255,255,0.04)] xl:hidden" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.icon} alt="" width={24} height={24} className="relative size-[20px] shrink-0 md:size-[24px]" />
                  <span className="relative min-w-0 font-display text-md font-medium leading-md tracking-normal text-[color:var(--color-text-primary)] md:text-lg md:leading-lg xl:whitespace-nowrap xl:text-2xl xl:leading-[30px]">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Figma 18836:45606 — the active step (18836:45177 / 45478 / 46083 for steps 2–4) */}
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            role="tabpanel"
            id={`manufacturing-panel-${s.id}`}
            aria-labelledby={`manufacturing-tab-${s.id}`}
            hidden={i !== active}
            className={cn("relative flex-col items-center gap-16 xl:h-[514px]", i === active ? "flex xl:block" : "hidden")}
          >
            {/* Figma 18836:45836 — the copy */}
            <div className={cn("flex w-full max-w-[623px] flex-col gap-[36px] xl:absolute xl:top-[124px] xl:w-[446px]", s.cardLeft ? "xl:left-[691px]" : "xl:left-0")}>
              {/* Figma 18836:45837 "Overlay+Border" */}
              <span className="flex h-[38px] items-center justify-center gap-2 self-start rounded-[40px] border border-solid border-[#dfd4fe] px-8 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.chipIcon} alt="" width={14} height={14} className="size-[14px] shrink-0" />
                <span className="whitespace-nowrap font-display text-md font-medium leading-md tracking-normal text-[color:var(--color-text-primary)]">{s.label}</span>
              </span>
              {/* Figma 18836:45844 */}
              <div className="flex flex-col gap-16">
                <h3 className={cn("font-display text-5xl font-semibold leading-5xl tracking-close", s.rawWhiteTitle ? "text-white" : "text-[color:var(--color-text-primary)]")}>
                  {s.title}
                </h3>
                <p className="font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">{s.body}</p>
              </div>
            </div>

            {/* Figma 18836:45607 — the card; scaled to fit below 768, 1:1 from there */}
            <div
              className={cn(
                "relative h-[257px] w-[311.5px] shrink-0 sm:h-[462.6px] sm:w-[560.7px] md:h-[514px] md:w-[623px] xl:absolute xl:top-0",
                s.cardLeft ? "xl:left-0" : "xl:right-0",
              )}
            >
              <div className="absolute left-0 top-0 origin-top-left scale-50 sm:scale-90 md:scale-100">
                <StepCard grid={s.grid} label={s.artLabel}>
                  {s.art}
                </StepCard>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
