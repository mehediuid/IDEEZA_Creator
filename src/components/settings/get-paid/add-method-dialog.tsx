"use client";

// Add Withdrawal Method (User Panel V2 41537:182189): Figma's radio list of
// method kinds, then Continue. Direct Bank, Payoneer and PayPal need accounts
// with those services, which the app doesn't have, so they are listed and
// disabled with "Not available yet"; Crypto wallet is the one that works
// (Settings spec §5.5). Its step offers the connected demo account first,
// then any wallet address you paste (a receive-only, cold wallet is fine),
// and an optional name. The first method added becomes the default. Connect
// closes this dialog and opens the Demo wallet's own, so only one dialog holds
// the keyboard.

import * as React from "react";
import { BankIcon, PaypalIcon, PayoneerIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, ModalFrame, Radio, TextInput } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { addMethod, METHOD_LABEL_MAX, METHODS_MAX, type PayoutStore } from "@/lib/account/payout";
import { updatePayout } from "@/lib/account/use-payout";
import { randomId } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { SAVE_FAILED } from "../settings-card";
import { useMakerWallet } from "./parts";

type Kind = "crypto" | "bank" | "payoneer" | "paypal";

const KINDS: { value: Kind; label: string; hint: string; icon: IconValue; off?: true }[] = [
  { value: "crypto", label: "Crypto wallet", hint: "USDT or IDZ to a wallet address", icon: Wallet02Icon },
  { value: "bank", label: "Direct Bank", hint: "Deposits to your local bank in your currency", icon: BankIcon, off: true },
  { value: "payoneer", label: "Payoneer", hint: "To your Payoneer account", icon: PayoneerIcon, off: true },
  { value: "paypal", label: "PayPal", hint: "To your PayPal account", icon: PaypalIcon, off: true },
];

const ROW =
  "flex min-h-[var(--touch-min)] items-start gap-[12px] rounded-xl border border-solid px-[16px] py-[12px] transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus";
const LABEL = "text-md font-medium leading-md text-text-primary";
const ERROR = "m-0 text-sm leading-sm text-text-error";

const PROBLEM: Record<"address" | "duplicate" | "full", string> = {
  address: "Enter a wallet address: 0x followed by 40 letters and digits (0–9, a–f).",
  duplicate: "This address is already one of your withdrawal methods.",
  full: `You can keep up to ${METHODS_MAX} withdrawal methods. Remove one to add another.`,
};

type Props = { store: PayoutStore; onClose: () => void; onAdded: (label: string) => void };

export function AddMethodDialog({ open, ...props }: Props & { open: boolean }) {
  return open ? <AddMethodBody {...props} /> : null;
}

function AddMethodBody({ store, onClose, onAdded }: Props) {
  const wallet = useMakerWallet();
  const { openManage } = useWalletRequest();
  const [step, setStep] = React.useState<"kind" | "crypto">("kind");
  const [source, setSource] = React.useState<"connected" | "paste">("paste");
  const [address, setAddress] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [problem, setProblem] = React.useState<string | null>(null);
  const [refused, setRefused] = React.useState(false);
  const firstRef = React.useRef<HTMLInputElement>(null);
  const pasteRef = React.useRef<HTMLInputElement>(null);
  const name = React.useId();
  const ids = { address: React.useId(), addressMsg: React.useId(), label: React.useId() };

  const offerConnected = wallet.connected && !store.methods.some((m) => m.address.toLowerCase() === wallet.address.toLowerCase());
  // The connected demo account comes first when there is one to offer.
  const [seenOffer, setSeenOffer] = React.useState(false);
  if (offerConnected && !seenOffer) {
    setSeenOffer(true);
    setSource("connected");
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const useConnected = source === "connected" && offerConnected;
    const input = useConnected ? { address: wallet.address, label: label.trim() || wallet.label } : { address, label };
    const out: { fail?: keyof typeof PROBLEM; added?: string } = {};
    const ok = updatePayout((s) => {
      const r = addMethod(s, input, Date.now(), randomId("wm_"));
      if (!r.ok) {
        out.fail = r.problem;
        return s;
      }
      out.added = r.method.label;
      return r.store;
    });
    if (out.fail) {
      setProblem(PROBLEM[out.fail]);
      if (!useConnected) pasteRef.current?.focus();
      return;
    }
    if (!ok || !out.added) {
      setRefused(true);
      return;
    }
    onAdded(out.added);
    onClose();
  };

  if (step === "kind") {
    return (
      <ModalFrame
        open
        onClose={onClose}
        size="sm"
        title="Add Withdrawal Method"
        description="Choose how you want to receive your IDEEZA balance."
        initialFocus={firstRef}
        footer={
          <div className="ml-auto flex flex-wrap justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" hierarchy="primary" size="lg" onClick={() => setStep("crypto")}>
              Continue
            </Button>
          </div>
        }
      >
        <div role="radiogroup" aria-label="Withdrawal method" className="flex flex-col gap-[8px]">
          {KINDS.map((k) => {
            const on = k.value === "crypto";
            return (
              <label
                key={k.value}
                className={cn(
                  ROW,
                  k.off ? "cursor-not-allowed border-border" : "cursor-pointer",
                  on && "border-border-brand bg-bg-brand-subtle",
                )}
              >
                <input
                  ref={on ? firstRef : undefined}
                  type="radio"
                  name={name}
                  value={k.value}
                  checked={on}
                  disabled={k.off}
                  onChange={() => undefined}
                  className="sr-only"
                />
                <Radio checked={on} decorative disabled={k.off} className="mt-[2px]" />
                <span aria-hidden className={cn("mt-[1px] shrink-0", k.off ? "text-text-disabled" : "text-text-brand")}>
                  <Icon icon={k.icon} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("text-md font-medium leading-md", k.off ? "text-text-disabled" : "text-text-primary")}>{k.label}</span>
                  <span className="text-md leading-md text-text-secondary">{k.hint}</span>
                  {k.off && <span className="text-md leading-md text-text-tertiary">Not available yet</span>}
                </span>
              </label>
            );
          })}
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Add a crypto wallet"
      description="Withdrawals are paid in your Get paid in token to this address."
      initialFocus={firstRef}
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          {refused && (
            <p role="alert" className={ERROR}>
              {SAVE_FAILED}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" onClick={() => setStep("kind")}>
              Back
            </Button>
            <Button type="submit" form={`${name}-form`} hierarchy="primary" size="lg">
              Add Method
            </Button>
          </div>
        </div>
      }
    >
      <form id={`${name}-form`} noValidate onSubmit={submit} className="flex flex-col gap-[20px]">
        <div role="radiogroup" aria-label="Wallet" className="flex flex-col gap-[8px]">
          {offerConnected ? (
            <label className={cn(ROW, "cursor-pointer", source === "connected" ? "border-border-brand bg-bg-brand-subtle" : "border-border")}>
              <input
                ref={source === "connected" ? firstRef : undefined}
                type="radio"
                name={`${name}-source`}
                checked={source === "connected"}
                onChange={() => setSource("connected")}
                className="sr-only"
              />
              <Radio checked={source === "connected"} decorative className="mt-[2px]" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={LABEL}>Your connected demo wallet</span>
                <span className="text-md leading-md text-text-secondary">
                  {wallet.label} · <span className="font-mono">{shortAddress(wallet.address)}</span>
                </span>
              </span>
            </label>
          ) : (
            !wallet.connected && (
              <div className={cn(ROW, "items-center border-border")}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={LABEL}>Your demo wallet</span>
                  <span className="text-md leading-md text-text-secondary">Connect it to add it in one step.</span>
                </span>
                <Button
                  type="button"
                  hierarchy="secondary"
                  size="md"
                  onClick={() => {
                    onClose();
                    openManage();
                  }}
                >
                  Connect
                </Button>
              </div>
            )
          )}
          <label className={cn(ROW, "cursor-pointer", source === "paste" || !offerConnected ? "border-border-brand bg-bg-brand-subtle" : "border-border")}>
            <input
              ref={source === "paste" || !offerConnected ? firstRef : undefined}
              type="radio"
              name={`${name}-source`}
              checked={source === "paste" || !offerConnected}
              onChange={() => setSource("paste")}
              className="sr-only"
            />
            <Radio checked={source === "paste" || !offerConnected} decorative className="mt-[2px]" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={LABEL}>Another wallet address</span>
              <span className="text-md leading-md text-text-secondary">Any wallet you own, a receive-only (cold) wallet too.</span>
            </span>
          </label>
        </div>

        {(source === "paste" || !offerConnected) && (
          <div className="flex flex-col gap-[8px]">
            <label htmlFor={ids.address} className={LABEL}>
              Wallet address
            </label>
            <TextInput
              ref={pasteRef}
              id={ids.address}
              size="xl"
              value={address}
              onValueChange={(v) => {
                setAddress(v);
                setProblem(null);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              className="font-mono"
              invalid={!!problem}
              aria-invalid={!!problem || undefined}
              aria-describedby={ids.addressMsg}
            />
            <p id={ids.addressMsg} className={problem ? ERROR : "m-0 text-sm leading-sm text-text-tertiary"}>
              {problem ?? "Check it carefully: a payment sent to a wrong address can't be taken back."}
            </p>
          </div>
        )}
        {source === "connected" && offerConnected && problem && <p className={ERROR}>{problem}</p>}

        <div className="flex flex-col gap-[8px]">
          <label htmlFor={ids.label} className={LABEL}>
            Name it (optional)
          </label>
          <TextInput
            id={ids.label}
            size="xl"
            value={label}
            maxLength={METHOD_LABEL_MAX}
            onValueChange={setLabel}
            autoComplete="off"
            placeholder={source === "connected" && offerConnected ? wallet.label : "Crypto wallet"}
          />
        </div>
      </form>
    </ModalFrame>
  );
}
