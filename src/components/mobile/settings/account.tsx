"use client";

// ST-10 · Account: the public profile as one row (what others see; the row
// opens Edit profile), then Handle (its value; the row opens the editor, which
// also copies the profile link), Legal name (private, ST-12 sheet), Wallet (ST-13
// connected → Done / Disconnect with a neutral confirm; ST-13b not connected
// → Connect a wallet), and Security › Sign-in & security. ST-11…11c, the
// handle editor, is account-handle.tsx. The web's Account page
// (components/settings/account-page.tsx) decides the words and the stores.

import * as React from "react";
import { Copy01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { useAuth } from "@/lib/account/auth";
import { LEGAL_NAME_MAX, saveLegalName, useIdentity } from "@/lib/account/identity";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { demoAddress, makerId, readWallet, shortAddress, walletConnect, walletDisconnect } from "@/lib/wallet/demo-wallet";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { useDemoWallet, writeDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Chevron, LIST_ROW } from "../kit/list";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SettingsGroup, SettingsRow, SettingsScreen } from "./kit";

export function AccountSettings() {
  const { hydrated } = useMyProfile();
  const { hydrated: identityRead } = useIdentity();
  const wallet = useDemoWallet();
  return (
    <SettingsScreen title="Account" loading={!hydrated || !identityRead || wallet === undefined} offlineNote>
      <PublicProfile />
      <SettingsGroup label="Account">
        <HandleRow />
        <LegalNameRow />
        <WalletRow />
      </SettingsGroup>
      <SettingsGroup label="Security">
        <SettingsRow id="sign-in" icon={Shield01Icon} label="Sign-in & security" helper="Password, 2-step sign-in, devices" href="/m/settings/security" />
      </SettingsGroup>
    </SettingsScreen>
  );
}

/** The public profile as one row (avatar, name, headline) that opens Edit profile. */
function PublicProfile() {
  const { account } = useAuth();
  const { fields } = useMyProfile();
  const photo = useMyPhoto();
  const name = displayNameOf(fields.name || `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim());
  const line = [fields.headline, fields.location].filter(Boolean).join(" · ");
  return (
    <SettingsGroup id="public-profile" label="Public profile">
      <Link href="/m/profile/edit?from=settings" aria-label={`Edit profile: ${name}`} className={LIST_ROW}>
        <Avatar size="lg" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} className="shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.name, "truncate")}>{name}</span>
          <span className={cn(T.meta, "truncate", line ? "text-text-secondary" : "text-text-tertiary")}>{line || "No headline yet"}</span>
        </span>
        {/* "Edit" (the row is under Public profile) so the name keeps its room at 320. */}
        <span aria-hidden className={cn(T.body, "shrink-0")}>
          Edit
        </span>
        <Chevron />
      </Link>
    </SettingsGroup>
  );
}

/** Handle: its value; the row opens the editor, where the profile link is copied. */
function HandleRow() {
  const { fields } = useMyProfile();
  return (
    <SettingsRow
      id="handle"
      label="Handle"
      value={fields.handle ? `@${ownHandleOf(fields.handle)}` : "Not chosen yet"}
      href="/m/settings/account/handle"
    />
  );
}

function LegalNameRow() {
  const { identity } = useIdentity();
  const online = useOnline();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <SettingsRow
        id="legal-name"
        label="Legal name"
        value={identity.legalName || "Not given yet"}
        badge={{ tone: "neutral", text: "Private" }}
        onClick={() => setOpen(true)}
        disabled={!online}
      />
      <LegalNameSheet open={open} onClose={() => setOpen(false)} initial={identity.legalName} />
    </>
  );
}

function LegalNameSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: string }) {
  const ids = useFieldIds(["name"] as const);
  const toast = useToast();
  const [value, setValue] = React.useState(initial);
  const [failed, setFailed] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initial);
      setFailed(false);
    }
  }
  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!saveLegalName(value).ok) return setFailed(true);
    onClose();
    toast({ title: "Saved" });
  };
  const error = failed ? "Couldn’t save. Nothing changed." : "";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Legal name"
      actions={
        <>
          <Button type="submit" form="legal-name-form" size="xl" className="w-full">
            Save
          </Button>
        </>
      }
    >
      <form id="legal-name-form" noValidate onSubmit={save} className="flex flex-col gap-2">
        <Field label="Legal name" htmlFor={ids.name.id} error={error} errorId={ids.name.errorId}>
          <TextInput
            id={ids.name.id}
            size="xl"
            value={value}
            onValueChange={(v) => {
              setValue(v);
              setFailed(false);
            }}
            maxLength={LEGAL_NAME_MAX}
            autoComplete="name"
            spellCheck={false}
            autoFocus
            {...errorProps(error, ids.name.errorId)}
          />
        </Field>
        <p className={T.meta}>Private. Your full name as it is written on your ID, used for the identity check and on invoices.</p>
      </form>
    </Sheet>
  );
}

function WalletRow() {
  const wallet = useDemoWallet();
  const online = useOnline();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!(id && state?.connected);
  const address = id ? demoAddress(id) : "";
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast({ title: "Address copied" });
    } catch {
      toast({ title: "Couldn’t copy the address.", lead: "error" });
    }
  };

  const write = (change: "connect" | "disconnect") => {
    if (!id) return false;
    const w = readWallet();
    return writeDemoWallet(change === "connect" ? walletConnect(w, id) : walletDisconnect(w, id));
  };

  return (
    <>
      <SettingsRow
        id="wallet"
        label="Wallet"
        helper={connected && state ? `${shortAddress(address)} · ${networkLabelOf(state.network)}` : "Not connected"}
        trailing={<TestnetDemoBadge className="shrink-0" />}
        onClick={() => setOpen(true)}
        disabled={!online}
      />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Wallet"
        actions={
          connected ? (
            <>
              <Button size="xl" className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
              <Button
                hierarchy="secondary"
                size="xl"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  setConfirm(true);
                }}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <Button
                size="xl"
                className="w-full"
                onClick={() => {
                  if (!write("connect")) return toast({ title: "Couldn’t save. Nothing changed.", lead: "error" });
                  toast({ title: "Wallet connected" });
                }}
              >
                Connect a wallet
              </Button>
            </>
          )
        }
      >
        {connected && state ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <p className={cn(T.bodyLg, "min-w-0 flex-1 font-mono [overflow-wrap:anywhere]")}>{address}</p>
              <IconButton
                hierarchy="ghost"
                size="xl"
                className="-my-4 shrink-0"
                aria-label="Copy address"
                icon={<Icon icon={Copy01Icon} size={20} />}
                onClick={copyAddress}
              />
            </div>
            <p className={cn(T.body, "flex flex-wrap items-center gap-4")}>
              Network: {networkLabelOf(state.network)}
              <TestnetDemoBadge />
            </p>
            <p className={T.body}>This is a test network. Nothing here has real value yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <TestnetDemoBadge className="self-start" />
            <p className={T.body}>
              Connect to sign sales and receive copies. You approve each step in your wallet app; IDEEZA never sees your recovery phrase.
            </p>
          </div>
        )}
      </Sheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Disconnect your wallet?"
        body="You can’t sign mints, listings or sales until you connect it again. Nothing in it changes."
        verb="Disconnect"
        onConfirm={() => {
          if (!write("disconnect")) return toast({ title: "Couldn’t save. Nothing changed.", lead: "error" });
          toast({ title: "Wallet disconnected" });
        }}
      />
    </>
  );
}
