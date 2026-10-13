"use client";

// The Plans tab of Plan & pricing (User Panel V2, "Choose a Plan" 41551:109184,
// "Compare Plans" 41551:109392, checkout 40309:107743, downgrade 41549:158483,
// cancel 41549:164558). Its requirements, not its look:
//
// - Your plan sits above every tab (plan-pricing-page's banner, with its
//   details, Cancel and Keep); this tab is for choosing one.
// - Monthly | Annual (save 20%), four plans, each button named by how the plan
//   stands to yours: Your plan · Upgrade to X · Switch to X · Starts on <date>.
// - Upgrade opens the checkout: the price, the unused share of this period
//   taken off, and Pay — the Demo wallet on testnet, as Buy credits does.
// - Switch (a smaller plan, monthly) and Cancel wait for the period's end and
//   charge nothing; they say so, and list what gets smaller, before they're
//   confirmed. Cancel offers the smallest paid plan instead. Nothing is deleted.
// - Compare all features (the rows that differ), and five questions.
// No plan blocks a mint, a listing or a purchase: plans set amounts only.

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, ModalFrame, Segmented, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { useDefaultToken } from "@/lib/account/payment";
import { coinAmount, usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import {
  PLANS,
  YEARLY_OFF,
  featuresOf,
  lossesOf,
  planOf,
  priceOf,
  quoteUpgrade,
  relationOf,
  type Plan,
  type PlanTier,
} from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { PaymentPicker, type PayCoin } from "./payment-picker";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pct = (d: number) => `${Math.round(d * 100)}%`;
const n = (v: number) => v.toLocaleString("en-US");

type Dialog =
  | { kind: "upgrade"; tier: PlanTier; cycle: BillingCycle }
  | { kind: "switch"; tier: PlanTier; cycle: BillingCycle }
  | { kind: "cancel" }
  | null;

export function PlansPanel() {
  const { hydrated, sub, plan } = useCreatePlan();
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [compare, setCompare] = React.useState(false);
  const [synced, setSynced] = React.useState(false);

  // Open on the cycle you pay by, once the plan is read.
  if (hydrated && !synced) {
    setSynced(true);
    if (sub.tier !== "free") setCycle(sub.cycle);
  }

  return (
    <div className="flex flex-col gap-[28px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <div className="flex max-w-[62ch] flex-col gap-[4px]">
          <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Choose a plan</h2>
          <p className="text-md leading-md text-text-secondary">
            Every plan can mint, list and buy. Plans differ in AI credits, queue and how many projects you can keep.
          </p>
        </div>
        <Segmented
          label="Billing"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: `Annual, save ${pct(YEARLY_OFF)}` },
          ]}
        />
      </div>

      <ul role="list" className="grid grid-cols-4 gap-[16px] max-xl:grid-cols-2 max-md:grid-cols-1">
        {PLANS.map((p) => (
          <PlanCard
            key={p.tier}
            plan={p}
            cycle={cycle}
            hydrated={hydrated}
            onUpgrade={() => setDialog({ kind: "upgrade", tier: p.tier, cycle })}
            onSwitch={() =>
              p.tier === "free" ? setDialog({ kind: "cancel" }) : setDialog({ kind: "switch", tier: p.tier, cycle })
            }
          />
        ))}
      </ul>

      <section className="flex flex-col gap-[12px]">
        <button
          type="button"
          aria-expanded={compare}
          aria-controls="compare-plans"
          onClick={() => setCompare((v) => !v)}
          className="self-start text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {compare ? "Hide the feature comparison" : "Compare all features"}
        </button>
        {compare && <CompareTable current={plan.tier} />}
      </section>

      <Faq />

      {dialog?.kind === "upgrade" && (
        <UpgradeDialog tier={dialog.tier} cycle={dialog.cycle} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "switch" && (
        <SwitchDialog tier={dialog.tier} cycle={dialog.cycle} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "cancel" && <CancelDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function PlanCard({
  plan: p,
  cycle,
  hydrated,
  onUpgrade,
  onSwitch,
}: {
  plan: Plan;
  cycle: BillingCycle;
  hydrated: boolean;
  onUpgrade: () => void;
  onSwitch: () => void;
}) {
  const { sub } = useCreatePlan();
  const price = priceOf(p.tier, cycle);
  const rel = hydrated ? relationOf(sub, p.tier, cycle) : "current";
  const sameTier = sub.tier === p.tier;
  const label =
    rel === "current"
      ? "Your plan"
      : rel === "scheduled"
        ? `Starts on ${sub.renewsAt ? date(sub.renewsAt) : "renewal"}`
        : rel === "upgrade"
          ? sameTier
            ? "Switch to annual"
            : `Upgrade to ${p.name}`
          : sameTier
            ? "Switch to monthly"
            : `Switch to ${p.name}`;

  return (
    <li
      className={cn(
        "flex flex-col gap-[16px] rounded-xl border border-solid bg-bg-surface p-[20px]",
        p.popular ? "border-border-brand" : "border-border",
      )}
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center justify-between gap-[8px]">
          <h3 className="text-lg font-semibold leading-lg text-text-primary">{p.name}</h3>
          {p.popular && <Badge tone="brand">Most popular</Badge>}
        </div>
        <p className="flex items-baseline gap-[4px]">
          <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-primary">
            {p.monthly === 0 ? "$0" : usd(price.perMonth)}
          </span>
          <span className="text-md leading-md text-text-secondary">/ month</span>
        </p>
        <p className="text-sm leading-sm text-text-secondary">
          {p.monthly === 0 ? p.tagline : cycle === "yearly" ? `${usd(price.period)} billed yearly` : `Billed monthly · ${p.tagline}`}
        </p>
      </div>
      <Button
        hierarchy={rel === "upgrade" ? (p.popular ? "primary" : "secondary") : "secondary"}
        size="lg"
        className="w-full"
        disabled={!hydrated || rel === "current" || rel === "scheduled"}
        aria-haspopup={rel === "upgrade" || rel === "downgrade" ? "dialog" : undefined}
        onClick={rel === "upgrade" ? onUpgrade : onSwitch}
      >
        {label}
      </Button>
      <ul role="list" className="flex flex-col gap-[8px]">
        {featuresOf(p).map((f) => (
          <li key={f} className="flex items-start gap-[8px] text-md leading-md text-text-secondary">
            <span aria-hidden className="mt-[2px] shrink-0 text-text-brand">
              <Icon icon={CheckmarkCircle02Icon} size={16} />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </li>
  );
}

// The rows that differ between plans and mean something in the app today.
// "Mint, list and buy" is there to say it isn't a plan's to give.
const COMPARE: { group: string; rows: { label: string; values: [string, string, string, string] }[] }[] = [
  {
    group: "AI and resources",
    rows: [
      { label: "AI credits a month", values: ["10", "50", "300", "1,200"] },
      { label: "Credit discount", values: ["—", "—", "15% · 25% yearly", "25% · 35% yearly"] },
      { label: "AI queue", values: ["Basic", "Standard", "Priority", "Fast-track"] },
      { label: "Help and support", values: ["Community", "Standard", "Priority", "Priority"] },
    ],
  },
  {
    group: "Projects and products",
    rows: [
      { label: "Public projects and products", values: ["1", "5", "20", "200"] },
      { label: "Private projects and products", values: ["—", "5", "20", "200"] },
      { label: "Public and private components", values: ["—", "5", "20", "Unlimited"] },
      { label: "Exports a month", values: ["2", "5", "50", "300"] },
      { label: "Contributors", values: ["—", "1", "20", "200"] },
    ],
  },
  {
    group: "AI video",
    rows: [
      { label: "AI videos", values: ["—", "Up to 5", "Up to 10", "Up to 200"] },
      { label: "Video quality", values: ["—", "480p", "480p", "720p"] },
      { label: "Video with IDEEZA AR", values: ["—", "—", "—", "Included"] },
    ],
  },
  {
    group: "Marketplace and making",
    rows: [
      { label: "Mint, list and buy", values: ["Included", "Included", "Included", "Included"] },
      { label: "Hire a freelancer or a manufacturer", values: ["—", "—", "Included", "Included"] },
      { label: "APK generator", values: ["—", "—", "—", "Included"] },
    ],
  },
];

function CompareTable({ current }: { current: PlanTier }) {
  return (
    <div id="compare-plans" className="overflow-x-auto rounded-xl border border-solid border-border bg-bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-left text-md leading-md">
        <caption className="sr-only">Plans compared, feature by feature</caption>
        <thead className="sticky top-0 bg-bg-subtle text-sm leading-sm text-text-secondary">
          <tr>
            <th scope="col" className="px-[16px] py-[10px] font-semibold">
              Feature
            </th>
            {PLANS.map((p) => (
              <th key={p.tier} scope="col" className="px-[16px] py-[10px] font-semibold">
                {p.name}
                {p.tier === current && <span className="ml-[6px] font-regular text-text-tertiary">(yours)</span>}
              </th>
            ))}
          </tr>
        </thead>
        {COMPARE.map((g) => (
          <tbody key={g.group}>
            <tr className="border-t border-solid border-border">
              <th colSpan={5} scope="colgroup" className="px-[16px] pb-[4px] pt-[14px] text-sm font-semibold leading-sm text-text-primary">
                {g.group}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-t border-solid border-border-subtle">
                <th scope="row" className="px-[16px] py-[10px] font-regular text-text-secondary">
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={cn("px-[16px] py-[10px] tabular-nums", v === "—" ? "text-text-tertiary" : "text-text-primary")}>
                    {v === "—" ? <span aria-label="Not included">—</span> : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
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
];

function Faq() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <section aria-labelledby="plans-faq" className="flex flex-col gap-[12px]">
      <h2 id="plans-faq" className="text-2xl font-semibold leading-2xl text-text-primary">
        Questions
      </h2>
      <ul role="list" className="flex flex-col divide-y divide-border rounded-xl border border-solid border-border bg-bg-surface">
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <li key={f.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(on ? null : i)}
                  className="flex w-full items-center justify-between gap-[12px] px-[20px] py-[14px] text-left text-md font-semibold leading-md text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
                >
                  {f.q}
                  <span aria-hidden className={cn("shrink-0 text-text-tertiary transition-transform duration-fast", on && "rotate-45")}>
                    +
                  </span>
                </button>
              </h3>
              {on && (
                <p id={`faq-${i}`} className="max-w-[72ch] px-[20px] pb-[16px] text-md leading-md text-text-secondary">
                  {f.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function newOrderId(): string {
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function UpgradeDialog({ tier, cycle, onClose }: { tier: PlanTier; cycle: BillingCycle; onClose: () => void }) {
  const { sub, plan: current, start } = useCreatePlan();
  const { request } = useWalletRequest();
  const target = planOf(tier);
  const [now] = React.useState(() => Date.now());
  const quote = quoteUpgrade(sub, tier, cycle, now);
  const price = priceOf(tier, cycle);
  const defaultToken = useDefaultToken();
  const [coin, setCoin] = React.useState<PayCoin>(defaultToken);
  const [step, setStep] = React.useState<"pay" | "done" | "failed">("pay");
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [orderId, setOrderId] = React.useState(newOrderId);
  const coinRef = React.useRef<HTMLButtonElement | null>(null);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const sameTier = sub.tier === tier;

  React.useEffect(() => {
    if (step !== "pay") doneRef.current?.focus();
  }, [step]);

  const finish = (paidWith: string) => {
    start(tier, cycle, { orderId, amount: quote.due, paidWith, price: quote.price, credit: quote.unused });
    setStep("done");
  };

  const pay = async () => {
    if (paying) return;
    if (quote.due === 0) return finish("Covered by unused time");
    setPaying(true);
    setNote(null);
    try {
      const result = await request(
        {
          kind: "transaction",
          purpose: "subscribe",
          identity: "maker",
          network: "baseSepolia",
          title: `Pay for ${target.name}`,
          summary: [
            { label: "Plan", value: `${target.name} · ${cycle === "yearly" ? "billed yearly" : "billed monthly"}` },
            { label: "Due today", value: usd(quote.due) },
          ],
          note: "Testnet demo, no real money moves.",
          doneLine: `You're on ${target.name}.`,
          charge: { network: "baseSepolia", lines: [{ coin, amount: String(coinAmount(quote.due, coin)) }] },
        },
        {
          commit: (proof) => {
            start(tier, cycle, {
              orderId,
              amount: quote.due,
              paidWith: `${coin} · demo wallet`,
              price: quote.price,
              credit: quote.unused,
              txHash: proof.txHash,
              payer: proof.address,
            });
            return { ok: true };
          },
        },
      );
      if (result.ok) setStep("done");
      else if (result.reason === "rejected") setNote("Payment cancelled. Nothing was charged.");
      else {
        setFailure(result.message ?? "We couldn't take the payment.");
        setOrderId(newOrderId());
        setStep("failed");
      }
    } finally {
      setPaying(false);
    }
  };

  const title =
    step === "done" ? `You're on ${target.name}` : step === "failed" ? "Payment failed" : sameTier ? "Switch to annual" : `Upgrade to ${target.name}`;

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={paying}
      closeUnavailable={paying}
      title={title}
      size="sm"
      initialFocus={coinRef}
      footer={
        step === "pay" ? (
          <>
            <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose} disabled={paying}>
              Cancel
            </Button>
            <Button hierarchy="primary" size="lg" onClick={pay} loading={paying}>
              {quote.due === 0 ? "Confirm" : `Pay ${usd(quote.due)}`}
            </Button>
          </>
        ) : step === "failed" ? (
          <>
            <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
              Close
            </Button>
            <Button ref={doneRef} hierarchy="primary" size="lg" onClick={() => setStep("pay")}>
              Try again
            </Button>
          </>
        ) : (
          <Button ref={doneRef} hierarchy="primary" size="lg" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        )
      }
    >
      {step === "done" && (
        <div role="status" className="flex items-start gap-[12px]">
          <span aria-hidden className="mt-[2px] shrink-0 text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={20} />
          </span>
          <div className="flex flex-col gap-[4px]">
            <p className="text-md font-semibold leading-md text-text-primary">
              {n(target.credits)} AI credits are added for this month.
            </p>
            <p className="text-md leading-md text-text-secondary">Your plan renews on {date(quote.renewsAt)}.</p>
            <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
              <TestnetDemoBadge /> Paid from your demo wallet. No real money moved.
            </p>
          </div>
        </div>
      )}
      {step === "failed" && (
        <Banner tone="error" title="We couldn't take the payment">
          {failure} Nothing was charged.
        </Banner>
      )}
      {step === "pay" && (
        <div className="flex flex-col gap-[16px]">
          <dl className="flex flex-col gap-[6px] rounded-lg border border-solid border-border bg-bg-subtle px-[14px] py-[12px] text-md leading-md">
            <div className="flex items-baseline justify-between gap-[12px]">
              <dt className="font-semibold text-text-primary">
                {target.name} · {cycle === "yearly" ? "annual" : "monthly"}
              </dt>
              <dd className="tabular-nums text-text-primary">{usd(quote.price)}</dd>
            </div>
            <div className="text-sm leading-sm text-text-secondary">
              {cycle === "yearly" ? `${usd(price.perMonth)} a month, billed yearly` : "Billed monthly"} · {n(target.credits)} AI credits
              each month
            </div>
            {quote.unused > 0 && (
              <div className="flex items-baseline justify-between gap-[12px] text-sm leading-sm">
                <dt className="text-text-secondary">Unused time on {current.name}</dt>
                <dd className="tabular-nums text-text-success">−{usd(quote.unused)}</dd>
              </div>
            )}
            <div className="mt-[4px] flex items-baseline justify-between gap-[12px] border-t border-solid border-border pt-[8px]">
              <dt className="font-semibold text-text-primary">Due today</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{usd(quote.due)}</dd>
            </div>
            <div className="text-sm leading-sm text-text-secondary">Starts now and renews on {date(quote.renewsAt)}.</div>
          </dl>
          {quote.due > 0 && (
            <PaymentPicker
              amountUsd={quote.due}
              coin={coin}
              onCoin={setCoin}
              coinRef={coinRef}
              footnote="Cancel any time; you keep the plan until the period ends."
            />
          )}
          {note && (
            <p role="status" className="text-md leading-md text-text-secondary">
              {note}
            </p>
          )}
        </div>
      )}
    </ModalFrame>
  );
}

function SwitchDialog({ tier, cycle, onClose }: { tier: PlanTier; cycle: BillingCycle; onClose: () => void }) {
  const { sub, plan: current, schedule } = useCreatePlan();
  const target = planOf(tier);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const when = sub.renewsAt ? date(sub.renewsAt) : "";
  const sameTier = sub.tier === tier;
  return (
    <ModalFrame
      open
      onClose={onClose}
      title={sameTier ? "Switch to monthly billing?" : `Switch to ${target.name}?`}
      size="sm"
      initialFocus={keepRef}
      footer={
        <>
          <Button ref={keepRef} hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
            Keep {current.name}
          </Button>
          <Button
            hierarchy="primary"
            size="lg"
            onClick={() => {
              schedule(tier, cycle);
              onClose();
            }}
          >
            Switch on {when}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[12px] text-md leading-md text-text-secondary">
        <p>
          You keep {current.name} until {when}. Then you&apos;re on {target.name}
          {sameTier ? ", billed monthly" : ""}: {n(target.credits)} AI credits a month, {usd(priceOf(tier, cycle).perMonth)} a month.
        </p>
        <Losses from={current} to={target} />
        <p>Nothing is charged now, and nothing you made is deleted.</p>
      </div>
    </ModalFrame>
  );
}

/** What gets smaller after a switch or a cancel, as a list; nothing when nothing does. */
function Losses({ from, to }: { from: Plan; to: Plan }) {
  const losses = lossesOf(from, to);
  if (losses.length === 0) return null;
  return (
    <div className="flex flex-col gap-[6px]">
      <p className="font-semibold text-text-primary">What changes then</p>
      <ul role="list" className="flex flex-col gap-[4px]">
        {losses.map((l) => (
          <li key={l} className="flex items-start gap-[8px]">
            <span aria-hidden className="mt-[9px] h-[4px] w-[4px] shrink-0 rounded-full bg-text-tertiary" />
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The smallest paid plan, offered before a cancel from a bigger one. */
const SMALLEST_PAID: PlanTier = "tinkerer";

export function CancelDialog({ onClose }: { onClose: () => void }) {
  const { sub, plan: current, cancel, schedule } = useCreatePlan();
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const when = sub.renewsAt ? date(sub.renewsAt) : "";
  const free = planOf("free");
  const smaller = planOf(SMALLEST_PAID);
  const offerSmaller = current.monthly > smaller.monthly;
  return (
    <ModalFrame
      open
      onClose={onClose}
      title={`Cancel ${current.name}?`}
      size="sm"
      initialFocus={keepRef}
      footer={
        <>
          <Button ref={keepRef} hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
            Keep {current.name}
          </Button>
          <Button
            hierarchy="danger"
            size="lg"
            onClick={() => {
              cancel();
              onClose();
            }}
          >
            Cancel plan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[12px] text-md leading-md text-text-secondary">
        <p>
          You keep {current.name} until {when}. Then you&apos;re on Free: {n(free.credits)} AI credits a month.
        </p>
        <Losses from={current} to={free} />
        <p>Credits you bought stay until they expire, and nothing you made is deleted.</p>
        {offerSmaller && (
          <Banner
            tone="info"
            title="Pay less instead"
            action={
              <Button
                hierarchy="secondary"
                size="sm"
                onClick={() => {
                  schedule(SMALLEST_PAID, "monthly");
                  onClose();
                }}
              >
                Switch to {smaller.name}
              </Button>
            }
          >
            {smaller.name} is {usd(smaller.monthly)} a month with {n(smaller.credits)} AI credits. It starts on {when}.
          </Banner>
        )}
      </div>
    </ModalFrame>
  );
}
