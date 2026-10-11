// The gating ladder (docs/superpowers/specs/2026-10-11-build-earn-p1-design.md,
// P1-4). Five levels, from Engineering to Physical editions & payouts:
//
//   L0 Engineering                 always yours, never gated
//   L1 Drafts (plan, splits)       no wallet; something built to earn from
//   L2 Mint                        wallet connected, ownership confirmed, videos ready
//   L3 Sell & editions             minted, license set, payout wallet set
//   L4 Physical editions & payouts identity verified (demo)
//
// The level is cumulative: the highest level whose steps, and every lower
// level's, are all in place. Every commerce commit point asks `commitCheck`
// (or `requireLevel`) and shows the missing steps inline, each with its fix;
// no engineering action ever asks.
//
// Pure, and it imports nothing from engineering: the facts arrive as plain
// booleans, and `earnFactsOf` reads them off structural shapes the project
// page's derivation already satisfies.

import type { DemoWallet, MintStatus } from "../wallet/types";
import type { KycRecord } from "./kyc";

export type EarnLevel = 0 | 1 | 2 | 3 | 4;

export type LadderStepId = "built" | "wallet" | "ownership" | "videos" | "minted" | "license" | "payout" | "identity";

/** What each missing step's one-tap fix does; the UI maps each to its control. */
export type LadderFix = "products" | "wallet" | "ownership" | "media" | "mint" | "license" | "payout" | "identity";

export type EarnFacts = {
  /** At least one current product: Earn sells what was built. */
  built: boolean;
  /** The maker's current demo account is connected. */
  walletConnected: boolean;
  ownershipConfirmed: boolean;
  /** Every current product has a ready AI video (never vacuous on an empty project). */
  videosReady: boolean;
  minted: boolean;
  licenseSet: boolean;
  payoutWalletSet: boolean;
  /** The demo identity check (`ideeza:commerce:kyc`). */
  identityVerified: boolean;
  /** A step's own reason in place of the default, e.g. the readiness gate's video count. */
  reasons?: Partial<Record<LadderStepId, string>>;
};

export type LadderStep = {
  id: LadderStepId;
  level: EarnLevel;
  /** The step as a fact: "Demo wallet connected". */
  label: string;
  /** What to do, when it's missing. */
  reason: string;
  fix: { kind: LadderFix; label: string };
  /** A step another step sets: listed only once that one is in place. */
  requires?: LadderStepId;
};

export type LevelInfo = {
  level: EarnLevel;
  name: string;
  /** What the level opens up. */
  opens: string;
  /** The gate badge: what it needs, in one or two words. */
  gate: string;
};

export const EARN_LEVELS: readonly LevelInfo[] = [
  { level: 0, name: "Engineering", opens: "Build, version and showcase your project.", gate: "Always open" },
  { level: 1, name: "Drafts", opens: "Write the business plan and set the splits.", gate: "No wallet" },
  { level: 2, name: "Mint", opens: "Mint the Project NFT.", gate: "Wallet" },
  { level: 3, name: "Sell & editions", opens: "List the project and sell virtual editions.", gate: "Wallet" },
  { level: 4, name: "Physical editions & payouts", opens: "Sell physical editions and request payouts.", gate: "Identity" },
];

export const LADDER_STEPS: readonly LadderStep[] = [
  {
    id: "built",
    level: 1,
    label: "A built product",
    reason: "Build at least one product first. Earn sells what you've built.",
    fix: { kind: "products", label: "Open products" },
  },
  {
    id: "wallet",
    level: 2,
    label: "Demo wallet connected",
    reason: "Connect the demo wallet. Minting and listing sign with it.",
    fix: { kind: "wallet", label: "Connect wallet" },
  },
  {
    id: "ownership",
    level: 2,
    label: "Ownership confirmed",
    reason: "Confirm you are the rightful owner of this idea.",
    fix: { kind: "ownership", label: "Confirm ownership" },
  },
  {
    id: "videos",
    level: 2,
    label: "Product videos ready",
    reason: "Every product needs a finished AI video.",
    fix: { kind: "media", label: "Make videos in Media" },
  },
  {
    id: "minted",
    level: 3,
    label: "Minted",
    reason: "Mint the Project NFT first. It keeps your name on it before anyone sees it.",
    fix: { kind: "mint", label: "Go to mint" },
  },
  {
    id: "license",
    level: 3,
    label: "License chosen",
    reason: "Choose the license buyers get it under.",
    fix: { kind: "license", label: "Choose a license" },
  },
  {
    id: "payout",
    level: 3,
    label: "Payout wallet set",
    reason: "Set the wallet your sales pay into.",
    fix: { kind: "payout", label: "Set payout wallet" },
    requires: "minted",
  },
  {
    id: "identity",
    level: 4,
    label: "Identity verified",
    reason: "Verify your identity. Physical editions and payouts need it.",
    fix: { kind: "identity", label: "Verify identity" },
  },
];

const FACT_OF: Record<LadderStepId, keyof Omit<EarnFacts, "reasons">> = {
  built: "built",
  wallet: "walletConnected",
  ownership: "ownershipConfirmed",
  videos: "videosReady",
  minted: "minted",
  license: "licenseSet",
  payout: "payoutWalletSet",
  identity: "identityVerified",
};

const stepOk = (s: LadderStep, f: EarnFacts) => f[FACT_OF[s.id]];

/** The steps up to `level` that aren't in place, lower levels first; a step whose
 *  prerequisite is also missing waits for it. Reasons take the facts' overrides. */
function missingUpTo(level: EarnLevel, f: EarnFacts, from: EarnLevel = 1): LadderStep[] {
  const open = LADDER_STEPS.filter((s) => s.level >= from && s.level <= level && !stepOk(s, f));
  const openIds = new Set(open.map((s) => s.id));
  return open
    .filter((s) => !(s.requires && openIds.has(s.requires)))
    .map((s) => {
      const reason = f.reasons?.[s.id];
      return reason ? { ...s, reason } : s;
    });
}

export type LadderNext = { level: EarnLevel; missing: LadderStep[] };

/** The level the facts reach, and what the next level still needs (null at L4). */
export function earnLevelOf(f: EarnFacts): { level: EarnLevel; next: LadderNext | null } {
  let level: EarnLevel = 0;
  for (const info of EARN_LEVELS) {
    if (info.level === 0) continue;
    if (missingUpTo(info.level, f, info.level).length > 0) break;
    level = info.level;
  }
  if (level === 4) return { level, next: null };
  const target = (level + 1) as EarnLevel;
  return { level, next: { level: target, missing: missingUpTo(target, f, target) } };
}

export type LevelCheck = { ok: true } | { ok: false; level: EarnLevel; current: EarnLevel; missing: LadderStep[] };

/** Whether the facts reach `level`; when not, every missing step up to it. */
export function requireLevel(level: EarnLevel, f: EarnFacts): LevelCheck {
  const missing = missingUpTo(level, f);
  if (missing.length === 0) return { ok: true };
  return { ok: false, level, current: earnLevelOf(f).level, missing };
}

/** The commerce commit points and the level each needs. Engineering has none. */
export const COMMIT_LEVEL = {
  mint: 2,
  list: 3,
  editionVirtual: 3,
  editionPhysical: 4,
  payout: 4,
} as const satisfies Record<string, EarnLevel>;

export type CommitPoint = keyof typeof COMMIT_LEVEL;

/**
 * One commit point's check: `requireLevel` at its level. `handled` leaves out
 * the steps the call site already gates in place (the Brief's own ownership
 * box, the listing dialog's readiness gate), so a step is never asked twice
 * on one screen; the commit stays blocked by that call site's own gate.
 */
export function commitCheck(point: CommitPoint, f: EarnFacts, opts: { handled?: readonly LadderStepId[] } = {}): LevelCheck {
  const r = requireLevel(COMMIT_LEVEL[point], f);
  if (r.ok || !opts.handled?.length) return r;
  const missing = r.missing.filter((s) => !opts.handled!.includes(s.id));
  return missing.length ? { ...r, missing } : { ok: true };
}

/** What `earnFactsOf` reads. Structural, so the project page's `view` parts fit as they are. */
export type EarnFactsInput = {
  /** The project's products; `dropped === null` is a current one. */
  products: readonly { dropped: unknown }[];
  /** The Sell readiness gate (`view.videos.readiness.sell`): its videos and ownership rules. */
  sell: { rules: readonly { id: string; ok: boolean; reason: string | null }[] };
  mint: { status: MintStatus; record: { wallet: { address: string } } | null };
  /** The license the project is given or sold under, if one is chosen. */
  license: string | null;
  wallet: DemoWallet | undefined;
  kyc: KycRecord | null;
};

export function earnFactsOf(i: EarnFactsInput): EarnFacts {
  const built = i.products.some((p) => p.dropped === null);
  const rule = (id: string) => i.sell.rules.find((r) => r.id === id);
  const videos = rule("videos");
  const videosReady = built && videos?.ok === true;
  const w = i.wallet;
  const reasons: Partial<Record<LadderStepId, string>> = {};
  if (built && videos && !videos.ok && videos.reason) reasons.videos = videos.reason;
  return {
    built,
    walletConnected: !!w && w.identities[`maker-${w.account}`]?.connected === true,
    ownershipConfirmed: rule("ownership")?.ok === true,
    videosReady,
    minted: i.mint.status !== "notMinted",
    licenseSet: i.license !== null,
    payoutWalletSet: i.mint.record !== null || i.mint.status === "legacy",
    identityVerified: i.kyc?.status === "verified",
    reasons,
  };
}
