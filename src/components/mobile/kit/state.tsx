"use client";

// The one empty / error / not-found look of /m (Shared kit KIT-EM-01…03 10615:3111,
// KIT-ER-01…04 10615:3808; M48 / M49 10615:3166): the DS StateCard at the
// content's full width with the phone title (Heading/H3 24/32), a 32 px icon in
// its 80 px disc, one Body/SM line and at most one action, always an XL button
// (the kit binds Label/XL). On the phone it is a clean state, not a card
// (mobile UX lens 12): no edge and no surface of its own, centred on whatever
// it sits on with 20 px of air above and below, so a list, a sheet or a whole
// page reads "nothing here" rather than "a box in the middle of the page".
// Use these, not StateCard or a hand-made note:
//
//   <EmptyState icon={Folder01Icon} title="No projects yet" body="…" action={{ label: "Start a project", href: "/m/ai" }} />
//   <ErrorState title="Couldn’t load Messages" body="…" action={{ label: "Try again", onClick: retry }} />
//   <NotFoundState thing="project" />      — a whole page: h1 "This project isn’t here", Go to Feed
//
// An empty state's action is Secondary (the page's own primary stays the one
// primary); a not-found page's way out is Primary, as ER-04 draws it.

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { cn } from "@/lib/utils";

/** The phone's clean state: StateCard's words and disc, without its web card's edge and surface. */
const CLEAN = "w-full border-transparent bg-transparent px-0 py-12";

export type StateAction = { label: string; href: string; onClick?: never } | { label: string; onClick: () => void; href?: never };

function ActionButton({ action, primary }: { action: StateAction; primary?: boolean }) {
  const hierarchy = primary ? "primary" : "secondary";
  if (action.href)
    return (
      <Link href={action.href} className={cn(buttonVariants({ hierarchy, size: "xl" }), "border-solid")}>
        {action.label}
      </Link>
    );
  return (
    <Button hierarchy={hierarchy} size="xl" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

type StateProps = {
  icon?: IconValue;
  title: string;
  body?: string;
  action?: StateAction;
  className?: string;
};

/** M48: nothing here yet, and what to do about it. */
export function EmptyState({ icon = Search01Icon, title, body, action, className }: StateProps) {
  return (
    <StateCard
      phone
      tone="empty"
      className={cn(CLEAN, className)}
      icon={<Icon icon={icon} size={32} />}
      title={title}
      body={body}
      action={action && <ActionButton action={action} />}
    />
  );
}

/** M49: something failed; the action is the way to try again. */
export function ErrorState({ icon = AlertCircleIcon, title, body, action, className }: StateProps) {
  return (
    <StateCard
      phone
      tone="error"
      className={cn(CLEAN, className)}
      icon={<Icon icon={icon} size={32} />}
      title={title}
      body={body}
      action={action && <ActionButton action={action} />}
    />
  );
}

/** KIT-ER-04: the whole page is a thing that isn't there (deleted, a wrong link).
 *  The title is the page's h1 and takes focus on arrival. */
export function NotFoundState({
  thing,
  body = "It may have been deleted or made private.",
  action = { label: "Go to Feed", href: "/m" },
  className,
}: {
  /** "project", "product", "creator", "tutorial"… — "This project isn’t here". */
  thing: string;
  body?: string;
  action?: StateAction;
  className?: string;
}) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => ref.current?.focus(), []);
  return (
    <StateCard
      phone
      tone="error"
      titleAs="h1"
      titleRef={ref}
      className={cn(CLEAN, className)}
      icon={<Icon icon={AlertCircleIcon} size={32} />}
      title={`This ${thing} isn’t here`}
      body={body}
      action={<ActionButton action={action} primary />}
    />
  );
}
