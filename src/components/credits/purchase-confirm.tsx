"use client";

// "Ask before a purchase over $X" (Settings › Plan & billing › Credit alerts
// and limits): the one extra confirm checkout and Buy credits show before the
// wallet opens, when what is about to be paid is above the amount you set.

import * as React from "react";
import { ConfirmDialog } from "@/components/ideeza";
import { usd } from "@/lib/create/credit-pricing";

export function PurchaseConfirm({
  open,
  amount,
  limit,
  what,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** What is about to be paid, in US dollars. */
  amount: number;
  /** The amount you asked to confirm above. */
  limit: number;
  /** "The Pro pack", "Builder, billed yearly". */
  what: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      tone="primary"
      title="Confirm this purchase"
      confirmLabel={`Pay ${usd(amount)}`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="text-md leading-md text-text-primary">
        {what} costs {usd(amount)}, more than the {usd(limit)} you asked to confirm.
      </p>
      <p className="mt-[8px]">You can change that amount in Credit alerts and limits on the Credits tab.</p>
    </ConfirmDialog>
  );
}
