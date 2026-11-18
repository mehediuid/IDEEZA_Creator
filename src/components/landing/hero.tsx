"use client";

// The landing page's hero — Figma IDEEZA Website V-2, "Desktop - 41"
// 18532:46269 (1440 x 2194). The fixed nav (18559:65842) is drawn by
// nav.tsx over the top 80px; the glows run on behind it.
//
// Every decorative layer is laid out in Figma's own coordinates on a
// 1440-wide canvas centred on the page, so at 1440 it lands exactly where the
// frame draws it. The hero is two stacked blocks so the stage (drone, globe,
// second prompt window) follows the headline when the headline wraps on a
// narrow screen: block 1 is hero y 0–669, block 2 is hero y 669–2194 and its
// layers are placed at (Figma y − 669).
//
// Glows Figma draws with Linear dodge are drawn with mix-blend-mode
// plus-lighter. The vector-heavy layers (Glow Light, the globe art, the star
// texture) and the right chip were exported from Figma flattened on the
// frame's #020513 fill; the files hold only the light those layers add (the
// export minus that fill), so plus-lighter puts back exactly the Figma pixel
// over the page background. The drone keeps its transparency: its raw image
// carries the Figma image adjustments (saturation −0.39, tint, exposure,
// shadows), fitted from the Figma render.
//
// Both prompt bars are real: typing an idea and pressing Enter or the button
// opens the app Home with the idea filled in (/?prompt=…) — signed out, by way
// of Sign up or Sign in, which then carry on to it (useEntry); an empty submit
// only puts the cursor in the field.

import * as React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { useEntry } from "@/components/auth/use-entry";
import { cn } from "@/lib/utils";

const ASSET = "/landing/hero/";
const PLACEHOLDER = "Describe your hardware idea...";

/** Sends a typed idea to the app Home; an empty submit focuses the field instead. */
function usePromptSubmit() {
  const router = useRouter();
  const { into } = useEntry();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const idea = inputRef.current?.value.trim() ?? "";
      if (!idea) {
        inputRef.current?.focus();
        return;
      }
      router.push(into(`/?prompt=${encodeURIComponent(idea)}`));
    },
    [router, into],
  );
  return { inputRef, onSubmit };
}

/**
 * One exported glow layer as Figma's code draws it: the layer's box, and its
 * image bleeding past the box by the blur (`bleed` insets). Plus-lighter
 * stands in for Figma's Linear dodge; `flip` is the mirrored right-hand copy.
 */
function Glow({
  className,
  bleed = "inset-0",
  src,
  w,
  h,
  flip,
}: {
  className: string;
  bleed?: string;
  src: string;
  w: number;
  h: number;
  flip?: boolean;
}) {
  return (
    <div className={cn("absolute mix-blend-plus-lighter", flip && "-scale-x-100", className)}>
      <div className={cn("absolute", bleed)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSET + src} alt="" width={w} height={h} className="block size-full max-w-none" />
      </div>
    </div>
  );
}

/** Figma "Light Beam" 18532:50398 — the light streak and halo around the first prompt bar. */
function LightBeam() {
  // Figma 18532:50399 / 18532:50415 — the two streaks (the right one mirrored).
  const streak = (flip: boolean) => (
    <>
      {/* Figma 18532:50400 / 18532:50416 "Vector" — Vector 459 ×5, 460, 461 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Glow
          key={`a${i}`}
          flip={flip}
          className={flip ? "left-[850px] top-[42px] h-0 w-[420px]" : "left-[-10px] top-[42px] h-0 w-[420px]"}
          bleed="inset-[-15px_-3.1%]"
          src="beam-line-a.svg"
          w={446}
          h={30}
        />
      ))}
      <Glow
        flip={flip}
        className={flip ? "left-[850px] top-[42px] h-0 w-[420px]" : "left-[-10px] top-[42px] h-0 w-[420px]"}
        bleed="inset-[-15px_-3.1%]"
        src="beam-line-b.svg"
        w={446}
        h={30}
      />
      <Glow
        flip={flip}
        className={flip ? "left-[850px] top-[42px] h-0 w-[420px]" : "left-[-10px] top-[42px] h-0 w-[420px]"}
        bleed="inset-[-5px_-0.71%]"
        src="beam-line-c.svg"
        w={426}
        h={10}
      />
      {/* Figma 18532:50408 / 18532:50424 "REC" — Rectangle 42374–42377 (image) and 42378–42379 (gradient) */}
      {[0, 1, 2, 3].map((i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`r${i}`}
          src={`${ASSET}beam-rec.png`}
          alt=""
          width={564}
          height={21}
          className={cn(
            "absolute top-[32px] h-[21px] w-[564px] max-w-none object-cover opacity-30 blur-[15px] mix-blend-plus-lighter",
            flip ? "left-[797px] -scale-x-100" : "left-[-101px]",
          )}
        />
      ))}
      {[0, 1].map((i) => (
        <div
          key={`g${i}`}
          className={cn(
            "absolute top-[32px] h-[21px] w-[564px] bg-[linear-gradient(90deg,#040713_8.654%,#7c2db9)] opacity-30 blur-[15px] mix-blend-plus-lighter",
            flip ? "left-[797px] -scale-x-100" : "left-[-101px]",
          )}
        />
      ))}
    </>
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[calc(50%-630px)] top-0 h-[84px] w-[1260px] max-sm:hidden"
    >
      {streak(false)}
      {streak(true)}
      {/* Figma 18532:50431 "Rec 2" — the halo behind the bar (Rectangle 42380–42386) */}
      <div className="absolute left-[326px] top-[3px] h-[80px] w-[611px] rounded-[40px] bg-[#b680f8] opacity-30 blur-[10px] mix-blend-plus-lighter" />
      <div className="absolute left-[326px] top-[3px] h-[80px] w-[611px] rounded-[40px] bg-[#b680f8] opacity-30 blur-[10px] mix-blend-plus-lighter" />
      <div className="absolute left-[326px] top-[3px] h-[80px] w-[611px] rounded-[40px] bg-[linear-gradient(78.966deg,rgb(176,220,252)_0.591%,rgb(72,171,246)_95.409%)] opacity-30 blur-[20px]" />
      <div className="absolute left-[326px] top-[3px] h-[80px] w-[611px] rounded-[40px] bg-[#53a6f8] opacity-30 blur-[10px] mix-blend-plus-lighter" />
      {/* Figma 18532:50436 Rectangle 42384 */}
      <Glow className="left-[326px] top-0 h-[84px] w-[611px]" bleed="inset-[-11.9%_-1.64%]" src="beam-ring.svg" w={631} h={104} />
      <div className="absolute left-[326px] top-[3px] h-[78px] w-[611px] rounded-[40px] bg-[#b680f8] opacity-30 blur-[5px] mix-blend-plus-lighter" />
      <div className="absolute left-[326px] top-[3px] h-[78px] w-[611px] rounded-[40px] bg-[#5a32fa] blur-[5px] mix-blend-plus-lighter" />
      {/* Figma 18532:50439 "Oval" — the left end of the halo (Ellipse 1646–1654) */}
      <Glow className="left-[306.54px] top-[23.88px] h-[38.638px] w-[43.907px]" bleed="inset-[-409.09%_-360%]" src="beam-oval-1646.svg" w={360} h={355} />
      <Glow className="left-[306.54px] top-[24.76px] h-[36.882px] w-[40.394px]" bleed="inset-[-428.57%_-391.3%]" src="beam-oval-1647.svg" w={357} h={353} />
      <Glow className="left-[296px] top-[29.15px] h-[28.101px] w-[50.932px]" bleed="inset-[-562.5%_-310.34%]" src="beam-oval-1649.svg" w={367} h={344} />
      <Glow className="left-[299.18px] top-[27px] h-[31.092px] w-[56.354px]" bleed="inset-[-562.5%_-310.34%]" src="beam-oval-1654.svg" w={406} h={381} />
      <Glow className="left-[303.9px] top-[23.88px] h-[38.638px] w-[50.932px]" bleed="inset-[-409.09%_-310.34%]" src="beam-oval-1652.svg" w={367} h={355} />
      <Glow className="left-[304.36px] top-[26px] h-[34px] w-[43px]" bleed="inset-[-51.66%_-40.84%]" src="beam-oval-1653.svg" w={78} h={69} />
      <Glow className="left-[315.32px] top-[23px] h-[41.273px] w-[40.394px]" bleed="inset-[-42.55%_-43.48%]" src="beam-oval-1651.svg" w={76} h={76} />
      {/* Figma 18532:50447 "Oval" — the right end, mirrored */}
      <Glow flip className="left-[909.27px] top-[23.88px] h-[38.638px] w-[43.907px]" bleed="inset-[-409.09%_-360%]" src="beam-oval-1646.svg" w={360} h={355} />
      <Glow flip className="left-[912.78px] top-[24.76px] h-[36.882px] w-[40.394px]" bleed="inset-[-428.57%_-391.3%]" src="beam-oval-1647.svg" w={357} h={353} />
      <Glow flip className="left-[912.78px] top-[29.15px] h-[28.101px] w-[50.932px]" bleed="inset-[-562.5%_-310.34%]" src="beam-oval-1649.svg" w={367} h={344} />
      <Glow flip className="left-[904.18px] top-[27px] h-[31.092px] w-[56.354px]" bleed="inset-[-562.5%_-310.34%]" src="beam-oval-1654.svg" w={406} h={381} />
      <Glow flip className="left-[904.88px] top-[23.88px] h-[38.638px] w-[50.932px]" bleed="inset-[-409.09%_-310.34%]" src="beam-oval-1652.svg" w={367} h={355} />
      <Glow flip className="left-[912.36px] top-[26px] h-[34px] w-[43px]" bleed="inset-[-51.66%_-40.84%]" src="beam-oval-1653.svg" w={78} h={69} />
      <Glow flip className="left-[904px] top-[23px] h-[41.273px] w-[40.394px]" bleed="inset-[-42.55%_-43.48%]" src="beam-oval-1651.svg" w={76} h={76} />
    </div>
  );
}

/**
 * Figma's hard line break. Figma keeps the space at the end of the broken
 * line, and in centred text that space shifts the line half a space left, so
 * it is kept here as a no-break space. Below md the copy wraps on its own.
 */
function FigmaBreak() {
  return (
    <>
      <span className="max-md:hidden">
        &nbsp;
        <br />
      </span>
      <span className="md:hidden"> </span>
    </>
  );
}

const FOCUS_RING =
  "has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--color-border-focus)]";

/** Figma "Frame 1171276462" 18532:50455 — the first prompt bar with the Generate button. */
function HeroPromptBar() {
  const { inputRef, onSubmit } = usePromptSubmit();
  return (
    <form
      aria-label="Describe your hardware idea"
      onSubmit={onSubmit}
      className={cn(
        "absolute left-1/2 top-[8px] flex h-[68px] w-[602px] max-w-full -translate-x-1/2 items-center gap-4 rounded-[100px] border-2 border-solid border-[#42354c] bg-[#0e0515] py-4 pl-16 pr-6 shadow-[inset_0px_4px_12px_0px_rgba(160,124,197,0.32),inset_-1px_0px_5px_0px_rgba(66,45,98,0.23),inset_0px_-3px_12px_0px_rgba(178,141,235,0.32)]",
        FOCUS_RING,
      )}
    >
      {/* Figma 18532:50458 — Body/LG Medium, color/text/primary */}
      <input
        ref={inputRef}
        type="text"
        name="prompt"
        autoComplete="off"
        enterKeyHint="go"
        aria-label="Describe your hardware idea"
        placeholder={PLACEHOLDER}
        className="h-[28px] min-w-0 flex-1 bg-transparent font-display text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-primary)]"
      />
      {/* Figma 18532:50459 — A01 Button, Primary XL, icon/ai-magic */}
      <Button
        type="submit"
        hierarchy="primary"
        size="xl"
        className="shrink-0 rounded-full"
        iconTrailing={<HugeiconsIcon icon={AiMagicIcon} strokeWidth={1.5} className="[&_path]:fill-current" />}
      >
        Generate
      </Button>
    </form>
  );
}

/** Figma "Frame 1171276462" 18532:51744 — the prompt bar inside the glass window. */
function WindowPromptBar() {
  const { inputRef, onSubmit } = usePromptSubmit();
  return (
    <form
      aria-label="Describe your hardware idea"
      onSubmit={onSubmit}
      className={cn(
        "absolute left-1/2 top-1/2 flex h-[72px] w-[574px] max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 items-center gap-6 rounded-[16.941px] bg-[#010926] py-7 pl-[26px] pr-12",
        FOCUS_RING,
      )}
    >
      {/* Figma 18532:51747 — Heading/H3, color/text/ai */}
      <input
        ref={inputRef}
        type="text"
        name="prompt"
        autoComplete="off"
        enterKeyHint="go"
        aria-label="Describe your hardware idea"
        placeholder={PLACEHOLDER}
        className="h-[32px] min-w-0 flex-1 bg-transparent font-display text-3xl font-semibold leading-3xl tracking-slight text-[color:var(--color-text-ai)] outline-none placeholder:text-[color:var(--color-text-ai)]"
      />
      {/* Figma 18532:51748 — the sparkle, the bar's send button */}
      <button
        type="submit"
        aria-label="Generate"
        className="flex size-[29.647px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity duration-fast hover:opacity-80 focus-visible:shadow-focus-brand focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET}prompt-sparkle.svg`} alt="" width={29.647} height={29.647} className="block size-full max-w-none" />
      </button>
    </form>
  );
}

export function LandingHero() {
  return (
    <section aria-labelledby="landing-hero-title" className="relative isolate overflow-hidden bg-[var(--color-bg-page)]">
      {/* ── Block 1: hero y 0–669 ─────────────────────────────────────── */}
      <div className="relative">
        {/* Layers under the headline, in Figma coordinates */}
        <div aria-hidden className="pointer-events-none absolute left-[calc(50%-720px)] top-0 h-full w-[1440px]">
          {/* Figma 18532:49420 "Glow Light" (group, 70%, rotated 57.39°) — exported, clipped to the frame.
              Wider than 1440 the frame's left edge is on screen, so the cut-off ray fades out there. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}glow-light.png`}
            alt=""
            width={1081}
            height={880.5}
            className="absolute left-0 top-0 h-[880.5px] w-[1081px] max-w-none mix-blend-plus-lighter min-[1441px]:[mask-image:linear-gradient(90deg,transparent,#000_160px)]"
          />
          {/* Figma 18532:50391 "Chip" (right) — Linear dodge 80%, blur 12, rotated −9.32°, image adjustments; exported */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}chip-right.png`}
            alt=""
            width={232}
            height={232}
            className="absolute left-[1164px] top-[187px] size-[232px] max-w-none mix-blend-plus-lighter max-xl:hidden"
          />
        </div>

        {/* Figma 18532:50392 "Frame 2147225495" — headline, lead and the first prompt bar */}
        <div className="relative mx-auto w-full max-w-[1260px] px-8 pt-[136px] md:pt-[180px] xl:px-0 xl:pt-[227px]">
          {/* Figma 18532:50394 */}
          <div className="flex flex-col items-center gap-[28px] text-center">
            {/* Figma 18532:50395 — Display/XL */}
            <h1
              id="landing-hero-title"
              className="w-full max-w-[1066px] font-display text-8xl font-bold leading-8xl tracking-tighter text-[color:var(--color-text-primary)]"
            >
              Build Hardware at the<FigmaBreak />
              Speed of Software
            </h1>
            {/* Figma 18532:50396 — Body/XL Medium */}
            <p className="w-full max-w-[708px] font-display text-2xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)] md:leading-[30px]">
              Describe your idea in plain language. IDEEZA AI generates a full 3D<FigmaBreak />
              hardware prototype, PCB, and the code that runs it, all from<FigmaBreak />
              one prompt. No engineering background needed.
            </p>
          </div>
          {/* Figma 18532:50397 "Frame 2147224624" — 80 under the copy */}
          <div className="relative mt-[80px] h-[84px] w-full">
            <LightBeam />
            <HeroPromptBar />
          </div>
        </div>

        {/* Layers over the headline, in Figma coordinates */}
        <div aria-hidden className="pointer-events-none absolute left-[calc(50%-720px)] top-0 h-full w-[1440px]">
          {/* Figma 18532:50460 "Ellipse 1656" — #022457, blur 334 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}ellipse-1656.svg`}
            alt=""
            width={947}
            height={796}
            className="absolute left-[-300px] top-[-17px] h-[796px] w-[947px] max-w-none"
          />
          {/* Figma 18532:50461 "Chip" (left) — Linear dodge 80%, progressive blur 0→12, skewed −13.42°; exported */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}chip-left.png`}
            alt=""
            width={295.5}
            height={272}
            className="absolute left-[28.08px] top-[238.16px] h-[272px] w-[295.5px] max-w-none mix-blend-plus-lighter max-xl:hidden"
          />
        </div>
      </div>

      {/* ── Block 2: hero y 669–2194 (layers at Figma y − 669) ──────────── */}
      <div className="relative pb-[229px] pt-[576px]">
        <div aria-hidden className="pointer-events-none absolute left-[calc(50%-720px)] top-0 h-full w-[1440px]">
          {/* Figma 18532:46270 "Frame 2147224629" / Layer_1 — the globe line art (70%), exported.
              The frame's bottom layer, so it sits under everything (z −1 in the section). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}globe-art.png`}
            alt=""
            width={1440}
            height={598}
            className="absolute left-0 top-[52px] z-[-1] h-[598px] w-[1440px] max-w-none mix-blend-plus-lighter"
          />
          {/* Figma 18532:50462 "Ellipse 1655" — #063883, blur 270 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}ellipse-1655.svg`}
            alt=""
            width={1009}
            height={938}
            className="absolute left-[217px] top-[-139px] h-[938px] w-[1009px] max-w-none"
          />
          {/* Figma 18532:50463 "Ellipse 1657" — #030612, blur 270 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}ellipse-1657.svg`}
            alt=""
            width={1823}
            height={938}
            className="absolute left-[-203px] top-[291px] h-[938px] w-[1823px] max-w-none"
          />
          {/* Figma 18532:50464 — the drone, 482 × 482 rotated −6.37° about its top-left */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}drone.png`}
            alt=""
            width={482}
            height={482}
            className="absolute left-[497.455px] top-[9px] size-[482px] max-w-none origin-top-left rotate-[6.367deg]"
          />
          {/* Figma 18532:50465 "image 302" — 842 × 1440 laid on its side (Figma matrix), blur 64, 30% */}
          <div className="absolute left-0 top-0 h-[1440px] w-[842px] origin-top-left overflow-hidden opacity-30 blur-[32px] [transform:matrix(0,1,1,0,0,514)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ASSET}image-302.jpg`}
              alt=""
              width={1200}
              height={2134}
              className="absolute left-[-0.02%] top-[-2.01%] h-[104.03%] w-[100.04%] max-w-none"
            />
          </div>
          {/* Figma 18532:50466 "Rectangle 42389" — dark band, 70%, blur 34 (its 3px background blur is not drawn) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET}band-42389.svg`}
            alt=""
            width={1508}
            height={456.5}
            className="absolute left-[-34px] top-[523.5px] h-[456.5px] w-[1508px] max-w-none"
          />
          {/* Figma 18532:50467 "image 297" — lavender 40% and black 50% over the photo, blur 164, 30% */}
          <div className="absolute left-[372px] top-[743px] h-[412px] w-[686px] opacity-30 blur-[82px]">
            <div className="absolute inset-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ASSET}image-297.png`}
                alt=""
                width={2000}
                height={1121}
                className="absolute left-[-9.93%] top-[-11.97%] h-[111.97%] w-[119.86%] max-w-none"
              />
            </div>
            <div className="absolute inset-0 bg-[rgba(227,191,254,0.4)]" />
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)]" />
          </div>
        </div>

        {/* Figma 18532:50469 "Frame 2147224631" — the glass window: white 2%, radius 36, Glass (frost 74).
            The frost sits on its own layer so the window itself does not isolate the plus-lighter
            layers inside it from what shows through the glass. */}
        <div className="relative mx-auto h-[720px] w-[1058px] max-w-[calc(100%-32px)] overflow-hidden rounded-[36px] max-sm:h-[480px]">
          <div aria-hidden className="absolute inset-0 rounded-[inherit] bg-[rgba(255,255,255,0.02)] backdrop-blur-[37px]" />
          <div aria-hidden className="pointer-events-none absolute left-[calc(50%-529px)] top-[calc(50%-360px)] h-[720px] w-[1058px]">
            {/* Figma 18532:50470 "Star texture" — exported */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ASSET}star-texture.png`}
              alt=""
              width={1000.5}
              height={720}
              className="absolute left-[28.995px] top-0 h-[720px] w-[1000.5px] max-w-none mix-blend-plus-lighter"
            />
            {/* Figma 18532:51721 "Color Ball" — Ellipse 1665 (violet) and 1666 (blue, mirrored) */}
            <Glow className="left-[215px] top-[258px] h-[231px] w-[293px]" bleed="inset-[-96.97%_-76.45%]" src="colorball-1665.svg" w={741} h={679} />
            <Glow flip className="left-[549px] top-[258px] h-[231px] w-[293px]" bleed="inset-[-96.97%_-76.45%]" src="colorball-1666.svg" w={741} h={679} />
            {/* Figma 18532:51724 / 18532:51734 — the glowing ends of the bar: 5 visible strokes each
                (the 4 rectangles at 0% opacity in each group are not drawn) */}
            <div className="max-sm:hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <Glow
                  key={`l${i}`}
                  className="left-[245.29px] top-[327px] h-[63.529px] w-[187.412px]"
                  bleed="inset-[-29.8%_-10.17%]"
                  src="edge-left-b.svg"
                  w={226}
                  h={101}
                />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <Glow
                  key={`r${i}`}
                  flip
                  className="left-[624.35px] top-[327px] h-[63.529px] w-[187.412px]"
                  bleed="inset-[-29.8%_-10.17%]"
                  src="edge-right-b.svg"
                  w={226}
                  h={101}
                />
              ))}
            </div>
          </div>
          <WindowPromptBar />
          {/* The Glass effect's lit rim (light from the top left) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_0_0_rgba(255,255,255,0.4),inset_-1px_0_0_rgba(255,255,255,0.28),inset_0_1px_0_rgba(255,255,255,0.19),inset_0_-1px_0_rgba(255,255,255,0.17)]"
          />
        </div>
      </div>
    </section>
  );
}
