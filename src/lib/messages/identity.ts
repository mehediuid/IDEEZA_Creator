// Who this tab acts as in Messages (spec §3, demo only): You by default, or a
// demo buyer, a team member or an Innovations creator. sessionStorage, so two
// tabs can be two people; a `?as=` on any Messages address sets it. Leaves at
// the production cut, with the demo identities.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ACTING_AS_KEY, ME, type PersonId } from "./types";

const EVENT = "ideeza:messages:acting-as";

export function readActingAs(): PersonId {
  if (typeof window === "undefined") return ME;
  try {
    return window.sessionStorage.getItem(ACTING_AS_KEY) || ME;
  } catch {
    return ME;
  }
}

export function setActingAs(id: PersonId): void {
  try {
    if (id === ME) window.sessionStorage.removeItem(ACTING_AS_KEY);
    else window.sessionStorage.setItem(ACTING_AS_KEY, id);
  } catch {
    // Blocked storage: the switch lasts until this page is left.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** The tab's stored acting person, without reading the address (the sidebar's badge). */
export function useStoredActingAs(): PersonId {
  return React.useSyncExternalStore(subscribe, readActingAs, () => ME);
}

/** The tab's acting person on a Messages page. A `?as=` in the address wins at once and is
 *  kept. Reads the search params, so its page renders it under a Suspense boundary. */
export function useActingAs(): PersonId {
  const params = useSearchParams();
  const asParam = params.get("as");
  const stored = useStoredActingAs();
  React.useEffect(() => {
    if (asParam && asParam !== readActingAs()) setActingAs(asParam);
  }, [asParam]);
  return asParam || stored;
}
