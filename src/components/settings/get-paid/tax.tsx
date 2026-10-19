"use client";

// Get Paid's tax forms (User Panel V2 "Tax Residence" 41537:183180, "Tax
// Identification" non-US 41537:183204 and US 41537:183238), stored in
// `ideeza:account:payout` and saved on Save Information (a text form: Cancel
// goes back to Get Paid with nothing changed).
// - Tax Residence: Address Information — Country, City, Address, Postal Code.
// - Tax Identification: non-US or US person, the legal name and the federal
//   tax classification; a US person adds SSN or EIN and the number. Only its
//   last four digits are kept, and the number is never shown again; saving
//   again without retyping it keeps the last four already saved.
// Nothing is filed anywhere: the page says so.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radio, SelectMenu, TestnetDemoBadge, TextInput } from "@/components/ideeza";
import {
  LEGAL_NAME_MAX,
  TAX_FIELD_MAX,
  taxIdentificationOf,
  taxResidenceProblems,
  tinProblem,
  type PayoutStore,
  type TaxClassification,
  type TaxResidence,
  type TinType,
} from "@/lib/account/payout";
import { updatePayout, usePayout } from "@/lib/account/use-payout";
import { cn } from "@/lib/utils";
import { CardFormActions, SAVE_FAILED, SettingsCard } from "../settings-card";
import { SettingsFrame } from "../settings-frame";
import { countryOptions, formatDay, GET_PAID, HistoryLink, SubViewHeading } from "./parts";

const LABEL = "text-md font-medium leading-md text-text-primary";
const ERROR = "m-0 text-sm leading-sm text-text-error";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[8px]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

function Loading() {
  return <p className="m-0 text-md leading-md text-text-tertiary">Reading your tax information…</p>;
}

// ───────────────────────── Tax Residence ─────────────────────────

export function TaxResidencePage() {
  const store = usePayout();
  return (
    <SettingsFrame page="get-paid" actions={<HistoryLink />}>
      <SubViewHeading title="Tax Residence" />
      {store ? <ResidenceForm saved={store.taxResidence} /> : <Loading />}
    </SettingsFrame>
  );
}

function ResidenceForm({ saved }: { saved: TaxResidence | null }) {
  const router = useRouter();
  const [form, setForm] = React.useState<TaxResidence>(saved ?? { country: "", city: "", address: "", postalCode: "" });
  const [shown, setShown] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const ids = { country: React.useId(), city: React.useId(), address: React.useId(), postalCode: React.useId() };
  const options = React.useMemo(() => countryOptions(), []);
  const problems = taxResidenceProblems(form);
  const show = (k: keyof TaxResidence) => (shown ? problems[k] : undefined);
  const set = (k: keyof TaxResidence) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const first = (Object.keys(ids) as (keyof TaxResidence)[]).find((k) => problems[k]);
    if (first) {
      setShown(true);
      document.getElementById(ids[first])?.focus();
      return;
    }
    const next: TaxResidence = { country: form.country, city: form.city.trim(), address: form.address.trim(), postalCode: form.postalCode.trim() };
    if (!updatePayout((s) => ({ ...s, taxResidence: next }))) {
      setError(SAVE_FAILED);
      return;
    }
    setError(null);
    setSaid("Tax residence saved.");
  };

  return (
    <SettingsCard id="tax-residence" title="Address Information" description="The address your earnings are taxed at." action={<TestnetDemoBadge />}>
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <form noValidate onSubmit={submit} className="flex flex-col gap-[20px] pt-[8px]">
        <SelectMenu
          id={ids.country}
          label="Country"
          placeholder="Select country"
          value={form.country || null}
          onChange={set("country")}
          options={options}
          error={show("country")}
        />
        <div className="grid grid-cols-1 gap-[20px] [@container(min-width:640px)]:grid-cols-2">
          <Field id={ids.city} label="City" error={show("city")}>
            <TextInput id={ids.city} size="xl" value={form.city} maxLength={TAX_FIELD_MAX} onValueChange={set("city")} autoComplete="address-level2" invalid={!!show("city")} aria-invalid={!!show("city") || undefined} aria-describedby={show("city") ? `${ids.city}-error` : undefined} />
          </Field>
          <Field id={ids.postalCode} label="Postal Code" error={show("postalCode")}>
            <TextInput id={ids.postalCode} size="xl" value={form.postalCode} maxLength={20} onValueChange={set("postalCode")} autoComplete="postal-code" invalid={!!show("postalCode")} aria-invalid={!!show("postalCode") || undefined} aria-describedby={show("postalCode") ? `${ids.postalCode}-error` : undefined} />
          </Field>
        </div>
        <Field id={ids.address} label="Address" error={show("address")}>
          <TextInput id={ids.address} size="xl" value={form.address} maxLength={TAX_FIELD_MAX} onValueChange={set("address")} autoComplete="street-address" invalid={!!show("address")} aria-invalid={!!show("address") || undefined} aria-describedby={show("address") ? `${ids.address}-error` : undefined} />
        </Field>
        <p className="m-0 text-sm leading-sm text-text-tertiary">Kept in this browser only. Nothing is filed or sent anywhere in this demo.</p>
        <CardFormActions onCancel={() => router.push(GET_PAID)} submitLabel="Save Information" error={error} />
      </form>
    </SettingsCard>
  );
}

// ───────────────────────── Tax Identification ─────────────────────────

export function TaxIdentificationPage() {
  const store = usePayout();
  return (
    <SettingsFrame page="get-paid" actions={<HistoryLink />}>
      <SubViewHeading title="Tax Identification" />
      {store ? <IdentificationForm store={store} /> : <Loading />}
    </SettingsFrame>
  );
}

const CLASSIFICATIONS: { value: TaxClassification; label: string }[] = [
  { value: "individual", label: "Individual or sole proprietor" },
  { value: "business", label: "Business (company, partnership or trust)" },
];

function RadioLine({ name, checked, label, onChange }: { name: string; checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex min-h-[var(--touch-min)] cursor-pointer items-center gap-[12px] rounded-lg px-[12px] py-[8px] hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <Radio checked={checked} decorative />
      <span className="text-md leading-md text-text-primary">{label}</span>
    </label>
  );
}

function IdentificationForm({ store }: { store: PayoutStore }) {
  const router = useRouter();
  const saved = store.taxIdentification;
  const [usPerson, setUsPerson] = React.useState(saved?.usPerson ?? false);
  const [legalName, setLegalName] = React.useState(saved?.legalName ?? "");
  const [classification, setClassification] = React.useState<TaxClassification>(saved?.classification ?? "individual");
  const [tinType, setTinType] = React.useState<TinType>(saved?.tinType ?? "ssn");
  const [tin, setTin] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const ids = { name: React.useId(), tin: React.useId(), classification: React.useId() };
  const group = React.useId();

  // A saved number of the same type stands until a new one is typed.
  const keeps = !!saved?.usPerson && saved.tinType === tinType && !!saved.tinLast4 && !tin.trim();
  const nameProblem = legalName.trim() ? null : "Enter the taxpayer's legal name.";
  const tinError = usPerson && !keeps ? tinProblem(tin, tinType) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameProblem || tinError) {
      setShown(true);
      document.getElementById(nameProblem ? ids.name : ids.tin)?.focus();
      return;
    }
    const next = keeps
      ? { usPerson: true, legalName: legalName.trim().slice(0, LEGAL_NAME_MAX), classification, tinType, tinLast4: saved!.tinLast4, savedAt: Date.now() }
      : taxIdentificationOf({ usPerson, legalName, classification, tinType, tin }, Date.now());
    if (!updatePayout((s) => ({ ...s, taxIdentification: next }))) {
      setError(SAVE_FAILED);
      return;
    }
    setTin("");
    setError(null);
    setSaid("Tax identification saved.");
  };

  const tinName = tinType === "ssn" ? "SSN" : "EIN";

  return (
    <SettingsCard
      id="tax-identification"
      title="Tax Identification"
      description="A US person gives IDEEZA a W-9; anyone else a W-8. In this demo nothing is filed: it's kept in this browser only."
      action={<TestnetDemoBadge />}
    >
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <form noValidate onSubmit={submit} className="flex flex-col gap-[20px] pt-[8px]">
        <fieldset className="m-0 flex flex-col gap-[4px] border-0 p-0">
          <legend className={cn(LABEL, "mb-[4px] p-0")}>Are you a US person for tax purposes?</legend>
          <RadioLine name={`${group}-us`} checked={!usPerson} label="I am non-US Person" onChange={() => setUsPerson(false)} />
          <RadioLine name={`${group}-us`} checked={usPerson} label="I am a US Person" onChange={() => setUsPerson(true)} />
        </fieldset>

        <Field id={ids.name} label="Legal name of tax payer" error={shown && nameProblem ? nameProblem : undefined}>
          <TextInput
            id={ids.name}
            size="xl"
            value={legalName}
            maxLength={LEGAL_NAME_MAX}
            onValueChange={setLegalName}
            autoComplete="name"
            invalid={shown && !!nameProblem}
            aria-invalid={(shown && !!nameProblem) || undefined}
            aria-describedby={shown && nameProblem ? `${ids.name}-error` : undefined}
          />
        </Field>

        <SelectMenu
          id={ids.classification}
          label="Federal tax classification"
          placeholder="Choose one"
          value={classification}
          onChange={setClassification}
          options={CLASSIFICATIONS}
        />

        {usPerson && (
          <>
            <fieldset className="m-0 flex flex-col gap-[4px] border-0 p-0">
              <legend className={cn(LABEL, "mb-[4px] p-0")}>Taxpayer identification number type</legend>
              <RadioLine name={`${group}-tin`} checked={tinType === "ssn"} label="Social Security Number" onChange={() => setTinType("ssn")} />
              <RadioLine name={`${group}-tin`} checked={tinType === "ein"} label="Employer Identification Number" onChange={() => setTinType("ein")} />
            </fieldset>
            <Field id={ids.tin} label="SSN/EIN Number" error={shown && tinError ? tinError : undefined}>
              <TextInput
                id={ids.tin}
                size="xl"
                value={tin}
                onValueChange={setTin}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder={tinType === "ssn" ? "123-45-6789" : "12-3456789"}
                invalid={shown && !!tinError}
                aria-invalid={(shown && !!tinError) || undefined}
                aria-describedby={`${ids.tin}-note${shown && tinError ? ` ${ids.tin}-error` : ""}`}
              />
              <p id={`${ids.tin}-note`} className="m-0 text-sm leading-sm text-text-tertiary">
                {saved?.usPerson && saved.tinLast4 && saved.tinType === tinType
                  ? `${tinName} ending in ${saved.tinLast4} is saved. Type a new one only to replace it.`
                  : `Only the last 4 digits are kept, and the number is never shown again.`}
              </p>
            </Field>
          </>
        )}

        {saved && <p className="m-0 text-sm leading-sm text-text-tertiary">Last saved {formatDay(saved.savedAt)}.</p>}
        <CardFormActions onCancel={() => router.push(GET_PAID)} submitLabel="Save Information" error={error} />
      </form>
    </SettingsCard>
  );
}
