// Report a problem — the form's rules, shared by the dialog and the route
// that stores a report. Pure, relative imports only (node:test).
//
// The User Panel V2 form asked for seven things, four of them required. Its
// own filled example shows what that costs: the title says "Bug Issue",
// which only repeats the type, and one paragraph is pasted into both text
// boxes. So a report is one typed answer and two taps. The title is built
// from the first line of what the maker wrote, "Anything else" folds into
// that one box, and the page name is captured rather than shown as a grey
// field nobody can use.
//
// The "how frustrated are you" question became impact: what happened, not
// how it felt, so a calm maker and an upset one who are equally stuck land
// in the same place in the queue. An idea blocks nobody, so it isn't asked.

export type ReportKind = "bug" | "ai" | "slow" | "confusing" | "idea" | "other";
export type ReportImpact = "fyi" | "slowed" | "blocked";

export const KINDS: readonly { value: ReportKind; label: string; sub?: string }[] = [
  { value: "bug", label: "Something's broken", sub: "It doesn't work, or it looks wrong" },
  { value: "ai", label: "The AI got it wrong", sub: "Wrong parts, code or drawings" },
  { value: "slow", label: "It's slow", sub: "A page or editor takes too long" },
  { value: "confusing", label: "It's confusing", sub: "I can't work out how to do something" },
  { value: "idea", label: "I have an idea", sub: "Something IDEEZA could do" },
  { value: "other", label: "Something else" },
];

export const IMPACTS: readonly { value: ReportImpact; label: string }[] = [
  { value: "fyi", label: "Not much" },
  { value: "slowed", label: "It slows me down" },
  { value: "blocked", label: "I'm stuck" },
];

/** The team's half of a priority. The maker answers impact; reach and data
 *  loss are triage's call, so nothing a maker picks reaches the top. */
export const PRIORITY_OF: Record<ReportImpact, "high" | "medium" | "low"> = {
  blocked: "high",
  slowed: "medium",
  fyi: "low",
};

export const DETAILS_MAX = 2000;
/** The counter appears near the cap, not from the first keystroke. */
export const DETAILS_COUNTER_FROM = 1800;
export const TITLE_MAX = 60;

export const IMAGES_MAX = 3;
/** What a picked file may weigh before it's shrunk. */
export const IMAGE_INPUT_BYTES_MAX = 20 * 1024 * 1024;
/** The long edge after shrinking: PCB text stays legible at this size. */
export const IMAGE_EDGE_MAX = 1600;
/** What one shrunk image may weigh on the wire. Three of them stay well under
 *  a serverless function's 4.5 MB request body. */
export const IMAGE_BYTES_MAX = 1_200_000;
export const BODY_BYTES_MAX = 4_000_000;

const KIND_SET = new Set<string>(KINDS.map((k) => k.value));
const IMPACT_SET = new Set<string>(IMPACTS.map((i) => i.value));

export const isKind = (v: unknown): v is ReportKind => typeof v === "string" && KIND_SET.has(v);
export const isImpact = (v: unknown): v is ReportImpact => typeof v === "string" && IMPACT_SET.has(v);

/** An idea blocks nobody, so it isn't asked how much it's in the way. */
export function asksImpact(kind: ReportKind | null): boolean {
  return kind !== "idea";
}

/** The one typed field's label and hint, which follow what the report is
 *  about, so the box asks the question that makes that kind useful. */
export function detailsCopy(kind: ReportKind | null): { label: string; hint: string } {
  switch (kind) {
    case "ai":
      return { label: "What did the AI get wrong?", hint: "What did you ask for, and what did it make?" };
    case "slow":
      return { label: "What was slow?", hint: "What were you doing, and about how long did it take?" };
    case "confusing":
      return { label: "What were you trying to do?", hint: "Tell us where you got lost." };
    case "idea":
      return { label: "What would you like IDEEZA to do?", hint: "And what would it help you make?" };
    default:
      return { label: "What happened?", hint: "What were you trying to do, and what happened instead?" };
  }
}

export type DraftField = "kind" | "impact" | "details";
export type DraftError = { field: DraftField; message: string };

/** What stops a report from sending, in the order the fields sit on screen,
 *  so the first one is where focus goes. */
export function draftErrors(d: {
  kind: ReportKind | null;
  impact: ReportImpact | null;
  details: string;
}): DraftError[] {
  const out: DraftError[] = [];
  if (!d.kind) out.push({ field: "kind", message: "Choose what it's about." });
  if (asksImpact(d.kind) && !d.impact) {
    out.push({ field: "impact", message: "Choose how much it's getting in your way." });
  }
  const text = d.details.trim();
  if (!text) {
    out.push({ field: "details", message: d.kind === "idea" ? "Describe your idea." : "Tell us what happened." });
  } else if (text.length > DETAILS_MAX) {
    out.push({ field: "details", message: `Keep it under ${DETAILS_MAX.toLocaleString("en-US")} characters.` });
  }
  return out;
}

/** The report's title, from the first sentence or line of what the maker
 *  wrote: cut on a word, never mid-word, with "…" when cut. A first line too
 *  short to say anything falls back to the kind. */
export function titleOf(details: string, kind: ReportKind | null): string {
  const first = details.trim().split(/\n|(?<=[.!?])\s/)[0]?.trim() ?? "";
  const flat = first.replace(/\s+/g, " ");
  if (flat.length >= 8) {
    if (flat.length <= TITLE_MAX) return flat;
    const cut = flat.slice(0, TITLE_MAX - 1);
    const space = cut.lastIndexOf(" ");
    return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
  }
  const label = KINDS.find((k) => k.value === kind)?.label ?? "Problem report";
  return flat ? `${label}: ${flat}` : label;
}

const ID = /^[0-9a-f]{32}$/;

/** A report's id is minted when its draft starts, so a retry or a double
 *  press sends the same id and the store keeps one report. It is also the
 *  path guard: nothing off the wire builds a path until it matches. */
export const isReportId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

/** What the maker reads and can quote: "R-7F3A2C". */
export function refOf(id: string): string {
  return `R-${id.slice(0, 6).toUpperCase()}`;
}

/** Scale a picture down to fit the long edge, never up. */
export function fitWithin(width: number, height: number, edge = IMAGE_EDGE_MAX): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= edge || long <= 0) return { width: Math.round(width), height: Math.round(height) };
  const k = edge / long;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** How many of the incoming images fit beside the ones already attached,
 *  and what to say about the rest. */
export function admitImages(have: number, incoming: number): { take: number; note: string | null } {
  const room = Math.max(0, IMAGES_MAX - have);
  const take = Math.min(room, incoming);
  const left = incoming - take;
  if (left <= 0) return { take, note: null };
  if (take === 0) return { take, note: `${IMAGES_MAX} images max. Remove one to add another.` };
  return { take, note: `Only ${IMAGES_MAX} images fit, so ${left} ${left === 1 ? "wasn't" : "weren't"} added.` };
}

/** The image's type from its first bytes, not from what the file claims. */
export function imageTypeOf(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Captured when the dialog opens. Only what the maker was shown, and only
 *  when they left "Send page and device details" ticked. */
export type ReportContext = {
  page: string;
  /** The route's pattern, ids replaced: groups reports without carrying names. */
  route: string;
  project?: string;
  product?: string;
  browser: string;
  os: string;
  viewport: string;
  theme: string;
  /** This browser couldn't save the maker's last change. */
  storageFull?: boolean;
  errors: { message: string; where?: string; page: string; count: number; at: number }[];
};

/** What the dialog sends. The server adds the time it arrived and the build. */
export type ReportPayload = {
  id: string;
  kind: ReportKind;
  impact: ReportImpact | null;
  details: string;
  title: string;
  context: ReportContext | null;
};

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length <= max ? v : null;

/** The route's check on an untrusted body: every field the dialog sends, with
 *  its type and length, and nothing else carried through. */
export function parsePayload(raw: unknown): { ok: true; payload: ReportPayload } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not an object" };
  const r = raw as Record<string, unknown>;
  if (!isReportId(r.id)) return { ok: false, reason: "id" };
  if (!isKind(r.kind)) return { ok: false, reason: "kind" };
  const impact = r.impact === null || r.impact === undefined ? null : r.impact;
  if (impact !== null && !isImpact(impact)) return { ok: false, reason: "impact" };
  const errors = draftErrors({ kind: r.kind, impact: impact as ReportImpact | null, details: typeof r.details === "string" ? r.details : "" });
  if (errors.length) return { ok: false, reason: errors[0].field };
  const details = (r.details as string).trim();
  const title = str(r.title, TITLE_MAX + 40)?.trim() || titleOf(details, r.kind);
  const context = parseContext(r.context);
  if (context === undefined) return { ok: false, reason: "context" };
  return {
    ok: true,
    payload: {
      id: r.id,
      kind: r.kind,
      impact: asksImpact(r.kind) ? (impact as ReportImpact | null) : null,
      details,
      title,
      context,
    },
  };
}

/** null when the maker unticked it; undefined when it isn't a context. */
function parseContext(raw: unknown): ReportContext | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const page = str(c.page, 200);
  const route = str(c.route, 200);
  const browser = str(c.browser, 60);
  const os = str(c.os, 60);
  const viewport = str(c.viewport, 40);
  const theme = str(c.theme, 40);
  if (page === null || route === null || browser === null || os === null || viewport === null || theme === null) {
    return undefined;
  }
  const project = c.project === undefined ? undefined : str(c.project, 200);
  const product = c.product === undefined ? undefined : str(c.product, 200);
  if (project === null || product === null) return undefined;
  const list = Array.isArray(c.errors) ? c.errors.slice(0, 5) : [];
  const errors: ReportContext["errors"] = [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const x = e as Record<string, unknown>;
    const message = str(x.message, 200);
    const where = x.where === undefined ? undefined : str(x.where, 200);
    const at = typeof x.at === "number" && Number.isFinite(x.at) ? x.at : null;
    const count = typeof x.count === "number" && x.count >= 1 ? Math.floor(x.count) : 1;
    if (message === null || where === null || at === null) continue;
    errors.push({ message, ...(where ? { where } : null), page: str(x.page, 200) ?? "", count, at });
  }
  return {
    page,
    route,
    ...(project ? { project } : null),
    ...(product ? { product } : null),
    browser,
    os,
    viewport,
    theme,
    ...(c.storageFull === true ? { storageFull: true } : null),
    errors,
  };
}
