// "Backed by World-Class Programs" — Figma IDEEZA Website V-2, 18764:46163
// (1440 x 635, clips its content). The eyebrow chip, then the programme row:
// three logos with their captions in a ruled grid, and under it a hatched
// strip with ring art. The curve line and the purple glow are decoration,
// drawn from the Figma exports on a 1440 canvas centred on the page.
//
// The ruled grid (Group 1000005230 — nine 1px rules and ten 3px dots, every
// fill a DS variable) is drawn with tokens rather than its 1440-wide export,
// so it keeps its columns when the page is narrower than the design.

import { LandingEyebrow } from "./section-header";
import { cn } from "@/lib/utils";

type Program = {
  /** Figma node of the logo + caption group. */
  node: string;
  caption: string;
  logo: { src: string; alt: string; width: number; height: number };
  /** The Logo.svg frame's width, and where the vector sits inside it. */
  frame: { width: number; inset: string };
  /** Figma sets each group 1–2px right of its cell's centre (168 / 613 / 1062). */
  nudge: string;
};

const PROGRAMS: Program[] = [
  {
    node: "18764:46206",
    caption: "Member of Google AI Startup Program",
    logo: { src: "/landing/backed-by/google.svg", alt: "Google", width: 89.2113, height: 27.9987 },
    // Figma 18764:46207 — 132 wide, the Group inset 15.91% from the left.
    frame: { width: 132, inset: "left-[15.91%]" },
    nudge: "md:pl-[2px]",
  },
  {
    node: "18764:46216",
    caption: "Member of Microsoft for Startups",
    logo: { src: "/landing/backed-by/microsoft.svg", alt: "Microsoft", width: 124, height: 28 },
    // Figma 18764:46217 — the vector fills the frame.
    frame: { width: 124, inset: "left-0" },
    nudge: "md:pl-px",
  },
  {
    node: "18764:46224",
    caption: "Member of NVIDIA Inception",
    logo: { src: "/landing/backed-by/nvidia.svg", alt: "NVIDIA", width: 149.612, height: 28 },
    // Figma 18764:46225 — 150 wide, the Group inset -0.15% from the left.
    frame: { width: 150, inset: "left-[-0.15%]" },
    nudge: "",
  },
];

// Figma Rectangle 42443…42454 — the 1px rules are color/bg/surface.
const RULE = "bg-[var(--color-bg-surface)]";
// Figma Ellipse 1694…1708 — 3px dots centred on the rule crossings.
const DOT = "absolute z-[1] hidden size-[3px] rounded-full md:block";
// The x=76…1364 column the vertical rules stand in (1288 wide at 1440).
const COLUMN = "relative mx-auto w-[calc(100%-var(--spacing-16))] max-w-[1288px]";

export function BackedBy() {
  return (
    <section
      aria-label="Backed by World-Class Programs"
      className="relative overflow-hidden bg-[var(--color-bg-page)]"
    >
      {/* Decoration, on the 1440 design canvas centred on the page. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2">
        {/* Figma 18764:46166 "Rectangle 2335" — mirrored glow, 300 layer blur
            (the export carries the blur, so it is 300px bigger on each side). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/backed-by/glow.svg"
          alt=""
          width={2040}
          height={1021}
          className="absolute left-[-300px] top-[42px] h-[1021px] w-[2040px] max-w-none -scale-x-100"
        />
        {/* Figma 18764:46164 "Group 1000005238" — the curved line (Vector 499). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/backed-by/curve.svg"
          alt=""
          width={1440.6}
          height={125.6}
          className="absolute left-0 top-[75.7px] h-[125.6px] w-[1440px] max-w-none"
        />
      </div>

      <div className="relative flex flex-col items-center pb-[101px] pt-[140px] md:pt-[200px]">
        {/* Figma 18764:46231 — the eyebrow chip. */}
        <LandingEyebrow>Backed by World-Class Programs</LandingEyebrow>

        {/* Figma 18764:46167 "Frame 2147224669" — the programme row, 224 tall. */}
        <div className="relative mt-[70px] w-full pt-px">
          {/* Figma 18764:46188 Rectangle 42443 — top rule, full width. */}
          <div aria-hidden className={cn("relative h-px", RULE)} />

          {/* Row 1: the three logo cells. */}
          <div className={COLUMN}>
            {/* Figma 18764:46191 Rectangle 42446 (x=76) and 18764:46193 Rectangle 42453 (x=1364). */}
            <div aria-hidden className={cn("absolute inset-y-0 left-0 w-px", RULE)} />
            <div aria-hidden className={cn("absolute inset-y-0 left-full w-px", RULE)} />
            {/* Figma 18764:46200 Ellipse 1706 / 18764:46204 Ellipse 1707 — the x=76 crossings. */}
            <span aria-hidden className={cn(DOT, "-left-px -top-[2px] bg-[var(--color-border-default)]")} />
            <span aria-hidden className={cn(DOT, "-left-px top-[134px] bg-[var(--color-border-default)]")} />
            {/* Figma 18764:46197 Ellipse 1694 / 18764:46201 Ellipse 1695 — the x=1364 crossings. */}
            <span aria-hidden className={cn(DOT, "-right-[2px] -top-[2px] bg-[var(--color-border-default)]")} />
            <span aria-hidden className={cn(DOT, "-right-[2px] top-[134px] bg-[var(--color-border-default)]")} />

            <ul className="grid grid-cols-1 md:grid-cols-[425fr_437fr_426fr]">
              {PROGRAMS.map((p, i) => (
                <li
                  key={p.node}
                  className={cn(
                    "relative flex h-[135px] items-start justify-center pt-[34px]",
                    p.nudge,
                    // Figma 18764:46192 Rectangle 42448 (x=501) / 18764:46194 Rectangle 42450 (x=938).
                    i > 0 &&
                      "border-0 border-t border-solid border-[var(--color-bg-surface)] md:border-l md:border-t-0",
                  )}
                >
                  {/* Figma 18764:46198 Ellipse 1700 (icon/disabled) + 18764:46202 Ellipse 1701 at x=501;
                      18764:46199 Ellipse 1703 + 18764:46203 Ellipse 1704 at x=938. */}
                  {i > 0 ? (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          DOT,
                          "-left-[2px] -top-[2px]",
                          i === 1 ? "bg-[var(--color-icon-disabled)]" : "bg-[var(--color-border-default)]",
                        )}
                      />
                      <span aria-hidden className={cn(DOT, "-left-[2px] top-[134px] bg-[var(--color-border-default)]")} />
                    </>
                  ) : null}
                  {/* Figma 18764:46206 / 46216 / 46224 — the logo, then the Body/SM
                      caption in text/tertiary, 18 apart. */}
                  <div className="flex flex-col items-center gap-[18px] px-8 text-center">
                    <span className="relative block h-[28px] shrink-0" style={{ width: p.frame.width }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.logo.src}
                        alt={p.logo.alt}
                        width={p.logo.width}
                        height={p.logo.height}
                        className={cn("absolute top-0 block max-w-none", p.frame.inset)}
                        style={{ width: p.logo.width, height: p.logo.height }}
                      />
                    </span>
                    <p className="font-display text-md font-regular leading-md tracking-normal text-[color:var(--color-text-tertiary)]">
                      {p.caption}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Figma 18764:46189 Rectangle 42444 — middle rule, full width. */}
          <div aria-hidden className={cn("relative h-px", RULE)} />

          {/* Row 2, 85 tall. */}
          <div aria-hidden className={cn(COLUMN, "h-[85px]")}>
            {/* Figma 18764:46168 "Frame 2147224668" — 1288 x 86, clips its art,
                runs under the bottom rule. */}
            <div className="absolute inset-x-0 top-0 h-[86px] overflow-hidden">
              {/* Figma 18764:46169 "Group 1000005188" — the hatching (its 80% opacity is in the export). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/backed-by/hatch.svg"
                alt=""
                width={3145.73}
                height={849.235}
                className="absolute left-[-681.86px] top-[-16px] h-[849.235px] w-[3145.728px] max-w-none"
              />
              {/* Figma 18764:46171 "Group 1000005258" — ring art at 391…1076 of the
                  1288 strip, kept on the strip's centre line. */}
              <div className="absolute inset-y-0 left-1/2 hidden w-0 md:block">
                {/* Figma 18764:46176 "Group 1000005234". */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/backed-by/target.svg"
                  alt=""
                  width={174.5}
                  height={88}
                  className="absolute left-[-253px] top-[-1.5px] h-[88px] w-[174.5px] max-w-none"
                />
                {/* Figma 18764:46172 "Group 1000005232". */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/backed-by/rings.svg"
                  alt=""
                  width={93}
                  height={85}
                  className="absolute left-[-44px] top-0 h-[85px] w-[93px] max-w-none"
                />
                {/* Figma 18764:46181 "Group 1000005235" — the same art, mirrored. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/backed-by/target.svg"
                  alt=""
                  width={174.5}
                  height={88}
                  className="absolute left-[83.5px] top-[-1.5px] h-[88px] w-[174.5px] max-w-none -scale-x-100"
                />
              </div>
            </div>
            {/* Figma 18764:46195 Rectangle 42447 (x=76) and 18764:46196 Rectangle 42454 (x=1364). */}
            <div className={cn("absolute inset-y-0 left-0 w-px", RULE)} />
            <div className={cn("absolute inset-y-0 left-full w-px", RULE)} />
            {/* Figma 18764:46205 Ellipse 1708 — the bottom-left crossing. */}
            <span className={cn(DOT, "-left-px top-[84px] bg-[var(--color-border-default)]")} />
          </div>

          {/* Figma 18764:46190 Rectangle 42445 — bottom rule, full width. */}
          <div aria-hidden className={cn("relative h-px", RULE)} />
        </div>
      </div>
    </section>
  );
}
