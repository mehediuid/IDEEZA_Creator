// The presale's three coins (Figma 41571:118030): ETH wears the Ethereum
// mark, USDT a T and USDC a $, each on its own subtle fill. Decorative: the
// coin's name is always written beside it.

import { EthereumIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { PayCoin } from "@/lib/wallet/presale";
import { cn } from "@/lib/utils";

const FILL: Record<PayCoin, string> = {
  ETH: "bg-bg-brand-subtle text-text-brand",
  USDT: "bg-bg-success-subtle text-text-success",
  USDC: "bg-badge-blue-bg text-badge-blue-text",
};

export function PayCoinGlyph({ coin, className }: { coin: PayCoin; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-[24px] shrink-0 items-center justify-center rounded-full text-sm font-bold leading-sm", FILL[coin], className)}
    >
      {coin === "ETH" ? <Icon icon={EthereumIcon} size={16} /> : coin === "USDT" ? "T" : "$"}
    </span>
  );
}
