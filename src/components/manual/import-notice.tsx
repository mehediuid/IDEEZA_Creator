"use client";

// What a seeded editor says came in from the build, and what didn't
// (P2-BUILDLOAD-12), in the editor's banner slot under the top bar — before
// "Bring it in" (P2-EDITOR-5): one banner at a time. The words are
// `pendingNoticeOf(record, editor)`: a title and a line for each thing that
// is true, none for a document the maker's own work kept. **Got it** adds the
// editor to the seed record's `dismissed`, so it never shows again for this
// seed; a Load that replaces the editor's documents clears it, and the notice
// comes back with the new version's words.
//
// A seed the browser refused (P2-BUILDLOAD-7) says so in the same slot, in
// the error tone. Nothing was written, the editor shows its samples, and the
// next open tries again; Got it only hides it for this open.
//
// The banner appears without taking the focus, and Got it is 24 px, 44 px on
// a coarse pointer; pressing it leaves the focus on the banner slot.

import * as React from "react";
import { Banner, Button } from "@/components/ideeza";
import { dismissImportNotice } from "@/lib/manual/build-load-io";
import { focusEditorBanners } from "./bring-in-banner";
import type { ImportNotice as Notice, SeedEditor } from "@/lib/manual/build-load";
import type { EditorScope } from "@/lib/manual/p2-types";
import { cn } from "@/lib/utils";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The banner's surface: the page's own, so its tint reads the same over a
 *  dark board or a light code pane (as the Bring it in banner). */
function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "pointer-events-auto rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] shadow-[var(--elevation-2)]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-normal motion-safe:ease-decelerate",
      )}
    >
      {children}
    </div>
  );
}

/** Got it hides its banner, so the focus goes to the slot first. */
function GotIt({ onClick }: { onClick: () => void }) {
  const press = () => {
    focusEditorBanners();
    onClick();
  };
  return (
    <Button hierarchy="secondary" size="sm" className={cn("min-h-[24px]", TAP)} onClick={press}>
      Got it
    </Button>
  );
}

export function ImportNotice({
  scope,
  editor,
  notice,
  onDismissed,
}: {
  scope: EditorScope;
  editor: SeedEditor;
  notice: Notice;
  /** After Got it: the record says so now (or, if the browser refused the
   *  write, only this open does). */
  onDismissed: (editor: SeedEditor) => void;
}) {
  const gotIt = () => {
    try {
      dismissImportNotice(scope, editor, window.localStorage);
    } catch {
      // No storage: it hides for this open, and shows again on the next.
    }
    onDismissed(editor);
  };
  return (
    <Surface>
      <Banner tone="info" title={notice.title}>
        {notice.lines.length > 0 && (
          // No role="list": reset.css strips the bullets from ul[role="list"].
          <ul className="m-0 flex list-disc flex-col gap-[4px] pl-[20px]">
            {notice.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <span className="mt-[8px] flex">
          <GotIt onClick={gotIt} />
        </span>
      </Banner>
    </Surface>
  );
}

/** A seed the browser refused (P2-BUILDLOAD-7). */
export function SeedFailedNotice({ message, onDismissed }: { message: string; onDismissed: () => void }) {
  return (
    <Surface>
      <Banner tone="error">
        <span className="block">{message}</span>
        <span className="mt-[8px] flex">
          <GotIt onClick={onDismissed} />
        </span>
      </Banner>
    </Surface>
  );
}
