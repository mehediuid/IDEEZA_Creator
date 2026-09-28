// IDEEZA Design System — the "Testnet demo" pill (Phase 2 spec §3.1). Every
// demo money surface carries it: the demo wallet, prices, fees, balances,
// sales and demo buyers. Nothing it labels touches a chain (owner decision 1).
//
// Tone: `warning`, from the existing tokens. Measured on its own background:
// light #a16207 on #fefce8 = 4.76 : 1, dark #facc15 on #713f12 = 5.66 : 1,
// both ≥ 4.5 : 1, so the spec's neutral fallback isn't needed. The words
// carry the meaning, never the colour alone.
import { Badge } from "./badge";

export const TESTNET_DEMO_LABEL = "Testnet demo";

export function TestnetDemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className}>
      {TESTNET_DEMO_LABEL}
    </Badge>
  );
}
