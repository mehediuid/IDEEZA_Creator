// POST /api/business-plan/section (P2-TABS-20)
//
// Writes one business-plan section at a time — the client runner
// (plan-runner.tsx) calls this once per section rather than asking for the
// whole plan in one shot, so progress is real and a bad reply only loses one
// section, not the run. Same client settings as /api/concept/summarize:
// Pollinations' free text model, Node runtime, a 45 s bound, one request at a
// time (the runner never calls this twice in parallel for one project).
//
// Request:  { prompt, section: SectionKind | { title, brief }, context, instruction? }
// Response: { fields } on success, or 503 { error: "unavailable" } — never
//           fallback content (CNT-68): a section either was written, or the
//           maker sees "Couldn't write {Section}" and tries again.
//
// The heading list below mirrors business-plan.ts's own `REQUIRED_HEADINGS`
// (T08, not exported — it's that file's private parser detail). If a section
// kind's required headings change there, this prompt has to change with it;
// `parsePlanSection` is the one source of truth for what actually validates.

import { NextResponse } from "next/server";
import { PLAN_SECTIONS, parsePlanSection, type SectionKind } from "@/lib/manual/business-plan";

export const runtime = "nodejs";

const REQUIRED_HEADINGS: Record<SectionKind, readonly string[]> = {
  identity: ["Tagline", "Mission", "Audience"],
  brand: ["Voice", "Values", "Personality"],
  market: ["Size", "Trends", "Competitors"],
  swot: ["Strengths", "Weaknesses", "Opportunities", "Threats"],
  pricing: ["Tiers"],
  problem: ["Problem", "Solution"],
  landing: ["Headline", "Subheadline", "Cta"],
};

const SECTION_GUIDANCE: Record<SectionKind, string> = {
  identity:
    "Tagline: one punchy line, at most 80 characters. " +
    "Mission: 1-2 sentences on why this product exists. " +
    "Audience: 1-2 sentences naming who buys this and why they need it.",
  brand: "Voice: 1-2 sentences describing how the brand sounds. Values: 3-5 bullet points, one per line starting with '-'. Personality: 1 sentence, 3-4 adjectives.",
  market:
    "Size: one sentence with a plausible market-size estimate (mark it as an estimate in tone, not researched). " +
    "Trends: 3-4 bullet points, one per line starting with '-'. " +
    "Competitors: 3-4 bullet points naming a type of competitor and how this product differs, one per line starting with '-'.",
  swot:
    "Strengths, Weaknesses, Opportunities and Threats: 3-4 bullet points each, one per line starting with '-'. Be specific to this product, not generic.",
  pricing:
    "Tiers: 2-3 lines, one per pricing tier, each formatted EXACTLY as `Name | Price | Cadence | Feature one | Feature two | Feature three` " +
    "(pipe-separated, no leading dash). Price is a plausible number with a currency symbol. Cadence is a short word like 'one-time' or 'per month'.",
  problem: "Problem: 1-2 sentences on the problem this product solves. Solution: 1-2 sentences on how this product solves it.",
  landing: "Headline: at most 12 words. Subheadline: one sentence expanding the headline. Cta: 2-4 words, an imperative button label.",
};

function headingSystemPrompt(kind: SectionKind): string {
  const headings = REQUIRED_HEADINGS[kind].join(" / ");
  return (
    `You are writing ONE section — "${kind}" — of a short business plan for the product described by the user. ` +
    "Reply in PLAIN TEXT only: no markdown headers, no code fences, no preamble, no closing remarks. " +
    `Use EXACTLY these headings, each alone on its own line with nothing else on it, in this order: ${headings}. ` +
    "Put that section's content on the line(s) right after its heading, before the next heading. " +
    `${SECTION_GUIDANCE[kind]} ` +
    "Never invent numbers you present as verified fact — where a figure is a guess, its wording should read as an estimate. " +
    "Base everything on the product description and the earlier sections given as context; stay consistent with them."
  );
}

function customSectionSystemPrompt(title: string, brief: string): string {
  return (
    `You are writing ONE new section of a business plan, titled "${title}". ` +
    `${brief ? `The maker asked for it to cover: ${brief}. ` : ""}` +
    "Reply in PLAIN TEXT only: no markdown headers, no code fences, no preamble, no closing remarks, no title line — " +
    "just the section's own content, as one or more short paragraphs (blank line between paragraphs) and, where it helps, a bullet list with lines starting with '-'. " +
    "Base it on the product description and the earlier sections given as context; stay consistent with them."
  );
}

/** Custom sections have no fixed shape to validate against (parsePlanSection
 *  only knows the seven fixed kinds) — this file's own minimal parser: reject
 *  an empty reply, otherwise keep every non-empty paragraph/bullet line. */
function parseCustomSection(text: string): { body: string[] } | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);
  return lines.length ? { body: lines } : null;
}

function unfence(text: string): string {
  const fenced = text.match(/```(?:text)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

async function writeWithAI(system: string, userText: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai-fast",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const envelope = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = envelope.choices?.[0]?.message?.content;
    const text = unfence(typeof content === "string" ? content : "");
    return text || null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

type SectionArg = SectionKind | { title: string; brief: string };

function isSectionKind(v: unknown): v is SectionKind {
  return typeof v === "string" && (PLAN_SECTIONS as readonly string[]).includes(v);
}

function isCustomSection(v: unknown): v is { title: string; brief: string } {
  return typeof v === "object" && v !== null && typeof (v as { title?: unknown }).title === "string";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const prompt = typeof fields.prompt === "string" ? fields.prompt.trim() : "";
  const section: SectionArg | null = isSectionKind(fields.section) ? fields.section : isCustomSection(fields.section) ? fields.section : null;
  const context = typeof fields.context === "string" ? fields.context.slice(0, 2000) : "";
  const instruction = typeof fields.instruction === "string" ? fields.instruction.trim() : undefined;

  if (!prompt || !section) {
    return NextResponse.json({ error: "prompt and section are required" }, { status: 400 });
  }

  const userText = [
    `Product: ${prompt}`,
    context ? `Earlier sections, for consistency:\n${context}` : null,
    instruction ? `Revision instruction: ${instruction}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const system = typeof section === "string" ? headingSystemPrompt(section) : customSectionSystemPrompt(section.title, section.brief ?? "");
  const text = await writeWithAI(system, userText);
  if (!text) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const parsedFields = typeof section === "string" ? parsePlanSection(section, text) : parseCustomSection(text);
  if (!parsedFields) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.json({ fields: parsedFields });
}
