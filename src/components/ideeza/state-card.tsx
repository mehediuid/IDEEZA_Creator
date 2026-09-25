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
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
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
        <p className="text-3xl font-semibold leading-3xl tracking-slight text-text-primary">{title}</p>
        <p className="text-md leading-md text-text-secondary">{body}</p>
      </div>
      {action}
    </div>
  );
}
