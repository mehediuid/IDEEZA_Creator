"use client";

// The way back to "Your blogs" as the writer left it (F62), for a link drawn during render: the
// crumb, "Back to your blogs", the not-found page. The server has no sessionStorage, so it draws
// the bare /blog and the browser swaps in the remembered view after hydration (no mismatch). A
// redirect from code (after a send or a delete) calls listHref() directly instead.

import * as React from "react";
import { listHref } from "@/lib/blog/list";

const subscribe = () => () => {};
const bare = () => "/blog";

export function useListHref(): string {
  return React.useSyncExternalStore(subscribe, listHref, bare);
}
