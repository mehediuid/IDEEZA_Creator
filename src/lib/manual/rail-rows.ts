// The words the rail's Editor, Versions and Project log blocks print, worked
// out from the page's one derivation (COR-74) so the blocks render strings and
// never decide them. Pure — no React, no storage. Value imports are relative:
// tsc leaves `@/` as it is in its output, and node:test loads the compiled
// module without a bundler.

import { NETWORKS, type Intent } from "../brief/types";
import type { StepFact } from "./editor-work";
import type { Lineage, ProjectLogEntry, ProjectVersion } from "./project-read";
import {
  LISTED_SUBLINE,
  STATUS_WORD,
  formatDateTime,
  type MetaPart,
  type ProjectStatus,
} from "./project-summary";
import { timePart } from "./showcase-copy";

/** What a fact reads before the idle read has run (COR-61), and nowhere else. */
export const NOT_READ = "—";

/** The Versions block shows this many versions, then "Show all ({n})" (§5.1.10). */
export const VERSIONS_SHOWN = 5;

/** The Project log shows this many entries, then "Show all ({n})" (COR-52). */
export const LOG_SHOWN = 6;

/** A date in the one formatter, "Sep 26, 2026 · 9:09 PM", inside `<time>` (COR-52, COR-107). */
function when(at: number): MetaPart {
  return timePart(at, formatDateTime(at));
}

// ───────────────────────── Editor (COR-59, COR-60) ─────────────────────────

/** One editor step's fact: what the project's own document says, or nothing
 *  at all. Never a status word — no "Done", "Not started" or "{n} of 7".
 *  `undefined` is "not read yet" (COR-61). */
export function stepFactText(fact: StepFact | undefined): string | null {
  if (!fact) return NOT_READ;
  switch (fact.state) {
    case "not-opened":
      return "Not opened";
    case "sample":
      return "Sample circuit only";
    case "work":
      return fact.text;
    case "none":
      return null;
  }
}

// ───────────────────────── Project log (COR-52) ─────────────────────────

export type LogLine = {
  key: string;
  /** "Created by hand" · "Minted · Listed · Base Sepolia (Testnet)" · "Showcased" */
  title: string;
  /** A second line only where the title can't stand alone: a Listed mint
   *  carries its subline until a marketplace exists (COM-19, COR-76). */
  note: string | null;
  /** The entry's date, in `<time>`. */
  when: MetaPart[];
};

/** What each intent mints into — the status words' own table, so the log can
 *  never name an outcome the chip doesn't. */
const MINTED_AS: Record<Intent, ProjectStatus> = {
  save: "private",
  give: "given",
  sell: "listed",
};

/** The log's lines, in projectLogOf()'s order (newest first). Only events that
 *  aren't versions: every save and build is the Versions block's (COR-107,
 *  §7 X39). A rename isn't recorded anywhere yet — `updatedAt` moves on every
 *  edit, so it can't stand in for one — and has no line until the stored log
 *  that records it (COR-53, NEXT).
 *  `network: false` leaves the chain out of a mint's title — a buyer's
 *  preview hides Outcome, the block that names it (PPL-7), so the log
 *  doesn't name it either. */
export function logLinesOf(entries: ProjectLogEntry[], { network: showNetwork = true }: { network?: boolean } = {}): LogLine[] {
  return entries.flatMap((e): LogLine[] => {
    if (e.kind === "created") {
      return [{ key: `created:${e.at}`, title: "Created by hand", note: null, when: [when(e.at)] }];
    }
    if (e.kind === "showcased") {
      return [{ key: `showcased:${e.at}`, title: "Showcased", note: null, when: [when(e.at)] }];
    }
    // The Phase 2 kinds (mint, listing, market, editions, business plan) get their lines in T10;
    // nothing produces them before then.
    if (e.kind !== "minted") return [];
    const status = MINTED_AS[e.intent];
    const network = NETWORKS.find((n) => n.value === e.network)?.label ?? e.network;
    return [
      {
        key: `minted:${e.at}`,
        title: `Minted · ${STATUS_WORD[status]}${showNetwork ? ` · ${network}` : ""}`,
        note: status === "listed" ? `${LISTED_SUBLINE}.` : null,
        when: [when(e.at)],
      },
    ];
  });
}

// ───────────────────────── Versions (COR-106, COR-107) ─────────────────────────

/** A product name in a version row: a link to its page at that version, or
 *  plain text when no project row stands behind it. */
export type VersionItem = { name: string; href: string | null };

export type VersionLine = {
  label: "Products" | "Added" | "Dropped" | "Changed";
  items: VersionItem[];
};

export type VersionRow = {
  /** The build id: one build is one version. */
  key: string;
  /** "Version 2 · current" */
  title: string;
  /** "Saved Sep 26, 2026 · 4:12 PM"; null when the save time was never recorded. */
  saved: MetaPart[] | null;
  /** "15 of 15 pieces ready" · "Needs a retry"; null when the build is gone. */
  pieces: string | null;
  /** Open build ↗; null when the build isn't in this browser. */
  buildHref: string | null;
  /** The build isn't in this browser: the row says so and lists no products. */
  gone: boolean;
  /** "Products" when there is nothing to compare against (version 1, or the
   *  build before is gone); otherwise the Added, Dropped and Changed lines,
   *  each only when it names something. */
  lines: VersionLine[];
};

export type VersionGroup = {
  key: string;
  /** Chat “Car” · Chat “Car” · not in this browser · Chat not in this browser */
  heading: string;
  /** /chat/<id> while the chat is in this browser; plain text otherwise (COR-78). */
  chatHref: string | null;
  rows: VersionRow[];
};

/** A product's page at one version (COR-41): `/projects/[id]/products/[productId]?v={n}`. */
export function productAtVersionHref(projectId: string, rowId: string, version: number): string {
  return `/projects/${encodeURIComponent(projectId)}/products/${encodeURIComponent(rowId)}?v=${version}`;
}

/** A diff entry is a row id, or the product's name where no row matched
 *  (versionsOf). It is resolved against the version that holds the product. */
function itemOf(v: ProjectVersion | null, entry: string, projectId: string): VersionItem {
  const p =
    v?.products.find((x) => x.rowId === entry) ??
    v?.products.find((x) => x.rowId === null && x.name === entry);
  if (!v || !p) return { name: entry, href: null };
  return { name: p.name, href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null };
}

/** The Versions block: one group per lineage, each newest first — versionsOf()'s
 *  own order, so the block and the product page's version select read one
 *  list (COR-106). A lineage whose chat is gone (`Lineage.chat === null`) has a
 *  plain heading. */
export function versionGroupsOf(
  versions: ProjectVersion[][],
  lineages: Lineage[],
  projectId: string,
): VersionGroup[] {
  return versions
    .filter((lineage) => lineage.length > 0)
    .map((lineage) => {
      const head = lineage[0];
      const chat = lineages.find((l) => l.chatId === head.chatId)?.chat ?? null;
      const heading =
        head.chatId === null
          ? "Chat not in this browser"
          : chat
            ? `Chat “${head.lineage}”`
            : `Chat “${head.lineage}” · not in this browser`;
      return {
        key: head.chatId ?? `no-chat:${head.buildId}`,
        heading,
        chatHref: chat ? `/chat/${encodeURIComponent(chat.id)}` : null,
        rows: lineage.map((v, i): VersionRow => {
          // Newest first, so the version before this one is the next entry.
          const before = lineage[i + 1] ?? null;
          const gone = v.job === null;
          const lines: VersionLine[] = [];
          if (!gone && v.diff) {
            const push = (label: VersionLine["label"], entries: string[], at: ProjectVersion | null) => {
              if (entries.length) lines.push({ label, items: entries.map((e) => itemOf(at, e, projectId)) });
            };
            push("Added", v.diff.added, v);
            // A dropped product isn't in this version: its link opens the version before.
            push("Dropped", v.diff.dropped, before);
            push("Changed", v.diff.changed, v);
          } else if (!gone && v.products.length) {
            lines.push({
              label: "Products",
              items: v.products.map((p) => ({
                name: p.name,
                href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null,
              })),
            });
          }
          return {
            key: v.buildId,
            title: `Version ${v.version}${v.current ? " · current" : ""}`,
            saved: v.savedAt === null ? null : [{ kind: "text", text: "Saved " }, when(v.savedAt)],
            pieces: v.pieces
              ? v.pieces.retry
                ? "Needs a retry"
                : `${v.pieces.ready} of ${v.pieces.total} pieces ready`
              : null,
            buildHref: gone ? null : `/build/${encodeURIComponent(v.buildId)}`,
            gone,
            lines,
          };
        }),
      };
    });
}

/** How many versions the groups hold, across every lineage. */
export function versionCountOf(groups: VersionGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}

/** The first `limit` versions in block order, each group keeping its heading
 *  over what of it is shown. The cap counts the whole project (§5.1.10); a
 *  group past it is left out whole. */
export function firstVersions(groups: VersionGroup[], limit: number): VersionGroup[] {
  const out: VersionGroup[] = [];
  let left = limit;
  for (const g of groups) {
    if (left <= 0) break;
    const rows = g.rows.slice(0, left);
    out.push({ ...g, rows });
    left -= rows.length;
  }
  return out;
}
