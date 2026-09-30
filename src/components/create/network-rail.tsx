"use client";

// The rail's Network section — how the project's products talk, worked out
// from the prompt at the concept stage (docs/superpowers/specs/2026-09-30-
// concept-network-design.md, S2). One row per link: its ends, how it
// connects, what travels and each end's role, and a line when it can't work
// yet. Change link is the light edit — the protocol, who sends and what
// travels — and the protocol it picks is written to both products' radios,
// so their spec sheets say the same. Full editing stays on the project's
// Connection Map. What each line says is decided in lib/create/concept-
// network.ts; this file is how it looks.

import * as React from "react";
import Link from "next/link";
import { Alert02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { ModalFrame } from "@/components/ideeza/dialog";
import { SelectMenu, type SelectOption } from "@/components/ideeza/select-menu";
import {
  APP,
  CARRIES_LABEL,
  CLOUD,
  connectsLine,
  endName,
  endsLine,
  problemLine,
  protocolChoices,
  rolesLine,
  travelsLine,
  type ConceptLink,
  type ConceptNetwork,
  type NetEnd,
} from "@/lib/create/concept-network";
import type { Carries } from "@/lib/network/types";
import { RADIOS, radioKeyOf } from "@/lib/spec/catalog";
import type { RadioKey } from "@/lib/spec/types";
import { OUTLINE_BUTTON } from "./buttons";

/** The section's heading — where the spec sheet's "Change it in Network"
 *  puts the keyboard. */
export const RAIL_NETWORK_ID = "rail-network";

/** 44 px on a phone and under a coarse pointer, as the rest of the flow. */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

// Draws 28 px, takes a 44 px press (the rail's own SHOW_BUTTON shape).
const QUIET =
  "relative inline-flex h-[28px] items-center gap-[4px] rounded-lg px-[6px] text-sm font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-[8px] after:content-[''] hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

/** What Change link saves. `radio` is null when the ends share none to pick. */
export type LinkChange = { radio: RadioKey | null; from: string; twoWay: boolean; carries: Carries };

export function NetworkSection({
  net,
  openHref,
  onSave,
  onReset,
}: {
  net: ConceptNetwork;
  /** The saved project's Connection Map, once it has a network. */
  openHref?: string | null;
  onSave: (linkId: string, change: LinkChange) => void;
  onReset: (linkId: string) => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const link = editing ? (net.links.find((l) => l.id === editing) ?? null) : null;
  if (!net.show) return null;
  return (
    <section aria-labelledby={RAIL_NETWORK_ID} className="flex flex-col">
      <div className="flex items-baseline gap-[12px] px-[18px] pb-[6px] pt-[18px]">
        <h3
          id={RAIL_NETWORK_ID}
          tabIndex={-1}
          className="scroll-mt-[120px] rounded-sm text-sm font-semibold text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Network
        </h3>
      </div>
      {net.links.length > 0 && (
        <ul role="list" className="mx-[10px] flex flex-col">
          {net.links.map((l) => (
            <LinkRow
              key={l.id}
              link={l}
              net={net}
              onChange={() => setEditing(l.id)}
              onReset={() => {
                onReset(l.id);
                setSaid(`${endsLine(l, net.peers)}: back to suggested.`);
              }}
            />
          ))}
        </ul>
      )}
      {net.working && (
        <p className="px-[18px] pt-[4px] text-sm text-text-tertiary">Working out how the products talk…</p>
      )}
      {openHref && (
        <div className="px-[12px] pt-[6px]">
          <Link href={openHref} className={`${QUIET} ${TAP}`}>
            Open network
            <Icon icon={ArrowRight01Icon} size={14} />
          </Link>
        </div>
      )}
      <p role="status" className="sr-only">
        {said}
      </p>
      {link && (
        <ChangeLinkDialog
          link={link}
          peers={net.peers}
          onClose={() => setEditing(null)}
          onSave={(change) => {
            onSave(link.id, change);
            setEditing(null);
            setSaid(
              change.radio
                ? `Link saved. Both ends use ${RADIOS[change.radio].label}.`
                : "Link saved.",
            );
          }}
        />
      )}
    </section>
  );
}

function LinkRow({
  link,
  net,
  onChange,
  onReset,
}: {
  link: ConceptLink;
  net: ConceptNetwork;
  onChange: () => void;
  onReset: () => void;
}) {
  const ends = endsLine(link, net.peers);
  const connects = connectsLine(link);
  const problem = problemLine(link, net.peers);
  const roles = rolesLine(link, net.roles, net.peers);
  return (
    <li className="flex flex-col gap-[2px] border-t border-solid border-border px-[8px] py-[10px] first:border-t-0">
      <p className="text-md font-semibold text-text-primary">{ends}</p>
      {problem ? (
        <p className="flex items-start gap-[6px] text-sm text-text-warning">
          <span aria-hidden className="inline-flex h-[18px] shrink-0 items-center">
            <Icon icon={Alert02Icon} size={14} />
          </span>
          <span className="min-w-0">{problem}</span>
        </p>
      ) : (
        connects && <p className="text-sm tabular-nums text-text-secondary">{connects}</p>
      )}
      <p className="text-sm text-text-secondary">{travelsLine(link, net.peers)}</p>
      {roles && <p className="text-sm text-text-tertiary">{roles}</p>}
      {!link.locked && (
        <div className="mt-[6px] flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
          <button
            type="button"
            onClick={onChange}
            aria-label={`Change link — ${ends}`}
            className={`${OUTLINE_BUTTON} ${TAP}`}
          >
            Change link
          </button>
          {link.edited && (
            <button
              type="button"
              onClick={onReset}
              aria-label={`Back to suggested — ${ends}`}
              className={QUIET}
            >
              Back to suggested
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const CARRIES_ORDER: Carries[] = ["commands", "sensor", "events", "data+commands"];

function ChangeLinkDialog({
  link,
  peers,
  onClose,
  onSave,
}: {
  link: ConceptLink;
  peers: NetEnd[];
  onClose: () => void;
  onSave: (change: LinkChange) => void;
}) {
  const choices = React.useMemo(() => protocolChoices(link, peers), [link, peers]);
  // The radio they share, else the one the sending end has now — the
  // likeliest fix for two that don't agree — else the first they can carry.
  const [radio, setRadio] = React.useState<RadioKey | null>(() => {
    if (link.radio && choices.includes(link.radio)) return link.radio;
    const own = peers.find((p) => p.id === link.from);
    const theirs = peers.find((p) => p.id === link.to);
    const guess = [own, theirs].map((p) => (p ? radioKeyOf(p.parts) : null)).find((k) => !!k && choices.includes(k));
    return guess ?? choices[0] ?? null;
  });
  const a = link.from;
  const b = link.to;
  const [direction, setDirection] = React.useState<"ab" | "ba" | "both">(link.twoWay ? "both" : "ab");
  const [carries, setCarries] = React.useState<Carries>(link.carries);
  const nameA = endName(a, peers);
  const nameB = endName(b, peers);
  const id = React.useId();

  const protocolOptions: SelectOption<RadioKey>[] = choices.map((k) => ({
    value: k,
    label: RADIOS[k].label,
    sub: RADIOS[k].forWhat,
  }));
  const directionOptions: SelectOption<"ab" | "ba" | "both">[] = [
    { value: "ab", label: `${nameA} → ${nameB}` },
    { value: "ba", label: `${nameB} → ${nameA}` },
    { value: "both", label: "Both ways" },
  ];
  const carriesOptions: SelectOption<Carries>[] = CARRIES_ORDER.map((c) => ({ value: c, label: CARRIES_LABEL[c] }));

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Change link"
      description={endsLine(link, peers)}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            className={TAP}
            onClick={() =>
              onSave({
                radio,
                from: direction === "ba" ? b : a,
                twoWay: direction === "both",
                carries,
              })
            }
          >
            Save link
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[16px]">
        <SelectMenu<RadioKey>
          id={`${id}-protocol`}
          label="Protocol"
          placeholder="No protocol both can carry"
          value={radio}
          options={protocolOptions}
          onChange={setRadio}
          disabled={!choices.length}
          hint={
            choices.length
              ? [APP, CLOUD].includes(link.from) || [APP, CLOUD].includes(link.to)
                ? "Changes this product's radio."
                : "Changes both products' radio — their parts, cost and power follow."
              : "These two share no radio they can both carry. Change a chip in its spec first."
          }
        />
        <SelectMenu<"ab" | "ba" | "both">
          id={`${id}-direction`}
          label="Direction"
          placeholder="Who sends"
          value={direction}
          options={directionOptions}
          onChange={setDirection}
        />
        <SelectMenu<Carries>
          id={`${id}-carries`}
          label="What travels"
          placeholder="What travels"
          value={carries}
          options={carriesOptions}
          onChange={setCarries}
        />
        <p className="text-sm text-text-tertiary">
          Everything else about the network is set on the project&apos;s Connection Map once it is saved.
        </p>
      </div>
    </ModalFrame>
  );
}
