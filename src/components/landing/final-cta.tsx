"use client";

// The landing page's closing call to action — Figma IDEEZA Website V-2, "The
// creator economy meets hardware" 18532:53998 (1440 × 791). The decoration
// sits on a 1440 canvas centred on the page, the content on the 1260 column
// (Figma 18532:54004, x 90 · y 181). The decoration is drawn for the 791 px
// frame, so it shows from md up, where the section keeps that height; the
// four named cursors around the heading (Figma 18532:54016) show from xl up,
// where there is room for them beside the heading.
//
// A client module only because buttonVariants lives in the client-only
// button.tsx and cannot be called from a server component.

import Link from "next/link";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { buttonVariants } from "@/components/ideeza/button";
import { useEntry } from "@/components/auth/use-entry";
import { cn } from "@/lib/utils";
import { LANDING_SECONDARY } from "@/components/landing/buttons";

const ASSET = "/landing/final-cta";

// Figma 18532:54016 "Cursor" — each a 24 px pointer at (7, 5) and a name tag
// at (25, 23), positioned on the 1260 content box. The tag's inner glow is
// raw in Figma (one rgba set per colour).
const CURSORS: { node: string; name: string; icon: string; box: string; tag: string }[] = [
  {
    node: "18532:54017",
    name: "Carlos",
    icon: "cursor-yellow.svg",
    box: "left-[1001px] top-[211px] w-[82px]",
    tag: "border-[var(--color-yellow-700)] bg-[var(--color-yellow-700)] shadow-[inset_0px_4px_12px_0px_rgba(197,178,124,0.3),inset_-1px_0px_5px_0px_rgba(98,84,45,0.23),inset_0px_-3px_12px_0px_rgba(235,210,141,0.32)]",
  },
  {
    node: "18532:54022",
    name: "David",
    icon: "cursor-green.svg",
    box: "left-[166px] top-[119px] w-[82px]",
    tag: "border-[var(--color-green-700)] bg-[var(--color-green-700)] shadow-[inset_0px_4px_12px_0px_rgba(124,197,156,0.32),inset_-1px_0px_5px_0px_rgba(45,98,68,0.23),inset_0px_-3px_12px_0px_rgba(141,235,182,0.32)]",
  },
  {
    node: "18532:54027",
    name: "James",
    icon: "cursor-blue.svg",
    box: "left-[893px] top-[42px] w-[82px]",
    tag: "border-[var(--color-blue-700)] bg-[var(--color-blue-700)] shadow-[inset_0px_4px_12px_0px_rgba(124,141,197,0.32),inset_-1px_0px_5px_0px_rgba(45,57,98,0.23),inset_0px_-3px_12px_0px_rgba(141,163,235,0.32)]",
  },
  {
    node: "18532:54032",
    name: "Anderson",
    icon: "cursor-red.svg",
    box: "left-[325px] top-0 w-[100px]",
    tag: "border-[var(--color-red-600)] bg-[var(--color-red-600)] shadow-[inset_0px_4px_12px_0px_rgba(197,124,182,0.32),inset_-1px_0px_5px_0px_rgba(98,45,87,0.23),inset_0px_-3px_12px_0px_rgba(235,141,216,0.32)]",
  },
];


export function FinalCta() {
  const { into } = useEntry();
  return (
    <section
      aria-labelledby="final-cta-title"
      className="relative overflow-hidden bg-[var(--color-bg-page)] md:min-h-[791px] md:pt-[181px]"
    >
      {/* Decoration — the 1440 Figma canvas, centred. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[calc(50%_-_720px)] hidden w-[1440px] md:block">
        {/* Figma 18532:53999 — the wave photo, turned −90°, 27 px blur, 20%. */}
        <div className="absolute left-0 top-0 flex h-[711px] w-[1440px] items-center justify-center">
          <div className="relative h-[1440px] w-[711px] flex-none -rotate-90 overflow-hidden opacity-20 blur-[27px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/bg-wave.png`} alt="" width={1199} height={685} className="absolute left-[-253.23%] top-0 h-[99.97%] w-[353.23%] max-w-none" />
          </div>
        </div>

        {/* Figma 18532:54000 "BG 4" — the grid lines (Union 18532:54001), flipped. */}
        <div className="absolute left-0 top-[130px] h-[558px] w-[1440px] -scale-y-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSET}/grid.svg`} alt="" width={1440} height={558} className="absolute inset-0 block size-full max-w-none" />
        </div>

        {/* Figma 18532:54002 Rectangle 2337 — the dark fade from the top. */}
        <div className="absolute left-0 top-[-39px] h-[341px] w-[1440px] rotate-180">
          <div className="absolute inset-[-61.58%_-14.58%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/fade.svg`} alt="" className="block size-full max-w-none" />
          </div>
        </div>

        {/* Figma 18532:54003 Rectangle 2338 — the dark fade into the bottom. */}
        <div className="absolute bottom-[-40px] left-0 h-[341px] w-[1440px] -scale-y-100 rotate-180">
          <div className="absolute inset-[-61.58%_-14.58%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/fade.svg`} alt="" className="block size-full max-w-none" />
          </div>
        </div>
      </div>

      {/* Figma 18532:54004 — the 1260 × 423 content box. */}
      <div className="relative mx-auto w-full max-w-[1260px] px-8 py-40 md:min-h-[423px] md:py-0 xl:px-0">
        {/* Figma 18532:54005 — heading block and buttons (gap 56), 59 px down. */}
        <div className="flex flex-col items-center gap-[56px] md:pt-[59px]">
          {/* Figma 18532:54006 — eyebrow, Display/MD title, Heading/H4 lead. */}
          <LandingSectionHeader
            id="final-cta-title"
            eyebrow="The creator economy meets hardware"
            title={
              <>
                The Next Hardware Product <br className="hidden lg:inline" />
                Could Be Yours.
              </>
            }
            lead={
              <>
                Describe your idea today. No engineering experience required. <br className="hidden lg:inline" />
                Start with a prompt. Launch a product. Own the future.
              </>
            }
          />
          {/* Figma 18532:54013 — two A01 XL pills (gap 16). */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Figma 18532:54014 — A01 AI */}
            <Link href={into()} className={cn(buttonVariants({ hierarchy: "ai", size: "xl" }), "rounded-full")}>
              Start With AI
            </Link>
            {/* Figma 18532:54015 — A01 secondary; Figma draws it with a #dfd4fe line, the page wears one secondary look (owner 2026-11-04). */}
            <Link href="/innovations" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), LANDING_SECONDARY)}>
              Explore Projects
            </Link>
          </div>
        </div>

        {/* Figma 18532:54016 "Cursor" — the named pointers around the heading. */}
        <div aria-hidden className="pointer-events-none hidden xl:block">
          {CURSORS.map((c) => (
            <div key={c.node} data-figma={c.node} className={cn("absolute h-[51px]", c.box)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ASSET}/${c.icon}`} alt="" width={24} height={24} className="absolute left-[7px] top-[5px] size-[24px]" />
              <span
                className={cn(
                  "absolute left-[25px] top-[23px] flex h-[28px] items-center justify-center whitespace-nowrap rounded-[6px] border-solid border-2 px-[8px] text-center font-display text-sm font-medium leading-[1.6] text-[color:var(--color-white)]",
                  c.tag,
                )}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
