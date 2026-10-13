"use client";

// Buy credits — the one purchase flow for AI credits (User Panel V2, "AI
// Credit Purchase" 41549:170243 and its checkouts 41549:166643 / 166716).
// Opened in place from every place that runs short — the paused-build toast
// and page, a concept card that can't build, the build gate — and from the
// Credits page's packs. It never navigates, so a paused build starts by itself
// once the credits cover it (the build simulator watches the balance).
//
// Two steps in one frame:
//   choose — the packs, the smallest one that covers the shortfall chosen
//            (skipped when a pack or an amount was picked on the Credits page)
//   pay    — the order, its price after any plan discount, how to pay, and
//            "Pay $10.00"
// then "Payment successful" (N credits added, a paused build starting) or
// "Payment failed" with Try again.
//
// Payments aren't on. Crypto works for real on testnet: the Demo wallet pays
// in USDT or IDZ through its own request flow (connect, network, review,
// sign), and the credits land in the same commit as the wallet's debit. Card
// and PayPal are listed, disabled, with the reason. Each dialog is one order
// id, so a double press or a replayed confirm adds once (purchaseState).

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, ModalFrame, Radio, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import {
  CREDIT_PACKS,
  VALIDITY_MONTHS,
  addMonths,
  coinAmount,
  customPrice,
  packCovering,
  packPrice,
  usd,
  type CreditPack,
  type PackId,
} from "@/lib/create/credit-pricing";
import { BUILD_COST, CONCEPT_COST, buildCost, useCredits } from "@/lib/create/credits";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { PAY_CARD, PAY_CARD_OFF, PAY_CARD_ON, PaymentPicker, type PayCoin } from "./payment-picker";

/** What is being bought: a pack, or a custom number of credits. */
export type CreditPick = { kind: "pack"; id: PackId } | { kind: "custom"; credits: number };

type OpenArgs = {
  /** What the action waiting on credits costs — a build's price. */
  need?: number;
  /** Chosen already (the Credits page): the dialog opens on Pay. */
  pick?: CreditPick;
};

type Ctx = {
  open: (args?: OpenArgs) => void;
  /** A dialog that opened it covers itself while this is open. */
  isOpen: boolean;
};

const BuyContext = React.createContext<Ctx | null>(null);

export function BuyCreditsProvider({ children }: { children: React.ReactNode }) {
  const [args, setArgs] = React.useState<OpenArgs | null>(null);
  const open = React.useCallback((a: OpenArgs = {}) => setArgs(a), []);
  const value = React.useMemo(() => ({ open, isOpen: args !== null }), [open, args]);
  return (
    <BuyContext.Provider value={value}>
      {children}
      {args && <BuyCreditsDialog need={args.need} pick={args.pick} onClose={() => setArgs(null)} />}
    </BuyContext.Provider>
  );
}

export function useBuyCredits(): Ctx {
  const ctx = React.useContext(BuyContext);
  if (!ctx) throw new Error("useBuyCredits must be used inside <BuyCreditsProvider>");
  return ctx;
}

/** A control that opens Buy credits — a button, styled by the caller. */
export function BuyCreditsButton({
  need,
  pick,
  className,
  children,
  ...rest
}: OpenArgs & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  const { open } = useBuyCredits();
  return (
    <button type="button" aria-haspopup="dialog" onClick={() => open({ need, pick })} className={className} {...rest}>
      {children}
    </button>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** What a pick buys and costs. */
export function orderOf(pick: CreditPick, discount: number) {
  if (pick.kind === "pack") {
    const pack = CREDIT_PACKS.find((p) => p.id === pick.id) as CreditPack;
    return { name: `${pack.name} pack`, pack: pack.name, base: pack.base, bonus: pack.bonus, price: packPrice(pack, discount) };
  }
  return { name: "Custom credits", pack: undefined, base: pick.credits, bonus: 0, price: customPrice(pick.credits, discount) };
}

/** "550 credits (500 + 50 bonus)" */
export function creditsLine(base: number, bonus: number): string {
  return bonus > 0 ? `${plural(base + bonus, "credit")} (${base.toLocaleString("en-US")} + ${bonus} bonus)` : plural(base, "credit");
}

function newOrderId(): string {
  return `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type Step = "choose" | "pay" | "done" | "failed";

function BuyCreditsDialog({ need, pick: picked, onClose }: OpenArgs & { onClose: () => void }) {
  const { hydrated, balance, purchase } = useCredits();
  const { attentionBuilds } = useCreateHistory();
  const { request } = useWalletRequest();
  // Builder and Disruptor take a share off every credit (the plan's discount).
  const discount = useCreditDiscount();
  const short = need !== undefined && hydrated ? Math.max(0, need - balance) : 0;
  const [step, setStep] = React.useState<Step>(picked ? "pay" : "choose");
  const [pick, setPick] = React.useState<CreditPick>(() => picked ?? { kind: "pack", id: packCovering(short).id });
  const [coin, setCoin] = React.useState<PayCoin>("IDZ");
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ added: number; after: number; paused: string | null } | null>(null);
  const [orderId, setOrderId] = React.useState(newOrderId);
  const firstRef = React.useRef<HTMLButtonElement | null>(null);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const packRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const coinRef = React.useRef<HTMLButtonElement | null>(null);
  const packsId = React.useId();

  const order = orderOf(pick, discount);
  const amount = coinAmount(order.price.final, coin);
  // The day the dialog opened: what "these credits last until" counts from.
  const [openedAt] = React.useState(() => Date.now());
  const expires = new Date(addMonths(openedAt, VALIDITY_MONTHS)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // The step's first control takes the focus the last step's button had.
  React.useEffect(() => {
    if (step === "done" || step === "failed") doneRef.current?.focus();
    else if (step === "pay") coinRef.current?.focus();
  }, [step]);

  const pay = async () => {
    if (!hydrated || paying) return;
    // The paused build this is for, read before the credits land: once they
    // cover it the simulator starts it and it leaves the attention list.
    const paused = attentionBuilds.find((a) => a.reason === "credits")?.job ?? null;
    const credits = order.base + order.bonus;
    setPaying(true);
    setNote(null);
    try {
      const result = await request(
        {
          kind: "transaction",
          purpose: "buyCredits",
          identity: "maker",
          network: "baseSepolia",
          title: "Pay for AI credits",
          summary: [
            { label: "Credits", value: `${order.name} · ${creditsLine(order.base, order.bonus)}` },
            { label: "Price", value: usd(order.price.final) },
          ],
          note: `Testnet demo, no real money moves. The credits last ${VALIDITY_MONTHS} months.`,
          doneLine: `${plural(credits, "credit")} added to your account.`,
          charge: { network: "baseSepolia", lines: [{ coin, amount: String(amount) }] },
        },
        {
          commit: () => {
            purchase({
              orderId,
              base: order.base,
              bonus: order.bonus,
              pack: order.pack,
              price: order.price.final,
              paidWith: `${coin} · demo wallet`,
            });
            return { ok: true };
          },
        },
      );
      if (result.ok) {
        const after = balance + credits;
        let line: string | null = null;
        if (paused) {
          const name = paused.projectChoiceName?.trim() || paused.title;
          const cost = buildCost(productsOf(paused).length);
          line = after >= cost ? `${name} starts now.` : `${name} needs ${cost} credits, ${cost - after} more.`;
        }
        setDone({ added: credits, after, paused: line });
        setStep("done");
      } else if (result.reason === "rejected") {
        setNote("Payment cancelled. Nothing was charged.");
      } else {
        setFailure(result.message ?? "We couldn't take the payment. Nothing was charged.");
        setOrderId(newOrderId());
        setStep("failed");
      }
    } finally {
      setPaying(false);
    }
  };

  const movePack = (from: number, dir: 1 | -1) => {
    const next = (from + dir + CREDIT_PACKS.length) % CREDIT_PACKS.length;
    setPick({ kind: "pack", id: CREDIT_PACKS[next].id });
    packRefs.current[next]?.focus();
  };

  const title =
    step === "done" ? "Payment successful" : step === "failed" ? "Payment failed" : step === "pay" ? "Pay for credits" : "Buy credits";

  const footer =
    step === "done" || step === "failed" ? (
      <>
        {step === "failed" && (
          <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        )}
        <Button
          ref={doneRef}
          hierarchy="primary"
          size="lg"
          className={step === "done" ? "ml-auto" : undefined}
          onClick={step === "done" ? onClose : () => setStep("pay")}
        >
          {step === "done" ? "Done" : "Try again"}
        </Button>
      </>
    ) : step === "choose" ? (
      <>
        <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button hierarchy="primary" size="lg" onClick={() => setStep("pay")}>
          Continue
        </Button>
      </>
    ) : (
      <>
        <Button
          hierarchy="secondary"
          size="lg"
          className="ml-auto"
          onClick={picked ? onClose : () => setStep("choose")}
          disabled={paying}
        >
          {picked ? "Cancel" : "Back"}
        </Button>
        <Button hierarchy="primary" size="lg" onClick={pay} loading={paying} disabled={!hydrated}>
          Pay {usd(order.price.final)}
        </Button>
      </>
    );

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={paying}
      closeUnavailable={paying}
      title={title}
      description={
        step === "choose"
          ? `Credits pay for AI work. A concept render uses ${CONCEPT_COST}, a product build uses ${BUILD_COST} per product.`
          : undefined
      }
      size="sm"
      initialFocus={picked ? coinRef : firstRef}
      footer={footer}
    >
      {step === "done" && done && (
        <div role="status" className="flex items-start gap-[12px]">
          <span aria-hidden className="mt-[2px] shrink-0 text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={20} />
          </span>
          <div className="flex flex-col gap-[4px]">
            <p className="text-md font-semibold leading-md text-text-primary">
              {plural(done.added, "credit")} added. You now have {plural(done.after, "credit")}.
            </p>
            {done.paused && <p className="text-md leading-md text-text-secondary">{done.paused}</p>}
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

      {step === "choose" && (
        <div className="flex flex-col gap-[16px]">
          <p className="text-md leading-md text-text-secondary">
            {!hydrated
              ? "Reading your balance…"
              : short > 0
                ? `This needs ${plural(need ?? 0, "credit")}. You have ${balance}, so ${short} more.`
                : `You have ${plural(balance, "credit")}.`}
          </p>
          <div className="flex flex-col gap-[8px]">
            <span id={packsId} className="text-md font-semibold leading-md text-text-primary">
              Choose a pack
            </span>
            <div role="radiogroup" aria-labelledby={packsId} className="flex flex-col gap-[8px]">
              {CREDIT_PACKS.map((p, i) => {
                const on = pick.kind === "pack" && pick.id === p.id;
                const price = packPrice(p, discount);
                return (
                  <button
                    key={p.id}
                    ref={(el) => {
                      packRefs.current[i] = el;
                      if (on) firstRef.current = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPick({ kind: "pack", id: p.id })}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                        e.preventDefault();
                        movePack(i, 1);
                      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        movePack(i, -1);
                      }
                    }}
                    className={cn(PAY_CARD, on ? PAY_CARD_ON : PAY_CARD_OFF)}
                  >
                    <Radio checked={on} decorative size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="flex flex-wrap items-center gap-[8px] text-md font-semibold leading-md text-text-primary">
                        {p.name}
                        {p.popular && <Badge tone="brand">Most popular</Badge>}
                      </span>
                      <span className="text-sm leading-sm text-text-secondary">{creditsLine(p.base, p.bonus)}</span>
                    </span>
                    <span className="shrink-0 text-md font-semibold leading-md tabular-nums text-text-primary">
                      {usd(price.final)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="flex flex-col gap-[16px]">
          {/* The order: what, how many, and what it costs. */}
          <dl className="flex flex-col gap-[6px] rounded-lg border border-solid border-border bg-bg-subtle px-[14px] py-[12px] text-md leading-md">
            <div className="flex items-baseline justify-between gap-[12px]">
              <dt className="font-semibold text-text-primary">{order.name}</dt>
              <dd className="tabular-nums text-text-primary">{usd(order.price.base)}</dd>
            </div>
            <div className="text-sm leading-sm text-text-secondary">{creditsLine(order.base, order.bonus)}</div>
            {order.price.saved > 0 && (
              <div className="flex items-baseline justify-between gap-[12px] text-sm leading-sm">
                <dt className="text-text-secondary">Plan discount</dt>
                <dd className="tabular-nums text-text-success">−{usd(order.price.saved)}</dd>
              </div>
            )}
            <div className="mt-[4px] flex items-baseline justify-between gap-[12px] border-t border-solid border-border pt-[8px]">
              <dt className="font-semibold text-text-primary">Total</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{usd(order.price.final)}</dd>
            </div>
          </dl>

          <PaymentPicker
            amountUsd={order.price.final}
            coin={coin}
            onCoin={setCoin}
            coinRef={coinRef}
            footnote={`These credits last until ${expires}.`}
          />
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
