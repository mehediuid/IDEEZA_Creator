"use client";

// The Brief's rail. Two things, in the order they matter here: the steps this
// brief really runs — the sequence is intent-aware (`stepsFor`), so the rail
// is built from the same array the wizard walks and can't offer a step the
// flow doesn't have — and, under a hairline, the editor's module rail, which
// is how every other editor page gets back to PCB / Code / 3D.

import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";
import { useStepNav, RAIL_KEY_TO_STEP } from "@/components/manual/use-step-nav";
import { C } from "@/lib/pcb/colors";
import {
  BRIEF_FORM_LABEL,
  type BriefStepId,
  type Intent,
} from "@/lib/brief/types";

function labelFor(id: BriefStepId, intent: Intent | null): string {
  switch (id) {
    case "idea":
      return "Idea";
    case "preview":
      return "Preview";
    case "form":
      return BRIEF_FORM_LABEL[intent ?? "sell"];
    case "success":
      return "Done";
  }
}

export function BriefRail({
  steps,
  current,
  intent,
  onGo,
  topOffset = 62,
}: {
  steps: BriefStepId[];
  current: BriefStepId;
  intent: Intent | null;
  /** Jump back to a step already answered. Omitted = the rail is read-only. */
  onGo?: (step: BriefStepId) => void;
  topOffset?: number;
}) {
  const items = buildRail(null, "brief");
  const { go: goStep, activeProject } = useStepNav();
  const currentIndex = steps.indexOf(current);

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 0,
        left: 0,
        width: 74,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "var(--spacing-8)",
        overflowY: "auto",
        zIndex: 16,
      }}
    >
      <nav
        aria-label="Brief steps"
        data-brief-rail
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--spacing-2)",
          width: "100%",
        }}
      >
        {steps.map((id, i) => {
          const active = i === currentIndex;
          // Before the current step = answered; after it = not reached yet. An
          // index of -1 (a step forced in from outside the sequence) leaves
          // every row "ahead", which is the honest reading.
          const done = currentIndex >= 0 && i < currentIndex;
          const canGo = Boolean(onGo) && done;
          return (
            <button
              key={id}
              type="button"
              data-brief-step={id}
              aria-current={active ? "step" : undefined}
              disabled={!canGo}
              onClick={canGo ? () => onGo?.(id) : undefined}
              className="ix-brief-step"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-2)",
                padding: "var(--spacing-4) var(--spacing-2)",
                width: "100%",
                background: "none",
                border: "none",
                cursor: canGo ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 700,
                  background: active
                    ? C.primary
                    : done
                      ? "var(--color-bg-success-subtle)"
                      : "var(--color-bg-subtle)",
                  color: active
                    ? "var(--color-text-on-brand)"
                    : done
                      ? "var(--color-text-success)"
                      : "var(--color-text-tertiary)",
                  transition: "background .14s, color .14s",
                }}
              >
                {done ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: 600,
                  textAlign: "center",
                  lineHeight: 1.15,
                  color: active ? C.primary : done ? C.text : C.body,
                  maxWidth: 64,
                }}
              >
                {labelFor(id, intent)}
              </span>
            </button>
          );
        })}
      </nav>

      <div
        style={{
          width: 42,
          height: "var(--border-width-1)",
          background: "var(--color-border-subtle)",
          margin: "var(--spacing-6) 0",
          flexShrink: 0,
        }}
      />

      <nav
        aria-label="Editor modules"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {items.map((r) => (
          <div
            key={r.key}
            className="ix-nav"
            onClick={() => {
              const step = RAIL_KEY_TO_STEP[r.key];
              if (step && r.key !== "brief" && activeProject) goStep(step);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--spacing-2)",
              padding: "var(--spacing-4) var(--spacing-0)",
              width: "100%",
              cursor: r.cursor,
              opacity: r.opacity,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-xl)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: r.bg,
                color: r.fg,
              }}
            >
              <DsIcon name={r.icon} size={20} />
            </div>
            <span
              style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.15,
                color: r.fg,
                maxWidth: 64,
              }}
            >
              {r.label}
            </span>
          </div>
        ))}
      </nav>

      <style>{`
        .ix-brief-step:not(:disabled):hover span:first-child {
          background: var(--color-bg-brand-subtle);
          color: var(--color-text-brand);
        }
        .ix-brief-step:focus-visible {
          outline: var(--border-width-2) solid var(--color-border-brand);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}
