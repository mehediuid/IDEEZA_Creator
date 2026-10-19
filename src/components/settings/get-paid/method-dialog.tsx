"use client";

// Where withdrawals go (Settings v2, V7). A withdrawal method is a crypto
// wallet address on a network: your own demo wallet's address, or any
// address you paste (a receive-only wallet is fine), with the network it is
// paid on and an optional name. Bank and PayPal payouts need accounts with
// those services, which the app doesn't have; the dialog says so in one line.
//
// Adding one, or making one the default, is signed in the demo wallet (the
// full address and the network in the summary), and each change, a removal
// too, is logged in the record, so the bell says it happened. The same
// fields are the withdraw flow's "Where the money goes" step, the first time.

import * as React from "react";
import { Button, ModalFrame, Radio, SelectMenu, TextInput } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import {
  addMethod,
  METHOD_LABEL_MAX,
  METHODS_MAX,
  makeDefault,
  type PayoutStore,
  type WithdrawalMethod,
} from "@/lib/account/payout";
import { updatePayout } from "@/lib/account/use-payout";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { randomId } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import type { WalletRequest } from "@/lib/wallet/types";
import { SAVE_FAILED } from "../settings-card";
import { FIELD_ERROR, FIELD_HELP, FIELD_LABEL, FullAddress, networkName, TAP, useMakerWallet } from "./parts";

export type MethodDraft = { address: string; label: string; network: Network };
export type MethodFormState = { source: "mine" | "paste"; address: string; label: string; network: Network | null };

const PROBLEM: Record<"address" | "duplicate" | "full", string> = {
  address: "Enter a wallet address: 0x followed by 40 letters and digits (0–9, a–f).",
  duplicate: "This address is already one of your withdrawal methods.",
  full: `You can keep up to ${METHODS_MAX} withdrawal methods. Remove one to add another.`,
};

const ROW =
  "flex min-h-[var(--touch-min)] cursor-pointer items-start gap-[12px] rounded-xl border border-solid px-[16px] py-[12px] transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus";

/** A new form: your own demo wallet first, unless it's a method already. */
export function useMethodForm(store: PayoutStore) {
  const wallet = useMakerWallet();
  const mineTaken = store.methods.some((m) => m.address.toLowerCase() === wallet.address.toLowerCase());
  const [state, setState] = React.useState<MethodFormState>({ source: "mine", address: "", label: "", network: null });
  const source = mineTaken ? "paste" : state.source;
  const network = state.network ?? wallet.network;
  const draft: MethodDraft =
    source === "mine"
      ? { address: wallet.address, label: state.label.trim() || wallet.label, network }
      : { address: state.address, label: state.label, network };
  /** What's wrong with the draft for this record, or null. */
  const problemOf = (s: PayoutStore): string | null => {
    const r = addMethod(s, draft, 0, "check");
    return r.ok ? null : PROBLEM[r.problem];
  };
  return { wallet, mineTaken, state: { ...state, source, network }, setState, draft, problemOf };
}

type Form = ReturnType<typeof useMethodForm>;

/** The fields: your demo wallet or another address, the network, a name. */
export function MethodFields({ form, problem, onEdit, addressRef }: { form: Form; problem: string | null; onEdit: () => void; addressRef: React.RefObject<HTMLInputElement | null> }) {
  const { wallet, mineTaken, state, setState } = form;
  const name = React.useId();
  const ids = { address: React.useId(), addressMsg: React.useId(), label: React.useId() };
  const set = (patch: Partial<MethodFormState>) => {
    setState((s) => ({ ...s, ...patch }));
    onEdit();
  };
  const paste = state.source === "paste";
  return (
    <div className="flex flex-col gap-[16px]">
      <fieldset className="m-0 flex flex-col gap-[8px] border-0 p-0">
        <legend className={cn(FIELD_LABEL, "mb-[6px] p-0")}>Wallet</legend>
        {!mineTaken && (
          <label className={cn(ROW, !paste ? "border-border-brand bg-bg-brand-subtle" : "border-border")}>
            <input type="radio" name={name} checked={!paste} onChange={() => set({ source: "mine" })} className="sr-only" />
            <Radio checked={!paste} decorative className="mt-[2px]" />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="text-md font-medium leading-md text-text-primary">Your demo wallet</span>
              <span className="text-sm leading-sm text-text-secondary">
                {wallet.label} · <FullAddress address={wallet.address} />
              </span>
            </span>
          </label>
        )}
        <label className={cn(ROW, paste ? "border-border-brand bg-bg-brand-subtle" : "border-border")}>
          <input type="radio" name={name} checked={paste} onChange={() => set({ source: "paste" })} className="sr-only" />
          <Radio checked={paste} decorative className="mt-[2px]" />
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-md font-medium leading-md text-text-primary">Another wallet address</span>
            <span className="text-sm leading-sm text-text-secondary">Any wallet you own, a receive-only one too.</span>
          </span>
        </label>
      </fieldset>

      {paste && (
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={ids.address} className={FIELD_LABEL}>
            Wallet address
          </label>
          <TextInput
            ref={addressRef}
            id={ids.address}
            size="lg"
            value={state.address}
            onValueChange={(v) => set({ address: v })}
            autoComplete="off"
            spellCheck={false}
            placeholder="0x…"
            className="font-mono"
            invalid={!!problem}
            aria-invalid={!!problem || undefined}
            aria-describedby={ids.addressMsg}
          />
          <p id={ids.addressMsg} className={problem ? FIELD_ERROR : FIELD_HELP}>
            {problem ?? "Check it carefully: a payment sent to a wrong address can't be taken back."}
          </p>
        </div>
      )}
      {!paste && problem && (
        <p role="alert" className={FIELD_ERROR}>
          {problem}
        </p>
      )}

      <SelectMenu
        label="Network"
        placeholder="Choose a network"
        value={state.network}
        onChange={(v) => set({ network: v })}
        options={NETWORKS.map((n) => ({ value: n.value, label: n.label }))}
        hint="Withdrawals to this address are sent on this network. Money sent on the wrong network can be lost."
      />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor={ids.label} className={FIELD_LABEL}>
          Name it (optional)
        </label>
        <TextInput
          id={ids.label}
          size="lg"
          value={state.label}
          maxLength={METHOD_LABEL_MAX}
          onValueChange={(v) => set({ label: v })}
          autoComplete="off"
          placeholder={paste ? "Crypto wallet" : wallet.label}
        />
      </div>
    </div>
  );
}

/** The demo wallet's signing request for adding a method or making one the default. */
export function methodRequest(kind: "add" | "default", m: MethodDraft, becomesDefault: boolean): WalletRequest {
  return {
    kind: "signature",
    purpose: "payoutMethod",
    identity: "maker",
    network: m.network,
    title: kind === "add" ? "Add a withdrawal method" : "Make this your default withdrawal method",
    summary: [
      { label: "Name", value: m.label.trim() || "Crypto wallet" },
      { label: "Address", value: m.address },
      { label: "Network", value: networkName(m.network) },
      { label: "Default", value: becomesDefault ? "Yes, withdrawals go here first" : "No" },
    ],
    note: "Testnet demo. Signing confirms where your withdrawals go; nothing is charged and no coins move. The bell tells you about the change.",
    doneLine: kind === "add" ? "Withdrawal method added." : "Default withdrawal method changed.",
  };
}

/** "Add a withdrawal method", from the methods card: the fields, then the signature. */
export function MethodDialog({ open, ...props }: { open: boolean; store: PayoutStore; onClose: () => void; onDone: (message: string) => void }) {
  return open ? <MethodDialogBody {...props} /> : null;
}

function MethodDialogBody({ store, onClose, onDone }: { store: PayoutStore; onClose: () => void; onDone: (message: string) => void }) {
  const { request } = useWalletRequest();
  const form = useMethodForm(store);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const addressRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFailure(null);
    const p = form.problemOf(store);
    if (p) {
      setProblem(p);
      if (form.state.source === "paste") addressRef.current?.focus();
      return;
    }
    const draft = form.draft;
    const becomesDefault = store.methods.length === 0;
    const id = randomId("wm_");
    setBusy(true);
    const result = await request(methodRequest("add", draft, becomesDefault), {
      commit: (proof) => {
        let refusal: string | null = null;
        const ok = updatePayout((s) => {
          const r = addMethod(s, draft, proof.at, id, proof.signature);
          if (!r.ok) {
            refusal = PROBLEM[r.problem];
            return s;
          }
          return r.store;
        });
        if (refusal) return { ok: false, message: refusal, conflict: true };
        return ok ? { ok: true } : { ok: false, message: SAVE_FAILED };
      },
    });
    setBusy(false);
    if (result.ok) {
      onDone(`${draft.label.trim() || "Crypto wallet"} added as a withdrawal method.`);
      onClose();
    } else if (result.reason !== "rejected") {
      setFailure(result.message ?? "The wallet didn't confirm it. Nothing was added; try again.");
    }
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={busy}
      size="sm"
      sheet
      title="Add a withdrawal method"
      description="A crypto wallet address and its network. Bank and PayPal payouts aren't in the app yet."
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          {failure && (
            <p role="alert" className={FIELD_ERROR}>
              {failure}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} hierarchy="primary" size="lg" loading={busy} className={TAP}>
              Sign and add
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit}>
        <MethodFields form={form} problem={problem} onEdit={() => setProblem(null)} addressRef={addressRef} />
      </form>
    </ModalFrame>
  );
}

/** Make Default, signed: the wallet shows the method in full; the change is logged for the bell. */
export function useMakeDefault(onDone: (message: string) => void, onFail: (message: string) => void) {
  const { request } = useWalletRequest();
  return React.useCallback(
    async (m: WithdrawalMethod) => {
      const result = await request(methodRequest("default", m, true), {
        commit: (proof) => (updatePayout((s) => makeDefault(s, m.id, proof.at, proof.signature)) ? { ok: true } : { ok: false, message: SAVE_FAILED }),
      });
      if (result.ok) onDone(`${m.label} (${shortAddress(m.address)}) is your default withdrawal method.`);
      else if (result.reason !== "rejected") onFail(result.message ?? "The wallet didn't confirm it. Your default didn't change; try again.");
    },
    [request, onDone, onFail],
  );
}
