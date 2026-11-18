"use client";

// The 3D Module and Assembly tabs on a phone (19 · 20 · 21 · A7): the web's
// own assembly (lib/three/assembly.ts — the product's parts, sized by the
// spec, on its board, in its enclosure; the shell is the concept mesh once
// one is made) in the web's WebGL viewer, with the Figma's controls: zoom in
// and out, back to the start view, and the Explode slider (100 % lays every
// part out), and Layers to show or hide each system (what "What this covers"
// promises). Tapping a part names it; tapping it again clears it. The 3D
// Module is the enclosure alone where the build has an Assembly piece.

import * as React from "react";
import {
  Layers01Icon,
  MinusSignIcon,
  PlusSignIcon,
  Rotate01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { AssemblyViewer } from "@/components/create/model-panel/assembly-viewer";
import {
  INITIAL_VIEW,
  viewReducer,
  type View,
  type ViewAction,
} from "@/components/create/model-panel/model-panel";
import type { Assembly } from "@/lib/three/assembly";
import { SYSTEM_LABEL } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";

/**
 * `hero` is the build result's big view (the chat's finished card): a taller
 * stage, one-tap Explode / Put together and a Layers sheet for the systems,
 * in place of the slider. The deliverable page keeps the slider.
 */
export function ModelView({
  assembly,
  shellNote,
  onRetryMesh,
  hero = false,
}: {
  assembly: Assembly;
  shellNote: "pending" | "failed" | null;
  onRetryMesh?: () => void;
  hero?: boolean;
}) {
  const [layersOpen, setLayersOpen] = React.useState(false);
  const systemOf = React.useCallback(
    (id: string) => assembly.parts.find((p) => p.id === id)?.system,
    [assembly.parts],
  );
  const [view, dispatch] = React.useReducer(
    (v: View, a: ViewAction) => viewReducer(v, a, systemOf),
    INITIAL_VIEW,
  );
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const selected = view.selectedId
    ? (assembly.parts.find((p) => p.id === view.selectedId) ?? null)
    : null;
  const hint = !ready
    ? "Opening the 3D model…"
    : selected
      ? `${selected.name} · ${selected.ref} · ${SYSTEM_LABEL[selected.system]}`
      : view.explode === 100
        ? `${assembly.parts.length} parts separated · tap any part to identify`
        : "Tap a part to inspect it";

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-brand-subtle",
          hero ? "h-[260px]" : "h-[230px]",
        )}
      >
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <p className={T.rowTitle}>We couldn&apos;t open the 3D model</p>
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => {
                setFailed(false);
                setReady(false);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
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
            onHover={(id) => dispatch({ t: "hover", id })}
            onPick={(id) =>
              dispatch({ t: "select", id: id === view.selectedId ? null : id })
            }
            onBoxes={() => undefined}
            onMounted={() => undefined}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
        {!failed && (
          <div className="absolute bottom-2 right-2 flex flex-col">
            {[
              {
                icon: PlusSignIcon,
                label: "Zoom in",
                act: () => dispatch({ t: "camera", c: "zoom-in" }),
              },
              {
                icon: MinusSignIcon,
                label: "Zoom out",
                act: () => dispatch({ t: "camera", c: "zoom-out" }),
              },
              {
                icon: Rotate01Icon,
                label: "Back to the start view",
                act: () => dispatch({ t: "camera", c: "home" }),
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                onClick={b.act}
                className="group inline-flex size-[44px] items-center justify-center outline-none"
              >
                {/* 36 px drawn, 44 px to tap. */}
                <span className="inline-flex size-[36px] items-center justify-center rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface text-[color:var(--color-icon-default)] group-focus-visible:ring-2 group-focus-visible:ring-border-focus">
                  <Icon icon={b.icon} size={18} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {hero ? (
        <div className="grid grid-cols-2 gap-4">
          <Button
            hierarchy={view.explode > 0 ? "primary" : "secondary"}
            size="lg"
            className="w-full"
            aria-pressed={view.explode > 0}
            disabled={!ready || failed}
            onClick={() =>
              dispatch({ t: "explode", v: view.explode > 0 ? 0 : 100 })
            }
          >
            {view.explode > 0 ? "Put together" : "Explode"}
          </Button>
          <Button
            hierarchy="secondary"
            size="lg"
            className="w-full"
            disabled={!ready || failed || assembly.systems.length === 0}
            onClick={() => setLayersOpen(true)}
            iconLeading={<Icon icon={Layers01Icon} size={16} />}
          >
            Layers
          </Button>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-3">
            <span className="flex items-center justify-between">
              <span className={T.rowTitle}>Explode</span>
              <span
                className={cn(
                  T.micro,
                  "rounded-full bg-bg-subtle px-3 tabular-nums",
                )}
              >
                {view.explode}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={view.explode}
              onChange={(e) =>
                dispatch({ t: "explode", v: Number(e.target.value) })
              }
              className="h-[24px] w-full accent-[var(--color-bg-brand)]"
              aria-valuetext={`${view.explode}% apart`}
            />
          </label>
          <Button
            hierarchy="secondary"
            size="lg"
            className="w-full"
            disabled={!ready || failed || assembly.systems.length === 0}
            onClick={() => setLayersOpen(true)}
            iconLeading={<Icon icon={Layers01Icon} size={16} />}
          >
            Layers
          </Button>
        </>
      )}
      {
        <Sheet
          open={layersOpen}
          onClose={() => setLayersOpen(false)}
          title="Layers"
          description="Show or hide each system inside the model."
        >
          <ul className="flex flex-col rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle">
            {assembly.systems.map((s, i) => {
              const shown = !view.hidden.has(s.id);
              return (
                <li
                  key={s.id}
                  className={cn(
                    i > 0 &&
                      "border-t-[length:var(--border-width-1)] border-solid border-border-subtle",
                  )}
                >
                  <label className="flex min-h-[56px] cursor-pointer items-center gap-5 px-6">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={shown}
                      onChange={() => dispatch({ t: "toggleSystem", id: s.id })}
                      aria-label={`Show ${s.label}`}
                    />
                    <Checkbox checked={shown} decorative />
                    <span className={cn(T.bodyLg, "flex-1")}>{s.label}</span>
                    <span className={T.meta}>
                      {s.count} {s.count === 1 ? "part" : "parts"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {view.hidden.size > 0 && (
            <Button
              hierarchy="secondary"
              size="lg"
              className="w-full"
              onClick={() => dispatch({ t: "showAll" })}
            >
              Show all
            </Button>
          )}
        </Sheet>
      }
      <p
        role="status"
        className={cn(
          T.meta,
          "text-center",
          selected ? "text-text-primary" : "text-text-secondary",
        )}
      >
        {hint}
      </p>
      {shellNote === "pending" && (
        <p className={cn(T.meta, "text-text-tertiary")}>
          The enclosure takes the concept&apos;s shape once its 3D mesh is made;
          until then it is sized from the parts.
        </p>
      )}
      {shellNote === "failed" && (
        <p className={T.meta}>
          The concept shape couldn&apos;t be made, so the enclosure is sized
          from the parts.{" "}
          {onRetryMesh && (
            <button
              type="button"
              onClick={onRetryMesh}
              className={cn(T.label, "text-text-brand hover:underline")}
            >
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
