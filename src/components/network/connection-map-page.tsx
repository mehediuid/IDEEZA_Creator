"use client";

// ConnectionMapPage — /projects/[id]/network, Figma 11–17.
//
//   Read      the map, the network's summary beside it; a box or an arrow
//             shows its own details (read-only — spec D5)
//   Edit map  the same editor as the wizard, on a draft; a banner counts
//             what changed, and nothing is written until Save changes
//   Settings  the whole-network fields, Delete network among them (D9)
//
// A master change that breaks links asks first (Figma 15, spec D7).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Cancel01Icon, ConnectIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { useCreateHistory } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import {
  diffNetworks,
  linkTitle,
  mapStatusLine,
  masterChange,
  masterFieldOf,
  nodeName,
  rolesOf,
  sendsSensorData,
  settingsFor,
} from "@/lib/network/derive";
import { networkProducts } from "@/lib/network/products";
import { deleteNetwork, saveNetwork, useProjectNetwork } from "@/lib/network/store";
import type { MapLink, Network, ProtocolKey } from "@/lib/network/types";
import { AddNetworkDialog, BreakingCopy } from "./add-network-dialog";
import { ConfirmDialog, HowToDrawDialog } from "./dialogs";
import { LinkPanel } from "./link-panel";
import { MapCanvas, type Selection } from "./map-canvas";
import { MapEditor, type MapDoc } from "./map-editor";
import { ProductForm } from "./product-form";
import { networkSummaryRows, productSentence, productSettingRows } from "./summary";
import { FactList, SectionTitle, btn } from "./ui";
import { NetworkSettingsDialog } from "./network-settings-dialog";

const CANVAS_H = "max(420px, calc(100dvh - 330px))";

function formatEdited(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConnectionMapPage({ id }: { id: string }) {
  const router = useRouter();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const project = projects.find((p) => p.id === id) ?? projects.find((p) => p.slug === id) ?? null;
  const buildId = project?.buildId;
  const build = React.useMemo(
    () => (buildId ? builds.find((b) => b.id === buildId) ?? null : null),
    [buildId, builds],
  );
  const { hydrated: netHydrated, network } = useProjectNetwork(project?.id);
  const products = React.useMemo(() => (project ? networkProducts(project, build) : []), [project, build]);
  const [creating, setCreating] = React.useState(false);

  if (!hydrated || !buildsHydrated || !netHydrated) {
    return <div className="mx-auto w-full max-w-7xl px-16 py-12 text-sm text-text-tertiary">Loading…</div>;
  }
  if (!project) {
    return (
      <div className="mx-auto w-full max-w-7xl px-16 py-12">
        <p className="text-md font-semibold text-text-primary">This project isn&apos;t in this browser</p>
        <Link href="/projects" className={cn(btn.link, "mt-4 inline-block")}>
          Back to My projects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-16 py-12">
      <nav aria-label="Breadcrumb" className="mb-8 flex min-w-0 items-center gap-3 text-sm">
        <Link href="/projects" className="rounded-sm font-medium text-text-secondary no-underline outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus">
          My projects
        </Link>
        <span aria-hidden className="text-text-tertiary">
          <Icon icon={ArrowRight01Icon} size={15} />
        </span>
        <Link href={`/projects/${project.id}`} className="truncate rounded-sm font-medium text-text-secondary no-underline outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus">
          {project.name}
        </Link>
        <span aria-hidden className="text-text-tertiary">
          <Icon icon={ArrowRight01Icon} size={15} />
        </span>
        <span aria-current="page" className="font-semibold text-text-primary">
          Network
        </span>
      </nav>

      {network ? (
        <MapView key={network.createdAt} network={network} products={products} projectId={project.id} onDeleted={() => router.push(`/projects/${project.id}`)} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-bg-surface px-10 py-24 text-center">
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={ConnectIcon} size={24} />
          </span>
          <h1 className="text-lg font-bold text-text-primary">No network yet</h1>
          <p className="max-w-[56ch] text-sm text-text-secondary">
            A network records which products in this project talk to each other, over which protocol, and what each one does.
          </p>
          <button type="button" className={cn(btn.primary, "mt-2")} onClick={() => setCreating(true)}>
            Create Network
          </button>
        </div>
      )}
      {creating && (
        <AddNetworkDialog project={project} build={build} onClose={() => setCreating(false)} onViewNetwork={() => setCreating(false)} />
      )}
    </div>
  );
}

function MapView({
  network,
  products,
  projectId,
  onDeleted,
}: {
  network: Network;
  products: ReturnType<typeof networkProducts>;
  projectId: string;
  onDeleted: () => void;
}) {
  const members = React.useMemo(
    () => products.filter((p) => network.productIds.includes(p.id)),
    [products, network.productIds],
  );
  const isProduct = React.useCallback((id: string) => members.some((p) => p.id === id), [members]);
  const [mode, setMode] = React.useState<"read" | "edit">("read");
  const [selection, setSelection] = React.useState<Selection>(null);
  const [draft, setDraft] = React.useState<Network>(network);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [howTo, setHowTo] = React.useState(false);
  const [pendingLink, setPendingLink] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);
  const [breaking, setBreaking] = React.useState<{ links: MapLink[]; removed: MapLink[]; masterId: string } | null>(null);
  const [editKey, setEditKey] = React.useState(0);

  const shown = mode === "edit" ? draft : network;
  const settings = React.useMemo(() => settingsFor(members, shown), [members, shown]);
  const roles = React.useMemo(() => rolesOf(shown.productIds, shown.links, shown.masterId), [shown]);
  const name = (id: string) => nodeName(id, members, shown.cloudType);
  const changes = React.useMemo(
    () =>
      mode === "edit"
        ? diffNetworks(network, { ...draft, products: settings }, (nid) => nodeName(nid, members, draft.cloudType))
        : [],
    [mode, network, draft, settings, members],
  );
  const changeCount = changes.reduce((n, c) => n + c.count, 0);

  const startEdit = () => {
    setDraft(network);
    setSelection(null);
    setEditKey((k) => k + 1);
    setMode("edit");
  };
  const stopEdit = () => {
    setMode("read");
    setSelection(null);
    setDiscarding(false);
  };
  const saveEdit = () => {
    saveNetwork({ ...draft, products: settings });
    stopEdit();
  };

  const applyMaster = (productId: string, value: string) => {
    const next = value === "self" ? productId : value;
    if (!next || next === draft.masterId) return;
    const result = masterChange(draft.links, draft.masterId, next);
    if (result.removed.length) setBreaking({ ...result, masterId: next });
    else setDraft({ ...draft, links: result.links, masterId: next });
  };

  const protocolOf = (nodeId: string): ProtocolKey | null =>
    shown.links.find((l) => (l.from === nodeId || l.to === nodeId) && l.from !== "app" && l.to !== "app")?.protocol ?? null;

  const summary = (hint: string) => (
    <div className="flex flex-col gap-6">
      <SectionTitle>Network</SectionTitle>
      <div>
        <h3 className="text-md font-bold text-text-primary">{shown.name || "Unnamed Network"}</h3>
        <p className="mt-2 text-sm text-text-secondary">{hint}</p>
      </div>
      <div className="rounded-lg border border-solid border-border bg-bg-subtle p-6">
        <SectionTitle>Network summary</SectionTitle>
        <FactList className="mt-4" rows={networkSummaryRows(shown, members)} />
      </div>
    </div>
  );

  const productRead = (pid: string) => {
    const p = members.find((x) => x.id === pid);
    if (!p) return summary("This box is the network's own — click a product or a link to see its details.");
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle>Selected product</SectionTitle>
          <button type="button" aria-label="Close" onClick={() => setSelection(null)} className="inline-flex h-12 w-12 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus">
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        </div>
        <div>
          <h3 className="text-md font-bold text-text-primary">{p.name}</h3>
          <p className="mt-2 text-sm text-text-secondary">{productSentence(p, shown, settings[p.id])}</p>
        </div>
        <div className="rounded-lg border border-solid border-border bg-bg-subtle p-6">
          <SectionTitle>Product settings</SectionTitle>
          <FactList className="mt-4" rows={productSettingRows(settings[p.id], roles[p.id] ?? "Standby")} />
        </div>
      </div>
    );
  };

  let readPanel: React.ReactNode = summary("Click a product or a link on the map to see its details.");
  if (selection?.kind === "node") readPanel = productRead(selection.id);
  if (selection?.kind === "link") {
    const link = network.links.find((l) => l.id === selection.id);
    if (link) readPanel = <LinkPanel link={link} mode="read" products={members} cloudType={network.cloudType} />;
  }

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary">{shown.name || "Unnamed Network"}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {mode === "edit"
              ? "Editing — changes are not saved until you press Save changes."
              : [
                  `${network.productIds.length} ${network.productIds.length === 1 ? "product" : "products"}`,
                  `${network.links.length} ${network.links.length === 1 ? "link" : "links"}`,
                  network.cloudType !== "none" && network.cloudName ? `shared cloud ${network.cloudName}` : null,
                  `last edited ${formatEdited(network.updatedAt)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        {mode === "read" ? (
          <div className="flex items-center gap-6">
            <button type="button" className={btn.quiet} onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button type="button" className={btn.primary} onClick={startEdit}>
              Edit map
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-6">
            {pendingLink && <p className="text-sm text-text-tertiary">Save or cancel the new link first.</p>}
            <button type="button" className={btn.quiet} onClick={() => (changeCount ? setDiscarding(true) : stopEdit())}>
              Cancel
            </button>
            <button type="button" className={btn.primary} disabled={!changeCount || pendingLink} onClick={saveEdit}>
              Save changes
            </button>
          </div>
        )}
      </header>

      {mode === "edit" && changeCount > 0 && (
        <div role="status" className="mb-8 rounded-xl border border-solid border-border-brand bg-bg-brand-subtle px-8 py-5">
          <p className="text-sm font-semibold text-text-primary">
            {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{changes.map((c) => c.text).join(" · ")}</p>
        </div>
      )}

      {mode === "read" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div style={{ height: CANVAS_H }}>
              <MapCanvas
                readOnly
                nodes={network.nodes}
                links={network.links}
                products={members}
                cloudType={network.cloudType}
                roles={roles}
                protocolOf={protocolOf}
                selection={selection}
                onSelect={setSelection}
              />
            </div>
            <p className="text-xs text-text-tertiary">{mapStatusLine(network.nodes, network.links)}</p>
          </div>
          <aside aria-label="Details" className="overflow-y-auto rounded-xl border border-solid border-border bg-bg-surface p-8" style={{ maxHeight: CANVAS_H }}>
            {readPanel}
          </aside>
        </div>
      ) : (
        <MapEditor
          doc={{ nodes: draft.nodes, links: draft.links, masterId: draft.masterId }}
          onChange={(d: MapDoc) => setDraft((n) => ({ ...n, ...d }))}
          products={members}
          cloudType={draft.cloudType}
          protocol={draft.protocol}
          onProtocolChange={(protocol) => setDraft((n) => ({ ...n, protocol }))}
          onHowTo={() => setHowTo(true)}
          onPendingChange={setPendingLink}
          canvasHeight={CANVAS_H}
          fitKey={`edit-${editKey}`}
          keysActive={!settingsOpen && !howTo && !discarding && !breaking}
          renderIdle={() => summary("Pick a product or a link to edit it. Drawing a new link opens the three questions.")}
          renderNode={(nid) => {
            const p = members.find((x) => x.id === nid);
            if (!p) return summary("This box is the network's own. Pick a product or a link to edit it.");
            const role = roles[p.id] ?? "Standby";
            return (
              <div className="flex flex-col gap-6">
                <SectionTitle>Selected product</SectionTitle>
                <h3 className="text-md font-bold text-text-primary">{p.name}</h3>
                <ProductForm
                  compact
                  product={p}
                  settings={settings[p.id]}
                  masterValue={masterFieldOf(role, draft.masterId)}
                  masterOptions={[
                    { value: "self", label: "This product" },
                    ...members.filter((x) => x.id !== p.id).map((x) => ({ value: x.id, label: x.name })),
                  ]}
                  sensorRequired={sendsSensorData(p.id, draft.links, isProduct)}
                  onChange={(next) => setDraft((n) => ({ ...n, products: { ...n.products, [p.id]: next } }))}
                  onMasterChange={(v) => applyMaster(p.id, v)}
                />
              </div>
            );
          }}
        />
      )}

      {settingsOpen && (
        <NetworkSettingsDialog
          network={network}
          products={members}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            saveNetwork(next);
            setSettingsOpen(false);
          }}
          onDelete={() => {
            deleteNetwork(projectId);
            onDeleted();
          }}
        />
      )}
      <HowToDrawDialog open={howTo} onClose={() => setHowTo(false)} />
      <ConfirmDialog
        open={discarding}
        title={`Discard ${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}?`}
        confirmLabel="Discard"
        onCancel={() => setDiscarding(false)}
        onConfirm={stopEdit}
      >
        {changes.map((c) => c.text).join(" · ")}. The saved map stays as it was.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!breaking}
        title={`Changing Master will remove ${breaking?.removed.length ?? 0} ${breaking?.removed.length === 1 ? "link" : "links"}`}
        confirmLabel="Apply anyway"
        onCancel={() => setBreaking(null)}
        onConfirm={() => {
          if (breaking) setDraft((n) => ({ ...n, links: breaking.links, masterId: breaking.masterId }));
          setBreaking(null);
        }}
      >
        {breaking && (
          <BreakingCopy
            newMaster={name(breaking.masterId)}
            removed={breaking.removed.map((l) => `${linkTitle(l, name)} (${l.label})`)}
            kept={draft.links.length - breaking.removed.length}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
