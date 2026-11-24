"use client";

// 06b / 06h · Network (About › Network) and 06c–06g, 06j–06l · Add network.
// The project's one network (lib/network): none yet says what a network is
// with Create Network; once added, its name and meta, the summary, the
// connections and the products with their roles. For whoever manages it, the
// web's Connection Map Settings (PRJ-1, network-settings-dialog.tsx): a
// Network settings row under the summary opens a sheet with the web's
// whole-network fields and Save settings (a new Master that breaks links asks
// first), and Delete network is the red row at the end (asks first). The map
// itself — links, roles, interfaces, sensors — is edited on a computer, as
// the wizard's Manual Canvas is; an ⓘ line says so.
//
// Add network is the web's wizard as full-screen steps (M33 stepper, ← back,
// ✕ discard, the action pinned at the foot): Setup (the goal and the products
// that join), Method (AI Auto-Map; the Manual Canvas opens on a computer, D3),
// Connect (the AI's proposal — the same automap call with the web's honest
// fallback to the rule planner when the AI can't be reached — and the roles
// it makes), Review (the network's name, cloud, type and frequency, each
// product's role and its sensor type when a link needs one), Done. Roles read
// in the Figma note's plain words (leads / follows / works as an equal). Back
// on Setup asks "Discard this network?" just as ✕ does; a project has one
// network, so the wizard opens the network when there is one already.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cancel01Icon, CheckmarkCircle02Icon, Delete02Icon, InformationCircleIcon, Settings02Icon, ShareKnowledgeIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FIELD_LABEL, Field, useFieldIds } from "@/components/auth/auth-parts";
import { PasswordInput } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { Spinner } from "@/components/ideeza/spinner";
import { TextInput } from "@/components/ideeza/text-input";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { frequencyOptions } from "@/components/network/product-form";
import { PROTOCOL_OPTIONS } from "@/components/network/link-panel";
import { networkMeta, networkSummaryRows } from "@/components/network/summary";
import { can } from "@/lib/manual/permissions";
import { PHONE_ROLE_LABEL, phoneProjectHref, phoneProjectPath } from "@/lib/manual/phone-project";
import { CARRIES, CLOUD_TYPES, INTENTS, REPEATERS, SENSORS, TOPOLOGIES, intentInfo, labelOf, protocolInfo } from "@/lib/network/catalog";
import { createBlocker, linkTitle, masterChange, nodeName, pickMaster, productChip, productStatus, protocolsUsed, rolesOf, settingsFor } from "@/lib/network/derive";
import { arrangeFor, layoutNodes, planLinks, validateAiLinks } from "@/lib/network/planner";
import { networkProducts } from "@/lib/network/products";
import { deleteNetwork, saveNetwork, useProjectNetwork } from "@/lib/network/store";
import type { CloudType, Frequency, Intent, MapLink, MapNode, MapSource, NetProduct, Network, ProductSettings, ProtocolKey, Repeater, Topology } from "@/lib/network/types";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ListCard as KitListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { EmptyState } from "../kit/state";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { LIST_ROW, ListCard } from "./parts";
import { ProjectLoading, ProjectMissing } from "./project-screen";

const ROLE_LABEL = PHONE_ROLE_LABEL;

// ─────────────────────────── 06b / 06h · the network ───────────────────────────

export function NetworkScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const { hydrated, network } = useProjectNetwork(data.state === "ready" ? data.project.id : null);
  if (data.state === "loading" || (data.state === "ready" && !hydrated)) return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  const { project, view, viewer } = data;
  const products = networkProducts(project, view.refs);
  const canManage = can(viewer, "network.manage", view.canCtx);
  return (
    <Screen top={<TopBar back={phoneProjectHref(project.id)} title="Network" />} className="px-8 pb-12">
      {!network ? (
        <EmptyState
          icon={ShareKnowledgeIcon}
          title="No network yet"
          body="A network records which products in this project talk to each other, over which protocol, and what each one does."
          action={canManage ? { label: "Create Network", href: phoneProjectPath(project.id, "network/new") } : undefined}
        />
      ) : (
        <NetworkView network={network} products={products} projectId={project.id} canManage={canManage} />
      )}
    </Screen>
  );
}

function NetworkView({ network, products, projectId, canManage }: { network: Network; products: NetProduct[]; projectId: string; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const members = products.filter((p) => network.productIds.includes(p.id));
  const roles = rolesOf(network.productIds, network.links, network.masterId);
  const name = (id: string) => nodeName(id, products, network.cloudType);
  const title = network.name || "Unnamed Network";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className={T.section}>{title}</h2>
        <p className={T.meta}>{networkMeta(network)}</p>
      </div>
      <ListCard label="Summary">
        {networkSummaryRows(network, products).map((r) => (
          <li key={r.label} className={cn(LIST_ROW, "flex min-h-[44px] items-center gap-4 p-6")}>
            <span className={cn(T.body, "shrink-0")}>{r.label}</span>
            <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{r.value}</span>
          </li>
        ))}
      </ListCard>
      {canManage && (
        <div className="flex flex-col gap-4">
          <KitListCard label="Manage the network">
            <ListRow icon={Settings02Icon} title="Network settings" meta="Name, cloud, topology, frequency" onClick={() => setSettingsOpen(true)} />
          </KitListCard>
          <p className={cn(T.meta, "flex items-start gap-2")}>
            <span aria-hidden className="mt-[1px] shrink-0 text-[color:var(--color-icon-secondary)]">
              <Icon icon={InformationCircleIcon} size={16} />
            </span>
            <span>Edit the map on a computer: its links, and each product&apos;s role, interfaces and sensors.</span>
          </p>
        </div>
      )}
      <section aria-label="Connections" className="flex flex-col gap-4">
        <h3 className={T.section}>Connections</h3>
        <ListCard label="Connections">
          {network.links.map((l) => (
            <li key={l.id} className={cn(LIST_ROW, "flex items-center gap-6 p-6")}>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.rowTitle, "truncate")}>{linkTitle(l, name)}</span>
                <span className={cn(T.meta, "truncate")}>{l.label}</span>
              </span>
              <Badge tone="neutral">{l.from === "app" || l.to === "app" ? "Cloud" : protocolInfo(l.protocol).name}</Badge>
            </li>
          ))}
        </ListCard>
      </section>
      <section aria-label="Products" className="flex flex-col gap-4">
        <h3 className={T.section}>Products</h3>
        <ListCard label="Products">
          {members.map((p) => (
            <li key={p.id} className={cn(LIST_ROW, "flex items-center gap-6 p-6")}>
              <span className={cn(T.rowTitle, "min-w-0 flex-1 truncate")}>{p.name}</span>
              <Badge tone="brand">{ROLE_LABEL[roles[p.id] ?? "Standby"]}</Badge>
            </li>
          ))}
        </ListCard>
      </section>
      {canManage && (
        <KitListCard label="Delete">
          <ListRow icon={Delete02Icon} title="Delete network" danger onClick={() => setDeleting(true)} />
        </KitListCard>
      )}
      {settingsOpen && (
        <NetworkSettingsSheet
          network={network}
          members={members}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            saveNetwork(next);
            setSettingsOpen(false);
            toast({ title: "Network settings saved" });
          }}
        />
      )}
      <ConfirmSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete “${title}”?`}
        body={`The map, its ${network.links.length} ${network.links.length === 1 ? "link" : "links"} and the network settings of all ${members.length} ${members.length === 1 ? "product" : "products"} are removed. The products themselves stay in the project. This cannot be undone.`}
        verb="Delete network"
        destructive
        onConfirm={() => {
          deleteNetwork(projectId);
          toast({ title: "Network deleted" });
          router.replace(phoneProjectHref(projectId));
        }}
      />
    </div>
  );
}

/** The web's Network settings (network-settings-dialog.tsx, Figma 16) as a sheet: what applies to
 *  the whole network, in the web's fields and words (Master, as the summary above says it). A new
 *  Master the links can't keep asks first (Figma 15, spec D7). */
function NetworkSettingsSheet({
  network,
  members,
  onClose,
  onSave,
}: {
  network: Network;
  members: NetProduct[];
  onClose: () => void;
  onSave: (next: Network) => void;
}) {
  const ids = useFieldIds(["name", "cloudName", "password"] as const);
  const [name, setName] = React.useState(network.name);
  const [cloudName, setCloudName] = React.useState(network.cloudName);
  const [cloudType, setCloudType] = React.useState<CloudType>(network.cloudType);
  const [topology, setTopology] = React.useState<Topology>(network.topology);
  const [masterId, setMasterId] = React.useState<string>(network.masterId ?? "");
  const [frequency, setFrequency] = React.useState<Frequency>(network.frequency);
  const [password, setPassword] = React.useState(network.cloudPassword);
  const [repeater, setRepeater] = React.useState<Repeater>(network.repeater);
  const [breaking, setBreaking] = React.useState<{ links: MapLink[]; removed: MapLink[] } | null>(null);
  const nm = (id: string) => nodeName(id, members, cloudType);
  const passwordMissing = cloudType !== "none" && !password.trim();

  const commit = (links: MapLink[]) => {
    const next: Network = {
      ...network,
      name: name.trim(),
      cloudName: cloudName.trim(),
      cloudType,
      topology,
      masterId: masterId || null,
      frequency,
      cloudPassword: password,
      repeater,
      links,
    };
    onSave({ ...next, products: settingsFor(members, next) });
  };
  const save = () => {
    if (passwordMissing) return;
    const result = masterChange(network.links, network.masterId, masterId || null);
    if (result.removed.length) setBreaking(result);
    else commit(result.links);
  };
  const removed = breaking?.removed ?? [];
  const kept = network.links.length - removed.length;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="Network settings"
        description="These apply to the whole network. Role, interfaces and sensor settings belong to each product and are edited on the map."
        actions={
          <>
            <Button size="xl" className="w-full" disabled={passwordMissing} onClick={save}>
              Save settings
            </Button>
            {passwordMissing && <p className={T.meta}>Add a cloud password first.</p>}
          </>
        }
      >
        <Field label="Network name" htmlFor={ids.name.id}>
          <TextInput id={ids.name.id} size="xl" value={name} onValueChange={setName} placeholder="Unnamed Network" autoComplete="off" />
        </Field>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Cloud type</span>
          <SheetSelect title="Cloud type" value={cloudType} options={CLOUD_TYPES} onChange={(v) => setCloudType(v as CloudType)} />
        </div>
        {cloudType !== "none" && (
          <>
            <Field label="Cloud name" htmlFor={ids.cloudName.id}>
              <TextInput id={ids.cloudName.id} size="xl" value={cloudName} onValueChange={setCloudName} placeholder="Add a cloud name" autoComplete="off" autoCapitalize="off" />
            </Field>
            <Field label="Cloud password" htmlFor={ids.password.id}>
              <PasswordInput id={ids.password.id} value={password} onValueChange={setPassword} invalid={passwordMissing} autoComplete="new-password" />
            </Field>
          </>
        )}
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Topology</span>
          <SheetSelect title="Topology" value={topology} options={TOPOLOGIES} onChange={(v) => setTopology(v as Topology)} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Master</span>
          <SheetSelect
            title="Master"
            value={masterId}
            options={members.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="No master"
            onChange={setMasterId}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Network frequency</span>
          <SheetSelect title="Network frequency" value={frequency} options={frequencyOptions(network.protocol)} onChange={(v) => setFrequency(v as Frequency)} />
          <span className={T.caption}>Filtered by {protocolInfo(network.protocol).name}</span>
        </div>
        <div className="flex flex-col gap-2 pb-4">
          <span className={FIELD_LABEL}>Add repeater</span>
          <SheetSelect title="Add repeater" value={repeater} options={REPEATERS} onChange={(v) => setRepeater(v as Repeater)} />
        </div>
      </Sheet>
      <ConfirmSheet
        open={breaking !== null}
        onClose={() => setBreaking(null)}
        title={`Changing Master will remove ${removed.length} ${removed.length === 1 ? "link" : "links"}`}
        body={
          <>
            {nm(masterId)} becomes the Master of this network.{" "}
            {removed.length === 1 ? "One link no longer makes sense and will be removed" : `${removed.length} links no longer make sense and will be removed`}:{" "}
            {removed.map((l) => `${linkTitle(l, nm)} (${l.label})`).join(" and ")}. The other {kept} {kept === 1 ? "link" : "links"} and every product setting stay as they are.
          </>
        }
        verb="Apply anyway"
        onConfirm={() => {
          if (breaking) commit(breaking.links);
          setBreaking(null);
        }}
      />
    </>
  );
}

// ─────────────────────────── 06c–06l · Add network ───────────────────────────

type Step = "setup" | "method" | "connect" | "review" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "method", label: "Method" },
  { id: "connect", label: "Connect" },
  { id: "review", label: "Review" },
];
type MapDoc = { nodes: MapNode[]; links: MapLink[]; masterId: string | null };
const compact = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "");
/** The time Create network stamps, read when it is pressed. */
const stamp = () => Date.now();

export function AddNetworkScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const router = useRouter();
  const { hydrated, network } = useProjectNetwork(data.state === "ready" ? data.project.id : null);
  const [created, setCreated] = React.useState(false);
  // One network per project: a deep link or Back into the wizard opens the one there is.
  const exists = hydrated && network !== null && !created;
  React.useEffect(() => {
    if (exists) router.replace(phoneProjectPath(projectId, "network"));
  }, [exists, projectId, router]);
  if (data.state === "loading" || (data.state === "ready" && !hydrated) || exists) return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  return (
    <AddNetwork
      projectId={data.project.id}
      projectName={data.project.name}
      products={networkProducts(data.project, data.view.refs)}
      onCreated={() => setCreated(true)}
    />
  );
}

function AddNetwork({
  projectId,
  projectName,
  products,
  onCreated,
}: {
  projectId: string;
  projectName: string;
  products: NetProduct[];
  onCreated: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const asked = (params.get("step") as Step | null) ?? "setup";
  const ids = useFieldIds(["name", "cloudName", "password"] as const);
  const [intent, setIntent] = React.useState<Intent>("ctrl");
  const [chosenIds, setChosenIds] = React.useState<string[]>(() => products.map((p) => p.id));
  const [doc, setDoc] = React.useState<MapDoc | null>(null);
  const [source, setSource] = React.useState<MapSource>("ai");
  const [mapping, setMapping] = React.useState(false);
  const [mapFailed, setMapFailed] = React.useState(false);
  const [name, setName] = React.useState(projectName);
  const [cloudName, setCloudName] = React.useState(compact(projectName));
  const [cloudPassword, setCloudPassword] = React.useState("");
  const [cloudType, setCloudType] = React.useState<CloudType>("mqtt");
  const [protocol, setProtocol] = React.useState<ProtocolKey>("WM");
  const [frequency, setFrequency] = React.useState<Frequency>("2.4");
  const [stored, setStored] = React.useState<Record<string, ProductSettings>>({});
  const [saved, setSaved] = React.useState<Network | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const abort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abort.current?.abort(), []);

  // A step the wizard hasn't reached (a reload, a typed address) starts again at Setup.
  const step: Step = saved ? "done" : asked === "setup" || asked === "method" ? asked : doc ? asked : "setup";
  const go = (s: Step) => router.push(`${phoneProjectPath(projectId, "network/new")}${s === "setup" ? "" : `?step=${s}`}`);
  const exit = () => router.replace(phoneProjectPath(projectId, "network"));

  const chosen = products.filter((p) => chosenIds.includes(p.id));
  const minProducts = intent === "p2p" || intent === "both" ? 2 : 1;
  const setupBlocker =
    chosen.length < minProducts
      ? minProducts === 1
        ? "Pick at least one product for this network."
        : `"${intentInfo(intent).title}" needs at least two products.`
      : null;
  const topology: Topology = intent === "p2p" ? "p2p" : intent === "both" ? "tree" : "star";
  const draft = { links: doc?.links ?? [], masterId: doc?.masterId ?? null, protocol, frequency, repeater: "none" as const, topology, cloudType, products: stored };
  const settings = settingsFor(chosen, draft);
  const roles = rolesOf(chosenIds, doc?.links ?? [], doc?.masterId ?? null);
  const nm = (id: string) => nodeName(id, chosen, cloudType);
  const isProduct = (id: string) => chosen.some((p) => p.id === id);
  const blocker = doc ? createBlocker({ cloudType, cloudPassword, links: doc.links }, chosen, settings) : "Draw at least one link on the canvas first.";

  const map = async () => {
    setCloudType(intent === "p2p" ? "none" : "mqtt");
    setMapping(true);
    setMapFailed(false);
    go("connect");
    const nodes = layoutNodes(intent, chosen);
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
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
            return { id: n.id, kind: n.kind, name: nodeName(n.id, chosen, intent === "p2p" ? "none" : "mqtt"), description: p?.description, parts: p?.parts };
          }),
        }),
      });
      if (res.ok) links = validateAiLinks(((await res.json()) as { links?: unknown }).links, nodes, chosen);
    } catch {
      if (ctrl.signal.aborted) return;
    }
    const fromAi = links.length > 0;
    const next = fromAi ? arrangeFor(intent, chosen, links) : { nodes, links: planLinks(intent, chosen, nodes) };
    setDoc({ ...next, masterId: pickMaster(chosenIds, next.links) });
    setSource(fromAi ? "ai" : "rules");
    setMapFailed(next.links.length === 0);
    const used = protocolsUsed(next.links);
    if (used.length) setProtocol(used[0]);
    setMapping(false);
  };

  const create = () => {
    if (!doc || blocker) return;
    const now = stamp();
    const network: Network = {
      version: 1,
      projectId,
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
      method: "ai",
      mapSource: source,
      productIds: chosenIds.filter((id) => chosen.some((p) => p.id === id)),
      nodes: doc.nodes,
      links: doc.links,
      products: settings,
      createdAt: now,
      updatedAt: now,
    };
    onCreated();
    saveNetwork(network);
    setSaved(network);
  };

  const index = STEPS.findIndex((s) => s.id === step);
  const progress = step !== "setup" || chosenIds.length !== products.length || intent !== "ctrl";

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  if (step === "setup") {
    body = (
      <div className="flex flex-col gap-8">
        <section role="radiogroup" aria-labelledby="net-goal" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="net-goal" className={T.section}>What should this network do?</h2>
            <p className={T.meta}>This sets the network template. You can change it later.</p>
          </div>
          {INTENTS.map((i) => (
            <label key={i.key} className="relative flex cursor-pointer items-start gap-6 py-2">
              <input type="radio" name="net-goal" className="sr-only" checked={intent === i.key} onChange={() => setIntent(i.key)} />
              <Radio checked={intent === i.key} decorative className="mt-1" />
              <span className="flex flex-col gap-1">
                <span className={cn(T.body, "text-text-primary")}>{i.title}</span>
                <span className={T.meta}>{i.body}</span>
              </span>
            </label>
          ))}
        </section>
        <section aria-labelledby="net-join" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="net-join" className={T.section}>Which products join this network?</h2>
            <p className={T.meta}>
              You have {chosenIds.length} {chosenIds.length === 1 ? "product" : "products"} selected in this network
              {products.length - chosenIds.length > 0 ? ` · ${products.length - chosenIds.length} not included` : ""}
            </p>
          </div>
          {products.map((p) => {
            const on = chosenIds.includes(p.id);
            return (
              <label key={p.id} className="relative flex cursor-pointer items-start gap-6 py-2">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => setChosenIds((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                />
                <Checkbox checked={on} decorative className="mt-1" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={cn(T.body, "truncate text-text-primary")}>{p.name}</span>
                  <span className={T.meta}>{productChip(p) || "No parts listed"}</span>
                </span>
              </label>
            );
          })}
        </section>
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" disabled={setupBlocker !== null} onClick={() => go("method")}>
          Continue
        </Button>
        {setupBlocker && <p className={T.meta}>{setupBlocker}</p>}
      </>
    );
  } else if (step === "method") {
    body = (
      <div className="flex flex-col gap-6">
        <h2 id="net-method" className={T.section}>How do you want to map the connections?</h2>
        <div role="radiogroup" aria-labelledby="net-method" className="flex flex-col gap-4">
          <div className="flex items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6">
            <Radio checked decorative className="mt-1" />
            <span className="flex flex-col gap-2">
              <span className={cn(T.rowTitle, "flex items-center gap-4")}>
                AI Auto-Map <Badge tone="brand">Recommended</Badge>
              </span>
              <span className={T.meta}>
                AI reads your {chosen.length} {chosen.length === 1 ? "product" : "products"} and your goal, then proposes the whole connection map. Nothing is saved until you review it.
              </span>
            </span>
          </div>
          <div aria-disabled className="flex items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
            <Radio checked={false} disabled decorative className="mt-1" />
            <span className="flex flex-col gap-2">
              <span className={cn(T.rowTitle, "flex items-center gap-4 text-text-disabled")}>
                Manual Canvas <Badge tone="neutral">Advanced</Badge>
              </span>
              <span className={T.meta}>The canvas opens on a computer: draw every link yourself there.</span>
            </span>
          </div>
        </div>
        <div className={cn(T.meta, "flex flex-col gap-2 rounded-xl bg-bg-subtle p-6")}>
          <p className="text-text-primary">Either way, every link answers the same 3 questions</p>
          <p>Q1 Who starts the conversation? → sets who leads and who follows</p>
          <p>Q2 Is anything in the middle? → sets the message hub and the cloud space</p>
          <p>Q3 What travels on this link? → sets the sensor field</p>
        </div>
      </div>
    );
    footer = (
      <Button size="xl" className="w-full" onClick={() => void map()}>
        Continue
      </Button>
    );
  } else if (step === "connect") {
    const apps = doc?.nodes.filter((n) => n.kind === "app").length ?? 0;
    body = mapping ? (
      <div role="status" className="flex flex-col items-center gap-6 py-24 text-center">
        <Spinner />
        <p className={T.rowTitle}>AI is mapping your products…</p>
        <p className={T.meta}>It reads each product&apos;s parts and your goal. This takes about 15 seconds.</p>
      </div>
    ) : mapFailed || !doc ? (
      <Banner tone="error" title="We couldn't map these products">
        Neither the AI nor the connection rules found a link for this goal. Go back and pick another goal or more products.
      </Banner>
    ) : (
      <div className="flex flex-col gap-6">
        {source === "ai" ? (
          <p className={cn(T.meta, "rounded-xl bg-bg-subtle p-6")}>
            From your {chosen.length} products and the goal “{intentInfo(intent).title}”, AI proposes these {doc.links.length} links. Nothing is saved yet.
          </p>
        ) : (
          <Banner tone="info">{`The AI couldn't be reached, so IDEEZA's connection rules drew these ${doc.links.length} links from your ${chosen.length} products and the goal "${intentInfo(intent).title}". Nothing is saved yet — check each one.`}</Banner>
        )}
        <div className="flex items-baseline justify-between gap-4">
          <h2 className={T.section}>Suggested connections</h2>
          <span className={T.meta}>
            {chosen.length} products · {doc.links.length} links{apps ? ` · ${apps} app` : ""}
          </span>
        </div>
        <ListCard label="Suggested connections">
          {doc.links.map((l) => (
            <li key={l.id} className={cn(LIST_ROW, "flex items-center gap-6 p-6")}>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.rowTitle, "truncate")}>{linkTitle(l, nm)}</span>
                <span className={cn(T.meta, "truncate")}>
                  {labelOf(CARRIES, l.carries)} · {l.label}
                </span>
              </span>
              <Badge tone="brand">{l.from === "app" || l.to === "app" ? "Cloud" : protocolInfo(l.protocol).name}</Badge>
            </li>
          ))}
        </ListCard>
        <div className="flex flex-col gap-2 rounded-xl bg-bg-success-subtle p-6">
          <p className={cn(T.meta, "text-text-success")}>Roles these links produce</p>
          {chosen.map((p) => (
            <p key={p.id} className={cn(T.meta, "text-text-primary")}>
              {p.name} = {ROLE_LABEL[roles[p.id] ?? "Standby"]}
            </p>
          ))}
        </div>
      </div>
    );
    footer = mapping ? null : (
      <>
        {doc && !mapFailed && (
          <Button size="xl" className="w-full" onClick={() => go("review")}>
            Continue
          </Button>
        )}
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => void map()}>
          Try again
        </Button>
      </>
    );
  } else if (step === "review" && doc) {
    const sensorNeeded = (p: NetProduct) => !productStatus(p, settings[p.id], doc.links, isProduct).ready || stored[p.id]?.sensor !== undefined;
    body = (
      <div className="flex flex-col gap-6">
        <Field label="Network name" htmlFor={ids.name.id}>
          <TextInput id={ids.name.id} size="xl" value={name} onValueChange={setName} autoComplete="off" />
        </Field>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Cloud type</span>
          <SheetSelect title="Cloud type" value={cloudType} options={CLOUD_TYPES} onChange={(v) => setCloudType(v as CloudType)} />
        </div>
        {cloudType !== "none" && (
          <>
            <Field label="Cloud space" htmlFor={ids.cloudName.id}>
              <TextInput id={ids.cloudName.id} size="xl" value={cloudName} onValueChange={setCloudName} autoComplete="off" autoCapitalize="off" />
            </Field>
            <Field label="Cloud password" htmlFor={ids.password.id}>
              <PasswordInput id={ids.password.id} value={cloudPassword} onValueChange={setCloudPassword} autoComplete="new-password" />
            </Field>
          </>
        )}
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Network type</span>
          <SheetSelect
            title="Network type"
            value={protocol}
            options={PROTOCOL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              const next = v as ProtocolKey;
              setProtocol(next);
              const allowed = frequencyOptions(next);
              if (!allowed.some((f) => f.value === frequency) && allowed[0]) setFrequency(allowed[0].value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Frequency</span>
          <SheetSelect title="Frequency" value={frequency} options={frequencyOptions(protocol)} onChange={(v) => setFrequency(v as Frequency)} />
        </div>
        <h2 className={cn(T.section, "pt-4")}>Products</h2>
        <ListCard label="Products">
          {chosen.map((p) => {
            const status = productStatus(p, settings[p.id], doc.links, isProduct);
            return (
              <li key={p.id} className={cn(LIST_ROW, "flex flex-col gap-4 p-6")}>
                <span className="flex items-center gap-4">
                  <span className={cn(T.rowTitle, "min-w-0 flex-1 truncate")}>{p.name}</span>
                  <Badge tone="brand">{ROLE_LABEL[roles[p.id] ?? "Standby"]}</Badge>
                  <Badge tone={status.ready ? "success" : "warning"}>{status.text}</Badge>
                </span>
                {sensorNeeded(p) && (
                  <SheetSelect
                    title={`Sensor type · ${p.name}`}
                    value={settings[p.id].sensor}
                    options={SENSORS}
                    onChange={(v) =>
                      setStored((cur) => ({
                        ...cur,
                        [p.id]: { ...settings[p.id], sensor: v as ProductSettings["sensor"], touched: [...new Set([...(settings[p.id].touched ?? []), "sensor" as const])] },
                      }))
                    }
                  />
                )}
              </li>
            );
          })}
        </ListCard>
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" disabled={blocker !== null} onClick={create}>
          Create network
        </Button>
        {blocker && <p className={T.meta}>{blocker}</p>}
      </>
    );
  } else if (step === "done" && saved) {
    const title = saved.name || "Unnamed Network";
    const n = chosen.length;
    body = (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={CheckmarkCircle02Icon} size={26} />
        </span>
        <h2 className={T.title}>Network created</h2>
        <p className={T.body}>
          {saved.cloudType === "none"
            ? `${title} is saved to ${projectName}. Its ${n} products talk to each other directly.`
            : saved.cloudName
              ? `${title} is saved to ${projectName}. All ${n} products share the cloud collection ${saved.cloudName}.`
              : `${title} is saved to ${projectName}. All ${n} products share it. No Cloud Name was entered — add one later in network settings.`}
        </p>
        <ListCard label="Roles" className="w-full text-left">
          {chosen.map((p) => (
            <li key={p.id} className={cn(LIST_ROW, "flex items-center gap-6 p-6")}>
              <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>{p.name}</span>
              <Badge tone="brand">{ROLE_LABEL[roles[p.id] ?? "Standby"]}</Badge>
            </li>
          ))}
        </ListCard>
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" onClick={() => router.replace(phoneProjectPath(projectId, "network"))}>
          View Network
        </Button>
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => router.replace(phoneProjectHref(projectId))}>
          Close
        </Button>
      </>
    );
  }

  return (
    <Screen
      top={
        <TopBar
          back={step === "setup" || step === "done" ? phoneProjectPath(projectId, "network") : true}
          onBack={step === "setup" ? (goBack) => (progress ? setDiscarding(true) : goBack()) : undefined}
          title="Add network"
          actions={step === "done" ? [] : [{ icon: Cancel01Icon, label: "Discard network", onClick: () => (progress ? setDiscarding(true) : exit()) }]}
        />
      }
      footer={footer ? <BottomBar className="gap-4 pt-8">{footer}</BottomBar> : undefined}
      className="px-8 pb-12"
    >
      {step !== "done" && (
        <ol aria-label="Steps" className="mb-8 flex items-start justify-between">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={i === index ? "step" : undefined} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  T.rowTitle,
                  "inline-flex size-[32px] items-center justify-center rounded-full border-[length:var(--border-width-1)] border-solid",
                  i === index ? "border-transparent bg-bg-brand text-text-on-brand" : i < index ? "border-border-brand text-text-brand" : "border-border text-text-secondary",
                )}
              >
                {i + 1}
              </span>
              <span className={cn(T.meta, i === index && "text-text-primary")}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}
      {body}
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard this network?"
        body="Nothing is saved yet. The goal, the products you picked and the proposed links go."
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={exit}
      />
    </Screen>
  );
}
