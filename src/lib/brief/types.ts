// Brief module — the state model, its vocabulary and the migration that brings
// an older stored draft up to it.
//
// This lives in `lib` rather than in `brief-app.tsx` so `normalizeBrief` is a
// pure function with no React/DOM in its import graph: the wizard, the steps
// and a plain node script can all read the same model.
// `brief-app.tsx` re-exports everything here, so `./brief-app` imports keep
// working unchanged.

export type Intent = "sell" | "give" | "save";
export type MediaType = "ai" | "ar" | "skip";
export type Quality = "low" | "high";

// Minting happens on testnets today — a mainnet chain in this list would claim
// something the app doesn't do.
export type Network = "baseSepolia" | "mumbai";

export const NETWORKS: { value: Network; label: string }[] = [
  { value: "baseSepolia", label: "Base Sepolia (Testnet)" },
  { value: "mumbai", label: "Mumbai Testnet (Polygon)" },
];

export type ListingType = "buyNow" | "auction";

export const LISTING_TYPES: { id: ListingType; label: string; sub: string }[] = [
  { id: "buyNow", label: "Buy now", sub: "One-click purchase at a fixed price" },
  { id: "auction", label: "Auction", sub: "Highest bidder wins after the timer" },
];

export type Token = "ETH" | "WETH" | "USDC" | "USDT" | "MATIC";

export const TOKENS_BY_NETWORK: Record<Network, Token[]> = {
  baseSepolia: ["ETH", "WETH", "USDC", "USDT"],
  mumbai: ["MATIC", "WETH", "USDC", "USDT"],
};

export type License =
  | "boost1"
  | "bsd2"
  | "bsd3"
  | "cc"
  | "gpl2"
  | "lgpl21"
  | "mit";

export const LICENSES: { value: License; label: string }[] = [
  { value: "boost1", label: "Boost Software License 1.0" },
  { value: "bsd2", label: "BSD 2-Clause License" },
  { value: "bsd3", label: "BSD 3-Clause License" },
  { value: "cc", label: "Creative Commons" },
  { value: "gpl2", label: "GNU General Public License v2.0" },
  { value: "lgpl21", label: "GNU Lesser General Public License v2.1" },
  { value: "mit", label: "MIT License" },
];

export type Scene = {
  id: string;
  label: string;
  timeRange: string;
  visual: string;
  bgAudio: string;
  musicCue: string;
  speech: string;
};

export type BriefState = {
  // Step 1
  projectId: string;
  // "new" = the brief creates the project; anything else is a ManualProject id.
  projectChoice: "new" | string;
  newProjectName: string;
  newProjectDescription: string;
  productName: string;
  productDescription: string;
  intent: Intent | null;
  // Step 2
  mediaType: MediaType;
  videoPrompt: string;
  audioPrompt: string;
  audioAutoGenerate: boolean;
  autoGenerateVideo: boolean;
  quality: Quality;
  scenes: Scene[];
  storyboardGenerated: boolean;
  // Step 3 — common
  network: Network;
  collection: string;
  story: string;
  license: License | null;
  // Sell-only
  listingType: ListingType;
  token: Token;
  price: string;
  // Auction-only (listingType === "auction")
  minBid: string;
  auctionBuyNow: string;
  expiresAt: string; // datetime-local value, e.g. "2026-01-18T14:30"
  royalties: number;
  // Give-only
  recipientCommunity?: string;
  distributionRule?: string;
  // Save-only
  blockchainMint?: boolean;
  // Confirms + share
  instantMint: boolean;
  understandGas: boolean;
  confirmGasFees: boolean;
  confirmOwnership: boolean;
  shareToNewsfeed: boolean;
  // Result tracking. videoJobId is set as soon as Step 2 → Step 3 transition
  // happens (so progress is visible on Step 3 from the moment user arrives).
  // mintedAt is set when Pay completes. A listing "goes live" when BOTH are
  // truthy AND the linked video job has stage === 'done'.
  mintedAt: number | null;
  videoJobId: string | null;
};

export const DEFAULT_STATE: BriefState = {
  projectId: "",
  projectChoice: "new",
  newProjectName: "",
  newProjectDescription: "",
  productName: "",
  productDescription: "",
  intent: null,
  mediaType: "ai",
  videoPrompt: "",
  audioPrompt: "",
  audioAutoGenerate: true,
  autoGenerateVideo: false,
  quality: "low",
  scenes: [],
  storyboardGenerated: false,
  network: "baseSepolia",
  collection: "",
  story: "",
  license: null,
  listingType: "buyNow",
  token: "ETH",
  price: "",
  minBid: "",
  auctionBuyNow: "",
  expiresAt: "",
  royalties: 10,
  recipientCommunity: "",
  distributionRule: "First-come-first-serve",
  blockchainMint: false,
  instantMint: false,
  understandGas: false,
  confirmGasFees: false,
  confirmOwnership: false,
  shareToNewsfeed: false,
  mintedAt: null,
  videoJobId: null,
};

// Drafts stored before the testnet move carry chains and listing types that no
// longer exist. Rather than dropping the draft (the user loses their idea), map
// the old value onto its nearest live one.
const NETWORK_MIGRATION: Record<string, Network> = {
  ethereum: "baseSepolia",
  solana: "baseSepolia",
  polygon: "mumbai",
};

const LISTING_MIGRATION: Record<string, ListingType> = {
  bundle: "buyNow",
  offers: "buyNow",
};

type Dict = Record<string, unknown>;

function asDict(v: unknown): Dict {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {};
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

const INTENTS: readonly Intent[] = ["sell", "give", "save"];
const MEDIA_TYPES: readonly MediaType[] = ["ai", "ar", "skip"];
const QUALITIES: readonly Quality[] = ["low", "high"];
const NETWORK_IDS: readonly Network[] = ["baseSepolia", "mumbai"];
const LISTING_IDS: readonly ListingType[] = ["buyNow", "auction"];
const LICENSE_IDS: readonly License[] = LICENSES.map((l) => l.value);

function normalizeScenes(v: unknown): Scene[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s) => s && typeof s === "object").map((raw, i) => {
    const s = asDict(raw);
    return {
      id: str(s.id, `s${i + 1}`),
      label: str(s.label, `Scene ${i + 1}`),
      timeRange: str(s.timeRange, ""),
      visual: str(s.visual, ""),
      bgAudio: str(s.bgAudio, ""),
      musicCue: str(s.musicCue, ""),
      speech: str(s.speech, ""),
    };
  });
}

/**
 * Bring any stored draft — current, older, or corrupt — up to the live model.
 * Pure: no storage, no DOM. Unknown values fall back to the default rather
 * than throwing, so a hand-edited or truncated draft still opens.
 */
export function normalizeBrief(parsed: unknown): BriefState {
  const s = asDict(parsed);

  const rawNetwork = typeof s.network === "string" ? s.network : "";
  const network: Network = NETWORK_MIGRATION[rawNetwork]
    ? NETWORK_MIGRATION[rawNetwork]
    : oneOf(rawNetwork, NETWORK_IDS, DEFAULT_STATE.network);

  const rawListing = typeof s.listingType === "string" ? s.listingType : "";
  const listingType: ListingType = LISTING_MIGRATION[rawListing]
    ? LISTING_MIGRATION[rawListing]
    : oneOf(rawListing, LISTING_IDS, DEFAULT_STATE.listingType);

  // A token is only meaningful on a chain that carries it: SOL is gone with
  // Solana, and MATIC doesn't exist on Base Sepolia.
  const allowed = TOKENS_BY_NETWORK[network];
  const token: Token = oneOf(s.token, allowed, allowed[0]);

  const projectChoice = str(s.projectChoice, DEFAULT_STATE.projectChoice);

  return {
    projectId: str(s.projectId, DEFAULT_STATE.projectId),
    projectChoice: projectChoice || DEFAULT_STATE.projectChoice,
    newProjectName: str(s.newProjectName, DEFAULT_STATE.newProjectName),
    newProjectDescription: str(
      s.newProjectDescription,
      DEFAULT_STATE.newProjectDescription,
    ),
    productName: str(s.productName, DEFAULT_STATE.productName),
    productDescription: str(s.productDescription, DEFAULT_STATE.productDescription),
    intent:
      typeof s.intent === "string" && (INTENTS as readonly string[]).includes(s.intent)
        ? (s.intent as Intent)
        : null,
    mediaType: oneOf(s.mediaType, MEDIA_TYPES, DEFAULT_STATE.mediaType),
    videoPrompt: str(s.videoPrompt, DEFAULT_STATE.videoPrompt),
    audioPrompt: str(s.audioPrompt, DEFAULT_STATE.audioPrompt),
    audioAutoGenerate: bool(s.audioAutoGenerate, DEFAULT_STATE.audioAutoGenerate),
    autoGenerateVideo: bool(s.autoGenerateVideo, DEFAULT_STATE.autoGenerateVideo),
    quality: oneOf(s.quality, QUALITIES, DEFAULT_STATE.quality),
    scenes: normalizeScenes(s.scenes),
    storyboardGenerated: bool(
      s.storyboardGenerated,
      DEFAULT_STATE.storyboardGenerated,
    ),
    network,
    collection: str(s.collection, DEFAULT_STATE.collection),
    story: str(s.story, DEFAULT_STATE.story),
    license:
      typeof s.license === "string" &&
      (LICENSE_IDS as readonly string[]).includes(s.license)
        ? (s.license as License)
        : null,
    listingType,
    token,
    price: str(s.price, DEFAULT_STATE.price),
    minBid: str(s.minBid, DEFAULT_STATE.minBid),
    auctionBuyNow: str(s.auctionBuyNow, DEFAULT_STATE.auctionBuyNow),
    expiresAt: str(s.expiresAt, DEFAULT_STATE.expiresAt),
    royalties: num(s.royalties, DEFAULT_STATE.royalties),
    recipientCommunity: str(s.recipientCommunity, DEFAULT_STATE.recipientCommunity ?? ""),
    distributionRule: str(s.distributionRule, DEFAULT_STATE.distributionRule ?? ""),
    blockchainMint: bool(s.blockchainMint, DEFAULT_STATE.blockchainMint ?? false),
    instantMint: bool(s.instantMint, DEFAULT_STATE.instantMint),
    understandGas: bool(s.understandGas, DEFAULT_STATE.understandGas),
    confirmGasFees: bool(s.confirmGasFees, DEFAULT_STATE.confirmGasFees),
    confirmOwnership: bool(s.confirmOwnership, DEFAULT_STATE.confirmOwnership),
    shareToNewsfeed: bool(s.shareToNewsfeed, DEFAULT_STATE.shareToNewsfeed),
    mintedAt: typeof s.mintedAt === "number" && Number.isFinite(s.mintedAt)
      ? s.mintedAt
      : null,
    videoJobId: typeof s.videoJobId === "string" ? s.videoJobId : null,
  };
}
