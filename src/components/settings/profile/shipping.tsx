"use client";

// Shipping addresses on Personal Information › Profile Details (Figma section
// "Address" 26381:245007): up to five, one of them "Default & Shipping".
// In view mode each is a grey block; in edit mode each block has Edit and
// Remove, and Add Another Address opens Figma's Add Shipping Address dialog
// (Address Name, Country, City, Address). Changes join the card's draft and
// are saved with the card's Update.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, Checkbox, ModalFrame, SelectMenu, TextInput } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { COUNTRIES, countryNameOf } from "@/lib/account/countries";
import {
  ADDRESS_MAX,
  CITY_MAX,
  PLACE_NAME_MAX,
  SHIPPING_MAX,
  addShipping,
  makeDefaultShipping,
  removeShipping,
  updateShipping,
  type Address,
  type ShippingAddress,
  type ShippingInput,
} from "@/lib/account/identity";
import { FormField, Panel, TAP, describedBy } from "./parts";
import { SettingsField } from "../settings-card";

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

/** Country · City · Address, label over value (Figma's Permanent Address block). */
export function AddressLines({ address }: { address: Address }) {
  return (
    <>
      <SettingsField label="Country">{countryNameOf(address.country)}</SettingsField>
      <SettingsField label="City">{address.city}</SettingsField>
      <SettingsField label="Address">{address.address}</SettingsField>
    </>
  );
}

function DefaultTag() {
  return <Badge tone="brand">Default &amp; Shipping</Badge>;
}

function ShippingHead({ item }: { item: ShippingAddress }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[8px] pt-[8px]">
      <h3 className="m-0 min-w-0 text-md font-semibold leading-md text-text-primary [overflow-wrap:anywhere]">{item.name || "Shipping address"}</h3>
      {item.isDefault && <DefaultTag />}
    </div>
  );
}

/** View mode: each address in its own block, the default first in line as it was saved. */
export function ShippingView({ list }: { list: readonly ShippingAddress[] }) {
  return (
    <ul role="list" className="m-0 flex list-none flex-col gap-[12px] p-0">
      {list.map((s) => (
        <li key={s.id}>
          <Panel>
            <ShippingHead item={s} />
            <AddressLines address={s} />
          </Panel>
        </li>
      ))}
    </ul>
  );
}

let made = 0;
const newId = () => `s${Date.now().toString(36)}${(made++).toString(36)}`;

/** Edit mode: the draft list with Edit / Remove on each, Add Another Address, and the max-5 notice. */
export function ShippingEditor({ list, onChange }: { list: ShippingAddress[]; onChange: (next: ShippingAddress[]) => void }) {
  const [dialog, setDialog] = React.useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const editing = dialog?.mode === "edit" ? list.find((s) => s.id === dialog.id) ?? null : null;
  const full = list.length >= SHIPPING_MAX;

  const save = (input: ShippingInput, asDefault: boolean) => {
    if (!dialog) return;
    if (dialog.mode === "add") {
      const id = newId();
      const r = addShipping(list, input, id);
      if (r.refused) return;
      onChange(asDefault ? makeDefaultShipping(r.list, id) : r.list);
    } else {
      const next = updateShipping(list, dialog.id, input);
      onChange(asDefault ? makeDefaultShipping(next, dialog.id) : next);
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {list.length > 0 && (
        <ul role="list" className="m-0 flex list-none flex-col gap-[12px] p-0">
          {list.map((s) => (
            <li key={s.id}>
              <Panel className="gap-[4px] pb-[12px]">
                <div className="flex flex-wrap items-start justify-between gap-[8px]">
                  <ShippingHead item={s} />
                  <div className="flex gap-[4px] pt-[4px]">
                    <Button type="button" hierarchy="ghost" size="sm" onClick={() => setDialog({ mode: "edit", id: s.id })} className={TAP}>
                      Edit<span className="sr-only">{` ${s.name || "shipping address"}`}</span>
                    </Button>
                    <Button
                      type="button"
                      hierarchy="ghost"
                      size="sm"
                      onClick={() => {
                        onChange(removeShipping(list, s.id));
                        requestAnimationFrame(() => addRef.current?.focus());
                      }}
                      className={TAP}
                    >
                      Remove<span className="sr-only">{` ${s.name || "shipping address"}`}</span>
                    </Button>
                  </div>
                </div>
                <p className="m-0 text-md leading-md text-text-secondary [overflow-wrap:anywhere]">
                  {[s.address, s.city, countryNameOf(s.country)].filter(Boolean).join(", ")}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p role="status" className="m-0 rounded-lg bg-bg-subtle px-[12px] py-[10px] text-md leading-md text-text-secondary">
          {`You have added the maximum of ${SHIPPING_MAX} shipping addresses. To add another address, remove one.`}
        </p>
      ) : (
        <Button
          ref={addRef}
          type="button"
          hierarchy="tonal"
          size="md"
          iconLeading={<Icon icon={Add01Icon} size={16} />}
          onClick={() => setDialog({ mode: "add" })}
          className={cn("w-fit", TAP)}
        >
          {list.length ? "Add Another Address" : "Add Shipping Address"}
        </Button>
      )}
      <ShippingDialog
        open={dialog !== null}
        mode={dialog?.mode ?? "add"}
        initial={editing}
        canChooseDefault={dialog?.mode === "add" ? list.length > 0 : !!editing && !editing.isDefault}
        onClose={() => {
          const was = dialog;
          setDialog(null);
          requestAnimationFrame(() => {
            if (was?.mode === "add" || !was) addRef.current?.focus();
          });
        }}
        onSave={save}
      />
    </div>
  );
}

const EMPTY_INPUT: ShippingInput = { name: "", country: "", city: "", address: "" };

/** Figma's Add Shipping Address (22550:43235) and Edit Shipping Address (22048:30402). */
function ShippingDialog({
  open,
  mode,
  initial,
  canChooseDefault,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "add" | "edit";
  initial: ShippingAddress | null;
  /** Another address is the default now, so this one can take its place. */
  canChooseDefault: boolean;
  onClose: () => void;
  onSave: (input: ShippingInput, asDefault: boolean) => void;
}) {
  const ids = React.useId();
  const [draft, setDraft] = React.useState<ShippingInput>(EMPTY_INPUT);
  const [asDefault, setAsDefault] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setDraft(initial ? { name: initial.name, country: initial.country, city: initial.city, address: initial.address } : EMPTY_INPUT);
      setAsDefault(false);
      setTried(false);
    }
  }

  const problems = {
    country: draft.country ? null : "Choose a country.",
    city: draft.city.trim() ? null : "Enter the city.",
    address: draft.address.trim() ? null : "Enter the street address.",
  };
  const shown = (k: keyof typeof problems) => (tried ? problems[k] : null);
  const set = (k: keyof ShippingInput) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // The dialog portals out of the card's form, but React still bubbles its submit there.
    e.stopPropagation();
    setTried(true);
    if (problems.country || problems.city || problems.address) {
      const first = problems.country ? `${ids}-country` : problems.city ? `${ids}-city` : `${ids}-address`;
      document.getElementById(first)?.focus();
      return;
    }
    onSave(draft, asDefault);
    onClose();
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title={mode === "add" ? "Add Shipping Address" : "Edit Shipping Address"}
      footer={
        <div className="flex w-full justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${ids}-form`} hierarchy="primary" size="lg">
            {mode === "add" ? "Add New" : "Confirm"}
          </Button>
        </div>
      }
    >
      <form id={`${ids}-form`} onSubmit={submit} noValidate className="flex flex-col gap-[16px]">
        <FormField id={`${ids}-name`} label="Address Name">
          <TextInput id={`${ids}-name`} size="xl" value={draft.name} onValueChange={set("name")} maxLength={PLACE_NAME_MAX} placeholder="Home, Office…" />
        </FormField>
        <SelectMenu
          id={`${ids}-country`}
          label="Country"
          placeholder="Choose a country"
          options={COUNTRY_OPTIONS}
          value={draft.country || null}
          onChange={set("country")}
          error={shown("country") ?? undefined}
        />
        <FormField id={`${ids}-city`} label="City" error={shown("city")}>
          <TextInput
            id={`${ids}-city`}
            size="xl"
            value={draft.city}
            onValueChange={set("city")}
            maxLength={CITY_MAX}
            autoComplete="shipping address-level2"
            invalid={!!shown("city")}
            {...describedBy(`${ids}-city`, shown("city"), null)}
          />
        </FormField>
        <FormField id={`${ids}-address`} label="Address" error={shown("address")}>
          <TextInput
            id={`${ids}-address`}
            size="xl"
            value={draft.address}
            onValueChange={set("address")}
            maxLength={ADDRESS_MAX}
            autoComplete="shipping street-address"
            invalid={!!shown("address")}
            {...describedBy(`${ids}-address`, shown("address"), null)}
          />
        </FormField>
        {canChooseDefault && (
          <label className="flex min-h-[44px] cursor-pointer items-center gap-[12px] rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} className="sr-only" />
            <Checkbox checked={asDefault} decorative />
            <span className="text-md leading-md text-text-primary">Use as my default shipping address</span>
          </label>
        )}
      </form>
    </ModalFrame>
  );
}
