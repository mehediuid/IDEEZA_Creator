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

/** How long the "one line · what does it do?" answer may be. */
export const BRIEF_DESC_MAX = 140;

// ── Where a draft is stored ────────────────────────────────────────────────
// A brief opened on a project is that project's, and is keyed by its id. A
// brief opened on a finished AI build has no project yet — Step 1's chooser is
// what creates or picks one — so it is keyed by the build until that answer,
// when the draft moves to the project's own key and stays there.

export function briefDraftKey(scope: string): string {
  return `ideeza:brief:draft:${scope}`;
}

export function buildDraftScope(buildId: string): string {
  return `build:${buildId}`;
}

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

// The name each licence is picked by, and what it actually asks of whoever
// picks the work up — the names alone don't tell a maker them apart, so the
// `info` line rides the row's ⓘ. One list: the form used to keep a second copy
// of the wording, which meant the label here was written and never read.
export const LICENSES: { value: License; label: string; info: string }[] = [
  {
    value: "boost1",
    label: "Boost Software License — Version 1.0",
    info: "Permissive; no attribution required in binaries.",
  },
  {
    value: "bsd2",
    label: "BSD 2-Clause License",
    info: "Permissive; keep the copyright notice.",
  },
  {
    value: "bsd3",
    label: "BSD 3-Clause License",
    info: "Permissive; no endorsement using the author's name.",
  },
  {
    value: "cc",
    label: "Creative Commons Legal Code",
    info: "For documentation and media; choose the variant when you publish.",
  },
  {
    value: "gpl2",
    label: "GNU General Public License — Version 2",
    info: "Copyleft; derivatives must stay open under GPL.",
  },
  {
    value: "lgpl21",
    label: "GNU Lesser General Public License — Version 2.1",
    info: "Copyleft for the library only; linking apps may stay closed.",
  },
  {
    value: "mit",
    label: "MIT License",
    info: "Permissive; keep the notice, no warranty.",
  },
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

/** A clip recorded on the phone and handed back to this brief. */
export type ArClip = {
  url: string;
  receivedAt: number;
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
  // The clip the phone app uploads for an AR preview. Written by the app, never
  // by this page — so `null` is the honest state until one really arrives, and
  // Step 2 keeps Continue shut on it.
  arClip: ArClip | null;
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
  // What was typed, not what it was corrected to: the field holds the digits
  // as they are entered (one decimal place) and the form states the range it
  // has to land in, rather than rewriting "1" to "2" under the cursor.
  royalties: string;
  // Confirms + share
  understandGas: boolean;
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
  arClip: null,
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
  royalties: "10",
  understandGas: false,
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

// The clip arrives from outside this app, so a stored draft's `arClip` is only
// trusted when it is really a URL plus a time — a half-written one reads as no
// clip rather than as a clip that can't be played.
function normalizeArClip(v: unknown): ArClip | null {
  const c = asDict(v);
  const url = typeof c.url === "string" ? c.url : "";
  const receivedAt =
    typeof c.receivedAt === "number" && Number.isFinite(c.receivedAt)
      ? c.receivedAt
      : 0;
  return url && receivedAt ? { url, receivedAt } : null;
}

// Royalties used to be stored as a number, with 0 standing for "nothing typed
// yet" — so an older draft's 0 reads as an empty field rather than as a rate of
// zero, which was never a value the form accepted.
function normalizeRoyalties(v: unknown): string {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? String(v) : "";
  return str(v, DEFAULT_STATE.royalties);
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

  // An empty string is a real answer here — "nothing chosen yet", which is
  // where a brief opened on a build starts, so it must survive a reload
  // instead of falling back to "make a new project".
  const projectChoice = str(s.projectChoice, DEFAULT_STATE.projectChoice);

  return {
    projectId: str(s.projectId, DEFAULT_STATE.projectId),
    projectChoice,
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
    arClip: normalizeArClip(s.arClip),
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
    royalties: normalizeRoyalties(s.royalties),
    understandGas: bool(s.understandGas, DEFAULT_STATE.understandGas),
    confirmOwnership: bool(s.confirmOwnership, DEFAULT_STATE.confirmOwnership),
    shareToNewsfeed: bool(s.shareToNewsfeed, DEFAULT_STATE.shareToNewsfeed),
    mintedAt: typeof s.mintedAt === "number" && Number.isFinite(s.mintedAt)
      ? s.mintedAt
      : null,
    videoJobId: typeof s.videoJobId === "string" ? s.videoJobId : null,
  };
}

// ── Step sequencing ────────────────────────────────────────────────────────
// The Brief doesn't run one fixed wizard: what a maker is doing decides which
// steps they are asked for, and in which order.

export type BriefStepId = "idea" | "preview" | "form" | "success";

/** The form step's own name, per intent — the rail and the CTA both use it. */
export const BRIEF_FORM_LABEL: Record<Intent, string> = {
  sell: "Ready to sell",
  give: "Give to community",
  save: "Save as Private",
};

/**
 * The steps this brief really runs, in order.
 *
 * Selling is a listing, so the clip is part of what is being sold and comes
 * before the terms. Giving or saving needs no clip at all — the maker goes
 * straight from the idea to the form — unless they also post it to
 * Innovations, which does need one, so the preview slots in after the form
 * that asked for it.
 */
export function stepsFor(intent: Intent | null, share: boolean): BriefStepId[] {
  if (!intent) return ["idea"];
  if (intent === "sell") return ["idea", "preview", "form", "success"];
  return share
    ? ["idea", "form", "preview", "success"]
    : ["idea", "form", "success"];
}

/**
 * Every step there is, in the order they can appear. A sequence is a subset of
 * this, so it is what places a step the running sequence doesn't hold (the
 * regenerate hand-off forces "preview" whatever the intent) — and, because
 * drafts used to store the step as 1–4, what a stored number means.
 */
export const STEP_ORDER: readonly BriefStepId[] = [
  "idea",
  "preview",
  "form",
  "success",
];

export function normalizeStep(v: unknown): BriefStepId {
  if (typeof v === "string" && (STEP_ORDER as readonly string[]).includes(v)) {
    return v as BriefStepId;
  }
  if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 4) {
    return STEP_ORDER[v - 1];
  }
  return "idea";
}
