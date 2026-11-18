"use client";

// Client module only because buttonVariants lives in a "use client" module
// (calling it from a server component fails); the section has no state.
//
// Ownership & Monetization — Figma IDEEZA Website V-2, 18714:24830
// (1440 × 1185). The centred section heading, the three ownership features on
// the left with their tags, and the "Enter The IDZ NFT" card in its rings on
// the right, with the two calls to action under it.
//
// The glows and the photo texture are the file's own exports (Figma's SVGs
// for the blurred shapes, the original photo for the texture) placed at their
// Figma geometry; Figma's PNG exports of these layers come back flattened onto
// the section fill, so they could not be stacked. The NFT card is artwork
// (Michroma lettering over blurred colour shapes and a holographic frame), so
// it ships as its Figma render.
//
// At 1280 px and wider the layout is the Figma frame: a 1440 stage centred in
// the viewport, every block at its Figma x/y. Narrower, the blocks stack.

import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";
import { LANDING_SECONDARY } from "@/components/landing/buttons";

const ASSETS = "/landing/ownership";

type Feature = { node: string; title: string; tag: string; tone: BadgeTone; tagInk?: string; body: string };

// The page pins data-theme="dark" on its wrapper, not on <html>. The
// component-scoped aliases (color/badge/*, color/button/*) are declared on
// :root as var(--role), so they resolve to the LIGHT role there and are
// inherited that way. Where this section uses them, it names the role token
// itself (redefined under [data-theme="dark"]) so the dark values show.

// Figma 18772:50622 — three Heading/H3 + A17 Badge (Code/SM) rows over Body/LG.
const FEATURES: Feature[] = [
  {
    node: "18772:50623",
    title: "Secure Digital Ownership",
    tag: "Protected IP", // A17 Badge 18772:50628 — color/badge/blue-* = bg/blue-subtle + text/blue
    tone: "blue",
    tagInk: "bg-[var(--color-bg-blue-subtle)] text-[color:var(--color-text-blue)]",
    body: "Your product designs are securely registered with verifiable digital ownership, ensuring that no one else can claim or copy what you created.",
  },
  {
    node: "18772:50630",
    title: "Sell on the Marketplace",
    tag: "Built-in Store", // A17 Badge 18772:50635 — color/badge/brand-* = bg/brand-subtle + text/brand
    tone: "brand",
    tagInk: "bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-text-brand)]",
    body: "List your hardware designs for sale. Other creators can buy and build them, while you earn revenue every time your design is used or purchased.",
  },
  {
    node: "18772:50637",
    title: "Recurring Royalties",
    tag: "Passive Income", // A17 Badge 18772:50642 — color/bg/subtle + color/text/secondary
    tone: "neutral",
    body: "Set royalty rates for your designs and earn passive income as your hardware gets licensed, built, and manufactured by creators worldwide.",
  },
];

// Figma 18714:24878–24885 — the 7 × 12 tick marks either side of the card.
const TICKS: { node: string; left: number; top: number }[] = [
  { node: "18714:24878", left: 1371, top: 584 },
  { node: "18714:24879", left: 745, top: 584 },
  { node: "18714:24880", left: 1371, top: 716 },
  { node: "18714:24881", left: 745, top: 716 },
  { node: "18714:24882", left: 1371, top: 627 },
  { node: "18714:24883", left: 745, top: 627 },
  { node: "18714:24884", left: 1371, top: 674 },
  { node: "18714:24885", left: 745, top: 674 },
];

// An outline in color/text/primary at a few percent, as the ring art's ticks
// and rules are drawn (Figma 1.27 px strokes).
const RULE = "absolute border-[1.27px] border-solid border-[var(--color-text-primary)]";

export function Ownership() {
  return (
    // Figma 18714:24830 — fill color/bg/page.
    <section
      aria-labelledby="ownership-title"
      className="relative isolate overflow-hidden bg-[var(--color-bg-page)]"
    >
      {/* Decoration: a 1440 stage centred on the viewport, layers at their Figma x/y, in Figma order. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 ml-[-720px] h-full w-[1440px]">
        {/* Figma 18714:24831 "Color Ball" — two blurred ellipses added onto the page. */}
        <div className="hidden xl:block">
          {/* Figma 18714:24832 Ellipse 1665 */}
          <div className="absolute left-[761.39px] top-[407.14px] flex h-[420.857px] w-[419.797px] items-center justify-center mix-blend-plus-lighter">
            <div className="flex-none rotate-[40.74deg]">
              <div className="relative h-[303.082px] w-[293px] opacity-80">
                <div className="absolute inset-[-73.91%_-76.45%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSETS}/color-ball-1.svg`} alt="" width={741} height={751} className="block size-full max-w-none" />
                </div>
              </div>
            </div>
          </div>
          {/* Figma 18714:24833 Ellipse 1666 */}
          <div className="absolute left-[1061.22px] top-[581.14px] flex h-[403.56px] w-[399.556px] items-center justify-center mix-blend-plus-lighter">
            <div className="flex-none -scale-y-100 rotate-[-152.49deg]">
              <div className="relative h-[302.421px] w-[293px] opacity-80">
                <div className="absolute inset-[-74.07%_-76.45%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSETS}/color-ball-2.svg`} alt="" width={741} height={751} className="block size-full max-w-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Figma 18714:24834 "2026-04-11_17-45-17 2" — the photo texture, a quarter turn, layer blur 54, 16 %.
            Its metadata y=1465 is the rotation origin: the layer covers the whole frame (0–1465, clipped at 1185). */}
        <div className="absolute left-0 top-0 flex h-[1465px] w-[1440px] items-center justify-center">
          <div className="flex-none -rotate-90">
            <div className="relative h-[1440px] w-[1465px] opacity-[0.16] blur-[27px]">
              <div className="absolute inset-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSETS}/bg-texture.webp`}
                  alt=""
                  width={1199}
                  height={685}
                  className="absolute left-[-95.37%] top-[-12.08%] h-[112.05%] w-[195.37%] max-w-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Figma 18714:24835 "Rectangle 2336" — turned 180°, so it sits at x 5 / y −106
            (its metadata x=1445 is the rotation origin, not off-canvas). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSETS}/glow-top.svg`}
          alt=""
          width={2020}
          height={1026}
          className="absolute left-[-285px] top-[-396px] h-[1026px] w-[2020px] max-w-none rotate-180"
        />

        {/* Figma 18714:24836 "Rectangle 2337" — the dark fade into the next section (x 0, y 1016, mirrored). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSETS}/glow-bottom.svg`}
          alt=""
          width={1960}
          height={1030}
          className="absolute bottom-[-601px] left-[-260px] h-[1030px] w-[1960px] max-w-none -scale-x-100"
        />

        {/* Figma 18714:24867 "NFT Card" rings — Group 1000005222 + Group 1000005220. */}
        <div className="hidden xl:block">
          {/* Figma 18714:24868 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-987.svg`} alt="" width={987} height={987} className="absolute left-[568px] top-[162px] size-[987px] max-w-none" />
          {/* Figma 18714:24871 Ellipse 1667 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-809.svg`} alt="" width={809} height={809} className="absolute left-[657px] top-[251px] size-[809px] max-w-none opacity-20" />
          {/* Figma 18714:24872 Subtract */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-subtract.svg`} alt="" width={685} height={540} className="absolute left-[719px] top-[386px] h-[539.737px] w-[685px] max-w-none opacity-20" />
          {/* Figma 18714:24876 Ellipse 1670 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-490.svg`} alt="" width={490} height={490} className="absolute left-[816px] top-[411px] size-[490px] max-w-none opacity-20 mix-blend-plus-lighter" />
          {/* Figma 18714:24877 Ellipse 1669 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-382.svg`} alt="" width={382} height={382} className="absolute left-[870px] top-[460px] size-[382px] max-w-none opacity-20" />
          {TICKS.map((t) => (
            // Figma 18714:24878–24885
            <span key={t.node} className={cn(RULE, "h-[12px] w-[7px] opacity-[0.08]")} style={{ left: t.left, top: t.top }} />
          ))}
          {/* Figma 18714:24886 Ellipse 1668 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSETS}/ring-207.svg`} alt="" width={207} height={207} className="absolute left-[958px] top-[514px] size-[207px] max-w-none opacity-20" />
          {/* Figma 18714:24887 Rectangle 42438 */}
          <span className={cn(RULE, "left-[1066px] top-[354px] h-[71.643px] w-[6.444px] opacity-[0.04]")} />
          {/* Figma 18714:24888 Rectangle 42416 */}
          <span className={cn(RULE, "left-[657px] top-[652px] h-[7px] w-[292px] opacity-[0.06]")} />
          {/* Figma 18714:24889 Rectangle 42417 */}
          <span className={cn(RULE, "left-[1178px] top-[652px] h-[7px] w-[288px] opacity-[0.06]")} />
        </div>
      </div>

      {/* Content: stacked below 1280; at 1280+ the Figma frame, centred, each block at its Figma x/y. */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col items-center gap-16 px-8 pb-40 pt-40 xl:left-1/2 xl:ml-[-720px] xl:block xl:h-[1185px] xl:w-[1440px] xl:max-w-none xl:p-0">
        {/* Figma 18714:24859 — eyebrow, Display/MD title, Heading/H4 lead (790 wide, two lines), centred. */}
        <LandingSectionHeader
          id="ownership-title"
          eyebrow="Ownership & Monetization"
          title="Your Design. Your Product.Your Revenue."
          lead={
            <>
              <span className="mx-auto block max-w-[790px]">
                IDEEZA gives you real ownership of what you create-and the tools to turn
                <br className="hidden xl:inline" /> that ownership into income.
              </span>
            </>
          }
          className="w-full xl:absolute xl:left-[90px] xl:top-[150px] xl:w-[1260px]"
        />

        {/* Figma 18772:50622 — the feature list, 455 wide, 56 apart. */}
        <ul className="flex w-full max-w-[455px] flex-col gap-[56px] xl:absolute xl:left-[150px] xl:top-[443px] xl:w-[455px]">
          {FEATURES.map((f) => (
            <li key={f.node} className="flex flex-col gap-[24px]">
              <div className="flex flex-wrap items-center gap-[12px]">
                <h3 className="whitespace-nowrap font-display text-3xl font-semibold leading-3xl tracking-slight text-[color:var(--color-text-primary)]">
                  {f.title}
                </h3>
                <Badge tone={f.tone} className={cn("rounded-sm px-4 py-2 font-mono text-sm leading-sm", f.tagInk)}>
                  {f.tag}
                </Badge>
              </div>
              <p className="font-display text-xl font-regular leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
                {f.body}
              </p>
            </li>
          ))}
        </ul>

        {/* Figma 18714:24890 "NFT " — the card (309 × 408, radius 10). */}
        <div className="relative h-[408px] w-[309px] shrink-0 overflow-hidden rounded-[10px] xl:absolute xl:left-[906px] xl:top-[447px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSETS}/nft-card.webp`}
            alt="IDZ NFT card: Enter The IDZ NFT, NFT collection, 12 : 75, 2026"
            width={309}
            height={408}
            className="block size-full"
          />
        </div>

        {/* Figma 18714:24909 — A01 Button 2XL pair, 16 apart. */}
        <div className="flex flex-wrap items-center justify-center gap-[16px] xl:absolute xl:left-[837px] xl:top-[915px]">
          {/* Figma 18714:24910 — Primary. Publishing starts from one of your projects. */}
          <Link
            href="/projects"
            className={cn(
              buttonVariants({ hierarchy: "primary", size: "2xl" }),
              // color/button/primary-bg (+ hover, pressed) by their role tokens — see the note on FEATURES.
              "rounded-full bg-[var(--color-bg-brand)] hover:bg-[var(--color-bg-brand-hover)] active:bg-[var(--color-bg-brand-pressed)]",
            )}
          >
            Publish as Digital Product
          </Link>
          {/* Figma 18714:24911 */}
          <Link
            href="/marketplace"
            className={cn(
              buttonVariants({ hierarchy: "secondary", size: "2xl" }),
              LANDING_SECONDARY,
            )}
          >
            Explore Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
