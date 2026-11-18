// "The Problem & Solution" — Figma IDEEZA Website V-2, 18532:52000
// (1440 x 1024). A centred section header on a star field, nothing else.

import { LandingSectionHeader } from "@/components/landing/section-header";

const ASSETS = "/landing/problem-solution";

export function ProblemSolution() {
  return (
    <section
      aria-labelledby="problem-solution-title"
      className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-[var(--color-bg-page)] py-40 lg:min-h-[1024px] lg:py-0"
    >
      {/* Figma 18532:52001 — "Rectangle 2336", the faint blurred haze turned
          180° over the top of the section (export of its visible 1440 x 649,
          drawn on the page colour). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSETS}/glow.png`}
        width={1440}
        height={649}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-1/2 top-0 h-[649px] w-[1440px] max-w-none -translate-x-1/2 select-none"
      />

      {/* Figma 18532:52002 — the header, centred: 380 above and below at 1024. */}
      <div className="relative mx-auto w-full max-w-[1260px] px-8 xl:px-0">
        {/* Figma 18532:52003 */}
        <LandingSectionHeader
          id="problem-solution-title"
          eyebrow="The Problem & Solution"
          title={
            <>
              The Complete Hardware Stack{" "}
              <br className="hidden md:inline" />
              In One Platform.
            </>
          }
          lead={
            // Figma 18532:52009 — the lead box is 592 wide, centred.
            <span className="mx-auto block max-w-[592px]">
              Hardware creation-PCB, firmware, 3D, manufacturing, and marketplace in one unified system.
            </span>
          }
        />
      </div>

      {/* Figma 18532:52010 — "Star texture " (418 vectors; Star Texture 1 and
          the 180°-turned Star Texture 2), exported at 2x on the page colour.
          Figma stacks it over the header, so it lightens rather than covers. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSETS}/star-texture.png`}
        width={1440}
        height={1022}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-1/2 top-[2px] h-[1022px] w-[1440px] max-w-none -translate-x-1/2 select-none mix-blend-lighten"
      />
    </section>
  );
}
