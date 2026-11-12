"use client";

// AU-50 · Sign out: a neutral sheet (the brand button, not red) from the foot
// of the Settings root, or from a device's sheet for this phone. AU-50b, the
// "changes not synced" variant: this app keeps everything on the phone, so
// nothing is lost by signing out — except that Sign in needs a connection,
// so offline the sheet says so and asks again ("Sign out anyway"). AU-50c:
// after it, Welcome with "Signed out" (this phone forgets Explore first).

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { signOut } from "@/lib/account/auth";
import { updatePhone } from "@/lib/account/phone";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { toastAfterReload } from "../kit/toast";

/** Parks the account's work, signs out, and starts again on Welcome with `toast`. */
export async function signOutToWelcome(toast = "Signed out"): Promise<void> {
  await signOut();
  updatePhone({ explored: false });
  toastAfterReload(toast);
  window.location.replace("/m/welcome");
}

export function SignOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const online = useOnline();
  const [busy, setBusy] = React.useState(false);
  const go = async () => {
    setBusy(true);
    await signOutToWelcome();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sign out of IDEEZA?"
      actions={
        <>
          <Button size="xl" className="w-full" loading={busy} onClick={go}>
            {online ? "Sign out" : "Sign out anyway"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            {online ? "Cancel" : "Stay signed in"}
          </Button>
        </>
      }
    >
      <p className={T.body}>
        {online
          ? "Your projects stay in your account. Builds keep running."
          : "You’re offline. Signing in again needs a connection, so you can’t get back in until you’re online."}
      </p>
    </Sheet>
  );
}
