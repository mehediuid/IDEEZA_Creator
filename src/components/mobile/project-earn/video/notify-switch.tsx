"use client";

// "Notify me on this browser · for every video" (CL-030; the web's one switch, D5): turned on in
// any render screen or in the Videos sheet, it covers every render and the moment a waiting listing
// or post goes live (lib/video/notify-pref.ts; turning it on asks the browser once). A notification
// comes only while the tab is in the background.

import * as React from "react";
import { Checkbox } from "@/components/ideeza/checkbox";
import { cn } from "@/lib/utils";
import { T } from "../../type";

export function NotifySwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className={cn(T.body, "flex min-h-[44px] w-full items-center gap-4 rounded-md text-left text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
    >
      <Checkbox checked={on} decorative />
      Notify me on this browser · for every video
    </button>
  );
}
