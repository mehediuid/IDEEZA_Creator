"use client";

// Buy credits, from a phone (Product Details 10pb's "Buy credits"): the
// web's in-place purchase (components/credits/buy-credits.tsx) as a bottom
// sheet — the three packs, the smallest that covers the shortfall chosen, the
// plan's discount, paid from the demo wallet in its default token through the
// phone's wallet sheet; the credits land in the same commit as the debit
// (`purchase`), one order id per sheet so a double press adds once.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { creditsLine, orderOf } from "@/components/credits/buy-credits";
import { useDefaultToken } from "@/lib/account/payment";
import { CREDIT_PACKS, VALIDITY_MONTHS, coinAmount, packCovering, usd, type PackId } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";

const newOrderId = () => `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function BuyCreditsSheet({ open, need, onClose }: { open: boolean; need: number; onClose: () => void }) {
  const { hydrated, balance, purchase } = useCredits();
  const discount = useCreditDiscount();
  const coin = useDefaultToken();
  const wallet = useWalletSheet();
  const toast = useToast();
  const short = Math.max(0, need - balance);
  const [packId, setPackId] = React.useState<PackId>(() => packCovering(short).id);
  const [orderId, setOrderId] = React.useState(newOrderId);
  const [error, setError] = React.useState<string | null>(null);
  const order = orderOf({ kind: "pack", id: packId }, discount);

  const pay = async () => {
    setError(null);
    const credits = order.base + order.bonus;
    const result = await wallet.request(
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
        doneLine: `${credits.toLocaleString("en-US")} credits added to your account.`,
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
      toast({ title: `${credits.toLocaleString("en-US")} credits added` });
      onClose();
    } else if (result.reason !== "rejected") {
      setError(result.message ?? "The wallet couldn't take the payment.");
      setOrderId(newOrderId());
    }
  };

  return (
    <>
      <Sheet
        open={open && !wallet.busy}
        onClose={onClose}
        title="Buy AI credits"
        description={hydrated ? `You have ${balance} ${balance === 1 ? "credit" : "credits"}${short > 0 ? ` · ${short} more needed` : ""}. Testnet demo, no real money moves.` : undefined}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={pay}>
              {`Pay ${usd(order.price.final)}`}
            </Button>
          </>
        }
      >
        <div className="flex">
          <TestnetDemoBadge />
        </div>
        <ul role="radiogroup" aria-label="Credit packs" className="flex flex-col gap-4 pb-4">
          {CREDIT_PACKS.map((p) => {
            const on = p.id === packId;
            const o = orderOf({ kind: "pack", id: p.id }, discount);
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    "relative flex cursor-pointer items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
                    on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
                  )}
                >
                  <input type="radio" name="m-credit-pack" className="sr-only" checked={on} onChange={() => setPackId(p.id)} />
                  <Radio checked={on} decorative className="mt-1" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-4">
                      <span className={T.name}>{p.name}</span>
                      {p.popular && <Badge tone="brand">Popular</Badge>}
                    </span>
                    <span className={T.meta}>{creditsLine(p.base, p.bonus)}</span>
                  </span>
                  <span className={T.rowTitle}>{usd(o.price.final)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className={cn(T.body, "pb-4 text-text-error")}>{error}</p>}
      </Sheet>
      {wallet.sheet}
    </>
  );
}
