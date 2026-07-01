// POST /api/projects
//
// Outcome route. Persists the user's choice for a completed build:
//   • private   — off-chain draft; no wallet, no KYC
//   • community — showcase + mint (wallet/gas)
//   • sell      — mint + KYC
//
// Wallet/KYC calls are placeholders; this stub just returns OK so the
// UI can advance. A real implementation chains: KYC → mint → list.
//
// Request:  { buildId, outcome: "private" | "community" | "sell" }

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as {
    buildId?: unknown;
    outcome?: unknown;
  };
  const buildId = String(obj.buildId ?? "");
  const outcome = String(obj.outcome ?? "");
  if (!buildId) {
    return NextResponse.json(
      { error: "buildId is required" },
      { status: 400 },
    );
  }
  if (outcome !== "private" && outcome !== "community" && outcome !== "sell") {
    return NextResponse.json(
      { error: "outcome must be private | community | sell" },
      { status: 400 },
    );
  }
  // Placeholder for the eventual mint/KYC chain.
  return NextResponse.json({
    buildId,
    outcome,
    requiresKYC: outcome === "sell",
    requiresWallet: outcome !== "private",
  });
}
