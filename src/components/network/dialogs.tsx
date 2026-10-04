"use client";

// The dialogs of the Add Network flow. One frame — the create flow's own
// backdrop and surface — carries the wizard, the settings, the confirms and
// the two reference dialogs, so every one of them traps focus, closes on
// Escape and hands focus back the same way.

import * as React from "react";
import { ModalFrame } from "@/components/ideeza/dialog";
import { cn } from "@/lib/utils";
import {
  DIALOG_FIELDS,
  INTENTS,
  PROTOCOLS,
  ROLE_RULES,
  SCENARIOS,
} from "@/lib/network/catalog";
import { btn } from "./ui";

// The frame and the confirm moved to the design system
// (components/ideeza/dialog.tsx) when deleting a project needed the same
// confirm. Every network import keeps working through this re-export.
export { ModalFrame, ConfirmDialog } from "@/components/ideeza/dialog";

// Figma 07. Step 5's last sentence follows the canvas, not the frame's copy
// (spec D11): arrows carry the payload, the protocol sits on the cards.
const HOW_TO = [
  { title: "Pick the protocol", body: "Use the protocol dropdown in the toolbar. All 14 are listed by name — Wi-Fi, Wi-Fi + MQTT, BLE, ESP-NOW, nRF24, Zigbee, LoRa, Cellular, Matter, CAN, RS-485, RS-232, I2C, SPI." },
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
