// How another creator is connected to you, said from your side (owner rule:
// everyone is a creator; a person is named by what they did with your work,
// never as a type). One line under their name on their profile, shown only to
// you: a money tie is between the two of you and nobody else (D10). The most
// recent tie wins. Pure, relative imports only.

import type { PersonId } from "./ids";

type TieSale = {
  projectId: string;
  buyerId: string;
  at: number;
  item: { nft: "main"; sharePct: number } | { nft: "physical" | "virtual"; productId: string; productName: string };
};

export type TieCtx = {
  /** Your projects (every project in this browser is yours). */
  projects: readonly { id: string; name: string }[];
  sales: readonly TieSale[];
  teams: readonly { projectId: string; members: readonly { id: string; role: string }[] }[];
};

const KIND_WORD = { physical: "Physical", virtual: "Virtual" } as const;

export function tiesOf(other: PersonId, ctx: TieCtx): string | null {
  const nameOf = (projectId: string) => ctx.projects.find((p) => p.id === projectId)?.name.trim() || "Untitled project";
  const lines: { at: number; text: string }[] = [];
  for (const t of ctx.teams) {
    const m = t.members.find((x) => x.id === other);
    if (m && ctx.projects.some((p) => p.id === t.projectId)) lines.push({ at: 0, text: `${m.role} on your ${nameOf(t.projectId)}` });
  }
  const byProject = new Map<string, TieSale[]>();
  for (const s of ctx.sales) {
    if (s.buyerId !== other || !ctx.projects.some((p) => p.id === s.projectId)) continue;
    byProject.set(s.projectId, [...(byProject.get(s.projectId) ?? []), s]);
  }
  for (const [projectId, sales] of byProject) {
    const name = nameOf(projectId);
    const at = Math.max(...sales.map((s) => s.at));
    const share = sales.reduce((sum, s) => sum + (s.item.nft === "main" ? s.item.sharePct : 0), 0);
    const copies = sales.filter((s) => s.item.nft !== "main");
    if (share > 0) {
      lines.push({ at, text: `Holds ${share}% of your ${name}` });
    } else if (copies.length === 1) {
      const item = copies[0].item as { nft: "physical" | "virtual"; productId: string; productName: string };
      const what = item.productId === "project" || item.productName === name ? name : item.productName;
      lines.push({ at, text: `Owns a ${KIND_WORD[item.nft]} copy of your ${what}` });
    } else if (copies.length > 1) {
      lines.push({ at, text: `Owns ${copies.length} copies from your ${name}` });
    }
  }
  if (!lines.length) return null;
  return lines.sort((a, b) => b.at - a.at)[0].text;
}
