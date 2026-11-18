"use client";

// Plan & pricing on the phone (/m/plans; mobile Figma "Monthly plan",
// "Yearly plan", "AI Credits", "Billing History"): the Plans · Credits ·
// Billing tabs (`?tab=`, client state — a tap never navigates, so they work
// offline). The plans, prices, relations and words are the web's
// (lib/create/plans.ts, components/credits/plans-panel.tsx): Free, Tinkerer,
// Builder, Disruptor. On the phone the plans are a pick-one list — the
// picked card opens its features — and the picked plan's button sits in the
// Bottom action bar, worded by how it stands to yours (Upgrade to X → the
// checkout, a smaller plan → Downgrade, Free → Cancel subscription, Current
// plan, Starts on …). The compare table and the Pricing FAQs (the web's
// four groups, one list, no tabs) open in tall sheets from their rows.
// While the welcome offer runs, the web's offer band — folded to one strip
// with its countdown, the rest behind ⓘ — sits over the plans and every paid
// price is the offer's. The Credits tab puts its Purchase in the
// same bar; Billing has none. The Figma's partner logos and website footer
// are the landing page's, not the app's, and aren't drawn here.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BubbleChatQuestionIcon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  FlashIcon,
  MinusSignIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  UserGroupIcon,
  Table02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { COMPARE, FAQ, FAQ_TABS, HELPFUL_KEY, type Cell } from "@/components/credits/plans-panel";
import { OfferSticker, useWelcomeOffer } from "@/components/credits/welcome-offer";
import { countdown, offerPrice } from "@/lib/account/welcome-offer";
import { discountFor, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { HIGH_VIDEO_TIER, PLANS, YEARLY_OFF, planOf, priceOf, relationOf, type Plan, type PlanTier, type Subscription } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { FaqList } from "../help/faq-list";
import { BottomBar } from "../kit/bottom-bar";
import { ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { BillingTab } from "./billing-tab";
import { CancelSheet } from "./cancel-sheet";
import { CreditsTab } from "./credits-tab";
import { CARD, HAIRLINE, InfoButton, PillSwitch, PlanFoot, PlanFootContext, RadioCard, checkoutPath, dateOf, dollars, downgradePath, n, pct } from "./parts";

const PAID = PLANS.filter((p) => p.monthly > 0);
const FREE = planOf("free");
const TABS = ["plans", "credits", "billing"] as const;
const ORDER: PlanTier[] = ["free", "tinkerer", "builder", "disruptor"];

export function PlansScreen() {
  const [tab, setTab] = useTabParam("tab", TABS, "plans");
  const [foot, setFoot] = React.useState<HTMLDivElement | null>(null);
  return (
    <Screen top={<TopBar back title="Plan & pricing" />} className="px-8 pb-12" footer={tab === "billing" ? undefined : <div ref={setFoot} />}>
      <div className="flex flex-col gap-8">
        <MobileTabs
          label="Plan & pricing"
          idBase="plan"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "plans", label: "Plans" },
            { value: "credits", label: "Credits" },
            { value: "billing", label: "Billing" },
          ]}
        />
        <OfflineBanner />
        <PlanFootContext.Provider value={tab === "billing" ? null : foot}>
          <div {...tabPanelProps("plan", tab)} className="flex flex-col gap-10 outline-none">
            {tab === "plans" ? <PlansTab /> : tab === "credits" ? <CreditsTab /> : <BillingTab />}
          </div>
        </PlanFootContext.Provider>
      </div>
    </Screen>
  );
}

/** What a plan's button says and does, by how it stands to the subscription (the web's useCta). */
export function ctaOf(sub: Subscription, tier: PlanTier, cycle: BillingCycle, hydrated: boolean) {
  const rel = hydrated ? relationOf(sub, tier, cycle) : "current";
  const same = sub.tier === tier;
  const label =
    rel === "current"
      ? "Current plan"
      : rel === "scheduled"
        ? `Starts on ${sub.renewsAt ? dateOf(sub.renewsAt) : "renewal"}`
        : rel === "upgrade"
          ? same
            ? "Switch to annual"
            : "Upgrade"
          : same
            ? "Switch to monthly"
            : tier === "free"
              ? "Switch to Free"
              : "Downgrade";
  return { rel, label, enabled: hydrated && (rel === "upgrade" || rel === "downgrade") };
}

/** The welcome offer on the phone: the web's band (OfferBanner) folded to one strip over the plans — the
 *  sticker, the gift, the countdown — with the rest of its words behind the ⓘ. */
function OfferStrip() {
  const offer = useWelcomeOffer();
  if (!offer.ready || !offer.live) return null;
  return (
    <section aria-label="Welcome gift: 50% off any plan" className="flex items-center gap-5 rounded-xl bg-bg-brand-subtle py-4 pl-6 pr-2">
      <OfferSticker size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle, "text-text-brand")}>Your welcome gift: half price on any plan</span>
        <span className={cn(T.meta, "tabular-nums")}>Ends in {countdown(offer.left)}</span>
      </span>
      <InfoButton title="Your welcome gift">
        <p className={T.body}>Half price on any plan: your first month, or your first year. The prices below already include it.</p>
        <p className={cn(T.meta, "tabular-nums")}>Ends in {countdown(offer.left)}</p>
      </InfoButton>
    </section>
  );
}

/** The plan the list opens on: the most popular one, or yours when it's bigger. */
function firstPick(sub: Subscription): PlanTier {
  return ORDER.indexOf(sub.tier) > ORDER.indexOf("builder") ? sub.tier : "builder";
}

function PlansTab() {
  const router = useRouter();
  const { hydrated, sub } = useCreatePlan();
  const offer = useWelcomeOffer();
  const offerLive = offer.ready && offer.live;
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [synced, setSynced] = React.useState(false);
  const [picked, setPicked] = React.useState<PlanTier | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [comparing, setComparing] = React.useState(false);
  const [faqs, setFaqs] = React.useState(false);

  // Open on the cycle you pay by, once the plan is read.
  if (hydrated && !synced) {
    setSynced(true);
    if (sub.tier !== "free") setCycle(sub.cycle);
  }

  const tier = picked ?? firstPick(sub);
  const plan = planOf(tier);
  const planCycle: BillingCycle = tier === "free" ? "monthly" : cycle;
  const cta = ctaOf(sub, tier, planCycle, hydrated);
  const barLabel = cta.rel === "upgrade" && sub.tier !== tier ? `Upgrade to ${plan.name}` : cta.rel === "downgrade" && cta.label === "Downgrade" ? `Downgrade to ${plan.name}` : cta.label;

  const act = () => {
    const rel = relationOf(sub, tier, planCycle);
    if (rel === "upgrade") router.push(checkoutPath(tier, planCycle));
    else if (rel === "downgrade") {
      if (tier === "free") setCancelling(true);
      else router.push(downgradePath(tier, planCycle));
    }
  };

  return (
    <>
      <section aria-labelledby="choose-plan" className="flex flex-col gap-8">
        <OfferStrip />
        <h2 id="choose-plan" className="sr-only">
          Choose a plan
        </h2>
        <PillSwitch
          label="Billing"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly" },
            {
              value: "yearly",
              label: (
                <>
                  Annual · <span className="text-text-success">Save {pct(YEARLY_OFF)}</span>
                </>
              ),
            },
          ]}
        />
        <div className="flex flex-col gap-4">
          <p className={cn(T.meta, "text-center")}>Break creative boundaries with flexible plans made just for you.</p>
          <ul role="radiogroup" aria-labelledby="choose-plan" className="flex flex-col gap-6">
            {PAID.map((p, i) => (
              <PlanCard key={p.tier} plan={p} below={i === 0 ? FREE : PAID[i - 1]} cycle={cycle} offer={offerLive} first={i === 0} checked={tier === p.tier} onSelect={() => setPicked(p.tier)} />
            ))}
            <PlanCard plan={FREE} cycle="monthly" offer={false} checked={tier === "free"} onSelect={() => setPicked("free")} />
          </ul>
        </div>
        <ListCard label="More about plans">
          <ListRow icon={Table02Icon} title="Compare plans" meta="Every plan, row by row" onClick={() => setComparing(true)} />
          <ListRow icon={BubbleChatQuestionIcon} title="Pricing FAQs" meta="General and each plan" onClick={() => setFaqs(true)} />
        </ListCard>
      </section>
      <PlanFoot>
        <BottomBar>
          <Button hierarchy="primary" size="xl" className="w-full" disabled={!cta.enabled} onClick={act}>
            {barLabel}
          </Button>
        </BottomBar>
      </PlanFoot>
      <Sheet open={comparing} onClose={() => setComparing(false)} title="Compare plans" fill>
        <ComparePlans cycle={cycle} offer={offerLive} />
      </Sheet>
      <Sheet open={faqs} onClose={() => setFaqs(false)} title="Pricing FAQs" fill>
        <PricingFaqs />
      </Sheet>
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </>
  );
}

function PlanCard({
  plan: p,
  below,
  cycle,
  offer,
  first,
  checked,
  onSelect,
}: {
  plan: Plan;
  below?: Plan;
  cycle: BillingCycle;
  offer: boolean;
  first?: boolean;
  checked: boolean;
  onSelect: () => void;
}) {
  const { hydrated, sub } = useCreatePlan();
  const rel = hydrated ? relationOf(sub, p.tier, p.monthly > 0 ? cycle : "monthly") : null;
  const per = priceOf(p.tier, cycle).perMonth;
  const offered = offer && p.monthly > 0;
  const discount = discountFor(p.tier, "monthly");
  const features = [
    { icon: FlashIcon, text: p.queue.replace(/, peak waits possible$/, " (peak waits possible)").replace(/, shortest waits$/, " (shortest waits)") },
    { icon: Folder01Icon, text: `${n(p.projects)} ${p.projects === 1 ? "project" : "projects"} • ${n(p.exports)} exports` },
    {
      icon: UserGroupIcon,
      text: `${p.contributors === 0 ? "No contributors" : `${n(p.contributors)} ${p.contributors === 1 ? "contributor" : "contributors"}`} • Mint, list and buy`,
    },
    ...(discount > 0 ? [{ icon: Tick02Icon, text: `${pct(discount)} off AI credits (${pct(discountFor(p.tier, "yearly"))} yearly)` }] : []),
    ...(p.tier === HIGH_VIDEO_TIER ? [{ icon: Tick02Icon, text: "720p AI video" }] : []),
  ];
  const name = p.tier === "free" ? "Free plan" : p.name;
  return (
    <RadioCard
      checked={checked}
      onSelect={onSelect}
      label={`${name}, ${dollars(offered ? offerPrice(per).final : per)} a month${rel === "current" ? ", your current plan" : ""}`}
      below={
        checked ? (
          <div className={cn(HAIRLINE, "flex flex-col gap-5 border-t-[length:var(--border-width-1)] pt-6")}>
            {below && <p className={T.rowTitle}>Everything in {below.tier === "free" ? "Free plan" : below.name}</p>}
            <ul className={cn(T.body, "flex flex-col gap-5 text-text-primary")}>
              {features.map((f) => (
                <li key={f.text} className="flex items-center gap-5">
                  <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                    <Icon icon={f.icon} size={16} />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    >
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={cn(T.title, p.popular && "text-text-brand")}>{name}</span>
        {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
        {rel === "current" && <Badge tone="success">Current plan</Badge>}
        {rel === "scheduled" && <Badge tone="warning">Starts {sub.renewsAt ? dateOf(sub.renewsAt) : "on renewal"}</Badge>}
      </span>
      <span className={T.body}>{p.tagline}</span>
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-2 pt-2">
        <span className={cn(T.display, "tabular-nums")}>{dollars(offered ? offerPrice(per).final : per)}</span>
        <span className={T.body}>/ {p.monthly > 0 && cycle === "yearly" ? "mo, billed yearly" : "month"}</span>
        {first && <TestnetDemoBadge />}
      </span>
      {offered && (
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <OfferSticker size="sm" />
          <span className={cn(T.body, "tabular-nums text-text-tertiary line-through")}>{dollars(per)}</span>
          <span className={cn(T.rowTitle, "text-text-success")}>your {cycle === "yearly" ? "first year" : "first month"}</span>
        </span>
      )}
      <span className={cn(T.body, "flex items-center gap-4 text-text-primary")}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={AiMagicIcon} size={16} />
        </span>
        <span>
          AI credits: <CreditChip value={p.credits} /> / month
        </span>
      </span>
    </RadioCard>
  );
}

export function CreditChip({ value }: { value: number }) {
  return <span className={cn(T.rowTitle, "mx-2 inline-flex rounded-md bg-bg-brand-subtle px-4 py-1 tabular-nums text-text-brand")}>{n(value)}</span>;
}

// ── Compare plans ──────────────────────────────────────────────────────

function CellValue({ value, chip }: { value: Cell; chip?: boolean }) {
  if (value === true)
    return (
      <span role="img" aria-label="Included" className="inline-flex size-[24px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand">
        <Icon icon={Tick02Icon} size={14} />
      </span>
    );
  if (value === false)
    return (
      <span role="img" aria-label="Not included" className="inline-flex size-[24px] items-center justify-center rounded-full bg-bg-subtle text-text-tertiary">
        <Icon icon={MinusSignIcon} size={14} />
      </span>
    );
  const text = typeof value === "number" ? n(value) : value;
  return chip ? <CreditChip value={value as number} /> : <span className={cn(T.meta, "text-text-primary")}>{text}</span>;
}

function ComparePlans({ cycle, offer }: { cycle: BillingCycle; offer: boolean }) {
  const [open, setOpen] = React.useState<Set<string>>(() => new Set([COMPARE[0].group]));
  const toggle = (g: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  return (
    <section aria-label="Compare plans" className="flex flex-col gap-6 pb-8">
      {offer && (
        <p className={cn(T.meta, "flex items-center gap-4")}>
          <OfferSticker size="sm" /> Welcome offer prices, your first month or year
        </p>
      )}
      <div className="sticky top-0 z-10 grid grid-cols-4 rounded-xl bg-bg-subtle p-2 text-center">
        {PLANS.map((p) => {
          const per = priceOf(p.tier, p.monthly > 0 ? cycle : "monthly").perMonth;
          const offered = offer && p.monthly > 0;
          return (
            <span key={p.tier} className="flex min-w-0 flex-col py-2">
              <span className={cn(T.rowTitle, "truncate")}>{p.tier === "free" ? "Free" : p.name}</span>
              <span className={cn(T.micro, "tabular-nums", offered && "text-text-success")}>
                {dollars(offered ? offerPrice(per).final : per)}/mo
                {offered && <span className="sr-only"> with the welcome offer, then {dollars(per)}</span>}
              </span>
            </span>
          );
        })}
      </div>
      {COMPARE.map((g) => {
        const on = open.has(g.group);
        const id = `cmp-${g.group.replace(/\W+/g, "-")}`;
        return (
          <div key={g.group} className={CARD}>
            <h3>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={id}
                onClick={() => toggle(g.group)}
                className={cn(T.section, "flex min-h-[56px] w-full items-center justify-between gap-4 px-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                {g.group.charAt(0).toUpperCase() + g.group.slice(1)}
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={20} />
                </span>
              </button>
            </h3>
            {on && (
              <dl id={id} className={cn(HAIRLINE, "flex flex-col divide-y divide-border border-t-[length:var(--border-width-1)]")}>
                {g.rows.map((r) => (
                  <div key={r.label} className="flex flex-col gap-4 px-8 py-6">
                    <dt className={T.body}>{r.label}</dt>
                    <dd className="grid grid-cols-4 items-center justify-items-center gap-2 text-center">
                      {r.values.map((v, i) => (
                        <span key={PLANS[i].tier} className="flex min-w-0 flex-col items-center">
                          <span className="sr-only">{PLANS[i].name}: </span>
                          <CellValue value={v} chip={r.chip} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ── Pricing FAQs ───────────────────────────────────────────────────────

/** The web's Pricing FAQs: its four groups (General and each plan) as one list, each question numbered in its group. */
function PricingFaqs() {
  const [open, setOpen] = React.useState<string | null>(`general:${FAQ.general[0].q}`);
  const [votes, setVotes] = React.useState<Record<string, "up" | "down">>({});

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HELPFUL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
      if (raw) setVotes(JSON.parse(raw) as Record<string, "up" | "down">);
    } catch {}
  }, []);

  const vote = (q: string, v: "up" | "down") =>
    setVotes((prev) => {
      const next = { ...prev, [q]: v };
      try {
        window.localStorage.setItem(HELPFUL_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  return (
    <div className="flex flex-col gap-10 pb-8">
      {FAQ_TABS.map((t) => (
        <section key={t.id} aria-labelledby={`plans-faq-${t.id}`} className="flex flex-col gap-4">
          <h3 id={`plans-faq-${t.id}`} className={T.section}>
            {t.label}
          </h3>
          <FaqList
            numbered
            items={FAQ[t.id].map((f) => ({ id: `${t.id}:${f.q}`, q: f.q, a: f.a }))}
            open={open}
            onToggle={(id) => setOpen(open === id ? null : id)}
            extra={(f) => {
              const q = f.id.slice(t.id.length + 1);
              return votes[q] ? (
                <p role="status" className={cn(T.caption, "inline-flex items-center gap-2 rounded-full bg-bg-subtle px-6 py-3")}>
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                  Thanks for telling us.
                </p>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-bg-subtle py-1 pl-6 pr-1">
                  <span className={T.caption}>Was this helpful?</span>
                  {(["down", "up"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-label={v === "up" ? "Yes, it helped" : "No, it didn't help"}
                      onClick={() => vote(q, v)}
                      className="inline-flex size-[44px] items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-focus active:bg-bg-surface"
                    >
                      <Icon icon={v === "up" ? ThumbsUpIcon : ThumbsDownIcon} size={16} />
                    </button>
                  ))}
                </div>
              );
            }}
          />
        </section>
      ))}
    </div>
  );
}
