"use client";

// Available plan — the Plans tab of Plan & pricing, laid out as User Panel V2
// draws it ("Pricing FAQs | General | Monthly" 41551:109175, "Monthly V3"
// 41549:166935), in the design system's parts:
//
// - "Choose a plan", centred, over Monthly | Annual (save 20%).
// - The three paid plans as cards (Builder raised: brand border and fill,
//   Most popular), each with its price, its button, "Everything in <the plan
//   below>", and what it gives — AI credits first, as a chip.
// - Free as one wide card under them.
// - Compare plans: every row, with each plan's price and button in the head.
// - Pricing FAQs: General and one tab per plan, each answer asking whether it
//   helped.
//
// A button says how the plan stands to yours: Current plan · Upgrade (to the
// checkout page) · Switch to annual · Downgrade (a dialog, from the period's
// end) · Starts on <date>. Free under a paid plan opens Cancel subscription.
// No plan blocks a mint, a listing or a purchase: plans set amounts only.
// Downgrade and Cancel subscription show what the smaller plan allows against
// what you have (projects, contributors) and say that nothing is removed.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  MinusSignCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useMe } from "@/components/dashboard/sidebar-account";
import { Avatar, Badge, Banner, Button, ModalFrame, ProgressBar, Segmented } from "@/components/ideeza";
import { checkoutHref } from "@/lib/create/checkout-route";
import { discountFor, usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { useManualProjects } from "@/lib/manual/projects";
import {
  HIGH_VIDEO_TIER,
  PLANS,
  YEARLY_OFF,
  lossesOf,
  planOf,
  priceOf,
  relationOf,
  type Plan,
  type PlanTier,
} from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { PLAN_CARDS } from "./pricing-frame";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pct = (d: number) => `${Math.round(d * 100)}%`;
const n = (v: number) => v.toLocaleString("en-US");
/** "$10", "$6.40": whole dollars without cents, as the cards print them. */
const price = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));

const PAID = PLANS.filter((p) => p.monthly > 0);
const FREE = planOf("free");

type Dialog = { kind: "downgrade"; tier: PlanTier; cycle: BillingCycle } | { kind: "cancel" } | null;

export function PlansPanel() {
  const router = useRouter();
  const { hydrated, sub } = useCreatePlan();
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [synced, setSynced] = React.useState(false);

  // Open on the cycle you pay by, once the plan is read.
  if (hydrated && !synced) {
    setSynced(true);
    if (sub.tier !== "free") setCycle(sub.cycle);
  }

  const act = (p: Plan, c: BillingCycle) => {
    const rel = relationOf(sub, p.tier, c);
    if (rel === "upgrade") router.push(checkoutHref({ kind: "plan", tier: p.tier, cycle: c }));
    else if (rel === "downgrade") setDialog(p.tier === "free" ? { kind: "cancel" } : { kind: "downgrade", tier: p.tier, cycle: c });
  };

  return (
    <div className="flex flex-col gap-[56px]">
      <section aria-labelledby="choose-plan" className="flex flex-col items-center gap-[32px]">
        <div className="flex flex-col items-center gap-[12px] text-center">
          <h2 id="choose-plan" className="text-5xl font-semibold leading-5xl text-text-primary">
            Choose a plan
          </h2>
          <p className="max-w-[62ch] text-lg leading-lg text-text-secondary">
            Break creative boundaries with flexible plans made just for you.
          </p>
        </div>
        <Segmented
          label="Billing"
          className="self-center"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly plan" },
            {
              value: "yearly",
              label: (
                <>
                  Annual plan <span className="text-text-success">(Save {pct(YEARLY_OFF)})</span>
                </>
              ),
            },
          ]}
        />

        <ul role="list" className={cn(PLAN_CARDS, "w-full")}>
          {PAID.map((p, i) => (
            <PlanCard
              key={p.tier}
              plan={p}
              below={i === 0 ? FREE : PAID[i - 1]}
              cycle={cycle}
              hydrated={hydrated}
              onAct={() => act(p, cycle)}
            />
          ))}
        </ul>
        <FreeCard hydrated={hydrated} onAct={() => act(FREE, "monthly")} />
      </section>

      <CompareTable cycle={cycle} hydrated={hydrated} onAct={act} />

      <Faq />

      {dialog?.kind === "downgrade" && (
        <DowngradeDialog tier={dialog.tier} cycle={dialog.cycle} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "cancel" && <CancelDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

/** The button a plan gets: its label, its look, and whether it does anything. */
function useCta(p: Plan, cycle: BillingCycle, hydrated: boolean) {
  const { sub } = useCreatePlan();
  const rel = hydrated ? relationOf(sub, p.tier, cycle) : "current";
  const sameTier = sub.tier === p.tier;
  const label =
    rel === "current"
      ? "Current plan"
      : rel === "scheduled"
        ? `Starts on ${sub.renewsAt ? date(sub.renewsAt) : "renewal"}`
        : rel === "upgrade"
          ? sameTier
            ? "Switch to annual"
            : "Upgrade"
          : sameTier
            ? "Switch to monthly"
            : p.tier === "free"
              ? "Switch to Free"
              : "Downgrade";
  const hierarchy: "primary" | "tonal" | "secondary" = rel === "upgrade" ? (p.popular ? "primary" : "tonal") : "secondary";
  const enabled = hydrated && (rel === "upgrade" || rel === "downgrade");
  return { rel, label, hierarchy, enabled };
}

/** "$10/ month" or "$8/ mo, billed yearly". */
function PriceLine({ plan: p, cycle, big = true }: { plan: Plan; cycle: BillingCycle; big?: boolean }) {
  const per = priceOf(p.tier, cycle).perMonth;
  return (
    <p className="flex flex-wrap items-baseline gap-x-[6px]">
      <span className={cn("font-bold tabular-nums text-text-primary", big ? "text-5xl leading-5xl" : "text-3xl leading-3xl")}>
        {price(per)}/
      </span>
      <span className="text-lg leading-lg text-text-secondary">{p.monthly > 0 && cycle === "yearly" ? "mo, billed yearly" : "month"}</span>
    </p>
  );
}

/** What a plan gives, as the card lists it: AI credits first, as a chip. */
function Features({ plan: p, className }: { plan: Plan; className?: string }) {
  const discount = discountFor(p.tier, "monthly");
  const rows = [
    p.queue.replace(/, peak waits possible$/, " (peak waits possible)").replace(/, shortest waits$/, " (shortest waits)"),
    `${n(p.projects)} ${p.projects === 1 ? "project" : "projects"} • ${n(p.exports)} exports`,
    `${p.contributors === 0 ? "No contributors" : `${n(p.contributors)} ${p.contributors === 1 ? "contributor" : "contributors"}`} • Mint, list and buy`,
    ...(discount > 0 ? [`${pct(discount)} off AI credits (${pct(discountFor(p.tier, "yearly"))} yearly)`] : []),
    ...(p.tier === HIGH_VIDEO_TIER ? ["720p AI video"] : []),
  ];
  return (
    <ul role="list" className={cn("flex flex-col gap-[16px] text-lg leading-lg text-text-secondary", className)}>
      <li className="flex items-center gap-[12px]">
        <span aria-hidden className="shrink-0 text-text-brand">
          <Icon icon={AiMagicIcon} size={20} />
        </span>
        <span>
          AI credits: <CreditChip value={p.credits} /> / month
        </span>
      </li>
      {rows.map((r) => (
        <li key={r} className="flex items-center gap-[12px]">
          <span aria-hidden className="shrink-0 text-text-brand">
            <Icon icon={CheckmarkCircle02Icon} size={20} />
          </span>
          {r}
        </li>
      ))}
    </ul>
  );
}

function CreditChip({ value }: { value: number }) {
  return (
    <span className="mx-[4px] inline-flex rounded-md bg-bg-brand-subtle px-[8px] font-semibold tabular-nums text-text-brand">
      {n(value)}
    </span>
  );
}

function PlanCard({
  plan: p,
  below,
  cycle,
  hydrated,
  onAct,
}: {
  plan: Plan;
  below: Plan;
  cycle: BillingCycle;
  hydrated: boolean;
  onAct: () => void;
}) {
  const cta = useCta(p, cycle, hydrated);
  return (
    <li
      className={cn(
        "relative flex flex-col gap-[24px] rounded-2xl border border-solid p-[24px]",
        p.popular
          ? "border-border-brand bg-[linear-gradient(180deg,var(--color-bg-brand-subtle),var(--color-bg-surface)_60%)]"
          : "border-border bg-bg-surface",
      )}
    >
      {p.popular && (
        <Badge tone="brand-solid" className="absolute right-[24px] top-[24px]">
          Most popular
        </Badge>
      )}
      <div className="flex flex-col gap-[12px] pt-[24px]">
        <h3 className="text-3xl font-semibold leading-3xl text-text-primary">{p.name}</h3>
        <PriceLine plan={p} cycle={cycle} />
        <p className="text-lg leading-lg text-text-secondary">{p.tagline}</p>
      </div>
      <Button hierarchy={cta.hierarchy} size="lg" className="w-full" disabled={!cta.enabled} onClick={onAct}>
        {cta.label}
      </Button>
      <div className="flex flex-col gap-[16px]">
        <p className="text-lg leading-lg text-text-tertiary">Everything in {below.name}</p>
        <Features plan={p} />
      </div>
    </li>
  );
}

function FreeCard({ hydrated, onAct }: { hydrated: boolean; onAct: () => void }) {
  const cta = useCta(FREE, "monthly", hydrated);
  return (
    <section
      aria-labelledby="free-plan"
      className="grid w-full grid-cols-1 items-center gap-[20px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px] [@container(min-width:1024px)]:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_auto] [@container(min-width:1024px)]:gap-[32px]"
    >
      <div className="flex flex-col gap-[8px]">
        <h3 id="free-plan" className="text-2xl font-semibold leading-2xl text-text-primary">
          Free plan
        </h3>
        <PriceLine plan={FREE} cycle="monthly" big={false} />
        <p className="text-lg leading-lg text-text-secondary">{FREE.tagline}</p>
      </div>
      <Features plan={FREE} className="grid grid-cols-2 gap-x-[24px] max-md:grid-cols-1" />
      <Button hierarchy="secondary" size="lg" disabled={!cta.enabled} onClick={onAct} className="min-w-[200px]">
        {cta.label}
      </Button>
    </section>
  );
}

// ── Compare plans ─────────────────────────────────────────────────────

type Cell = string | number | boolean;
type Row = { label: string; values: Cell[]; chip?: boolean };

// The rows that mean something in the app today, grouped as the design groups
// them. "Mint, list and buy" says it isn't a plan's to give.
const COMPARE: { group: string; rows: Row[] }[] = [
  {
    group: "AI & resources",
    rows: [
      { label: "AI credits / month", values: PLANS.map((p) => p.credits), chip: true },
      { label: "AI queue", values: ["Basic queue", "Standard queue", "Priority queue", "Fast-track queue"] },
      { label: "AI credit discount", values: [false, false, "15% · 25% yearly", "25% · 35% yearly"] },
      { label: "Help & support", values: ["Community", "Standard", "Priority", "Priority"] },
    ],
  },
  {
    group: "Projects & products",
    rows: [
      { label: "Projects", values: PLANS.map((p) => p.projects) },
      { label: "Public and private components", values: [false, 5, 20, "Unlimited"] },
      { label: "Exports / month", values: PLANS.map((p) => p.exports) },
      { label: "Contributors", values: PLANS.map((p) => p.contributors || false) },
    ],
  },
  {
    group: "AI video generation",
    rows: [
      { label: "AI video quality", values: PLANS.map((p) => (p.tier === HIGH_VIDEO_TIER ? "720p" : "480p")) },
      { label: "AI video length", values: ["10 sec", "10 sec", "10 sec", "10 sec"] },
      { label: "Video with IDEEZA AR", values: [false, false, false, true] },
    ],
  },
  {
    group: "Marketplace & commerce",
    rows: [
      { label: "Mint, list and buy", values: [true, true, true, true] },
      { label: "Hire a freelancer or a manufacturer", values: [false, false, true, true] },
    ],
  },
  {
    group: "Enterprise & network",
    rows: [
      { label: "Network", values: [true, true, true, true] },
      { label: "APK generator", values: [false, false, false, true] },
    ],
  },
];

function CellValue({ value, chip }: { value: Cell; chip?: boolean }) {
  if (value === true)
    return (
      <span className="inline-flex text-text-brand">
        <Icon icon={CheckmarkCircle02Icon} size={20} aria-hidden={false} aria-label="Included" />
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex text-text-disabled">
        <Icon icon={MinusSignCircleIcon} size={20} aria-hidden={false} aria-label="Not included" />
      </span>
    );
  if (chip && typeof value === "number") return <CreditChip value={value} />;
  return <>{typeof value === "number" ? n(value) : value}</>;
}

function CompareTable({
  cycle,
  hydrated,
  onAct,
}: {
  cycle: BillingCycle;
  hydrated: boolean;
  onAct: (p: Plan, c: BillingCycle) => void;
}) {
  return (
    <section aria-labelledby="compare-plans" className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left text-md leading-md">
        <caption className="sr-only">Plans compared, feature by feature</caption>
        <thead>
          <tr className="align-top">
            <th scope="col" className="w-[30%] pb-[20px] pr-[16px] font-regular">
              <h2 id="compare-plans" className="text-3xl font-semibold leading-3xl text-text-primary">
                Compare plans
              </h2>
              <p className="mt-[8px] text-xl font-semibold leading-xl text-text-secondary">Features</p>
            </th>
            {PLANS.map((p) => (
              <th key={p.tier} scope="col" className="px-[8px] pb-[20px] text-center font-regular">
                <CompareHead plan={p} cycle={cycle} hydrated={hydrated} onAct={() => onAct(p, p.tier === "free" ? "monthly" : cycle)} />
              </th>
            ))}
          </tr>
        </thead>
        {COMPARE.map((g) => (
          <tbody key={g.group}>
            <tr className="border-t border-solid border-border">
              <th colSpan={5} scope="colgroup" className="pb-[8px] pt-[20px] text-lg font-semibold leading-lg text-text-primary">
                {g.group}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="even:bg-bg-subtle">
                <th scope="row" className="py-[12px] pl-[8px] pr-[16px] font-regular text-text-secondary">
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className="px-[8px] py-[12px] text-center tabular-nums text-text-primary">
                    <CellValue value={v} chip={r.chip} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  );
}

function CompareHead({ plan: p, cycle, hydrated, onAct }: { plan: Plan; cycle: BillingCycle; hydrated: boolean; onAct: () => void }) {
  const c = p.tier === "free" ? "monthly" : cycle;
  const cta = useCta(p, c, hydrated);
  const per = priceOf(p.tier, c).perMonth;
  return (
    <div className="flex flex-col items-center gap-[8px]">
      <span className="text-lg font-semibold leading-lg text-text-primary">{p.name}</span>
      <span className="text-md leading-md text-text-secondary">
        {p.monthly === 0 ? "$0" : `${price(per)} mo${c === "yearly" ? ", billed yearly" : ""}`}
      </span>
      {cta.rel === "current" ? (
        <span className="inline-flex h-[40px] items-center text-md font-semibold leading-md text-text-tertiary">Current plan</span>
      ) : (
        <Button hierarchy={cta.hierarchy} size="md" className="w-full max-w-[160px]" disabled={!cta.enabled} onClick={onAct}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}

// ── Pricing FAQs ──────────────────────────────────────────────────────

type FaqTab = "general" | "tinkerer" | "builder" | "disruptor";
const FAQ_TABS: { id: FaqTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "tinkerer", label: "Tinkerer plan" },
  { id: "builder", label: "Builder plan" },
  { id: "disruptor", label: "Disruptor plan" },
];

const FAQ: Record<FaqTab, { q: string; a: string }[]> = {
  general: [
    {
      q: "Is IDEEZA priced on usage or a subscription?",
      a: "Both, kept simple. A plan adds AI credits every month and sets how many projects, exports and contributors you have. AI work spends credits, and you can buy more credits any time.",
    },
    { q: "What does a credit pay for?", a: "AI work. A concept render (a first draft, a refine or a regenerate) uses 1 credit, and a build uses 4 for each product in it." },
    {
      q: "What happens to my credits each month?",
      a: "Your plan adds its credits at the start of each monthly period, and they last until the period ends. Credits you buy last 12 months. The credits that expire first are spent first.",
    },
    {
      q: "Can I change or cancel my plan?",
      a: "Yes. An upgrade starts now, and you pay only the difference for the rest of the period. A smaller plan, monthly billing or a cancel starts when your period ends. Nothing you made is deleted.",
    },
    { q: "Do I need a paid plan to mint, list or buy?", a: "No. Every plan, Free included, can mint, list and buy on the marketplace." },
    {
      q: "How do I pay?",
      a: "Payments aren't on yet. In this demo you pay with test USDT or IDZ from the demo wallet, on testnet, and no real money moves. Card and PayPal come later.",
    },
  ],
  tinkerer: [
    { q: "What's in the Tinkerer plan?", a: "50 AI credits a month, the standard queue, 5 projects, 5 exports a month and 1 contributor, for $8 a month or $6.40 a month billed yearly." },
    { q: "Do I get a credit discount on Tinkerer?", a: "No. The credit discount comes with Builder (15%, or 25% yearly) and Disruptor (25%, or 35% yearly)." },
  ],
  builder: [
    {
      q: "What makes the Builder plan right for makers?",
      a: "300 AI credits a month, the priority queue, 20 projects, 50 exports a month and 20 contributors, so you can prototype, build and sell with a team.",
    },
    { q: "How much do I save on credits with Builder?", a: "15% on every credit you buy, or 25% when you pay yearly." },
  ],
  disruptor: [
    {
      q: "What's the biggest advantage of the Disruptor plan?",
      a: "1,200 AI credits a month, the fast-track queue with the shortest waits, 200 projects, 720p AI video, and 25% off credits (35% yearly).",
    },
    { q: "Can I make 720p videos on other plans?", a: "No. Other plans make 480p videos; 720p comes with Disruptor." },
  ],
};

const HELPFUL_KEY = "ideeza:pricing:faq-helpful";

function Faq() {
  const [tab, setTab] = React.useState<FaqTab>("general");
  const [open, setOpen] = React.useState<string | null>(FAQ.general[0].q);
  const [votes, setVotes] = React.useState<Record<string, "up" | "down">>({});

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HELPFUL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
      if (raw) setVotes(JSON.parse(raw) as Record<string, "up" | "down">);
    } catch {}
  }, []);

  const vote = (q: string, v: "up" | "down") => {
    setVotes((prev) => {
      const next = { ...prev, [q]: v };
      try {
        window.localStorage.setItem(HELPFUL_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const ids = FAQ_TABS.map((t) => t.id);
  return (
    <section
      aria-labelledby="plans-faq"
      className="flex flex-col items-center gap-[24px] rounded-2xl bg-bg-subtle px-[24px] py-[48px] max-md:px-[12px] max-md:py-[32px]"
    >
      <h2 id="plans-faq" className="text-4xl font-semibold leading-4xl text-text-primary">
        Pricing FAQs
      </h2>
      <div
        role="tablist"
        aria-label="Questions about"
        onKeyDown={(e) => {
          const at = ids.indexOf(tab);
          const next = e.key === "ArrowRight" ? at + 1 : e.key === "ArrowLeft" ? at - 1 : null;
          if (next === null) return;
          e.preventDefault();
          const id = ids[(next + ids.length) % ids.length];
          setTab(id);
          setOpen(FAQ[id][0]?.q ?? null);
          (e.currentTarget.querySelector(`[data-faq="${id}"]`) as HTMLElement | null)?.focus();
        }}
        className="flex flex-wrap justify-center gap-[8px]"
      >
        {FAQ_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              data-faq={t.id}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => {
                setTab(t.id);
                setOpen(FAQ[t.id][0]?.q ?? null);
              }}
              className={cn(
                "inline-flex h-[44px] items-center rounded-lg px-[20px] text-md font-semibold leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "bg-bg-brand-subtle text-text-brand" : "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <ul role="list" className="flex w-full max-w-[880px] flex-col gap-[12px]">
        {FAQ[tab].map((f, i) => {
          const on = open === f.q;
          const id = `faq-${tab}-${i}`;
          return (
            <li key={f.q} className="rounded-xl bg-bg-surface">
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={id}
                  onClick={() => setOpen(on ? null : f.q)}
                  className="flex w-full items-center justify-between gap-[12px] rounded-xl px-[20px] py-[16px] text-left text-lg font-semibold leading-lg text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
                >
                  {f.q}
                  <span aria-hidden className="shrink-0 text-text-tertiary">
                    <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={20} />
                  </span>
                </button>
              </h3>
              {on && (
                <div id={id} className="flex flex-col items-start gap-[16px] px-[20px] pb-[20px]">
                  <p className="max-w-[80ch] text-md leading-md text-text-secondary">{f.a}</p>
                  <Helpful vote={votes[f.q]} onVote={(v) => vote(f.q, v)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Helpful({ vote, onVote }: { vote: "up" | "down" | undefined; onVote: (v: "up" | "down") => void }) {
  if (vote)
    return (
      <p role="status" className="rounded-full bg-bg-subtle px-[12px] py-[6px] text-sm leading-sm text-text-secondary">
        Thanks for telling us.
      </p>
    );
  return (
    <div className="flex items-center gap-[4px] rounded-full bg-bg-subtle py-[2px] pl-[12px] pr-[4px]">
      <span className="text-sm leading-sm text-text-secondary">Was this helpful?</span>
      {(["down", "up"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-label={v === "up" ? "Yes, it helped" : "No, it didn't help"}
          onClick={() => onVote(v)}
          className="inline-flex size-[32px] items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
        >
          <Icon icon={v === "up" ? ThumbsUpIcon : ThumbsDownIcon} size={16} />
        </button>
      ))}
    </div>
  );
}

// ── Downgrade and cancel ──────────────────────────────────────────────

/** What you use against a plan's amounts: your projects, and the most
 *  contributors on any one of them. */
export function usePlanUsage(): { projects: number; mostContributors: number } {
  const { projects } = useManualProjects();
  return {
    projects: projects.length,
    mostContributors: projects.reduce((m, p) => Math.max(m, p.contributors?.length ?? 0), 0),
  };
}

/** Used against an amount, as a bar and "3/5 created"; past the amount in the error ink. */
export function Meter({ used, amount, verb, label }: { used: number; amount: number; verb: string; label: string }) {
  const over = used > amount;
  return (
    <span className="flex items-center gap-[10px]">
      <ProgressBar value={(used / amount) * 100} label={`${label}: ${used} of ${amount} ${verb}`} className="w-[120px]" />
      <span className={cn("min-w-[88px] text-sm leading-sm tabular-nums", over ? "text-text-error" : "text-text-secondary")}>
        {n(used)}/{n(amount)} {verb}
      </span>
    </span>
  );
}

/** The downgrade preview: what `to` allows against what you have. Plans set
 *  amounts and enforce none of them, so it says plainly that nothing goes. */
function UsagePreview({ to }: { to: Plan }) {
  const usage = usePlanUsage();
  const rows = [
    {
      label: "Projects",
      line: `You have ${n(usage.projects)}. ${to.name} allows ${n(to.projects)}.`,
      used: usage.projects,
      amount: to.projects,
      verb: "created",
    },
    {
      label: "Contributors",
      line: `Up to ${n(usage.mostContributors)} on one project. ${to.name} allows ${
        to.contributors === 0 ? "none" : n(to.contributors)
      }.`,
      used: usage.mostContributors,
      amount: to.contributors,
      verb: "added",
    },
  ];
  return (
    <section aria-label={`What you have against ${to.name}`} className="flex flex-col gap-[12px]">
      <ul role="list" className="flex flex-col gap-[12px]">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[6px]">
            <span className="flex min-w-0 flex-col">
              <span className="text-md font-semibold leading-md text-text-primary">{r.label}</span>
              <span className="text-md leading-md text-text-secondary">{r.line}</span>
            </span>
            {r.amount > 0 && <Meter used={r.used} amount={r.amount} verb={r.verb} label={r.label} />}
          </li>
        ))}
      </ul>
      <p className="text-md leading-md text-text-primary">
        Nothing is removed. Every project and contributor you have stays as it is.
      </p>
    </section>
  );
}

/** What gets smaller after a switch or a cancel, ticked off as the design lists benefits. */
function Losses({ from, to }: { from: Plan; to: Plan }) {
  const losses = lossesOf(from, to);
  if (losses.length === 0) return null;
  return (
    <ul role="list" className="flex flex-col gap-[10px] text-md leading-md text-text-primary">
      {losses.map((l) => (
        <li key={l} className="flex items-start gap-[10px]">
          <span aria-hidden className="mt-[2px] shrink-0 text-text-brand">
            <Icon icon={CheckmarkCircle02Icon} size={18} />
          </span>
          {l}
        </li>
      ))}
    </ul>
  );
}

/** A smaller plan or monthly billing (User Panel V2 "Downgrade" 41549:158483): nothing is paid now. */
export function DowngradeDialog({ tier, cycle, onClose }: { tier: PlanTier; cycle: BillingCycle; onClose: () => void }) {
  const { sub, plan: current, schedule } = useCreatePlan();
  const target = planOf(tier);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const when = sub.renewsAt ? date(sub.renewsAt) : "";
  const sameTier = sub.tier === tier;
  const per = priceOf(tier, cycle);
  return (
    <ModalFrame
      open
      onClose={onClose}
      title={sameTier ? "Switch to monthly billing" : `Downgrade to ${target.name}`}
      description={`You keep ${current.name} until ${when}. Nothing is charged now, and nothing you made is deleted.`}
      size="lg"
      initialFocus={keepRef}
    >
      <div className="flex flex-col gap-[24px]">
        <Banner tone="attention">The limits below apply from {when}, when your current period ends.</Banner>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,400px)] gap-[32px] max-md:grid-cols-1">
          <section aria-labelledby="dg-changes" className="flex flex-col gap-[16px]">
            <h3 id="dg-changes" className="text-xl font-semibold leading-xl text-text-primary">
              What changes
            </h3>
            {lossesOf(current, target).length > 0 ? (
              <Losses from={current} to={target} />
            ) : (
              <p className="text-md leading-md text-text-secondary">Only how you&apos;re billed: monthly instead of yearly.</p>
            )}
            {!sameTier && <UsagePreview to={target} />}
          </section>
          <section aria-labelledby="dg-billing" className="flex flex-col gap-[16px]">
            <h3 id="dg-billing" className="text-xl font-semibold leading-xl text-text-primary">
              Billing option
            </h3>
            <div className="flex flex-col gap-[4px] rounded-xl bg-bg-subtle p-[16px]">
              <p className="text-lg font-semibold leading-lg text-text-primary">{cycle === "yearly" ? "Pay annually" : "Pay monthly"}</p>
              <p className="text-md leading-md text-text-secondary">
                {usd(per.perMonth)} / month{cycle === "yearly" ? `, ${usd(per.period)} a year` : ""}
              </p>
            </div>
            <dl className="flex flex-col gap-[10px] text-md leading-md">
              <div className="flex justify-between gap-[12px]">
                <dt className="text-text-secondary">{target.name} plan</dt>
                <dd className="tabular-nums text-text-primary">{usd(per.period)}</dd>
              </div>
              <div className="flex justify-between gap-[12px]">
                <dt className="text-text-secondary">Starts on</dt>
                <dd className="text-text-primary">{when}</dd>
              </div>
              <div className="flex justify-between gap-[12px] border-t border-solid border-border pt-[10px] font-semibold">
                <dt className="text-text-primary">Due today</dt>
                <dd className="tabular-nums text-text-primary">{usd(0)}</dd>
              </div>
            </dl>
            <Button
              hierarchy="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                schedule(tier, cycle);
                onClose();
              }}
            >
              {sameTier ? "Switch to monthly" : `Downgrade to ${target.name}`}
            </Button>
            <Button ref={keepRef} hierarchy="secondary" size="lg" className="w-full" onClick={onClose}>
              Keep {current.name}
            </Button>
          </section>
        </div>
      </div>
    </ModalFrame>
  );
}

/** The smallest paid plan, offered before a cancel from a bigger one. */
const SMALLEST_PAID: PlanTier = "tinkerer";

/** Cancel subscription (User Panel V2 41549:164558): what you lose, a smaller plan instead, or cancel. */
export function CancelDialog({ onClose }: { onClose: () => void }) {
  const { sub, plan: current, cancel, schedule } = useCreatePlan();
  const me = useMe();
  const firstRef = React.useRef<HTMLButtonElement>(null);
  const when = sub.renewsAt ? date(sub.renewsAt) : "";
  const smaller = planOf(SMALLEST_PAID);
  const offerSmaller = current.monthly > smaller.monthly;
  return (
    <ModalFrame open onClose={onClose} title="Cancel subscription" size="md" initialFocus={firstRef}>
      <div className="grid grid-cols-2 items-center gap-[32px] max-md:grid-cols-1">
        <div className="flex flex-col items-center gap-[12px] text-center">
          <p className="text-3xl font-semibold leading-3xl text-text-primary">Back to Free?</p>
          <p className="max-w-[36ch] text-lg leading-lg text-text-secondary">
            Your IDEEZA plan won&apos;t be the same. Credits you bought stay until they expire, and nothing you made is deleted.
          </p>
          <span className="mt-[8px] inline-flex items-center gap-[10px] rounded-xl border border-solid border-border bg-bg-subtle px-[16px] py-[10px] text-md leading-md text-text-primary">
            <Avatar initials={me.initials} src={me.photo} size="sm" />
            {me.name} · {current.name} plan
          </span>
        </div>
        <div className="flex flex-col gap-[16px] rounded-xl bg-bg-subtle p-[20px]">
          <p className="text-lg leading-lg text-text-primary">Your subscription stays active until {when}. After that you lose:</p>
          <Losses from={current} to={planOf("free")} />
          <UsagePreview to={planOf("free")} />
          <div className="mt-[8px] flex flex-col gap-[8px]">
            {offerSmaller ? (
              <Button
                ref={firstRef}
                hierarchy="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  schedule(SMALLEST_PAID, "monthly");
                  onClose();
                }}
              >
                Downgrade to {smaller.name} instead
              </Button>
            ) : (
              <Button ref={firstRef} hierarchy="primary" size="lg" className="w-full" onClick={onClose}>
                Keep {current.name}
              </Button>
            )}
            <Button
              hierarchy="danger"
              size="lg"
              className="w-full"
              onClick={() => {
                cancel();
                onClose();
              }}
            >
              Cancel subscription
            </Button>
          </div>
          {offerSmaller && (
            <p className="text-sm leading-sm text-text-secondary">
              {smaller.name} is {usd(smaller.monthly)} a month with {n(smaller.credits)} AI credits, from {when}.
            </p>
          )}
        </div>
      </div>
    </ModalFrame>
  );
}
