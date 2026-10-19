"use client";

// /settings/account (Settings v2, owner V1–V2, 2026-10-20). Only what is
// yours as an account, each in one card whose id is its search row
// (lib/settings/rows/account.ts):
//   public-profile — what others see (photo, name, headline), with Edit
//     profile, which opens your profile with its Edit profile dialog open
//     (`?edit=1`). That dialog is the one editor of the public profile.
//   handle   — your profile's address, Copy, and Edit (its one home).
//   legal-name — private: the identity check fills its name from it and saves
//     back to it, and an invoice prints it when Billing details names no one.
//   wallet   — the connected demo wallet, its network and the Testnet demo
//     badge; Manage or Connect opens the wallet dialog.
//   sign-in  — one honest line: there is no sign-in yet, so your work lives in
//     this browser; Download your information keeps a copy.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon, Copy01Icon, Download04Icon, PencilEdit02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, Skeleton, TestnetDemoBadge, TextInput, buttonVariants } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { LEGAL_NAME_MAX, saveLegalName, useIdentity } from "@/lib/account/identity";
import { cleanHandle, HANDLE_MAX } from "@/lib/people/handle";
import { displayNameOf, handleProblem, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { demoAddress, makerId, shortAddress } from "@/lib/wallet/demo-wallet";
import { identityLabelOf, networkLabelOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { CardFormActions, SAVE_FAILED, SettingsCard } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** Phones get 44 px targets. */
const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
const VALUE = "m-0 text-md leading-md text-text-primary [overflow-wrap:anywhere]";
const QUIET = "m-0 max-w-[62ch] text-sm leading-sm text-text-tertiary";
const FIELD_LABEL = "w-fit text-sm leading-sm text-text-secondary";
const LINK =
  "rounded-xs text-md font-medium leading-md text-text-link underline-offset-[3px] outline-none [overflow-wrap:anywhere] hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

const noSubscribe = () => () => {};

function useHost(): string {
  return React.useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
}

/** A card's Edit ↔ form: Edit focuses the form's first field; leaving puts focus back on Edit. */
function useCardEdit() {
  const [editing, setEditing] = React.useState(false);
  const editRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const was = React.useRef(false);
  React.useEffect(() => {
    if (editing && !was.current) formRef.current?.querySelector<HTMLElement>("input")?.focus();
    if (!editing && was.current) editRef.current?.querySelector<HTMLElement>("button")?.focus();
    was.current = editing;
  }, [editing]);
  return { editing, start: () => setEditing(true), stop: () => setEditing(false), editRef, formRef };
}

/** A card's Edit, as settings-card's EditButton draws it, 44 px tall on a phone. */
function EditAction({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" hierarchy="outline-brand" size="sm" onClick={onClick} aria-label={label} className={TAP}>
      <Icon icon={PencilEdit02Icon} size={16} />
      Edit
    </Button>
  );
}

export function AccountPage() {
  return (
    <SettingsFrame page="account">
      <PublicProfileCard />
      <HandleCard />
      <LegalNameCard />
      <WalletCard />
      <SignInCard />
    </SettingsFrame>
  );
}

// ─────────────────────────── public profile ───────────────────────────

function PublicProfileCard() {
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const name = displayNameOf(fields.name);
  const href = `/creators/${ownHandleOf(fields.handle)}`;
  return (
    <SettingsCard
      id="public-profile"
      title="Public profile"
      description="What other creators see: your photo, name, headline, about, links, skills and languages. You edit them on your profile."
      action={
        <Link
          href={`${href}?edit=1`}
          className={buttonVariants({ hierarchy: "outline-brand", size: "sm", className: TAP })}
        >
          <Icon icon={PencilEdit02Icon} size={16} />
          Edit profile
        </Link>
      }
    >
      {hydrated && photo.hydrated ? (
        <div className="flex items-center gap-[12px] py-[8px]">
          <Avatar size="md" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} className="shrink-0" />
          <div className="flex min-w-0 flex-col gap-[2px]">
            <Link href={href} className={cn(LINK, "w-fit text-text-primary")}>
              {name}
            </Link>
            <p className={cn("m-0 text-sm leading-sm [overflow-wrap:anywhere]", fields.headline ? "text-text-secondary" : "text-text-tertiary")}>
              {fields.headline || "No headline yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-[12px] py-[8px]">
          <Skeleton shape="block" className="size-[40px] shrink-0 rounded-full" />
          <Skeleton shape="text" size="md" className="w-[200px] max-w-full" />
        </div>
      )}
    </SettingsCard>
  );
}

// ─────────────────────────── handle ───────────────────────────

function useCopy(): { copied: string | null; copy: (value: string) => void } {
  const [copied, setCopied] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = React.useCallback((value: string) => {
    const write = navigator.clipboard?.writeText(value);
    const failed = `Couldn't copy. Select the address instead.`;
    if (!write) {
      setCopied(failed);
      return;
    }
    write.then(
      () => setCopied("Copied"),
      () => setCopied(failed),
    );
  }, []);
  return { copied, copy };
}

function HandleCard() {
  const { hydrated, fields } = useMyProfile();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  const host = useHost();
  const { copied, copy } = useCopy();
  const path = `/creators/${ownHandleOf(fields.handle)}`;
  return (
    <SettingsCard
      id="handle"
      title="Handle"
      description="Your profile's address."
      action={
        !editing && (
          <div ref={editRef}>
            <EditAction onClick={start} label="Edit handle" />
          </div>
        )
      }
    >
      {editing ? (
        <HandleForm formRef={formRef} initial={fields.handle} host={host} onDone={stop} />
      ) : hydrated ? (
        <div className="flex flex-col gap-[8px] py-[8px]">
          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
            <Link href={path} className={LINK}>
              {`${host}${path}`}
            </Link>
            <Button
              type="button"
              hierarchy="secondary"
              size="sm"
              iconLeading={<Icon icon={copied === "Copied" ? Tick02Icon : Copy01Icon} size={16} />}
              onClick={() => copy(`${window.location.origin}${path}`)}
              className={TAP}
            >
              {copied === "Copied" ? "Copied" : "Copy"}
            </Button>
            <span aria-live="polite" className={copied && copied !== "Copied" ? "text-sm leading-sm text-text-error" : "sr-only"}>
              {copied}
            </span>
          </div>
          <p className={QUIET}>
            {fields.handle ? "" : "Choose a handle to give your profile an address of its own. "}
            Until sign-in arrives, this address opens your profile in this browser only.
          </p>
        </div>
      ) : (
        <Skeleton shape="text" size="md" className="my-[8px] w-[240px] max-w-full" />
      )}
    </SettingsCard>
  );
}

function HandleForm({
  formRef,
  initial,
  host,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  initial: string;
  host: string;
  onDone: () => void;
}) {
  const id = React.useId();
  const [value, setValue] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const h = cleanHandle(value);
  const problem = h ? handleProblem(h) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    if (h === initial) {
      onDone();
      return;
    }
    if (!saveProfile({ handle: h }).ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  const note = problem ? null : h ? (
    <span className="flex items-start gap-[6px] text-text-success">
      <Icon icon={CheckmarkCircle02Icon} size={16} className="mt-[2px] shrink-0" />
      <span className="[overflow-wrap:anywhere]">{`${h === initial ? "Your address" : "Available"}: ${host}/creators/${h}`}</span>
    </span>
  ) : (
    `Your profile stays at ${host}/creators/me until you choose one.`
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[8px] pt-[8px]">
      <label htmlFor={id} className={FIELD_LABEL}>
        Handle
      </label>
      <TextInput
        ref={inputRef}
        id={id}
        size="lg"
        value={value}
        onValueChange={(v) => {
          setValue(v.toLowerCase());
          setError(null);
        }}
        maxLength={HANDLE_MAX + 5}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        placeholder="your-name"
        invalid={!!problem}
        aria-invalid={!!problem || undefined}
        aria-describedby={`${id}-note ${id}-rule`}
        containerClassName={TAP}
      />
      <div id={`${id}-note`} role={problem ? "alert" : undefined} className={cn("text-sm leading-sm", problem ? "text-text-error" : "text-text-tertiary")}>
        {problem ?? note}
      </div>
      <p id={`${id}-rule`} className={QUIET}>
        {`3 to ${HANDLE_MAX} lower-case letters, numbers or hyphens.${initial && h !== initial ? " Links to your old address stop working." : ""}`}
      </p>
      <CardFormActions onCancel={onDone} submitLabel="Save" error={error} />
    </form>
  );
}

// ─────────────────────────── legal name ───────────────────────────

function LegalNameCard() {
  const { hydrated, identity } = useIdentity();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  return (
    <SettingsCard
      id="legal-name"
      title="Legal name"
      description="Private. Used for the identity check and on invoices, never on your profile."
      action={
        !editing && (
          <div ref={editRef}>
            <EditAction onClick={start} label="Edit legal name" />
          </div>
        )
      }
    >
      {editing ? (
        <LegalNameForm formRef={formRef} initial={identity.legalName} onDone={stop} />
      ) : hydrated ? (
        <p className={cn(VALUE, "py-[8px]", !identity.legalName && "text-text-tertiary")}>{identity.legalName || "Not given yet"}</p>
      ) : (
        <Skeleton shape="text" size="md" className="my-[8px] w-[200px] max-w-full" />
      )}
    </SettingsCard>
  );
}

function LegalNameForm({ formRef, initial, onDone }: { formRef: React.RefObject<HTMLFormElement | null>; initial: string; onDone: () => void }) {
  const id = React.useId();
  const [value, setValue] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveLegalName(value).ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[8px] pt-[8px]">
      <label htmlFor={id} className={FIELD_LABEL}>
        Legal name
      </label>
      <TextInput
        id={id}
        size="lg"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setError(null);
        }}
        maxLength={LEGAL_NAME_MAX}
        autoComplete="name"
        spellCheck={false}
        aria-describedby={`${id}-note`}
        containerClassName={TAP}
      />
      <p id={`${id}-note`} className={QUIET}>
        Your full name as it is written on your ID.
      </p>
      <CardFormActions onCancel={onDone} submitLabel="Save" error={error} />
    </form>
  );
}

// ─────────────────────────── wallet ───────────────────────────

function WalletCard() {
  const wallet = useDemoWallet();
  const { openManage } = useWalletRequest();
  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!(id && state?.connected);
  return (
    <SettingsCard
      id="wallet"
      title="Wallet"
      description="The wallet that signs your mints and listings."
      action={
        wallet !== undefined && (
          <Button type="button" hierarchy={connected ? "secondary" : "outline-brand"} size="sm" onClick={openManage} className={TAP}>
            {connected ? "Manage" : "Connect wallet"}
          </Button>
        )
      }
    >
      {wallet === undefined ? (
        <Skeleton shape="text" size="md" className="my-[8px] w-[240px] max-w-full" />
      ) : connected && id && state ? (
        <div className="flex flex-col gap-[4px] py-[8px]">
          <p className={cn(VALUE, "font-mono")} title={demoAddress(id)}>
            {shortAddress(demoAddress(id))}
          </p>
          <p className="m-0 flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-sm leading-sm text-text-secondary">
            {`${identityLabelOf(id)} · ${networkLabelOf(state.network)}`}
            <TestnetDemoBadge />
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[8px] py-[8px]">
          <p className={cn(VALUE, "text-text-secondary")}>Not connected</p>
          <TestnetDemoBadge />
        </div>
      )}
    </SettingsCard>
  );
}

// ─────────────────────────── sign-in ───────────────────────────

function SignInCard() {
  return (
    <SettingsCard
      id="sign-in"
      title="Sign-in and security"
      description="Sign-in isn't in the app yet. Password, 2-step sign-in, your devices and deleting your account come with it."
    >
      <div className="flex flex-col items-start gap-[12px] py-[8px]">
        <p className={cn(VALUE, "max-w-[62ch] text-text-secondary")}>
          Until then your work lives in this browser only, and clearing its data removes it. Keep a copy.
        </p>
        <Link href="/settings/data#download" className={buttonVariants({ hierarchy: "tonal", size: "md", className: TAP })}>
          <Icon icon={Download04Icon} size={16} />
          Download your information
        </Link>
      </div>
    </SettingsCard>
  );
}
