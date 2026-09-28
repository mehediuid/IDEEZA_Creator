// The description's join sentence and the "Update with AI" prompt (P2-SAVE-4,
// P2-SAVE-8, P2-TABS-21 as changed). Pure, and with no import at all: the
// save step's prefill (save-step.ts re-exports these), the description
// editors and `/api/refine`'s "project" fallback all run this one file, so
// the prefill and the fallback can never say different things — and a route
// handler can import it, which it can't do with projects.tsx ("use client").

/** One product's words, as the join and the prompt read them. */
export type DescribedProduct = { name: string; description: string };

/** PROJECT_DESC_MAX (projects.tsx). Repeated here because that module is a
 *  client module; tests/projects/describe.test.mjs holds the two equal. */
export const DESCRIBE_MAX = 1000;

/** Characters as a person counts them: an emoji is one, not two UTF-16 units (CNT-2). */
function clip(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join("") : s;
}

/** "A, B and C". */
function joinNames(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The join sentence: the first product's own sentence (the first product that
 * has one), then " Comes with " and every other product's name as
 * "A, B and C", then ".". Only words the products already hold. A sentence
 * with no end stop gets one before "Comes with". Clipped to 1,000 characters.
 * For example "A two-motor RC car with an ESP32 brain. Comes with Remote
 * Controller, Battery Charger and Spare Battery Pack."
 */
export function joinDescriptions(products: readonly DescribedProduct[]): string {
  const list = products.filter((p) => p.name.trim() || p.description.trim());
  if (!list.length) return "";
  const lead = list.find((p) => p.description.trim()) ?? list[0];
  const sentence = lead.description.trim();
  const rest = list
    .filter((p) => p !== lead)
    .map((p) => p.name.trim())
    .filter(Boolean);
  if (!rest.length) return clip(sentence, DESCRIBE_MAX);
  const stopped = !sentence || /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`;
  return clip(`${stopped ? `${stopped} ` : ""}Comes with ${joinNames(rest)}.`, DESCRIBE_MAX);
}

/** The "project" mode's prompt: one "{name}: {description}" line per product. */
export function describePromptOf(products: readonly DescribedProduct[]): string {
  return products
    .map((p) => {
      const name = p.name.trim();
      const text = p.description.trim().replace(/\s+/g, " ");
      return name && text ? `${name}: ${text}` : name || text;
    })
    .filter(Boolean)
    .join("\n");
}

/** "Update with AI" shows only once two or more products have a description
 *  (Figma 41505:136211, "Multiple Product Need to update project description"). */
export function describableCount(products: readonly DescribedProduct[]): number {
  return products.filter((p) => p.description.trim().length > 0).length;
}

/**
 * P2-TABS-22: whether the description coachmark is due for a project whose
 * rows are `products`. Two or more products, two or more of them described
 * (so "Update with AI" has something to bring together), and — once
 * dismissed with Not now, or by a description saved after a run — only again
 * when the project has more products than it had then.
 */
export function coachmarkDueOf(
  products: readonly DescribedProduct[],
  hint: { dismissedAt: number; productCount: number } | undefined,
): boolean {
  if (products.length < 2 || describableCount(products) < 2) return false;
  return !hint || products.length > hint.productCount;
}
