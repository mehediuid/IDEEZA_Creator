// Contact support on the phone (mobile Figma "Contact support · Live chat").
// IDEEZA has no live agents, so nothing here pretends one is typing: each
// message you send goes to the IDEEZA team as a problem report (the web's
// /api/reports, kind "other"), and the thread answers with the report's
// reference and that the team replies by email. The thread itself — your
// messages, their state and the references — is kept in this browser under
// `ideeza:support:chat`, newest last, the last CHAT_MAX kept.
//
// Pure apart from the guarded localStorage read and write; no imports.

export const SUPPORT_CHAT_KEY = "ideeza:support:chat";
export const CHAT_MAX = 100;
export const MESSAGE_MAX = 2000;

export type ChatState = "sending" | "sent" | "failed";

export type ChatMessage = {
  /** The report id the message is sent under (32 hex), so a retry sends the same report. */
  id: string;
  text: string;
  at: number;
  state: ChatState;
  /** The team's reference once it arrived: "R-7F3A2C". */
  ref?: string;
  /** How many screenshots went with it (the pictures themselves aren't kept here). */
  images?: number;
};

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const STATES: readonly ChatState[] = ["sending", "sent", "failed"];

function normalizeMessage(raw: unknown): ChatMessage | null {
  if (!isDict(raw) || typeof raw.id !== "string" || !/^[0-9a-f]{32}$/.test(raw.id)) return null;
  const text = typeof raw.text === "string" ? raw.text.slice(0, MESSAGE_MAX) : "";
  const at = typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : null;
  const state = STATES.find((s) => s === raw.state);
  if ((!text.trim() && !raw.images) || at === null || !state) return null;
  // A send the page didn't live to finish is a failure to retry, not a send in flight forever.
  const m: ChatMessage = { id: raw.id, text, at, state: state === "sending" ? "failed" : state };
  if (typeof raw.ref === "string" && /^R-[0-9A-F]{6}$/.test(raw.ref)) m.ref = raw.ref;
  if (typeof raw.images === "number" && raw.images > 0) m.images = Math.min(3, Math.floor(raw.images));
  return m;
}

export function normalizeChat(raw: unknown): ChatMessage[] {
  return (Array.isArray(raw) ? raw : []).map(normalizeMessage).filter((m): m is ChatMessage => m !== null).slice(-CHAT_MAX);
}

/** The thread with `m` added, or replaced when its id is already there. */
export function putMessage(list: readonly ChatMessage[], m: ChatMessage): ChatMessage[] {
  const at = list.findIndex((x) => x.id === m.id);
  const next = at === -1 ? [...list, m] : list.map((x, i) => (i === at ? m : x));
  return next.slice(-CHAT_MAX);
}

export function readChat(): ChatMessage[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(SUPPORT_CHAT_KEY);
    return raw ? normalizeChat(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** `false`: the browser refused the write. */
export function writeChat(list: readonly ChatMessage[]): boolean {
  try {
    window.localStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
