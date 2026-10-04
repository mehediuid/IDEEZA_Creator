// IDEEZA Design System — M48 Empty State (Figma 47167:21980) and M49 Error
// State (47167:21988): one shell, the icon badge's ground says which.
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
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
  /** "h1" when the card is the whole page (a not-found state), so the page
   *  keeps its one h1. */
  titleAs?: "p" | "h1";
  /** With titleAs="h1": the page moves focus to the title on arrival, so the
   *  h1 takes tabIndex -1. */
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  const titleClass = "text-3xl font-semibold leading-3xl tracking-slight text-text-primary";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex w-[480px] max-w-full flex-col items-center gap-[20px] rounded-2xl border border-solid border-border-subtle bg-bg-surface px-[24px] pb-[24px] pt-[32px] text-center shadow-1",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-[80px] items-center justify-center rounded-full",
          tone === "error" ? "bg-bg-error-subtle text-text-error" : "bg-bg-subtle text-text-tertiary",
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
        <p className="text-md leading-md text-text-secondary">{body}</p>
      </div>
      {action}
    </div>
  );
}
