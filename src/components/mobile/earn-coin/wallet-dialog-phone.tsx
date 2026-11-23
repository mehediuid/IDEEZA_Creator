"use client";

// The web wallet dialog's phone form (MON-9). A few requests reach the web's
// root WalletProvider even on /m — Auto top-up buys a pack when a build pauses
// for credits (components/credits/buy-credits.tsx, mounted at the app's
// root) — and its dialog is a centred desktop card. On the phone every popup
// rises from the bottom, so components/wallet/wallet-dialog.tsx hands its
// props here inside the phone app: the request walks the same phases the web
// provider drives, drawn as the phone's own wallet sheet (RequestSheet in
// wallet-sheet.tsx, KIT-WS-01…05) with the provider's own presses. The web
// keeps its dialog, at every width.
//   · confirmed: the provider waits for Done; here the sheet says what
//     happened (the request's done line: "200 credits added. Desk Lamp starts
//     now.") and ✕, a swipe or the scrim is Done — no button that only closes.
//   · pending can't be left: a tap on the scrim says so again, as the phone's
//     sheet does.
//   · a wallet that can't be read: Reset the demo wallet, as the web offers.
//   · manage: the phone's Demo wallet sheet.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { useSecondClock } from "@/components/balance/use-second-clock";
import type { WalletDialogProps } from "@/components/wallet/wallet-dialog";
import { requestCopy } from "@/lib/wallet/request";
import { shortfallOf } from "@/lib/wallet/request-view";
import { useWalletUnreadable } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { FramedProvider, useDeviceMode } from "../device";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { CopyChip, DemoWalletSheet } from "./parts";
import { RequestSheet } from "./wallet-sheet";

/** The web dialog's words for a wallet record that can't be read (wallet-dialog.tsx). */
const WALLET_UNREADABLE =
  "This browser’s demo wallet can’t be read, so nothing can be saved to it. Reset it to start over with fresh test funds; nothing on the marketplace changes.";

export function PhoneWalletDialog(props: WalletDialogProps) {
  // Mounted at the root, outside the phone app's own providers: inside the desktop's phone frame the
  // sheet still stops under the drawn status bar and draws the home indicator (device.tsx).
  const framed = useDeviceMode() === "framed";
  return (
    <FramedProvider value={framed}>
      <PhoneWalletBody {...props} />
    </FramedProvider>
  );
}

function PhoneWalletBody({ mode, wallet, market, onClose, request: view, actions }: WalletDialogProps) {
  const now = useSecondClock();
  const unreadable = useWalletUnreadable();
  const [nudge, setNudge] = React.useState(0);

  if (mode === "manage" || !view) return <DemoWalletSheet open onClose={onClose} />;
  const { req, phase, identity } = view;

  if (phase === "confirmed") {
    return (
      <Sheet open onClose={actions.done} title={requestCopy("confirmed", req, wallet).title} description={req.doneLine}>
        {view.warning && <Banner tone="attention">{view.warning}</Banner>}
        {view.proof?.txHash && (
          <p className={cn(T.body, "flex flex-wrap items-center gap-3")}>
            Transaction
            <CopyChip value={view.proof.txHash} what="Transaction hash" />
          </p>
        )}
      </Sheet>
    );
  }

  // The wallet's own write was refused because its record can't be read: a retry can't help, a reset can.
  if (phase === "failed" && view.reason === "storageFailed" && !view.message && unreadable) {
    return (
      <Sheet
        open
        onClose={actions.cancel}
        title="That didn’t go through"
        description={<span role="alert">{`${WALLET_UNREADABLE} Nothing was charged.`}</span>}
        actions={
          <Button size="xl" className="w-full" onClick={actions.reset}>
            Reset the demo wallet
          </Button>
        }
      />
    );
  }

  const ctx = { wallet, market, now };
  const short = (phase === "review" || phase === "signing") && wallet ? (shortfallOf(req, identity, ctx)?.text ?? null) : null;
  // ✕, the scrim, a swipe and Reject: the provider's dismiss (review and signing reject; rejected and
  // failed close). A submitted transaction can't be left, so they say so again.
  const close = phase === "pending" ? () => setNudge((n) => n + 1) : actions.cancel;
  return (
    <RequestSheet
      view={{ phase, req, identity, reason: view.reason, message: view.message, hash: view.hash }}
      wallet={wallet}
      ctx={ctx}
      short={short}
      nudge={nudge}
      onClose={close}
      actions={{ connect: actions.connect, switchNetwork: actions.switchNetwork, approve: actions.approve, retry: actions.retry, close: actions.cancel }}
    />
  );
}
