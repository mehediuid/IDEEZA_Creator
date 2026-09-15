"use client";

// Parts & Agile Module — the sidebar destination, and the home the New Package
// flow starts from and returns to.
//
// The job here is *finding*: "the 0603 10k", "the USB-C connector", "the
// module I captured last week". So the page is built the way every parts
// library people already know is built (KiCad, Altium, LCSC, Digikey): a
// section rail on the left and a dense, scannable list on the right, one row
// per thing, the whole catalogue in one screen. It used to be a grid of large
// cards, each dominated by a symbol drawing — and every resistor draws the
// same symbol, so the picture told you nothing while the facts that actually
// distinguish parts (MPN, package, value, price) sat in small type underneath.
//
// Three kinds of thing share the list and the rail says which you are looking
// at: catalogue **parts** (grouped by symbol kind), captured **Agile Modules**,
// and the **packages** you authored at /parts/new. A grid view is one toggle
// away for anyone who wants pictures; the list is the default because it is
// the faster way to find something.
//
// **The view has an address.** Section and query live in the URL
// (`/parts?section=ics&q=buck`), not in component state, so a filtered library
// is linkable, shareable, and comes back intact when you open a part and press
// Back. Picking a section is a real navigation (a `<Link>`, one history entry);
// typing replaces the current entry rather than pushing one per keystroke.
// Because the section IS the address, the rail is honestly a `<nav>` and the
// current row honestly carries `aria-current="page"`.
//
// Everything is a real query over the existing catalogue (part-catalog.ts)
// plus the packages authored through the flow (lib/package/library.ts). The
// user-owned lists live in localStorage, so they are read through
// useSyncExternalStore: the server snapshot is empty, which keeps the first
// paint identical on both sides, and a write from another tab lands here too.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GridViewIcon, ListViewIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { SearchInput, buttonVariants } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { glyphFor } from "@/lib/pcb/glyphs";
import { MODULE_CATALOG, PART_CATALOG, readPersonalModules, readPersonalParts, type AgileModule, type CatalogPart } from "@/lib/pcb/part-catalog";
import { readPackages, type SavedPackage } from "@/lib/package/library";
import { SymbolThumb } from "@/components/package/package-thumbs";

// ── external stores ─────────────────────────────────────────────────────────
// The user-owned lists live in localStorage. Subscribing to them as an external
// store keeps the first paint identical on the server and the client (the server
// snapshot is empty) without an effect copying values into state — and a write
// from another tab lands here too.
const LS_KEYS = ["ideeza:pcb:personalPackages", "ideeza:pcb:personalParts", "ideeza:pcb:personalModules"];
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const librarySnapshot = () => LS_KEYS.map((k) => window.localStorage.getItem(k) ?? "").join("\u0000");
const libraryServerSnapshot = () => "";

// The list/grid choice is a per-viewer convenience, remembered in this browser
// rather than put in the URL: it says how you like to look at a library, not
// which library you are looking at. It goes through the same external-store
// pattern rather than a state initialiser, so the server and the first client
// paint agree (always "list") and the stored choice applies on hydration
// instead of after it.
type View = "list" | "grid";
const VIEW_KEY = "ideeza:parts:view";
const viewListeners = new Set<() => void>();
const subscribeView = (cb: () => void) => {
  viewListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    viewListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const readView = (): View => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
};
const writeView = (v: View) => {
  try {
    window.localStorage.setItem(VIEW_KEY, v);
  } catch {}
  viewListeners.forEach((f) => f());
};

// ── the model the page renders ──────────────────────────────────────────────
const ALL = "all";
const MODULES = "modules";
const MINE = "mine";

/** The rail's kind sections, in the order it lists them. The key is what the
 *  URL carries, so it is a slug; the label is what a reader sees, and the two
 *  are defined together so a link and a heading can never disagree. */
const KIND_SECTIONS: { key: string; label: string }[] = [
  { key: "resistors", label: "Resistors" },
  { key: "capacitors", label: "Capacitors" },
  { key: "inductors", label: "Inductors" },
  { key: "diodes", label: "Diodes" },
  { key: "transistors", label: "Transistors" },
  { key: "ics", label: "ICs" },
  { key: "crystals", label: "Crystals" },
  { key: "connectors", label: "Connectors" },
  { key: "other", label: "Other" },
];

/** Symbol kind → the rail section it files under. Anything the catalogue grows
 *  that is not named here lands in Other, so a new kind can never vanish. */
const KIND_SECTION: Record<string, string> = {
  resistor: "resistors",
  resistorBox: "resistors",
  capacitor: "capacitors",
  inductor: "inductors",
  diode: "diodes",
  transistor: "transistors",
  opamp: "ics",
  ic: "ics",
  crystal: "crystals",
  connector: "connectors",
};

const SECTION_LABEL: Record<string, string> = {
  [ALL]: "All parts",
  [MODULES]: "Agile Modules",
  [MINE]: "My packages",
  ...Object.fromEntries(KIND_SECTIONS.map((s) => [s.key, s.label])),
};

type Item = {
  id: string;
  /** Which rail row it belongs to: a kind section, "modules" or "mine". */
  section: string;
  name: string;
  /** The one line under the name: the facts that tell this row from the next. */
  secondary: string;
  /** The one fact that sits on the right edge, in mono. */
  right: string;
  search: string;
  /** Symbol kind for catalogue parts and modules; a package draws its own objects. */
  kind?: string;
  moduleKinds?: string[];
  pkg?: SavedPackage;
};

function sectionOfKind(kind: string) {
  return KIND_SECTION[kind] ?? "other";
}

function buildItems(
  parts: CatalogPart[],
  modules: AgileModule[],
  packages: SavedPackage[],
): Item[] {
  const kindByMpn = new Map(parts.map((p) => [p.part, p.kind]));

  const partItems: Item[] = parts.map((p) => ({
    id: p.id,
    section: sectionOfKind(p.kind),
    name: p.part,
    secondary: [p.pkg, p.mfr, p.features.join(", ")].filter(Boolean).join(" · "),
    right: p.price && p.price !== "—" ? p.price : "",
    search: `${p.part} ${p.pkg} ${p.mfr} ${p.features.join(" ")}`,
    kind: p.kind,
  }));

  const moduleItems: Item[] = modules.map((m) => ({
    id: m.id,
    section: MODULES,
    name: m.name,
    secondary: [m.summary, m.features.join(", ")].filter(Boolean).join(" · "),
    right: `${m.parts.length} part${m.parts.length === 1 ? "" : "s"}`,
    search: `${m.name} ${m.summary} ${m.parts.join(" ")} ${m.features.join(" ")}`,
    moduleKinds: m.parts.map((mpn) => kindByMpn.get(mpn) ?? "component"),
  }));

  const packageItems: Item[] = packages.map((p) => ({
    id: p.id,
    section: MINE,
    name: p.name,
    secondary: [
      p.category,
      `${p.pins} pin${p.pins === 1 ? "" : "s"}`,
      p.mounting,
      p.visibility === "community" ? "Published" : "Private",
    ].join(" · "),
    right: `v${p.version}`,
    search: `${p.name} ${p.category} ${p.description} ${p.prefix} ${p.value}`,
    pkg: p,
  }));

  return [...partItems, ...moduleItems, ...packageItems];
}

// ── glyphs ──────────────────────────────────────────────────────────────────
/** A catalogue part's symbol, drawn from the geometry the canvas itself uses. */
function PartGlyph({ kind, className }: { kind: string; className?: string }) {
  return (
    <svg viewBox="-40 -26 80 52" preserveAspectRatio="xMidYMid meet" className={className} role="img" aria-hidden>
      <g stroke="currentColor" fill="none">
        {glyphFor(kind)}
      </g>
    </svg>
  );
}

/** What a row or card shows for its thing — a module shows the symbols it is
 *  built from, a package its own drawn symbol, a part its kind's symbol. */
function Thumb({ item, size }: { item: Item; size: "row" | "card" }) {
  const cls = size === "row" ? "h-[28px] w-[40px]" : "h-full w-full max-w-[150px]";
  if (item.pkg) {
    return (
      <span className={size === "row" ? "block h-[28px] w-[40px]" : "block h-full w-full"}>
        <SymbolThumb draft={item.pkg} w={size === "row" ? 80 : 240} h={size === "row" ? 56 : 128} />
      </span>
    );
  }
  if (item.moduleKinds) {
    const shown = item.moduleKinds.slice(0, size === "row" ? 2 : 3);
    return (
      <span className={["flex items-center justify-center", size === "row" ? "h-[28px] w-[40px] gap-[2px]" : "h-full w-full gap-[var(--spacing-4)]"].join(" ")}>
        {shown.map((k, i) => (
          <PartGlyph key={`${k}-${i}`} kind={k} className={size === "row" ? "h-[28px] w-[19px]" : "h-full w-full min-w-0"} />
        ))}
      </span>
    );
  }
  return <PartGlyph kind={item.kind ?? "component"} className={cls} />;
}

// ── section navigation ──────────────────────────────────────────────────────
// One implementation, two shapes: the column the wide layout shows and the
// scrolling chip strip a phone shows. They were two copies of the same model
// with the same states written out twice, which is how they drift.
type SectionRow = { key: string; label: string; count: number };
type SectionGroup = { group: string; items: SectionRow[] };

/** The address of a section, carrying the query along so changing section
 *  never silently drops what you typed. */
function sectionHref(key: string, q: string) {
  const p = new URLSearchParams();
  if (key !== ALL) p.set("section", key);
  if (q) p.set("q", q);
  const s = p.toString();
  return s ? `/parts?${s}` : "/parts";
}

// Selection and hover have to read on a near-white page too: two adjacent
// greys carry ~1.05:1 of fill contrast, so the *edge* does the separating.
// Current = the brand, which is what the app's own strips and filter chips
// already use for "this one"; hover = a neutral edge one step stronger than
// the page, never the brand, so "what you'd pick" can't be read as "picked".
const NAV_BASE =
  "cursor-pointer border font-display no-underline outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
const NAV_ON = "border-border-brand bg-bg-brand-subtle font-medium text-text-brand";
const NAV_OFF =
  "border-transparent text-text-secondary hover:border-border-strong hover:bg-bg-surface-raised hover:text-text-primary";

function SectionLink({ row, active, q, variant }: { row: SectionRow; active: boolean; q: string; variant: "rail" | "chips" }) {
  return (
    <Link
      href={sectionHref(row.key, q)}
      scroll={false}
      aria-current={active ? "page" : undefined}
      data-section={row.key}
      className={[
        NAV_BASE,
        active ? NAV_ON : NAV_OFF,
        variant === "rail"
          ? "flex h-[32px] w-full items-center justify-between gap-[var(--spacing-4)] rounded-[var(--radius-lg)] px-[var(--spacing-4)] text-left text-sm"
          : // A chip never shrinks — half a word is worse than a scroll — and
            // it is a snap point, so a flick can't leave one cut in half.
            "inline-flex h-[32px] shrink-0 snap-start items-center gap-[var(--spacing-3)] rounded-[var(--radius-full)] px-[var(--spacing-5)] text-sm",
      ].join(" ")}
    >
      <span className={variant === "rail" ? "truncate" : "whitespace-nowrap"}>{row.label}</span>
      <span className={["shrink-0 font-mono text-xs", active ? "text-text-brand" : "text-text-tertiary"].join(" ")}>{row.count}</span>
    </Link>
  );
}

function SectionNav({ groups, active, q, variant }: { groups: SectionGroup[]; active: string; q: string; variant: "rail" | "chips" }) {
  // The strip scrolls, so it says so: the edge it can still scroll toward
  // fades out instead of ending in a hard cut mid-word.
  const stripRef = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });
  React.useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const read = () =>
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    read();
    el.addEventListener("scroll", read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, [groups, variant]);

  if (variant === "chips") {
    const fade =
      edges.left || edges.right
        ? `linear-gradient(to right, ${edges.left ? "transparent" : "#000"} 0, #000 28px, #000 calc(100% - 28px), ${edges.right ? "transparent" : "#000"} 100%)`
        : undefined;
    return (
      <nav aria-label="Library sections">
        <div
          ref={stripRef}
          data-section-strip
          className="-mx-[var(--spacing-12)] flex snap-x snap-mandatory gap-[var(--spacing-2)] overflow-x-auto px-[var(--spacing-12)]"
          style={{ maskImage: fade, WebkitMaskImage: fade }}
        >
          {groups.flatMap((g) => g.items).map((r) => (
            <SectionLink key={r.key} row={r} active={r.key === active} q={q} variant="chips" />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Library sections" className="flex flex-col gap-[var(--spacing-6)] lg:sticky lg:top-[var(--spacing-8)] lg:self-start">
      {groups.map((g) => (
        <div key={g.group} className="flex flex-col gap-[var(--spacing-1)]">
          {g.group ? (
            <span className="px-[var(--spacing-4)] pb-[var(--spacing-2)] font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
              {g.group}
            </span>
          ) : null}
          {g.items.map((r) => (
            <SectionLink key={r.key} row={r} active={r.key === active} q={q} variant="rail" />
          ))}
        </div>
      ))}
    </nav>
  );
}

// ── rows and cards ──────────────────────────────────────────────────────────
function Row({ item }: { item: Item }) {
  return (
    <li>
      <Link
        href={`/parts/${item.id}`}
        className={[
          "grid h-[52px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-[var(--spacing-6)] rounded-[var(--radius-lg)] border border-transparent px-[var(--spacing-4)] outline-none",
          "text-text-secondary transition-colors duration-fast hover:border-border-strong hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
        ].join(" ")}
      >
        <Thumb item={item} size="row" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-md font-medium leading-md text-text-primary">{item.name}</span>
          <span className="truncate font-display text-sm leading-sm text-text-tertiary">{item.secondary}</span>
        </span>
        <span className="shrink-0 font-mono text-sm text-text-secondary">{item.right}</span>
      </Link>
    </li>
  );
}

function Card({ item }: { item: Item }) {
  return (
    <li>
      <Link
        href={`/parts/${item.id}`}
        className={[
          "group flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-surface outline-none",
          "transition-[border-color] duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus",
        ].join(" ")}
      >
        <span className="block h-[96px] w-full bg-bg-subtle p-[var(--spacing-5)] text-text-secondary">
          <Thumb item={item} size="card" />
        </span>
        <span className="flex min-w-0 flex-col gap-[var(--spacing-1)] p-[var(--spacing-5)]">
          <span className="truncate font-display text-sm font-medium leading-sm text-text-primary">{item.name}</span>
          {/* The card carries the same right-hand fact the row does — a price,
              a module's part count, a package's version. It used to drop it,
              so switching to grid quietly lost a column. */}
          <span className="flex min-w-0 items-baseline justify-between gap-[var(--spacing-3)]">
            <span className="truncate font-display text-xs leading-xs text-text-tertiary">{item.secondary}</span>
            {item.right ? <span className="shrink-0 font-mono text-xs text-text-secondary">{item.right}</span> : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

// ── page ────────────────────────────────────────────────────────────────────
export function PartsLibrary() {
  const searchParams = useSearchParams();
  const urlSection = searchParams.get("section") ?? ALL;
  const section = SECTION_LABEL[urlSection] ? urlSection : ALL;
  const urlQ = searchParams.get("q") ?? "";

  // The URL is the address of the view, but the field keeps its own copy so a
  // keystroke never waits on a router update. Typing *replaces* the current
  // history entry (a word typed one letter at a time must not cost eight Back
  // presses); the ref remembers what we wrote, so a real navigation — Back,
  // Forward, a pasted link — is told apart from our own echo and adopted.
  const [q, setQ] = React.useState(urlQ);
  const written = React.useRef(urlQ);
  React.useEffect(() => {
    if (urlQ !== written.current) {
      written.current = urlQ;
      setQ(urlQ);
    }
  }, [urlQ]);

  const onQuery = (next: string) => {
    setQ(next);
    written.current = next;
    window.history.replaceState(null, "", sectionHref(section, next));
  };

  const view = React.useSyncExternalStore(subscribeView, readView, () => "list" as View);

  const stored = React.useSyncExternalStore(subscribeStorage, librarySnapshot, libraryServerSnapshot);
  const items = React.useMemo(() => {
    // `allParts()` folds authored packages into catalogue rows for the PCB
    // picker; here they are listed from the library itself, with their real
    // geometry — so the catalogue side deliberately leaves them out rather than
    // showing each authored package twice.
    return buildItems(
      [...PART_CATALOG, ...readPersonalParts()],
      [...MODULE_CATALOG, ...readPersonalModules()],
      readPackages().slice().reverse(),
    );
    // The snapshot string IS the invalidation key: the readers above parse the
    // very localStorage entries it was built from, so it changes exactly when
    // one of those lists does. The linter cannot see that indirection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const needle = q.trim().toLowerCase();
  const matched = React.useMemo(
    () => items.filter((i) => !needle || i.search.toLowerCase().includes(needle)),
    [items, needle],
  );

  // The rail counts follow the search, so a query narrows the numbers you see
  // before you pick a section — the rail is a summary of the results, not of
  // the whole catalogue.
  const count = (pred: (i: Item) => boolean) => matched.filter(pred).length;
  const partSections = KIND_SECTIONS.filter((s) => items.some((i) => i.section === s.key));
  const groups: SectionGroup[] = [
    {
      group: "",
      items: [{ key: ALL, label: SECTION_LABEL[ALL], count: count((i) => i.section !== MODULES && i.section !== MINE) }],
    },
    {
      group: "By kind",
      items: partSections.map((s) => ({ key: s.key, label: s.label, count: count((i) => i.section === s.key) })),
    },
    {
      group: "Yours",
      items: [
        { key: MODULES, label: SECTION_LABEL[MODULES], count: count((i) => i.section === MODULES) },
        { key: MINE, label: SECTION_LABEL[MINE], count: count((i) => i.section === MINE) },
      ],
    },
  ];

  const shown = matched.filter((i) =>
    section === ALL ? i.section !== MODULES && i.section !== MINE : i.section === section,
  );
  const activeLabel = SECTION_LABEL[section];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[var(--spacing-8)] px-[var(--spacing-12)] py-[var(--spacing-12)]">
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-6)]">
        <h1 className="font-display text-2xl font-semibold leading-2xl tracking-tight text-text-primary">Parts &amp; Agile Module</h1>
        {/* Going somewhere is a link — it gets a hover href, a middle-click and
            a client-side transition, like every other navigation on the page. */}
        <Link href="/parts/new" className={buttonVariants({ hierarchy: "primary", size: "md" })}>
          <span className="inline-flex size-[16px] shrink-0 items-center justify-center">
            <Icon icon={PlusSignIcon} size={16} />
          </span>
          New package
        </Link>
      </header>

      <SearchInput value={q} onValueChange={onQuery} placeholder="Search by part number, package, manufacturer or feature…" aria-label="Search the library" />

      <div className="grid grid-cols-1 gap-[var(--spacing-8)] lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Below lg the sections are a scrolling chip strip, so they stay one
            tap away on a phone; above it they are the column. One component
            draws both. */}
        <div className="min-w-0">
          <div className="lg:hidden">
            <SectionNav groups={groups} active={section} q={q} variant="chips" />
          </div>
          <div className="hidden lg:block">
            <SectionNav groups={groups} active={section} q={q} variant="rail" />
          </div>
        </div>

        <section aria-labelledby="parts-heading" className="flex min-w-0 flex-col gap-[var(--spacing-4)]">
          <div className="flex items-center justify-between gap-[var(--spacing-4)] border-b border-border-subtle pb-[var(--spacing-4)]">
            <h2 id="parts-heading" className="font-display text-sm font-medium text-text-secondary">
              {activeLabel} <span className="ml-[var(--spacing-2)] font-mono text-xs text-text-tertiary">{shown.length}</span>
            </h2>
            <div role="group" aria-label="View" className="flex items-center gap-[var(--spacing-1)]">
              {(
                [
                  ["list", "List", ListViewIcon],
                  ["grid", "Grid", GridViewIcon],
                ] as const
              ).map(([v, label, glyph]) => {
                const on = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${label} view`}
                    title={`${label} view`}
                    onClick={() => writeView(v)}
                    className={[
                      "inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border outline-none",
                      "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                      on ? NAV_ON : ["text-text-tertiary", NAV_OFF].join(" "),
                    ].join(" ")}
                  >
                    <Icon icon={glyph} size={16} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="py-[var(--spacing-10)] text-center font-display text-sm leading-md text-text-tertiary">
              {section === MINE && !needle ? (
                <>
                  No packages of your own yet.{" "}
                  <Link href="/parts/new" className="font-medium text-text-brand no-underline transition-colors duration-fast hover:text-text-brand-hover">
                    Author one
                  </Link>
                  : a symbol, a footprint and a 3D body, kept here until you publish it.
                </>
              ) : needle ? (
                // The section's real label — lower-casing it turned
                // "My packages" into "my packages" and "ICs" into "ics".
                <>Nothing in {activeLabel} matches “{q}”.</>
              ) : (
                <>Nothing here yet.</>
              )}
            </p>
          ) : view === "grid" ? (
            <ul role="list" aria-label={activeLabel} className="grid grid-cols-2 gap-[var(--spacing-5)] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              {shown.map((i) => (
                <Card key={`${i.section}-${i.id}`} item={i} />
              ))}
            </ul>
          ) : (
            <ul role="list" aria-label={activeLabel} className="flex flex-col divide-y divide-border-subtle">
              {shown.map((i) => (
                <Row key={`${i.section}-${i.id}`} item={i} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
