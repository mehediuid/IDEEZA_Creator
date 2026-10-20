"use client";

// Credit alerts and limits — a card on the Credits tab of Plan & pricing
// (spec §5.11), deep-linked as #credit-alerts. Five preferences from
// `ideeza:settings` › credits, each doing real work (lib/create/credit-limits):
//
// - Running low at: the account menu's "Running low" and its ring.
// - Remind me before credits expire: the notice's window (the bell reads it);
//   the card shows the next lot to expire.
// - Monthly spending limit: credits spent this calendar month. Reaching it
//   pauses a build whose turn comes and refuses a concept drawing.
// - Ask before a purchase over: one more confirm at checkout and in Buy credits.
// - Auto top-up: off by default and said so; on, a build paused for credits
//   buys the chosen pack from the Demo wallet (it asks you to sign), once per
//   pause, and the build starts.
//
// One card, one save model: it reads as rows, Edit turns it into a form, and
// Update saves (spec §1.7).

import * as React from "react";
import { Select, TextInput, Toggle } from "@/components/ideeza";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsRow } from "@/components/settings/settings-card";
import { useArrivalHighlight } from "@/components/settings/use-arrival-highlight";
import { capLeft, monthSpent, nextExpiring, readLimitsForm, type LimitsForm } from "@/lib/create/credit-limits";
import { CREDIT_PACKS, packPrice, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreditDiscount } from "@/lib/create/plan";
import { CREDIT_PACKS as PACK_IDS, updateSettings, type CreditPack } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";

export const CREDIT_ALERTS_ID = "credit-alerts";

const n = (v: number) => v.toLocaleString("en-US");
const credits = (v: number) => `${n(v)} ${v === 1 ? "credit" : "credits"}`;
const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dollars = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));
const isPack = (v: string): v is CreditPack => (PACK_IDS as readonly string[]).includes(v);

/** This page's card (as Custom amount). */
const CARD = "flex flex-col gap-[16px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px]";

/** The arrival outline (use-arrival-highlight.ts) on the card's own radius. Not
 *  through cn(): tailwind-merge drops `data-[arrived]:outline` as a clash with `outline-2`. */
const ARRIVED =
  "scroll-mt-24 data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

const EDIT_LABEL = "Edit credit alerts and limits";

export function CreditAlertsCard() {
  useArrivalHighlight();
  const settings = useSettings().credits;
  const { hydrated, balance, ledger } = useCredits();
  const discount = useCreditDiscount();
  const [editing, setEditing] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);
  // Leaving the form (Update or Cancel) puts the keyboard back on Edit.
  const done = () => {
    setEditing(false);
    window.setTimeout(() => sectionRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="${EDIT_LABEL}"]`)?.focus(), 0);
  };
  const [now] = React.useState(() => Date.now());
  const titleId = React.useId();

  const pack = CREDIT_PACKS.find((p) => p.id === settings.autoTopUp.pack) ?? CREDIT_PACKS[0];
  const packLine = (p: (typeof CREDIT_PACKS)[number]) => `${p.name} pack, ${credits(p.base + p.bonus)} for ${usd(packPrice(p, discount).final)}`;
  const spent = hydrated ? monthSpent(ledger, now) : null;
  const left = hydrated ? capLeft(ledger, settings.monthlyCap, now) : null;
  const next = hydrated ? nextExpiring(ledger, now) : null;

  const value = (text: string) => <span className="text-lg leading-lg tabular-nums text-text-primary">{text}</span>;

  return (
    <section
      ref={sectionRef}
      id={CREDIT_ALERTS_ID}
      aria-labelledby={titleId}
      className={`${CARD} ${ARRIVED}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex max-w-[62ch] flex-col gap-[4px]">
          <h2 id={titleId} className="text-xl font-semibold leading-xl text-text-primary">
            Credit alerts and limits
          </h2>
          <p className="text-md leading-md text-text-secondary">
            Know before your credits run low or run out, and set how much AI work can spend in a month.
          </p>
        </div>
        {!editing && <EditButton onClick={() => setEditing(true)} aria-label={EDIT_LABEL} />}
      </div>

      {editing ? (
        <LimitsEditor packLine={packLine} onDone={done} />
      ) : (
        <div className="flex flex-col">
          <SettingsRow
            id="credit-low-at"
            label="Running low at"
            help={`The account menu warns you at or under this balance.${hydrated ? ` You have ${credits(balance)}.` : ""}`}
            control={value(credits(settings.lowAt))}
          />
          <SettingsRow
            id="credit-expiry"
            label="Remind me before credits expire"
            help={
              !hydrated
                ? "Reading your credits…"
                : next
                  ? `Next to expire: ${credits(next.credits)} on ${date(next.expiresAt)}.`
                  : "None of your credits expire."
            }
            control={value(`${settings.expiryReminderDays} ${settings.expiryReminderDays === 1 ? "day" : "days"} before`)}
          />
          <SettingsRow
            id="credit-monthly-limit"
            label="Monthly spending limit"
            help={
              spent === null
                ? "Reading your credits…"
                : settings.monthlyCap === null
                  ? `Spent this month: ${credits(spent)}. Builds and drawings never pause for a limit.`
                  : `Spent this month: ${n(spent)} of ${credits(settings.monthlyCap)}${left === 0 ? ". You reached your monthly limit: builds pause and drawings stop until next month or a higher limit." : `, ${n(left ?? 0)} left. At the limit, builds pause and drawings stop.`}`
            }
            control={value(settings.monthlyCap === null ? "No limit" : credits(settings.monthlyCap))}
          />
          <SettingsRow
            id="credit-confirm-above"
            label="Ask before a purchase over"
            help="Checkout and Buy credits ask you once more before paying more than this."
            control={value(settings.confirmAbove === null ? "Never" : dollars(settings.confirmAbove))}
          />
          <SettingsRow
            id="credit-auto-top-up"
            label="Auto top-up"
            help={
              settings.autoTopUp.on
                ? `When a build pauses for credits, buy the ${packLine(pack)}, from the Demo wallet. The wallet asks you to sign it, once per pause, and the build starts.`
                : "Off. A build that runs out of credits waits until you buy more."
            }
            control={value(settings.autoTopUp.on ? `On · ${pack.name}` : "Off")}
          />
        </div>
      )}
    </section>
  );
}

function LimitsEditor({ packLine, onDone }: { packLine: (p: (typeof CREDIT_PACKS)[number]) => string; onDone: () => void }) {
  const s = useSettings().credits;
  const [form, setForm] = React.useState<LimitsForm>(() => ({
    lowAt: String(s.lowAt),
    remindDays: String(s.expiryReminderDays),
    cap: s.monthlyCap === null ? "" : String(s.monthlyCap),
    confirmAbove: s.confirmAbove === null ? "" : String(s.confirmAbove),
  }));
  const [autoOn, setAutoOn] = React.useState(s.autoTopUp.on);
  const [pack, setPack] = React.useState<CreditPack>(s.autoTopUp.pack);
  const [errors, setErrors] = React.useState<Partial<Record<keyof LimitsForm, string>>>({});
  const [failed, setFailed] = React.useState<string | null>(null);
  const firstRef = React.useRef<HTMLInputElement>(null);
  const ids = { lowAt: React.useId(), remindDays: React.useId(), cap: React.useId(), confirmAbove: React.useId(), pack: React.useId() };

  React.useEffect(() => firstRef.current?.focus(), []);

  const set = (k: keyof LimitsForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const read = readLimitsForm(form);
    if (!read.ok) {
      setErrors(read.errors);
      return;
    }
    setErrors({});
    const ok = updateSettings("credits", { ...read.value, autoTopUp: { on: autoOn, pack } });
    if (!ok) {
      setFailed(SAVE_FAILED);
      return;
    }
    onDone();
  };

  const field = (k: keyof LimitsForm, label: string, help: string, suffix: string, inputMode: "numeric" | "decimal", placeholder?: string) => (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <label htmlFor={ids[k]} className="text-md font-medium leading-md text-text-primary">
        {label}
      </label>
      <TextInput
        ref={k === "lowAt" ? firstRef : undefined}
        id={ids[k]}
        size="xl"
        inputMode={inputMode}
        value={form[k]}
        onValueChange={set(k)}
        placeholder={placeholder}
        suffix={suffix}
        invalid={!!errors[k]}
        aria-invalid={!!errors[k] || undefined}
        aria-describedby={`${ids[k]}-help`}
      />
      <span id={`${ids[k]}-help`} className={errors[k] ? "text-sm leading-sm text-text-error" : "text-sm leading-sm text-text-tertiary"}>
        {errors[k] ?? help}
      </span>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[20px]">
      <div className="grid grid-cols-1 gap-[20px] [@container(min-width:720px)]:grid-cols-2">
        {field("lowAt", "Running low at", "The account menu warns you at or under this balance.", "credits", "numeric")}
        {field("remindDays", "Remind me before credits expire", "How many days before a purchase or plan's credits run out.", "days", "numeric")}
        {field("cap", "Monthly spending limit", "Credits spent in a calendar month. Leave it empty for no limit.", "credits", "numeric", "No limit")}
        {field("confirmAbove", "Ask before a purchase over", "In US dollars. Leave it empty to never ask.", "USD", "decimal", "Never")}
      </div>
      <div className="flex flex-col gap-[12px] rounded-xl bg-bg-subtle p-[16px]">
        <div className="flex items-start justify-between gap-[16px]">
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-md font-medium leading-md text-text-primary">
              Auto top-up
            </span>
            <span className="text-sm leading-sm text-text-tertiary">
              {autoOn
                ? "On. When a build pauses for credits, the Demo wallet asks you to sign for this pack, once per pause, and the build starts. It never buys past your monthly limit."
                : "Off. A build that runs out of credits waits until you buy more."}
            </span>
          </span>
          <Toggle checked={autoOn} onChange={() => setAutoOn((v) => !v)} aria-label="Auto top-up" />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span id={ids.pack} className="text-md font-medium leading-md text-text-primary">
            Pack to buy
          </span>
          <Select
            aria-labelledby={ids.pack}
            size="lg"
            value={pack}
            onChange={(v) => isPack(v) && setPack(v)}
            options={CREDIT_PACKS.map((p) => ({ value: p.id, label: packLine(p) }))}
          />
        </div>
      </div>
      <CardFormActions onCancel={onDone} error={failed} />
    </form>
  );
}
