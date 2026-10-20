"use client";

// Assembly's right panel: what is selected, or the open tool's steps, or —
// with nothing selected — the checks (F14–F17). Every value is the scene's
// own number; every disabled control says what it is waiting for.

import * as React from "react";
import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useStepNav } from "@/components/manual/use-step-nav";
import { Badge, Button, NumberInput, Segmented, Select, Slider, Toggle } from "@/components/ideeza";
import { fromEuler, toEuler, type Pose, type Vec3 } from "@/lib/assembly/math";
import { describeIssue, sceneBounds } from "@/lib/assembly/scene";
import { AWG_TABLE, odOf } from "@/lib/assembly/wires";
import type { MateType, PatternRec } from "@/lib/assembly/types";
import { cn } from "@/lib/utils";
import { useAssembly } from "./assembly-store";

const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const WIRE_COLORS: Array<[string, string]> = [
  ["Red", "#dc2626"],
  ["Black", "#111827"],
  ["White", "#f1f5f9"],
  ["Yellow", "#eab308"],
  ["Blue", "#2563eb"],
  ["Green", "#16a34a"],
];
const MATE_LABEL: Record<MateType, string> = {
  flush: "Flush (coincident)",
  concentric: "Concentric",
  distance: "Distance",
  lock: "Lock",
  parallel: "Parallel",
  perpendicular: "Perpendicular",
  angle: "Angle",
  tangent: "Tangent",
};

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-solid border-border-subtle px-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold leading-xs text-text-primary">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Note({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" | "error" | "ok" }) {
  return (
    <p className={cn("text-xs leading-xs", tone === "warn" ? "text-text-warning" : tone === "error" ? "text-text-error" : tone === "ok" ? "text-text-success" : "text-text-tertiary")}>{children}</p>
  );
}

/** A number the maker types: commits on blur or Enter, so a half-typed value never jumps. */
function Num({ label, value, unit, step = 0.5, min, max, disabled, onCommit }: { label: string; value: number; unit: string; step?: number; min?: number; max?: number; disabled?: boolean; onCommit: (v: number) => void }) {
  const id = React.useId();
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? r2(value);
  const commit = (text: string) => {
    const n = parseFloat(text);
    if (!Number.isFinite(n)) return;
    onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
  };
  return (
    <div className="grid grid-cols-[1fr_120px] items-center gap-3">
      <label htmlFor={id} className="text-sm leading-xs text-text-secondary">
        {label} <span className="text-text-tertiary">({unit})</span>
      </label>
      <div
        onFocus={() => setDraft(r2(value))}
        onBlur={() => {
          if (draft !== null) commit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft !== null) commit(draft);
        }}
      >
        <NumberInput
          id={id}
          size="sm"
          value={shown}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          stepsWhat={label.toLowerCase()}
          onChange={(v) => (draft === null ? commit(v) : setDraft(v))}
        />
      </div>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-xs text-text-primary">
      {ok === null ? (
        <span aria-hidden className="mt-[2px] w-[14px] text-center text-text-tertiary">–</span>
      ) : (
        <Icon icon={ok ? CheckmarkCircle02Icon : Alert02Icon} size={14} className={cn("mt-[2px] shrink-0", ok ? "text-text-success" : "text-text-error")} />
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// ───────────────────────────── the selected part ─────────────────────────────

function PartProps({ id }: { id: string }) {
  const a = useAssembly();
  const item = a.scene.items.find((i) => i.rec.id === id);
  if (!item) return null;
  const mates = a.doc.mates.filter((m) => m.a.inst === id || m.b.inst === id);
  const held = a.scene.freedom.has(id);
  const why = item.rec.grounded
    ? "Fixed in place. Unfix it to move it."
    : item.copyOf
      ? "A pattern copy follows its original."
      : held
        ? `Held by ${mates.map((m) => m.name).join(", ")}. Edit or delete a snap to change it.`
        : null;
  const deg = toEuler(item.pose.q).map((v) => (v * 180) / Math.PI) as Vec3;
  const setPos = (k: 0 | 1 | 2, v: number) => {
    const p: Vec3 = [...item.pose.p];
    p[k] = v;
    a.moveCommit(id, { p, q: item.pose.q });
  };
  const setRot = (k: 0 | 1 | 2, v: number) => {
    const d: Vec3 = [...deg];
    d[k] = v;
    const pose: Pose = { p: item.pose.p, q: fromEuler([(d[0] * Math.PI) / 180, (d[1] * Math.PI) / 180, (d[2] * Math.PI) / 180]) };
    a.moveCommit(id, pose);
  };
  const freedom = a.scene.freedom.get(id);
  const isLid = item.part.enclosure?.role === "lid";
  const isCase = item.part.enclosure?.role === "base";
  return (
    <>
      <Section title={item.part.name} aside={item.rec.grounded ? <Badge tone="neutral">Fixed</Badge> : item.placed ? <Badge tone="success">Placed</Badge> : <Badge tone="warning">Not placed</Badge>}>
        <Note>{item.part.origin}</Note>
        {item.part.boxOnly?.length ? <Note tone="warn">{item.part.boxOnly.join(", ")} have no 3D shape yet and are drawn as boxes, so the fit check is approximate.</Note> : null}
        {item.part.approximate && <Note tone="warn">Checked by its outline, not its exact shape.</Note>}
        {freedom !== undefined && <Note tone={freedom === 0 ? "ok" : "muted"}>{freedom === 0 ? "Fully placed by its snaps." : `Snapped, still free to move ${freedom} way${freedom === 1 ? "" : "s"}.`}</Note>}
      </Section>
      <Section title="Position">
        {(["X", "Y", "Z"] as const).map((ax, k) => (
          <Num key={ax} label={ax} unit="mm" value={item.pose.p[k]} disabled={!!why} onCommit={(v) => setPos(k as 0 | 1 | 2, v)} />
        ))}
        {(["X", "Y", "Z"] as const).map((ax, k) => (
          <Num key={`r${ax}`} label={`Turn ${ax}`} unit="°" step={15} value={deg[k]} disabled={!!why} onCommit={(v) => setRot(k as 0 | 1 | 2, v)} />
        ))}
        {why && <Note>{why}</Note>}
      </Section>
      <Section title="This part">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm leading-xs text-text-secondary">Fixed in place</span>
          <Toggle size="sm" checked={!!item.rec.grounded} disabled={!!item.copyOf} aria-label="Fixed in place" onChange={() => a.setGrounded(id, !item.rec.grounded)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCase && !item.rec.grounded && !item.copyOf && (
            <Button hierarchy="secondary" size="sm" onClick={() => (isLid ? a.closeLid(id) : a.placeInside(id))}>
              {isLid ? "Close the lid" : "Place inside"}
            </Button>
          )}
          {!item.copyOf && (
            <Button hierarchy="ghost" size="sm" onClick={() => a.removeInstance(id)}>
              Take out of the assembly
            </Button>
          )}
        </div>
      </Section>
      {mates.length > 0 && (
        <Section title="Snaps on this part">
          {mates.map((m) => (
            <button key={m.id} type="button" className="flex items-center justify-between gap-3 rounded-md border-0 bg-transparent px-2 py-1 text-left text-sm leading-xs text-text-primary hover:bg-bg-subtle" onClick={() => a.select({ kind: "mate", id: m.id })}>
              <span>{m.name}</span>
              <span className={cn("text-xs leading-xs", a.scene.mates.get(m.id) === "ok" ? "text-text-success" : "text-text-error")}>{a.scene.mates.get(m.id) === "ok" ? "holds" : a.scene.mates.get(m.id)}</span>
            </button>
          ))}
        </Section>
      )}
    </>
  );
}

// ───────────────────────────── a snap ─────────────────────────────

function MateProps({ id }: { id: string }) {
  const a = useAssembly();
  const m = a.doc.mates.find((x) => x.id === id);
  if (!m) return null;
  const status = a.scene.mates.get(id) ?? "waiting";
  const feat = (inst: string, f: string) => a.scene.items.find((i) => i.rec.id === inst)?.part.features.find((x) => x.id === f)?.label ?? f;
  const part = (inst: string) => a.scene.items.find((i) => i.rec.id === inst)?.part.name ?? "A removed part";
  const say =
    status === "ok"
      ? "Holds."
      : status === "conflict"
        ? "Can't hold together with this part's other snaps: one of them asks for something else. Change a value or delete one."
        : status === "missing"
          ? "A part or feature it ties is gone from its editor. Delete this snap."
          : status === "suppressed"
            ? "Turned off: the solver ignores it."
            : "Waiting for its parts to be placed.";
  return (
    <>
      <Section title={m.name} aside={<Badge tone={status === "ok" ? "success" : status === "suppressed" ? "neutral" : "error"}>{status === "ok" ? "Holds" : status}</Badge>}>
        <Note tone={status === "ok" ? "muted" : "error"}>{say}</Note>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-xs">
          <dt className="text-text-tertiary">Moves</dt>
          <dd className="m-0 text-text-primary">
            {part(m.b.inst)} · {feat(m.b.inst, m.b.feature)}
          </dd>
          <dt className="text-text-tertiary">To</dt>
          <dd className="m-0 text-text-primary">
            {part(m.a.inst)} · {feat(m.a.inst, m.a.feature)}
          </dd>
        </dl>
      </Section>
      <Section title="Edit">
        <Select size="sm" aria-label="Snap type" value={m.type} options={(Object.keys(MATE_LABEL) as MateType[]).map((t) => ({ value: t, label: MATE_LABEL[t] }))} onChange={(v) => a.updateMate(id, { type: v as MateType })} />
        {(m.type === "distance" || m.type === "flush") && <Num label="Gap" unit="mm" value={m.offset ?? 0} min={-500} max={500} onCommit={(v) => a.updateMate(id, { offset: v, type: v !== 0 && m.type === "flush" ? "distance" : m.type })} />}
        {m.type === "angle" && <Num label="Angle" unit="°" step={5} value={m.angle ?? 90} min={0} max={180} onCommit={(v) => a.updateMate(id, { angle: v })} />}
        {(m.type === "flush" || m.type === "distance" || m.type === "concentric") && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm leading-xs text-text-secondary">Flip (same way, not facing)</span>
            <Toggle size="sm" checked={!!m.flip} aria-label="Flip" onChange={() => a.updateMate(id, { flip: !m.flip })} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm leading-xs text-text-secondary">Turned off</span>
          <Toggle size="sm" checked={!!m.suppressed} aria-label="Turned off" onChange={() => a.updateMate(id, { suppressed: !m.suppressed })} />
        </div>
        <div>
          <Button hierarchy="danger" size="sm" onClick={() => a.deleteMate(id)}>
            Delete snap
          </Button>
        </div>
      </Section>
    </>
  );
}

// ───────────────────────────── a wire ─────────────────────────────

function WireProps({ id }: { id: string }) {
  const a = useAssembly();
  const w = a.doc.wires.find((x) => x.id === id);
  const g = a.wires.get(id);
  if (!w || !g) return null;
  const sleeveOd = odOf(w.gauge) + 2 * w.sleeveMm;
  return (
    <>
      <Section title={w.name}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-xs">
          <dt className="text-text-tertiary">From</dt>
          <dd className="m-0 text-text-primary">{g.from ? `${g.from.pin.label}${g.from.pin.net ? ` · ${g.from.pin.net}` : ""}` : "Gone"}</dd>
          <dt className="text-text-tertiary">To</dt>
          <dd className="m-0 text-text-primary">{g.to ? `${g.to.pin.label}${g.to.pin.net ? ` · ${g.to.pin.net}` : ""}` : "Gone"}</dd>
        </dl>
        {g.nets.same === true && <Note tone="ok">Both ends are on one net.</Note>}
        {g.nets.same === false && <Note tone="error">The ends are on different nets ({g.nets.from} and {g.nets.to}).</Note>}
      </Section>
      <Section title="Wire">
        <Select
          size="sm"
          aria-label="Wire size"
          value={String(w.gauge)}
          options={AWG_TABLE.map((s) => ({ value: String(s.awg), label: `${s.awg} AWG · ${s.od} mm` }))}
          onChange={(v) => a.updateWire(id, { gauge: Number(v) })}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Colour">
          {WIRE_COLORS.map(([name, hex]) => (
            <button
              key={hex}
              type="button"
              aria-label={name}
              aria-pressed={w.color === hex}
              title={name}
              onClick={() => a.updateWire(id, { color: hex })}
              className={cn("size-7 cursor-pointer rounded-full border-2 border-solid border-bg-surface outline outline-1", w.color === hex ? "outline-2 outline-border-focus" : "outline-border-default")}
              style={{ background: hex }}
            />
          ))}
        </div>
        <Num label="Sleeve thickness" unit="mm" step={0.1} min={0} max={3} value={w.sleeveMm} onCommit={(v) => a.updateWire(id, { sleeveMm: v })} />
        <Note>Heat-shrink over each end: {r2(sleeveOd)} mm across.</Note>
        <Num label="Slack" unit="%" step={5} min={0} max={100} value={w.slackPct} onCommit={(v) => a.updateWire(id, { slackPct: v })} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm leading-xs text-text-secondary">Straight through its points</span>
          <Toggle size="sm" checked={!!w.straight} aria-label="Straight" onChange={() => a.updateWire(id, { straight: !w.straight })} />
        </div>
      </Section>
      <Section title="Length and bends">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-xs">
          <dt className="text-text-tertiary">Path</dt>
          <dd className="m-0 font-mono text-text-primary">{r1(g.length)} mm</dd>
          <dt className="text-text-tertiary">Cut</dt>
          <dd className="m-0 font-mono font-semibold text-text-primary">{r1(g.cut)} mm</dd>
          <dt className="text-text-tertiary">Smallest bend</dt>
          <dd className="m-0 font-mono text-text-primary">{r1(g.minBend)} mm (4 × {g.od} mm)</dd>
          <dt className="text-text-tertiary">Path allows</dt>
          <dd className="m-0 font-mono text-text-primary">{Number.isFinite(g.allowed) ? `${r1(g.allowed)} mm` : "no bends"}</dd>
        </dl>
        {g.tight && (
          <Note tone="error">
            Bend too tight: this path allows {r1(g.allowed)} mm, {w.gauge} AWG needs {r1(g.minBend)} mm. Use a thinner wire or add a point to widen the corner.
          </Note>
        )}
        {!g.ok && <Note tone="error">{g.reason} Add a point it can go through, or use a thinner wire.</Note>}
        {g.through.length > 0 && <Note tone="error">It passes through {g.through.join(", ")}. Add a point to route it around.</Note>}
        {g.ok && !g.tight && !g.through.length && <Note tone="ok">Routed around the parts; the bends are gentle enough.</Note>}
      </Section>
      <Section title={`Points (${w.points.length})`}>
        <Note>Double-click the wire to add a point it must pass through. A point rides on the part it was made over.</Note>
        {w.points.map((p, k) => (
          <div key={k} className="flex items-center justify-between gap-3 text-sm leading-xs text-text-primary">
            <span className="font-mono text-xs">
              Point {k + 1} · {p.local.map((v) => r1(v)).join(", ")}
            </span>
            <Button hierarchy="ghost" size="sm" onClick={() => a.removeWirePoint(id, k)}>
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button hierarchy="danger" size="sm" onClick={() => a.deleteWire(id)}>
            Delete wire
          </Button>
        </div>
      </Section>
    </>
  );
}

// ───────────────────────────── a problem, a pattern ─────────────────────────────

function ProblemProps({ index }: { index: number }) {
  const a = useAssembly();
  const { go } = useStepNav();
  const p = a.scene.fit.problems[index];
  if (!p) return <Section title="Fit">{<Note tone="ok">That problem is fixed.</Note>}</Section>;
  const ends = p.kind === "outside" ? [p.a] : [p.a, p.b];
  const owners = ends.map((e) => a.scene.items.find((i) => i.rec.id === e.inst)).filter(Boolean);
  const fromPcb = owners.find((o) => o!.part.source === "pcb");
  const fromThree = owners.find((o) => o!.part.source === "three");
  return (
    <Section title={p.kind === "overlap" ? "Parts overlap" : "Too close"}>
      <Note tone="error">{describeIssue(p, a.doc.clearanceMm)}</Note>
      <Note>Fix it where the part lives, or move it here:</Note>
      <div className="flex flex-col items-start gap-2">
        {fromPcb && (
          <Button hierarchy="secondary" size="sm" onClick={() => go("pcb")}>
            Change the board in PCB Design
          </Button>
        )}
        {fromThree && (
          <Button hierarchy="secondary" size="sm" onClick={() => go("three")}>
            Change the case in the 3D Module
          </Button>
        )}
        <Button hierarchy="ghost" size="sm" onClick={() => a.select({ kind: "inst", id: ends[0].inst })}>
          Select {ends[0].partName}
        </Button>
      </div>
    </Section>
  );
}

function PatternProps({ id }: { id: string }) {
  const a = useAssembly();
  const p = a.doc.patterns.find((x) => x.id === id);
  if (!p) return null;
  const axisOpts = [
    { value: "x", label: "Along X" },
    { value: "y", label: "Along Y (up)" },
    { value: "z", label: "Along Z" },
  ];
  const axisOf = (v: Vec3) => (Math.abs(v[0]) > 0.5 ? "x" : Math.abs(v[1]) > 0.5 ? "y" : "z");
  const vec = (k: string): Vec3 => (k === "x" ? [1, 0, 0] : k === "y" ? [0, 1, 0] : [0, 0, 1]);
  return (
    <Section title={p.kind === "linear" ? "Linear pattern" : p.kind === "circular" ? "Circular pattern" : "Mirror"}>
      {p.kind !== "mirror" && <Num label="Copies, with the original" unit="×" step={1} min={2} max={50} value={p.count} onCommit={(v) => a.updatePattern(id, { count: Math.round(v) } as Partial<PatternRec>)} />}
      {p.kind === "linear" && (
        <>
          <Num label="Spacing" unit="mm" value={p.spacing} min={-500} max={500} onCommit={(v) => a.updatePattern(id, { spacing: v } as Partial<PatternRec>)} />
          <Select size="sm" aria-label="Direction" value={axisOf(p.axis)} options={axisOpts} onChange={(v) => a.updatePattern(id, { axis: vec(v) } as Partial<PatternRec>)} />
        </>
      )}
      {p.kind === "circular" && (
        <>
          <Num label="Total angle" unit="°" step={15} min={1} max={360} value={p.angle} onCommit={(v) => a.updatePattern(id, { angle: v } as Partial<PatternRec>)} />
          <Select size="sm" aria-label="Turn about" value={axisOf(p.axis)} options={axisOpts} onChange={(v) => a.updatePattern(id, { axis: vec(v) } as Partial<PatternRec>)} />
          {(["X", "Y", "Z"] as const).map((ax, k) => (
            <Num
              key={ax}
              label={`Centre ${ax}`}
              unit="mm"
              value={p.center[k]}
              onCommit={(v) => {
                const c: Vec3 = [...p.center];
                c[k] = v;
                a.updatePattern(id, { center: c } as Partial<PatternRec>);
              }}
            />
          ))}
        </>
      )}
      {p.kind === "mirror" && (
        <>
          <Select size="sm" aria-label="Mirror across" value={axisOf(p.normal)} options={[{ value: "x", label: "Across the YZ plane" }, { value: "y", label: "Across the XZ plane" }, { value: "z", label: "Across the XY plane" }]} onChange={(v) => a.updatePattern(id, { normal: vec(v) } as Partial<PatternRec>)} />
          <Num label="Plane at" unit="mm" value={p.point[["x", "y", "z"].indexOf(axisOf(p.normal))]} onCommit={(v) => {
            const pt: Vec3 = [0, 0, 0];
            pt[["x", "y", "z"].indexOf(axisOf(p.normal))] = v;
            a.updatePattern(id, { point: pt } as Partial<PatternRec>);
          }} />
          <Note>A mirror copy is the part turned to face the other way: exact for parts that are the same on both sides.</Note>
        </>
      )}
      <div>
        <Button hierarchy="danger" size="sm" onClick={() => a.deletePattern(id)}>
          Delete pattern
        </Button>
      </div>
    </Section>
  );
}

// ───────────────────────────── tools, checks ─────────────────────────────

function ToolSteps() {
  const a = useAssembly();
  const label = (inst: string, f: string) => {
    const it = a.scene.items.find((i) => i.rec.id === inst);
    return `${it?.part.name.split(" · ")[0] ?? "?"} · ${it?.part.features.find((x) => x.id === f)?.label ?? f}`;
  };
  if (a.tool === "snap")
    return (
      <Section title="Snap" aside={<Button hierarchy="ghost" size="sm" onClick={() => a.setTool(null)}>Cancel</Button>}>
        <Check ok={a.snapFrom ? true : null}>1 · Pick a face or a hole on the part to move{a.snapFrom ? `: ${label(a.snapFrom.inst, a.snapFrom.feature)}` : ""}</Check>
        <Check ok={null}>2 · Pick where it goes, on another part</Check>
        <Note>Two faces snap flush. Two holes snap on one axis and seat; a board hole on a boss lines up a second hole too. Esc cancels.</Note>
      </Section>
    );
  if (a.tool === "measure") {
    const [p, q] = a.measure;
    return (
      <Section title="Measure" aside={<Button hierarchy="ghost" size="sm" onClick={() => a.setTool(null)}>Done</Button>}>
        <Note>Click two points on any parts.</Note>
        {p && q ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-xs">
            <dt className="text-text-tertiary">Distance</dt>
            <dd className="m-0 font-mono font-semibold text-text-primary">{r2(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]))} mm</dd>
            <dt className="text-text-tertiary">ΔX ΔY ΔZ</dt>
            <dd className="m-0 font-mono text-text-primary">
              {r2(q[0] - p[0])} · {r2(q[1] - p[1])} · {r2(q[2] - p[2])}
            </dd>
          </dl>
        ) : (
          <Note>{p ? "Now the second point." : "First point."}</Note>
        )}
      </Section>
    );
  }
  if (a.tool === "wire")
    return (
      <Section title="Add wire" aside={<Button hierarchy="ghost" size="sm" onClick={() => a.setTool(null)}>Cancel</Button>}>
        <Check ok={a.wireFrom ? true : null}>1 · Pick the first pin{a.wireFrom ? ` (${a.scene.items.find((i) => i.rec.id === a.wireFrom!.inst)?.part.pins.find((x) => x.id === a.wireFrom!.pin)?.label})` : ""}</Check>
        <Check ok={null}>2 · Pick the second pin</Check>
        <Note>The wire leaves each pin along its own direction and routes around the parts.</Note>
      </Section>
    );
  return null;
}

function SectionControls() {
  const a = useAssembly();
  const b = sceneBounds(a.scene);
  if (!a.section.on || !b) return null;
  const k = a.section.axis === "x" ? 0 : a.section.axis === "y" ? 1 : 2;
  return (
    <Section title="Section" aside={<Button hierarchy="ghost" size="sm" onClick={() => a.setSection({ on: false })}>Close</Button>}>
      <Segmented
        label="Cut across"
        size="sm"
        value={a.section.axis}
        onChange={(axis) => a.setSection({ axis, at: (b.min[axis === "x" ? 0 : axis === "y" ? 1 : 2] + b.max[axis === "x" ? 0 : axis === "y" ? 1 : 2]) / 2 })}
        options={[
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ]}
      />
      <Slider value={a.section.at} min={Math.floor(b.min[k])} max={Math.ceil(b.max[k])} step={0.5} onValueChange={(v) => a.setSection({ at: v })} valueLabel={(v) => `${r1(v)} mm`} />
    </Section>
  );
}

function Checks() {
  const a = useAssembly();
  const { scene, doc } = a;
  const overlaps = scene.fit.problems.filter((p) => p.kind === "overlap");
  const close = scene.fit.problems.filter((p) => p.kind === "close");
  const placed = scene.items.filter((i) => i.placed).length;
  const conflicts = [...scene.mates.values()].filter((s) => s === "conflict" || s === "missing").length;
  const indexOf = (p: (typeof scene.fit.problems)[number]) => scene.fit.problems.indexOf(p);
  return (
    <>
      <Section title="Checks">
        <Check ok={!overlaps.length}>
          {overlaps.length ? (
            <span className="flex flex-col gap-1">
              {overlaps.map((p) => (
                <button key={indexOf(p)} type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm leading-xs text-text-error underline" onClick={() => a.select({ kind: "problem", index: indexOf(p) })}>
                  {describeIssue(p, doc.clearanceMm)}
                </button>
              ))}
            </span>
          ) : (
            "No parts overlap"
          )}
        </Check>
        <Check ok={!close.length}>
          {close.length ? (
            <span className="flex flex-col gap-1">
              {close.map((p) => (
                <button key={indexOf(p)} type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm leading-xs text-text-error underline" onClick={() => a.select({ kind: "problem", index: indexOf(p) })}>
                  {describeIssue(p, doc.clearanceMm)}
                </button>
              ))}
            </span>
          ) : (
            <>
              Gaps of at least {r1(doc.clearanceMm)} mm
              {scene.fit.closest && (
                <span className="block text-xs leading-xs text-text-tertiary">
                  Closest: {scene.fit.closest.a.name} ↔ {scene.fit.closest.b.name}, {r2(scene.fit.closest.gap)} mm
                </span>
              )}
            </>
          )}
        </Check>
        <Check ok={scene.openings.length ? scene.openings.every((o) => o.ok) : null}>
          {scene.openings.length
            ? scene.openings.map((o) => (
                <span key={`${o.inst}${o.port}`} className="block">
                  {o.port} {o.ok ? `lines up with its opening (${r1(o.margin)} mm to spare)` : o.opening ? `misses its opening by ${r1(-o.margin)} mm` : "has no opening in the wall it faces"}
                </span>
              ))
            : "No connector on a placed part yet"}
        </Check>
        <Check ok={scene.holes && scene.holes.holes > 0 ? scene.holes.onBosses === scene.holes.holes : null}>
          {scene.holes ? (scene.holes.holes ? `Holes on bosses: ${scene.holes.onBosses} of ${scene.holes.holes}` : "The board has no mounting holes") : "Holes on bosses: place the board in a case"}
        </Check>
        <Check ok={scene.lid ? scene.lid.gap >= 0 : null}>
          {scene.lid ? (scene.lid.gap >= 0 ? `The lid closes: ${r1(scene.lid.gap)} mm over ${scene.lid.part}` : `The lid can't close: ${scene.lid.part} is ${r1(-scene.lid.gap)} mm too tall`) : "Lid: not placed"}
        </Check>
        {scene.fit.warnings.map((w, i) => (
          <Check key={i} ok={false}>
            {describeIssue(w, doc.clearanceMm)}
          </Check>
        ))}
      </Section>
      <Section title="Rule">
        <Num label="Smallest gap" unit="mm" step={0.1} min={0} max={20} value={doc.clearanceMm} onCommit={(v) => a.setClearance(v)} />
        <Note>Parts closer than this are a problem. Touching is fine.</Note>
      </Section>
      <Section title="Assembly">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-xs">
          <dt className="text-text-tertiary">Parts</dt>
          <dd className="m-0 text-text-primary">
            {scene.items.length} · {placed} placed
          </dd>
          <dt className="text-text-tertiary">Snaps</dt>
          <dd className="m-0 text-text-primary">
            {doc.mates.length}
            {conflicts ? <span className="text-text-error"> · {conflicts} broken</span> : null}
          </dd>
          <dt className="text-text-tertiary">Wires</dt>
          <dd className="m-0 text-text-primary">{doc.wires.length}</dd>
          <dt className="text-text-tertiary">Units</dt>
          <dd className="m-0 text-text-primary">mm</dd>
        </dl>
      </Section>
    </>
  );
}

export function AssemblyProps() {
  const a = useAssembly();
  const s = a.selection;
  return (
    <div className="flex flex-col">
      <SectionControls />
      <ToolSteps />
      {!a.tool && s.kind === "inst" && <PartProps id={s.id} />}
      {!a.tool && s.kind === "mate" && <MateProps id={s.id} />}
      {!a.tool && s.kind === "wire" && <WireProps id={s.id} />}
      {!a.tool && s.kind === "problem" && <ProblemProps index={s.index} />}
      {!a.tool && s.kind === "pattern" && <PatternProps id={s.id} />}
      {!a.tool && s.kind === "none" && <Checks />}
    </div>
  );
}
