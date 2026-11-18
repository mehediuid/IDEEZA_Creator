"use client";

// Figma "Mobile / Top bar" (Shared kit 10600:21, Project Details 10325:20):
// 56 tall, 16 to each side, Back on the left (A02 Icon Button, Secondary, 44,
// arrow-left-02), the title centred (Heading/H6, text/primary) and a right
// slot of 44 px buttons 8 apart (A02 Secondary — ⋯, settings, search). With no
// Back the left slot stays empty, so the title keeps the centre.
//
// Back never pushes: it goes to the previous screen when the app has one in
// this tab's history (nav-trail.ts), else it replaces this screen with its
// parent (`back="/m/projects"`, or Home for `back`). So a deep link's Back
// stays in the app, and two screens can't send each other round in a loop.
//
// Its buttons show the DS Secondary hover / pressed fills (the A02 Secondary
// icon button draws none), so a tap answers under the finger (lens 16).

import * as React from "react";
import { ArrowLeft02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza/icon-button";
import { cn } from "@/lib/utils";
import { PRESSED_SECONDARY } from "./kit/press";
import { useGoBack } from "./nav-trail";
import { T } from "./type";

export type TopBarAction = { icon: IconValue; label: string; onClick: () => void };

export function TopBar({
  title,
  back,
  onBack,
  titleAs: TitleTag = "h1",
  actions = [],
  className,
}: {
  title?: React.ReactNode;
  /** Draws Back: the previous screen; when there is none in the app, this parent path (`true`: Home). */
  back?: string | true;
  /** Called in place of Back, with the Back to run once it is safe: a form with unsaved
   *  changes asks first (`onBack={(goBack) => (dirty ? setLeaving(() => goBack) : goBack())}`). */
  onBack?: (goBack: () => void) => void;
  /** The title's element: `p` when the page has its own h1 (a product page whose name scrolls into the bar). */
  titleAs?: "h1" | "p";
  actions?: TopBarAction[];
  className?: string;
}) {
  const goBack = useGoBack(typeof back === "string" ? back : "/m");
  const slot = "flex min-w-[44px] shrink-0 items-center gap-4";
  return (
    <header className={cn("flex h-[56px] shrink-0 items-center justify-between gap-4 px-8", className)}>
      <div className={slot}>
        {back && (
          <IconButton
            hierarchy="secondary"
            size="xl"
            aria-label="Back"
            className={PRESSED_SECONDARY}
            icon={<Icon icon={ArrowLeft02Icon} size={22} />}
            onClick={onBack ? () => onBack(goBack) : goBack}
          />
        )}
      </div>
      {title != null && (
        <TitleTag className={cn(T.screenTitle, "min-w-0 flex-1 truncate text-center")}>{title}</TitleTag>
      )}
      <div className={cn(slot, "justify-end")}>
        {actions.map((a) => (
          <IconButton
            key={a.label}
            hierarchy="secondary"
            size="xl"
            aria-label={a.label}
            className={PRESSED_SECONDARY}
            icon={<Icon icon={a.icon} size={22} />}
            onClick={a.onClick}
          />
        ))}
      </div>
    </header>
  );
}

/** The ⋯ every surface's menu opens from (KIT-RB-01…05). */
export const MORE_ICON = MoreHorizontalIcon;
