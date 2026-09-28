"use client";

// Get creator support (P2-MARKETPLACE-20, C19): a holder's message to the
// creator, with the purchase it's about. Messages isn't open yet, so the
// request is a real record — `ideeza:market:support`, one `appendSupport`
// (T11) — and its real reader is the owner's Project log, which lists
// "Support request from Mira (demo buyer)" with the message as its note. The
// buyer view's log never lists it (`marketLogOf`'s owner rule).
//
// One ModalFrame: Tab held inside, Escape and the scrim close it, focus goes
// back to the button that opened it. The message field takes the first focus,
// since writing it is the only thing to do here.

import * as React from "react";
import { Banner, Button, ModalFrame, Textarea } from "@/components/ideeza";
import { useMarket } from "@/lib/market/market-store";
import { randomId } from "@/lib/market/sales";
import type { Sale } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const MAX = 500;
const COUNT_FROM = 400;

export function SupportDialog({
  open,
  sale,
  onClose,
  onSent,
}: {
  open: boolean;
  /** The buyer's newest purchase of this project: the request names it. */
  sale: Sale;
  onClose: () => void;
  /** After the one write: the caller moves focus to its status line. */
  onSent: () => void;
}) {
  const { appendSupport } = useMarket();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const fieldId = React.useId();
  const counterId = React.useId();
  const message = text.trim();

  const close = () => {
    setError(null);
    onClose();
  };
  const send = () => {
    if (!message) return;
    const written = appendSupport({
      id: randomId("sup_"),
      saleId: sale.id,
      projectId: sale.projectId,
      buyerId: sale.buyerId,
      message,
      at: Date.now(),
    });
    if (!written.ok) {
      setError(
        written.reason === "storage"
          ? "Your browser didn't save this request — storage is full."
          : "This browser's marketplace records couldn't be read, so the request wasn't saved.",
      );
      return;
    }
    setText("");
    setError(null);
    onSent();
  };

  return (
    <ModalFrame
      open={open}
      onClose={close}
      size="sm"
      title="Get creator support"
      initialFocus={fieldRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            className="max-md:min-h-[var(--touch-min)]"
            disabled={!message}
            onClick={send}
          >
            Send request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="max-w-[62ch] text-md text-text-secondary">
          Your message goes to the creator with this purchase&apos;s details. Messages isn&apos;t open yet, so the
          creator reads it in the project&apos;s log in this browser.
        </p>
        <div className="flex flex-col gap-3">
          <label htmlFor={fieldId} className="text-sm font-medium text-text-primary">
            Message
          </label>
          <Textarea
            ref={fieldRef}
            id={fieldId}
            rows={5}
            maxLength={MAX}
            value={text}
            onValueChange={(v) => setText(v.slice(0, MAX))}
            aria-describedby={text.length >= COUNT_FROM ? counterId : undefined}
          />
          {text.length >= COUNT_FROM && (
            <p
              id={counterId}
              className={cn("text-sm tabular-nums", text.length >= MAX ? "text-text-error" : "text-text-secondary")}
            >
              {text.length} / {MAX}
            </p>
          )}
        </div>
        {error && (
          <div role="alert">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
