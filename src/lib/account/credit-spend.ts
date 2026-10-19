// Where credits went, by project (Settings › Plan & billing › Credits).
//
// A charge is a build (keyed by the build's id) or a concept drawing (keyed
// by the chat turn that drew it). A refund cancels the latest charge still
// standing on its id, as monthSpent and lotsOf pair them, so a month's total
// here is the monthly limit's.
//
// Each charge lands on a home:
// - a build on the project it became, else the project chosen for it, else
//   its chat;
// - a drawing on its chat's project: a build of that chat that became one,
//   the project chosen at the setup question, or the project the chat was
//   started from ("Add a product");
// - a chat that isn't a project yet is its own home, named for the project
//   it was meant to start (or its title), linking to the chat;
// - a charge whose chat and build are gone lands on UNKNOWN_HOME.
//
// Pure: the ledger, builds, chats and projects are restated in the few
// fields read here.

export type SpendLine = { id: string; delta: number; reason: string; buildId?: string; ts: number };
export type SpendBuild = {
  id: string;
  chatId: string;
  title: string;
  projectId?: string;
  projectChoiceId?: string;
  projectChoiceName?: string;
};
export type SpendTurn = { id: string; role: string; answer?: { projectId: string; projectName: string }; addTo?: string };
export type SpendChat = { id: string; title: string; turns: readonly SpendTurn[] };
export type SpendProject = { id: string; name: string };

export type SpendRow = {
  key: string;
  name: string;
  /** The project's page, or the chat; null when neither is left. */
  href: string | null;
  /** A saved project (true), or a chat that isn't one yet. */
  saved: boolean;
  credits: number;
  builds: number;
  drawings: number;
};

export const UNKNOWN_HOME = "Chats no longer in History";

type Home = Pick<SpendRow, "key" | "name" | "href" | "saved">;
type Charge = { home: string; amount: number; ts: number; kind: "build" | "concept" };

/** Credits spent per home in [since, until), most first; refunded charges cost nothing. */
export function spendByProject(input: {
  ledger: readonly SpendLine[];
  builds: readonly SpendBuild[];
  chats: readonly SpendChat[];
  projects: readonly SpendProject[];
  since?: number;
  until?: number;
}): SpendRow[] {
  const { ledger, builds, chats, projects } = input;
  const since = input.since ?? -Infinity;
  const until = input.until ?? Infinity;

  const projectHome = (id: string | undefined): Home | null => {
    const p = id ? projects.find((x) => x.id === id) : undefined;
    return p ? { key: `p:${p.id}`, name: p.name || "Untitled project", href: `/projects/${p.id}`, saved: true } : null;
  };
  const chatHome = (chat: SpendChat): Home => {
    const own = builds.filter((b) => b.chatId === chat.id);
    const setups = chat.turns.filter((t) => t.role === "setup");
    for (const b of own) {
      const h = projectHome(b.projectId) ?? projectHome(b.projectChoiceId);
      if (h) return h;
    }
    for (const t of [...setups].reverse()) {
      const h = projectHome(t.answer?.projectId) ?? projectHome(t.addTo);
      if (h) return h;
    }
    const meant =
      own.map((b) => b.projectChoiceName?.trim()).find(Boolean) ??
      [...setups].reverse().map((t) => t.answer?.projectName.trim()).find(Boolean);
    return { key: `c:${chat.id}`, name: meant || chat.title || "Untitled chat", href: `/chat/${chat.id}`, saved: false };
  };
  const unknown: Home = { key: "unknown", name: UNKNOWN_HOME, href: null, saved: false };

  const homes = new Map<string, Home>();
  const homeOf = (e: SpendLine): Home => {
    const id = e.buildId;
    if (!id) return unknown;
    if (e.reason === "build") {
      const b = builds.find((x) => x.id === id);
      if (!b) return unknown;
      const chat = chats.find((c) => c.id === b.chatId);
      return projectHome(b.projectId) ?? (chat ? chatHome(chat) : null) ?? projectHome(b.projectChoiceId) ?? {
        key: `b:${b.id}`,
        name: b.projectChoiceName?.trim() || b.title || "Untitled build",
        href: null,
        saved: false,
      };
    }
    const chat = chats.find((c) => c.turns.some((t) => t.id === id));
    return chat ? chatHome(chat) : unknown;
  };

  // Charges still standing per charged id, newest last; a refund takes the latest.
  const open = new Map<string, Charge[]>();
  const loose: Charge[] = [];
  for (const e of ledger) {
    if ((e.reason === "build" || e.reason === "concept") && e.delta < 0) {
      const home = homeOf(e);
      homes.set(home.key, home);
      const c: Charge = { home: home.key, amount: -e.delta, ts: e.ts, kind: e.reason };
      if (e.buildId) open.set(e.buildId, [...(open.get(e.buildId) ?? []), c]);
      else loose.push(c);
    } else if (e.reason === "refund" && e.buildId) {
      open.get(e.buildId)?.pop();
    }
  }

  const rows = new Map<string, SpendRow>();
  for (const c of [...loose, ...[...open.values()].flat()]) {
    if (c.ts < since || c.ts >= until) continue;
    const home = homes.get(c.home)!;
    const row = rows.get(c.home) ?? { ...home, credits: 0, builds: 0, drawings: 0 };
    row.credits += c.amount;
    if (c.kind === "build") row.builds += 1;
    else row.drawings += 1;
    rows.set(c.home, row);
  }
  return [...rows.values()].sort(
    (a, b) => Number(a.key === "unknown") - Number(b.key === "unknown") || b.credits - a.credits || a.name.localeCompare(b.name),
  );
}

export function totalOf(rows: readonly SpendRow[]): number {
  return rows.reduce((sum, r) => sum + r.credits, 0);
}
