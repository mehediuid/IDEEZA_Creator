"use client";

// Billing details — a card on the Billing history tab of Plan & pricing (spec
// §5.11), deep-linked as #billing-details: Name or company, Tax ID (VAT / GST /
// EIN), Address and Billing email, which every invoice prints under "Billed
// to" (invoice-view.tsx). Stored in this browser (lib/account/billing-details).
// It reads as fields; Edit turns it into a form and Update saves.

import * as React from "react";
import { TextInput, Textarea } from "@/components/ideeza";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsField } from "@/components/settings/settings-card";
import { useArrivalHighlight } from "@/components/settings/use-arrival-highlight";
import { billingErrors, saveBilling, useBillingDetails, type BillingFields } from "@/lib/account/billing-details";

export const BILLING_DETAILS_ID = "billing-details";

const CARD = "flex flex-col gap-[16px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px]";

/** The arrival outline (use-arrival-highlight.ts) on the card's own radius. Not
 *  through cn(): tailwind-merge drops `data-[arrived]:outline` as a clash with `outline-2`. */
const ARRIVED =
  "scroll-mt-24 data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

const LABELS: Record<keyof BillingFields, string> = {
  name: "Name or company",
  taxId: "Tax ID (VAT / GST / EIN)",
  address: "Address",
  email: "Billing email",
};

const EDIT_LABEL = "Edit billing details";

export function BillingDetailsCard() {
  useArrivalHighlight();
  const details = useBillingDetails();
  const [editing, setEditing] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);
  // Leaving the form (Update or Cancel) puts the keyboard back on Edit.
  const done = () => {
    setEditing(false);
    window.setTimeout(() => sectionRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="${EDIT_LABEL}"]`)?.focus(), 0);
  };
  const titleId = React.useId();

  return (
    <section
      ref={sectionRef}
      id={BILLING_DETAILS_ID}
      aria-labelledby={titleId}
      className={`${CARD} ${ARRIVED}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex max-w-[62ch] flex-col gap-[4px]">
          <h2 id={titleId} className="text-xl font-semibold leading-xl text-text-primary">
            Billing details
          </h2>
          <p className="text-md leading-md text-text-secondary">
            Printed under &ldquo;Billed to&rdquo; on every invoice. Without a name here, invoices use your profile name.
          </p>
        </div>
        {!editing && <EditButton onClick={() => setEditing(true)} aria-label={EDIT_LABEL} />}
      </div>

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
    </section>
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
            size="xl"
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
            size="xl"
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
            size="xl"
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
