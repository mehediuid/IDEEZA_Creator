"use client";

// ImageEditorModal — the refine overlay (Ai-Flow frame 05).
//
// Opened from a concept card's Refine action. It portals to <body> and
// blurs the WHOLE page behind it — sidebar included — so the concept
// being refined is the only thing in focus; anchored inside the chat
// column it would have left the navigation crisp beside it.
//
// The header says which concept is being refined and where the result
// will land; the composer evolves THAT image, keeping the same concept
// (the orchestrator drives the refine). Submitting an edit CLOSES the
// overlay — the refine then lands in the chat thread, where the user
// watches it render and can reopen Refine on the result to iterate.
//
// A11y: role=dialog + aria-modal, Esc + click-outside close, the edit box
// is focused on open, every control is labelled, voice has a
// keyboard/click path.

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AiMagicIcon,
  Cancel01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/dashboard/icon";
import { useVoiceInput, voiceErrorMessage } from "@/lib/voice/use-voice-input";
import { VoiceListening } from "@/components/voice/voice-listening";

export function ImageEditorModal({
  open,
  image,
  conceptLabel,
  nextRefineIndex,
  onClose,
  onSubmitEdit,
}: {
  open: boolean;
  image: string | null;
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

  // Focus the edit box on open — and end any session on the way out.
  // The chat renders this overlay unconditionally and it only
  // short-circuits on `!open`, so it never unmounts and the hook's own
  // unmount teardown never runs: closing mid-dictation would otherwise
  // leave the recogniser listening, the microphone stream open (the OS
  // indicator still lit) and the meter's frame loop running, and a later
  // natural `onend` would append the transcript into a closed overlay.
  React.useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    else cancelSession();
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Refining Concept ${conceptLabel}`}
      data-testid="refine-overlay"
      className="fixed inset-0 z-modal flex flex-col bg-[color-mix(in_srgb,var(--color-bg-overlay)_78%,transparent)] backdrop-blur-md"
    >
      {/* Top bar — close, what is being refined, where it lands. */}
      <header className="flex items-start gap-[12px] px-[20px] py-[16px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tracking-tight text-text-primary">
            Refining Concept {conceptLabel}
          </p>
          <p className="mt-[2px] truncate text-sm text-text-secondary">
            {`The result lands in your chat as Concept ${conceptLabel}.${nextRefineIndex} — the original stays untouched.`}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-solid border-border-brand bg-bg-brand-subtle px-[10px] py-[4px] text-2xs font-bold uppercase tracking-wider text-text-brand">
          Concept {conceptLabel}
        </span>
      </header>

      {/* Image stage — clicking the backdrop closes. */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-[24px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {image && (
          <div className="relative inline-flex max-h-full max-w-[min(900px,100%)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={`Concept ${conceptLabel}`}
              className="max-h-[calc(100dvh-240px)] w-auto rounded-xl object-contain"
            />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-[24px] pb-[28px] pt-[12px]">
        {/* While the microphone is open the composer IS the listening
            view — its own controls would otherwise be taking clicks
            that belong to Cancel / Stop & review. Only the width is
            passed: the edit box is focused when the mic is clicked, so
            the composer's border is already the 1.5 px brand one the
            view draws by default. 640 px holds the 465 px waveform. */}
        {listening ? (
          <div ref={viewRef} tabIndex={-1} className="outline-none">
            <VoiceListening
              levels={voice.levels}
              interim={voice.interim}
              onCancel={voice.cancel}
              onStop={voice.stop}
              className="mx-auto w-full max-w-[640px]"
            />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[640px] items-end gap-[6px] rounded-2xl border-1-5 border-border bg-bg-surface p-[8px] focus-within:border-border-brand">
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
            {/* The same ai-magic send the prompt bar carries, so the two
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
              <Icon icon={AiMagicIcon} size={18} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Why the last session produced nothing. It is derived from the
            hook's status, so the next successful start clears it. The
            region is always in the DOM — a live region mounted together
            with its text is announced by no screen reader, because there
            was nothing there to watch change. Empty it carries no
            margin, so the hint below it doesn't move. */}
        <p
          role="status"
          className={cn(
            "mx-auto w-full max-w-[640px] text-center text-sm text-text-error",
            voiceError && "mt-[10px]",
          )}
        >
          {voiceError}
        </p>

        <p className="mt-[10px] text-center text-sm text-text-tertiary">
          Refining evolves the same concept. To start over from your prompt,
          use Regenerate instead.
        </p>
      </div>
    </div>,
    document.body,
  );
}
