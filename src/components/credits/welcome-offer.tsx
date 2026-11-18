"use client";

// The welcome offer's surfaces (lib/account/welcome-offer.ts; owner 2026-11-04):
//   WelcomeOfferHost — on Home, as soon as the Welcome closes (after the tour,
//     when Look around first started one) and no other dialog is open, the pop-up: half off any plan's first
//     payment for 12 hours, the clock running, a plan to pick, Get it. Closed,
//     it never pops up again — the offer moves to the sidebar's Upgrade card.
//   OfferBanner — the same offer at the top of Plan & pricing.
//   OfferMark / OfferSticker — the big "50%" with its yellow OFF sticker: one
//     mark on every surface (pop-up, banner, sidebar card, plan cards), so the
//     discount reads at a glance. The pop-up's hero, the banner and the card
//     stand on .ix-offer-stage (globals.css), the brand stage.
//   useWelcomeOffer — the signed-in account's offer, ticking.

import * as React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GiftIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { tourPlaying } from "@/components/research/signals";
import { Badge, Button, ModalFrame, Segmented } from "@/components/ideeza";
import { linkVariants } from "@/components/ideeza/link";
import { useAuth } from "@/lib/account/auth";
import {
  OFFER_OFF,
  closeOffer,
  countdown,
  countdownParts,
  msLeft,
  offerPhase,
  offerPrice,
  startOffer,
  useOfferEntry,
  type OfferEntry,
  type OfferPhase,
} from "@/lib/account/welcome-offer";
import { checkoutHref } from "@/lib/create/checkout-route";
import { usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { PLANS, priceOf, type PlanTier } from "@/lib/create/plans";
import { cn } from "@/lib/utils";

/** Home waits this long for the Welcome to open first, and for the page to settle. */
const SETTLE_MS = 1500;
/** Then how often it looks again for the other dialog to have closed. */
const RETRY_MS = 1000;
const OFF = `${Math.round(OFFER_OFF * 100)}%`;

function useNow(every: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!every) return;
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [every]);
  return now;
}

export type WelcomeOffer = {
  ready: boolean;
  email: string | null;
  entry: OfferEntry | null;
  phase: OfferPhase;
  /** The offer is on and can be used now: open, and the account still on Free. */
  live: boolean;
  /** It may start: a signed-in account that has never paid for a plan. */
  eligible: boolean;
  left: number;
};

export function useWelcomeOffer(): WelcomeOffer {
  const { hydrated: authReady, account } = useAuth();
  const { hydrated: planReady, sub } = useCreatePlan();
  const email = account?.email ?? null;
  const { hydrated, entry } = useOfferEntry(email);
  const ticking = !!entry && entry.usedAt === null;
  const now = useNow(ticking ? 1000 : 0);
  const phase = offerPhase(entry, now);
  const onFree = sub.tier === "free";
  return {
    ready: authReady && planReady && hydrated,
    email,
    entry,
    phase,
    live: phase === "open" && onFree,
    eligible: !!account && onFree && sub.orders.length === 0,
    left: msLeft(entry, now),
  };
}

/** The three paid plans, as the offer prices their first payment. */
const PAID = PLANS.filter((p) => p.monthly > 0);

function firstPayment(tier: PlanTier, cycle: BillingCycle) {
  const { period } = priceOf(tier, cycle);
  return { period, ...offerPrice(period) };
}

// On the brand stage (.ix-offer-stage) words are white; these are its three strengths.
const ON_STAGE = "text-[color:var(--color-white)]";
const ON_STAGE_SOFT = "text-[color:color-mix(in_srgb,var(--color-white)_80%,transparent)]";
const GLASS =
  "bg-[color:color-mix(in_srgb,var(--color-white)_12%,transparent)] ring-[length:var(--border-width-1)] ring-inset ring-[color:color-mix(in_srgb,var(--color-white)_20%,transparent)]";
const DISPLAY = "font-[family-name:var(--font-family-display)] font-extrabold";

const STICKER = {
  xl: "rounded-[8px] px-[10px] py-[5px] text-3xl leading-none",
  lg: "rounded-[7px] px-[8px] py-[4px] text-2xl leading-none",
  md: "rounded-[5px] px-[6px] py-[3px] text-md leading-none",
  sm: "rounded-[4px] px-[5px] py-[3px] text-xs leading-none",
} as const;

/** The yellow sale sticker: "OFF" beside the mark, or "50% OFF" on its own (a plan card's price). */
export function OfferSticker({ size = "sm", children = `${OFF} OFF`, className }: { size?: keyof typeof STICKER; children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 -rotate-6 whitespace-nowrap bg-[var(--color-yellow-400)] tracking-[0.02em] text-[color:var(--color-violet-950)] shadow-depth",
        DISPLAY,
        STICKER[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

const MARK = {
  xl: ["text-8xl", "gap-[10px]"],
  lg: ["text-6xl", "gap-[8px]"],
  md: ["text-4xl", "gap-[6px]"],
  sm: ["text-2xl", "gap-[5px]"],
} as const;

/** The offer's mark: the percentage, big, with the OFF sticker. Its colour is the parent's. */
export function OfferMark({ size = "xl", className }: { size?: keyof typeof MARK; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", MARK[size][1], className)}>
      <span className={cn("leading-none tabular-nums tracking-[-0.03em]", DISPLAY, MARK[size][0])}>{OFF}</span>{" "}
      <OfferSticker size={size}>OFF</OfferSticker>
    </span>
  );
}

/** Time left: hh · mm · ss as glass chips on the stage, or plain text (`size="sm"`). */
function Countdown({ ms, size = "lg" }: { ms: number; size?: "lg" | "sm" }) {
  const p = countdownParts(ms);
  if (size === "sm") return <span className="tabular-nums">{countdown(ms)}</span>;
  return (
    <div role="timer" aria-label={`Ends in ${Number(p.hours)} hours ${Number(p.minutes)} minutes`} className="flex items-center gap-[6px]">
      {(
        [
          [p.hours, "h"],
          [p.minutes, "m"],
          [p.seconds, "s"],
        ] as const
      ).map(([v, unit], i) => (
        <React.Fragment key={unit}>
          {i > 0 ? (
            <span aria-hidden className={cn("text-xl font-bold leading-xl", ON_STAGE_SOFT)}>
              :
            </span>
          ) : null}
          <span aria-hidden className={cn("inline-flex h-[40px] min-w-[54px] items-baseline justify-center gap-[2px] rounded-[10px] px-[8px] pt-[7px]", GLASS)}>
            <span className={cn("text-2xl font-bold leading-2xl tabular-nums", ON_STAGE)}>{v}</span>
            <span className={cn("text-sm leading-sm", ON_STAGE_SOFT)}>{unit}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** The paper tag on the hero: the picked plan's price, struck, and what it costs now. Left out
 *  where the hero is too narrow for it beside the mark (a 320 px phone); the plan rows say the same. */
function PriceTag({ name, span, was, now }: { name: string; span: string; was: number; now: number }) {
  return (
    <div
      aria-hidden
      className="relative hidden w-[132px] shrink-0 rotate-[5deg] [@container(min-width:320px)]:block rounded-[12px] bg-[var(--color-white)] px-[14px] pb-[12px] pt-[22px] shadow-modal motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-normal motion-safe:ease-decelerate"
    >
      <span className="absolute left-1/2 top-[9px] size-[8px] -translate-x-1/2 rounded-full bg-[var(--color-violet-950)]" />
      <p className="m-0 truncate text-md font-semibold leading-md text-[color:var(--color-gray-900)]">{name}</p>
      <p className="m-0 text-lg leading-lg tabular-nums text-[color:var(--color-gray-500)] line-through decoration-[var(--color-red-500)] decoration-2">
        {usd(was)}
      </p>
      <p className={cn("m-0 text-4xl leading-4xl tabular-nums text-[color:var(--color-violet-700)]", DISPLAY)}>{usd(now)}</p>
      <p className="m-0 text-sm leading-sm text-[color:var(--color-gray-600)]">{span}</p>
    </div>
  );
}

function OfferDialog({ offer, onClose }: { offer: WelcomeOffer; onClose: () => void }) {
  const router = useRouter();
  const titleId = React.useId();
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [tier, setTier] = React.useState<PlanTier>("builder");
  const ctaRef = React.useRef<HTMLButtonElement>(null);
  const picked = PAID.find((p) => p.tier === tier)!;
  const pay = firstPayment(tier, cycle);
  const unit = cycle === "yearly" ? "year" : "month";

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const hero = (
    <div className={cn("ix-offer-stage px-[24px] pb-[24px] pt-[20px] [container-type:inline-size]", ON_STAGE)}>
      <p className={cn("m-0 inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-sm font-semibold leading-sm", GLASS)}>
        <Icon icon={GiftIcon} size={16} />A welcome gift, just for you
      </p>
      <div className="mt-[20px] flex items-center justify-between gap-[16px]">
        <h2 id={titleId} className="m-0 flex min-w-0 flex-col items-start gap-[12px]">
          <OfferMark size="xl" />{" "}
          <span className="text-balance text-lg font-semibold leading-lg">your first {unit} of any plan</span>
        </h2>
        <PriceTag key={`${tier}-${cycle}`} name={picked.name} span={`first ${unit}`} was={pay.period} now={pay.final} />
      </div>
      <div className="mt-[20px] flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
        <span className={cn("text-md font-semibold leading-md", ON_STAGE_SOFT)}>Ends in</span>
        <Countdown ms={offer.left} />
      </div>
    </div>
  );

  return (
    <ModalFrame open onClose={onClose} size="sm" sheet initialFocus={ctaRef} labelledBy={titleId} title={`Welcome gift: ${OFF} off any plan`} hero={hero}>
      <div className="flex flex-col gap-[16px]">
        <Segmented
          label="Billing"
          className="self-center"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Annual" },
          ]}
        />
        <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-[8px]">
          {PAID.map((p) => {
            const on = p.tier === tier;
            const f = firstPayment(p.tier, cycle);
            return (
              <button
                key={p.tier}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTier(p.tier)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-[12px] rounded-[var(--radius-xl)] border-[length:var(--border-width-1-5)] border-solid px-[14px] py-[12px] text-left outline-none transition-colors duration-[var(--motion-duration-normal)] focus-visible:shadow-focus-brand",
                  on ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-subtle)]" : "border-[var(--color-border-default)] bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[length:var(--border-width-2)] border-solid",
                    on ? "border-[var(--color-bg-brand)]" : "border-[var(--color-input-border)]",
                  )}
                >
                  {on ? <span className="size-[8px] rounded-full bg-[var(--color-bg-brand)]" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-[8px] text-md font-semibold leading-md text-text-primary">
                    {p.name}
                    {p.popular ? <Badge tone="brand">Most popular</Badge> : null}
                  </span>
                  <span className="text-sm leading-sm text-text-secondary">{p.credits.toLocaleString("en-US")} AI credits a month</span>
                </span>
                <span className="flex flex-col items-end gap-[4px]">
                  <span className="flex items-baseline gap-[6px]">
                    <span className="text-md leading-md tabular-nums text-text-tertiary line-through">{usd(f.period)}</span>
                    <span className="text-xl font-bold leading-xl tabular-nums text-text-primary">{usd(f.final)}</span>
                  </span>
                  <Badge tone="success">You save {usd(f.saving)}</Badge>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-[10px]">
          <Button
            ref={ctaRef}
            hierarchy="ai"
            size="xl"
            className="w-full"
            onClick={() => go(checkoutHref({ kind: "plan", tier, cycle }))}
          >
            Claim {OFF} off: {picked.name} for {usd(pay.final)}
          </Button>
          <p className="m-0 text-center text-sm leading-sm text-text-tertiary">
            Then {usd(pay.period)} a {unit}. Cancel any time. Testnet demo: no real money moves.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[4px]">
            <NextLink href="/settings/plan" onClick={onClose} className={linkVariants({ size: "md" })}>
              Compare all plans
            </NextLink>
            <Button hierarchy="ghost" size="md" onClick={onClose}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

/** A tour is playing (the Welcome's Look around first): the offer waits for it to end. */
function useTourPlaying(): boolean {
  return React.useSyncExternalStore(tourPlaying.subscribe, tourPlaying.get, () => true);
}

/** On Home, after the Welcome: starts the 12 hours and shows the pop-up, once. */
export function WelcomeOfferHost() {
  const pathname = usePathname();
  const offer = useWelcomeOffer();
  const covered = useTourPlaying();
  const [open, setOpen] = React.useState(false);

  // It pops up while it has never been closed: first after the Welcome, and again on Home
  // if the page was left with it still up. Never once closed.
  const due =
    pathname === "/" &&
    offer.ready &&
    !covered &&
    !open &&
    (offer.phase === "unstarted" ? offer.eligible : offer.live && offer.entry?.closedAt === null);

  // After the page settles, it looks every second until no other dialog (the Welcome) is up.
  React.useEffect(() => {
    if (!due || !offer.email) return;
    const email = offer.email;
    let poll = 0;
    const tryOpen = () => {
      if (document.querySelector('[aria-modal="true"]')) return;
      window.clearInterval(poll);
      if (startOffer(email, Date.now()).ok) setOpen(true);
    };
    const settle = window.setTimeout(() => {
      tryOpen();
      poll = window.setInterval(tryOpen, RETRY_MS);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(poll);
    };
  }, [due, offer.email]);

  if (!open || !offer.email || !offer.live) return null;
  return (
    <OfferDialog
      offer={offer}
      onClose={() => {
        closeOffer(offer.email!, Date.now());
        setOpen(false);
      }}
    />
  );
}

/** Plan & pricing's band about the offer, while it runs. */
export function OfferBanner() {
  const offer = useWelcomeOffer();
  if (!offer.ready || !offer.live) return null;
  return (
    <section
      aria-label={`Welcome gift: ${OFF} off any plan`}
      className={cn("ix-offer-stage flex w-full flex-wrap items-center gap-x-[28px] gap-y-[16px] overflow-hidden rounded-2xl px-[24px] py-[20px]", ON_STAGE)}
    >
      <OfferMark size="lg" />
      <div className="min-w-[220px] flex-1">
        <p className="m-0 text-balance text-xl font-semibold leading-xl">Your welcome gift: half price on any plan</p>
        <p className={cn("m-0 text-md leading-md", ON_STAGE_SOFT)}>Your first month, or your first year. The prices below already include it.</p>
      </div>
      <div className="flex flex-col gap-[6px]">
        <span className={cn("text-sm font-semibold leading-sm", ON_STAGE_SOFT)}>Ends in</span>
        <Countdown ms={offer.left} />
      </div>
    </section>
  );
}

