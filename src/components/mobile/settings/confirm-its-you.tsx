"use client";

// "Confirm it's you" before Deactivate account or Delete account (AU-63): the
// password, or — for an account made with Google or Facebook and no password —
// that provider once more (the Demo stand-in for its own sheet). Shared by
// deactivate.tsx and delete.tsx so both ask the same way.

import * as React from "react";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { isCurrentPassword } from "@/lib/account/auth";
import { PROVIDER_WORDS, phoneAccountOf, usePhoneAccounts, type Provider } from "@/lib/account/phone";
import { cn } from "@/lib/utils";
import { WayButton } from "../account/ways-in";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

export function useConfirmItsYou(email: string, what: "deactivate" | "delete") {
  const phone = phoneAccountOf(usePhoneAccounts(), email);
  const provider: Provider | undefined = phone.passwordless ? phone.providers[0] : undefined;
  const ids = useFieldIds(["password"] as const);
  const [password, setPassword] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [vouched, setVouched] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const verb = what === "deactivate" ? "deactivate" : "delete";

  /** Whether the proof is right; a wrong password says so under its field. */
  const verify = async (): Promise<boolean> => {
    if (provider) return vouched;
    if (!password) return false;
    const ok = await isCurrentPassword(email, password);
    if (!ok) setWrong(true);
    return ok;
  };

  const lead = provider ? `Log In with ${PROVIDER_WORDS[provider]} once more to ${verb} your account.` : `Enter your password to ${verb} your account.`;

  const fields = provider ? (
    vouched ? (
      <p className={cn(T.body, "text-text-success")}>{PROVIDER_WORDS[provider]} confirmed it’s you.</p>
    ) : (
      <WayButton way={provider} onClick={() => setAsking(true)} />
    )
  ) : (
    <Field label="Password" htmlFor={ids.password.id} error={wrong ? "That’s not your password." : ""} errorId={ids.password.errorId}>
      <PasswordInput
        id={ids.password.id}
        autoComplete="current-password"
        value={password}
        onValueChange={(v) => {
          setPassword(v);
          setWrong(false);
        }}
        {...errorProps(wrong ? "wrong" : "", ids.password.errorId)}
      />
    </Field>
  );

  const sheet = provider ? (
    <ReauthSheet
      open={asking}
      provider={provider}
      email={email}
      onClose={() => setAsking(false)}
      onDone={() => {
        setAsking(false);
        setVouched(true);
      }}
    />
  ) : null;

  return { lead, fields, sheet, confirmable: provider ? vouched : !!password, verify };
}

/** The Demo stand-in for the provider asking once more (AU-63e). */
function ReauthSheet({ open, provider, email, onClose, onDone }: { open: boolean; provider: Provider; email: string; onClose: () => void; onDone: () => void }) {
  const words = PROVIDER_WORDS[provider];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Continue with ${words}`}
      description={`On a phone, ${words} asks you to confirm with your ${words} password. This demo asks you to confirm.`}
      actions={
        <Button size="xl" className="w-full" onClick={onDone}>
          Confirm as {email}
        </Button>
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
    </Sheet>
  );
}
