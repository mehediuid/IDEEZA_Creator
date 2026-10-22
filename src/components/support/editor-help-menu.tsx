"use client";

// Help for the editors that have no menu bar of their own: Assembly,
// Peripheral Wiring and Product Preview. PCB, Code and 3D carry Help in their
// own menus; these three had nothing in the top bar's middle, so a maker who
// hit a problem there had no way to report it short of leaving the editor.
// It sits where those menus sit, so each editor still has exactly one Help,
// and every row in it is real.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bug01Icon, MortarboardIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Menu } from "@/components/ideeza";
import { openReportProblem } from "@/lib/support/open-report";
import { cn } from "@/lib/utils";

export function EditorHelpMenu() {
  const router = useRouter();
  return (
    <div className="ml-[var(--spacing-12)] flex items-center">
      <Menu
        label="Help"
        items={[
          { id: "tutorials", label: "Tutorials", icon: <Icon icon={MortarboardIcon} />, onSelect: () => router.push("/tutorials") },
          { id: "report", label: "Report a problem…", icon: <Icon icon={Bug01Icon} />, onSelect: () => openReportProblem() },
        ]}
        trigger={(props, { open }) => (
          <button
            type="button"
            {...props}
            className={cn(
              "ix-menu rounded-md px-[var(--spacing-6)] py-[var(--spacing-4)] text-md font-medium leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              open ? "bg-bg-brand-subtle text-text-brand" : "text-text-primary hover:bg-bg-surface-raised",
            )}
          >
            Help
          </button>
        )}
      />
    </div>
  );
}
