"use client";

// "For Everyone" — Figma IDEEZA Website V-2, 18532:51822 (1440 x 1402). The
// section heading, then two cards side by side: For Creators and For
// Engineers, each a tag, a title, a lead, a button and a five-line checklist.
//
// The frame does not clip, so its top glow (Rectangle 2338) reaches 391px up
// over Backed By, as in the file; what falls below the frame is covered by
// What You Can Do there, so it is cut at the section's bottom edge here.
// The background picture (18532:51823) sits at y=1350 only because it is
// rotated 90°: it covers y 0…1350 of the frame, at 16% under a 54 blur.
//
// A client module: buttonVariants lives in one (the A01 Button file is "use
// client"), and the buttons go through `useEntry`, so a signed-out visitor
// reaches Sign up (or Sign in) with the page as `next`, not back here.

import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ideeza/button";
import { cn } from "@/lib/utils";
import { useEntry } from "@/components/auth/use-entry";
import { LandingSectionHeader } from "./section-header";

type Audience = {
  /** Figma node of the card. */
  node: string;
  tag: string;
  title: ReactNode;
  lead: ReactNode;
  cta: { label: string; href: string };
  items: string[];
  /** For Engineers: Figma draws its button and checks in Luminosity blend. */
  engineer?: boolean;
};

const AUDIENCES: Audience[] = [
  {
    node: "18532:51835",
    tag: "For Creators",
    // Figma 18532:51843 breaks the line after "We".
    title: (
      <>
        You have the idea. We <br className="hidden sm:inline" />
        Handle the tech.
      </>
    ),
    // Figma 18532:51844 breaks the line after "handles the" — kept wherever
    // the card is its 615 width (not in the narrower lg two-up). The file
    // reads "Al" (a lower-case L) here and in the second check; it is "AI".
    lead: (
      <>
        Just describe what you want. Our AI handles the <br className="hidden sm:inline lg:hidden xl:inline" />
        technical complexity. No CAD skills needed. No coding required.
      </>
    ),
    // The build prompt on app Home.
    cta: { label: "Start Creating", href: "/" },
    items: [
      "Type your product idea in plain language",
      "AI generates everything automatically",
      "Order prototypes with one click",
      "Sell your product globally",
      "Earn royalties from your designs",
    ],
  },
  {
    node: "18532:51896",
    tag: "For Engineers",
    title: "Engineers Build Hardware Faster With Full Control",
    lead: "All the professional tools you know, supercharged with AI. Edit every trace, every line of code, every dimension.",
    // My Projects — where a project's products open in the PCB, code and 3D editors.
    cta: { label: "Explore Engineer Mode", href: "/projects" },
    items: [
      "Full PCB schematic editor",
      "Code IDE with AI suggestions",
      "Parametric 3D modeling",
      "DRC validation & BOM management",
      "Git-style design version control",
    ],
    engineer: true,
  },
];

// Figma 18532:51840 / 18532:51901 — the tag's 1px inside stroke is two
// gradient paints (raw colours, no variables): Stroke 2 (#dfd4fe band, 28%)
// over Stroke 1 (violet→clear→plum, 80%). Under them, the bright ends the
// tag's GLASS effect paints on its left and right caps (approximated; CSS has
// no glass effect). Drawn as a masked ring so the tag stays see-through.
const TAG_RING = cn(
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px",
  "before:[background-image:linear-gradient(15deg,rgba(223,212,254,0)_22%,rgba(223,212,254,0.28)_47%,rgba(223,212,254,0)_76%),linear-gradient(90deg,rgba(73,73,154,0.24)_0%,rgba(69,62,112,0)_53.75%,rgba(66,53,76,0.64)_100%),linear-gradient(90deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_15%,rgba(255,255,255,0)_85%,rgba(255,255,255,0.15)_100%)]",
  "before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]",
);

function AudienceTag({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        "relative flex h-[34px] items-center justify-center whitespace-nowrap rounded-[40px] px-7 py-4 font-display text-md font-medium leading-md tracking-normal text-[color:var(--color-text-primary)]",
        TAG_RING,
      )}
    >
      {children}
    </span>
  );
}

function AudienceCard({ a }: { a: Audience }) {
  const { into } = useEntry();
  return (
    // Figma {a.node} — 615 x 782, radius 28, padding 48, clips; no fill. Its
    // GLASS effect is drawn as the lit 1px edge on top (see the last child).
    <article className="relative flex w-full max-w-[615px] overflow-hidden rounded-[28px] p-12 sm:p-24 lg:flex-1">
      {/* Figma 18532:51836 / 18532:51897 — the wave picture, rotated 90° and
          mirrored, 69% under a 94 layer blur. */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-0 flex h-[790px] w-[615px] items-center justify-center">
        <div className="flex-none -rotate-90 -scale-y-100">
          <div className="relative h-[615px] w-[790px] opacity-[0.69] blur-[47px]">
            <div className="absolute inset-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/for-everyone/wave.png"
                alt=""
                width={1199}
                height={685}
                className="absolute left-[-8.02%] top-[-14.36%] h-[128.88%] w-[175.66%] max-w-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Figma 18532:51837 / 18532:51898 — copy over checklist, 48 apart. */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-24">
        {/* Figma 18532:51838 / 18532:51899 — copy then button, 32 apart. */}
        <div className="flex w-full flex-col items-start gap-16">
          {/* Figma 18532:51839 / 18532:51900 — tag over the title block, 36 apart. */}
          <div className="flex w-full flex-col items-start gap-[36px]">
            <AudienceTag>{a.tag}</AudienceTag>
            {/* Figma 18532:51842 / 18532:51903 — 28 apart. */}
            <div className="flex w-full flex-col gap-[28px]">
              {/* Figma 18532:51843 / 18532:51904 — Heading/H1. */}
              <h3 className="font-display text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)]">
                {a.title}
              </h3>
              {/* Figma 18532:51844 / 18532:51905 — Body/LG, 409 wide. */}
              <p className="w-full max-w-[409px] font-display text-xl font-regular leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
                {a.lead}
              </p>
            </div>
          </div>
          {/* Figma 18532:51845 / 18532:51906 — A01 Button, Primary XL, pill. */}
          <Link
            href={into(a.cta.href)}
            className={cn(
              buttonVariants({ hierarchy: "primary", size: "xl" }),
              "rounded-full",
              a.engineer && "mix-blend-luminosity",
            )}
          >
            {a.cta.label}
          </Link>
        </div>

        {/* Figma 18532:51846 / 18532:51907 — the checklist, rows and rules 12 apart. */}
        <ul className="flex w-full flex-col gap-6">
          {a.items.map((item, i) => (
            <li key={item} className="flex w-full flex-col gap-6">
              {i > 0 ? (
                // Figma Rectangle 42456/42467/42466/42468 — 1px rule, a raw
                // gradient at 12%.
                <div
                  aria-hidden
                  className="h-px w-full bg-[linear-gradient(90deg,rgba(208,216,245,0.5)_0%,#a3aac3_23.324%,#11131e_100%)] opacity-[0.12]"
                />
              ) : null}
              <div className="flex w-full items-center gap-8">
                {/* Figma "Frame 2147224693" — the 40px check medallion; its export
                    carries the 7-blur glow, so it overhangs 13 / 19. */}
                <span aria-hidden className={cn("relative size-[40px] shrink-0", a.engineer && "mix-blend-luminosity")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.engineer ? "/landing/for-everyone/check-engineer.svg" : "/landing/for-everyone/check.svg"}
                    alt=""
                    width={66}
                    height={59}
                    className="absolute left-[-13px] top-0 block h-[59px] w-[66px] max-w-none"
                  />
                </span>
                {/* Body/LG Medium, text/secondary. */}
                <span className="min-w-0 flex-1 font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
                  {item}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* The card's GLASS effect (light at -45°): a 1px lit edge, brighter on
          the top and left. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-solid border-b-[color:var(--color-glass-border-default)] border-l-[color:var(--color-glass-highlight)] border-r-[color:var(--color-glass-border-default)] border-t-[color:var(--color-glass-highlight)]"
      />
    </article>
  );
}

export function ForEveryone() {
  return (
    <section aria-labelledby="for-everyone-title" className="relative bg-[var(--color-bg-page)]">
      {/* Decoration: reaches 391px above the section, cut at its bottom edge. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[391px] bottom-0 overflow-hidden">
        {/* The 1440 design canvas, its y=0 at the section's top. */}
        <div className="absolute left-1/2 top-[391px] h-[1402px] w-[1440px] -translate-x-1/2">
          {/* Figma 18532:51823 "2026-04-11_17-45-17 1" — rotated 90°, 16%, 54 layer blur. */}
          <div className="absolute left-0 top-0 flex h-[1350px] w-[1440px] items-center justify-center">
            <div className="flex-none -rotate-90">
              <div className="relative h-[1440px] w-[1350px] opacity-[0.16] blur-[27px]">
                <div className="absolute inset-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing/for-everyone/wave.png"
                    alt=""
                    width={1199}
                    height={685}
                    className="absolute left-[-86.03%] top-0 h-[99.97%] w-[186.03%] max-w-none"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Figma 18532:51824 "Rectangle 2338" — glow at y -101…345, turned 180°;
              the export carries its 290 blur (and 20% opacity). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/for-everyone/glow-top.svg"
            alt=""
            width={2020}
            height={1026}
            className="absolute left-[-290px] top-[-391px] h-[1026px] w-[2020px] max-w-none rotate-180"
          />
          {/* Figma 18532:51825 "Rectangle 2337" — glow at y 996…1442, mirrored;
              the export carries its 140 blur. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/for-everyone/glow-bottom.svg"
            alt=""
            width={1720}
            height={726}
            className="absolute left-[-140px] top-[856px] h-[726px] w-[1720px] max-w-none -scale-x-100"
          />
        </div>
      </div>

      {/* Figma 18532:51826 "Frame 2147225490" — 1260 wide at y=150, heading
          then cards, 92 apart. */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-32 px-8 pb-48 pt-48 md:gap-[92px] md:pb-[170px] md:pt-[150px] xl:px-0">
        {/* Figma 18532:51827. */}
        <LandingSectionHeader
          id="for-everyone-title"
          eyebrow="For Everyone"
          title="Beginner-Friendly. Engineer-capable."
          lead={
            <>
              {"Whether you're dreaming up your first product or designing your hundredth,"}{" "}
              <br className="hidden md:inline" />
              IDEEZA adapts to you.
            </>
          }
        />

        {/* Figma 18532:51834 "Frame 2147225488" — the two cards, 30 apart. */}
        <div className="flex w-full flex-col items-center gap-[30px] lg:flex-row lg:items-stretch">
          {AUDIENCES.map((a) => (
            <AudienceCard key={a.node} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}
