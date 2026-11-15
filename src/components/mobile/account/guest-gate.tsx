"use client";

// AU-03 · Guest gate: a sheet at the action a guest tried (appreciate, buy,
// start a project) with the same ways in as Welcome; after signing in the
// action finishes where they were (P2-AU-5), so every way in carries this
// screen as `next`. Not now closes it.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet } from "../kit/sheet";
import { WaysIn, useProviderSheet } from "./ways-in";

export function GuestGate({
  open,
  onClose,
  title,
  description = "You’ll come right back here.",
  next,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Where signing in lands (this screen when left out). */
  next?: string;
}) {
  const router = useRouter();
  const here = usePathname();
  const back = next ?? here;
  const { start, sheet } = useProviderSheet({ from: here, next: back });
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        description={description}
      >
        <WaysIn
          onProvider={(p) => {
            onClose();
            start(p);
          }}
          onEmail={() => {
            onClose();
            router.push(`/m/sign-in?next=${encodeURIComponent(back)}`);
          }}
        />
      </Sheet>
      {sheet}
    </>
  );
}
