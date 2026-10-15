"use client";

// QuotaCard — the plan strip above the History tables: which plan you're on,
// the AI credits it adds each month and when the plan renews, with a link to
// the plans. It used to count "prompts left today" against a daily limit that
// never stopped a generation; credits are the one meter now.

import * as React from "react";
import Link from "next/link";
import { PLAN_PRICING_HREF } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function QuotaCard() {
  const { hydrated, sub, plan } = useCreatePlan();

  if (!hydrated) return <Shell aria-hidden />;

  const when =
    sub.renewsAt === null
      ? "Free forever"
      : sub.pending
        ? `Changes on ${date(sub.renewsAt)}`
        : `Renews on ${date(sub.renewsAt)}`;

  return (
    <Shell>
      <div className="min-w-0 flex-1">
        <p className="text-md font-semibold leading-md text-text-primary">{plan.name} plan</p>
        <p className="mt-[4px] text-sm leading-sm text-text-secondary">
          {plan.credits.toLocaleString("en-US")} AI credits each month · {when}
        </p>
      </div>
      <Link
        href={PLAN_PRICING_HREF}
        className="shrink-0 text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        See plans
      </Link>
    </Shell>
  );
}

function Shell({ children, "aria-hidden": ariaHidden }: { children?: React.ReactNode; "aria-hidden"?: boolean }) {
  return (
    <section
      aria-label="Your plan"
      aria-hidden={ariaHidden}
      className="flex items-center gap-[24px] rounded-2xl border border-border bg-bg-surface px-[20px] py-[16px]"
    >
      {children}
    </section>
  );
}
