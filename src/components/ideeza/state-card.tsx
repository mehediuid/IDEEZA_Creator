// IDEEZA Design System — M48 Empty State (Figma 1763:3) and M49 Error State
// (1763:54): one shell, the icon badge's ground and icon colour say which.
// 480 wide, radius md, 12 padding inside the subtle edge (Figma strokes
// inside, so the edge comes out of the padding), 10 between badge, text and
// actions, no shadow.
//
// `phone`: inside the mobile prototype the type tokens take their phone
// values, so the title names the class whose phone value is the Figma's H3
// (24/32); the web's look is unchanged without it.
import * as React from "react";
import { cn } from "@/lib/utils";

export function StateCard({
  tone,
  icon,
  title,
  body,
  action,
  className,
  titleAs = "p",
  titleRef,
  phone,
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  /** "h1" when the card is the whole page (a not-found state), so the page
   *  keeps its one h1. */
  titleAs?: "p" | "h1";
  /** With titleAs="h1": the page moves focus to the title on arrival, so the
   *  h1 takes tabIndex -1. */
  titleRef?: React.Ref<HTMLHeadingElement>;
  /** The mobile prototype's sizes (title Heading/H3 24/32 at phone width). */
  phone?: boolean;
}) {
  const titleClass = phone
    ? "text-4xl font-semibold leading-4xl tracking-slight text-text-primary"
    : "text-3xl font-semibold leading-3xl tracking-slight text-text-primary";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex w-[480px] max-w-full flex-col items-center gap-5 rounded-md border border-solid border-border-subtle bg-bg-surface p-[calc(var(--spacing-6)_-_var(--border-width-1))] text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-[80px] items-center justify-center rounded-full",
          tone === "error"
            ? "bg-bg-error-subtle text-[color:var(--color-icon-error)]"
            : "bg-bg-subtle text-[color:var(--color-icon-default)]",
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-[4px]">
        {titleAs === "h1" ? (
          <h1 ref={titleRef} tabIndex={-1} className={cn(titleClass, "outline-none")}>
            {title}
          </h1>
        ) : (
          <p className={titleClass}>{title}</p>
        )}
        {body && <p className="text-md leading-md text-text-secondary">{body}</p>}
      </div>
      {action}
    </div>
  );
}
