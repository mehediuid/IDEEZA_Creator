"use client";

// FlowStepper — floating pill anchored at the BOTTOM-CENTER of the viewport,
// just above the canvas bottom-bar. Visible on every product-creation route,
// hidden everywhere else.
//
// Why bottom-center: each module has its own chrome immediately below the
// TopBar (Breadcrumb, PriceStrip, mode switchers, etc.); putting the stepper
// up there piled it on top of that chrome. The bottom-center band is the one
// vertical zone that's reliably empty across PCB / Code / 3D / Preview / Brief.
//
// Roles:
//  • Visualizes progress in the 5-step pipeline (PCB → Code → 3D → Preview → Brief)
//  • Lets the user JUMP to any step (click a node)
//  • Auto-marks the prior step as completed whenever the user navigates
//    forward in the chain — works regardless of HOW they navigated (canvas
//    Next button inside a module, stepper click, browser URL, etc.).
//
// Not responsible for the forward action itself — each module already has
// its own destination-labeled "Continue to X" pill inside the canvas, and
// each step ≥2 has its own "Back to X" pill. We deliberately don't render
// either to avoid duplicate primary CTAs.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useProductFlow,
  FLOW_ORDER,
  FLOW_LABELS,
  FLOW_HREFS,
  stepFromPath,
  type FlowStep,
} from "./product-flow-provider";

export function FlowStepper() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, hydrated, markCompleted } = useProductFlow();
  const currentStep = stepFromPath(pathname);

  // Auto-complete: when the user navigates from step N → step >N, mark N as
  // completed. Triggered by ANY navigation source (canvas Next, stepper
  // click, browser URL, deep link from notification, etc.).
  const lastStepRef = React.useRef<FlowStep | null>(null);
  React.useEffect(() => {
    const previous = lastStepRef.current;
    if (previous && currentStep && previous !== currentStep) {
      const prevIdx = FLOW_ORDER.indexOf(previous);
      const currIdx = FLOW_ORDER.indexOf(currentStep);
      if (currIdx > prevIdx) {
        markCompleted(previous);
      }
    }
    lastStepRef.current = currentStep;
  }, [currentStep, markCompleted]);

  // Hidden on non-flow routes — home, settings, etc. stay clean.
  if (!currentStep) return null;

  return (
    <div
      role="navigation"
      aria-label="Product creation steps"
      style={{
        position: "fixed",
        // Sits above the 36px canvas bottom-bar. Aligns vertically with the
        // bottom-right Continue/Back pills so the bottom edge reads as one
        // band; stepper centered, action pills at the right edge.
        bottom: 56,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 31,
        padding: "5px 8px",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: 999,
        boxShadow: "0 8px 28px -10px rgba(0,0,0,.22)",
        display: "flex",
        alignItems: "center",
        gap: 0,
      }}
    >
      {FLOW_ORDER.map((step, idx) => {
        const isCompleted = hydrated
          ? !!state[step as keyof typeof state]
          : false;
        const isCurrent = currentStep === step;
        const isLast = idx === FLOW_ORDER.length - 1;
        return (
          <React.Fragment key={step}>
            <StepNode
              index={idx + 1}
              label={FLOW_LABELS[step]}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              onClick={() => router.push(FLOW_HREFS[step])}
            />
            {!isLast && <Connector active={isCompleted} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepNode({
  index,
  label,
  isCompleted,
  isCurrent,
  onClick,
}: {
  index: number;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const dotStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    transition: "background .14s, border-color .14s, color .14s",
    flex: "0 0 22px",
  };

  let nodeStyles: React.CSSProperties;
  if (isCurrent) {
    nodeStyles = {
      ...dotStyle,
      background: "var(--color-violet-600)",
      color: "var(--color-text-on-brand)",
      boxShadow: "0 0 0 4px var(--color-bg-brand-subtle)",
    };
  } else if (isCompleted) {
    nodeStyles = {
      ...dotStyle,
      background: "var(--color-bg-brand-subtle)",
      color: "var(--color-violet-600)",
      border: "var(--border-width-1-5) solid var(--color-violet-600)",
    };
  } else {
    nodeStyles = {
      ...dotStyle,
      background: "var(--color-bg-surface)",
      color: "var(--color-text-tertiary)",
      border: "var(--border-width-1) solid var(--color-border-subtle)",
    };
  }

  const labelColor = isCurrent
    ? "var(--color-violet-600)"
    : isCompleted
      ? "var(--color-text-primary)"
      : "var(--color-text-tertiary)";

  return (
    <button
      onClick={onClick}
      aria-current={isCurrent ? "step" : undefined}
      aria-label={`Step ${index}: ${label}${
        isCompleted ? " (completed)" : isCurrent ? " (current)" : ""
      }`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "transparent",
        border: "none",
        padding: "5px 10px",
        cursor: "pointer",
        borderRadius: 999,
        transition: "background .14s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface-raised)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={nodeStyles}>
        {isCompleted ? (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        ) : (
          index
        )}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: isCurrent ? 700 : 600,
          color: labelColor,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 12,
        height: 2,
        background: active
          ? "var(--color-violet-600)"
          : "var(--color-border-subtle)",
        borderRadius: 1,
        transition: "background .14s",
        flex: "0 0 12px",
      }}
    />
  );
}
