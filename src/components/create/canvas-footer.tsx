"use client";

// A bar pinned to the bottom of the canvas (owner, 2026-11-03: "the total
// stays sticky at the very bottom, always"). The canvas owns the slot, as the
// last thing in its scroll area; a question that has a total and a next step
// sends its footer there, so the count, the price and the button stay in view
// however short or long the question above is.
//
// Without a slot (a canvas that has none yet) the footer renders where it
// stands, as before.

import * as React from "react";
import { createPortal } from "react-dom";

const SlotContext = React.createContext<HTMLElement | null>(null);

/** The canvas's bottom slot: an empty bar until a footer is sent to it. */
export function CanvasFooterSlot({
  children,
}: {
  /** The canvas content the slot sits under. */
  children: React.ReactNode;
}) {
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  return (
    <SlotContext.Provider value={slot}>
      <div className="flex-1">{children}</div>
      {/* Sticky, and last in a column that fills the canvas: short content
          leaves it at the bottom edge, long content scrolls under it. */}
      <div ref={setSlot} className="sticky bottom-0 z-10 empty:hidden" />
    </SlotContext.Provider>
  );
}

/** Sends its children to the canvas's bottom bar, or renders them in place. */
export function CanvasFooter({ children }: { children: React.ReactNode }) {
  const slot = React.useContext(SlotContext);
  if (!slot) return <>{children}</>;
  return createPortal(
    <div className="border-t border-solid border-border bg-bg-page px-[var(--layout-page-inset)] py-[16px]">
      {children}
    </div>,
    slot,
  );
}
