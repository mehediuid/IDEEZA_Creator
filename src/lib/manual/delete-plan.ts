// What deleting a project takes and what it keeps, in the words the delete
// dialog shows (COR-68, COR-69, COR-70). Pure: the dialog reads the stores
// when it opens and passes the facts in, so every line and the typed-name rule
// are unit-tested. Value imports stay relative — node runs this in the tests.

import type { StoredDraft } from "../brief/project-brief";
import { LICENSES, type Intent } from "../brief/types";
import type { MintStatus } from "../wallet/types";
import type { EditorWork, StepFact } from "./editor-work";
import { countLabel, formatDate, type ProjectStatus } from "./project-summary";

export type DeletePlanInput = {
  status: ProjectStatus;
  /** The project's own brief draft as read; null when there is none or it can't be read. */
  draft: StoredDraft | null;
  /** How many products the project lists (summary.productCount). */
  products: number;
  /** Every row the sweep removes (`editorWorkOfProject(p)`), read when the dialog opens: the sweep
   *  deletes every row's documents, so the plan lists them all (R2-C1). */
  rows: readonly { name: string; work: EditorWork }[];
  /** The project's network, when it has one. */
  network: { links: number } | null;
  /** summary.showcase !== null */
  showcased: boolean;
  /** The project's builds still in this browser, and how many of their chats still are. */
  builds: number;
  chats: number;
  // ── Phase 2 (§3.5.10): optional, so the v1 dialog still compiles ──
  /** P2-CONTRIB-15: how many people the contributors list holds. Delete is only offered once no
   *  co-owner holds a share, so these are the share-less ones. */
  contributors?: number;
  /** P2-TABS-9: the activity history and the files attached to it (IndexedDB `ideeza-media`). */
  activity?: { entries: number; files: number };
  /** P2-LISTING-19: the removed or closed listings the sweep drops (`dropProjectListings`). */
  endedListings?: number;
  /** `view.mint.status`: a MintRecord mint is recorded too, and an on-chain one gets its own note. */
  mint?: MintStatus;
};

export type DeletePlan = {
  /** "What goes", one line per thing, the project record first. */
  goes: string[];
  /** "What stays". */
  stays: string[];
  /** COR-70's line for a project minted in this browser; null otherwise. */
  minted: string | null;
  /** COR-69: ask for the typed name — only when any row's editor work, a mint record or a network would be lost. */
  typed: boolean;
};

export const MINTED_NOTE = "It was minted in this browser only — nothing on a blockchain changes.";
/** The on-chain note: a testnet-demo token is made in this browser too (decision 1). */
export const ON_CHAIN_NOTE = "It was minted on chain as a testnet demo in this browser — nothing on a real blockchain changes.";

const AIM: Record<Intent, string> = { sell: "to sell", give: "to give away", save: "to keep" };

/** The fact's text when the store holds something. editorWorkOf writes a
 *  leading 0 for a store that exists but holds nothing yet ("0 objects · 0 on
 *  the board", "0 of 2 parts checked"): nothing is lost, so it isn't listed
 *  and doesn't ask for the name. */
function lost(f: StepFact): string | null {
  return f.state === "work" && !/^0\b/.test(f.text) ? f.text : null;
}

/** Each editor step's line, in the order the dialog lists them. */
const STEP_LINES: readonly [keyof EditorWork, string][] = [
  ["pcb", "The PCB board"],
  ["wiring", "Wiring"],
  ["assembly", "Assembly checks"],
  ["code", "Code"],
  ["three", "The 3D model"],
  ["preview", "Preview"],
];

/** A row's lines, and whether any of them is work the maker would lose. */
function workLines(work: EditorWork): { lines: string[]; lost: boolean } {
  const lines: string[] = [];
  let anyLost = false;
  for (const [step, label] of STEP_LINES) {
    const text = lost(work[step]);
    if (text) {
      lines.push(`${label} — ${text}`);
      anyLost = true;
    } else if (step === "pcb" && work.pcb.state === "sample") {
      lines.push(`${label} — the sample circuit only`);
    }
  }
  return { lines, lost: anyLost };
}

export function deletePlanOf(input: DeletePlanInput): DeletePlan {
  const { status, draft, network } = input;
  const goes = [`The project — its name, description and ${countLabel(input.products)}`];
  const people = input.contributors ?? 0;
  if (people > 0) goes.push(`The contributors list — ${people} ${people === 1 ? "person" : "people"}`);

  // Every row's documents go; name the product once more than one row has something listed.
  const rows = input.rows.map((r) => ({ name: r.name, ...workLines(r.work) }));
  const listed = rows.filter((r) => r.lines.length > 0);
  for (const r of listed) goes.push(...(listed.length > 1 ? r.lines.map((l) => `${l} (${r.name})`) : r.lines));
  const workLost = rows.some((r) => r.lost);

  const brief = draft?.state ?? null;
  const mintedAt = brief?.mintedAt ?? null;
  if (brief && mintedAt !== null) {
    const on = formatDate(mintedAt);
    if (brief.intent === "give") {
      const licence = LICENSES.find((l) => l.value === brief.license)?.label;
      goes.push(
        licence
          ? `The brief — given under ${licence}, minted ${on}`
          : `The brief — given away, minted ${on}`,
      );
    } else if (brief.intent === "sell") {
      goes.push(`The brief — to sell, minted ${on}`);
    } else {
      goes.push(`The brief — kept private, minted ${on}`);
    }
  } else if (brief) {
    goes.push(
      brief.intent
        ? `The brief — in progress, ${AIM[brief.intent]}`
        : "The brief — started, no outcome chosen",
    );
  } else if (status === "minted") {
    goes.push("The mint record — its brief can't be read in this browser");
  }
  const record = input.mint === "lazyMinted" || input.mint === "onChain";
  if (record && mintedAt === null) {
    goes.push(input.mint === "onChain" ? "The mint record — minted on chain" : "The mint record — lazy minted");
  }

  const activity = input.activity;
  if (activity && activity.entries > 0) {
    const entries = `${activity.entries} ${activity.entries === 1 ? "entry" : "entries"}`;
    const files = activity.files > 0 ? ` and ${activity.files} activity ${activity.files === 1 ? "file" : "files"}` : "";
    goes.push(`The activity history — ${entries}${files}`);
  }

  if (network) {
    goes.push(
      network.links > 0
        ? `The network — ${network.links} ${network.links === 1 ? "link" : "links"}`
        : "The network — no links drawn yet",
    );
  }
  if (input.showcased) goes.push("Showcase — it leaves your Showcase tab");
  const ended = input.endedListings ?? 0;
  if (ended > 0) goes.push(`Its marketplace history — ${ended} ended ${ended === 1 ? "listing" : "listings"}`);

  const stays = input.builds > 0 ? [buildsLine(input.builds, input.chats)] : [];
  const mintRecord = mintedAt !== null || status === "minted" || record;
  return {
    goes,
    stays,
    minted: input.mint === "onChain" ? ON_CHAIN_NOTE : mintRecord ? MINTED_NOTE : null,
    typed: workLost || mintRecord || network !== null,
  };
}

/** "Its 2 builds and the chat stay in History — you can save them as a project again." */
function buildsLine(builds: number, chats: number): string {
  const what = builds === 1 ? "Its build" : `Its ${builds} builds`;
  const withChats = chats === 0 ? "" : chats === 1 ? " and the chat" : ` and their ${chats} chats`;
  const verb = builds === 1 && chats === 0 ? "stays" : "stay";
  return `${what}${withChats} ${verb} in History — you can save ${builds === 1 ? "it" : "them"} as a project again.`;
}

/** §5.1.10: the trimmed entry equals the trimmed project name, case and all. */
export function matchesTypedName(entry: string, name: string): boolean {
  return entry.trim() === name.trim();
}
