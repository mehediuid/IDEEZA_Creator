"use client";

// A single library entry — the depth behind a card in the grid.
//
// Three kinds of thing land here and each shows what it honestly has: a
// catalogue **Part** its symbol and sourcing data, an **Agile Module** the
// parts it is built from (each a link onward), and an authored **Package** its
// real symbol *and* footprint geometry, read back from the library.
//
// Nothing on this page is invented. Where the model has no answer — a datasheet
// we do not carry, a land pattern that is derived from the symbol kind rather
// than from the part's own package — the page says so instead of showing a
// plausible-looking value.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { glyphFor } from "@/lib/pcb/glyphs";
import { FOOTPRINT } from "@/lib/pcb/schematic-to-pcb";
import { landPatternFor, unresolvedReason } from "@/lib/pcb/land-patterns";
import { MODULE_CATALOG, PART_CATALOG, readPersonalModules, readPersonalParts, type AgileModule, type CatalogPart } from "@/lib/pcb/part-catalog";
import { readPackages, type SavedPackage } from "@/lib/package/library";
import { FootprintThumb, SymbolThumb } from "@/components/package/package-thumbs";

const LS_KEYS = ["ideeza:pcb:personalPackages", "ideeza:pcb:personalParts", "ideeza:pcb:personalModules", "ideeza:manual:active", "ideeza:manual:projects"];
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const snapshot = () => LS_KEYS.map((k) => window.localStorage.getItem(k) ?? "").join(" ");
const serverSnapshot = () => "";

type Found =
  | { type: "part"; part: CatalogPart; own: boolean }
  | { type: "module"; module: AgileModule; own: boolean }
  | { type: "package"; pkg: SavedPackage };

function find(id: string): Found | null {
  const personalParts = readPersonalParts();
  const personalModules = readPersonalModules();
  const pkg = readPackages().find((p) => p.id === id);
  if (pkg) return { type: "package", pkg };
  const part = [...PART_CATALOG, ...personalParts].find((p) => p.id === id);
  if (part) return { type: "part", part, own: personalParts.some((p) => p.id === id) };
  const mod = [...MODULE_CATALOG, ...personalModules].find((m) => m.id === id);
  if (mod) return { type: "module", module: mod, own: personalModules.some((m) => m.id === id) };
  return null;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--spacing-5)]">
      <h2 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">{title}</h2>
      {children}
    </section>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-3)]">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-subtle p-[var(--spacing-7)]">
        {children}
      </div>
      <figcaption className="font-display text-sm font-regular text-text-tertiary">{label}</figcaption>
    </figure>
  );
}

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-[var(--spacing-1)]">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex items-baseline justify-between gap-[var(--spacing-6)] border-b border-border-subtle py-[var(--spacing-4)] last:border-0"
        >
          <dt className="shrink-0 font-display text-sm font-regular text-text-tertiary">{k}</dt>
          <dd className="min-w-0 text-right font-mono text-xs text-text-primary">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[var(--radius-full)] bg-bg-subtle px-[var(--spacing-5)] py-[var(--spacing-2)] font-display text-xs text-text-secondary">
      {children}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[68ch] rounded-[var(--radius-lg)] border border-dashed border-border bg-bg-page p-[var(--spacing-5)] font-display text-sm font-regular leading-relaxed text-text-tertiary">
      {children}
    </p>
  );
}

function PartGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="-40 -26 80 52" preserveAspectRatio="xMidYMid meet" className="mx-auto h-full w-full max-w-[220px] text-text-primary" role="img" aria-label={`${kind} symbol`}>
      <g stroke="currentColor" fill="none">
        {glyphFor(kind)}
      </g>
    </svg>
  );
}

export function PartDetail({ id }: { id: string }) {
  const stored = React.useSyncExternalStore(subscribeStorage, snapshot, serverSnapshot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const found = React.useMemo(() => find(id), [id, stored]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = React.useMemo(() => activeBoardHref(), [stored]);

  if (!found) {
    return (
      <Shell name="Not found" badge="—" visibility={null} board={null}>
        <Note>
          Nothing in the library has the id <code>{id}</code>. Personal parts, captured modules and authored packages
          live in this browser, so a link to one of them will not resolve anywhere else.
        </Note>
      </Shell>
    );
  }

  if (found.type === "package") {
    const p = found.pkg;
    return (
      <Shell
        name={p.name}
        badge="Package"
        visibility={p.visibility === "community" ? "public" : "private"}
        board={board}
        description={p.description}
      >
        <Panel title="Geometry">
          <div className="flex flex-wrap gap-[var(--spacing-6)]">
            <Frame label="Symbol — the pins the schematic sees">
              <SymbolThumb draft={p} />
            </Frame>
            <Frame label="Footprint — the land pattern the board gets">
              <FootprintThumb draft={p} />
            </Frame>
          </div>
        </Panel>

        <Panel title="This package">
          <Rows
            rows={[
              ["Category", p.category],
              ["Pins", String(p.pins)],
              ["Pads", String(p.pads)],
              ["Mounting", p.mounting],
              ["Reference", `${p.prefix || "U"}?`],
              ["Value", p.value || "—"],
              ["Body height", `${p.body.height.toFixed(2)} mm`],
              ["Standoff", `${p.body.z.toFixed(2)} mm`],
              ["Body rotation", `${p.body.rot}°`],
              ["Authored via", p.path === "wizard" ? "Part Wizard" : p.path === "import" ? "Import" : "Custom"],
              ["Version", `v${p.version}`],
              ["Created", new Date(p.createdAt).toLocaleDateString()],
            ]}
          />
        </Panel>

        <Note>
          It is placed from the board&apos;s <b>Place a Part</b> dialog, under the <b>Personal</b> rail. The 3D step
          places a body box sized from this geometry — a tessellated STEP solid needs a CAD kernel, which this build
          does not carry.
        </Note>
      </Shell>
    );
  }

  if (found.type === "module") {
    const m = found.module;
    const byMpn = new Map([...PART_CATALOG, ...readPersonalParts()].map((p) => [p.part, p]));
    return (
      <Shell name={m.name} badge="Agile Module" visibility={found.own ? "private" : "public"} board={board} description={m.summary}>
        <Panel title={`Built from ${m.parts.length} part${m.parts.length === 1 ? "" : "s"}`}>
          <ul role="list" className="flex flex-col gap-[var(--spacing-3)]">
            {m.parts.map((mpn) => {
              const part = byMpn.get(mpn);
              const row = (
                <>
                  <span className="h-[36px] w-[52px] shrink-0">
                    <PartGlyph kind={part?.kind ?? "component"} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-medium text-text-primary">{mpn}</span>
                  <span className="shrink-0 font-mono text-sm text-text-tertiary">{part ? `${part.pkg} · ${part.mfr}` : "not in the catalogue"}</span>
                </>
              );
              return (
                <li key={mpn}>
                  {part ? (
                    <Link
                      href={`/parts/${part.id}`}
                      className="flex items-center gap-[var(--spacing-5)] rounded-[var(--radius-lg)] border border-border bg-bg-surface p-[var(--spacing-4)] text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-[var(--spacing-5)] rounded-[var(--radius-lg)] border border-dashed border-border p-[var(--spacing-4)]">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Type">
          <div className="flex flex-wrap gap-[var(--spacing-3)]">
            {m.features.map((f) => (
              <Chip key={f}>{f}</Chip>
            ))}
          </div>
        </Panel>

        <Note>
          {found.own
            ? "Captured in this browser. Placing it re-creates its objects at the drop point, keeping their relative layout."
            : "A catalogue module places one block carrying its name. Capture your own with Project ▸ New ▸ Agile Module."}
        </Note>
      </Shell>
    );
  }

  const p = found.part;
  // What the *board* would place today (keyed by symbol kind) versus what the
  // package actually is. They disagree for most ICs, and the page says so.
  const converted = FOOTPRINT[p.kind];
  const land = landPatternFor(p.pkg);
  return (
    <Shell name={p.part} badge="Part" visibility={found.own ? "private" : "public"} board={board}>
      <Panel title="Geometry">
        <div className="flex flex-wrap gap-[var(--spacing-6)]">
          <Frame label="Symbol — what the schematic places">
            <PartGlyph kind={p.kind} />
          </Frame>
          {land ? (
            <Frame label={`Land pattern — ${land.count} pads, derived from ${land.pkg}`}>
              <FootprintThumb draft={{ symbol: [], footprint: land.pads }} />
            </Frame>
          ) : null}
        </div>
      </Panel>

      <Panel title="Specification">
        <Rows
          rows={[
            ["Manufacturer", p.mfr],
            ["Package", p.pkg],
            ["Unit price", p.price],
            ["Stock", p.stock],
            ["Land pattern", land ? `${land.count} pads · ${land.family}` : "not modelled"],
          ]}
        />
      </Panel>

      <Panel title="Features">
        <div className="flex flex-wrap gap-[var(--spacing-3)]">
          {p.features.map((f) => (
            <Chip key={f}>{f}</Chip>
          ))}
        </div>
      </Panel>

      {land ? (
        <Note>
          The pads above are generated from the <b>{land.pkg}</b> package by the same generator the{" "}
          <Link href="/parts/new" className="font-medium text-text-brand hover:underline">New Package</Link> wizard
          uses — nominal reference geometry, not an IPC-7351 toe/heel/side calculation.
          {converted && converted.fp !== p.pkg ? (
            <>
              {" "}The board&apos;s converter has not caught up: it still picks a land pattern by symbol <i>kind</i>,
              so placing this part gives a <b>{converted.fp}</b> pattern rather than the one drawn here.
            </>
          ) : null}
        </Note>
      ) : (
        <Note>{unresolvedReason(p.pkg)} Authoring it at{" "}
          <Link href="/parts/new" className="font-medium text-text-brand hover:underline">New Package</Link> gives it
          real geometry.
        </Note>
      )}
    </Shell>
  );
}

/** The editor a Place action would open — only when a project is actually open. */
function activeBoardHref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem("ideeza:manual:active");
    if (!id) return null;
    const list = JSON.parse(window.localStorage.getItem("ideeza:manual:projects") || "[]");
    const proj = Array.isArray(list) ? list.find((p: { id?: string }) => p && p.id === id) : null;
    return proj && proj.slug ? `/project/${proj.slug}/pcb` : null;
  } catch {
    return null;
  }
}

function Shell({
  name,
  badge,
  visibility,
  description,
  board,
  children,
}: {
  name: string;
  badge: string;
  visibility: "public" | "private" | null;
  description?: string;
  board: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-[var(--spacing-10)] px-[var(--spacing-12)] py-[var(--spacing-16)]">
      <Link
        href="/parts"
        className="inline-flex min-h-[24px] w-fit items-center gap-[var(--spacing-3)] rounded-[var(--radius-lg)] py-[var(--spacing-2)] font-display text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
        Parts &amp; Agile Module
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-[var(--spacing-6)]">
        <div className="flex min-w-0 flex-col gap-[var(--spacing-4)]">
          <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
            <h1 className="min-w-0 break-words font-display text-2xl font-semibold leading-2xl tracking-tight text-text-primary">
              {name}
            </h1>
            <span className="rounded-[var(--radius-md)] bg-bg-subtle px-[var(--spacing-4)] py-[var(--spacing-1)] font-display text-xs font-medium text-text-secondary">
              {badge}
            </span>
            {visibility ? (
              <span
                className={[
                  "rounded-[var(--radius-full)] px-[var(--spacing-4)] py-[var(--spacing-1)] font-display text-xs font-medium",
                  visibility === "public" ? "bg-bg-success-subtle text-text-success" : "bg-bg-subtle text-text-secondary",
                ].join(" ")}
              >
                {visibility === "public" ? "Public" : "Private"}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="max-w-[62ch] font-display text-md font-regular leading-relaxed text-text-secondary">{description}</p>
          ) : null}
        </div>

        {/* Placing needs a board to place onto, so with no project open the
            action greys out and says why rather than going nowhere. */}
        <Button
          hierarchy="primary"
          size="lg"
          disabled={!board}
          title={board ? "Open the board and place it from Insert ▸ Place a Part" : "Open a project first — there is no board to place onto"}
          onClick={() => {
            if (board) window.location.href = board;
          }}
        >
          Place on a board
        </Button>
      </header>

      {children}
    </div>
  );
}
