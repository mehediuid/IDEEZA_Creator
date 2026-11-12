"use client";

// The phone's tour (AU-18 "after setup; tour first"; the web's Welcome runs
// its tour from Look around first too): the app's five tabs, one by one — the
// tab opens behind an M09 sheet that says what it is for, with Next and Skip
// tour. It starts on the first tab screen after Look around first (this
// phone remembers it is owed, so a reload keeps it), and ends where the
// person was going. While it plays, the welcome offer waits, as on the web.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { updatePhone } from "@/lib/account/phone";
import { CONCEPT_COST } from "@/lib/create/credits";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

const STOPS: readonly { href: string; title: string; body: string }[] = [
  {
    href: "/m",
    title: "Home",
    body: "Projects and products other creators made and are selling, as short clips. Open one to see what you’d get.",
  },
  {
    href: "/m/earn",
    title: "Earn Coin",
    body: "Buy $IDZ, stake it, and earn coins when you bring a friend. Testnet demo: no real money moves.",
  },
  {
    href: "/m/ai",
    title: "AI",
    body: `Describe what you want to make in plain words, like “a desk lamp that turns on when I clap”. A concept uses ${CONCEPT_COST} credit.`,
  },
  {
    href: "/m/messages",
    title: "Message",
    body: "Your conversations. A new one starts from Message on a creator’s profile, project or listing.",
  },
  {
    href: "/m/profile",
    title: "Profile",
    body: "Your projects, wallet, plan and settings. Every project you save lands here and saves itself as you work.",
  },
];

export function PhoneTour() {
  const router = useRouter();
  const pathname = usePathname();
  // Where they were going when the tour began: it ends there.
  const [start] = React.useState(() => pathname + window.location.search);
  const [at, setAt] = React.useState(0);
  const stop = STOPS[at];
  const last = at === STOPS.length - 1;

  // The stop's tab opens behind the sheet.
  React.useEffect(() => {
    if (pathname !== stop.href) router.replace(stop.href);
  }, [pathname, stop.href, router]);

  const end = () => {
    updatePhone({ tourPending: false });
    if (pathname + window.location.search !== start) router.replace(start);
  };

  return (
    <Sheet
      open
      onClose={end}
      title={stop.title}
      description={`${at + 1} of ${STOPS.length}`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={last ? end : () => setAt(at + 1)}>
            {last ? "Done" : "Next"}
          </Button>
          {!last && (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={end}>
              Skip tour
            </Button>
          )}
        </>
      }
    >
      <p className={T.body}>{stop.body}</p>
    </Sheet>
  );
}
