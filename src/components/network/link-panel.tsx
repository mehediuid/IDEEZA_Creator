"use client";

// LinkPanel — the side panel for one arrow (Figma 05 · 06 · 13). Every link
// answers the same three questions, and the panel shows what those answers
// set before anything is saved. A new link is not on the map until Save
// link; a link on a map in read mode is shown, not edited (spec D5).

import * as React from "react";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { CARRIES, MIDDLES, PROTOCOLS } from "@/lib/network/catalog";
import { defaultLabel, filledIn, linkTitle, nodeName } from "@/lib/network/derive";
import type { CloudType, MapLink, NetProduct, ProtocolKey } from "@/lib/network/types";
import { AnswerPills, FactList, SectionTitle, btn } from "./ui";
import { cn } from "@/lib/utils";

export const PROTOCOL_OPTIONS = PROTOCOLS.map((p) => ({ value: p.key, label: p.name, sub: p.key }));

export function LinkPanel({
  link,
  mode,
  products,
  cloudType,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  link: MapLink;
  mode: "new" | "edit" | "read";
  products: NetProduct[];
  cloudType: CloudType;
  onChange?: (next: MapLink) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const name = (id: string) => nodeName(id, products, cloudType);
  const readOnly = mode === "read";
  // A label nobody typed follows the answers; one the AI wrote stays.
  const update = (patch: Partial<MapLink>) => {
    const next = { ...link, ...patch };
    const followed = link.label === defaultLabel(link, products);
    onChange?.(followed ? { ...next, label: defaultLabel(next, products) } : next);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>{mode === "new" ? "New link — not saved yet" : "Selected link"}</SectionTitle>
        <h3 className="mt-3 text-md font-bold text-text-primary">{linkTitle(link, name)}</h3>
      </div>

      <SelectMenu<ProtocolKey>
        ariaLabel="Protocol for this link"
        label="Protocol"
        value={link.protocol}
        options={PROTOCOL_OPTIONS}
        placeholder="Pick a protocol"
        disabled={readOnly}
        onChange={(protocol) => update({ protocol })}
      />

      <p className="text-xs leading-relaxed text-text-secondary">
        {mode === "new"
          ? "Nothing is drawn yet. Answer the three questions, then Save link — the arrow and its label appear on the canvas."
          : readOnly
            ? "The three answers this link was saved with."
            : "Answer 3 questions — role, topology and cloud type fill in for you."}
      </p>

      <Question n={1} text="Who starts the conversation?">
        <AnswerPills
          label="Who starts the conversation?"
          value={link.initiator}
          disabled={readOnly}
          onChange={(initiator) => update({ initiator })}
          options={[
            { value: "source", label: `${name(link.from)} →` },
            { value: "target", label: `← ${name(link.to)}` },
            { value: "both", label: "Both ways" },
          ]}
        />
      </Question>
      <Question n={2} text="Is anything in the middle?">
        <AnswerPills label="Is anything in the middle?" value={link.middle} disabled={readOnly} options={MIDDLES} onChange={(middle) => update({ middle })} />
      </Question>
      <Question n={3} text="What travels on this link?">
        <AnswerPills label="What travels on this link?" value={link.carries} disabled={readOnly} options={CARRIES} onChange={(carries) => update({ carries })} />
      </Question>

      <div className="rounded-lg border border-solid border-border bg-bg-subtle p-6">
        <SectionTitle>Filled in for you</SectionTitle>
        <FactList className="mt-4" rows={filledIn(link, { cloudType }, products)} />
      </div>

      {mode === "new" && (
        <div className="flex items-center gap-6">
          <button type="button" className={btn.quiet} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={btn.primary} onClick={onSave}>
            Save link
          </button>
        </div>
      )}
      {mode === "edit" && (
        <button
          type="button"
          onClick={onDelete}
          className={cn(btn.quiet, "w-full text-text-error hover:text-text-error")}
        >
          Delete this link
        </button>
      )}
      {readOnly && <p className="text-xs text-text-tertiary">Press Edit map to change this link.</p>}
    </div>
  );
}

function Question({ n, text, children }: { n: number; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-text-primary">
        {n} · {text}
      </p>
      {children}
    </div>
  );
}
