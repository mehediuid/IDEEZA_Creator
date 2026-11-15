"use client";

// The web's notices (components/notifications/use-notices.ts, the bell's one
// list) as the phone lists them, with the phone's own account and security
// notices (a new sign-in, a changed password, 2-step on; lib/notifications/
// phone.ts), newest first: without what this phone cleared, and the count its
// bell carries (unread, heard, never messages — the web's rule).

import * as React from "react";
import { useNotices } from "@/components/notifications/use-notices";
import { useAuth } from "@/lib/account/auth";
import { useSecurity } from "@/lib/account/security";
import { countsOnBell } from "@/lib/notifications/filter";
import { isCleared, securityNotices } from "@/lib/notifications/phone";
import type { Notice } from "@/lib/notifications/types";
import { useClearedNotices } from "./use-feed";

export function usePhoneNotices() {
  const feed = useNotices();
  const { account } = useAuth();
  const { hydrated: securityRead, security } = useSecurity(account?.email ?? null);
  const { hydrated, cleared, update } = useClearedNotices();
  return React.useMemo(() => {
    const own = securityNotices({
      passwordChangedAt: security.passwordChangedAt,
      twoStepSince: security.twoStep?.since ?? null,
      devices: security.devices,
    });
    const list = [...feed.list, ...own].filter((n) => !isCleared(n, cleared)).sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
    const unread = list.filter((n) => !feed.isRead(n));
    return {
      hydrated: feed.hydrated && hydrated && securityRead,
      feed,
      list,
      unread,
      badge: unread.filter((n: Notice) => countsOnBell(n, feed.settings)).length,
      updateCleared: update,
      email: account?.email ?? null,
    };
  }, [feed, hydrated, cleared, update, security, securityRead, account?.email]);
}
