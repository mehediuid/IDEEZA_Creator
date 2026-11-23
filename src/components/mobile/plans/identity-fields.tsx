"use client";

// Verify your identity, Level 1, on the phone: the web's form
// (components/settings/get-paid/identity.tsx, lib/commerce/kyc.ts) — the full
// legal name and the country of residence, each required, checked only for
// being filled in, and nothing else (MON-6: no mobile number, no code). The
// name is your one private legal name (lib/account/identity.ts, Settings ›
// Account shows it): the field starts from it and Verify saves what you type
// back to it; the country isn't kept, the check keeps only that you verified,
// and when. Its Verify lives with the screen that holds it, in the Bottom
// action bar: KYC › Level 1 ("Verify") and the first withdrawal's first step
// ("Verify and continue").

import * as React from "react";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { IDENTITY_NOTE } from "@/components/settings/get-paid/identity";
import { countryOptions } from "@/components/settings/get-paid/parts";
import { saveLegalName, useIdentity } from "@/lib/account/identity";
import { curly } from "@/lib/people/phone-profile";
import { KYC_NAME_MAX, kycFormProblems } from "@/lib/commerce/kyc";
import { verifyKycDemo } from "@/lib/commerce/use-commerce";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { SearchSelectField } from "./parts";

/** The web Identity dialog's line: why it's asked. */
export const IDENTITY_WHY = "Asked before your first withdrawal and before you sell physical copies.";

/** The form's state and its Verify: "invalid" (the first wrong field takes the focus), "failed" (this
 *  browser couldn't save it) or "ok" (verified, the legal name saved). */
export function useIdentityForm() {
  const { identity } = useIdentity();
  const ids = useFieldIds(["name", "country"] as const);
  // Untouched, the field shows your saved legal name.
  const [typed, setTyped] = React.useState<string | null>(null);
  const name = typed ?? identity.legalName;
  const [country, setCountry] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(false);
  const problems = kycFormProblems({ name, country: country ?? "" });

  const verify = (): "invalid" | "failed" | "ok" => {
    if (problems.name || problems.country) {
      setShown(true);
      document.getElementById(problems.name ? ids.name.id : ids.country.id)?.focus();
      return "invalid";
    }
    return saveLegalName(name).ok && verifyKycDemo() ? "ok" : "failed";
  };

  return { fields: { ids, name, setTyped, country, setCountry, problems: shown ? problems : {} }, verify };
}

export function IdentityFields({ ids, name, setTyped, country, setCountry, problems }: ReturnType<typeof useIdentityForm>["fields"]) {
  const options = React.useMemo(() => countryOptions(), []);
  return (
    <>
      <Field label="Full legal name" htmlFor={ids.name.id} error={problems.name} errorId={ids.name.errorId}>
        <TextInput
          id={ids.name.id}
          size="xl"
          value={name}
          maxLength={KYC_NAME_MAX}
          onValueChange={setTyped}
          autoComplete="name"
          spellCheck={false}
          placeholder="Enter your full legal name"
          {...errorProps(problems.name, ids.name.errorId)}
        />
      </Field>
      <Field label="Country of residence" htmlFor={ids.country.id} error={problems.country} errorId={ids.country.errorId}>
        <SearchSelectField
          id={ids.country.id}
          label="Country"
          placeholder="Choose your country"
          value={country}
          options={options}
          onChange={setCountry}
          invalid={!!problems.country}
          describedBy={problems.country ? ids.country.errorId : undefined}
        />
      </Field>
      <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
        <TestnetDemoBadge />
        {curly(IDENTITY_NOTE)}
      </p>
    </>
  );
}
