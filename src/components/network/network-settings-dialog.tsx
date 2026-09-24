"use client";

// NetworkSettingsDialog — Figma 16. What applies to the whole network; role,
// interfaces and sensors belong to each product and are edited on the map.
// A new Master is checked against the map first (Figma 15, spec D7), and
// Delete network lives here, apart from Save (spec D9).

import * as React from "react";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { TextInput } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import { CLOUD_TYPES, REPEATERS, TOPOLOGIES, protocolInfo } from "@/lib/network/catalog";
import { linkTitle, masterChange, nodeName, settingsFor } from "@/lib/network/derive";
import type { CloudType, Frequency, MapLink, NetProduct, Network, Repeater, Topology } from "@/lib/network/types";
import { BreakingCopy } from "./add-network-dialog";
import { ConfirmDialog, ModalFrame } from "./dialogs";
import { frequencyOptions } from "./product-form";
import { PasswordInput, btn } from "./ui";

export function NetworkSettingsDialog({
  network,
  products,
  onClose,
  onSave,
  onDelete,
}: {
  network: Network;
  products: NetProduct[];
  onClose: () => void;
  onSave: (next: Network) => void;
  onDelete: () => void;
}) {
  const [name, setName] = React.useState(network.name);
  const [cloudName, setCloudName] = React.useState(network.cloudName);
  const [cloudType, setCloudType] = React.useState<CloudType>(network.cloudType);
  const [topology, setTopology] = React.useState<Topology>(network.topology);
  const [masterId, setMasterId] = React.useState<string>(network.masterId ?? "");
  const [frequency, setFrequency] = React.useState<Frequency>(network.frequency);
  const [password, setPassword] = React.useState(network.cloudPassword);
  const [repeater, setRepeater] = React.useState<Repeater>(network.repeater);
  const [breaking, setBreaking] = React.useState<{ links: MapLink[]; removed: MapLink[] } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const members = products.filter((p) => network.productIds.includes(p.id));
  const nm = (id: string) => nodeName(id, members, cloudType);

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
    const result = masterChange(network.links, network.masterId, masterId || null);
    if (result.removed.length) setBreaking(result);
    else commit(result.links);
  };

  const passwordMissing = cloudType !== "none" && !password.trim();

  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        covered={!!breaking || deleting}
        title={`Network settings — ${network.name || "Unnamed Network"}`}
        description="These apply to the whole network. Role, interfaces and sensor settings belong to each product and are edited on the map."
        size="md"
        footer={
          <>
            <button type="button" className={cn(btn.quiet, "text-text-error hover:text-text-error")} onClick={() => setDeleting(true)}>
              Delete network
            </button>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
              {passwordMissing && <p id="settings-blocker" className="text-sm text-text-tertiary">Add a cloud password first.</p>}
              <button type="button" className={btn.subtle} onClick={onClose}>
                Cancel
              </button>
              <button type="button" className={btn.primary} disabled={passwordMissing} aria-describedby={passwordMissing ? "settings-blocker" : undefined} onClick={save}>
                Save settings
              </button>
            </div>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Labelled label="Network name" id="set-name">
            <TextInput id="set-name" size="lg" value={name} onValueChange={setName} placeholder="Unnamed Network" />
          </Labelled>
          <Labelled label="Cloud name" id="set-cloud">
            <TextInput id="set-cloud" size="lg" value={cloudName} onValueChange={setCloudName} disabled={cloudType === "none"} placeholder="Add a cloud name" />
          </Labelled>
          <SelectMenu<CloudType> label="Cloud type" value={cloudType} options={CLOUD_TYPES} placeholder="Pick a cloud type" onChange={setCloudType} />
          <SelectMenu<Topology> label="Topology" value={topology} options={TOPOLOGIES} placeholder="Pick a topology" onChange={setTopology} />
          <SelectMenu
            label="Master"
            value={masterId || null}
            options={members.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="No master"
            onChange={setMasterId}
          />
          <SelectMenu<Frequency>
            label="Network frequency"
            value={frequency}
            options={frequencyOptions(network.protocol)}
            placeholder="Pick a frequency"
            hint={`Filtered by ${protocolInfo(network.protocol).name}`}
            onChange={setFrequency}
          />
          <Labelled label="Cloud password" id="set-pass">
            <PasswordInput
              id="set-pass"
              value={password}
              onValueChange={setPassword}
              disabled={cloudType === "none"}
              invalid={passwordMissing}
            />
          </Labelled>
          <SelectMenu<Repeater> label="Add repeater" value={repeater} options={REPEATERS} placeholder="None" onChange={setRepeater} />
        </div>
      </ModalFrame>
      <ConfirmDialog
        open={!!breaking}
        title={`Changing Master will remove ${breaking?.removed.length ?? 0} ${breaking?.removed.length === 1 ? "link" : "links"}`}
        confirmLabel="Apply anyway"
        onCancel={() => setBreaking(null)}
        onConfirm={() => {
          if (breaking) commit(breaking.links);
          setBreaking(null);
        }}
      >
        {breaking && (
          <BreakingCopy
            newMaster={nm(masterId)}
            removed={breaking.removed.map((l) => `${linkTitle(l, nm)} (${l.label})`)}
            kept={network.links.length - breaking.removed.length}
          />
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting}
        title={`Delete “${network.name || "Unnamed Network"}”?`}
        confirmLabel="Delete network"
        onCancel={() => setDeleting(false)}
        onConfirm={onDelete}
      >
        The map, its {network.links.length} {network.links.length === 1 ? "link" : "links"} and the network settings of all{" "}
        {members.length} {members.length === 1 ? "product" : "products"} are removed. The products themselves stay in the project. This cannot be undone.
      </ConfirmDialog>
    </>
  );
}

function Labelled({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--color-input-label)]">
        {label}
      </label>
      {children}
    </div>
  );
}
