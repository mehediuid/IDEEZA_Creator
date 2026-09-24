"use client";

// ProductForm — one product's network settings (Figma 08's accordion body,
// and the product panel of the map in edit mode). Every value arrives filled
// in from the map; changing one marks it as the maker's, so it stops
// following the map (see `mergeSettings`).

import * as React from "react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { cn } from "@/lib/utils";
import {
  AGENTS,
  FREQUENCIES,
  REDUNDANCIES,
  REPEATERS,
  SENSORS,
  SHARES,
  TOPOLOGIES,
  protocolInfo,
} from "@/lib/network/catalog";
import type {
  AgentPlacement,
  Frequency,
  NetInterface,
  NetProduct,
  ProductField,
  ProductSettings,
  ProtocolKey,
  Redundancy,
  Repeater,
  SensorType,
  SharesData,
  Topology,
} from "@/lib/network/types";
import { PROTOCOL_OPTIONS } from "./link-panel";

export function frequencyOptions(protocol: ProtocolKey) {
  const allowed = protocolInfo(protocol).frequencies;
  return FREQUENCIES.filter((f) => allowed.includes(f.value));
}

export function ProductForm({
  product,
  settings,
  masterValue,
  masterOptions,
  sensorRequired,
  onChange,
  onMasterChange,
  compact = false,
}: {
  product: NetProduct;
  settings: ProductSettings;
  /** "self" or the master product's id. */
  masterValue: string;
  masterOptions: { value: string; label: string }[];
  /** Its link carries sensor data, so None is not an answer. */
  sensorRequired: boolean;
  onChange: (next: ProductSettings) => void;
  onMasterChange: (value: string) => void;
  /** One column, for the map's side panel. */
  compact?: boolean;
}) {
  const set = <F extends ProductField>(field: F, value: ProductSettings[F]) =>
    onChange({
      ...settings,
      [field]: value,
      touched: settings.touched.includes(field) ? settings.touched : [...settings.touched, field],
    });

  const setInterface = (i: number, patch: Partial<NetInterface>) => {
    const next = settings.interfaces.map((row, j) => {
      if (j !== i) return row;
      const merged = { ...row, ...patch };
      const allowed = protocolInfo(merged.protocol).frequencies;
      return allowed.includes(merged.frequency) ? merged : { ...merged, frequency: allowed[0] };
    });
    set("interfaces", next);
  };

  const addInterface = () => {
    const used = new Set(settings.interfaces.map((r) => r.protocol));
    const protocol =
      product.radios.find((k) => !used.has(k)) ??
      PROTOCOL_OPTIONS.map((o) => o.value).find((k) => !used.has(k)) ??
      "WF";
    set("interfaces", [...settings.interfaces, { protocol, frequency: protocolInfo(protocol).frequencies[0] }]);
  };

  const repeaterAllowed = settings.interfaces.every((r) => protocolInfo(r.protocol).repeater);
  const sharesDisabled = settings.sensor === "none" || settings.agent === "none";
  const grid = compact ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 md:grid-cols-2";
  const uid = React.useId();

  return (
    <div className="flex flex-col gap-8">
      <Group title="Network Properties">
        <div className={grid}>
          <SelectMenu<Topology>
            label="Topology"
            value={settings.topology}
            options={TOPOLOGIES}
            placeholder="Pick a topology"
            hint="Auto-filled from Q2 · stays editable"
            onChange={(v) => set("topology", v)}
          />
          <SelectMenu
            label="Master"
            value={masterValue || null}
            options={masterOptions}
            placeholder="No master"
            hint="Auto-filled from Q1"
            onChange={onMasterChange}
          />
        </div>
      </Group>

      <Group title="Interfaces">
        <ul role="list" className="flex flex-col gap-4">
          {settings.interfaces.map((row, i) => (
            <li key={`${uid}-${i}`} className="flex items-end gap-6 rounded-lg border border-solid border-border bg-bg-surface p-6">
              <span className="mb-4 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-solid border-border text-xs font-semibold text-text-secondary">
                {i + 1}
              </span>
              <div className={cn("min-w-0 flex-1", grid)}>
                <SelectMenu<ProtocolKey>
                  label="Network Type"
                  value={row.protocol}
                  options={PROTOCOL_OPTIONS}
                  placeholder="Pick a protocol"
                  onChange={(protocol) => setInterface(i, { protocol })}
                />
                <SelectMenu<Frequency>
                  label="Network Frequency"
                  value={row.frequency}
                  options={frequencyOptions(row.protocol)}
                  placeholder="Pick a frequency"
                  hint="Filtered by the protocol on that interface"
                  onChange={(frequency) => setInterface(i, { frequency })}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove interface ${i + 1}`}
                disabled={settings.interfaces.length === 1}
                title={settings.interfaces.length === 1 ? "A product needs at least one interface" : undefined}
                onClick={() => set("interfaces", settings.interfaces.filter((_, j) => j !== i))}
                className="mb-2 inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addInterface}
          className="mt-4 inline-flex h-20 w-full items-center justify-center gap-3 rounded-lg border border-dashed border-border-brand text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Add01Icon} size={14} />
          Add interface
        </button>
      </Group>

      {repeaterAllowed && (
        <SelectMenu<Repeater>
          label="Add repeater"
          value={settings.repeater}
          options={REPEATERS}
          placeholder="None"
          hint={settings.repeater === "mesh" && settings.topology !== "mesh" ? "Mesh repeaters clash with a non-mesh topology" : undefined}
          onChange={(v) => set("repeater", v)}
        />
      )}

      <Group title="Sensor">
        <SelectMenu<SensorType>
          label="Sensor type"
          value={settings.sensor}
          options={SENSORS}
          placeholder="Pick a sensor"
          error={sensorRequired && settings.sensor === "none" ? "Its link carries sensor data — pick what it measures." : undefined}
          onChange={(v) => set("sensor", v)}
        />
      </Group>

      <Group title="AI Agent">
        <div className={grid}>
          <SelectMenu<AgentPlacement>
            label="Agent Placement"
            value={settings.agent}
            options={AGENTS}
            placeholder="Pick a placement"
            hint="Suggested from the product's role"
            onChange={(v) => set("agent", v)}
          />
          <SelectMenu<SharesData>
            label="Shares Data With Cloud"
            value={sharesDisabled ? "off" : settings.sharesData}
            options={SHARES}
            placeholder="Off"
            disabled={sharesDisabled}
            hint={
              settings.sensor === "none"
                ? "Off while Sensor type is None"
                : settings.agent === "none"
                  ? "Set an Agent Placement first"
                  : undefined
            }
            onChange={(v) => set("sharesData", v)}
          />
        </div>
      </Group>

      <Group title="Advanced">
        <div className={grid}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[color:var(--color-input-label)]">Bridge (Gateway)</p>
            <p className="flex h-20 items-center rounded-lg border border-solid border-border bg-[var(--color-input-bg-disabled)] px-6 text-sm text-text-secondary">
              {settings.interfaces.length >= 2 ? "On (2nd protocol)" : "Off"}
            </p>
            <p className="text-xs text-[color:var(--color-input-helper)]">Turns on at 2+ interfaces</p>
          </div>
          <SelectMenu<Redundancy>
            label="Redundancy"
            value={settings.redundancy}
            options={REDUNDANCIES}
            placeholder="None"
            hint="Standby is set automatically for a product with no links"
            onChange={(v) => set("redundancy", v)}
          />
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="mb-4 p-0 text-xs font-medium text-text-tertiary">{title}</legend>
      {children}
    </fieldset>
  );
}
