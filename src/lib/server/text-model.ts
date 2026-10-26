// The one text model every AI helper route asks (concept summary and companions, refine, the
// code assistant, Auto-Map, profile headline, business plan, video storyboard).
//
// Measured on the live site (2026-10-27): with 3–4 testers at once, Pollinations' anonymous
// queue kept a third of them waiting the full 45 s and a quarter got a route's stand-in instead
// of a reading. So with GROQ_API_KEY set the ask goes to Groq first — openai/gpt-oss-20b, the
// same open model Pollinations serves as `openai-fast` (GROQ_TEXT_MODEL picks another). Groq's
// free plan allows each model 8,000 tokens a minute and 1,000 requests a day, counted per model,
// and an idea's summary and companions use about 1,500: so a model that is full hands over to
// openai/gpt-oss-120b (same family, its own allowance), and Pollinations is the last try.
// Without a key it is Pollinations alone, as before. All are OpenAI-shaped; the reasoning stays
// out of `content`.
//
// The routes keep their own prompts, parsing and fallbacks: this returns the model's text, or
// null when no model answered within the budget.

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const GROQ_MODEL = "openai/gpt-oss-20b";
/** Asked when the first is full: the same family, with an allowance of its own. */
const GROQ_SPARE_MODEL = "openai/gpt-oss-120b";

/** How long a route waits for any answer: the routes run on Node (Vercel ends an edge function
 *  that hasn't started answering in 25 s). */
export const TEXT_BUDGET_MS = 45_000;
/** Groq answers in seconds (a full model says so at once); one still silent by then is stuck. */
const GROQ_WAIT_MS = 15_000;
/** Too little left to be worth a second try. */
const LAST_TRY_MS = 1_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** `user` is one message, or a conversation that ends with the user's turn (the code assistant). */
export type TextAsk = { system: string; user: string | ChatTurn[]; json?: boolean };

export type TextEnv = { GROQ_API_KEY?: string; GROQ_TEXT_MODEL?: string };

export type TextAttempt = {
  provider: "groq" | "pollinations";
  model: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  waitMs: number;
};

/** Who is asked, in order, and how. */
export function textAttempts(ask: TextAsk, env: TextEnv): TextAttempt[] {
  const messages = [
    { role: "system", content: ask.system },
    ...(typeof ask.user === "string" ? [{ role: "user", content: ask.user }] : ask.user),
  ];
  const format = ask.json ? { response_format: { type: "json_object" } } : {};
  const pollinations: TextAttempt = {
    provider: "pollinations",
    model: "openai-fast",
    url: POLLINATIONS_URL,
    headers: { "Content-Type": "application/json" },
    body: { model: "openai-fast", reasoning_effort: "low", ...format, messages },
    waitMs: TEXT_BUDGET_MS,
  };
  const key = env.GROQ_API_KEY?.trim();
  if (!key) return [pollinations];
  const first = env.GROQ_TEXT_MODEL?.trim() || GROQ_MODEL;
  const groq = (model: string): TextAttempt => ({
    provider: "groq",
    model,
    url: GROQ_URL,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: { model, reasoning_effort: "low", include_reasoning: false, ...format, messages },
    waitMs: GROQ_WAIT_MS,
  });
  const models = first === GROQ_SPARE_MODEL ? [first] : [first, GROQ_SPARE_MODEL];
  return [...models.map(groq), pollinations];
}

/** The first choice's text; null for anything else. */
export function contentOf(envelope: unknown): string | null {
  const content = (envelope as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : "";
  return text || null;
}

type Fetch = (url: string, init: { method: string; signal: AbortSignal; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type TextDeps = { fetch: Fetch; env: TextEnv; now: () => number };

const live = (): TextDeps => ({
  fetch: globalThis.fetch as Fetch,
  env: { GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_TEXT_MODEL: process.env.GROQ_TEXT_MODEL },
  now: Date.now,
});

export async function askText(ask: TextAsk, deps: TextDeps = live()): Promise<string | null> {
  const start = deps.now();
  const attempts = textAttempts(ask, deps.env);
  for (const attempt of attempts) {
    const left = TEXT_BUDGET_MS - (deps.now() - start);
    if (left <= LAST_TRY_MS) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(attempt.waitMs, left));
    let why: string;
    try {
      const res = await deps.fetch(attempt.url, {
        method: "POST",
        signal: ctrl.signal,
        headers: attempt.headers,
        body: JSON.stringify(attempt.body),
      });
      if (res.ok) {
        const text = contentOf(await res.json());
        if (text) return text;
        why = "an empty answer";
      } else {
        why = `HTTP ${res.status}`;
      }
    } catch {
      why = ctrl.signal.aborted ? "no answer in time" : "unreachable";
    } finally {
      clearTimeout(timer);
    }
    // In the function's log, so a slow day shows which model let the testers down.
    console.warn(`[text-model] ${attempt.provider} ${attempt.model}: ${why}`);
  }
  return null;
}
