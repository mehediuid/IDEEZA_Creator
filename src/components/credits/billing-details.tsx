"use client";

// Billing details — a section of Settings › Plan & billing (spec §5.11),
// deep-linked as #billing-details: Name or company, Tax ID (VAT / GST / EIN),
// Address and Billing email, which every invoice prints under "Billed to"
// (invoice-view.tsx). Optional: without a name, invoices use your profile
// name. Stored in this browser (lib/account/billing-details). It reads as
// fields; Edit turns it into a form and Update saves.

import * as React from "react";
import { TextInput, Textarea } from "@/components/ideeza";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsCard, SettingsField } from "@/components/settings/settings-card";
import { billingErrors, saveBilling, useBillingDetails, type BillingFields } from "@/lib/account/billing-details";
import { PLAN_SECTIONS } from "@/lib/create/credit-pricing";

const LABELS: Record<keyof BillingFields, string> = {
  name: "Name or company",
  taxId: "Tax ID (VAT / GST / EIN)",
  address: "Address",
  email: "Billing email",
};

const EDIT_LABEL = "Edit billing details";

export function BillingDetailsCard() {
  const details = useBillingDetails();
  const [editing, setEditing] = React.useState(false);
  // Leaving the form (Update or Cancel) puts the keyboard back on Edit.
  const done = () => {
    setEditing(false);
    window.setTimeout(
      () => document.getElementById(PLAN_SECTIONS.billingDetails)?.querySelector<HTMLButtonElement>(`button[aria-label="${EDIT_LABEL}"]`)?.focus(),
      0,
    );
  };

  return (
    <SettingsCard
      id={PLAN_SECTIONS.billingDetails}
      title="Billing details"
      description="Optional. Printed under “Billed to” on every invoice. Until you add a name, invoices use your profile name."
      action={!editing ? <EditButton onClick={() => setEditing(true)} aria-label={EDIT_LABEL} /> : undefined}
    >
      {editing ? (
        <BillingForm initial={details} onDone={done} />
      ) : (
        <div className="grid grid-cols-1 gap-x-[24px] [@container(min-width:720px)]:grid-cols-2">
          <SettingsField label={LABELS.name}>{details.name}</SettingsField>
          <SettingsField label={LABELS.taxId}>{details.taxId}</SettingsField>
          <SettingsField label={LABELS.address}>
            {details.address && <span className="whitespace-pre-line">{details.address}</span>}
          </SettingsField>
          <SettingsField label={LABELS.email}>{details.email}</SettingsField>
        </div>
      )}
    </SettingsCard>
  );
}

function BillingForm({ initial, onDone }: { initial: BillingFields; onDone: () => void }) {
  const [form, setForm] = React.useState<BillingFields>({
    name: initial.name,
    taxId: initial.taxId,
    address: initial.address,
    email: initial.email,
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof BillingFields, string>>>({});
  const [failed, setFailed] = React.useState<string | null>(null);
  const firstRef = React.useRef<HTMLInputElement>(null);
  const ids = { name: React.useId(), taxId: React.useId(), address: React.useId(), email: React.useId() };

  React.useEffect(() => firstRef.current?.focus(), []);

  const set = (k: keyof BillingFields) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = billingErrors(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!saveBilling(form)) {
      setFailed(SAVE_FAILED);
      return;
    }
    onDone();
  };

  const hint = (k: keyof BillingFields, help?: string) =>
    errors[k] ? (
      <span id={`${ids[k]}-help`} className="text-sm leading-sm text-text-error">
        {errors[k]}
      </span>
    ) : help ? (
      <span id={`${ids[k]}-help`} className="text-sm leading-sm text-text-tertiary">
        {help}
      </span>
    ) : null;

  const describedBy = (k: keyof BillingFields, help?: string) => (errors[k] || help ? `${ids[k]}-help` : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[20px]">
      <div className="grid grid-cols-1 gap-[20px] [@container(min-width:720px)]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <label htmlFor={ids.name} className="text-md font-medium leading-md text-text-primary">
            {LABELS.name}
          </label>
          <TextInput
            ref={firstRef}
            id={ids.name}
            size="lg"
            autoComplete="organization"
            value={form.name}
            onValueChange={set("name")}
            invalid={!!errors.name}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={describedBy("name")}
          />
          {hint("name")}
        </div>
        <div className="flex min-w-0 flex-col gap-[6px]">
          <label htmlFor={ids.taxId} className="text-md font-medium leading-md text-text-primary">
            {LABELS.taxId}
          </label>
          <TextInput
            id={ids.taxId}
            size="lg"
            value={form.taxId}
            onValueChange={set("taxId")}
            invalid={!!errors.taxId}
            aria-invalid={!!errors.taxId || undefined}
            aria-describedby={describedBy("taxId", "As your tax office writes it, for example GB123456789.")}
          />
          {hint("taxId", "As your tax office writes it, for example GB123456789.")}
        </div>
        <div className="flex min-w-0 flex-col gap-[6px]">
          <label htmlFor={ids.address} className="text-md font-medium leading-md text-text-primary">
            {LABELS.address}
          </label>
          <Textarea
            id={ids.address}
            rows={3}
            autoComplete="street-address"
            value={form.address}
            onValueChange={set("address")}
            invalid={!!errors.address}
            aria-invalid={!!errors.address || undefined}
            aria-describedby={describedBy("address", "Street, city, postcode and country, one per line.")}
          />
          {hint("address", "Street, city, postcode and country, one per line.")}
        </div>
        <div className="flex min-w-0 flex-col gap-[6px]">
          <label htmlFor={ids.email} className="text-md font-medium leading-md text-text-primary">
            {LABELS.email}
          </label>
          <TextInput
            id={ids.email}
            size="lg"
            type="email"
            autoComplete="email"
            value={form.email}
            onValueChange={set("email")}
            invalid={!!errors.email}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={describedBy("email", "Printed on the invoice. Nothing is emailed from this demo.")}
          />
          {hint("email", "Printed on the invoice. Nothing is emailed from this demo.")}
        </div>
      </div>
      <CardFormActions onCancel={onDone} error={failed} />
    </form>
  );
}
