"use client";

// The dialogs of the Add Network flow. One frame — the create flow's own
// backdrop and surface — carries the wizard, the settings, the confirms and
// the two reference dialogs, so every one of them traps focus, closes on
// Escape and hands focus back the same way.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import {
  DIALOG_FIELDS,
  INTENTS,
  PROTOCOLS,
  ROLE_RULES,
  SCENARIOS,
} from "@/lib/network/catalog";
import { btn } from "./ui";

const WIDTH = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
} as const;

export function ModalFrame({
  open,
  onClose,
  title,
  description,
  size = "md",
  covered = false,
  children,
  footer,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof WIDTH;
  /** Another dialog is open on top of this one: it owns the keyboard. */
  covered?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useDialogFocus(open && !covered, panelRef);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center px-8 py-12">
      <div
        aria-hidden
        onClick={covered ? undefined : onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !covered && !e.defaultPrevented) {
            e.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3",
          WIDTH[size],
        )}
      >
        <header className="flex items-start gap-6 px-10 pb-4 pt-8">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-2 text-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-10 pb-8", bodyClassName)}>{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center gap-6 border-t border-solid border-border px-10 py-8">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Figma 15 and 17 — a decision that removes something, said plainly, with
 *  the way out first and the danger second. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "danger",
}: {
  open: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
}) {
  return (
    <ModalFrame
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="ml-auto flex items-center gap-6">
          <button type="button" className={btn.subtle} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={tone === "danger" ? btn.danger : btn.primary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
    </ModalFrame>
  );
}

// Figma 07. Step 5's last sentence follows the canvas, not the frame's copy
// (spec D11): arrows carry the payload, the protocol sits on the cards.
const HOW_TO = [
  { title: "Pick the protocol", body: "Use the protocol dropdown in the toolbar. All 12 are listed by name — Wi-Fi, Wi-Fi + MQTT, BLE, ESP-NOW, Zigbee, LoRa, Matter, CAN, RS-485, RS-232, I2C, SPI." },
  { title: "Switch to Draw link", body: "Press L, or click Draw link in the toolbar. A hint appears at the top of the canvas." },
  { title: "Click a port on the source", body: "Hover any box — 4 ports appear on its edges. Click the one you want the link to leave from." },
  { title: "Click a port on the target", body: "The arrow snaps into place and the side panel opens with the 3 questions." },
  { title: "Read the line style", body: "Dashed = Wi-Fi + MQTT through the cloud · Solid = direct (Wi-Fi Direct, ESP-NOW) · Double = via a gateway. One arrowhead means one-way, two mean both ways. The arrow's label says what it carries; the protocol shows on each product and in the side panel." },
];

export function HowToDrawDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="How to draw a connection"
      size="md"
      footer={
        <button type="button" className={cn(btn.primary, "w-full")} onClick={onClose}>
          Got it
        </button>
      }
    >
      <ol className="flex flex-col">
        {HOW_TO.map((s, i) => (
          <li key={s.title} className="flex gap-6 border-b border-solid border-border py-6 last:border-b-0">
            <span
              aria-hidden
              className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-solid border-border text-sm font-semibold text-text-primary"
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </ModalFrame>
  );
}

type Tab = "intent" | "protocols" | "fields" | "roles" | "scenarios";
const TABS: { key: Tab; label: string }[] = [
  { key: "intent", label: "Intent" },
  { key: "protocols", label: "Protocols" },
  { key: "fields", label: "Dialog fields" },
  { key: "roles", label: "Role rules" },
  { key: "scenarios", label: "Scenarios" },
];

function Table({ head, rows, accent = 1 }: { head: string[]; rows: string[][]; accent?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-solid border-border">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="bg-bg-subtle">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-6 py-4 text-2xs font-bold uppercase tracking-caps text-text-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join("|")} className="border-t border-solid border-border">
              {r.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-6 py-4 align-top",
                    i === 0 ? "font-semibold text-text-primary" : i === accent ? "text-text-brand" : "text-text-secondary",
                  )}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Figma "All parameters" — the reference behind every field on Review, read
 *  from the same catalog the fields themselves use. */
export function AllParametersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = React.useState<Tab>("intent");
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="All parameters"
      size="lg"
      footer={
        <button type="button" className={cn(btn.primary, "ml-auto")} onClick={onClose}>
          Close
        </button>
      }
    >
      <div role="tablist" aria-label="Parameter tables" className="mb-8 flex flex-wrap gap-2 border-b border-solid border-border">
        {TABS.map((t, i) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`params-tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="params-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next = (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
                setTab(TABS[next].key);
                tabRefs.current[next]?.focus();
              }}
              className={cn(
                "-mb-px border-b-2 border-solid px-6 py-4 text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand text-text-brand" : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id="params-panel" role="tabpanel" aria-labelledby={`params-tab-${tab}`}>
        {tab === "intent" && (
          <Table head={["Value", "Key", "Effect on dialog"]} rows={INTENTS.map((i) => [i.title, `intent=${i.key}`, i.effect])} />
        )}
        {tab === "protocols" && (
          <Table
            head={["Protocol", "Key", "Frequency", "Cloud block", "Use case"]}
            rows={PROTOCOLS.map((p) => [p.name, p.key, p.frequencyNote, p.cloudBlock, p.useCase])}
          />
        )}
        {tab === "fields" && (
          <Table head={["Field", "Type", "Options", "Auto-filled from"]} rows={DIALOG_FIELDS.map((f) => [f.field, f.type, f.options, f.from])} accent={-1} />
        )}
        {tab === "roles" && (
          <Table head={["Arrow pattern", "Role assigned", "Master field", "Topology"]} rows={ROLE_RULES.map((r) => [r.pattern, r.role, r.master, r.topology])} />
        )}
        {tab === "scenarios" && (
          <Table head={["Scenario", "Protocol", "Cloud", "Key difference"]} rows={SCENARIOS.map((s) => [s.scenario, s.protocol, s.cloud, s.difference])} />
        )}
      </div>
    </ModalFrame>
  );
}
