"use client";

// IDEEZA PCB Software — cover / launch screen.
// Decorative markup is rendered verbatim; the "Launch the editor" button
// (tagged data-act="enter" in the source) is wired via click delegation.

import { COVER_HTML } from "@/lib/pcb/markup";
import { usePcbActions } from "@/lib/pcb/store";

export function Cover() {
  const actions = usePcbActions();

  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-act="enter"]')) {
      actions.enterApp();
    }
  };

  return <div onClick={onClick} dangerouslySetInnerHTML={{ __html: COVER_HTML }} />;
}
