"use client";

// The project's network at the concept stage (5494 · 5602 · Change link
// 5841–6298): worked out from the prompt (concept-network.ts), optional —
// Connect your products / Add network first, then the links with their ends,
// how they connect and what travels, each with Change link; Remove network
// puts every radio it changed back. Change link is a sheet: Protocol (the
// radios both ends can carry — it changes their parts, cost and power),
// Direction, What travels; Save link. Read only once a build holds the
// products.

import * as React from "react";
import Image from "next/image";
import { Alert02Icon, Link01Icon, Router01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import {
  CARRIES_LABEL,
  connectsLine,
  endName,
  endsLine,
  problemLine,
  protocolChoices,
  travelsLine,
  type ConceptLink,
  type ConceptNetwork,
} from "@/lib/create/concept-network";
import { RADIOS, radioKeyOf } from "@/lib/spec/catalog";
import type { RadioKey } from "@/lib/spec/types";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Eyebrow } from "../kit/eyebrow";
import { LIST_CARD } from "../kit/list";
import { PickField } from "./pick-sheet";
import type { ConceptFlow } from "./use-concept-flow";

type Carries = keyof typeof CARRIES_LABEL;
const CARRIES_ORDER: Carries[] = ["commands", "sensor", "events", "data+commands"];
const APP = "app";
const CLOUD = "cloud";

export function NetworkCard({ flow }: { flow: ConceptFlow }) {
  const net = flow.network;
  const toast = useToast();
  const [editing, setEditing] = React.useState<string | null>(null);
  if (!net.show) return null;
  const locked = net.links.some((l) => l.locked);
  const lone = net.links.length > 0 && net.links.every((l) => [l.from, l.to].some((e) => e === APP || e === CLOUD));
  const offer = !lone
    ? "Connect your products — worked out from your prompt."
    : net.links.some((l) => l.from === CLOUD || l.to === CLOUD)
      ? "Connect it to the cloud — worked out from your prompt."
      : "Connect it to a phone app — worked out from your prompt.";
  const link = editing ? net.links.find((l) => l.id === editing) ?? null : null;
  return (
    <section aria-labelledby="network-title" className={cn(LIST_CARD, "flex flex-col gap-6 p-7")}>
      <div className="flex items-start gap-5">
        <span className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
          <Icon icon={Router01Icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <Eyebrow>Network</Eyebrow>
          <h2 id="network-title" className={T.section}>
            {net.added ? "Connected" : lone ? "Connect it" : "Connect your products"}
          </h2>
        </div>
        {net.added && !locked && (
          <button
            type="button"
            onClick={() => {
              flow.removeNetwork();
              toast({ title: "Network removed. The radios it changed are back to their own." });
            }}
            className={cn(T.meta, "-my-2 min-h-[40px] hover:underline")}
          >
            Remove network
          </button>
        )}
      </div>
      {!net.added && net.links.length > 0 && (
        <>
          <p className={T.meta}>{offer}</p>
          {!locked && (
            <Button hierarchy="tonal" size="lg" className="w-full" iconLeading={<Icon icon={Link01Icon} size={18} />} onClick={flow.addNetwork}>
              Add network
            </Button>
          )}
        </>
      )}
      {net.added && (
        <ul className="flex flex-col gap-5">
          {net.links.map((l) => (
            <LinkRow key={l.id} link={l} net={net} imageOf={(id) => flow.rail.rows.find((r) => r.productId === id)?.imageUrl ?? undefined} onChange={() => setEditing(l.id)} onReset={() => flow.resetLink(l.id)} />
          ))}
        </ul>
      )}
      {net.working && <p className={cn(T.meta, "text-text-tertiary")}>Working out how the products talk…</p>}
      {link && (
        <ChangeLinkSheet
          link={link}
          net={net}
          onClose={() => setEditing(null)}
          onSave={(change) => {
            flow.saveLink(link.id, change);
            setEditing(null);
            toast({ title: change.radio ? `Link saved. Both ends use ${RADIOS[change.radio].label}.` : "Link saved.", lead: "success" });
          }}
        />
      )}
    </section>
  );
}

function LinkRow({
  link,
  net,
  imageOf,
  onChange,
  onReset,
}: {
  link: ConceptLink;
  net: ConceptNetwork;
  /** A product end's concept image (5602 draws the product's tile, not a glyph). */
  imageOf: (endId: string) => string | undefined;
  onChange: () => void;
  onReset: () => void;
}) {
  const problem = problemLine(link, net.peers);
  const connects = connectsLine(link);
  return (
    <li className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-bg-subtle p-6">
        <div className="flex w-full items-center gap-3" aria-hidden>
          <EndTile url={imageOf(link.from)} icon={link.from === APP || link.from === CLOUD ? SmartPhone01Icon : Router01Icon} />
          <span className="h-0 flex-1 border-t-[length:var(--border-width-1)] border-dashed border-border" />
          <span className="inline-flex size-[28px] items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-brand)] ring-1 ring-border-brand">
            <Icon icon={Link01Icon} size={14} />
          </span>
          <span className="h-0 flex-1 border-t-[length:var(--border-width-1)] border-dashed border-border" />
          <EndTile url={imageOf(link.to)} icon={link.to === APP || link.to === CLOUD ? SmartPhone01Icon : Router01Icon} />
        </div>
        <p className={cn(T.label, "text-center text-text-primary")}>{endsLine(link, net.peers)}</p>
        {problem ? (
          <p className={cn(T.meta, "flex items-start gap-2 text-center text-text-warning")}>
            <Icon icon={Alert02Icon} size={14} />
            {problem}
          </p>
        ) : (
          connects && <p className={cn(T.meta, "tabular-nums")}>{connects}</p>
        )}
        <p className={cn(T.meta, "text-center")}>{travelsLine(link, net.peers)}</p>
      </div>
      {!link.locked && (
        <div className="flex flex-col gap-2">
          <Button hierarchy="secondary" size="lg" className="w-full" onClick={onChange} aria-label={`Change link — ${endsLine(link, net.peers)}`}>
            Change link
          </Button>
          {link.edited && (
            <button type="button" onClick={onReset} className={cn(T.meta, "min-h-[40px] hover:underline")}>
              Back to suggested
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ChangeLinkSheet({
  link,
  net,
  onClose,
  onSave,
}: {
  link: ConceptLink;
  net: ConceptNetwork;
  onClose: () => void;
  onSave: (change: { radio: RadioKey | null; from: string; twoWay: boolean; carries: Carries }) => void;
}) {
  const peers = net.peers;
  const choices = React.useMemo(() => protocolChoices(link, peers), [link, peers]);
  const [radio, setRadio] = React.useState<RadioKey | null>(() => {
    if (link.radio && choices.includes(link.radio)) return link.radio;
    const guess = [peers.find((p) => p.id === link.from), peers.find((p) => p.id === link.to)]
      .map((p) => (p ? radioKeyOf(p.parts) : null))
      .find((k) => !!k && choices.includes(k));
    return guess ?? choices[0] ?? null;
  });
  const [direction, setDirection] = React.useState<"ab" | "ba" | "both">(link.twoWay ? "both" : "ab");
  const [carries, setCarries] = React.useState<Carries>(link.carries);
  const a = endName(link.from, peers);
  const b = endName(link.to, peers);
  const toApp = [link.from, link.to].some((e) => e === APP || e === CLOUD);
  return (
    <Sheet
      open
      onClose={onClose}
      title="Change link"
      description={endsLine(link, peers)}
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => onSave({ radio, from: direction === "ba" ? link.to : link.from, twoWay: direction === "both", carries })}
          >
            Save link
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className={T.rowTitle}>Protocol</p>
        <PickField
          title="Protocol"
          placeholder="No protocol both can carry"
          disabled={!choices.length}
          value={radio}
          options={choices.map((k) => ({ value: k, label: RADIOS[k].label, sub: RADIOS[k].forWhat }))}
          onChange={(v) => setRadio(v as RadioKey)}
        />
        <p className={T.meta}>
          {choices.length
            ? toApp
              ? "Changes this product's radio — its parts, cost and power follow."
              : "Changes both products' radio — their parts, cost and power follow."
            : "These two share no radio they can both carry. Change a chip in its spec first."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <p className={T.rowTitle}>Direction</p>
        <PickField
          title="Direction"
          value={direction}
          options={[
            { value: "ab", label: `${a} → ${b}` },
            { value: "ba", label: `${b} → ${a}` },
            { value: "both", label: "Both ways" },
          ]}
          onChange={(v) => setDirection(v as "ab" | "ba" | "both")}
        />
      </div>
      <div className="flex flex-col gap-3">
        <p className={T.rowTitle}>What travels</p>
        <PickField title="What travels" value={carries} options={CARRIES_ORDER.map((c) => ({ value: c, label: CARRIES_LABEL[c] }))} onChange={(v) => setCarries(v as Carries)} />
      </div>
      <p className={cn(T.meta, "text-text-tertiary")}>Everything else about the network is set on the project&apos;s Connection Map once it is saved.</p>
    </Sheet>
  );
}

/** One end of a link: the product's concept image, else the glyph (the app, or a product not yet drawn). */
function EndTile({ url, icon }: { url?: string; icon: typeof Router01Icon }) {
  return (
    <span className="relative inline-flex size-[36px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-surface text-[color:var(--color-icon-default)] ring-1 ring-border">
      {url ? <Image src={url} alt="" fill sizes="36px" className="object-cover" unoptimized /> : <Icon icon={icon} size={18} />}
    </span>
  );
}
