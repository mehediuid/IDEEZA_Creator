// A Phase 1 settings route that Settings v2 folded into another page: send
// the visitor to where its rows live now, keeping any query (the Earn ladder's
// `?from=`, a list's `?list=`) so the new page can still use it.

import { redirect } from "next/navigation";
import { movedHref, type SettingsPageId } from "./registry";

type Search = Record<string, string | string[] | undefined>;

export function redirectLegacy(id: SettingsPageId, search: Search = {}): never {
  const to = movedHref(id);
  if (!to) throw new Error(`${id} is not a moved settings page`);
  const [path, hash] = to.split("#");
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  }
  const qs = q.toString();
  redirect(`${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`);
}
