"use client";

// Buy credits on the phone, where a build or a render runs short (A3, the
// out-of-credits composer, the AI tab's ⋯). The web's one purchase, as a
// sheet: the same three packs at the plan's discount, the smallest that
// covers the shortfall picked, paid in test USDT or IDZ through the Demo
// wallet's own request (components/credits/buy-credits.tsx `pay`, in the
// kit's wallet sheet KIT-WS), and the credits land in the same commit as its debit. A paused build starts by
// itself once they cover it (the build simulator watches the balance).

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { Badge } from "@/components/ideeza/badge";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { creditsLine, orderOf } from "@/components/credits/buy-credits";
import { useDefaultToken } from "@/lib/account/payment";
import { CREDIT_PACKS, VALIDITY_MONTHS, coinAmount, packCovering, usd, type PackId } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";

type Coin = "USDT" | "IDZ";

function newOrderId(): string {
  return `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function BuyCreditsSheet({ open, onClose, need }: { open: boolean; onClose: () => void; need?: number }) {
  return open ? <BuyPanel onClose={onClose} need={need} /> : null;
}

function BuyPanel({ onClose, need }: { onClose: () => void; need?: number }) {
  const { hydrated, balance, purchase } = useCredits();
  const discount = useCreditDiscount();
  const { request, sheet } = useWalletSheet();
  const toast = useToast();
  const short = need !== undefined && hydrated ? Math.max(0, need - balance) : 0;
  const [pack, setPack] = React.useState<PackId>(() => packCovering(short).id);
  const defaultToken = useDefaultToken();
  const [coin, setCoin] = React.useState<Coin>(defaultToken === "IDZ" ? "IDZ" : "USDT");
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<{ tone: "plain" | "error"; text: string } | null>(null);
  const [orderId, setOrderId] = React.useState(newOrderId);
  const order = orderOf({ kind: "pack", id: pack }, discount);
  const credits = order.base + order.bonus;

  const pay = async () => {
    if (!hydrated || paying) return;
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
        toast({ title: `Payment successful · ${credits.toLocaleString("en-US")} credits added`, lead: "success" });
        onClose();
      } else if (result.reason === "rejected") {
        setNote({ tone: "plain", text: "Payment cancelled in the wallet. Nothing was charged." });
      } else {
        setNote({ tone: "error", text: result.message ?? "The wallet couldn't take the payment. Try again." });
        setOrderId(newOrderId());
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <Sheet
      open
      onClose={() => !paying && onClose()}
      title="Buy AI credits"
      description={
        short > 0
          ? `This needs ${need} credits. You have ${balance}, so ${short} more.`
          : `You have ${hydrated ? balance.toLocaleString("en-US") : "…"} credits. Bought credits last ${VALIDITY_MONTHS} months.`
      }
      actions={
        <>
          <Button size="xl" className="w-full" loading={paying} onClick={pay}>
            Pay {usd(order.price.final)}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Pack" className="flex flex-col gap-4">
        {CREDIT_PACKS.map((p) => {
          const o = orderOf({ kind: "pack", id: p.id }, discount);
          const on = p.id === pack;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPack(p.id)}
              className={cn(
                "flex min-h-[64px] items-center gap-6 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-7 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border-subtle bg-bg-surface",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.section, "inline-flex items-center gap-3")}>
                  {p.name}
                  {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
                </span>
                <span className={T.meta}>{creditsLine(o.base, o.bonus)}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className={cn(T.section, "tabular-nums")}>{usd(o.price.final)}</span>
                {o.price.saved > 0 && <span className={cn(T.meta, "text-text-tertiary line-through")}>{usd(o.price.base)}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        <p className={cn(T.rowTitle, "inline-flex items-center gap-3")}>
          Pay with the Demo wallet <TestnetDemoBadge />
        </p>
        <div role="radiogroup" aria-label="Token" className="flex gap-4">
          {(["USDT", "IDZ"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={coin === c}
              onClick={() => setCoin(c)}
              className={cn(
                T.rowTitle, "inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-[length:var(--border-width-1-5)] border-solid outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                coin === c ? "border-border-brand bg-bg-brand-subtle text-text-brand" : "border-border-subtle text-text-primary",
              )}
            >
              {c} · {coinAmount(order.price.final, c).toLocaleString("en-US")}
            </button>
          ))}
        </div>
      </div>
      {note && (
        <p role="status" className={cn(T.meta, note.tone === "error" ? "text-text-error" : "text-text-secondary")}>
          {note.text}
        </p>
      )}
      {/* The wallet's own request rises over this sheet (it portals to the body). */}
      {sheet}
    </Sheet>
  );
}
