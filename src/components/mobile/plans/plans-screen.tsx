"use client";

// Plan & pricing on the phone (/m/plans; mobile Figma "Monthly plan",
// "Yearly plan", "AI Credits", "Billing History"): the Plans · Credits ·
// Billing tabs (`?tab=`, client state — a tap never navigates, so they work
// offline). The plans, prices, relations and words are the web's
// (lib/create/plans.ts, components/credits/plans-panel.tsx): Free, Tinkerer,
// Builder, Disruptor; an upgrade goes to the checkout, a smaller plan to
// Downgrade, Free to Cancel subscription; the compare table and the Pricing
// FAQs are the web's own rows. While the welcome offer runs, the web's offer
// band sits over the plans and every paid price is the offer's. The Figma's
// partner logos and website footer are the landing page's, not the app's,
// and aren't drawn here.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  FlashIcon,
  MinusSignIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { COMPARE, FAQ, FAQ_TABS, HELPFUL_KEY, type Cell, type FaqTab } from "@/components/credits/plans-panel";
import { OfferBanner, OfferSticker, useWelcomeOffer } from "@/components/credits/welcome-offer";
import { offerPrice } from "@/lib/account/welcome-offer";
import { discountFor, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { HIGH_VIDEO_TIER, PLANS, YEARLY_OFF, planOf, priceOf, relationOf, type Plan, type PlanTier, type Subscription } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { FaqList } from "../help/faq-list";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { BillingTab } from "./billing-tab";
import { CancelSheet } from "./cancel-sheet";
import { CreditsTab } from "./credits-tab";
import { CARD, HAIRLINE, PillSwitch, checkoutPath, dateOf, dollars, downgradePath, n, pct } from "./parts";

const PAID = PLANS.filter((p) => p.monthly > 0);
const FREE = planOf("free");
const TABS = ["plans", "credits", "billing"] as const;

export function PlansScreen() {
  const [tab, setTab] = useTabParam("tab", TABS, "plans");
  return (
    <Screen top={<TopBar back title="Plan & pricing" />} className="px-8 pb-12">
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
        <div {...tabPanelProps("plan", tab)} className="flex flex-col gap-12 outline-none">
          {tab === "plans" ? <PlansTab /> : tab === "credits" ? <CreditsTab /> : <BillingTab />}
        </div>
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

function PlansTab() {
  const router = useRouter();
  const { hydrated, sub } = useCreatePlan();
  const offer = useWelcomeOffer();
  const offerLive = offer.ready && offer.live;
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [synced, setSynced] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  // Open on the cycle you pay by, once the plan is read.
  if (hydrated && !synced) {
    setSynced(true);
    if (sub.tier !== "free") setCycle(sub.cycle);
  }

  const act = (p: Plan, c: BillingCycle) => {
    const rel = relationOf(sub, p.tier, c);
    if (rel === "upgrade") router.push(checkoutPath(p.tier, c));
    else if (rel === "downgrade") {
      if (p.tier === "free") setCancelling(true);
      else router.push(downgradePath(p.tier, c));
    }
  };

  return (
    <>
      <section aria-labelledby="choose-plan" className="flex flex-col gap-8">
        <OfferBanner />
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 id="choose-plan" className={T.hero}>
            Choose a plan
          </h2>
          <p className={T.meta}>Break creative boundaries with flexible plans made just for you.</p>
        </div>
        <PillSwitch
          label="Billing"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly plan" },
            {
              value: "yearly",
              label: (
                <>
                  Annual plan · <span className="text-text-success">Save {pct(YEARLY_OFF)}</span>
                </>
              ),
            },
          ]}
        />
        <ul className="flex flex-col gap-8">
          {PAID.map((p, i) => (
            <PlanCard key={p.tier} plan={p} below={i === 0 ? FREE : PAID[i - 1]} cycle={cycle} offer={offerLive} first={i === 0} onAct={() => act(p, cycle)} />
          ))}
          <PlanCard plan={FREE} cycle="monthly" offer={false} onAct={() => act(FREE, "monthly")} />
        </ul>
      </section>
      <ComparePlans cycle={cycle} offer={offerLive} />
      <PricingFaqs />
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </>
  );
}

function PlanCard({ plan: p, below, cycle, offer, first, onAct }: { plan: Plan; below?: Plan; cycle: BillingCycle; offer: boolean; first?: boolean; onAct: () => void }) {
  const { hydrated, sub } = useCreatePlan();
  const cta = ctaOf(sub, p.tier, cycle, hydrated);
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
  return (
    <li
      aria-label={`${p.name} plan`}
      className={cn(
        "flex flex-col gap-8 rounded-xl border-[length:var(--border-width-1)] border-solid p-8",
        p.popular ? "border-border-brand bg-[linear-gradient(180deg,var(--color-bg-brand-subtle),var(--color-bg-surface)_40%)]" : "border-border bg-bg-surface",
      )}
    >
      <div className={cn(HAIRLINE, "flex flex-col gap-3 border-b-[length:var(--border-width-1)] pb-8")}>
        <div className="flex items-center justify-between gap-4">
          <h3 className={cn(T.title, p.popular && "text-text-brand")}>{p.tier === "free" ? "Free plan" : p.name}</h3>
          {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
        </div>
        <p className={T.body}>{p.tagline}</p>
      </div>
      <div className={cn(HAIRLINE, "flex flex-col gap-3 border-b-[length:var(--border-width-1)] pb-8")}>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className={cn(T.display, "tabular-nums")}>{dollars(offered ? offerPrice(per).final : per)}/</span>
          <span className={T.body}>{p.monthly > 0 && cycle === "yearly" ? "mo, billed yearly" : "month"}</span>
          {first && <TestnetDemoBadge />}
        </p>
        {offered && (
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <OfferSticker size="sm" />
            <span className={cn(T.body, "tabular-nums text-text-tertiary line-through")}>{dollars(per)}</span>
            <span className={cn(T.rowTitle, "text-text-success")}>your {cycle === "yearly" ? "first year" : "first month"}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {below && <p className={T.rowTitle}>Everything in {below.tier === "free" ? "Free plan" : below.name}</p>}
        <ul className={cn(T.body, "flex flex-col gap-6 text-text-primary")}>
          <li className="flex items-center gap-5">
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={AiMagicIcon} size={16} />
            </span>
            <span>
              AI credits: <CreditChip value={p.credits} /> / month
            </span>
          </li>
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
      <Button hierarchy={cta.rel === "upgrade" && p.popular ? "primary" : "secondary"} size="xl" className="w-full" disabled={!cta.enabled} onClick={onAct}>
        {cta.label}
      </Button>
    </li>
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
    <section aria-labelledby="compare-plans" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <h2 id="compare-plans" className={T.title}>
          Compare plans
        </h2>
        {offer && <OfferSticker size="sm" />}
      </div>
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

const FAQ_TAB_IDS = FAQ_TABS.map((t) => t.id);

function PricingFaqs() {
  const [tab, setTab] = useTabParam<FaqTab>("faq", FAQ_TAB_IDS, "general");
  const [open, setOpen] = React.useState<string | null>(FAQ.general[0].q);
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
    <section aria-labelledby="plans-faq" className="flex flex-col gap-8">
      <h2 id="plans-faq" className={cn(T.title, "text-center")}>
        Pricing FAQs
      </h2>
      <MobileTabs
        label="Questions about"
        idBase="plans-faq"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setOpen(FAQ[t][0]?.q ?? null);
        }}
        tabs={FAQ_TABS.map((t) => ({ value: t.id, label: t.label }))}
      />
      <div {...tabPanelProps("plans-faq", tab)} className="outline-none">
        <FaqList
          numbered
          items={FAQ[tab].map((f) => ({ id: f.q, q: f.q, a: f.a }))}
          open={open}
          onToggle={(id) => setOpen(open === id ? null : id)}
          extra={(f) =>
            votes[f.id] ? (
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
                    onClick={() => vote(f.id, v)}
                    className="inline-flex size-[44px] items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={v === "up" ? ThumbsUpIcon : ThumbsDownIcon} size={16} />
                  </button>
                ))}
              </div>
            )
          }
        />
      </div>
    </section>
  );
}
