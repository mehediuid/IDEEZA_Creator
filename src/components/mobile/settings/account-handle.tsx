"use client";

// ST-11 · Edit handle: "@" and the handle, the web's rules checked as you
// type (3–30 lower-case letters, numbers and hyphens; a sample creator's is
// taken), "Available" with the address it gives and that the old one stops
// working; ST-11b taken → Save off; ST-11c saved → back on Account with
// "Handle saved". As on the web, an empty field saves too: it takes the
// handle away and the profile stays at /creators/me; and the address opens
// the profile on this phone only.

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/auth-parts";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { cleanHandle, HANDLE_MAX } from "@/lib/people/handle";
import { handleProblem } from "@/lib/people/ids";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SettingsScreen, leaveTo } from "./kit";

const noSubscribe = () => () => {};

export function HandleSettings() {
  const { hydrated, fields } = useMyProfile();
  if (!hydrated)
    return (
      <SettingsScreen title="Handle" back="/m/settings/account" loading>
        {null}
      </SettingsScreen>
    );
  return <HandleForm initial={fields.handle} />;
}

function HandleForm({ initial }: { initial: string }) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const host = React.useSyncExternalStore(
    noSubscribe,
    () => window.location.host,
    () => "",
  );
  const [value, setValue] = React.useState(initial);
  const [failed, setFailed] = React.useState(false);
  const h = cleanHandle(value);
  const problem = h ? handleProblem(h) : null;
  const changed = h !== initial;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem || !online) return;
    if (!changed) return leaveTo(router, "/m/settings/account");
    if (!saveProfile({ handle: h }).ok) return setFailed(true);
    toast({ title: h ? "Handle saved" : "Handle removed" });
    leaveTo(router, "/m/settings/account");
  };

  return (
    <SettingsScreen
      title="Handle"
      back="/m/settings/account"
      footer={
        <BottomBar>
          <Button type="submit" form="handle-form" size="xl" className="w-full" disabled={!!problem || (!h && !initial) || !online}>
            Save
          </Button>
        </BottomBar>
      }
    >
      <form id="handle-form" noValidate onSubmit={save} className="flex flex-col gap-4">
        <Field label="Handle" htmlFor="handle-input" error={problem ?? (failed ? "Couldn’t save. Nothing changed." : "")} errorId="handle-error">
          <TextInput
            id="handle-input"
            size="xl"
            prefixText="@"
            value={value}
            onValueChange={(v) => {
              setValue(v.toLowerCase());
              setFailed(false);
            }}
            maxLength={HANDLE_MAX + 5}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="your-name"
            invalid={!!problem}
            aria-describedby="handle-rule handle-note"
            aria-invalid={!!problem || undefined}
          />
        </Field>
        <p id="handle-rule" className={T.meta}>
          3–{HANDLE_MAX} characters: lower-case letters, numbers and hyphens.
        </p>
        {!problem && h && (
          <p id="handle-note" className={cn(T.meta, "flex items-start gap-3 text-text-success")}>
            <span className="mt-1 shrink-0 text-[color:var(--color-icon-success)]">
              <Icon icon={CheckmarkCircle02Icon} size={16} />
            </span>
            {changed ? "Available" : "Your handle now"}
          </p>
        )}
        <p className={cn(T.body, "[overflow-wrap:anywhere]")}>
          {h && !problem
            ? `Your profile link becomes ${host}/creators/${h}.${initial && changed ? " The old link stops working." : ""}`
            : `Your profile stays at ${host}/creators/me until you choose one.${initial && !h ? " The old link stops working." : ""}`}
        </p>
        <p className={T.meta}>This address opens your profile on this phone only.</p>
      </form>
    </SettingsScreen>
  );
}
