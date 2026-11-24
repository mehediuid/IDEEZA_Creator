"use client";

// Finish your account (AUTH-2): Google or Facebook made the account, and a provider shares a
// name and an email, not what the web's Sign up also asks — the date of birth and the Terms box
// (and the name, when it shared none). So right after "Signing you in", before the one question,
// the phone asks for them as Create account does: the same fields (sign-up-fields.tsx), rules and
// words (lib/account/auth.ts accountDetailsProblems), Continue in the bottom bar. A screen, not a
// sheet: the web never lets an account in without them, so there is nothing to close.

import * as React from "react";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import {
  NAME_PART_MAX,
  accountDetailsProblems,
  completeAccountDetails,
  type Account,
  type AccountDetailsField,
  type AccountDetailsInput,
} from "@/lib/account/auth";
import { PROVIDER_WORDS, phoneAccountOf, readPhoneAccounts } from "@/lib/account/phone";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, REFUSED_ALERT } from "./parts";
import { BirthDateField, ConsentCheck, birthDateParts } from "./sign-up-fields";
import { TermsSheet } from "./terms-sheet";

const KEYS = ["firstName", "lastName", "day", "month", "year", "birthday", "consent"] as const;

/** The time of an action (kept out of render, where reading the clock is impure). */
const clockNow = () => Date.now();

/** Saved, the signed-in account no longer needs them and the page that shows this goes on. */
export function DetailsStep({ account }: { account: Account }) {
  const ids = useFieldIds(KEYS);
  const online = useOnline();
  // Today, for "not in the future": fixed while the form is open.
  const [now] = React.useState(clockNow);
  // The name only when the provider didn't share it (Facebook may not).
  const [askName] = React.useState(() => !account.firstName || !account.lastName);
  const [provider] = React.useState(() => phoneAccountOf(readPhoneAccounts(), account.email).providers[0] ?? null);
  const [input, setInput] = React.useState<AccountDetailsInput>(() => ({
    firstName: account.firstName,
    lastName: account.lastName,
    ...birthDateParts(account.birthDate),
    consent: false,
  }));
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [terms, setTerms] = React.useState(false);

  const set = <K extends keyof AccountDetailsInput>(k: K) => (v: AccountDetailsInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const problems = accountDetailsProblems(input, now);
  const chosen = !!input.day && !!input.month && !!input.year;
  const show = (k: AccountDetailsField) => (tried || (k === "birthday" && chosen) ? problems[k] : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!online) return;
    const first = (Object.keys(problems) as AccountDetailsField[])[0];
    if (first) {
      setTried(true);
      const target = first === "birthday" ? (!input.day || chosen ? ids.day.id : !input.month ? ids.month.id : ids.year.id) : ids[first].id;
      document.getElementById(target)?.focus();
      return;
    }
    if (completeAccountDetails(input, clockNow()) !== "ok") setRefused(true);
  };

  return (
    <Screen
      footer={
        <BottomBar>
          <Button type="submit" form="details" size="xl" className="w-full" disabled={!online}>
            Continue
          </Button>
        </BottomBar>
      }
    >
      <form id="details" noValidate onSubmit={submit} className={cn(ACCOUNT_CONTENT, "pt-12")}>
        <AccountHeading title="Finish your account">
          {provider ? `${PROVIDER_WORDS[provider]} didn’t share these.` : "One more step to finish signing up."}
        </AccountHeading>
        <AccountAlert
          alert={
            !online
              ? { tone: "attention", title: "You’re offline", body: "Your details are kept. Continue when you’re back online." }
              : refused
                ? REFUSED_ALERT
                : null
          }
        />
        <div className="flex flex-col gap-4">
          {askName && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" htmlFor={ids.firstName.id} error={show("firstName")} errorId={ids.firstName.errorId}>
                <TextInput
                  id={ids.firstName.id}
                  size="xl"
                  autoComplete="given-name"
                  maxLength={NAME_PART_MAX}
                  value={input.firstName}
                  onValueChange={set("firstName")}
                  {...errorProps(show("firstName"), ids.firstName.errorId)}
                />
              </Field>
              <Field label="Last name" htmlFor={ids.lastName.id} error={show("lastName")} errorId={ids.lastName.errorId}>
                <TextInput
                  id={ids.lastName.id}
                  size="xl"
                  autoComplete="family-name"
                  maxLength={NAME_PART_MAX}
                  value={input.lastName}
                  onValueChange={set("lastName")}
                  {...errorProps(show("lastName"), ids.lastName.errorId)}
                />
              </Field>
            </div>
          )}
          <BirthDateField
            value={{ day: input.day, month: input.month, year: input.year }}
            onChange={(part, v) => set(part)(v)}
            shown={tried || chosen}
            now={now}
            ids={ids}
          />
        </div>
        <ConsentCheck checked={input.consent} onChange={set("consent")} error={show("consent")} ids={ids.consent} onTerms={() => setTerms(true)} />
      </form>
      <TermsSheet open={terms} onClose={() => setTerms(false)} />
    </Screen>
  );
}
