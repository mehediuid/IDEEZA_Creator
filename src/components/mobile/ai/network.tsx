"use client";

// The project's network at the concept stage (5494 · 5602 · Change link
// 5841–6298): worked out from the prompt (concept-network.ts), optional —
// Connect your products / Add network first, then one row per link (both
// ends' pictures, the ends, how they connect or what's wrong, what travels)
// that opens Change link; Remove network, the card's last row, puts every
// radio it changed back. Change link is a sheet of three rows: Protocol (the
// radios both ends can carry — it changes their parts, cost and power),
// Direction, What travels; Save link, and Back to suggested for a changed
// link. Read only once a build holds the products.

import * as React from "react";
import Image from "next/image";
import { Alert02Icon, Link01Icon, Router01Icon, SmartPhone01Icon, Unlink01Icon } from "@hugeicons/core-free-icons";
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
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard } from "../kit/list";
import { PickRow } from "./pick-sheet";
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
    <section aria-labelledby="network-title" className={LIST_CARD}>
      <div className="flex flex-col gap-5 px-8 py-6">
        <div className="flex items-center gap-5">
          <span className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
            <Icon icon={Router01Icon} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <Eyebrow>Network</Eyebrow>
            <h2 id="network-title" className={T.section}>
              {net.added ? "Connected" : lone ? "Connect it" : "Connect your products"}
            </h2>
          </div>
        </div>
        {!net.added && net.links.length > 0 && <p className={T.meta}>{offer}</p>}
        {net.working && <p className={cn(T.meta, "text-text-tertiary")}>Working out how the products talk…</p>}
        {!net.added && net.links.length > 0 && !locked && (
          <Button hierarchy="tonal" size="xl" className="w-full" iconLeading={<Icon icon={Link01Icon} size={18} />} onClick={flow.addNetwork}>
            Add network
          </Button>
        )}
      </div>
      {/* Added: each link is a row that opens Change link (lens 6: no button per link);
          Remove network is the card's last row. */}
      {net.added && (
        <ul aria-label="Links" className={cn("border-t-[length:var(--border-width-1)] border-solid border-border", LIST_DIVIDERS)}>
          {net.links.map((l) => (
            <LinkRow key={l.id} link={l} net={net} imageOf={(id) => flow.rail.rows.find((r) => r.productId === id)?.imageUrl ?? undefined} onChange={() => setEditing(l.id)} />
          ))}
          {!locked && (
            <li>
              <button
                type="button"
                onClick={() => {
                  flow.removeNetwork();
                  toast({ title: "Network removed. The radios it changed are back to their own." });
                }}
                className={LIST_ROW}
              >
                <span className="shrink-0 text-[color:var(--color-icon-error)]">
                  <Icon icon={Unlink01Icon} size={20} />
                </span>
                <span className={cn(T.body, "text-text-error")}>Remove network</span>
              </button>
            </li>
          )}
        </ul>
      )}
      {link && (
        <ChangeLinkSheet
          link={link}
          net={net}
          onClose={() => setEditing(null)}
          onReset={
            link.edited
              ? () => {
                  flow.resetLink(link.id);
                  setEditing(null);
                }
              : undefined
          }
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
}: {
  link: ConceptLink;
  net: ConceptNetwork;
  /** A product end's concept image (5602 draws the product's tile, not a glyph). */
  imageOf: (endId: string) => string | undefined;
  onChange: () => void;
}) {
  const problem = problemLine(link, net.peers);
  const connects = connectsLine(link);
  const ends = endsLine(link, net.peers);
  const body = (
    <>
      {/* The two ends, overlapped: the products' concept images, else the glyph. */}
      <span aria-hidden className="flex shrink-0 items-center self-start pt-1">
        <EndTile url={imageOf(link.from)} icon={link.from === APP || link.from === CLOUD ? SmartPhone01Icon : Router01Icon} />
        <EndTile url={imageOf(link.to)} icon={link.to === APP || link.to === CLOUD ? SmartPhone01Icon : Router01Icon} className="-ml-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={T.rowTitle}>{ends}</span>
        {problem ? (
          <span className={cn(T.meta, "flex items-start gap-2 text-text-warning")}>
            <span className="mt-[2px] shrink-0">
              <Icon icon={Alert02Icon} size={14} />
            </span>
            {problem}
          </span>
        ) : (
          connects && <span className={cn(T.meta, "tabular-nums")}>{connects}</span>
        )}
        <span className={cn(T.meta, "text-text-tertiary")}>{travelsLine(link, net.peers)}</span>
      </span>
    </>
  );
  // Read only once a build holds the products: no chevron, nothing to open.
  if (link.locked) return <li className={cn(LIST_ROW, "items-start hover:bg-transparent")}>{body}</li>;
  return (
    <li>
      <button type="button" onClick={onChange} aria-label={`Change link — ${ends}`} className={cn(LIST_ROW, "items-start")}>
        {body}
        <Chevron className="self-center" />
      </button>
    </li>
  );
}

function ChangeLinkSheet({
  link,
  net,
  onClose,
  onSave,
  onReset,
}: {
  link: ConceptLink;
  net: ConceptNetwork;
  onClose: () => void;
  onSave: (change: { radio: RadioKey | null; from: string; twoWay: boolean; carries: Carries }) => void;
  /** Back to suggested: only for a link the maker changed. */
  onReset?: () => void;
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
          {/* Moved here from the card (lens 4): the way back, only for a link that was changed. ✕ closes. */}
          {onReset && (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={onReset}>
              Back to suggested
            </Button>
          )}
        </>
      }
    >
      {/* One grouped list: each choice a row with its value, opening the kit's pick list. */}
      <ListCard label="Link">
        <PickRow
          label="Protocol"
          placeholder="None both can carry"
          disabled={!choices.length}
          value={radio}
          options={choices.map((k) => ({ value: k, label: RADIOS[k].label, sub: RADIOS[k].forWhat }))}
          onChange={(v) => setRadio(v as RadioKey)}
        />
        <PickRow
          label="Direction"
          value={direction}
          options={[
            { value: "ab", label: `${a} → ${b}` },
            { value: "ba", label: `${b} → ${a}` },
            { value: "both", label: "Both ways" },
          ]}
          onChange={(v) => setDirection(v as "ab" | "ba" | "both")}
        />
        <PickRow label="What travels" value={carries} options={CARRIES_ORDER.map((c) => ({ value: c, label: CARRIES_LABEL[c] }))} onChange={(v) => setCarries(v as Carries)} />
      </ListCard>
      <p className={T.meta}>
        {choices.length
          ? toApp
            ? "Changes this product's radio — its parts, cost and power follow."
            : "Changes both products' radio — their parts, cost and power follow."
          : "These two share no radio they can both carry. Change a chip in its spec first."}
      </p>
      <p className={cn(T.meta, "text-text-tertiary")}>Everything else about the network is set on the project&apos;s Connection Map once it is saved.</p>
    </Sheet>
  );
}

/** One end of a link: the product's concept image, else the glyph (the app, or a product not yet drawn). */
function EndTile({ url, icon, className }: { url?: string; icon: typeof Router01Icon; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-[36px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-[length:var(--border-width-2)] border-solid border-bg-surface bg-bg-subtle text-[color:var(--color-icon-default)]",
        className,
      )}
    >
      {url ? <Image src={url} alt="" fill sizes="36px" className="object-cover" unoptimized /> : <Icon icon={icon} size={18} />}
    </span>
  );
}
