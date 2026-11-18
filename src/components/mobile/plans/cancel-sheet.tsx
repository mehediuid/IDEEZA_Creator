"use client";

// Back to Free? (mobile Figma "Billing History › Popup Container",
// the web's CancelDialog): you keep the plan until the period ends, then
// Free; what you lose; that nothing you made is removed. Keep my plan, or
// Cancel subscription; from a bigger plan the web's smaller-plan way out too.

import * as React from "react";
import { Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { usePlanUsage } from "@/components/credits/plans-panel";
import { useCreatePlan } from "@/lib/create/plan";
import { lossesOf, planOf, type PlanTier } from "@/lib/create/plans";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { BulletList, SheetMark, dateOf, n } from "./parts";

const SMALLEST_PAID: PlanTier = "tinkerer";

export function CancelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sub, plan: current, cancel, schedule } = useCreatePlan();
  const usage = usePlanUsage();
  const toast = useToast();
  const when = sub.renewsAt ? dateOf(sub.renewsAt) : "";
  const free = planOf("free");
  const smaller = planOf(SMALLEST_PAID);
  const offerSmaller = current.monthly > smaller.monthly;
  const losses = lossesOf(current, free);
  if (sub.renewsAt === null) return null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Back to Free?"
      description={`You keep ${current.name} until ${when}, then move to Free.`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onClose}>
            Keep my plan
          </Button>
          <Button
            hierarchy="danger"
            size="xl"
            className="w-full"
            onClick={() => {
              cancel();
              onClose();
              toast({ title: `${current.name} ends on ${when}` });
            }}
          >
            Cancel subscription
          </Button>
        </>
      }
    >
      <SheetMark icon={Alert02Icon} tone="error" />
      {losses.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className={T.rowTitle}>After that, you’ll lose:</p>
          <BulletList items={losses} icon={Cancel01Icon} tone="error" />
        </div>
      )}
      <p className={T.body}>
        You have {n(usage.projects)} {usage.projects === 1 ? "project" : "projects"}; Free allows {n(free.projects)}. Nothing is removed: credits you bought stay until they expire, and every project and contributor stays as it is.
      </p>
      {offerSmaller && (
        <Button
          hierarchy="tonal"
          size="xl"
          className="w-full"
          onClick={() => {
            schedule(SMALLEST_PAID, "monthly");
            onClose();
            toast({ title: `Switches to ${smaller.name} on ${when}` });
          }}
        >
          Downgrade to {smaller.name} instead
        </Button>
      )}
    </Sheet>
  );
}
