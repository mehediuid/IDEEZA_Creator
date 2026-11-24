"use client";

// Your account is active again (owner, 2026-11-24): the one note after a sign-in
// made a deactivated account, or one waiting to be deleted, active again (the
// sign-in itself does it, lib/account/auth.ts comeBack). It says when the
// account was left, that nothing is lost, and — when its paid plan stopped
// renewing on the way out — that it ends unless kept in Plan & pricing.
// It shows once, to the sign-in that set it (owesRestore), on whichever
// surface comes first — this website or the phone app — and is cleared as it
// opens. Never on the phone's pages (/m has its own screen) or open pages.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame } from "@/components/ideeza";
import { SESSION_KEY, isMobilePath, isOpenPath, useAuth } from "@/lib/account/auth";
import { welcomeBackOf } from "@/lib/account/closing";
import { owesRestore, reopenedSeen, updateSecurity, useSecurity, type Reopened } from "@/lib/account/security";
import { parseStored, useStoredKey } from "@/lib/key-store";
import { useDates } from "@/lib/settings/use-dates";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
const LINK =
  "w-fit rounded-xs text-md font-medium leading-md text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function WelcomeBack() {
  const pathname = usePathname();
  const dates = useDates();
  const { hydrated, signedIn, account } = useAuth();
  const email = account?.email ?? "";
  const { hydrated: securityRead, security } = useSecurity(email);
  const session = useStoredKey(SESSION_KEY);
  const sessionAt = (parseStored(session.raw).value as { at?: number } | null)?.at ?? 0;
  // The note being shown: kept here, since the record is cleared the moment it opens.
  const [note, setNote] = React.useState<Reopened | null>(null);

  const owed = hydrated && securityRead && session.hydrated && signedIn && !!email && !isOpenPath(pathname) && !isMobilePath(pathname) && owesRestore(security, sessionAt);
  React.useEffect(() => {
    if (!owed || !security.reopened) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the record is cleared as the note opens, so it is copied once
    setNote(security.reopened);
    updateSecurity(email, reopenedSeen);
  }, [owed, security.reopened, email]);

  if (!note) return null;
  const day = (at: number) => dates.date(at, { style: "medium" });
  const words = welcomeBackOf(note.from, "Sign in", day(note.since), note.plan ? { name: note.plan.name, ends: day(note.plan.endsAt) } : null);
  const close = () => setNote(null);
  return (
    <ModalFrame
      open
      onClose={close}
      size="sm"
      sheet
      title={words.title}
      icon={
        <span
          aria-hidden
          className="inline-flex size-[var(--touch-min)] items-center justify-center rounded-full bg-[var(--color-bg-success-subtle)] text-[color:var(--color-icon-success)]"
        >
          <Icon icon={CheckmarkCircle02Icon} size={24} />
        </span>
      }
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={close}>
            Continue
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[12px]">
        <p className="m-0 text-md leading-md text-text-primary">{words.body}</p>
        {words.plan && (
          <>
            <p className="m-0 text-md leading-md text-text-secondary">{words.plan}</p>
            <Link href="/settings/plan" className={LINK} onClick={close}>
              Plan &amp; pricing
            </Link>
          </>
        )}
      </div>
    </ModalFrame>
  );
}
