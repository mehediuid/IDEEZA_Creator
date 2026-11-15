"use client";

// Prototype only: IDEEZA's admin pauses or blocks a staking contract; nothing
// in the demo does that by itself, so this Demo sheet stands in for the admin
// and the Figma's paused (228566) and blocked (228625) states can be seen.
// Saved with the staking store (`lib/wallet/staking.ts` › demo admin).

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Segmented } from "@/components/ideeza/segmented";
import { STAKE_CONTRACTS, contractStatusOf, withContractStatus, type ContractStatus } from "@/lib/wallet/staking";
import { readStakeAdmin, useStakeAdmin, writeStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";

const STATES: { value: ContractStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "blocked", label: "Blocked" },
];

export function StakeAdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const admin = useStakeAdmin();
  const toast = useToast();
  const set = (id: string, name: string, s: ContractStatus) => {
    if (writeStakeAdmin(withContractStatus(readStakeAdmin(), id, s))) toast({ title: `${name}: ${s}` });
    else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Demo: contract states"
      description="Prototype only. Stands in for IDEEZA’s admin, who can pause or block a staking contract."
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
      <ul className="flex flex-col gap-8">
        {STAKE_CONTRACTS.map((c) => (
          <li key={c.id} className="flex flex-col gap-3">
            <span className={T.bodyStrong}>{c.name}</span>
            <Segmented label={`${c.name} state`} value={contractStatusOf(admin, c.id)} options={STATES} onChange={(v) => set(c.id, c.name, v)} size="md" />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
