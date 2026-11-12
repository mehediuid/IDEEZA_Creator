"use client";

// The ways in (Account AU-02, AU-03): Continue with Apple, Google, Facebook or
// email as A01 Secondary XL buttons, in the phone's own order — iOS lists
// Apple first, Android Google first, and Apple stays on Android (P2-AU-3) —
// then the consent line. A provider opens its own system sheet on a real
// phone; the prototype has no Apple, Google or Facebook behind it, so a Demo
// sheet stands in (it says so) and hands "Signing you in" what the provider
// would share: a name and an email, Apple's relay address, or none from
// Facebook.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Facebook01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { isEmail } from "@/lib/account/auth";
import { PROVIDER_WORDS, relayAddress, saveProviderAnswer, type Provider } from "@/lib/account/phone";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { TermsSheet } from "./terms-sheet";

export type Way = Provider | "email";

function waysInOrder(): Way[] {
  const android = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  return android ? ["google", "apple", "facebook", "email"] : ["apple", "google", "facebook", "email"];
}

/** A29 Brand Icon (Apple, Google) and the icon set's Facebook and mail, at 20. */
export function WayMark({ way }: { way: Way }) {
  if (way === "apple")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <ellipse cx="10" cy="11" rx="7" ry="8" fill="currentColor" />
        <ellipse cx="11.48" cy="3.17" rx="2" ry="2.5" transform="rotate(30 11.48 3.17)" fill="currentColor" />
        <circle cx="17" cy="10" r="2" className="fill-[var(--color-button-secondary-bg)]" />
      </svg>
    );
  // eslint-disable-next-line @next/next/no-img-element -- Google's mark keeps its own colours
  if (way === "google") return <img src="/m/google.svg" alt="" width={20} height={20} />;
  return <Icon icon={way === "facebook" ? Facebook01Icon : Mail01Icon} size={20} />;
}

const WAY_WORDS: Record<Way, string> = { ...PROVIDER_WORDS, email: "email" };

/** One way in as its A01 Secondary XL button. */
export function WayButton({ way, onClick }: { way: Way; onClick: () => void }) {
  return (
    <Button hierarchy="secondary" size="xl" className="w-full" iconLeading={<WayMark way={way} />} onClick={onClick}>
      Continue with {WAY_WORDS[way]}
    </Button>
  );
}

export function WaysIn({ onProvider, onEmail }: { onProvider: (p: Provider) => void; onEmail: () => void }) {
  const [ways] = React.useState(waysInOrder);
  const [terms, setTerms] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {ways.map((w) => (
          <WayButton key={w} way={w} onClick={() => (w === "email" ? onEmail() : onProvider(w))} />
        ))}
      </div>
      <p className={cn(T.meta, "text-center text-text-tertiary")}>
        By continuing, you agree to the IDEEZA{" "}
        <button type="button" className="text-text-brand outline-none hover:underline focus-visible:underline" onClick={() => setTerms(true)}>
          Terms of Service
        </button>{" "}
        and Privacy Policy.
      </p>
      <TermsSheet open={terms} onClose={() => setTerms(false)} />
    </div>
  );
}

/** The Demo stand-in for a provider's own sheet. Continue goes to "Signing you in". */
export function useProviderSheet({ from, next }: { from: string; next: string }) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider | null>(null);
  const sheet = (
    <DemoProviderSheet
      provider={provider}
      onClose={() => setProvider(null)}
      onContinue={(a) => {
        saveProviderAnswer({ provider: a.provider, email: a.email, first: a.first, last: a.last, from, next });
        setProvider(null);
        router.push("/m/signing-in");
      }}
    />
  );
  return { start: setProvider, sheet };
}

type Shared = { provider: Provider; email: string; first: string; last: string };

function DemoProviderSheet({
  provider,
  onClose,
  onContinue,
}: {
  provider: Provider | null;
  onClose: () => void;
  onContinue: (a: Shared) => void;
}) {
  const ids = useFieldIds(["name", "email"] as const);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [hide, setHide] = React.useState(false);
  const [share, setShare] = React.useState(true);
  const [tried, setTried] = React.useState(false);
  const close = () => {
    setTried(false);
    setHide(false);
    setShare(true);
    onClose();
  };
  if (!provider) return null;
  const needsEmail = !(provider === "apple" && hide) && !(provider === "facebook" && !share);
  const emailError = tried && needsEmail ? (!email.trim() ? "Enter your email." : !isEmail(email) ? "Enter an email like name@example.com." : "") : "";

  const go = () => {
    setTried(true);
    if (needsEmail && !isEmail(email)) return;
    const [first = "", ...rest] = name.trim().split(/\s+/);
    onContinue({
      provider,
      email: provider === "apple" && hide ? relayAddress() : needsEmail ? email : "",
      first,
      last: rest.join(" "),
    });
    close();
  };

  return (
    <Sheet
      open
      onClose={close}
      title={`Continue with ${PROVIDER_WORDS[provider]}`}
      description={`On a phone, ${PROVIDER_WORDS[provider]} shows its own sheet here. This demo asks for what it would share.`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={go}>
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
      <Field label="Name" htmlFor={ids.name.id}>
        <TextInput id={ids.name.id} size="xl" value={name} onValueChange={setName} autoComplete="name" placeholder="Your name" />
      </Field>
      {needsEmail && (
        <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
          <TextInput
            id={ids.email.id}
            size="xl"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onValueChange={setEmail}
            placeholder="name@example.com"
            {...errorProps(emailError, ids.email.errorId)}
          />
        </Field>
      )}
      {provider === "apple" && (
        <CheckRow checked={hide} onChange={() => setHide((v) => !v)}>
          Hide my email (Apple sends a relay address)
        </CheckRow>
      )}
      {provider === "facebook" && (
        <CheckRow checked={share} onChange={() => setShare((v) => !v)}>
          Share my email with IDEEZA
        </CheckRow>
      )}
    </Sheet>
  );
}

/** A08 Checkbox with its text, the whole row one target. */
export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="relative flex min-h-[44px] cursor-pointer items-start gap-8 rounded-md py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <Checkbox checked={checked} decorative className="mt-1" />
      <span className={T.bodyLg}>{children}</span>
    </label>
  );
}
