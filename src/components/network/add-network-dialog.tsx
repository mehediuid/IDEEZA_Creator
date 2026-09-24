"use client";

// AddNetworkDialog — Figma 02–09b. Five steps in one dialog:
//
//   Setup   the goal (network template) and which products join
//   Method  AI Auto-Map or Manual Canvas — AI shows its proposal first (04)
//   Connect the map, drawn or checked, one link at a time
//   Review  network settings and every product's row, filled in from the map
//   Done    what was saved, and the way to the Connection Map
//
// Nothing is written until Create network. Mount it only while open: every
// open is a fresh draft.

import * as React from "react";
import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { TextInput } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import type { BuildJob } from "@/lib/create/history";
import type { ManualProject } from "@/lib/manual/projects";
import {
  CARRIES,
  CLOUD_TYPES,
  INTENTS,
  SENSORS,
  intentInfo,
  labelOf,
  protocolInfo,
} from "@/lib/network/catalog";
import {
  ROLE_LABEL,
  createBlocker,
  linkTitle,
  masterChange,
  masterFieldOf,
  nodeName,
  pickMaster,
  productChip,
  productStatus,
  protocolsUsed,
  rolesOf,
  sendsSensorData,
  settingsFor,
  speaks,
} from "@/lib/network/derive";
import {
  arrangeFor,
  layoutNodes,
  planLinks,
  syncNodes,
  validateAiLinks,
} from "@/lib/network/planner";
import { networkProducts } from "@/lib/network/products";
import { saveNetwork } from "@/lib/network/store";
import type {
  CloudType,
  Frequency,
  Intent,
  MapLink,
  MapSource,
  Method,
  NetProduct,
  Network,
  ProductSettings,
  ProtocolKey,
  Role,
  Topology,
} from "@/lib/network/types";
import {
  AllParametersDialog,
  ConfirmDialog,
  HowToDrawDialog,
  ModalFrame,
} from "./dialogs";
import { PROTOCOL_OPTIONS } from "./link-panel";
import { MapEditor, type MapDoc } from "./map-editor";
import { ProductForm, frequencyOptions } from "./product-form";
import { Chip, PasswordInput, RoleChip, btn } from "./ui";

type Step = "setup" | "method" | "suggested" | "connect" | "review" | "done";

const STEPS = ["Setup", "Method", "Connect", "Review", "Done"];
const STEP_INDEX: Record<Step, number> = {
  setup: 0,
  method: 1,
  suggested: 1,
  connect: 2,
  review: 3,
  done: 4,
};

const compact = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "");

export function AddNetworkDialog({
  project,
  build,
  onClose,
  onViewNetwork,
}: {
  project: ManualProject;
  build: BuildJob | null;
  onClose: () => void;
  onViewNetwork: () => void;
}) {
  const products = React.useMemo(() => networkProducts(project, build), [project, build]);

  const [step, setStep] = React.useState<Step>("setup");
  const [intent, setIntent] = React.useState<Intent>("ctrl");
  const [chosenIds, setChosenIds] = React.useState<string[]>(() => products.map((p) => p.id));
  const [method, setMethod] = React.useState<Method>("ai");
  const [doc, setDoc] = React.useState<MapDoc | null>(null);
  const [source, setSource] = React.useState<MapSource>("manual");
  const [fitKey, setFitKey] = React.useState(0);
  const [mapping, setMapping] = React.useState(false);
  const [pendingLink, setPendingLink] = React.useState(false);

  const [name, setName] = React.useState(project.name);
  const [cloudName, setCloudName] = React.useState(compact(project.name));
  const [cloudPassword, setCloudPassword] = React.useState("");
  // Red only once the maker has left the field empty, not the moment the
  // step opens.
  const [passwordLeft, setPasswordLeft] = React.useState(false);
  const [cloudType, setCloudType] = React.useState<CloudType>("mqtt");
  const [protocol, setProtocol] = React.useState<ProtocolKey>("WM");
  const [frequency, setFrequency] = React.useState<Frequency>("2.4");
  const [stored, setStored] = React.useState<Record<string, ProductSettings>>({});
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const [howTo, setHowTo] = React.useState(false);
  const [allParams, setAllParams] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);
  const [breaking, setBreaking] = React.useState<{ links: MapLink[]; removed: MapLink[]; masterId: string } | null>(null);
  const [saved, setSaved] = React.useState<Network | null>(null);
  // View Network navigates to a route whose payload has to load; the press
  // says so rather than sitting there looking missed.
  const [leaving, setLeaving] = React.useState(false);

  const aiAbort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => aiAbort.current?.abort(), []);

  const chosen = React.useMemo(
    () => products.filter((p) => chosenIds.includes(p.id)),
    [products, chosenIds],
  );
  const minProducts = intent === "p2p" || intent === "both" ? 2 : 1;
  const setupBlocker =
    chosen.length < minProducts
      ? minProducts === 1
        ? "Pick at least one product for this network."
        : `"${intentInfo(intent).title}" needs at least two products.`
      : null;

  const topology: Topology = intent === "p2p" ? "p2p" : intent === "both" ? "tree" : "star";
  const draftNetwork = React.useMemo(
    () => ({
      links: doc?.links ?? [],
      masterId: doc?.masterId ?? null,
      protocol,
      frequency,
      repeater: "none" as const,
      topology,
      cloudType,
      products: stored,
    }),
    [doc, protocol, frequency, topology, cloudType, stored],
  );
  const settings = React.useMemo(() => settingsFor(chosen, draftNetwork), [chosen, draftNetwork]);
  const roles = React.useMemo(
    () => rolesOf(chosenIds, doc?.links ?? [], doc?.masterId ?? null),
    [chosenIds, doc],
  );
  const isProduct = React.useCallback((id: string) => chosen.some((p) => p.id === id), [chosen]);
  const nm = (id: string) => nodeName(id, chosen, cloudType);

  // ── transitions ──

  const landMap = (next: MapDoc, from: MapSource) => {
    setDoc(next);
    setSource(from);
    setFitKey((k) => k + 1);
    const used = protocolsUsed(next.links);
    if (used.length) setProtocol(used[0]);
  };

  const continueFromSetup = () => {
    setCloudType(intent === "p2p" ? "none" : "mqtt");
    // Coming back through Setup keeps the map, minus what left it.
    if (doc) {
      const synced = syncNodes(doc.nodes, doc.links, intent, chosen);
      setDoc({ ...synced, masterId: synced.links.some((l) => l.from === doc.masterId || l.to === doc.masterId) ? doc.masterId : pickMaster(chosenIds, synced.links) });
    }
    setStep("method");
  };

  const runMethod = async () => {
    if (method === "manual") {
      landMap({ nodes: layoutNodes(intent, chosen), links: [], masterId: null }, "manual");
      setStep("connect");
      return;
    }
    setMapping(true);
    const nodes = layoutNodes(intent, chosen);
    aiAbort.current?.abort();
    const ctrl = new AbortController();
    aiAbort.current = ctrl;
    let links: MapLink[] = [];
    try {
      const res = await fetch("/api/network/automap", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          nodes: nodes.map((n) => {
            const p = chosen.find((x) => x.id === n.id);
            return {
              id: n.id,
              kind: n.kind,
              name: nodeName(n.id, chosen, intent === "p2p" ? "none" : "mqtt"),
              description: p?.description,
              parts: p?.parts,
            };
          }),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { links?: unknown };
        links = validateAiLinks(data.links, nodes, chosen);
      }
    } catch {
      if (ctrl.signal.aborted) return;
    }
    const fromAi = links.length > 0;
    const map = fromAi ? arrangeFor(intent, chosen, links) : { nodes, links: planLinks(intent, chosen, nodes) };
    landMap({ ...map, masterId: pickMaster(chosenIds, map.links) }, fromAi ? "ai" : "rules");
    setMapping(false);
    setStep("suggested");
  };

  const clearAndDraw = () => {
    landMap({ nodes: layoutNodes(intent, chosen), links: [], masterId: null }, "manual");
    setMethod("manual");
  };

  const goReview = () => {
    if (!doc) return;
    // A product nothing reports to or commands is kept as a spare (Role
    // rules: no arrows → Slave (Standby)); the master is re-read from the
    // arrows if the one on file lost its links.
    const masterAlive = doc.masterId && doc.links.some((l) => l.from === doc.masterId || l.to === doc.masterId);
    if (!masterAlive) setDoc({ ...doc, masterId: pickMaster(chosenIds, doc.links) });
    setExpanded((e) => (e.length ? e : chosen.slice(0, 1).map((p) => p.id)));
    setStep("review");
  };

  const applyMaster = (productId: string, value: string) => {
    if (!doc) return;
    const next = value === "self" ? productId : value;
    if (!next || next === doc.masterId) return;
    const result = masterChange(doc.links, doc.masterId, next);
    if (result.removed.length) setBreaking({ ...result, masterId: next });
    else setDoc({ ...doc, links: result.links, masterId: next });
  };

  const blocker = doc
    ? createBlocker({ cloudType, cloudPassword, links: doc.links }, chosen, settings)
    : "Draw at least one link on the canvas first.";

  const create = () => {
    if (!doc || blocker) return;
    const now = Date.now();
    const network: Network = {
      version: 1,
      projectId: project.id,
      name: name.trim(),
      cloudName: cloudName.trim(),
      cloudPassword,
      cloudType,
      protocol,
      frequency,
      topology,
      repeater: "none",
      masterId: doc.masterId,
      intent,
      method,
      mapSource: source,
      productIds: chosenIds.filter((id) => chosen.some((p) => p.id === id)),
      nodes: doc.nodes,
      links: doc.links,
      products: settings,
      createdAt: now,
      updatedAt: now,
    };
    saveNetwork(network);
    setSaved(network);
    setStep("done");
  };

  const requestClose = () => {
    if (step === "done" || step === "setup") onClose();
    else setDiscarding(true);
  };

  // ── footer per step ──

  const back = (to: Step) => (
    <button type="button" className={btn.subtle} onClick={() => setStep(to)}>
      Back
    </button>
  );
  const cancel = (
    <button type="button" className={btn.quiet} onClick={requestClose}>
      Cancel
    </button>
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let size: "md" | "lg" | "xl" = "lg";

  if (step === "setup") {
    body = (
      <SetupStep
        products={products}
        intent={intent}
        onIntent={setIntent}
        chosenIds={chosenIds}
        onToggle={(id) =>
          setChosenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
        }
      />
    );
    footer = (
      <>
        {cancel}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          {setupBlocker && <p className="text-sm text-text-tertiary">{setupBlocker}</p>}
          <button type="button" className={btn.primary} disabled={!!setupBlocker} onClick={continueFromSetup}>
            Continue to Mapping
          </button>
        </div>
      </>
    );
  } else if (step === "method") {
    body = <MethodStep method={method} onMethod={setMethod} count={chosen.length} />;
    footer = (
      <>
        {cancel}
        <div className="ml-auto flex items-center gap-6">
          {back("setup")}
          {/* Busy in the flow's own style — brand, dimmed, turning — for the
              ten-odd seconds the AI takes; never a greyed button that reads
              as refused. */}
          <button
            type="button"
            className={cn(btn.primary, mapping && "cursor-wait opacity-80")}
            onClick={() => !mapping && runMethod()}
            aria-disabled={mapping || undefined}
            aria-busy={mapping}
          >
            {mapping && (
              <span aria-hidden className="inline-flex motion-safe:animate-spin">
                <Icon icon={Refresh01Icon} size={16} />
              </span>
            )}
            {mapping ? "AI is mapping…" : method === "ai" ? "Continue with AI Auto-Map" : "Open canvas"}
          </button>
        </div>
      </>
    );
  } else if (step === "suggested" && doc) {
    body = (
      <SuggestedStep
        doc={doc}
        source={source}
        intent={intent}
        products={chosen}
        roles={roles}
        cloudName={cloudType === "none" ? "" : cloudName}
        name={nm}
      />
    );
    footer = (
      <>
        {cancel}
        <div className="ml-auto flex items-center gap-6">
          {back("method")}
          <button type="button" className={btn.primary} onClick={() => setStep("connect")}>
            Accept and open canvas
          </button>
        </div>
      </>
    );
  } else if (step === "connect" && doc) {
    size = "xl";
    const connectBlocker = pendingLink
      ? "Save or cancel the new link first."
      : !doc.links.length
        ? "Draw at least one link to continue."
        : null;
    body = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-6 rounded-lg bg-bg-subtle px-8 py-5">
          <p className="min-w-0 flex-1 text-sm text-text-secondary">
            {source === "ai"
              ? `AI drew ${doc.links.length} connections from your goal "${intentInfo(intent).title}". Check each one, then continue.`
              : source === "rules"
                ? `IDEEZA's connection rules drew ${doc.links.length} connections from your goal "${intentInfo(intent).title}" — the AI couldn't be reached. Check each one, then continue.`
                : "Draw each link: pick a protocol, press Draw link (L), click a port on the source, then one on the target."}
          </p>
          {doc.links.length > 0 && (
            <button type="button" className={btn.link} onClick={clearAndDraw}>
              Clear and draw myself
            </button>
          )}
        </div>
        <MapEditor
          doc={doc}
          onChange={setDoc}
          products={chosen}
          cloudType={cloudType}
          protocol={protocol}
          onProtocolChange={setProtocol}
          onHowTo={() => setHowTo(true)}
          onPendingChange={setPendingLink}
          canvasHeight="max(360px, min(560px, calc(100dvh - 420px)))"
          fitKey={fitKey}
          keysActive={!howTo && !allParams && !discarding && !breaking}
        />
      </div>
    );
    footer = (
      <>
        {cancel}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          {connectBlocker && <p className="text-sm text-text-tertiary">{connectBlocker}</p>}
          {back(source === "manual" ? "method" : "suggested")}
          <button type="button" className={btn.primary} disabled={!!connectBlocker} onClick={goReview}>
            Continue to Review
          </button>
        </div>
      </>
    );
  } else if (step === "review" && doc) {
    body = (
      <div className="flex flex-col gap-10">
        <p className="rounded-lg bg-bg-subtle px-8 py-5 text-sm text-text-secondary">
          Values below were filled in from your connection map. Review and edit anything that looks wrong.
        </p>

        <section aria-labelledby="net-settings" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h3 id="net-settings" className="text-md font-bold text-text-primary">
                Network settings
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Defaults for all {chosen.length} {chosen.length === 1 ? "product" : "products"} — set once here; any product can override them in its own row.
              </p>
            </div>
            <button type="button" className={btn.link} onClick={() => setAllParams(true)}>
              All parameters
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Network name" htmlFor="net-name">
              <TextInput id="net-name" size="lg" value={name} onValueChange={setName} placeholder="Unnamed Network" />
            </Field>
            <Field label="Cloud collection name" htmlFor="net-cloud" hint={cloudType === "none" ? "Not used while Cloud type is None" : "Every product shares it"}>
              <TextInput id="net-cloud" size="lg" value={cloudName} onValueChange={setCloudName} placeholder="Add one now or later" disabled={cloudType === "none"} />
            </Field>
            <Field label="Cloud password" htmlFor="net-pass" hint={cloudType === "none" ? "Not used while Cloud type is None" : "Required — every product needs it to join the cloud"}>
              <PasswordInput
                id="net-pass"
                value={cloudPassword}
                onValueChange={setCloudPassword}
                onBlur={() => setPasswordLeft(true)}
                disabled={cloudType === "none"}
                invalid={passwordLeft && cloudType !== "none" && !cloudPassword.trim()}
              />
            </Field>
            <SelectMenu<CloudType>
              label="Cloud type"
              value={cloudType}
              options={CLOUD_TYPES}
              placeholder="Pick a cloud type"
              hint="Shared — set once for the whole network"
              onChange={setCloudType}
            />
            <SelectMenu<ProtocolKey>
              label="Network type"
              value={protocol}
              options={PROTOCOL_OPTIONS}
              placeholder="Pick a protocol"
              onChange={(p) => {
                setProtocol(p);
                setFrequency((f) => (protocolInfo(p).frequencies.includes(f) ? f : protocolInfo(p).frequencies[0]));
              }}
            />
            <SelectMenu<Frequency>
              label="Network frequency"
              value={frequency}
              options={frequencyOptions(protocol)}
              placeholder="Pick a frequency"
              onChange={setFrequency}
            />
          </div>
        </section>

        <section aria-labelledby="net-products" className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="net-products" className="text-md font-bold text-text-primary">
              Products ({chosen.length})
            </h3>
            <button
              type="button"
              className={btn.link}
              onClick={() => setExpanded((e) => (e.length === chosen.length ? [] : chosen.map((p) => p.id)))}
            >
              {expanded.length === chosen.length ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <ul role="list" className="flex flex-col gap-4">
            {chosen.map((p) => {
              const s = settings[p.id];
              const role = roles[p.id] ?? "Standby";
              const open = expanded.includes(p.id);
              const status = productStatus(p, s, doc.links, isProduct);
              const unspoken = s.interfaces.filter((i) => !speaks(p, i.protocol));
              return (
                <li
                  key={p.id}
                  className={cn(
                    "overflow-hidden rounded-xl border border-solid bg-bg-surface",
                    open ? "border-border-brand" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`net-row-${p.id}`}
                    onClick={() => setExpanded((e) => (open ? e.filter((x) => x !== p.id) : [...e, p.id]))}
                    className="flex w-full items-center gap-6 px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
                  >
                    <ProductThumb product={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-md font-semibold text-text-primary">{p.name}</span>
                      <span className="block truncate text-sm text-text-secondary">
                        {s.interfaces.map((i) => protocolInfo(i.protocol).name).join(" + ")} ·{" "}
                        {s.sensor === "none" ? "no sensor" : labelOf(SENSORS, s.sensor)}
                      </span>
                    </span>
                    <RoleChip role={role} />
                    <Chip tone={status.ready ? "neutral" : "brand"}>{status.text}</Chip>
                    <span aria-hidden className={cn("text-text-tertiary transition-transform duration-fast", open && "rotate-180")}>
                      <Icon icon={ArrowDown01Icon} size={18} />
                    </span>
                  </button>
                  {open && (
                    <div id={`net-row-${p.id}`} className="border-t border-solid border-border bg-bg-subtle px-8 py-8">
                      {unspoken.length > 0 && (
                        <Banner tone="attention" className="mb-8">
                          {`${p.name}'s parts list names no ${unspoken.map((i) => protocolInfo(i.protocol).name).join(" or ")} radio — check the part list, or change the interface.`}
                        </Banner>
                      )}
                      <ProductForm
                        product={p}
                        settings={s}
                        masterValue={masterFieldOf(role, doc.masterId)}
                        masterOptions={[
                          { value: "self", label: "This product" },
                          ...chosen.filter((x) => x.id !== p.id).map((x) => ({ value: x.id, label: x.name })),
                        ]}
                        sensorRequired={sendsSensorData(p.id, doc.links, isProduct)}
                        onChange={(next) => setStored((st) => ({ ...st, [p.id]: next }))}
                        onMasterChange={(v) => applyMaster(p.id, v)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
    footer = (
      <>
        {cancel}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          {blocker && (
            <p id="create-blocker" className="max-w-[46ch] text-right text-sm text-text-tertiary">
              {blocker}
            </p>
          )}
          {back("connect")}
          <button
            type="button"
            className={btn.primary}
            disabled={!!blocker}
            aria-describedby={blocker ? "create-blocker" : undefined}
            onClick={create}
          >
            Create network
          </button>
        </div>
      </>
    );
  } else if (step === "done" && saved) {
    size = "md";
    body = <DoneStep network={saved} projectName={project.name} products={chosen} roles={roles} />;
    footer = (
      <>
        <button type="button" className={btn.quiet} onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className={cn(btn.primary, "ml-auto", leaving && "cursor-wait opacity-80")}
          aria-busy={leaving}
          onClick={() => {
            if (leaving) return;
            setLeaving(true);
            onViewNetwork();
          }}
        >
          {leaving && (
            <span aria-hidden className="inline-flex motion-safe:animate-spin">
              <Icon icon={Refresh01Icon} size={16} />
            </span>
          )}
          {leaving ? "Opening…" : "View Network"}
        </button>
      </>
    );
  }

  const covered = howTo || allParams || discarding || !!breaking;

  return (
    <>
      <ModalFrame open onClose={requestClose} title="Add Network" size={size} covered={covered} footer={footer}>
        <Stepper index={STEP_INDEX[step]} done={step === "done"} />
        <div className="mt-10">{body}</div>
      </ModalFrame>
      <HowToDrawDialog open={howTo} onClose={() => setHowTo(false)} />
      <AllParametersDialog open={allParams} onClose={() => setAllParams(false)} />
      <ConfirmDialog
        open={discarding}
        title="Discard this network?"
        confirmLabel="Discard"
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          onClose();
        }}
      >
        The map and the settings set up here are not saved anywhere yet. Closing now throws them away.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!breaking}
        title={`Changing Master will remove ${breaking?.removed.length ?? 0} ${breaking?.removed.length === 1 ? "link" : "links"}`}
        confirmLabel="Apply anyway"
        onCancel={() => setBreaking(null)}
        onConfirm={() => {
          if (breaking && doc) setDoc({ ...doc, links: breaking.links, masterId: breaking.masterId });
          setBreaking(null);
        }}
      >
        {breaking && (
          <BreakingCopy
            newMaster={nm(breaking.masterId)}
            removed={breaking.removed.map((l) => `${linkTitle(l, nm)} (${l.label})`)}
            kept={(doc?.links.length ?? 0) - breaking.removed.length}
          />
        )}
      </ConfirmDialog>
    </>
  );
}

export function BreakingCopy({ newMaster, removed, kept }: { newMaster: string; removed: string[]; kept: number }) {
  const few = removed.length === 1 ? "One link no longer makes sense and will be removed" : `${removed.length} links no longer make sense and will be removed`;
  return (
    <p>
      {newMaster} becomes the Master of this network. {few}: {removed.join(" and ")}. The other {kept}{" "}
      {kept === 1 ? "link" : "links"} and every product setting stay as they are.
    </p>
  );
}

// ───────────────────────── pieces ─────────────────────────

function Stepper({ index, done }: { index: number; done: boolean }) {
  return (
    <ol aria-label="Steps" className="mx-auto flex max-w-xl items-start">
      {STEPS.map((label, i) => {
        const complete = i < index || (done && i === index);
        const current = i === index && !done;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-3" aria-current={current ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-px flex-1", i === 0 ? "bg-transparent" : i <= index ? "bg-bg-brand" : "bg-border")} />
              <span
                className={cn(
                  "inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-solid",
                  complete
                    ? "border-border-brand bg-bg-brand text-text-on-brand"
                    : current
                      ? "border-border-brand bg-bg-surface"
                      : "border-border bg-bg-surface",
                )}
              >
                {complete ? (
                  <Icon icon={Tick02Icon} size={16} strokeWidth={2.2} />
                ) : current ? (
                  <span className="h-5 w-5 rounded-full bg-bg-brand" />
                ) : null}
              </span>
              <span className={cn("h-px flex-1", i === STEPS.length - 1 ? "bg-transparent" : i < index ? "bg-bg-brand" : "bg-border")} />
            </div>
            <span className={cn("text-sm", current ? "font-semibold text-text-brand" : complete ? "text-text-brand" : "text-text-tertiary")}>
              {label}
              {complete && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ProductThumb({ product }: { product: NetProduct }) {
  return product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
  ) : (
    <span aria-hidden className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-md font-bold text-text-secondary">
      {product.name.charAt(0).toUpperCase()}
    </span>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[color:var(--color-input-label)]">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[color:var(--color-input-helper)]">{hint}</p>}
    </div>
  );
}

function SetupStep({
  products,
  intent,
  onIntent,
  chosenIds,
  onToggle,
}: {
  products: NetProduct[];
  intent: Intent;
  onIntent: (i: Intent) => void;
  chosenIds: string[];
  onToggle: (id: string) => void;
}) {
  const left = products.length - chosenIds.length;
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="net-goal">
        <h3 id="net-goal" className="text-md font-bold text-text-primary">
          What do you want to do?
        </h3>
        <p className="mt-2 text-sm text-text-secondary">This sets the network template. You can change it later.</p>
        <div role="radiogroup" aria-labelledby="net-goal" className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {INTENTS.map((i) => {
            const on = i.key === intent;
            return (
              <button
                key={i.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onIntent(i.key)}
                className={cn(
                  "flex flex-col items-start gap-4 rounded-xl border border-solid p-8 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <Radio checked={on} decorative />
                <span className="text-md font-semibold text-text-primary">{i.title}</span>
                <span className="text-sm leading-relaxed text-text-secondary">{i.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="net-join">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h3 id="net-join" className="text-md font-bold text-text-primary">
            Which products join this network?
          </h3>
          <p className="text-sm text-text-secondary">
            You have {chosenIds.length} {chosenIds.length === 1 ? "product" : "products"} selected in this network
            {left > 0 ? ` · ${left} other ${left === 1 ? "product" : "products"} not included` : ""}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const on = chosenIds.includes(p.id);
            const chip = productChip(p);
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggle(p.id)}
                className={cn(
                  "flex items-center gap-6 rounded-xl border border-solid p-6 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <ProductThumb product={p} />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-3">
                  <span className="max-w-full truncate text-md font-semibold text-text-primary">{p.name}</span>
                  {chip ? <Chip tone="brand">{chip}</Chip> : <span className="text-xs text-text-tertiary">No parts listed</span>}
                </span>
                <Checkbox checked={on} decorative />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MethodStep({ method, onMethod, count }: { method: Method; onMethod: (m: Method) => void; count: number }) {
  const options: { key: Method; title: string; body: string; tag: string }[] = [
    {
      key: "ai",
      title: "AI Auto-Map",
      body: `AI reads your ${count} ${count === 1 ? "product" : "products"} and your goal, then proposes the whole connection map. Nothing is saved until you review it.`,
      tag: "Recommended",
    },
    {
      key: "manual",
      title: "Manual Canvas",
      body: "Open an empty canvas and draw every link yourself. Full control over protocol, direction and what each link carries.",
      tag: "Advanced",
    },
  ];
  return (
    <div className="flex flex-col gap-8">
      <h3 id="net-method" className="text-md font-bold text-text-primary">
        How do you want to map the connections?
      </h3>
      <div role="radiogroup" aria-labelledby="net-method" className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {options.map((o) => {
          const on = o.key === method;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onMethod(o.key)}
              className={cn(
                "flex flex-col items-start gap-4 rounded-xl border border-solid p-8 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
              )}
            >
              <Radio checked={on} decorative />
              <span className="text-md font-semibold text-text-primary">{o.title}</span>
              <span className="text-sm leading-relaxed text-text-secondary">{o.body}</span>
              <Chip tone={o.key === "ai" ? "brand" : "neutral"}>{o.tag}</Chip>
            </button>
          );
        })}
      </div>
      <div className="rounded-xl bg-bg-subtle p-8">
        <p className="text-sm font-semibold text-text-primary">Either way, every link answers the same 3 questions</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
          {[
            ["Q1 Who starts the conversation?", "sets Master / Slave role"],
            ["Q2 Is anything in the middle?", "sets Topology + Cloud type"],
            ["Q3 What travels on this link?", "sets the Sensor field"],
          ].map(([q, a]) => (
            <React.Fragment key={q}>
              <dt className="text-text-secondary">{q}</dt>
              <dd className="text-text-secondary">→ {a}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}

function rolesSentence(products: NetProduct[], roles: Record<string, Role>): string {
  const groups = new Map<string, string[]>();
  for (const p of products) {
    const r = ROLE_LABEL[roles[p.id] ?? "Standby"];
    groups.set(r, [...(groups.get(r) ?? []), p.name]);
  }
  return [...groups.entries()]
    .map(([role, names]) => {
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
      return `${list} = ${role}`;
    })
    .join(" · ");
}

function SuggestedStep({
  doc,
  source,
  intent,
  products,
  roles,
  cloudName,
  name,
}: {
  doc: MapDoc;
  source: MapSource;
  intent: Intent;
  products: NetProduct[];
  roles: Record<string, Role>;
  cloudName: string;
  name: (id: string) => string;
}) {
  const apps = doc.nodes.filter((n) => n.kind === "app").length;
  const goal = intentInfo(intent).title;
  return (
    <div className="flex flex-col gap-8">
      {source === "ai" ? (
        <p className="rounded-lg bg-bg-subtle px-8 py-5 text-sm text-text-secondary">
          From your {products.length} products and the goal &ldquo;{goal}&rdquo;, AI proposes these {doc.links.length} links. Nothing is saved yet.
        </p>
      ) : (
        <Banner tone="info">
          {`The AI couldn't be reached, so IDEEZA's connection rules drew these ${doc.links.length} links from your ${products.length} products and the goal "${goal}". Nothing is saved yet — check each one.`}
        </Banner>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-md font-bold text-text-primary">Suggested connections</h3>
        <p className="text-sm text-text-secondary">
          {products.length} products · {doc.links.length} links{apps ? ` · ${apps} app` : ""}
        </p>
      </div>
      <ul role="list" className="flex flex-col gap-4">
        {doc.links.map((l) => (
          <li key={l.id} className="flex items-center gap-6 rounded-xl border border-solid border-border bg-bg-surface px-8 py-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{linkTitle(l, name)}</p>
              <p className="mt-1 truncate text-sm text-text-secondary">
                {labelOf(CARRIES, l.carries)} · {l.label}
              </p>
            </div>
            <Chip tone="brand">{l.from === "app" || l.to === "app" ? "Cloud" : protocolInfo(l.protocol).name}</Chip>
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-bg-success-subtle p-8">
        <p className="text-sm font-semibold text-text-success">Roles these links produce</p>
        <p className="mt-3 text-sm text-text-primary">{rolesSentence(products, roles)}</p>
        {cloudName && <p className="mt-1 text-sm text-text-primary">Shared cloud collection: {cloudName}</p>}
      </div>
    </div>
  );
}

function DoneStep({
  network,
  projectName,
  products,
  roles,
}: {
  network: Network;
  projectName: string;
  products: NetProduct[];
  roles: Record<string, Role>;
}) {
  const title = network.name || "Unnamed Network";
  const n = products.length;
  const line =
    network.cloudType === "none"
      ? `${title} is saved to ${projectName}. Its ${n} products talk to each other directly.`
      : network.cloudName
        ? `${title} is saved to ${projectName}. All ${n} products share the cloud collection ${network.cloudName}.`
        : `${title} is saved to ${projectName}. All ${n} products share it. No Cloud Name was entered — add one later in network settings.`;
  return (
    <div className="flex flex-col items-center gap-6 text-center" role="status">
      <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
        <Icon icon={CheckmarkCircle02Icon} size={26} />
      </span>
      <h3 className="text-xl font-bold text-text-primary">Network created</h3>
      <p className="max-w-[56ch] text-sm text-text-secondary">{line}</p>
      <dl className="mt-2 w-full rounded-xl bg-bg-subtle px-8 py-4 text-left">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-6 py-3 text-sm">
            <dt className="font-semibold text-text-primary">{p.name}</dt>
            <dd className="text-text-secondary">{ROLE_LABEL[roles[p.id] ?? "Standby"]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
