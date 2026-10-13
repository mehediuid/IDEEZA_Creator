"use client";

// Acting as (spec §3, demo only): the switch in the list's header and, while
// this tab acts as anyone but You, the line that says so with Back to you.
// The choice is kept for this tab; a `?as=` in the address is dropped on a
// switch, since it would otherwise win over the choice just made.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner, Button, SelectMenu } from "@/components/ideeza";
import { setActingAs } from "@/lib/messages/identity";
import { ME, type PersonId } from "@/lib/messages/types";
import { useMessagesView } from "./messages-context";

function useSwitchActing(): (id: PersonId) => void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return React.useCallback(
    (id: PersonId) => {
      setActingAs(id);
      if (!params.has("as")) return;
      const q = new URLSearchParams(params.toString());
      q.delete("as");
      const rest = q.toString();
      router.replace(rest ? `${pathname}?${rest}` : pathname);
    },
    [router, pathname, params],
  );
}

export function ActingAsSelect() {
  const { ready, me, choices } = useMessagesView();
  const switchTo = useSwitchActing();
  const options = React.useMemo(() => choices.map((c) => ({ value: c.id, label: c.label, section: c.group })), [choices]);
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="shrink-0 text-md font-medium leading-md text-text-secondary">
        Acting as
      </span>
      <SelectMenu
        ariaLabel="Acting as"
        value={me}
        options={options}
        placeholder="You"
        disabled={!ready}
        onChange={switchTo}
        className="min-w-0 flex-1"
      />
    </div>
  );
}

export function ActingBanner() {
  const { ready, me, meAs, choices } = useMessagesView();
  const switchTo = useSwitchActing();
  if (!ready || me === ME) return null;
  const who = choices.find((c) => c.id === me)?.who ?? meAs.name;
  return (
    <Banner
      tone="info"
      action={
        <Button type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={() => switchTo(ME)}>
          Back to you
        </Button>
      }
    >
      You&apos;re acting as {who}. What you send now is from {meAs.name}.
    </Banner>
  );
}
