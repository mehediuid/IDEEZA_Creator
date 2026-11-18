"use client";

// Creator Community — Figma IDEEZA Website V-2, 18714:24927 (1440 × 1376).
// The centred heading "The Hardware Creator Feed" over a bento of six feed
// cards (Frame 2147224730, 18714:24938, 1260 × 776): "Worldwide creators" with
// its avatar orbit, a creator profile, two "Explore Community" photo cards,
// Creators Story and a post.
//
// The cards are UI in code with their photos as images. Their glows are
// Figma's own SVG exports placed with Figma's geometry (the file's PNG exports
// of these layers come back flattened onto the section fill, so they could
// not be stacked or blended).
//
// Owner 2026-11-04: the section presents the community to a visitor, so the
// bento is one still picture — nothing in it is a link — and one "Explore
// Community" button under it goes to the feed (/innovations). The Figma's
// story carousel, its dots and "+" are left out. One message per card, the
// lead's own verbs: Browse innovations · Follow creators · Get inspired, and
// Share your inventions. It claims nothing the platform can't back yet: no
// invented names, handles, follower, like or comment counts, no "verified"
// marks. When creators share for real, these cards read featured projects.
//
// At 1280 px and wider the grid is the Figma frame, each card at its Figma
// x/y; narrower, the cards flow two then one to a row at their Figma heights.

import Link from "next/link";
import { buttonVariants } from "@/components/ideeza/button";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";

const ASSETS = "/landing/creator-community";

// ── Glow layers ─────────────────────────────────────────────────────────────
// A blurred vector, as Figma's own code places it: a box the size of the
// rotated layer, the layer turned inside it, the SVG (which carries its blur)
// spilling out by the blur's reach. Every layer is added onto what is under it.

type GlowLayer = {
  node: string;
  src: string;
  left: number;
  top: number;
  w: number;
  h: number;
  rotate: number;
  flip?: boolean;
  iw: number;
  ih: number;
  inset: string;
};

const VEC_500 = { iw: 234.568, ih: 269.462, inset: "-7.85% -9.01% -8.83% -10.14%" };
const VEC_507 = { iw: 306.591, ih: 359.223, inset: "-25.75% -30.17%" };
const VEC_508 = { iw: 307.172, ih: 309.925, inset: "-29.85% -30.12%" };
const VEC_509 = { iw: 337.149, ih: 340.985, inset: "-24.26% -24.54%" };
const DOT_1691 = { iw: 54.21, ih: 69.691, inset: "-222.29% -285.77%", flip: true };
const DOT_1695 = { iw: 54.21, ih: 69.691, inset: "-155.6% -200.04%", flip: true };

// Figma 18714:25045 "Group 1000005240" in the creator-count card (turned 5.08°).
const STATS_GLOW: GlowLayer[] = [
  { node: "18714:25046", src: "glow-500", left: -61.74, top: 104.83, w: 257.522, h: 289.186, rotate: 5.08, ...VEC_500 },
  { node: "18714:25047", src: "glow-501", left: -61.74, top: 104.83, w: 257.522, h: 289.186, rotate: 5.08, ...VEC_500 },
  { node: "18714:25048", src: "glow-502", left: -61.74, top: 104.83, w: 257.522, h: 289.186, rotate: 5.08, ...VEC_500 },
  { node: "18714:25049", src: "glow-507", left: -105.01, top: 51.93, w: 337.214, h: 384.975, rotate: 5.08, ...VEC_507 },
  { node: "18714:25050", src: "glow-508", left: -74.11, top: 68.29, w: 333.425, h: 335.923, rotate: 5.08, ...VEC_508 },
  { node: "18714:25051", src: "glow-509", left: -71, top: 54.89, w: 366.036, h: 369.517, rotate: 5.08, ...VEC_509 },
  { node: "18714:25052", src: "glow-1691", left: -12.64, top: 251.02, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1691 },
  { node: "18714:25053", src: "glow-1691", left: -12.64, top: 251.02, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1691 },
  { node: "18714:25054", src: "glow-1691", left: -12.64, top: 251.02, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1691 },
  { node: "18714:25055", src: "glow-1691", left: -12.64, top: 251.02, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1691 },
  { node: "18714:25056", src: "glow-1695", left: 226.77, top: 322.06, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1695 },
  { node: "18714:25057", src: "glow-1695", left: -28.13, top: -64.37, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1695 },
  { node: "18714:25058", src: "glow-1698", left: 21.77, top: -153.21, w: 83.422, h: 87.973, rotate: 147, ...DOT_1695 },
  { node: "18714:25059", src: "glow-1695", left: -38.7, top: 54.38, w: 83.442, h: 87.954, rotate: 147.01, ...DOT_1695 },
];

// Figma 18714:25016 "Group 1000005240" over the robot-arm photo (turned 90.92°).
const ROBOT_GLOW: GlowLayer[] = [
  { node: "18714:25017", src: "glow-500", left: -48.62, top: -46.49, w: 273.177, h: 238.846, rotate: 90.92, ...VEC_500 },
  { node: "18714:25018", src: "glow-501", left: -48.62, top: -46.49, w: 273.177, h: 238.846, rotate: 90.92, ...VEC_500 },
  { node: "18714:25019", src: "glow-502", left: -48.62, top: -46.49, w: 273.177, h: 238.846, rotate: 90.92, ...VEC_500 },
  { node: "18714:25020", src: "glow-507", left: -89.34, top: -87, w: 364.077, h: 312.293, rotate: 90.92, ...VEC_507 },
  { node: "18714:25021", src: "glow-508", left: -54.44, top: -58.56, w: 314.795, h: 312.087, rotate: 90.92, ...VEC_508 },
  { node: "18714:25022", src: "glow-509", left: -72.18, top: -54.18, w: 346.33, h: 342.556, rotate: 90.92, ...VEC_509 },
  { node: "18714:25023", src: "glow-1691", left: -4.38, top: -4.27, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1691 },
  { node: "18714:25024", src: "glow-1691", left: -4.38, top: -4.27, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1691 },
  { node: "18714:25025", src: "glow-1691", left: -4.38, top: -4.27, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1691 },
  { node: "18714:25026", src: "glow-1691", left: -4.38, top: -4.27, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1691 },
  { node: "18714:25027", src: "glow-1695", left: -57.83, top: 239.67, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1695 },
  { node: "18714:25028", src: "glow-1695", left: 309.05, top: -42.64, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1695 },
  { node: "18714:25029", src: "glow-1698", left: 401.26, top: 0.68, w: 88.286, h: 85.303, rotate: -127.17, ...DOT_1695 },
  { node: "18714:25030", src: "glow-1695", left: 189.84, top: -44.54, w: 88.267, h: 85.324, rotate: -127.16, ...DOT_1695 },
];

function GlowLayers({ layers }: { layers: GlowLayer[] }) {
  return (
    <>
      {layers.map((l) => (
        // Figma <l.node> — group opacity 90 %, added light (plus-lighter).
        <div
          key={l.node}
          aria-hidden
          className="pointer-events-none absolute flex items-center justify-center mix-blend-plus-lighter"
          style={{ left: l.left, top: l.top, width: l.w, height: l.h }}
        >
          <div className="flex-none" style={{ transform: `rotate(${l.rotate}deg)${l.flip ? " scaleY(-1)" : ""}` }}>
            <div className="relative opacity-90" style={{ width: l.iw, height: l.ih }}>
              <div className="absolute" style={{ inset: l.inset }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/${l.src}.svg`} alt="" className="block size-full max-w-none" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Card shell ──────────────────────────────────────────────────────────────
// Every card: radius 24, a 10 % white hairline, a navy glass fill over a lilac
// wash, and an inner lilac glow on top of its content.

const CARD =
  "relative block w-full overflow-clip rounded-[24px] border-solid border-[rgba(255,255,255,0.1)] text-left transition-colors duration-fast ease-standard xl:absolute";
const INNER_GLOW =
  "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-4px_7px_-2px_rgba(178,133,246,0.4),inset_3px_4px_19px_-2px_rgba(148,126,248,0.32)]";
const TEXT_PRIMARY = "text-[color:var(--color-text-primary)]";

// ── Creators Story (Figma 18714:24939) ──────────────────────────────────────
// Three stories as the Figma draws them, the middle one in front. Each names
// the kind of thing built, where the Figma has an author line and a name.

type SlotName = "prev" | "center" | "next";
type Story = { slot: SlotName; image: string; width: number; height: number; category: string };

const STORIES: Story[] = [
  { slot: "prev", image: "story-abstract.webp", width: 300, height: 400, category: "AI Engineering" },
  { slot: "center", image: "story-vr.webp", width: 736, height: 552, category: "VR & Wearables" },
  { slot: "next", image: "story-jet.webp", width: 448, height: 448, category: "Aerorobotics" },
];

type Slot = {
  left: number;
  top: number;
  w: number;
  h: number;
  radius: number;
  border: number;
  z: number;
  overlay: string;
  text: string;
  label: string;
};

// The three places a story card takes, with their own scale, wash and type.
// Coordinates sit in a 361.26-wide stage centred in the card (the card's inner
// width at 1280+, so there they are Figma's own).
const SLOTS: Record<SlotName, Slot> = {
  // Figma 18714:24953 — the story to the left, 131 × 188.
  prev: {
    left: -80.37,
    top: 106.63,
    w: 131,
    h: 188,
    radius: 12,
    border: 0.878,
    z: 1,
    overlay: "bg-[image:linear-gradient(-90deg,rgba(204,172,239,0)_15.476%,rgba(202,157,252,0.7)_93.61%)]",
    text: "left-[7.12px] top-[161.12px] w-[92px]",
    label: "font-semibold text-sm leading-xs tracking-wide text-[color:var(--color-bg-ai-subtle)]",
  },
  // Figma 18714:24945 — the story in front, 188 × 257.
  center: {
    left: 66.63,
    top: 67.63,
    w: 188,
    h: 257,
    radius: 16,
    border: 1.202,
    z: 2,
    overlay:
      "bg-[image:linear-gradient(180deg,rgba(204,172,239,0)_29.836%,rgb(195,144,251)_98.873%),linear-gradient(180deg,rgba(204,172,239,0)_50.766%,rgb(193,147,243)_93.327%)]",
    text: "left-[10.8px] right-[10.8px] top-[223.8px]",
    label: "font-semibold text-lg leading-lg tracking-wide text-[color:var(--color-bg-overlay)]",
  },
  // Figma 18714:24949 — the story to the right, 156 × 224.
  next: {
    left: 270.63,
    top: 86.63,
    w: 156,
    h: 224,
    radius: 14.292,
    border: 1.045,
    z: 1,
    overlay: "bg-[image:linear-gradient(-90deg,rgba(28,2,56,0)_14.84%,rgba(28,2,56,0.63)_136.5%)]",
    text: "left-[10.96px] top-[190.96px] w-[132px]",
    label: "font-semibold text-md leading-md tracking-wide text-[color:var(--color-bg-overlay)]",
  },
};

function CreatorsStory() {
  return (
    <div aria-hidden className="absolute inset-y-0 left-1/2 ml-[-180.629px] w-[361.258px]">
      {STORIES.map((story) => {
        const s = SLOTS[story.slot];
        return (
          <div
            key={story.slot}
            className="absolute overflow-hidden border-solid border-[#dfd4fe]"
            style={{ left: s.left, top: s.top, width: s.w, height: s.h, borderRadius: s.radius, borderWidth: s.border, zIndex: s.z }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ASSETS}/${story.image}`}
              alt=""
              width={story.width}
              height={story.height}
              className="absolute inset-0 size-full max-w-none object-cover"
            />
            <div className={cn("absolute inset-0", s.overlay)} />
            <p className={cn("absolute overflow-hidden text-ellipsis whitespace-nowrap font-display", s.text, s.label)}>{story.category}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export function CreatorCommunity() {
  return (
    // Figma 18714:24927 — fill color/bg/page.
    <section
      aria-labelledby="creator-community-title"
      className="relative isolate overflow-hidden bg-[var(--color-bg-page)] xl:h-[1376px]"
    >
      {/* Decoration: a 1440 stage centred on the viewport, at Figma x/y. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 ml-[-720px] h-full w-[1440px]">
        {/* Figma 18714:24928 "image 302" — the photo texture, a quarter turn and flipped, layer blur 64, 30 %. */}
        <div className="absolute left-0 top-[-2px] flex h-[1355px] w-[1440px] items-center justify-center">
          <div className="flex-none -scale-y-100 rotate-90">
            <div className="relative h-[1440px] w-[1355px] opacity-30 blur-[32px]">
              <div className="absolute inset-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSETS}/bg-texture.webp`}
                  alt=""
                  width={1199}
                  height={685}
                  className="absolute left-[-90.71%] top-[-12.08%] h-[112.05%] w-[194.32%] max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Figma 18714:24929 "Rectangle 2336" — turned 180°, so it sits at x 0 / y −107
            (its metadata x=1440 is the rotation origin, not off-canvas). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSETS}/glow-top.svg`}
          alt=""
          width={1960}
          height={1119}
          className="absolute left-[-260px] top-[-367px] h-[1119px] w-[1960px] max-w-none rotate-180"
        />
      </div>

      {/* Figma 18714:24930 — heading, then the bento 92 below. */}
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col items-center gap-[92px] px-8 pb-40 pt-40 xl:px-0 xl:pb-[54px] xl:pt-[150px]">
        {/* Figma 18714:24931 — eyebrow, Display/MD title, Heading/H4 lead (two lines), centred. */}
        <LandingSectionHeader
          id="creator-community-title"
          eyebrow="Creator Community"
          title="The Hardware Creator Feed"
          lead={
            <>
              <span className="mx-auto block max-w-[560px] xl:max-w-none">
                Browse innovations, follow creators, and get inspired
                <br className="hidden xl:inline" /> by what others are building.
              </span>
            </>
          }
          className="w-full"
        />

        {/* The bento, then 48 below it the section's button. */}
        <div className="flex w-full flex-col items-center gap-24">
          {/* Figma 18714:24938 — the bento, 1260 × 776. */}
          <div className="grid w-full grid-cols-1 gap-[16px] md:grid-cols-2 xl:relative xl:block xl:h-[776px]">
            {/* Figma 18714:25035 — creator count with the avatar orbit. */}
            <div className={cn(CARD, "h-[334px] border-[1.292px] xl:left-[1px] xl:top-0 xl:w-[443px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(148.95deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(184.65deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* The orbit keeps to the card's right edge, so a narrower card trims its left. */}
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-[440.416px]">
                {/* Figma 18714:25036 Group 1000005191 — three rings */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/orbit-rings.svg`} alt="" width={413} height={413} className="absolute left-[92.99px] top-[-11.63px] size-[413.294px] max-w-none" />
              </div>
              {/* Figma 18714:25040 — "12,000+ creators" in Figma; owner 2026-11-04:
                  no count we can't back, so "Worldwide creators". */}
              <p className="absolute left-[22.71px] top-[22.71px] whitespace-nowrap font-display text-3xl font-semibold leading-3xl tracking-slight text-[#fefefe]">
                Worldwide
                <br />
                creators
              </p>
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-[440.416px]">
                {/* Figma 18714:25041 Ellipse 10 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/avatar-orbit-center.png`} alt="" width={66} height={66} className="absolute left-[266.71px] top-[161.71px] size-[65.869px] max-w-none" />
                {/* Figma 18714:25042 Ellipse 12 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/avatar-orbit-top.png`} alt="" width={50} height={50} className="absolute left-[232.71px] top-[14.71px] size-[50.37px] max-w-none" />
                {/* Figma 18714:25043 Ellipse 16 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/avatar-orbit-right.png`} alt="" width={50} height={50} className="absolute left-[399.09px] top-[91.7px] size-[50.37px] max-w-none" />
                {/* Figma 18714:25044 Ellipse 13 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/avatar-orbit-left.png`} alt="" width={45} height={45} className="absolute left-[135.71px] top-[141.71px] size-[45px] max-w-none" />
              </div>
              <GlowLayers layers={STATS_GLOW} />
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-[440.416px]">
                {/* Figma 18714:25060 Ellipse 14 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSETS}/avatar-orbit-bottom.png`} alt="" width={41} height={41} className="absolute left-[209.71px] top-[269.71px] size-[41px] max-w-none" />
              </div>
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_3px_4px_19px_-2px_rgba(148,126,248,0.32)]" />
            </div>

            {/* Figma 18714:24961 "social-media-profile" — a creator's profile: the kind of
                creator and what they build, not a made-up person. */}
            <div className={cn(CARD, "h-[386px] border-[1.292px] xl:left-[459px] xl:top-0 xl:w-[403px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(142.59deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(185.9deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* Figma 18714:24962 "banner" — drawn mirrored in Figma, so the wash's angle and the photo are mirrored here. */}
              <div aria-hidden className="pointer-events-none absolute left-[-1.292px] top-[-1.292px] h-[150px] w-[calc(100%+2.584px)]">
                <div className="absolute inset-0 bg-[image:linear-gradient(350.54deg,rgba(6,39,129,0.272)_3.99%,rgba(197,117,254,0.32)_173.48%)] mix-blend-plus-lighter" />
                <div className="absolute inset-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSETS}/robot-hand.webp`}
                    alt=""
                    width={736}
                    height={920}
                    className="absolute right-[-4.65%] top-[-59.22%] h-[250.67%] w-[74.64%] max-w-none -scale-x-100 object-cover"
                  />
                </div>
              </div>
              {/* Figma 18714:24963 "profile-info" */}
              <div className="absolute left-[-1.292px] top-[148.708px] h-[237px] w-[calc(100%+2.584px)] overflow-clip bg-[image:linear-gradient(154.85deg,rgb(6,15,29)_0.89%,rgb(9,23,51)_90.04%)]">
                {/* Figma 18714:24964 Ellipse 1621 */}
                <div aria-hidden className="pointer-events-none absolute left-[-33px] right-[-265px] top-[69px] h-[259px]">
                  <div className="absolute inset-[-174.2%_-64.36%]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ASSETS}/profile-glow.svg`} alt="" className="block size-full max-w-none" />
                  </div>
                </div>
                {/* Figma 18714:24965 */}
                <div className="absolute left-[24px] top-[82px] flex w-[291px] max-w-[calc(100%-48px)] flex-col gap-[24px] font-display">
                  <div className="flex w-full flex-col gap-[28px]">
                    {/* Figma 18714:24967 — the name line (Figma: a name, a verified mark, a handle). */}
                    <h3 className={cn("whitespace-nowrap text-2xl font-semibold leading-2xl tracking-normal", TEXT_PRIMARY)}>
                      Follow creators
                    </h3>
                    {/* Figma 18714:24973 */}
                    <p className="text-lg font-medium leading-lg tracking-normal text-[color:var(--color-text-secondary)]">
                      See every new build from the makers you follow.
                    </p>
                  </div>
                </div>
                {/* Figma 18714:24981 — the "Robotics" tag (kept to the right edge on narrower cards). */}
                <span
                  className={cn(
                    "absolute right-[24px] top-[28px] flex h-[36px] items-center justify-center rounded-[50px] border border-solid border-[var(--color-border-strong)] px-[12px] py-[10px] font-display text-md font-regular leading-md tracking-normal xl:left-[296px] xl:right-auto",
                    TEXT_PRIMARY,
                  )}
                >
                  Robotics
                </span>
              </div>
              {/* Figma 18714:24983 "BG 1" — the grid (50 %; its hidden "Colored BG 1" is not drawn). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ASSETS}/profile-grid.svg`}
                alt=""
                width={1290}
                height={747}
                className="pointer-events-none absolute left-[-18.76px] top-[-218.59px] h-[746.895px] w-[1289.595px] max-w-none"
              />
              {/* Figma 18714:24989 "profile-picture-frame" */}
              <div className="absolute left-[22.71px] top-[87.71px] flex size-[118px] items-center justify-center rounded-[70.496px] p-[3px]">
                {/* Figma 18714:24990 "profile-picture" */}
                <div className="relative size-[113px] overflow-hidden rounded-[70px] border border-solid border-[#b486e2] bg-[#e9d9fc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSETS}/john-snow.webp`}
                    alt=""
                    width={240}
                    height={240}
                    className="absolute left-[3.95%] top-[8.24%] h-[91.76%] w-[92.11%] max-w-none"
                  />
                </div>
              </div>
              <span aria-hidden className={INNER_GLOW} />
            </div>

            {/* Figma 18714:25032 "social-media-profile" — the VR headset photo. */}
            <div className={cn(CARD, "h-[386px] border-[1.292px] xl:left-[878px] xl:top-0 xl:w-[382px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(141.11deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(186.22deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* Figma 18714:25033 "banner" — navy-to-lilac wash under the cut-out photo. Figma blends
                  its stops (alpha 0.5 → 1) unpremultiplied and CSS premultiplied, so the wash is given in
                  eight steps along Figma's own ramp (34.13 % → 134.38 %) to keep its darker middle. */}
              <div className="absolute left-[-1.292px] top-[-1.292px] h-[386px] w-[calc(100%+2.584px)] overflow-clip">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[image:linear-gradient(188.23deg,rgba(10,21,39,0.5)_34.13%,rgba(33,37,65,0.562)_46.66%,rgba(57,53,92,0.625)_59.19%,rgba(80,69,118,0.688)_71.72%,rgba(104,85,144,0.75)_84.25%,rgba(127,101,170,0.812)_96.79%,rgba(150,117,196,0.875)_109.32%,rgba(174,133,223,0.938)_121.85%,rgba(197,149,249,1)_134.38%)]"
                />
                <div aria-hidden className="absolute inset-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSETS}/vr-headset.webp`}
                    alt=""
                    width={512}
                    height={512}
                    className="absolute left-[-2.48%] top-[2.44%] h-[100.25%] w-[101.44%] max-w-none object-cover"
                  />
                </div>
                {/* Figma 18714:25034 — Heading/H4, bottom-anchored as in Figma ("Explore Community"
                    there, bottom right over the white sweater); bottom left, on the dark side, to read. */}
                {/* Below xl the photo fills more of the card and reaches the caption: a fade behind it. */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[45%] bg-[image:linear-gradient(to_top,color-mix(in_srgb,var(--color-bg-page)_75%,transparent),transparent)] xl:hidden"
                />
                <h3
                  className={cn(
                    "absolute bottom-[17px] left-[25px] whitespace-nowrap font-display text-2xl font-semibold leading-2xl tracking-normal",
                    TEXT_PRIMARY,
                  )}
                >
                  Get
                  <br />
                  inspired
                </h3>
              </div>
              <span aria-hidden className={INNER_GLOW} />
            </div>

            {/* Figma 18714:25014 "social-media-profile" — the robot-arm photo. */}
            <div className={cn(CARD, "h-[425px] border-[1.292px] xl:left-0 xl:top-[350px] xl:w-[443px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(142.55deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(185.9deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* Figma 18714:25015 "banner" */}
              <div aria-hidden className="pointer-events-none absolute left-[-1.292px] top-[-3.292px] h-[427px] w-[calc(100%+2.584px)] overflow-clip">
                <div className="absolute inset-0 overflow-hidden">
                  {/* Figma's crop (left −1.51 %, top −24.18 %, 103.02 % × 133.32 % of 443 × 427) in px, held to the
                      right edge so on a narrower card the arm keeps its place beside "Explore Community". */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSETS}/robot-hand.webp`}
                    alt=""
                    width={736}
                    height={920}
                    className="absolute right-[-6.69px] top-[-24.18%] h-[133.32%] w-[456.38px] max-w-none object-cover"
                  />
                </div>
                <GlowLayers layers={ROBOT_GLOW} />
              </div>
              {/* Figma 18714:25031 — Heading/H3, bottom-anchored as in Figma ("Explore Community" there). */}
              <h3
                className={cn(
                  "absolute bottom-[21.71px] right-[23px] whitespace-nowrap font-display text-3xl font-semibold leading-3xl tracking-slight",
                  TEXT_PRIMARY,
                )}
              >
                Browse
                <br />
                innovations
              </h3>
              <span aria-hidden className={INNER_GLOW} />
            </div>

            {/* Figma 18714:24939 — Creators Story. */}
            <div className={cn(CARD, "isolate h-[373px] border-[1.371px] xl:left-[459px] xl:top-[402px] xl:w-[364px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(140.71deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(186.3deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* Figma 18714:24940 Ellipse 1621 */}
              <div aria-hidden className="pointer-events-none absolute left-[-101.37px] top-[-100.79px] flex h-[402.421px] w-[448.293px] items-center justify-center">
                <div className="flex-none -scale-y-100 rotate-[-151.99deg]">
                  <div className="relative h-[259px] w-[370px]">
                    <div className="absolute inset-[-174.2%_-121.94%]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${ASSETS}/story-glow.svg`} alt="" className="block size-full max-w-none" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Figma 18714:24941 */}
              <h3 className={cn("absolute left-[22.63px] top-[22.63px] whitespace-nowrap font-display text-2xl font-semibold leading-2xl tracking-normal", TEXT_PRIMARY)}>
                Creators Story
              </h3>
              <CreatorsStory />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] shadow-[inset_0px_-4.245px_7.429px_-2.122px_rgba(178,133,246,0.4),inset_3.184px_4.245px_20.163px_-2.122px_rgba(148,126,248,0.32)]"
              />
            </div>

            {/* Figma 18714:24991 "social-media-profile" — a post: its photos and its words. The
                Figma's author row (avatar, name, verified, time) gives way to a title in the Creators
                Story title's style; the like/comment counts are left out. */}
            <div className={cn(CARD, "h-[374px] border-[1.292px] xl:left-[839px] xl:top-[402px] xl:w-[421px]")}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[image:linear-gradient(144.65deg,rgba(6,15,29,0.85)_0.89%,rgba(9,23,51,0.85)_90.04%),linear-gradient(185.47deg,rgba(204,172,239,0)_17.7%,rgba(214,180,251,0.48)_101.83%)]"
              />
              {/* The three product photos, 121 × 122 at x 0 / 130 / 261 (Figma), shrinking only on a card too narrow for them;
                  each blends into the card as in Figma. */}
              <div aria-hidden className="pointer-events-none absolute left-[18.71px] right-[17.706px] top-[87.71px]">
                {/* Figma 18714:24992 — hard light */}
                <div className="absolute left-[min(261px,calc((100%-19px)*2/3+19px))] top-0 aspect-[121/122] w-[min(121px,calc((100%-19px)/3))] overflow-hidden rounded-[10px] mix-blend-hard-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSETS}/product-arm-studio.webp`} alt="" width={260} height={326} className="size-full object-cover" />
                </div>
                {/* Figma 18714:24993 — luminosity, lilac hairline */}
                <div className="absolute left-0 top-0 aspect-[121/122] w-[min(121px,calc((100%-19px)/3))] overflow-hidden rounded-[10px] border border-solid border-[#ebdcfc] mix-blend-luminosity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSETS}/product-arm.webp`} alt="" width={260} height={260} className="size-full object-cover" />
                </div>
                {/* Figma 18714:24994 — added light */}
                <div className="absolute left-[min(130px,calc((100%-19px)/3+9px))] top-0 aspect-[121/122] w-[min(121px,calc((100%-19px)/3))] overflow-hidden rounded-[10px] mix-blend-plus-lighter">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSETS}/product-robot-dog.webp`} alt="" width={260} height={260} className="size-full object-cover" />
                </div>
              </div>
              {/* Figma 18714:24995 — the author row's place, 45 tall. */}
              <h3 className={cn("absolute left-[18.71px] top-[18.71px] flex h-[45px] items-center whitespace-nowrap font-display text-2xl font-semibold leading-2xl tracking-normal", TEXT_PRIMARY)}>
                Share your inventions
              </h3>
              {/* Figma 18714:25003 */}
              <div className="absolute left-[18.71px] top-[227.71px] w-[344px] max-w-[calc(100%-37.42px)] font-display">
                <p className="text-lg font-medium leading-lg tracking-normal text-[#fbfbfc]">
                  Post what you build to the feed and let makers around the world see it.
                </p>
              </div>
              <span aria-hidden className={INNER_GLOW} />
            </div>
          </div>
          {/* Owner 2026-11-04 (not in Figma): the section's one way in, 48 under the bento —
              the same button as Explore Marketplace above; the section keeps Figma's 1376 at xl. */}
          <Link
            href="/innovations"
            className={cn(buttonVariants({ hierarchy: "secondary", size: "2xl" }), LANDING_SECONDARY)}
          >
            Explore Community
          </Link>
        </div>
      </div>
    </section>
  );
}
