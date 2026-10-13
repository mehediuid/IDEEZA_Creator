"use client";

// "Verify identity (demo)" (Build and Earn P1-4). It collects nothing real:
// a name and a country, no document, and neither is stored. Both must be
// filled in; then "Verify (demo)" stores the outcome alone under
// `ideeza:commerce:kyc` ({ status: "verified", at, demo: true }). The dialog
// says so up front, in a banner that can't be missed, and the fields switch
// autofill off so the browser doesn't offer the maker's real details.
//
// It is the one place the check is made; the ladder and the commit points
// open it from their "Verify identity" fix, and the ladder holds its Reset.

import * as React from "react";
import { Banner, Button, ModalFrame, TextInput } from "@/components/ideeza";
import { KYC_COUNTRY_MAX, KYC_NAME_MAX, kycFormProblems } from "@/lib/commerce/kyc";
import { verifyKycDemo } from "@/lib/commerce/use-commerce";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LABEL = "w-fit text-md text-[color:var(--color-input-label)]";
const HINT = "text-sm text-[color:var(--color-input-helper)]";
const ERROR = "text-sm text-[color:var(--color-input-error-text)]";
/** The form's own alert, a sentence, not a field's helper line. */
const ALERT = "text-md text-[color:var(--color-input-error-text)]";

export const KYC_DEMO_NOTE = "Demo — no real verification. Nothing you type here is stored or sent anywhere.";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** After the outcome is stored, with the sentence for the page's live region. */
  onVerified?: (message: string) => void;
};

/** Mounted only while open, so nothing typed outlives the dialog. */
export function VerifyIdentityDialog(props: DialogProps) {
  return props.open ? <VerifyIdentityForm {...props} /> : null;
}

function VerifyIdentityForm({ open, onClose, onVerified }: DialogProps) {
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [shown, setShown] = React.useState<{ name: boolean; country: boolean }>({ name: false, country: false });
  const [refused, setRefused] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const countryRef = React.useRef<HTMLInputElement>(null);
  const ids = { name: React.useId(), country: React.useId(), nameMsg: React.useId(), countryMsg: React.useId() };

  const problems = kycFormProblems({ name, country });
  const nameError = shown.name ? problems.name : undefined;
  const countryError = shown.country ? problems.country : undefined;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (problems.name || problems.country) {
      setShown({ name: true, country: true });
      (problems.name ? nameRef : countryRef).current?.focus();
      return;
    }
    if (!verifyKycDemo()) {
      setRefused(true);
      return;
    }
    onVerified?.("Identity verified (demo).");
    onClose();
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title="Verify identity (demo)"
      description="Physical editions and payouts ask for this step."
      initialFocus={nameRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={ids.name + "-form"} hierarchy="primary" size="lg" className={TAP}>
            Verify (demo)
          </Button>
        </div>
      }
    >
      <form id={ids.name + "-form"} noValidate onSubmit={submit} className="flex flex-col gap-8">
        <Banner tone="attention">{KYC_DEMO_NOTE}</Banner>

        <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
          <label htmlFor={ids.name} className={LABEL}>
            Name
          </label>
          <TextInput
            ref={nameRef}
            id={ids.name}
            size="xl"
            value={name}
            maxLength={KYC_NAME_MAX}
            onValueChange={setName}
            onBlur={() => setShown((s) => ({ ...s, name: true }))}
            autoComplete="off"
            spellCheck={false}
            placeholder="Any name"
            invalid={!!nameError}
            aria-invalid={!!nameError || undefined}
            aria-describedby={ids.nameMsg}
          />
          <span id={ids.nameMsg} className={nameError ? ERROR : HINT}>
            {nameError ?? "Any name works. It isn't checked."}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
          <label htmlFor={ids.country} className={LABEL}>
            Country
          </label>
          <TextInput
            ref={countryRef}
            id={ids.country}
            size="xl"
            value={country}
            maxLength={KYC_COUNTRY_MAX}
            onValueChange={setCountry}
            onBlur={() => setShown((s) => ({ ...s, country: true }))}
            autoComplete="off"
            spellCheck={false}
            placeholder="Any country"
            invalid={!!countryError}
            aria-invalid={!!countryError || undefined}
            aria-describedby={ids.countryMsg}
          />
          <span id={ids.countryMsg} className={countryError ? ERROR : HINT}>
            {countryError ?? "No document is asked for."}
          </span>
        </div>

        {refused && (
          <p role="alert" className={cn(ALERT, "m-0")}>
            This browser couldn&apos;t save it (storage is full or blocked). Nothing changed.
          </p>
        )}
      </form>
    </ModalFrame>
  );
}
