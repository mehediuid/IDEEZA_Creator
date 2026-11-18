"use client";

// Home is open to guests (Explore first); appreciating, commenting, following,
// saving, sharing, buying and opening what needs an account ask them in with
// the Shared kit's guest gate (AU-03), and signing in comes back to `next`
// (this screen when left out).

import * as React from "react";
import { useAuth } from "@/lib/account/auth";
import { GuestGate } from "../account/guest-gate";

/** Runs `run` for someone signed in; asks a guest in with `title` first. */
export type Guard = (title: string, run: () => void, next?: string) => void;

export function useGuestGuard(): { signedIn: boolean; guard: Guard; gate: React.ReactNode } {
  const { signedIn } = useAuth();
  const [ask, setAsk] = React.useState<{ title: string; next?: string } | null>(null);
  const guard = React.useCallback<Guard>(
    (title, run, next) => {
      if (signedIn) run();
      else setAsk({ title, next });
    },
    [signedIn],
  );
  const gate = <GuestGate open={!!ask} onClose={() => setAsk(null)} title={ask?.title ?? ""} next={ask?.next} />;
  return { signedIn, guard, gate };
}
