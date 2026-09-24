"use client";

// ImageEditorModal — the refine overlay (Ai-Flow frame 05).
//
// Opened from a concept card's Refine action. It portals to <body>, behind
// the flow's one backdrop (the gate's), with the dialog itself on a surface
// panel — so the concept being refined is the only thing in focus, sidebar
// included.
//
// The header says which concept is being refined and where the result
// will land; the composer evolves THAT image, keeping the same concept
// (the orchestrator drives the refine). Submitting an edit CLOSES the
// overlay — the refine then lands in the chat thread, where the user
// watches it render and can reopen Refine on the result to iterate.
//
// A11y: role=dialog + aria-modal, Esc + click-outside close, focus moves to
// the edit box on open, stays inside while open and returns to Refine on
// close; every control is labelled; voice has a keyboard/click path.

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp02Icon,
  Cancel01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/dashboard/icon";
import { useVoiceInput, voiceErrorMessage } from "@/lib/voice/use-voice-input";
import { VoiceListening } from "@/components/voice/voice-listening";
import { useDialogFocus } from "./use-dialog-focus";

export function ImageEditorModal({
  open,
  image,
  conceptLabel,
  nextRefineIndex,
  productName,
  onClose,
  onSubmitEdit,
}: {
  open: boolean;
  image: string | null;
  /** What is being refined — the product, which is what the title names. */
  productName?: string;
  // The concept being refined — "2", or "1.1" for a refine of a refine.
  conceptLabel: string;
  // Which refine of this concept the result will be, so the editor can
  // name the number the new card will carry.
  nextRefineIndex: number;
  onClose: () => void;
  onSubmitEdit: (text: string) => void;
}) {
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Focus in on open (the edit box), held inside while open, handed back to
  // the Refine that opened it on close.
  useDialogFocus(open, panelRef, inputRef);

  // Dictation appends what was said to whatever is already typed.
  const voice = useVoiceInput({
    onFinal: (said) => {
      setText((cur) => (cur.trim() ? `${cur.trim()} ${said}` : said));
    },
  });
  const listening = voice.status === "listening";
  // Taken off the hook result so the effect below can depend on the
  // callback itself — it is stable, where `voice` is a new object every
  // render.
  const { cancel: cancelSession } = voice;

  // End any session on the way out. The chat renders this overlay
  // unconditionally and it only short-circuits on `!open`, so it never
  // unmounts and the hook's own unmount teardown never runs: closing
  // mid-dictation would otherwise leave the recogniser listening, the
  // microphone stream open (the OS indicator still lit) and the meter's
  // frame loop running, and a later natural `onend` would append the
  // transcript into a closed overlay.
  React.useEffect(() => {
    if (!open) cancelSession();
  }, [open, cancelSession]);

  // Esc closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-grow the edit box. `listening` and `open` are in the deps
  // because both unmount the box while the draft stays put: Cancel
  // leaves the text exactly as it was, so only the swap back can
  // re-grow it.
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, listening, open]);

  // Leaving the listening view hands the edit box its place back, so
  // put the caret where typing continues — after whatever the
  // transcript just appended.
  const returnToComposer = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  // The mic is one of the controls the listening view replaces, so the
  // click that opened the session leaves focus on a removed element.
  // Park it on the view: the live region is read and Tab carries on
  // into Cancel / Stop & review. Coming back out is the same problem in
  // reverse, and Cancel / Stop are not the only way out — a session also
  // ends by itself (a silence timeout, the OS taking the microphone),
  // which would drop focus on <body>. So the transition owns the
  // hand-back, not the two buttons. Closing the overlay ends a session
  // too, and there the edit box is gone, so the focus call finds
  // nothing and takes nothing away from the page behind.
  const viewRef = React.useRef<HTMLDivElement>(null);
  const wasListening = React.useRef(false);
  React.useEffect(() => {
    if (listening) viewRef.current?.focus();
    else if (wasListening.current) returnToComposer();
    wasListening.current = listening;
  }, [listening, returnToComposer]);

  // Closed on the server and on the first client render alike (it only
  // ever opens from a click), so the document guard can't desync
  // hydration — it just keeps the portal off the server render.
  if (!open || typeof document === "undefined") return null;

  const canSubmit = text.trim().length > 0;
  const voiceError = voiceErrorMessage(voice.status);
  const submit = () => {
    if (!canSubmit) return;
    onSubmitEdit(text.trim());
    setText("");
  };

  const what = productName?.trim() || `Concept ${conceptLabel}`;
  return createPortal(
    // One backdrop for every dialog in the flow (the gate's), and the dialog
    // itself on a surface. The title and the help line used to sit straight
    // on a 78% dark wash, which in light theme put dark text on a dark
    // ground — the two lines that say what Refine does were close to
    // invisible.
    <div
      data-testid="refine-overlay"
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refine-title"
        className="relative flex max-h-full w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3"
      >
        <header className="flex items-start gap-[12px] px-[20px] pb-[12px] pt-[16px]">
          <div className="min-w-0 flex-1">
            <h2
              id="refine-title"
              className="truncate text-lg font-semibold text-text-primary"
            >
              Refine {what}
            </h2>
            <p className="mt-[2px] text-sm text-text-secondary">
              {`The result lands as Concept ${conceptLabel}.${nextRefineIndex} — the original stays. Each change costs 1 credit.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-subtle px-[20px] py-[16px]">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={`${what}, concept ${conceptLabel}`}
              className="max-h-[calc(100dvh-300px)] w-auto max-w-full rounded-xl object-contain"
            />
          )}
        </div>

        <div className="px-[20px] pb-[18px] pt-[14px]">
          {/* While the microphone is open the composer IS the listening
              view — its own controls would otherwise be taking clicks that
              belong to Cancel / Stop & review. */}
          {listening ? (
            <div ref={viewRef} tabIndex={-1} className="outline-none">
              <VoiceListening
                levels={voice.levels}
                interim={voice.interim}
                onCancel={voice.cancel}
                onStop={voice.stop}
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex w-full items-end gap-[6px] rounded-2xl border-1-5 border-border bg-bg-surface p-[8px] focus-within:border-border-brand">
              <label htmlFor="img-edit" className="sr-only">
                Describe a change to this image
              </label>
              <textarea
                id="img-edit"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder="Describe a change to this image…"
                className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent px-[12px] py-[8px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onClick={voice.supported ? voice.start : undefined}
                disabled={!voice.supported}
                aria-label={
                  voice.supported
                    ? "Use voice input"
                    : "Voice input isn't supported in this browser"
                }
                title="Voice input"
                className={[
                  "inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg outline-none transition-colors duration-fast",
                  "focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40",
                  "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
                ].join(" ")}
              >
                <Icon icon={Mic01Icon} />
              </button>
              {/* The same arrow send the prompt bar carries, so the two
                  composers read as one control. Off until there is a change
                  described. */}
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
                aria-label={
                  canSubmit ? "Apply this change" : "Describe a change first"
                }
                title={canSubmit ? "Apply (Enter)" : "Describe a change first"}
                className={
                  canSubmit
                    ? "inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-button-primary-bg text-button-primary-text outline-none transition-colors duration-fast hover:bg-button-primary-bg-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                    : "inline-flex h-[40px] w-[40px] shrink-0 cursor-not-allowed items-center justify-center rounded-lg bg-[var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                }
              >
                <Icon icon={ArrowUp02Icon} size={18} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {/* Why the last session produced nothing — always in the DOM, so
              the live region is there to watch change. */}
          <p
            role="status"
            className={cn(
              "w-full text-center text-sm text-text-error",
              voiceError && "mt-[10px]",
            )}
          >
            {voiceError}
          </p>

          <p className="mt-[10px] text-center text-sm text-text-tertiary">
            Refining evolves this concept. To start over from your prompt, use
            Regenerate instead.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
