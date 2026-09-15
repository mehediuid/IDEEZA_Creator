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
// Everything is a real query over the existing catalogue (part-catalog.ts)
// plus the packages authored through the flow (lib/package/library.ts). The
// user-owned lists live in localStorage, so they are read through
// useSyncExternalStore: the server snapshot is empty, which keeps the first
// paint identical on both sides, and a write from another tab lands here too.

import * as React from "react";
import Link from "next/link";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button, SearchInput } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { DsIcon } from "@/lib/pcb/icons";
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

// The list/grid choice is a per-viewer convenience, remembered in this browser.
// It goes through the same external-store pattern rather than a state
// initialiser, so the server and the first client paint agree (always "list")
// and the stored choice applies on hydration instead of after it.
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
/** Symbol kind → the rail section it files under, in the order the rail lists
 *  them. Anything the catalogue grows that is not named here lands in Other,
 *  so a new kind can never vanish from the page. */
const KIND_SECTION: Record<string, string> = {
  resistor: "Resistors",
  resistorBox: "Resistors",
  capacitor: "Capacitors",
  inductor: "Inductors",
  diode: "Diodes",
  transistor: "Transistors",
  opamp: "ICs",
  ic: "ICs",
  crystal: "Crystals",
  connector: "Connectors",
};
const KIND_ORDER = ["Resistors", "Capacitors", "Inductors", "Diodes", "Transistors", "ICs", "Crystals", "Connectors", "Other"];
const ALL = "all";
const MODULES = "modules";
const MINE = "mine";

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
  return KIND_SECTION[kind] ?? "Other";
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

/** Three lines — the list glyph. Drawn here rather than borrowed, so it cannot
 *  be mistaken for the app's menu or navigator icons. */
const ListGlyph = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

// ── rail ────────────────────────────────────────────────────────────────────
type RailRow = { key: string; label: string; count: number };

function Rail({ rows, active, onPick }: { rows: { group: string; items: RailRow[] }[]; active: string; onPick: (k: string) => void }) {
  return (
    <nav aria-label="Library sections" className="flex flex-col gap-[var(--spacing-6)] lg:sticky lg:top-[var(--spacing-8)] lg:self-start">
      {rows.map((g) => (
        <div key={g.group} className="flex flex-col gap-[var(--spacing-1)]">
          {g.group ? (
            <span className="px-[var(--spacing-4)] pb-[var(--spacing-2)] font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
              {g.group}
            </span>
          ) : null}
          {g.items.map((r) => {
            const on = r.key === active;
            return (
              <button
                key={r.key}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => onPick(r.key)}
                className={[
                  "flex h-[32px] w-full cursor-pointer items-center justify-between gap-[var(--spacing-4)] rounded-[var(--radius-lg)] px-[var(--spacing-4)] text-left outline-none",
                  "font-display text-sm transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "bg-bg-subtle font-medium text-text-primary" : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
                ].join(" ")}
              >
                <span className="truncate">{r.label}</span>
                <span className={["shrink-0 font-mono text-xs", on ? "text-text-secondary" : "text-text-tertiary"].join(" ")}>{r.count}</span>
              </button>
            );
          })}
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
          "grid h-[52px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-[var(--spacing-6)] rounded-[var(--radius-lg)] px-[var(--spacing-4)] outline-none",
          "text-text-secondary transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
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
          <span className="truncate font-display text-xs leading-xs text-text-tertiary">{item.secondary}</span>
        </span>
      </Link>
    </li>
  );
}

// ── page ────────────────────────────────────────────────────────────────────
export function PartsLibrary() {
  const [q, setQ] = React.useState("");
  const [section, setSection] = React.useState<string>(ALL);
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
  const partSections = KIND_ORDER.filter((s) => items.some((i) => i.section === s));
  const rail = [
    {
      group: "",
      items: [{ key: ALL, label: "All parts", count: count((i) => i.section !== MODULES && i.section !== MINE) }],
    },
    {
      group: "By kind",
      items: partSections.map((s) => ({ key: s, label: s, count: count((i) => i.section === s) })),
    },
    {
      group: "Yours",
      items: [
        { key: MODULES, label: "Agile Modules", count: count((i) => i.section === MODULES) },
        { key: MINE, label: "My packages", count: count((i) => i.section === MINE) },
      ],
    },
  ];

  const shown = matched.filter((i) =>
    section === ALL ? i.section !== MODULES && i.section !== MINE : i.section === section,
  );
  const activeLabel = rail.flatMap((g) => g.items).find((r) => r.key === section)?.label ?? "All parts";

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[var(--spacing-8)] px-[var(--spacing-12)] py-[var(--spacing-12)]">
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-6)]">
        <h1 className="font-display text-2xl font-semibold leading-2xl tracking-tight text-text-primary">Parts &amp; Agile Module</h1>
        <Button
          hierarchy="primary"
          size="md"
          onClick={() => {
            window.location.href = "/parts/new";
          }}
          iconLeading={<Icon icon={PlusSignIcon} size={16} />}
        >
          New package
        </Button>
      </header>

      <SearchInput value={q} onValueChange={setQ} placeholder="Search by part number, package, manufacturer or feature…" aria-label="Search the library" />

      <div className="grid grid-cols-1 gap-[var(--spacing-8)] lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Below lg the rail is a scrolling strip of the same buttons, so the
            sections stay one tap away on a phone. */}
        <div className="-mx-[var(--spacing-12)] overflow-x-auto px-[var(--spacing-12)] lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="min-w-max lg:min-w-0">
            <div className="flex gap-[var(--spacing-2)] lg:hidden">
              {rail.flatMap((g) => g.items).map((r) => {
                const on = r.key === section;
                return (
                  <button
                    key={r.key}
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => setSection(r.key)}
                    className={[
                      "inline-flex h-[32px] cursor-pointer items-center gap-[var(--spacing-3)] rounded-[var(--radius-full)] px-[var(--spacing-5)] outline-none",
                      "font-display text-sm transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                      on ? "bg-bg-subtle font-medium text-text-primary" : "text-text-secondary hover:bg-bg-surface-raised",
                    ].join(" ")}
                  >
                    {r.label}
                    <span className="font-mono text-xs text-text-tertiary">{r.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="hidden lg:block">
              <Rail rows={rail} active={section} onPick={setSection} />
            </div>
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
                  ["list", "List", <ListGlyph key="l" />],
                  ["grid", "Grid", <DsIcon key="g" name="grid" size={16} strokeWidth={1.8} />],
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
                      "inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] outline-none",
                      "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                      on ? "bg-bg-subtle text-text-primary" : "text-text-tertiary hover:bg-bg-surface-raised hover:text-text-primary",
                    ].join(" ")}
                  >
                    {glyph}
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
                <>Nothing in {activeLabel.toLowerCase()} matches “{q}”.</>
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
