"use client";

// ST-10 · Account: the public profile as one row (what others see; the row
// opens Edit profile), then Handle (its value; the row opens the editor, which
// also copies the profile link), Legal name (private, ST-12 sheet), Wallet (ST-13
// connected → Done / Disconnect with a neutral confirm; ST-13b not connected
// → Connect a wallet), and Security › Sign-in & security. ST-11…11c, the
// handle editor, is account-handle.tsx. The web's Account page
// (components/settings/account-page.tsx) decides the words and the stores.
// The connected Wallet sheet also has the web manage view's switches
// (wallet-dialog.tsx): Switch account and Switch network rows that open
// pick-one sheets (walletSwitchAccount / walletSwitchNetwork, SET-16), so a
// wrong network is changed here, not only inside a signing request.

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
import { NETWORKS, type Network } from "@/lib/brief/types";
import { demoAddress, makerId, readWallet, shortAddress, walletConnect, walletDisconnect, walletSwitchAccount, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { balanceLineOf, identityLabelOf, networkLabelOf } from "@/lib/wallet/request-view";
import type { AccountIndex, DemoWallet } from "@/lib/wallet/types";
import { useDemoWallet, writeDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { useEarnState } from "../earn-coin/parts";
import { Chevron, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
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
  const [picking, setPicking] = React.useState<"account" | "network" | null>(null);
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
  /** An account or network switch, on the wallet as it is now (another tab's change is never overwritten). */
  const save = (change: (w: DemoWallet) => DemoWallet, done: string) => {
    if (writeDemoWallet(change(readWallet()))) toast({ title: done });
    else toast({ title: "Couldn’t save. Nothing changed.", lead: "error" });
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
            <ListCard label="Switch account or network">
              <ListRow title="Switch account" meta={identityLabelOf(id!)} onClick={() => setPicking("account")} />
              <ListRow title="Switch network" meta={networkLabelOf(state.network)} onClick={() => setPicking("network")} />
            </ListCard>
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
      {picking === "account" && wallet && (
        <AccountPick
          account={wallet.account}
          network={state?.network ?? "baseSepolia"}
          onClose={() => setPicking(null)}
          onPick={(a) => {
            const label = DEMO_ACCOUNTS.find((x) => x.index === a)?.label ?? `Demo account ${a}`;
            if (a !== wallet.account) save((w) => walletSwitchAccount(w, a), `${label} chosen`);
          }}
        />
      )}
      {picking === "network" && id && state && (
        <PickSheet
          open
          onClose={() => setPicking(null)}
          title="Network"
          options={NETWORKS.map((n) => ({ value: n.value, label: n.label }))}
          value={state.network}
          onPick={(n: Network) => n !== state.network && save((w) => walletSwitchNetwork(w, makerId(w.account), n), `Wallet on ${networkLabelOf(n)}`)}
        />
      )}
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

/** The demo account to use, with its address and what it holds on the wallet's network (the web's Account
 *  radio rows, accountRowOf). Mounted only while open: its balances follow the clock. */
function AccountPick({ account, network, onClose, onPick }: { account: AccountIndex; network: Network; onClose: () => void; onPick: (a: AccountIndex) => void }) {
  const { wallet, market, now } = useEarnState();
  const ctx = { wallet, market, now };
  return (
    <PickSheet
      open
      onClose={onClose}
      title="Account"
      options={DEMO_ACCOUNTS.map((a) => ({
        value: String(a.index),
        label: a.label,
        helper: `${shortAddress(a.address)} · ${balanceLineOf(makerId(a.index), network, ctx)}`,
      }))}
      value={String(account)}
      onPick={(v) => onPick(Number(v) as AccountIndex)}
    />
  );
}
