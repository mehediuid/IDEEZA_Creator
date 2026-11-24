// What the phone keeps about its Feed, beside the web's reactions (which hold
// appreciate, save and follow): the clip ⋯ menu's Interested, Not interested
// and Hide video; which clip of a post was saved and when (Saved lists the
// clip itself with "Saved on"); the product clips you reported; the clips
// shared to your Feed with a caption and an audience (D-1: Public or Only me),
// which lead your Feed; and the playback choices (Playback speed, Video
// quality). Data saver is Settings › Appearance's (`appearance.dataSaver`,
// one switch for the app), not kept here. One key, `ideeza:m:feed`. Pure,
// relative imports only.

export const FEED_PREFS_KEY = "ideeza:m:feed";

export const CAPTION_MAX = 500;

export type ShareAudience = "public" | "only-me";

export const AUDIENCES: readonly { id: ShareAudience; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "only-me", label: "Only me" },
];

/** A share: your words over an item. `clipId` is the shared item's id (share-items.ts): a clip's id
 *  where it has one ("p12", "mine:<projectId>~<productId>"), so a share made on a marketplace page
 *  and one made on the Feed are the same thing. */
export type FeedShare = { id: string; clipId: string; caption: string; audience: ShareAudience; at: number };

/** "auto" or a height the clip may be drawn at ("720"). */
export type VideoQuality = string;

export type FeedPrefs = {
  v: 1;
  interested: string[];
  notInterested: string[];
  hidden: string[];
  /** Clip id → when it was saved here. (Before clips were saved one by one the key was the
   *  post's id; `savedRows` reads that as the post's Project clip.) */
  savedAt: Record<string, number>;
  /** Product clips reported here; a Project clip's report is the post's (the web's reported list). */
  reported: string[];
  shares: FeedShare[];
  /** Left from before Data saver moved to Settings › Appearance; nothing reads it. */
  dataSaver: boolean;
  quality: VideoQuality;
  /** Playback speed, one of SPEEDS. */
  speed: number;
};

export const NO_FEED_PREFS: FeedPrefs = {
  v: 1,
  interested: [],
  notInterested: [],
  hidden: [],
  savedAt: {},
  reported: [],
  shares: [],
  dataSaver: false,
  quality: "auto",
  speed: 1,
};

const SPEED_VALUES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const ids = (x: unknown): string[] =>
  Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 120))] : [];

function sharesIn(x: unknown): FeedShare[] {
  if (!Array.isArray(x)) return [];
  const out: FeedShare[] = [];
  for (const r of x) {
    if (typeof r !== "object" || r === null) continue;
    const s = r as Record<string, unknown>;
    if (typeof s.id !== "string" || typeof s.clipId !== "string" || typeof s.at !== "number") continue;
    out.push({
      id: s.id,
      clipId: s.clipId,
      caption: typeof s.caption === "string" ? s.caption.slice(0, CAPTION_MAX) : "",
      audience: s.audience === "only-me" ? "only-me" : "public",
      at: s.at,
    });
  }
  return out;
}

/** A stored value, shape-checked: anything unreadable reads as nothing chosen. */
export function feedPrefsIn(value: unknown): FeedPrefs {
  if (typeof value !== "object" || value === null) return NO_FEED_PREFS;
  const r = value as Record<string, unknown>;
  const savedAt: Record<string, number> = {};
  if (typeof r.savedAt === "object" && r.savedAt !== null) {
    for (const [k, v] of Object.entries(r.savedAt as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) savedAt[k] = v;
  }
  return {
    v: 1,
    interested: ids(r.interested),
    notInterested: ids(r.notInterested),
    hidden: ids(r.hidden),
    savedAt,
    reported: ids(r.reported),
    shares: sharesIn(r.shares),
    dataSaver: r.dataSaver === true,
    quality: typeof r.quality === "string" && /^(auto|\d{3,4})$/.test(r.quality) ? r.quality : "auto",
    speed: typeof r.speed === "number" && SPEED_VALUES.includes(r.speed) ? r.speed : 1,
  };
}

export type ClipChoice = "interested" | "notInterested" | "hidden";

/** Interested and Not interested exclude each other; choosing one again takes it back. */
export function withChoice(p: FeedPrefs, choice: ClipChoice, clipId: string): FeedPrefs {
  const has = p[choice].includes(clipId);
  const next: FeedPrefs = { ...p, [choice]: has ? p[choice].filter((x) => x !== clipId) : [...p[choice], clipId] };
  if (!has && choice === "interested") next.notInterested = p.notInterested.filter((x) => x !== clipId);
  if (!has && choice === "notInterested") next.interested = p.interested.filter((x) => x !== clipId);
  return next;
}

export function withoutChoice(p: FeedPrefs, choice: ClipChoice, clipId: string): FeedPrefs {
  return { ...p, [choice]: p[choice].filter((x) => x !== clipId) };
}

export function withSavedAt(p: FeedPrefs, clipId: string, at: number | null): FeedPrefs {
  const savedAt = { ...p.savedAt };
  if (at === null) delete savedAt[clipId];
  else savedAt[clipId] = at;
  return { ...p, savedAt };
}

/** A product clip reported here (once). */
export function withReported(p: FeedPrefs, clipId: string): FeedPrefs {
  return p.reported.includes(clipId) ? p : { ...p, reported: [...p.reported, clipId] };
}

// ─────────────────────────── Saved, one clip at a time ───────────────────────────

type ClipRef = { id: string; postId: string; kind: "project" | "product" };

/** The clips Saved lists: for each post on the web's Saved list (newest saved first), the clips
 *  of it this phone saved; a post saved on the web (or before clips were saved one by one) is its
 *  Project clip. `at` is null when this phone doesn't know when (kept as 0). */
export function savedRows<C extends ClipRef>(savedPosts: readonly string[], savedAt: Readonly<Record<string, number>>, clips: readonly C[]): { clip: C; at: number | null }[] {
  const out: { clip: C; at: number | null; i: number }[] = [];
  savedPosts.forEach((postId, i) => {
    const ofPost = clips.filter((c) => c.postId === postId);
    const marked = ofPost.filter((c) => savedAt[c.id] !== undefined);
    if (marked.length) for (const c of marked) out.push({ clip: c, at: savedAt[c.id] || null, i });
    else {
      const project = ofPost.find((c) => c.kind === "project");
      if (project) out.push({ clip: project, at: savedAt[postId] ?? null, i });
    }
  });
  return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || b.i - a.i).map(({ clip, at }) => ({ clip, at }));
}

/** Whether this clip is saved: its post is on the web's list and this clip is one `savedRows` lists. */
export function isClipSaved<C extends ClipRef>(clip: C, savedPosts: readonly string[], savedAt: Readonly<Record<string, number>>, clips: readonly C[]): boolean {
  return savedRows(savedPosts, savedAt, clips).some((r) => r.clip.id === clip.id);
}

/** Saving or unsaving one clip: the phone's note of it, and whether the post itself must go on or
 *  off the web's Saved list (on with its first clip, off with its last). */
export function savePlan<C extends ClipRef>(
  p: FeedPrefs,
  clip: C,
  savedPosts: readonly string[],
  clips: readonly C[],
  now: number,
): { prefs: FeedPrefs; togglePost: boolean; saved: boolean } {
  const rows = savedRows(savedPosts, p.savedAt, clips).filter((r) => r.clip.postId === clip.postId);
  const was = rows.some((r) => r.clip.id === clip.id);
  const savedAt = { ...p.savedAt };
  delete savedAt[clip.postId];
  // Keep what was listed for this post under its clips' own ids, then change this one.
  for (const r of rows) savedAt[r.clip.id] = r.at ?? 0;
  if (was) delete savedAt[clip.id];
  else savedAt[clip.id] = now;
  const left = rows.filter((r) => r.clip.id !== clip.id).length + (was ? 0 : 1);
  return { prefs: { ...p, savedAt }, togglePost: was ? left === 0 : !savedPosts.includes(clip.postId), saved: !was };
}

/** Why a caption can't be shared; null when it can (a caption is optional). */
export function captionProblem(caption: string): string | null {
  return caption.trim().length > CAPTION_MAX ? `Keep it under ${CAPTION_MAX} characters.` : null;
}

export function withShare(p: FeedPrefs, share: FeedShare): FeedPrefs {
  return { ...p, shares: [...p.shares, { ...share, caption: share.caption.trim().slice(0, CAPTION_MAX) }] };
}

/** How many times this phone shared a clip to its Feed. */
export const sharesOf = (p: FeedPrefs, clipId: string) => p.shares.filter((s) => s.clipId === clipId).length;

/** Takes one share off (the Timeline's ⋯ › Remove from your Feed). */
export function withoutShare(p: FeedPrefs, shareId: string): FeedPrefs {
  return { ...p, shares: p.shares.filter((s) => s.id !== shareId) };
}

/** Takes a clip off your Feed's shares (every share of it). */
export function withoutShares(p: FeedPrefs, clipId: string): FeedPrefs {
  return { ...p, shares: p.shares.filter((s) => s.clipId !== clipId) };
}

export const SPEEDS: readonly { value: number; label: string }[] = [
  { value: 0.5, label: "0.5" },
  { value: 0.75, label: "0.75" },
  { value: 1, label: "1 (Normal)" },
  { value: 1.25, label: "1.25" },
  { value: 1.5, label: "1.5" },
  { value: 1.75, label: "1.75" },
  { value: 2, label: "2" },
];

/** The Figma's quality ladder, top down. */
export const QUALITY_HEIGHTS: readonly number[] = [1080, 720, 640, 540, 480, 360];

/** The qualities a clip can really be drawn at: it comes as one file, so Auto and its own
 *  height are real; a height it doesn't have says so. `own` is null until the clip has loaded. */
export function qualityOptions(own: number | null): { value: VideoQuality; label: string; reason: string | null }[] {
  const near = own === null ? null : QUALITY_HEIGHTS.reduce((a, b) => (Math.abs(b - own) < Math.abs(a - own) ? b : a));
  return [
    { value: "auto", label: "Auto", reason: null },
    ...QUALITY_HEIGHTS.map((h) => ({
      value: String(h),
      label: `${h}p`,
      reason: near === h ? null : own === null ? "Loading the clip…" : `This clip comes in ${near}p only`,
    })),
  ];
}
