"use client";

// The web's two money settings on the phone, each a page of its own:
// · Credit alerts and limits (/m/settings/credit-alerts; the web's card on
//   Plan & pricing › Credits, components/credits/credit-alerts.tsx): Running
//   low at, Remind me before credits expire, Monthly spending limit, Ask
//   before a purchase over, and Auto top-up with its pack — the same
//   `ideeza:settings` › credits the checkout, the low-credit line and the
//   builds obey, checked by the web's rules (lib/create/credit-limits.ts).
// · Billing details (/m/settings/billing; the web's card on Billing,
//   components/credits/billing-details.tsx): Name or company, Tax ID,
//   Address and Billing email, which every invoice prints under "Billed to"
//   (lib/account/billing-details.ts).
// Each opens on what is saved; Update saves and goes back.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import { Field, errorProps } from "@/components/auth/auth-parts";
import {
  billingErrors,
  saveBilling,
  useBillingDetails,
  type BillingFields,
} from "@/lib/account/billing-details";
import {
  capLeft,
  monthSpent,
  nextExpiring,
  readLimitsForm,
  type LimitsForm,
} from "@/lib/create/credit-limits";
import { CREDIT_PACKS, packPrice, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreditDiscount } from "@/lib/create/plan";
import {
  CREDIT_PACKS as PACK_IDS,
  updateSettings,
  type CreditPack,
} from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ListBones } from "../kit/states";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, dateOf, n } from "./parts";

export const CREDIT_ALERTS_PATH = "/m/settings/credit-alerts";
export const BILLING_DETAILS_PATH = "/m/settings/billing";

const SAVE_FAILED =
  "This browser couldn’t save it (storage is full or blocked). Nothing changed.";
const noSubscribe = () => () => {};
/** False on the server and the first paint, so a form opens on what this browser saved. */
const useMounted = () =>
  React.useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
const credits = (v: number) => `${n(v)} ${v === 1 ? "credit" : "credits"}`;
const isPack = (v: string): v is CreditPack =>
  (PACK_IDS as readonly string[]).includes(v);

// ── Credit alerts and limits ───────────────────────────────────────────

export function CreditAlertsScreen() {
  const mounted = useMounted();
  const { hydrated } = useCredits();
  if (mounted && hydrated) return <CreditAlertsForm />;
  return (
    <Screen
      top={
        <TopBar back="/m/plans?tab=credits" title="Credit alerts and limits" />
      }
      className="px-8 pb-8 pt-4"
    >
      <ListBones rows={5} />
    </Screen>
  );
}

function Footer({
  failed,
  onUpdate,
}: {
  failed: string | null;
  onUpdate: () => void;
}) {
  return (
    <BottomBar>
      {failed && (
        <p role="alert" className={cn(T.caption, "text-text-error")}>
          {failed}
        </p>
      )}
      <Button size="xl" className="w-full" onClick={onUpdate}>
        Update
      </Button>
    </BottomBar>
  );
}

function CreditAlertsForm() {
  const s = useSettings().credits;
  const { balance, ledger } = useCredits();
  const discount = useCreditDiscount();
  const toast = useToast();
  const done = useGoBack("/m/plans?tab=credits");
  const [now] = React.useState(() => Date.now());
  const [form, setForm] = React.useState<LimitsForm>(() => ({
    lowAt: String(s.lowAt),
    remindDays: String(s.expiryReminderDays),
    cap: s.monthlyCap === null ? "" : String(s.monthlyCap),
    confirmAbove: s.confirmAbove === null ? "" : String(s.confirmAbove),
  }));
  const [autoOn, setAutoOn] = React.useState(s.autoTopUp.on);
  const [pack, setPack] = React.useState<CreditPack>(s.autoTopUp.pack);
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof LimitsForm, string>>
  >({});
  const [failed, setFailed] = React.useState<string | null>(null);
  const ids = {
    lowAt: React.useId(),
    remindDays: React.useId(),
    cap: React.useId(),
    confirmAbove: React.useId(),
    pack: React.useId(),
  };

  const spent = monthSpent(ledger, now);
  const left = capLeft(ledger, s.monthlyCap, now);
  const next = nextExpiring(ledger, now);
  const packLine = (p: (typeof CREDIT_PACKS)[number]) =>
    `${p.name} pack, ${credits(p.base + p.bonus)} for ${usd(packPrice(p, discount).final)}`;
  const set = (k: keyof LimitsForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setFailed(null);
    const read = readLimitsForm(form);
    if (!read.ok) {
      setErrors(read.errors);
      const first = (Object.keys(read.errors) as (keyof LimitsForm)[])[0];
      if (first) document.getElementById(ids[first])?.focus();
      return;
    }
    setErrors({});
    if (
      !updateSettings("credits", {
        ...read.value,
        autoTopUp: { on: autoOn, pack },
      })
    )
      return setFailed(SAVE_FAILED);
    toast({ title: "Credit alerts and limits saved" });
    done();
  };

  const field = (
    k: keyof LimitsForm,
    label: string,
    help: string,
    suffix: string,
    inputMode: "numeric" | "decimal",
    placeholder?: string,
  ) => (
    <Field
      label={label}
      htmlFor={ids[k]}
      error={errors[k]}
      errorId={`${ids[k]}-error`}
    >
      <TextInput
        id={ids[k]}
        size="xl"
        inputMode={inputMode}
        value={form[k]}
        onValueChange={set(k)}
        placeholder={placeholder}
        suffix={suffix}
        aria-describedby={errors[k] ? undefined : `${ids[k]}-help`}
        {...errorProps(errors[k], `${ids[k]}-error`)}
      />
      {!errors[k] && (
        <p
          id={`${ids[k]}-help`}
          className={cn(T.caption, "text-text-tertiary")}
        >
          {help}
        </p>
      )}
    </Field>
  );

  return (
    <Screen
      top={
        <TopBar back="/m/plans?tab=credits" title="Credit alerts and limits" />
      }
      className="px-8 pb-8 pt-4"
      footer={<Footer failed={failed} onUpdate={submit} />}
    >
      <div className="flex flex-col gap-8">
        <p className={T.body}>
          Know before your credits run low or run out, and set how much AI work
          can spend in a month.
        </p>
        {field(
          "lowAt",
          "Running low at",
          `The account menu warns you at or under this balance. You have ${credits(balance)}.`,
          "credits",
          "numeric",
        )}
        {field(
          "remindDays",
          "Remind me before credits expire",
          next
            ? `How many days before. Next to expire: ${credits(next.credits)} on ${dateOf(next.expiresAt)}.`
            : "How many days before. None of your credits expire.",
          "days",
          "numeric",
        )}
        {field(
          "cap",
          "Monthly spending limit",
          s.monthlyCap === null
            ? `Leave it empty for no limit. Spent this month: ${credits(spent)}.`
            : `Leave it empty for no limit. Spent this month: ${n(spent)} of ${credits(s.monthlyCap)}${left === 0 ? ": you reached it, so builds pause and drawings stop." : `, ${n(left ?? 0)} left.`}`,
          "credits",
          "numeric",
          "No limit",
        )}
        {field(
          "confirmAbove",
          "Ask before a purchase over",
          "Checkout and Buy credits ask once more above this. In US dollars; leave it empty to never ask.",
          "USD",
          "decimal",
          "Never",
        )}
        <section
          aria-label="Auto top-up"
          className={cn(CARD, "flex flex-col gap-6 p-8")}
        >
          <label className="flex cursor-pointer items-start justify-between gap-6">
            <span className="flex min-w-0 flex-col gap-1">
              <span className={T.rowTitle}>Auto top-up</span>
              <span className={T.meta}>
                {autoOn
                  ? "On. When a build pauses for credits, the Demo wallet asks you to sign for this pack, once per pause, and the build starts. It never buys past your monthly limit."
                  : "Off. A build that runs out of credits waits until you buy more."}
              </span>
            </span>
            <Toggle
              checked={autoOn}
              onChange={() => setAutoOn((v) => !v)}
              aria-label="Auto top-up"
            />
          </label>
          <Field label="Pack to buy" htmlFor={ids.pack}>
            <SheetSelect
              id={ids.pack}
              title="Pack to buy"
              value={pack}
              onChange={(v) => isPack(v) && setPack(v)}
              options={CREDIT_PACKS.map((p) => ({
                value: p.id,
                label: packLine(p),
              }))}
            />
          </Field>
        </section>
      </div>
    </Screen>
  );
}

// ── Billing details ────────────────────────────────────────────────────

const LABELS: Record<keyof BillingFields, string> = {
  name: "Name or company",
  taxId: "Tax ID (VAT / GST / EIN)",
  address: "Address",
  email: "Billing email",
};

export function BillingDetailsScreen() {
  const mounted = useMounted();
  if (mounted) return <BillingForm />;
  return (
    <Screen
      top={<TopBar back="/m/plans?tab=billing" title="Billing details" />}
      className="px-8 pb-8 pt-4"
    >
      <ListBones rows={4} />
    </Screen>
  );
}

function BillingForm() {
  const saved = useBillingDetails();
  const toast = useToast();
  const done = useGoBack("/m/plans?tab=billing");
  const [form, setForm] = React.useState<BillingFields>(() => ({
    name: saved.name,
    taxId: saved.taxId,
    address: saved.address,
    email: saved.email,
  }));
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof BillingFields, string>>
  >({});
  const [failed, setFailed] = React.useState<string | null>(null);
  const ids = {
    name: React.useId(),
    taxId: React.useId(),
    address: React.useId(),
    email: React.useId(),
  };
  const set = (k: keyof BillingFields) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const help: Partial<Record<keyof BillingFields, string>> = {
    taxId: "As your tax office writes it, for example GB123456789.",
    address: "Street, city, postcode and country, one per line.",
    email: "Printed on the invoice. Nothing is emailed from this demo.",
  };

  const submit = () => {
    setFailed(null);
    const errs = billingErrors(form);
    setErrors(errs);
    const first = (Object.keys(errs) as (keyof BillingFields)[])[0];
    if (first) return document.getElementById(ids[first])?.focus();
    if (!saveBilling(form)) return setFailed(SAVE_FAILED);
    toast({ title: "Billing details saved" });
    done();
  };

  const hint = (k: keyof BillingFields) =>
    !errors[k] && help[k] ? (
      <p id={`${ids[k]}-help`} className={cn(T.caption, "text-text-tertiary")}>
        {help[k]}
      </p>
    ) : null;
  const described = (k: keyof BillingFields) =>
    !errors[k] && help[k] ? { "aria-describedby": `${ids[k]}-help` } : {};

  return (
    <Screen
      top={<TopBar back="/m/plans?tab=billing" title="Billing details" />}
      className="px-8 pb-8 pt-4"
      footer={<Footer failed={failed} onUpdate={submit} />}
    >
      <div className="flex flex-col gap-8">
        <p className={T.body}>
          Printed under “Billed to” on every invoice. Without a name here,
          invoices use your legal name from Settings › Account, else your
          profile name.
        </p>
        <Field
          label={LABELS.name}
          htmlFor={ids.name}
          error={errors.name}
          errorId={`${ids.name}-error`}
        >
          <TextInput
            id={ids.name}
            size="xl"
            autoComplete="organization"
            value={form.name}
            onValueChange={set("name")}
            {...errorProps(errors.name, `${ids.name}-error`)}
          />
        </Field>
        <Field
          label={LABELS.taxId}
          htmlFor={ids.taxId}
          error={errors.taxId}
          errorId={`${ids.taxId}-error`}
        >
          <TextInput
            id={ids.taxId}
            size="xl"
            value={form.taxId}
            onValueChange={set("taxId")}
            {...described("taxId")}
            {...errorProps(errors.taxId, `${ids.taxId}-error`)}
          />
          {hint("taxId")}
        </Field>
        <Field
          label={LABELS.address}
          htmlFor={ids.address}
          error={errors.address}
          errorId={`${ids.address}-error`}
        >
          <Textarea
            id={ids.address}
            rows={3}
            autoComplete="street-address"
            value={form.address}
            onValueChange={set("address")}
            {...described("address")}
            {...errorProps(errors.address, `${ids.address}-error`)}
          />
          {hint("address")}
        </Field>
        <Field
          label={LABELS.email}
          htmlFor={ids.email}
          error={errors.email}
          errorId={`${ids.email}-error`}
        >
          <TextInput
            id={ids.email}
            size="xl"
            type="email"
            autoComplete="email"
            value={form.email}
            onValueChange={set("email")}
            {...described("email")}
            {...errorProps(errors.email, `${ids.email}-error`)}
          />
          {hint("email")}
        </Field>
      </div>
    </Screen>
  );
}
