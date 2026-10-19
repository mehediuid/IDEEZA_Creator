"use client";

// Buy credits in place — when a build or a render runs short (the paused-build
// toast and page, a concept card that can't build, the build gate). It never
// navigates, so a paused build starts by itself once the credits cover it
// (the build simulator watches the balance). The Credits page buys on the
// checkout page instead (checkout-page.tsx); both use the same parts: the
// pack cards' look, the payment column (payment-picker) and the order
// summary (order-summary), so the two read as one checkout.
//
//   choose — the three packs, the smallest that covers the shortfall chosen
//   pay    — how to pay | the order and Pay $N
// then "Payment successful" (N credits added, a paused build starting) or
// "Payment failed" with Try again.
//
// Payments aren't on: the Demo wallet pays in test USDT or IDZ through its
// own request flow, and the credits land in the same commit as its debit.
// Each dialog is one order id, so a double press adds once (purchaseState).
// Above the amount set in "Ask before a purchase over", Pay asks once more.
//
// <AutoTopUp /> lives here too: with Auto top-up on (Settings › Plan &
// pricing › Credit alerts and limits), a build that pauses for credits buys
// the chosen pack through the same wallet request, once per pause.

import * as React from "react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ModalFrame } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { useDefaultToken } from "@/lib/account/payment";
import { autoTopUpDecision, needsConfirm, rememberTried } from "@/lib/create/credit-limits";
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
import { productsOf, useCreateHistory, type BuildJob } from "@/lib/create/history";
import { useSettings } from "@/lib/settings/use-settings";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { OrderSummary, PaymentResult } from "./order-summary";
import { CHOICE, CHOICE_OFF, CHOICE_ON, PaymentPicker, useWalletStatus, type PayCoin } from "./payment-picker";
import { PurchaseConfirm } from "./purchase-confirm";

/** What is being bought: a pack, or a custom number of credits. */
export type CreditPick = { kind: "pack"; id: PackId } | { kind: "custom"; credits: number };

type OpenArgs = {
  /** What the action waiting on credits costs — a build's price. */
  need?: number;
  /** Chosen already: the dialog opens on Pay. */
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
      <AutoTopUp held={args !== null} />
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
const pct = (d: number) => `${Math.round(d * 100)}%`;

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
  const { confirmAbove } = useSettings().credits;
  const [asking, setAsking] = React.useState(false);
  const { plan } = useCreatePlan();
  const { attentionBuilds } = useCreateHistory();
  const { request } = useWalletRequest();
  const wallet = useWalletStatus();
  // Builder and Disruptor take a share off every credit (the plan's discount).
  const discount = useCreditDiscount();
  const short = need !== undefined && hydrated ? Math.max(0, need - balance) : 0;
  const [step, setStep] = React.useState<Step>(picked ? "pay" : "choose");
  const [pick, setPick] = React.useState<CreditPick>(() => picked ?? { kind: "pack", id: packCovering(short).id });
  const defaultToken = useDefaultToken();
  const [coin, setCoin] = React.useState<PayCoin>(defaultToken);
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ added: number; after: number; paused: string | null } | null>(null);
  const [orderId, setOrderId] = React.useState(newOrderId);
  const firstRef = React.useRef<HTMLButtonElement | null>(null);
  const packRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const coinRef = React.useRef<HTMLButtonElement | null>(null);
  const packsId = React.useId();
  const [openedAt] = React.useState(() => Date.now());

  const order = orderOf(pick, discount);

  React.useEffect(() => {
    if (step === "pay") coinRef.current?.focus();
  }, [step]);

  const pay = async (confirmed = false) => {
    if (!hydrated || paying) return;
    if (!confirmed && needsConfirm(order.price.final, confirmAbove)) {
      setAsking(true);
      return;
    }
    // The paused build this is for, read before the credits land: once they
    // cover it the simulator starts it and it leaves the attention list. A
    // build held by the monthly limit isn't one credits can start.
    const paused = attentionBuilds.find((a) => a.job.blocked === "credits")?.job ?? null;
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
          charge: { network: "baseSepolia", lines: [{ coin, amount: String(coinAmount(order.price.final, coin)) }] },
        },
        {
          commit: (proof) => {
            purchase({
              orderId,
              base: order.base,
              bonus: order.bonus,
              pack: order.pack,
              price: order.price.final,
              listPrice: order.price.base,
              paidWith: `${coin} · demo wallet`,
              txHash: proof.txHash,
              payer: proof.address,
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
        setNote("Payment cancelled in the wallet. Nothing was charged.");
      } else {
        setFailure(result.message ?? "The wallet couldn't take the payment.");
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

  const title = step === "done" ? "Payment successful" : step === "failed" ? "Payment failed" : step === "pay" ? "Payment details" : "Buy AI credits";

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={paying || asking}
      closeUnavailable={paying}
      title={title}
      description={
        step === "choose"
          ? `Credits pay for AI work. A concept render uses ${CONCEPT_COST}, a product build uses ${BUILD_COST} per product.`
          : undefined
      }
      size={step === "pay" ? "lg" : "md"}
      initialFocus={step === "pay" ? coinRef : firstRef}
      footer={
        step === "choose" ? (
          <>
            <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
              Cancel
            </Button>
            <Button hierarchy="primary" size="lg" onClick={() => setStep("pay")}>
              Continue
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "done" && done && (
        <PaymentResult compact tone="success" title={`${plural(done.added, "credit")} added`} primary={{ label: "Done", onClick: onClose }}>
          <p>You now have {plural(done.after, "credit")}.</p>
          {done.paused && <p className="font-semibold text-text-primary">{done.paused}</p>}
        </PaymentResult>
      )}

      {step === "failed" && (
        <PaymentResult compact tone="error" title="Payment failed" primary={{ label: "Try again", onClick: () => setStep("pay") }}>
          <p>Unfortunately, we couldn&apos;t process your payment. Please try again.</p>
          <p className="text-md leading-md">{failure} Nothing was charged.</p>
        </PaymentResult>
      )}

      {step === "choose" && (
        <div className="flex flex-col gap-[16px]">
          <p className="text-lg leading-lg text-text-secondary">
            {!hydrated
              ? "Reading your balance…"
              : short > 0
                ? `This needs ${plural(need ?? 0, "credit")}. You have ${balance}, so ${short} more.`
                : `You have ${plural(balance, "credit")}.`}
          </p>
          <div role="radiogroup" aria-labelledby={packsId} className="grid grid-cols-3 gap-[12px] max-sm:grid-cols-1">
            <span id={packsId} className="sr-only">
              Choose a pack
            </span>
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
                  className={cn(CHOICE, on ? CHOICE_ON : CHOICE_OFF, "relative flex-col items-start gap-[4px] py-[16px]")}
                >
                  {p.popular && (
                    <Badge tone="brand-solid" className="absolute right-[12px] top-[12px]">
                      Popular
                    </Badge>
                  )}
                  <span className="text-xl font-semibold leading-xl text-text-primary">{p.name}</span>
                  <span className="flex items-baseline gap-[6px]">
                    <span className="text-3xl font-bold leading-3xl tabular-nums text-text-primary">{usd(price.final)}</span>
                    {price.saved > 0 && <s className="text-md leading-md tabular-nums text-text-tertiary">{usd(price.base)}</s>}
                  </span>
                  <span className="text-md leading-md text-text-secondary">{creditsLine(p.base, p.bonus)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="flex flex-col gap-[16px]">
          {!picked && (
            <button
              type="button"
              onClick={() => setStep("choose")}
              disabled={paying}
              className="inline-flex items-center gap-[4px] self-start text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={ArrowLeft01Icon} size={16} /> Change pack
            </button>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,400px)] items-start gap-[32px] max-md:grid-cols-1">
            <PaymentPicker amountUsd={order.price.final} coin={coin} onCoin={setCoin} coinRef={coinRef} />
            <OrderSummary
              head={{ title: order.pack ? `${order.pack} pack` : "Custom AI credits", price: usd(order.price.base), sub: creditsLine(order.base, order.bonus) }}
              lines={[
                {
                  label: "Credits last",
                  value: `Until ${new Date(addMonths(openedAt, VALIDITY_MONTHS)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
                },
              ]}
              adjustments={
                order.price.saved > 0 ? [{ label: `${plan.name} plan discount (${pct(discount)})`, value: `−${usd(order.price.saved)}`, tone: "success" }] : []
              }
              subtotal={usd(order.price.base)}
              total={usd(order.price.final)}
              cta={{
                label: `Pay ${usd(order.price.final)}`,
                onClick: () => pay(),
                loading: paying,
                disabled: !hydrated || !wallet.connected,
                hint: !wallet.connected ? "Connect your wallet to pay." : undefined,
              }}
              note={note && <p role="status">{note}</p>}
            />
          </div>
          {confirmAbove !== null && (
            <PurchaseConfirm
              open={asking}
              amount={order.price.final}
              limit={confirmAbove}
              what={order.pack ? `The ${order.pack} pack` : "This custom amount"}
              onCancel={() => setAsking(false)}
              onConfirm={() => {
                setAsking(false);
                void pay(true);
              }}
            />
          )}
        </div>
      )}
    </ModalFrame>
  );
}

// ─────────────────────────────── auto top-up ──────────────────────────────

/** Which pauses auto top-up has already tried, in this browser: a reload
 *  while the build is still paused must not ask the wallet again. */
const TRIED_KEY = "ideeza:credits:auto-top-up";

function readTried(): string[] {
  try {
    const raw = window.localStorage.getItem(TRIED_KEY);
    const tried = raw ? (JSON.parse(raw) as { tried?: unknown }).tried : null;
    return Array.isArray(tried) ? tried.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function writeTried(tried: string[]): boolean {
  try {
    window.localStorage.setItem(TRIED_KEY, JSON.stringify({ v: 1, tried }));
    return true;
  } catch {
    return false;
  }
}

/** The build the queue is waiting on for credits: the oldest one parked for them. */
function pausedForCredits(builds: BuildJob[]): BuildJob | null {
  let next: BuildJob | null = null;
  for (const b of builds) {
    if (b.status !== "queued" || b.blocked !== "credits") continue;
    if (!next || b.createdAt < next.createdAt) next = b;
  }
  return next;
}

/** Auto top-up: when a build pauses for credits and Auto top-up is on, buy the
 *  chosen pack from the Demo wallet through its signing dialog — once per
 *  pause, only when the build would then start within the monthly limit. The
 *  simulator sees the balance and starts the build (the same path as Buy
 *  credits). `held`: the Buy credits dialog is open, so the maker is already
 *  buying; nothing is asked on top of it. Renders nothing. */
function AutoTopUp({ held }: { held: boolean }) {
  const { autoTopUp, monthlyCap } = useSettings().credits;
  const { hydrated, balance, ledger, purchase } = useCredits();
  const { builds, hydrated: historyReady } = useCreateHistory();
  const { request } = useWalletRequest();
  const discount = useCreditDiscount();
  const coin = useDefaultToken();
  const busy = React.useRef(false);

  React.useEffect(() => {
    if (!hydrated || !historyReady || held || busy.current) return;
    const job = pausedForCredits(builds);
    const pack = CREDIT_PACKS.find((p) => p.id === autoTopUp.pack) ?? CREDIT_PACKS[0];
    const cost = job ? buildCost(productsOf(job).length) : 0;
    const tried = readTried();
    const decision = autoTopUpDecision({
      on: autoTopUp.on,
      packCredits: pack.base + pack.bonus,
      // A build parked before pauses were dated counts from its last change.
      pause: job ? { buildId: job.id, blockedAt: job.blockedAt ?? job.updatedAt, cost } : null,
      balance,
      ledger,
      cap: monthlyCap,
      now: Date.now(),
      tried,
    });
    if (!decision.buy || !job) return;
    // Remembered before the wallet opens: one try per pause, whatever the
    // answer, even if the page reloads while the dialog is up.
    writeTried(rememberTried(tried, decision.key));
    busy.current = true;
    const price = packPrice(pack, discount);
    const credits = pack.base + pack.bonus;
    const name = job.projectChoiceName?.trim() || job.title;
    const orderId = newOrderId();
    void request(
      {
        kind: "transaction",
        purpose: "buyCredits",
        identity: "maker",
        network: "baseSepolia",
        title: "Auto top-up: pay for AI credits",
        summary: [
          { label: "Why", value: `${name} paused: it needs ${plural(cost, "credit")}, you have ${balance}` },
          { label: "Credits", value: `${pack.name} pack · ${creditsLine(pack.base, pack.bonus)}` },
          { label: "Price", value: usd(price.final) },
        ],
        note: `Auto top-up is on in Plan & pricing › Credits. Testnet demo, no real money moves. The credits last ${VALIDITY_MONTHS} months.`,
        doneLine: `${plural(credits, "credit")} added. ${name} starts now.`,
        charge: { network: "baseSepolia", lines: [{ coin, amount: String(coinAmount(price.final, coin)) }] },
      },
      {
        commit: (proof) => {
          purchase({
            orderId,
            base: pack.base,
            bonus: pack.bonus,
            pack: pack.name,
            price: price.final,
            listPrice: price.base,
            paidWith: `${coin} · demo wallet · auto top-up`,
            txHash: proof.txHash,
            payer: proof.address,
          });
          return { ok: true };
        },
      },
    ).finally(() => {
      busy.current = false;
    });
  }, [hydrated, historyReady, held, builds, autoTopUp.on, autoTopUp.pack, monthlyCap, balance, ledger, discount, coin, request, purchase]);

  return null;
}
