"use client";

// Verify your identity, Level 1 (lib/commerce/kyc.ts): the demo identity
// check, asked inside the first withdrawal and, for physical copies, from
// the Identity row (the Earn ladder's Verify identity lands there). Full
// legal name and country of residence, each required, checked only for being
// filled in. The name is your one private legal name (lib/account/identity.ts,
// shown in Settings › Account): the form starts from it and saves what you
// type back to it. The country isn't kept; the check keeps only that you
// verified, and when. No terms to agree to (V10). The same form sits in the
// withdraw flow's first step and in its own dialog.

import * as React from "react";
import { Button, ModalFrame, SelectMenu, TestnetDemoBadge, TextInput } from "@/components/ideeza";
import { saveLegalName, useIdentity } from "@/lib/account/identity";
import { KYC_NAME_MAX, kycFormProblems } from "@/lib/commerce/kyc";
import { verifyKycDemo } from "@/lib/commerce/use-commerce";
import { SAVE_FAILED } from "../settings-card";
import { countryOptions, FIELD_ERROR, FIELD_LABEL, TAP } from "./parts";

/** What the form says about itself, under its fields. */
export const IDENTITY_NOTE =
  "Demo: nothing is checked or sent anywhere. Your legal name is saved privately in this browser (Settings › Account shows it); your country isn't kept.";

/** The Level 1 form. Its submit button lives with the caller (`form={formId}`). */
export function IdentityForm({ formId, onVerified }: { formId: string; onVerified: () => void }) {
  const { identity } = useIdentity();
  // Untouched, the field shows your saved legal name.
  const [typed, setTyped] = React.useState<string | null>(null);
  const name = typed ?? identity.legalName;
  const [country, setCountry] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const ids = { name: React.useId(), nameMsg: React.useId(), country: React.useId() };
  const options = React.useMemo(() => countryOptions(), []);

  const problems = kycFormProblems({ name, country: country ?? "" });
  const show = (k: keyof typeof problems) => (shown ? problems[k] : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.name || problems.country) {
      setShown(true);
      if (problems.name) nameRef.current?.focus();
      else document.getElementById(ids.country)?.focus();
      return;
    }
    if (!saveLegalName(name).ok || !verifyKycDemo()) {
      setRefused(true);
      return;
    }
    onVerified();
  };

  return (
    <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label htmlFor={ids.name} className={FIELD_LABEL}>
          Full legal name
        </label>
        <TextInput
          ref={nameRef}
          id={ids.name}
          size="lg"
          value={name}
          maxLength={KYC_NAME_MAX}
          onValueChange={setTyped}
          autoComplete="name"
          spellCheck={false}
          invalid={!!show("name")}
          aria-invalid={!!show("name") || undefined}
          aria-describedby={show("name") ? ids.nameMsg : undefined}
        />
        {show("name") && (
          <p id={ids.nameMsg} className={FIELD_ERROR}>
            {show("name")}
          </p>
        )}
      </div>
      <SelectMenu
        id={ids.country}
        label="Country of residence"
        placeholder="Choose your country"
        value={country}
        onChange={setCountry}
        options={options}
        error={show("country")}
      />
      <p className="m-0 flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
        <TestnetDemoBadge />
        {IDENTITY_NOTE}
      </p>
      {refused && (
        <p role="alert" className={FIELD_ERROR}>
          {SAVE_FAILED}
        </p>
      )}
    </form>
  );
}

/** The Level 1 form on its own, from the Identity row. */
export function IdentityDialog({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const formId = React.useId();
  if (!open) return null;
  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      sheet
      title="Verify your identity"
      description="Asked before your first withdrawal and before you sell physical copies."
      footer={
        <div className="ml-auto flex flex-wrap justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} hierarchy="primary" size="lg" className={TAP}>
            Verify
          </Button>
        </div>
      }
    >
      <IdentityForm
        formId={formId}
        onVerified={() => {
          onVerified();
          onClose();
        }}
      />
    </ModalFrame>
  );
}
