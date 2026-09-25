"use client";

// The panel's rail, in its two faces: the model's overview with a switch per
// system (Figma 47167:30361), and a part's detail once one is picked
// (47167:30317; isolated, 47167:27551). While the viewer prepares it is a
// skeleton of the overview (47167:27344).

import * as React from "react";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Divider, IconButton, Toggle } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { mm3 } from "@/lib/spec/units";
import { SYSTEM_LABEL, type Assembly, type AssemblyPart, type SystemId } from "@/lib/three/assembly";

const OVERLINE = "text-2xs font-semibold uppercase leading-2xs tracking-caps text-text-tertiary";
const FRAME = "flex flex-col overflow-y-auto rounded-xl border border-solid border-card-border bg-bg-surface p-[14px]";
const PRIMARY_SM =
  "inline-flex h-[32px] w-full items-center justify-center gap-[6px] rounded-lg bg-[var(--color-button-primary-bg)] px-[12px] text-sm font-semibold leading-xs tracking-wide text-[color:var(--color-button-primary-text)] outline-none transition-colors duration-fast hover:bg-[var(--color-button-primary-bg-hover)] focus-visible:ring-2 focus-visible:ring-border-focus";
const SECONDARY_SM =
  "inline-flex h-[32px] w-full items-center justify-center gap-[6px] rounded-lg border-[1.5px] border-solid border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] px-[12px] text-sm font-semibold leading-xs tracking-wide text-[color:var(--color-button-secondary-text)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
const LINK_SM =
  "rounded-xs text-sm font-medium leading-xs text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export type ShellNote = "pending" | "failed" | null;

export function OverviewRail({
  assembly,
  hidden,
  onToggle,
  compact = false,
  className,
}: {
  assembly: Assembly;
  hidden: ReadonlySet<SystemId>;
  onToggle: (id: SystemId) => void;
  /** Fullscreen floats the rail over the model: the model and its systems
   *  only (Figma 47167:27642). */
  compact?: boolean;
  className?: string;
}) {
  const total = assembly.parts.length;
  const visibleParts = assembly.parts.filter((p) => !hidden.has(p.system)).length;
  const filtered = hidden.size > 0;
  return (
    <div className={cn(FRAME, "justify-between gap-[12px]", className)}>
      <div className="flex flex-col gap-[12px]">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className={OVERLINE}>Model</p>
          <p className="truncate text-lg font-semibold leading-lg tracking-wide text-text-primary">
            {assembly.title}
          </p>
          <p className="text-sm leading-sm text-text-tertiary">
            {total} {total === 1 ? "part" : "parts"} · {assembly.systems.length}{" "}
            {assembly.systems.length === 1 ? "system" : "systems"}
          </p>
        </div>
        <Divider />
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px]">
          <p className={cn(OVERLINE, "flex-1")}>Systems</p>
          <p
            className={cn(
              "whitespace-nowrap text-sm font-medium leading-sm",
              filtered ? "text-text-brand" : "text-text-tertiary",
            )}
          >
            {filtered ? `${visibleParts} of ${total}` : `${total} visible`}
          </p>
        </div>
        <ul role="list" className="m-0 flex list-none flex-col gap-[11px] p-0">
          {assembly.systems.map((s) => {
            const on = !hidden.has(s.id);
            return (
              <li key={s.id} className="flex items-center gap-[8px] py-[3px]">
                <span className="min-w-0 flex-1 truncate text-sm font-medium leading-sm text-text-primary">
                  {s.label}
                </span>
                <span className="flex items-center gap-[12px]">
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums leading-sm text-text-tertiary",
                      !on && "opacity-40",
                    )}
                  >
                    {s.count}
                  </span>
                  <Toggle size="sm" checked={on} onChange={() => onToggle(s.id)} aria-label={`Show ${s.label}`} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {!compact && (
        <div className="flex flex-col gap-[12px]">
          <Divider />
          <div className="flex flex-col items-start gap-[8px]">
            <p className={OVERLINE}>What ships</p>
            {whatShips(assembly).map((line) => (
              <Badge key={line} tone="blue" icon={<Icon icon={CheckmarkCircle01Icon} size={12} />}>
                {line}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// The design's badges named files and print settings this surface doesn't
// hand over; these are the spec's own facts, and the bosses are drawn.
function whatShips(a: Assembly): string[] {
  const lines = [mm3(a.size), `${a.material} · ${a.wallMm} mm wall`];
  if (a.board) lines.push(`Mount points for the ${a.board.w} × ${a.board.h} mm board`);
  return lines;
}

export function PartRail({
  assembly,
  part,
  isolated,
  shellNote,
  onRetryMesh,
  onClose,
  onIsolate,
  onExitIsolation,
  onWholeModel,
  onSelect,
  className,
}: {
  assembly: Assembly;
  part: AssemblyPart;
  isolated: boolean;
  shellNote: ShellNote;
  onRetryMesh?: () => void;
  onClose: () => void;
  onIsolate: () => void;
  onExitIsolation: () => void;
  onWholeModel: () => void;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const siblings = assembly.parts.filter((p) => p.system === part.system && p.id !== part.id);
  const specs: Array<[string, string]> = [
    ["Part reference", part.ref],
    ["Quantity", `${part.instance.n} of ${part.instance.of}`],
  ];
  if (part.material) specs.push(["Material", part.material]);
  if (part.massG !== undefined) specs.push(["Mass", `${part.massG} g`]);
  specs.push(["System", SYSTEM_LABEL[part.system]]);
  const shellPart = part.system === "enclosure" && part.shape !== "mesh";

  return (
    <div className={cn(FRAME, "gap-[12px]", className)}>
      <div className="flex items-center gap-[8px]">
        <p className={cn(OVERLINE, "flex-1 text-text-brand")}>{SYSTEM_LABEL[part.system]}</p>
        <IconButton
          hierarchy="ghost"
          size="sm"
          aria-label="Close the part"
          title="Close the part"
          icon={<Icon icon={Cancel01Icon} size={16} />}
          onClick={onClose}
        />
      </div>

      <div className="flex flex-col gap-[20px]">
        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[20px]">
            <div className="flex flex-col gap-[4px]">
              <p className="text-lg font-semibold leading-lg tracking-wide text-text-primary">{part.name}</p>
              <p className="text-xs leading-xs text-text-tertiary">{part.description}</p>
              {shellPart && shellNote && (
                <p className="text-xs leading-xs text-text-tertiary">
                  {shellNote === "pending"
                    ? "The concept shape is still being made — this is the shell sized from the spec."
                    : "The concept shape couldn’t be made — this is the shell sized from the spec."}{" "}
                  {shellNote === "failed" && onRetryMesh && (
                    <button type="button" onClick={onRetryMesh} className={LINK_SM}>
                      Try again
                    </button>
                  )}
                </p>
              )}
            </div>
            <Divider />
            <dl className="m-0 flex flex-col gap-[8px]">
              {specs.map(([k, v]) => (
                <div key={k} className="flex items-center gap-[8px]">
                  <dt className="min-w-0 flex-1 text-sm font-medium leading-sm text-text-tertiary">{k}</dt>
                  <dd className="m-0 whitespace-nowrap text-sm font-semibold leading-xs tracking-wide text-text-primary">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col items-center gap-[10px]">
            {isolated ? (
              <>
                <button type="button" onClick={onExitIsolation} className={SECONDARY_SM}>
                  Exit isolation
                </button>
                <button type="button" onClick={onWholeModel} className={LINK_SM}>
                  Show the whole model
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onIsolate} className={PRIMARY_SM}>
                  Isolate this part
                </button>
                <button type="button" onClick={onClose} className={LINK_SM}>
                  Clear selection
                </button>
              </>
            )}
          </div>
        </div>

        {siblings.length > 0 && (
          <div className="flex flex-col gap-[14px]">
            <Divider />
            <div className="flex flex-col gap-[8px]">
              <p className={OVERLINE}>Other parts in this system</p>
              <ul role="list" className="m-0 flex list-none flex-col gap-[8px] p-0">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="flex w-full items-center gap-[8px] rounded-xs text-left outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-xs tracking-wide text-text-primary">
                        {s.name}
                      </span>
                      <span className="whitespace-nowrap text-sm font-medium leading-sm text-text-tertiary">{s.ref}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Label widths of the skeleton's rows, from the frame's own spacers.
const SKELETON_ROWS = ["w-[132px]", "w-[154px]", "w-[176px]", "w-[132px]", "w-[154px]", "w-[176px]", "w-[154px]"];

export function SkeletonRail({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn(FRAME, "gap-[12px]", className)}>
      <div className="flex flex-col gap-[6px]">
        <p className={OVERLINE}>Model</p>
        <span className="h-[16px] w-[140px] rounded-sm bg-bg-subtle motion-safe:animate-pulse" />
        <span className="h-[12px] w-[100px] rounded-sm bg-bg-subtle motion-safe:animate-pulse" />
      </div>
      <Divider />
      <div className="flex flex-col gap-[14px]">
        <p className={OVERLINE}>Systems</p>
        {SKELETON_ROWS.map((w, i) => (
          <div key={i} className="flex h-[20px] items-center gap-[8px]">
            <span className={cn("h-[10px] rounded-sm bg-bg-subtle motion-safe:animate-pulse", w)} />
            <span className="flex-1" />
            <span className="h-[20px] w-[36px] rounded-full bg-bg-subtle motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
