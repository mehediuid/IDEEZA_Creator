// The one text model the AI helper routes ask (owner, 2026-10-27: move off the anonymous queue
// that made a third of testers wait 45 s): Groq's gpt-oss-20b when GROQ_API_KEY is set, with
// Pollinations as the next try; Pollinations alone without a key.
import { test } from "node:test";
import assert from "node:assert/strict";

const { textAttempts, contentOf, askText, GROQ_URL, POLLINATIONS_URL, TEXT_BUDGET_MS } = await import(
  "../../.tmp-test/lib/server/text-model.js"
);

const ask = { system: "Answer in JSON.", user: "a lamp", json: true };

test("without a key: Pollinations only, as before", () => {
  const [only, ...rest] = textAttempts(ask, {});
  assert.equal(rest.length, 0);
  assert.equal(only.provider, "pollinations");
  assert.equal(only.url, POLLINATIONS_URL);
  assert.deepEqual(only.body, {
    model: "openai-fast",
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Answer in JSON." },
      { role: "user", content: "a lamp" },
    ],
  });
  assert.equal(only.headers.Authorization, undefined);
});

test("with a key: Groq first, then Groq's other model, then Pollinations", () => {
  const [groq, spare, next] = textAttempts(ask, { GROQ_API_KEY: " gsk_test " });
  assert.equal(groq.provider, "groq");
  assert.equal(groq.url, GROQ_URL);
  assert.equal(groq.headers.Authorization, "Bearer gsk_test");
  assert.equal(groq.body.model, "openai/gpt-oss-20b");
  assert.equal(groq.body.reasoning_effort, "low");
  assert.equal(groq.body.include_reasoning, false);
  assert.deepEqual(groq.body.response_format, { type: "json_object" });
  assert.ok(groq.waitMs + spare.waitMs < TEXT_BUDGET_MS, "a stuck Groq still leaves Pollinations time");
  // Groq counts each model's allowance on its own: a full first model hands over to the second.
  assert.equal(spare.provider, "groq");
  assert.equal(spare.body.model, "openai/gpt-oss-120b");
  assert.equal(spare.headers.Authorization, "Bearer gsk_test");
  assert.equal(next.provider, "pollinations");
  const chosen = textAttempts(ask, { GROQ_API_KEY: "k", GROQ_TEXT_MODEL: "openai/gpt-oss-120b" });
  assert.deepEqual(chosen.map((a) => a.model), ["openai/gpt-oss-120b", "openai-fast"], "no second try of the same model");
});

test("a conversation goes after the system message, as it was", () => {
  const turns = [
    { role: "user", content: "add a LED" },
    { role: "assistant", content: "done" },
    { role: "user", content: "now a button" },
  ];
  for (const a of textAttempts({ system: "s", user: turns, json: true }, { GROQ_API_KEY: "k" })) {
    assert.deepEqual(a.body.messages, [{ role: "system", content: "s" }, ...turns]);
  }
});

test("plain text asks send no JSON format", () => {
  for (const a of textAttempts({ system: "s", user: "u" }, { GROQ_API_KEY: "k" })) {
    assert.equal(a.body.response_format, undefined);
  }
});

test("the answer is the first choice's text; anything else is no answer", () => {
  assert.equal(contentOf({ choices: [{ message: { content: " hi " } }] }), "hi");
  assert.equal(contentOf({ choices: [{ message: { content: "" } }] }), null);
  assert.equal(contentOf({ choices: [{ message: { reasoning: "thinking" } }] }), null);
  assert.equal(contentOf({}), null);
  assert.equal(contentOf(null), null);
});

/** A fetch that answers per URL from a script, and records what it was asked. */
function fakeFetch(script) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
    const step = script[url]?.shift();
    if (!step) throw new Error("no answer");
    if (step === "throw") throw new Error("unreachable");
    return {
      ok: step.status === 200,
      status: step.status,
      json: async () => ({ choices: [{ message: { content: step.content ?? "" } }] }),
    };
  };
  f.calls = calls;
  return f;
}
const clock = () => 0;

test("Groq answers: Pollinations is never asked", async () => {
  const fetch = fakeFetch({ [GROQ_URL]: [{ status: 200, content: '{"ok":true}' }] });
  assert.equal(await askText(ask, { fetch, env: { GROQ_API_KEY: "k" }, now: clock }), '{"ok":true}');
  assert.deepEqual(fetch.calls.map((c) => c.url), [GROQ_URL]);
});

test("the first Groq model full: the other one answers", async () => {
  const fetch = fakeFetch({ [GROQ_URL]: [{ status: 429 }, { status: 200, content: "from 120b" }] });
  assert.equal(await askText(ask, { fetch, env: { GROQ_API_KEY: "k" }, now: clock }), "from 120b");
  assert.deepEqual(fetch.calls.map((c) => c.body.model), ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
});

test("both Groq models rate-limited, failing or unreachable: Pollinations answers instead", async () => {
  for (const groq of [{ status: 429 }, { status: 500 }, "throw", { status: 200, content: "" }]) {
    const fetch = fakeFetch({ [GROQ_URL]: [groq, groq], [POLLINATIONS_URL]: [{ status: 200, content: "from pollinations" }] });
    assert.equal(await askText(ask, { fetch, env: { GROQ_API_KEY: "k" }, now: clock }), "from pollinations");
    assert.deepEqual(fetch.calls.map((c) => c.url), [GROQ_URL, GROQ_URL, POLLINATIONS_URL]);
    assert.equal(fetch.calls[2].auth, undefined, "the Groq key never goes to Pollinations");
  }
});

test("no model answers: null, so the route falls back as it always has", async () => {
  const fetch = fakeFetch({ [GROQ_URL]: [{ status: 503 }, { status: 503 }], [POLLINATIONS_URL]: [{ status: 429 }] });
  assert.equal(await askText(ask, { fetch, env: { GROQ_API_KEY: "k" }, now: clock }), null);
  assert.equal(await askText(ask, { fetch: fakeFetch({}), env: {}, now: clock }), null);
});

test("the whole ask stays inside one budget: no second try once it is spent", async () => {
  let t = 0;
  const now = () => t;
  const fetch = async (url) => {
    t = TEXT_BUDGET_MS; // the first try used it all
    if (url === GROQ_URL) return { ok: false, status: 429, json: async () => ({}) };
    throw new Error("should not be asked");
  };
  assert.equal(await askText(ask, { fetch, env: { GROQ_API_KEY: "k" }, now }), null);
});
