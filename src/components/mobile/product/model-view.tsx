"use client";

// The 3D Module and Assembly viewer on a phone (Product Details 10k, 10l,
// 30a–30d): the web's assembly (lib/three/assembly.ts) and WebGL viewer
// (`AssemblyViewer`, three.js in its own chunk), driven by the web panel's
// own rules (`viewReducer`), laid out for a phone and view only (D3):
// - before it loads: "The 3D model loads when you open it." and View in 3D
//   (the concept image above it), so three.js arrives only when asked;
// - the viewer: Fullscreen and Reset the view on it, the hint under it
//   ("Tap a part to inspect it", "1 part selected · tap the model to clear",
//   …), the part under a tap ringed;
// - Explode (a slider with its %), 3/4 · Front · Side · Top (the web's
//   presets);
// - the rail's facts, under it: Model (parts · systems), Systems with each
//   one's count and a switch, "n visible", What ships;
// - fullscreen is the whole viewer: the model on top, and Explode, the
//   presets and Systems in a strip under it, so nothing is out of reach;
// - a tapped part opens a half sheet from the bottom with no scrim (30a): the
//   model and its ring stay in view above it. Its system over its name, what
//   it does, Part reference / Quantity / Material / Mass / System, Isolate
//   this part and Clear selection side by side, Other parts in this system.
//   Isolate closes the sheet and keeps the part isolated, with Exit
//   isolation on the viewer; closing the sheet never clears the isolation;
// - Preparing the 3D model (30b), We couldn't open the 3D model + Try again
//   (30c), Nothing to show + Show all systems (30d), the systems list kept.

import * as React from "react";
import { Cancel01Icon, FullScreenIcon, ReloadIcon, ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ButtonGroup } from "@/components/ideeza/button-group";
import { IconButton } from "@/components/ideeza/icon-button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Slider } from "@/components/ideeza/slider";
import { Toggle } from "@/components/ideeza/toggle";
import { AssemblyViewer } from "@/components/create/model-panel/assembly-viewer";
import { INITIAL_VIEW, viewReducer, type View, type ViewAction } from "@/components/create/model-panel/model-panel";
import { Rings } from "@/components/create/model-panel/model-overlays";
import type { ScreenBox, ViewPreset } from "@/components/create/model-panel/viewer-types";
import type { BuildJob, BuildProduct } from "@/lib/create/history";
import { mm3 } from "@/lib/spec/units";
import { deriveAssembly, enclosureOnly, SYSTEM_LABEL, type Assembly } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { HomeIndicator } from "../home-indicator";
import { Eyebrow } from "../kit/eyebrow";
import { LIST_CARD, ListCard, ListRow } from "../kit/list";
import { T } from "../type";
import { FactCard } from "./parts";

/** The web viewer's presets (viewer-controls.tsx), 3/4 first. */
const PRESETS: { label: string; value: ViewPreset }[] = [
  { label: "3/4", value: "iso" },
  { label: "Front", value: "front" },
  { label: "Side", value: "side" },
  { label: "Top", value: "top" },
];

/** The web's rules, plus the phone's one: closing the part sheet lets the part go but keeps an
 *  isolation (the web's `select null` ends both, which left the phone no way to see one). */
type PhoneAction = ViewAction | { t: "closePart" };

const SURFACE = "border-[length:var(--border-width-1)] border-solid border-[color:var(--color-modal-border)] bg-bg-surface shadow-modal";

/** The web's ModelTab rule: the 3D Module shows the enclosure alone when the build has an
 *  Assembly piece to show the rest; only the primary product wears the generated mesh. */
export function assemblyOf(job: BuildJob, product: BuildProduct, kind: "3d" | "assembly"): Assembly {
  const shellOnly = kind === "3d" && product.items.some((i) => i.kind === "assembly" && (i.status !== "skipped" || i.omitted));
  const a = deriveAssembly({
    title: product.title,
    parts: product.parts,
    spec: product.spec,
    meshUrl: product.id === "primary" ? job.modelGlbUrl : undefined,
  });
  return shellOnly ? enclosureOnly(a) : a;
}

/** 10k: the resting state, then the viewer once asked for. */
export function ModelPiece({ job, product, kind }: { job: BuildJob; product: BuildProduct; kind: "3d" | "assembly" }) {
  const [open, setOpen] = React.useState(false);
  const assembly = React.useMemo(() => (open ? assemblyOf(job, product, kind) : null), [open, job, product, kind]);
  if (!open || !assembly) {
    return (
      <div className={cn(LIST_CARD, "items-center gap-6 p-8 text-center")}>
        {product.conceptImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- the concept image from the build store
          <img src={product.conceptImageUrl} alt={`${product.name} concept image`} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
        )}
        <p className={T.body}>The 3D model loads when you open it.</p>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={ThreeDViewIcon} size={20} />} onClick={() => setOpen(true)}>
          View in 3D
        </Button>
      </div>
    );
  }
  return <ModelView assembly={assembly} label={`${kind === "assembly" ? "Assembly" : "3D Module"} of ${product.name}`} />;
}

export function ModelView({ assembly, label }: { assembly: Assembly; label: string }) {
  const systemOf = React.useCallback((id: string) => assembly.parts.find((p) => p.id === id)?.system, [assembly.parts]);
  const [view, dispatch] = React.useReducer(
    (v: View, a: PhoneAction) => (a.t === "closePart" ? { ...v, selectedId: null } : viewReducer(v, a, systemOf)),
    INITIAL_VIEW,
  );
  const [boxes, setBoxes] = React.useState<{ hover?: ScreenBox; selected?: ScreenBox }>({});
  const [ready, setReady] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const regionRef = React.useRef<HTMLDivElement>(null);

  const visible = assembly.parts.filter((p) => !view.hidden.has(p.system));
  const allHidden = visible.length === 0;
  const loading = !ready && !failed && !allHidden;
  const selected = view.selectedId ? (assembly.parts.find((p) => p.id === view.selectedId) ?? null) : null;
  const fullscreen = view.fullscreen;
  const live = !loading && !failed && !allHidden;

  // Escape: the part sheet first, then the isolation, then fullscreen.
  const hasEscape = Boolean(view.selectedId || view.isolatedId || fullscreen);
  React.useEffect(() => {
    if (!hasEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (view.selectedId) dispatch({ t: "closePart" });
      else if (view.isolatedId) dispatch({ t: "exitIsolation" });
      else dispatch({ t: "fullscreen", on: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasEscape, view.selectedId, view.isolatedId]);

  // A part sheet rises over the lower half: the viewer comes to the top so the part stays in view.
  React.useEffect(() => {
    if (view.selectedId && !fullscreen) regionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [view.selectedId, fullscreen]);

  const hint = view.isolatedId
    ? "Isolated view · Exit isolation to see the model"
    : view.selectedId
      ? "1 part selected · tap the model to clear"
      : view.hidden.size > 0
        ? `${view.hidden.size} ${view.hidden.size === 1 ? "system" : "systems"} hidden · ${visible.length} parts visible`
        : "Tap a part to inspect it";

  const controls = live && !view.isolatedId && (
    <>
      <div className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-6 py-2">
        <span id="m-explode" className={T.label}>
          Explode
        </span>
        <div className="flex min-h-[44px] min-w-0 flex-1 items-center">
          <Slider value={view.explode} onValueChange={(v) => dispatch({ t: "explode", v })} min={0} max={100} aria-labelledby="m-explode" className="w-full" />
        </div>
        <span className={cn(T.meta, "w-[40px] text-right tabular-nums text-text-primary")}>{view.explode}%</span>
      </div>
      <ButtonGroup size="xl" items={PRESETS} value={view.preset} onChange={(p) => dispatch({ t: "preset", p: p as ViewPreset })} className="w-full [&>button]:flex-1" />
    </>
  );

  return (
    <div className={cn("flex flex-col gap-6", fullscreen && "fixed inset-0 z-sheet gap-0 bg-bg-page")}>
      <div
        ref={regionRef}
        role="region"
        aria-label={label}
        className={cn(
          "relative scroll-mt-4 overflow-hidden border-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle",
          fullscreen ? "min-h-0 flex-1 rounded-none border-x-0 border-t-0" : "h-[300px] w-full rounded-xl",
        )}
      >
        {!allHidden && !failed && (
          <AssemblyViewer
            key={attempt}
            assembly={assembly}
            explode={view.explode}
            hidden={view.hidden}
            isolatedId={view.isolatedId}
            hoverId={view.hoverId}
            selectedId={view.selectedId}
            preset={view.preset}
            cameraNonce={view.cameraNonce}
            cameraCommand={view.cameraCommand}
            panWithLeft={false}
            onHover={() => undefined}
            onPick={(id) => dispatch({ t: "select", id })}
            onBoxes={setBoxes}
            onMounted={() => setMounted(true)}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
        {ready && !allHidden && !view.isolatedId && <Rings selected={boxes.selected} tooltip={undefined} />}

        {live && view.isolatedId && (
          <div className="absolute left-4 top-4">
            <Button hierarchy="secondary" size="lg" onClick={() => dispatch({ t: "exitIsolation" })}>
              Exit isolation
            </Button>
          </div>
        )}
        {live && (
          <div className="absolute right-4 top-4 flex gap-4">
            <IconButton
              hierarchy="secondary"
              size="xl"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              icon={<Icon icon={fullscreen ? Cancel01Icon : FullScreenIcon} size={20} />}
              onClick={() => dispatch({ t: "fullscreen", on: !fullscreen })}
            />
            <IconButton hierarchy="secondary" size="xl" aria-label="Reset the view" icon={<Icon icon={ReloadIcon} size={20} />} onClick={() => dispatch({ t: "reset" })} />
          </div>
        )}
        {live && <p className={cn(T.meta, "absolute bottom-4 left-4 right-4 w-fit rounded-md bg-bg-surface px-4 py-2")}>{hint}</p>}

        {loading && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className={T.name}>Preparing the 3D model</span>
            <span className={T.meta}>
              Assembling {assembly.parts.length} {assembly.parts.length === 1 ? "part" : "parts"} from the build
            </span>
            <ProgressBar value={mounted ? 70 : 20} label="Preparing the 3D model" className="w-[220px] max-w-full" />
            <span className={T.meta}>This usually takes a few seconds</span>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className={T.name}>We couldn’t open the 3D model</span>
            <span className={T.meta}>The 3D viewer couldn’t start. Your PCB, firmware and wiring files are unaffected.</span>
            <Button
              hierarchy="secondary"
              size="xl"
              onClick={() => {
                setFailed(false);
                setReady(false);
                setMounted(false);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}
        {allHidden && !failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className={T.name}>Nothing to show</span>
            <span className={T.meta}>Every system is switched off. Turn one back on to see the model.</span>
            <Button size="xl" onClick={() => dispatch({ t: "showAll" })}>
              Show all systems
            </Button>
          </div>
        )}
      </div>

      {fullscreen ? (
        <div className="flex max-h-[45%] shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain px-8 pb-4 pt-6">
          {controls}
          {!loading && !failed && <Systems assembly={assembly} hidden={view.hidden} onToggle={(id) => dispatch({ t: "toggleSystem", id })} />}
          <HomeIndicator />
        </div>
      ) : (
        <>
          {controls}
          {!loading && !failed && <Systems assembly={assembly} hidden={view.hidden} onToggle={(id) => dispatch({ t: "toggleSystem", id })} />}
        </>
      )}

      {selected && (
        <PartSheet
          assembly={assembly}
          part={selected}
          isolated={view.isolatedId === selected.id}
          onClose={() => dispatch({ t: "closePart" })}
          onIsolate={() => {
            dispatch({ t: "isolate" });
            dispatch({ t: "closePart" });
          }}
          onExitIsolation={() => dispatch({ t: "exitIsolation" })}
          onClear={() => dispatch({ t: "wholeModel" })}
          onPick={(id) => dispatch({ t: "select", id })}
        />
      )}
    </div>
  );
}

type Part = Assembly["parts"][number];

/** 30a: the part as a half sheet from the bottom, the sheet look without its scrim, so the model
 *  and its ring stay in view and stay tappable above it. */
function PartSheet({
  assembly,
  part,
  isolated,
  onClose,
  onIsolate,
  onExitIsolation,
  onClear,
  onPick,
}: {
  assembly: Assembly;
  part: Part;
  isolated: boolean;
  onClose: () => void;
  onIsolate: () => void;
  onExitIsolation: () => void;
  onClear: () => void;
  onPick: (id: string) => void;
}) {
  const titleId = React.useId();
  const others = assembly.parts.filter((p) => p.system === part.system && p.id !== part.id);
  const facts: [string, string][] = [
    ["Part reference", part.ref],
    ["Quantity", `${part.instance.n} of ${part.instance.of}`],
    ...(part.material ? ([["Material", part.material]] as [string, string][]) : []),
    ...(part.massG !== undefined ? ([["Mass", `${part.massG} g`]] as [string, string][]) : []),
    ["System", SYSTEM_LABEL[part.system]],
  ];
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={cn(
        "fixed inset-x-0 bottom-0 z-sheet flex max-h-[50dvh] flex-col rounded-t-xl border-b-0 pt-6 font-sans",
        SURFACE,
        "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-normal motion-safe:ease-decelerate",
      )}
    >
      <div className="flex shrink-0 justify-center pb-4">
        <span aria-hidden className="h-[4px] w-[36px] rounded-full bg-[var(--color-icon-default)]" />
      </div>
      <div className="flex shrink-0 items-start gap-8 px-16 pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Eyebrow>{SYSTEM_LABEL[part.system]}</Eyebrow>
          <h2 id={titleId} className={cn(T.title, "break-words")}>
            {part.name}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={24} />
        </button>
      </div>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-16 pb-8">
        {part.description && <p className={T.body}>{part.description}</p>}
        <div className="flex gap-4">
          {isolated ? (
            <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={onExitIsolation}>
              Exit isolation
            </Button>
          ) : (
            <Button size="xl" className="min-w-0 flex-1" onClick={onIsolate}>
              Isolate this part
            </Button>
          )}
          <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={onClear}>
            Clear selection
          </Button>
        </div>
        <FactCard label={`${part.name} facts`} rows={facts} />
        {others.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className={T.name}>Other parts in this system</h3>
            <ListCard label="Other parts in this system">
              {others.map((o) => (
                <ListRow key={o.id} title={o.name} value={o.ref} onClick={() => onPick(o.id)} />
              ))}
            </ListCard>
          </section>
        )}
      </div>
      <HomeIndicator />
    </div>
  );
}

function Systems({ assembly, hidden, onToggle }: { assembly: Assembly; hidden: ReadonlySet<string>; onToggle: (id: Assembly["systems"][number]["id"]) => void }) {
  const total = assembly.parts.length;
  const visibleParts = assembly.parts.filter((p) => !hidden.has(p.system)).length;
  const ships = [mm3(assembly.size), `${assembly.material} · ${assembly.wallMm} mm wall`, ...(assembly.board ? [`Mount points for the ${assembly.board.w} × ${assembly.board.h} mm board`] : [])];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className={T.meta}>Model</p>
        <p className={T.name}>
          {assembly.title} · {total} {total === 1 ? "part" : "parts"} · {assembly.systems.length} {assembly.systems.length === 1 ? "system" : "systems"}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <p className={cn(T.meta, "flex-1")}>Systems</p>
          <p className={cn(T.meta, hidden.size > 0 && "text-text-brand")}>{hidden.size ? `${visibleParts} of ${total}` : `${total} visible`}</p>
        </div>
        <ListCard label="Systems">
          {assembly.systems.map((s) => (
            <ListRow
              key={s.id}
              title={s.label}
              value={String(s.count)}
              trailing={<Toggle checked={!hidden.has(s.id)} onChange={() => onToggle(s.id)} aria-label={`Show ${s.label}`} />}
            />
          ))}
        </ListCard>
      </div>
      <div className="flex flex-col gap-3">
        <p className={T.meta}>What ships</p>
        <div className="flex flex-wrap gap-3">
          {ships.map((l) => (
            <Badge key={l} tone="neutral">
              {l}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
