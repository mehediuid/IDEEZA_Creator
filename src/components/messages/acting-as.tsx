"use client";

// Acting as (spec §3, demo only): there is no switch on the page any more
// (owner, 2026-10-13). A `?as=` link still sets it — Explore marketplace's Ask
// the creator writes as the demo creator you're shopping as — and while this
// tab acts as anyone but You, this line says so with Back to you, which also
// drops the `?as=` so it can't win over the choice just made.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner, Button } from "@/components/ideeza";
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
