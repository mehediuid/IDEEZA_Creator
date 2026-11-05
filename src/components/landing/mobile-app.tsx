// The landing page's "Mobile App" section — Figma IDEEZA Website V-2,
// 18532:53856 (1440 × 1159). At xl and up every layer sits where Figma puts
// it: the decoration on a 1440 canvas centred on the page, the text on the
// 1260 content column (Figma x − 90). Below xl the text stacks with the phone
// between the heading and the store badges, and the glows are left out.
//
// No IDEEZA app is in the App Store or Google Play yet, so the two store
// badges are drawn as in Figma but marked "Coming soon" instead of linking.

import { HugeiconsIcon } from "@hugeicons/react";
import { SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { LandingEyebrow } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";

const ASSET = "/landing/mobile-app";

// Figma 18532:53870 / 18532:53886 / 18532:53902 — three groups of three rows
// of "+" crosses (one 206 × 46 vector frame each), at 14% opacity.
const CROSS_ROWS: { node: string; position: string }[] = [
  { node: "18532:53871", position: "left-[357px] top-[473px]" },
  { node: "18532:53876", position: "left-[304px] top-[541px]" },
  { node: "18532:53881", position: "left-[251px] top-[609px]" },
  { node: "18532:53887", position: "left-[593px] top-[89px]" },
  { node: "18532:53892", position: "left-[540px] top-[157px]" },
  { node: "18532:53897", position: "left-[487px] top-[225px]" },
  { node: "18532:53903", position: "left-[844px] top-[541px]" },
  { node: "18532:53908", position: "left-[791px] top-[609px]" },
  { node: "18532:53913", position: "left-[738px] top-[677px]" },
];

/** One blurred glow ellipse of a "Color Ball": the rotated ellipse box, and
 *  the SVG (whose blur runs past the box) inset around it. */
function Glow({
  src,
  position,
  box,
  turn,
  inset,
  blend,
}: {
  src: string;
  position: string;
  box: string;
  turn: string;
  inset: string;
  blend: string;
}) {
  return (
    <div aria-hidden className={cn("absolute flex items-center justify-center", position, blend)}>
      <div className={cn("relative flex-none", box, turn)}>
        <div className={cn("absolute", inset)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSET}/${src}`} alt="" className="block size-full max-w-none" />
        </div>
      </div>
    </div>
  );
}

// Figma 18532:53935 / 18532:53941 — 200 × 67, a 1.5 px #dfd4fe stroke (raw in
// Figma), radius/xl, 12 / 32 side padding (less the CSS border), gap 8.
const STORE_BADGE =
  "flex h-[67px] w-[200px] shrink-0 cursor-default items-center gap-4 rounded-xl border-solid border-[1.5px] border-[#dfd4fe] bg-transparent pl-[calc(var(--spacing-6)_-_1.5px)] pr-[calc(var(--spacing-16)_-_1.5px)] text-[color:var(--color-text-primary)]";

function StoreBadge({ icon, store }: { icon: string; store: string }) {
  return (
    <span role="link" aria-disabled="true" title="Coming soon" className={STORE_BADGE}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ASSET}/${icon}`} alt="" width={40} height={40} className="size-[40px] shrink-0" />
      <span className="flex flex-col items-start justify-center whitespace-nowrap text-center tracking-normal">
        <span className="mb-[-3px] text-md font-regular leading-md">Get it on</span>
        <span className="text-xl font-semibold leading-xl">{store}</span>
        <span className="sr-only">(coming soon)</span>
      </span>
    </span>
  );
}

/** The phone mock-up — Figma "image 379" 18532:53948: a 1230.42 × 922.815
 *  image turned 20.41°, centred in its 1475 × 1294 bounding box. The file is
 *  the fill as Figma draws it (its image adjustments turn the raw upload's
 *  silver frame graphite), which Figma serves at 1024 × 768. */
function Phone({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${ASSET}/phone.png`}
      alt="The IDEEZA mobile app on a phone, open on the AI Product Generate screen"
      width={1230}
      height={923}
      loading="lazy"
      className={cn("max-w-none rotate-[20.41deg] object-cover", className)}
    />
  );
}

export function MobileApp() {
  return (
    <section
      id="mobile-app"
      aria-labelledby="mobile-app-title"
      className="relative scroll-mt-[80px] overflow-hidden bg-[var(--color-bg-page)] xl:h-[1159px]"
    >
      {/* Decoration — the 1440 Figma canvas, centred. */}
      <div className="pointer-events-none absolute inset-y-0 left-[calc(50%_-_720px)] hidden w-[1440px] xl:block">
        {/* Figma 18532:53857 "Color Ball" (plus-lighter): 18532:53858, 18532:53859 */}
        <Glow
          src="glow-1a.svg"
          blend="mix-blend-plus-lighter"
          position="left-[445.19px] top-[393.07px] h-[344.823px] w-[343.841px]"
          box="h-[234.849px] w-[252.487px]"
          turn="rotate-[-47.26deg]"
          inset="inset-[-78.06%_-72.6%]"
        />
        <Glow
          src="glow-1b.svg"
          blend="mix-blend-plus-lighter"
          position="left-[640.53px] top-[181.7px] h-[344.823px] w-[343.841px]"
          box="h-[234.849px] w-[252.487px]"
          turn="-scale-y-100 rotate-[132.74deg]"
          inset="inset-[-78.06%_-72.6%]"
        />
        {/* Figma 18532:53860 "Color Ball" (lighten): 18532:53861, 18532:53862 */}
        <Glow
          src="glow-2a.svg"
          blend="mix-blend-lighten"
          position="left-[569px] top-[357.64px] h-[325.528px] w-[322.621px]"
          box="h-[230.561px] w-[239.728px]"
          turn="rotate-[-57.96deg]"
          inset="inset-[-79.51%_-76.47%]"
        />
        <Glow
          src="glow-2b.svg"
          blend="mix-blend-lighten"
          position="left-[713.98px] top-[126px] h-[325.528px] w-[322.621px]"
          box="h-[230.561px] w-[239.728px]"
          turn="-scale-y-100 rotate-[122.04deg]"
          inset="inset-[-79.51%_-76.47%]"
        />

        {/* Figma 18532:53863 — the wave photo, turned −90°, 27 px blur, 20%. */}
        <div aria-hidden className="absolute left-0 top-[-4px] flex h-[1163px] w-[1440px] items-center justify-center">
          <div className="relative h-[1440px] w-[1163px] flex-none -rotate-90 overflow-hidden opacity-20 blur-[27px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/bg-wave.png`} alt="" width={1199} height={685} className="absolute left-[-239.34%] top-[-2.78%] h-[105.52%] w-[339.34%] max-w-none" />
          </div>
        </div>

        {/* Figma 18532:53864 Rectangle 2337 — the dark fade from the top. */}
        <div aria-hidden className="absolute left-0 top-[-89px] h-[476px] w-[1440px] rotate-180">
          <div className="absolute inset-[-44.12%_-14.58%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/fade-top.svg`} alt="" className="block size-full max-w-none" />
          </div>
        </div>

        {/* Figma 18532:53870 / 53886 / 53902 — the "+" cross rows. */}
        {CROSS_ROWS.map((row) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={row.node}
            src={`${ASSET}/grid-crosses.svg`}
            alt=""
            width={206}
            height={46}
            data-figma={row.node}
            className={cn("absolute h-[46px] w-[206px] opacity-[0.14]", row.position)}
          />
        ))}

        {/* Figma 18532:53926 Rectangle 2338 — the dark fade into the bottom. */}
        <div aria-hidden className="absolute bottom-[-100px] left-0 h-[334px] w-[1440px] -scale-y-100 rotate-180">
          <div className="absolute inset-[-62.87%_-14.58%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/fade-bottom.svg`} alt="" className="block size-full max-w-none" />
          </div>
        </div>

        {/* Figma 18532:53948 "image 379" — the phone, top of the stack. */}
        <div className="absolute left-0 top-[-211px] flex h-[1293.99px] w-[1475.003px] items-center justify-center">
          <Phone className="h-[922.815px] w-[1230.42px] flex-none" />
        </div>
      </div>

      {/* Content — the 1260 column. */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col items-center gap-16 px-8 py-40 xl:block xl:h-full xl:px-0 xl:py-0">
        {/* Figma 18532:53865 — eyebrow + title, left aligned (gap 28). */}
        <div className="flex w-full flex-col items-start gap-[28px] xl:absolute xl:left-[2px] xl:top-[150px] xl:w-[413px]">
          {/* Figma 18532:53866 */}
          <LandingEyebrow>Mobile Application</LandingEyebrow>
          {/* Figma 18532:53869 — Display/MD (48 / 56); "Mobile App" in raw #94a3b8 = gray-400. */}
          <h2
            id="mobile-app-title"
            className="font-display text-6xl font-semibold leading-6xl tracking-snug text-[color:var(--color-text-primary)] xl:whitespace-nowrap"
          >
            Access IDEEZA <br className="hidden xl:inline" />
            Anytime with Our <br className="hidden xl:inline" />
            <span className="whitespace-nowrap">
              <span aria-hidden="true">⎯ </span>
              <span className="text-[color:var(--color-gray-400)]">Mobile App</span>
            </span>
          </h2>
        </div>

        {/* Figma 18532:53918 — the "1.6M+ / Trusted to use by millions users over
            140 countries" stat is left out (owner 2026-11-04): the app isn't
            published, so there is no number to show. */}

        {/* The phone in the flow below xl: the same turned image, cropped to
            the phone (it fills about a quarter of the image's width). */}
        <div className="relative h-[380px] w-full sm:h-[560px] xl:hidden">
          <Phone className="absolute left-1/2 top-1/2 h-auto w-[640px] -translate-x-1/2 -translate-y-1/2 sm:w-[980px]" />
        </div>

        {/* Figma 18532:53927 — rating, lead and store badges, centred (gap 56). */}
        <div className="flex w-full flex-col items-center gap-[56px] xl:absolute xl:left-[322px] xl:top-[787px] xl:w-[616px]">
          {/* Figma 18532:53928 (gap 28) */}
          <div className="flex w-full flex-col items-center gap-[28px]">
            {/* Figma 18532:53929 "Overlay+Border" — Figma's "4.7 rating (based on 125
                reviews)" and its star; the app isn't out yet, so the chip says so. */}
            <div className="flex h-[38px] items-center justify-center gap-5 rounded-[40px] border-solid border border-[var(--color-border-default)] bg-[var(--color-bg-page)] px-7 py-4">
              <HugeiconsIcon icon={SmartPhone01Icon} size={16} color="var(--color-icon-secondary)" strokeWidth={1.5} className="shrink-0" />
              <p className="whitespace-nowrap text-md font-medium leading-md tracking-normal text-[color:var(--color-text-primary)]">
                Coming soon to iOS and Android
              </p>
            </div>
            {/* Figma 18532:53933 — Body/XL (20 / 30; the DS has no 30 px line height). */}
            <p className="w-full text-center text-2xl font-regular leading-[30px] tracking-normal text-[color:var(--color-text-secondary)]">
              The full IDEEZA experience on iOS and Android. Design, manufacture, sell, and earn — all from your phone.
            </p>
          </div>
          {/* Figma 18532:53934 — the two store badges (gap 24). */}
          <div className="flex flex-wrap items-center justify-center gap-12">
            <StoreBadge icon="apple.svg" store="App Store" />
            <StoreBadge icon="google-play.svg" store="Google Play" />
          </div>
        </div>
      </div>
    </section>
  );
}
