"use client";

// Assembly's left panel (the shared project panel's module slot). Assembly
// mode: where each part came from and whether it's placed, the patterns,
// and the Mates folder with each snap's state (F13, as production CAD-369).
// Wiring mode: the wires, the wires the PCB asks for (F23), the cut list (F30).

import * as React from "react";
import { Alert02Icon, CheckmarkCircle02Icon, PinIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, IconButton, Menu } from "@/components/ideeza";
import { LIBRARY } from "@/lib/assembly/library";
import type { SceneItem } from "@/lib/assembly/scene";
import { cn } from "@/lib/utils";
import { useAssembly, useSuggestions } from "./assembly-store";

const mm = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-5">
      <h3 className="text-xs font-semibold uppercase leading-xs tracking-caps text-text-tertiary">{children}</h3>
      {action}
    </div>
  );
}

function Row({
  selected,
  onClick,
  dot,
  title,
  sub,
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  dot?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={cn("group flex items-center gap-2 rounded-md pr-1", selected ? "bg-bg-brand-subtle" : "hover:bg-bg-subtle")}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className="flex min-h-9 min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {dot && <span aria-hidden className="size-[9px] shrink-0 rounded-full border border-solid border-border-strong" style={{ background: dot }} />}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm leading-xs", selected ? "font-semibold text-text-brand" : "text-text-primary")}>{title}</span>
          {sub && <span className="block truncate text-xs leading-xs text-text-tertiary">{sub}</span>}
        </span>
      </button>
      {trailing}
    </div>
  );
}

function PlacedTag({ item }: { item: SceneItem }) {
  if (item.rec.grounded)
    return (
      <span className="inline-flex items-center gap-1 text-xs leading-xs text-text-secondary">
        <Icon icon={PinIcon} size={12} /> fixed
      </span>
    );
  return item.placed ? <span className="text-xs leading-xs text-text-success">placed</span> : <span className="text-xs leading-xs text-text-warning">not placed</span>;
}

function InstanceRow({ item }: { item: SceneItem }) {
  const a = useAssembly();
  const sel = a.selection.kind === "inst" && a.selection.id === item.rec.id;
  return (
    <Row
      selected={sel}
      onClick={() => a.select(sel ? { kind: "none" } : { kind: "inst", id: item.rec.id })}
      dot={item.part.solids[0]?.color}
      title={item.part.name}
      sub={<PlacedTag item={item} />}
      trailing={
        <IconButton
          hierarchy="ghost"
          size="sm"
          aria-label={item.rec.hidden ? `Show ${item.part.name}` : `Hide ${item.part.name}`}
          icon={<Icon icon={item.rec.hidden ? ViewOffIcon : ViewIcon} size={16} />}
          onClick={() => a.setHidden(item.rec.id, !item.rec.hidden)}
        />
      }
    />
  );
}

function AssemblyList() {
  const a = useAssembly();
  const { scene, doc, available } = a;
  const items = scene.items.filter((i) => !i.copyOf);
  const pcb = items.filter((i) => i.part.source === "pcb");
  const three = items.filter((i) => i.part.source === "three");
  const lib = items.filter((i) => i.part.source === "library");
  const nameOf = (id: string) => scene.items.find((i) => i.rec.id === id)?.part.name.split(" · ")[0] ?? "Removed part";
  return (
    <div className="flex flex-col pb-6">
      <Heading>From PCB Design</Heading>
      {pcb.length ? (
        pcb.map((i) => <InstanceRow key={i.rec.id} item={i} />)
      ) : (
        <p className="px-3 text-xs leading-xs text-text-tertiary">
          {available.pcb.ready ? "The board isn't brought in yet. Use Bring in." : "No board yet. Draw it in PCB Design and Generate PCB."}
        </p>
      )}
      {pcb[0] && (
        <p className="px-3 pt-1 text-xs leading-xs text-text-tertiary">
          One rigid part · {available.pcb.parts} parts · {mm(available.pcb.size[0])} × {mm(available.pcb.size[1])} mm
          {available.pcb.boxOnly ? ` · ${available.pcb.boxOnly} drawn as boxes` : ""}
        </p>
      )}

      <Heading>From 3D Module</Heading>
      {three.length ? three.map((i) => <InstanceRow key={i.rec.id} item={i} />) : <p className="px-3 text-xs leading-xs text-text-tertiary">Nothing from the 3D Module yet. Add an Enclosure there for the case.</p>}

      <Heading
        action={
          <Menu
            label="Insert a part"
            align="end"
            items={LIBRARY.map((it) => ({ id: it.kind, label: it.name, hint: `${it.dims} mm`, onSelect: () => a.insertLibrary(it.kind) }))}
            trigger={(props) => (
              <Button {...props} hierarchy="ghost" size="sm" className="h-7 px-2 text-xs">
                Insert part
              </Button>
            )}
          />
        }
      >
        Off-board
      </Heading>
      {lib.length ? lib.map((i) => <InstanceRow key={i.rec.id} item={i} />) : <p className="px-3 text-xs leading-xs text-text-tertiary">A battery, a speaker, a button: parts that don&apos;t sit on the board.</p>}

      {doc.patterns.length > 0 && (
        <>
          <Heading>Patterns</Heading>
          {doc.patterns.map((p) => {
            const sel = a.selection.kind === "pattern" && a.selection.id === p.id;
            const kind = p.kind === "linear" ? "Linear pattern" : p.kind === "circular" ? "Circular pattern" : "Mirror";
            return <Row key={p.id} selected={sel} onClick={() => a.select({ kind: "pattern", id: p.id })} title={kind} sub={`of ${nameOf(p.seed)}${p.kind !== "mirror" ? ` · ${p.count}` : ""}`} />;
          })}
        </>
      )}

      <Heading>Mates ({doc.mates.length})</Heading>
      {doc.mates.length === 0 && <p className="px-3 text-xs leading-xs text-text-tertiary">No snaps yet. Use Snap or Place inside.</p>}
      {doc.mates.map((m) => {
        const status = scene.mates.get(m.id) ?? "waiting";
        const sel = a.selection.kind === "mate" && a.selection.id === m.id;
        const icon =
          status === "ok" ? (
            <Icon icon={CheckmarkCircle02Icon} size={14} className="text-text-success" aria-label="Solved" aria-hidden={false} />
          ) : status === "suppressed" ? (
            <span className="text-xs leading-xs text-text-tertiary">off</span>
          ) : (
            <Icon icon={Alert02Icon} size={14} className={status === "conflict" ? "text-text-error" : "text-text-warning"} aria-label={status === "conflict" ? "Conflict" : "Missing part"} aria-hidden={false} />
          );
        return (
          <Row
            key={m.id}
            selected={sel}
            onClick={() => a.select(sel ? { kind: "none" } : { kind: "mate", id: m.id })}
            title={
              <span className={cn(m.suppressed && "text-text-tertiary")}>
                {m.name} <span className="text-text-tertiary">({nameOf(m.b.inst)}, {nameOf(m.a.inst)})</span>
              </span>
            }
            trailing={<span className="flex w-7 justify-center">{icon}</span>}
          />
        );
      })}

      {scene.missing.length > 0 && (
        <>
          <Heading>Gone from their editor</Heading>
          {scene.missing.map((m) => (
            <Row
              key={m.id}
              selected={false}
              onClick={() => a.removeInstance(m.id)}
              title={m.label ?? (m.source === "three" ? "A 3D Module shape" : m.source === "pcb" ? "The PCB" : m.ref)}
              sub="Deleted or hidden there · click to take it out"
            />
          ))}
        </>
      )}
    </div>
  );
}

function WiringTree() {
  const a = useAssembly();
  const suggestions = useSuggestions();
  const { doc, wires } = a;
  const total = doc.wires.reduce((s, w) => s + (wires.get(w.id)?.cut ?? 0), 0);
  return (
    <div className="flex flex-col pb-6">
      {a.oldWiring && (
        <div className="px-3 pt-4">
          <Banner tone="info" title="Your earlier 2D wiring is kept" action={<Button hierarchy="secondary" size="sm" onClick={a.dismissOldWiring}>Got it</Button>}>
            {a.oldWiring.parts} parts and {a.oldWiring.wires} wires from the old flat wiring can&apos;t come into 3D. They stay saved in this browser.
          </Banner>
        </div>
      )}
      <Heading>Wires ({doc.wires.length})</Heading>
      {doc.wires.length === 0 && <p className="px-3 text-xs leading-xs text-text-tertiary">No wires yet. Add one the board asks for below, or use Add wire and pick two pins.</p>}
      {doc.wires.map((w) => {
        const g = wires.get(w.id);
        const sel = a.selection.kind === "wire" && a.selection.id === w.id;
        const bad = !!g && (!g.ok || g.tight || g.through.length > 0 || g.nets.same === false);
        return (
          <Row
            key={w.id}
            selected={sel}
            onClick={() => a.select(sel ? { kind: "none" } : { kind: "wire", id: w.id })}
            dot={w.color}
            title={w.name}
            sub={g?.from && g.to ? `${g.from.pin.label} → ${g.to.pin.label}` : "An end is gone"}
            trailing={
              <span className={cn("shrink-0 font-mono text-xs leading-xs", bad ? "text-text-warning" : "text-text-secondary")}>
                {bad && <Icon icon={Alert02Icon} size={12} className="mr-1 inline" />}
                {g ? `${mm(g.length)} mm` : ""}
              </span>
            }
          />
        );
      })}

      <Heading
        action={
          suggestions.length > 1 ? (
            <Button hierarchy="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => suggestions.forEach((s) => a.addWire(s.from, s.to, s.color))}>
              Add all
            </Button>
          ) : undefined
        }
      >
        The board asks for
      </Heading>
      {suggestions.length === 0 && (
        <p className="px-3 text-xs leading-xs text-text-tertiary">
          Nothing right now. A wire is suggested when a placed off-board part&apos;s lead (a battery&apos;s +) matches a net on the board (VBAT, GND…).
        </p>
      )}
      {suggestions.map((s) => (
        <div key={`${s.from.inst}|${s.from.pin}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-bg-subtle">
          <span aria-hidden className="size-[9px] shrink-0 rounded-full border border-solid border-border-strong" style={{ background: s.color }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm leading-xs text-text-primary">{s.label}</span>
            <span className="block text-xs leading-xs text-text-tertiary">net {s.net}</span>
          </span>
          <Button hierarchy="secondary" size="sm" onClick={() => a.addWire(s.from, s.to, s.color)}>
            Add
          </Button>
        </div>
      ))}

      {doc.wires.length > 0 && (
        <>
          <Heading>Cut list</Heading>
          <div className="px-3">
            <table className="w-full border-collapse text-xs leading-xs">
              <thead>
                <tr className="text-left text-text-tertiary">
                  <th className="py-1 pr-2 font-medium">From → To</th>
                  <th className="py-1 pr-2 font-medium">AWG</th>
                  <th className="py-1 text-right font-medium">Cut mm</th>
                </tr>
              </thead>
              <tbody>
                {doc.wires.map((w) => {
                  const g = wires.get(w.id);
                  return (
                    <tr key={w.id} className="border-t border-solid border-border-subtle text-text-primary">
                      <td className="py-1 pr-2">
                        <span aria-hidden className="mr-2 inline-block size-[8px] rounded-full" style={{ background: w.color }} />
                        {g?.from?.pin.label ?? "?"} → {g?.to?.pin.label ?? "?"}
                      </td>
                      <td className="py-1 pr-2 font-mono">{w.gauge}</td>
                      <td className="py-1 text-right font-mono">{g ? mm(g.cut) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="pt-2 text-xs leading-xs text-text-tertiary">
              {doc.wires.length} {doc.wires.length === 1 ? "wire" : "wires"} · {mm(total)} mm to cut, slack included
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function AssemblyTree() {
  const { doc } = useAssembly();
  return doc.mode === "wiring" ? <WiringTree /> : <AssemblyList />;
}
