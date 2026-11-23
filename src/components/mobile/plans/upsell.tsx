"use client";

// The upgrade nudges (CL-032) and the plan's projects (CL-034) on the phone: the
// web's rules and words (lib/create/upsell.ts, components/credits/plan-pitch.tsx,
// out-of-credits.tsx, first-build-nudge.tsx, components/projects/project-limit.tsx)
// in the phone's own parts, so every screen that needs one takes it from here:
//
// · OutOfCreditsRow — the state row above the composer (AI tab, chat): "You're out
//   of credits. They refill on 8 Dec.", Buy credits, and the next plan's link;
// · PlanLink — "Or get 300 credits every month with Builder →", a 44 px link row;
// · PlanPitchRow — the last block of the Buy credits sheet (plan, perks, the
//   month's spend when it's true, MAKER20 once the welcome offer ended unused);
// · FirstBuildCard — the maker's first ready build (Free, once in a lifetime);
// · ProjectLimitCard — the card that takes a new project's place when every one
//   of the plan's projects is in use (as sheet content);
// · ContributorsPlanRow — the Team screen's note on contributors.
//
// The plan named is the next one up (Builder from Free or Tinkerer, Disruptor
// from Builder, none on Disruptor) and its link opens the phone's checkout on the
// cycle the web would (monthly from Free, else the cycle paid by). Never used in
// Mint, Publish, Sell, Earn, the Feed, the marketplace, during a build or on the
// pay step (CL-032's rule).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert02Icon, Cancel01Icon, Coins01Icon, Folder01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { useReturnCoupon } from "@/components/credits/plan-pitch";
import { useWelcomeOffer } from "@/components/credits/welcome-offer";
import { useProjectRoom } from "@/components/projects/project-limit";
import { useAuth } from "@/lib/account/auth";
import { dismissNudge, markNudgeShown, mayShow, useNudgeEntry } from "@/lib/account/nudges";
import { offerPrice } from "@/lib/account/welcome-offer";
import { COUPONS, couponRule } from "@/lib/create/coupons";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { statusOf, useCreateHistory } from "@/lib/create/history";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod, planOf, priceOf } from "@/lib/create/plans";
import { RETURN_COUPON, pitchCycle, pitchPerks, pitchPlan, savingsNudge } from "@/lib/create/upsell";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../kit/list";
import { T } from "../type";
import { checkoutPath } from "./parts";

const MY_PROJECTS_HREF = "/m/projects";

/** A brand link with the kit's 44 px tap area. */
export const PLAN_LINK = cn(T.rowTitle, "inline-flex min-h-[44px] items-center text-text-brand outline-none hover:underline focus-visible:underline");

/** The next plan up and how a nudge names it; null on Disruptor or before the plan is read (the web's usePitch). */
export function usePhonePitch() {
  const { hydrated, sub } = useCreatePlan();
  const plan = hydrated ? pitchPlan(sub.tier) : null;
  if (!plan) return null;
  const cycle = pitchCycle(sub);
  const per = priceOf(plan.tier, cycle);
  return {
    plan,
    cycle,
    href: checkoutPath(plan.tier, cycle),
    price: cycle === "yearly" ? `${usd(per.perMonth)} a month, billed yearly` : `${usd(per.perMonth)} a month`,
    tier: sub.tier,
  };
}

/** "8 Dec": the day this month's plan credits come back (the web's OutOfCreditsLine). */
export function useRefillDay(): string | null {
  const { hydrated, sub } = useCreatePlan();
  const [now] = React.useState(() => Date.now());
  return hydrated ? new Date(creditPeriod(sub, now).end).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
}

/** C1 — "Or get 300 credits every month with Builder →"; nothing on Disruptor. */
export function PlanLink({ className }: { className?: string }) {
  const pitch = usePhonePitch();
  if (!pitch) return null;
  return (
    <Link href={pitch.href} className={cn(PLAN_LINK, className)}>
      Or get {pitch.plan.credits.toLocaleString("en-US")} credits every month with {pitch.plan.name}&nbsp;→
    </Link>
  );
}

/** C1 on the phone: out of credits, one state row above the composer — what happened and when the plan
 *  refills, Buy credits (the sheet, in place) and the next plan up. The send stays as it was. Without
 *  `onBuy` the row has no button: the screen's own bottom bar is already Buy credits (Current credit). */
export function OutOfCreditsRow({ onBuy, className }: { onBuy?: () => void; className?: string }) {
  const refill = useRefillDay();
  return (
    <div role="status" className={cn("flex flex-col rounded-xl bg-bg-error-subtle py-3 pl-6 pr-3", !onBuy && "pt-6", className)}>
      <div className="flex items-center gap-4">
        <span className="shrink-0 text-[color:var(--color-icon-error)]">
          <Icon icon={Coins01Icon} size={18} />
        </span>
        <p className={cn(T.rowTitle, "min-w-0 flex-1")}>
          You&apos;re out of credits.{refill ? ` They refill on ${refill}.` : ""}
        </p>
        {onBuy && (
          <Button size="lg" className="shrink-0" onClick={onBuy}>
            Buy credits
          </Button>
        )}
      </div>
      <PlanLink className="-mb-1 pl-[26px]" />
    </div>
  );
}

const returnCoupon = COUPONS.find((c) => c.code === RETURN_COUPON);
/** "20% off", read from the coupon list so the words follow the code (the web's RETURN_RULE). */
const RETURN_RULE = returnCoupon ? couponRule(returnCoupon) : "money off";

/** C2 — the Buy credits sheet's last block: the next plan, its perks, the month's spend when the plan is
 *  really the better buy (D2), MAKER20 once the welcome offer ended unused (F2). See Builder goes under
 *  the words, full width (CL-032 at phone width). */
export function PlanPitchRow({ onLeave }: { onLeave?: () => void }) {
  const pitch = usePhonePitch();
  const router = useRouter();
  const { ledger } = useCredits();
  const { sub } = useCreatePlan();
  const [now] = React.useState(() => Date.now());
  const coupon = useReturnCoupon();
  if (!pitch) return null;
  const savings = savingsNudge(ledger, sub, now);
  return (
    <section aria-label={`Or get ${pitch.plan.name}`} className="flex flex-col gap-6 rounded-xl bg-bg-brand-subtle p-8">
      <div className="flex min-w-0 flex-col gap-2">
        <p className={T.section}>
          Or get {pitch.plan.name} · {pitch.price}
        </p>
        <p className={T.body}>{pitchPerks(pitch.plan).join(" · ")}</p>
        {savings && (
          <p className={cn(T.body, "text-text-primary")}>
            You&apos;ve spent {usd(savings.spent)} on credits this month. {savings.plan.name} is {usd(savings.monthly)} with{" "}
            {savings.plan.credits.toLocaleString("en-US")} credits every month.
          </p>
        )}
        {coupon && (
          <p className={cn(T.body, "font-semibold text-text-success")}>
            Use code {coupon} for {RETURN_RULE} your first month.
          </p>
        )}
      </div>
      <Button
        hierarchy="outline-brand"
        size="xl"
        className="w-full"
        onClick={() => {
          onLeave?.();
          router.push(pitch.href);
        }}
      >
        See {pitch.plan.name}
      </Button>
    </section>
  );
}

const FIRST_BUILD = "first-build";

/** D1 — the maker's first build is ready (Free only, once in the account's life, the day's one card;
 *  ✕ closes it for good). The same record as the web's card (lib/account/nudges.ts), so it shows once
 *  across the web and the phone. */
export function FirstBuildCard({ jobId, className }: { jobId: string; className?: string }) {
  const { account } = useAuth();
  const email = account?.email ?? null;
  const { hydrated: nudgesReady, entry } = useNudgeEntry(email);
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, balance } = useCredits();
  const { builds } = useCreateHistory();
  const [now] = React.useState(() => Date.now());
  const [closed, setClosed] = React.useState(false);

  const ready = builds.filter((b) => statusOf(b) === "ready");
  const first = ready.length === 1 && ready[0].id === jobId;
  const plan = pitchPlan(sub.tier);
  const show =
    !closed && !!email && nudgesReady && planReady && creditsReady && sub.tier === "free" && first && !!plan && mayShow(entry, FIRST_BUILD, now, { once: true });

  React.useEffect(() => {
    if (show && email) markNudgeShown(email, FIRST_BUILD, now);
  }, [show, email, now]);

  if (!show || !plan) return null;
  return (
    <aside aria-label="Your first build" className={cn("flex flex-col gap-5 rounded-xl bg-bg-brand-subtle py-6 pl-8 pr-3", className)}>
      <div className="flex items-start gap-3">
        <p className={cn(T.body, "min-w-0 flex-1 pt-2 text-text-primary")}>
          <strong className="font-semibold">Your first build is ready.</strong> You have {balance.toLocaleString("en-US")}{" "}
          {balance === 1 ? "credit" : "credits"} left. {plan.name} gives {plan.credits.toLocaleString("en-US")} a month for{" "}
          {usd(priceOf(plan.tier, "monthly").perMonth)}.
        </p>
        <IconButton
          type="button"
          size="xl"
          aria-label="Close"
          onClick={() => {
            setClosed(true);
            if (email) dismissNudge(email, FIRST_BUILD, Date.now());
          }}
          icon={<Icon icon={Cancel01Icon} size={16} />}
        />
      </div>
      <Link href={checkoutPath(plan.tier, "monthly")} className={cn(buttonVariants({ hierarchy: "outline-brand", size: "xl" }), "mr-5 w-auto")}>
        See {plan.name}
      </Link>
    </aside>
  );
}

/** Tiles drawn for the plan's slots; past this many, the count says the rest (the web's MAX_TILES). */
const MAX_TILES = 5;

/** CL-034 — the card that takes a new project's place when every one of the plan's projects is in use:
 *  the slots as folder tiles, what the next plan adds, the count; the heading and its line; Upgrade (at the
 *  welcome offer's price while it runs), then a project you have, then making room. Null while there's room. */
export function ProjectLimitCard({
  onUseExisting,
  useExistingLabel = "Use a project I have",
  onLeave,
  className,
}: {
  /** The sheet's own way to pick a project you have; shown when there is one. */
  onUseExisting?: () => void;
  useExistingLabel?: string;
  /** Called before a link leaves the sheet (Upgrade, Make room). */
  onLeave?: () => void;
  className?: string;
}) {
  const room = useProjectRoom();
  const offer = useWelcomeOffer();
  const headingId = React.useId();
  if (!room.full) return null;

  const { pitch, plan } = room;
  const tiles = Math.min(room.allowed, MAX_TILES);
  const more = pitch ? pitch.projects - room.allowed : 0;
  const offerLive = offer.ready && offer.live && room.tier === "free";
  const price = pitch
    ? offerLive
      ? `${usd(offerPrice(priceOf(pitch.tier, "monthly").period).final)} first month`
      : `${usd(priceOf(pitch.tier, room.cycle).perMonth)} a month`
    : null;
  const extra = pitch?.tier === "disruptor" ? " and 720p video" : pitch ? " and your builds go first" : "";

  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-8 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8", className)}>
      <div className="flex flex-wrap items-center gap-4">
        {Array.from({ length: tiles }, (_, i) => (
          <span key={i} aria-hidden className="inline-flex size-[40px] items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
            <Icon icon={Folder01Icon} size={20} />
          </span>
        ))}
        {more > 0 && pitch && (
          <span aria-hidden className={cn(T.rowTitle, "inline-flex h-[40px] items-center rounded-lg border-[length:var(--border-width-1)] border-dashed border-border-strong px-6 text-text-tertiary")}>
            +{more.toLocaleString("en-US")} with {pitch.name}
          </span>
        )}
        <span className={cn(T.rowTitle, "ml-auto tabular-nums text-text-secondary")}>
          {room.held} of {room.allowed} used
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 id={headingId} className={T.section}>
          {room.allowed === 1 ? `Your ${plan.name} project is in use` : `All ${room.allowed} of your ${plan.name} projects are in use`}
        </h3>
        <p className={T.body}>
          {pitch
            ? `${pitch.name} gives you ${pitch.projects.toLocaleString("en-US")} projects, ${pitch.credits.toLocaleString("en-US")} AI credits a month${extra}.`
            : "Delete one in My projects to start another."}
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-4">
        {pitch && (
          // The price under the words: at phone width "Upgrade to Builder · $5.00 first month" is wider than the card.
          <Link
            href={checkoutPath(pitch.tier, room.cycle)}
            onClick={onLeave}
            className={cn(buttonVariants({ hierarchy: "primary", size: "xl" }), "h-auto min-h-[44px] w-full flex-col gap-0 py-3")}
          >
            <span>Upgrade to {pitch.name}</span>
            {price && <span className={cn(T.meta, "text-inherit opacity-90")}>{price}</span>}
          </Link>
        )}
        {onUseExisting && (
          <Button type="button" hierarchy="secondary" size="xl" className="w-full" onClick={onUseExisting}>
            {useExistingLabel}
          </Button>
        )}
        <Link href={MY_PROJECTS_HREF} onClick={onLeave} className={cn(PLAN_LINK, "justify-center")}>
          Make room in My projects
        </Link>
      </div>
    </section>
  );
}

/** C7 — contributors past the plan's amount, on the Team screen (Earn says nothing about plans). Soft: adding
 *  people still works. A row to the next plan's checkout, the web's sentence as its title. */
export function ContributorsPlanRow({ count }: { count: number }) {
  const { hydrated, sub } = useCreatePlan();
  if (!hydrated) return null;
  const plan = planOf(sub.tier);
  const pitch = pitchPlan(sub.tier);
  if (!pitch || count < plan.contributors) return null;
  const n = (v: number) => `${v.toLocaleString("en-US")} ${v === 1 ? "contributor" : "contributors"}`;
  const line =
    sub.tier === "free"
      ? `Contributors come with Tinkerer (${planOf("tinkerer").contributors}) and Builder (${planOf("builder").contributors}).`
      : `Your ${plan.name} plan includes ${n(plan.contributors)}. ${pitch.name} has ${pitch.contributors.toLocaleString("en-US")}.`;
  return (
    <ListCard label="Contributors">
      <ListRow href={checkoutPath(pitch.tier, pitchCycle(sub))} icon={Tag01Icon} title={line} value={`See ${pitch.name}`} />
    </ListCard>
  );
}

/** The account menu's plan line on the Profile hub: "Free plan · Upgrade to Builder" ("Disruptor plan" on top). */
export function usePlanLine(): string | null {
  const { hydrated, sub } = useCreatePlan();
  if (!hydrated) return null;
  const plan = planOf(sub.tier);
  const pitch = pitchPlan(sub.tier);
  return `${plan.name} plan${pitch ? ` · Upgrade to ${pitch.name}` : ""}`;
}

/** The short-of-credits line under the build bar's buttons (CL-032): the warning icon and what's missing. */
export function ShortOfCreditsLine({ cost, balance }: { cost: number; balance: number }) {
  return (
    <p className={cn(T.meta, "flex items-start gap-2 text-text-primary")}>
      <span aria-hidden className="mt-[2px] inline-flex shrink-0 text-[color:var(--color-icon-warning)]">
        <Icon icon={Alert02Icon} size={14} />
      </span>
      This build costs {cost} credits. You have {balance}, so {cost - balance} more.
    </p>
  );
}
