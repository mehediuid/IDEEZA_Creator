"use client";

// PromptBar — the chat composer, pinned under the thread. The home card's
// controls (mic dictation · Enhance · send) so the chat reads as a
// continuation of the home flow; the send is icon-only here — the arrow every
// chat composer uses — because the thread already says what a submission does.
//
// It is never disabled while a generation is in flight — a user may
// describe the next change while the current concept renders.

import * as React from "react";
import {
  ArrowUp02Icon,
  MagicWand01Icon,
  Mic01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useVoiceInput, voiceErrorMessage } from "@/lib/voice/use-voice-input";
import { VoiceListening } from "@/components/voice/voice-listening";
import { Icon, type IconValue } from "@/components/dashboard/icon";

/** The composer's text box — where the spec sheet's Change by message puts
 *  the keyboard. */
export const COMPOSER_INPUT_ID = "chat-prompt";

/** How long a held send's line stays under the box, unless typing clears it
 *  first. */
const HELD_MS = 6_000;

export function PromptBar({
  onSubmit,
  placeholder = "Describe your electronics project…",
  canRender = true,
  blockedReason,
  heldMessage,
  onHeldChange,
  enhanceMode = "brief",
}: {
  /** Return false to keep the draft — the host couldn't act on it (nothing
   *  is selected to change), and clearing it would lose what was typed. */
  onSubmit: (text: string) => void | boolean;
  /** What to say, for a moment, when `onSubmit` keeps the draft: Enter and
   *  the send arrow look ready, so a send that does nothing has to say why
   *  or it reads as broken. */
  heldMessage?: string;
  /** Told true when that line appears under the box and false when it
   *  clears — its clock, a keystroke, dictation, a send that goes, the
   *  listening view taking the bar, or `heldMessage` going (the reason to
   *  hold is gone) — so a hint beside the composer that would say the same
   *  can step aside exactly while it shows. */
  onHeldChange?: (held: boolean) => void;
  placeholder?: string;
  /** False when the balance cannot cover one concept render. The send is
   *  shut with that as its reason rather than letting a submit start a
   *  turn the ledger will immediately fail. */
  canRender?: boolean;
  /** Something else has to be answered before a submission means anything —
   *  the send is shut and says what. */
  blockedReason?: string;
  /** What Enhance rewrites the draft into. A change to a concept on screen
   *  is not a project idea: rewritten as one it came back as a different
   *  product ("make it matte black" → a whole new sensor spec). */
  enhanceMode?: "brief" | "change";
}) {
  const [value, setValue] = React.useState("");
  const [refining, setRefining] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  // The line a held send shows. `n` counts the sends, so a second one
  // replays the line and restarts its clock.
  const [held, setHeld] = React.useState<{ text: string; n: number } | null>(null);
  React.useEffect(() => {
    if (!held) return;
    const timer = window.setTimeout(() => setHeld(null), HELD_MS);
    return () => window.clearTimeout(timer);
  }, [held]);

  // Dictation appends what was said to whatever is already typed.
  const voice = useVoiceInput({
    onFinal: (said) => {
      setValue((cur) => (cur.trim() ? `${cur.trim()} ${said}` : said));
      setHeld(null);
    },
  });
  const listening = voice.status === "listening";

  // The line is on screen while a send is held, the host still has a reason
  // to hold it, and the bar isn't the listening view. Picking a product takes
  // the reason away (`heldMessage` goes), and the line with it that moment —
  // not on its clock — so the hint that names the pick can show. The held
  // send is dropped as well, so deselecting again brings no stale line back.
  if (held !== null && !heldMessage) setHeld(null);
  const heldShows = held !== null && !!heldMessage && !listening;
  React.useEffect(() => {
    onHeldChange?.(heldShows);
  }, [heldShows, onHeldChange]);

  // Auto-grow the textarea up to ~5 lines. `listening` is in the deps
  // because Cancel leaves the draft exactly as it was: the textarea
  // comes back at its default rows and nothing about the value changed,
  // so only the swap itself can re-grow it.
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    // A hidden pane (the Chat tab at phone width) measures 0, and writing
    // that collapsed the box to its padding; leave it at its rows instead.
    el.style.height = el.scrollHeight
      ? `${Math.min(el.scrollHeight, 160)}px`
      : "";
  }, [value, listening]);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || refining || blockedReason || !canRender) return;
    if (onSubmit(trimmed) === false) {
      // The draft stays; the line says why nothing happened.
      if (heldMessage) setHeld((prev) => ({ text: heldMessage, n: (prev?.n ?? 0) + 1 }));
      return;
    }
    setHeld(null);
    setValue("");
  };

  // Enhance — rewrites the current draft via /api/refine, then drops it back
  // in the box: into a concrete brief for a new idea (the home card's mode),
  // or into one precise instruction for a change to the concept on screen.
  const enhance = async () => {
    const trimmed = value.trim();
    if (!trimmed || refining) return;
    setRefining(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, mode: enhanceMode }),
      });
      const data = (await res.json()) as { refined?: string };
      if (data.refined && data.refined.trim()) {
        setValue(data.refined.trim());
        requestAnimationFrame(() => taRef.current?.focus());
      }
    } catch {
      // keep the original draft on failure
    } finally {
      setRefining(false);
    }
  };

  // Leaving the listening view hands the textarea its place back, so
  // put the caret where typing continues — after whatever the
  // transcript just appended.
  const returnToComposer = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = taRef.current;
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
  // hand-back, not the two buttons.
  const viewRef = React.useRef<HTMLDivElement>(null);
  const wasListening = React.useRef(false);
  React.useEffect(() => {
    if (listening) viewRef.current?.focus();
    else if (wasListening.current) returnToComposer();
    wasListening.current = listening;
  }, [listening, returnToComposer]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    // The next keystroke clears a held send's line — the maker is on it.
    if (held && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) setHeld(null);
  };

  const hasText = value.trim().length > 0;
  const voiceError = voiceErrorMessage(voice.status);

  // While the microphone is open the bar IS the listening view — the
  // textarea and its toolbar would otherwise be taking clicks that
  // belong to Cancel / Stop & review. No box override here: the click
  // that opens a session puts focus inside the bar, so its border is
  // already the 1.5 px brand one the view draws by default.
  if (listening) {
    return (
      <div ref={viewRef} tabIndex={-1} className="outline-none">
        <VoiceListening
          levels={voice.levels}
          interim={voice.interim}
          onCancel={voice.cancel}
          onStop={voice.stop}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border-1-5 border-border bg-bg-surface focus-within:border-border-brand">
        <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
          Continue the concept conversation
        </label>
        <textarea
          id={COMPOSER_INPUT_ID}
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          rows={2}
          className="block w-full resize-none bg-transparent px-[20px] pt-[16px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary"
        />

        <div className="flex items-center justify-between gap-[8px] px-[12px] pb-[12px] pt-[4px]">
          {/* No attach button until an image can go with the message — it
              was permanently disabled, a control that offered only a reason. */}
          <div className="flex items-center gap-[4px]">
            <ToolbarIconButton
              ariaLabel={
                voice.supported
                  ? "Use voice input"
                  : "Voice input isn't supported in this browser"
              }
              onClick={voice.supported ? voice.start : undefined}
              icon={Mic01Icon}
              disabled={!voice.supported}
            />
          </div>

          <div className="flex items-center gap-[8px]">
            <EnhanceButton
              onClick={enhance}
              refining={refining}
              disabled={!hasText || refining}
              mode={enhanceMode}
            />
            <SendButton
              onClick={send}
              hasText={hasText}
              refining={refining}
              canRender={canRender}
              blockedReason={blockedReason}
            />
          </div>
        </div>
      </div>

      {/* Why the last send did nothing, for a moment — polite, and always
          in the DOM for the same reason as the line below. Guidance, not an
          error: the words carry it, in the secondary ink. */}
      <p role="status" className={cn("px-[4px] text-sm text-text-secondary", heldShows && "mt-[10px]")}>
        {heldShows && held && (
          <span
            key={held.n}
            className="block motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate"
          >
            {held.text}
          </span>
        )}
      </p>

      {/* Why the last session produced nothing. It is derived from the
          hook's status, so the next successful start clears it. The
          region is always in the DOM — a live region mounted together
          with its text is announced by no screen reader, because there
          was nothing there to watch change. Empty it carries no margin,
          so nothing below it moves. Same offset as the home card's. */}
      <p
        role="status"
        className={cn(
          "px-[4px] text-sm text-text-error",
          voiceError && "mt-[10px]",
        )}
      >
        {voiceError}
      </p>
    </div>
  );
}

function ToolbarIconButton({
  ariaLabel,
  onClick,
  icon,
  disabled,
}: {
  ariaLabel: string;
  onClick?: () => void;
  icon: IconValue;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={[
        "inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40",
        "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
      ].join(" ")}
    >
      <Icon icon={icon} />
    </button>
  );
}

function EnhanceButton({
  onClick,
  refining,
  disabled,
  mode,
}: {
  onClick: () => void;
  refining: boolean;
  disabled: boolean;
  mode: "brief" | "change";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Enhance the prompt with AI"
      title={
        mode === "change"
          ? "Rewrite your change as one clear instruction"
          : "Rewrite your draft into a clearer, concrete brief"
      }
      className={[
        "inline-flex h-[40px] items-center gap-[8px] rounded-lg px-[16px] text-md font-medium outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50",
        refining
          ? "bg-bg-brand-subtle text-text-brand"
          : "text-text-secondary hover:bg-bg-surface-raised",
      ].join(" ")}
    >
      <Icon
        icon={refining ? Refresh01Icon : MagicWand01Icon}
        className={
          refining ? "animate-spin motion-reduce:animate-none" : undefined
        }
      />
      {refining ? "Enhancing…" : "Enhance"}
    </button>
  );
}

// Icon-only here, unlike the home card's labelled "Generate": in the
// chat the thread above already says what a submission does. Quiet and
// disabled with nothing typed, the brand's primary once there is a draft.
function SendButton({
  onClick,
  hasText,
  refining,
  canRender,
  blockedReason,
}: {
  onClick: () => void;
  hasText: boolean;
  refining: boolean;
  canRender: boolean;
  blockedReason?: string;
}) {
  if (!hasText || refining || !canRender || blockedReason) {
    const why = !canRender
      ? "Not enough credits to render a concept"
      : blockedReason
        ? blockedReason
        : refining
          ? "Enhancing your draft…"
          : "Type something first";
    return (
      <button
        type="button"
        disabled
        aria-disabled
        aria-label={`Send — ${why.toLowerCase()}`}
        title={why}
        className="inline-flex h-[40px] w-[40px] cursor-not-allowed items-center justify-center rounded-lg bg-[var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
      >
        <Icon icon={ArrowUp02Icon} size={18} strokeWidth={1.8} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Send"
      title="Send (Enter)"
      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg bg-button-primary-bg text-button-primary-text outline-none transition-colors duration-fast hover:bg-button-primary-bg-hover focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={ArrowUp02Icon} size={18} strokeWidth={1.8} />
    </button>
  );
}
