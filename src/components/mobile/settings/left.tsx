"use client";

// /m/left — right after Deactivate account or Delete account (the account is
// already signed out): what happens now, and how to come back. The phone's
// scheduled-deletion screen (AU-64), now for both. `?left=deactivated` or
// `?left=deleting&until=<ms>` (no personal details in the address). Done goes
// to Welcome, where Log In makes the account active again.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { leftHeadingOf, leftTimelineOf, type LeaveKind } from "@/lib/account/closing";
import { formatDate } from "@/lib/settings/dates";
import { ACCOUNT_CONTENT, AccountHeading } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { Screen } from "../screen";
import { SettingsGroup, SettingsRow } from "./kit";

function leftOf(left: string | null, until: string | null): { kind: LeaveKind; until: number } | null {
  if (left === "deactivated") return { kind: "deactivated", until: 0 };
  const at = Number(until);
  return left === "deleting" && Number.isFinite(at) && at > 0 ? { kind: "deleting", until: at } : null;
}

export function LeftScreen() {
  const params = useSearchParams();
  const [left] = React.useState(() => leftOf(params.get("left"), params.get("until")));
  React.useEffect(() => {
    if (!left) window.location.replace("/m/welcome");
  }, [left]);
  if (!left) return null;
  const day = left.until ? formatDate(left.until, "auto", { style: "medium" }) : "";
  const heading = leftHeadingOf(left.kind, "Log In", day);
  return (
    <Screen
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" onClick={() => window.location.replace("/m/welcome")}>
            Done
          </Button>
        </BottomBar>
      }
    >
      <div className={`${ACCOUNT_CONTENT} pt-12`}>
        <AccountHeading title={heading.title}>{heading.line}</AccountHeading>
        <SettingsGroup>
          {leftTimelineOf(left.kind, "Log In", day).map(([term, value]) => (
            <SettingsRow key={term} label={term} helper={value} />
          ))}
        </SettingsGroup>
      </div>
    </Screen>
  );
}
