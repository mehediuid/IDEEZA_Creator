"use client";

// The regular AI chat box: the idea, voice input, Quality (Low / Medium / High, remembered), Enhance and Generate.
// Home's WorkspacePrompt holds it, and so does a project page's "Add a product › Build with AI" (owner,
// 2026-11-16: "why isn't our regular AI chat box there?"), so both start a chat the same way.
// The inspiration image (owner, 2026-11-01) lives here too, whole: the button beside the mic, paste and drop, the
// chip, the upload on Generate (owner, 2026-11-18: one shared box, so every place that holds it takes a picture).
// The caller only gets the stored picture with `onSubmit` and hands it to `createChat`.

import * as React from "react";
import {
  AiMagicIcon,
  Cancel01Icon,
  ImageAdd01Icon,
  MagicWand01Icon,
  Mic01Icon,
  Refresh01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  DEFAULT_QUALITY,
  LAST_QUALITY_KEY,
  readLastQuality,
  saveLastQuality,
  type RenderQuality,
} from "@/lib/create/quality";
import { creditsLabel, defaultPick, pickCost } from "@/lib/create/pieces";
import { QualityMenu } from "@/components/create/quality-menu";
import { INSPIRATION_TYPES, pickProblem } from "@/lib/create/inspiration";
import { shrinkInspiration, uploadInspiration } from "@/lib/create/inspiration-client";
import { useVoiceInput, voiceErrorMessage } from "@/lib/voice/use-voice-input";
import { VoiceListening } from "@/components/voice/voice-listening";
import { Icon, type IconValue } from "./icon";

type Mode = "ai" | "manual";

/** An inspiration image picked in the page, before Generate uploads it. */
type InspirationPick = { dataUrl: string; name: string };

/** The stored inspiration image Generate hands the caller — the same names
 *  `createChat` takes, so it can be spread into its options. */
export type PromptImage = { inspiration: string; inspirationName: string };

// The Quality picked last, read where the browser keeps it. The server has
// no store, so it draws Medium and the client takes over on hydration; a
// pick in another tab follows here through the storage event.
const qualityListeners = new Set<() => void>();
function subscribeQuality(onChange: () => void) {
  qualityListeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_QUALITY_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    qualityListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
export function useLastQuality(): [RenderQuality, (q: RenderQuality) => void] {
  const value = React.useSyncExternalStore(subscribeQuality, readLastQuality, () => DEFAULT_QUALITY);
  const set = React.useCallback((q: RenderQuality) => {
    saveLastQuality(q);
    qualityListeners.forEach((l) => l());
  }, []);
  return [value, set];
}

/** What a product costs to build at each level — the menu says it, since
 *  the level picked here is the one each product is built at. */
const buildPrice = (q: RenderQuality) => `Build ${creditsLabel(pickCost(defaultPick(q)))} a product`;

export const PromptCard = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    /** Generate. With a picture in the box it arrives already stored. */
    onSubmit: (image?: PromptImage) => void;
    submitting: boolean;
    placeholder: string;
    mode: Mode;
    onRefine: () => void;
    refining: boolean;
    /** False when the balance cannot cover one concept render. */
    canRender: boolean;
    quality: RenderQuality;
    onQuality: (q: RenderQuality) => void;
    /** The textarea's id: one per page (Home's box, the Add a product dialog's). */
    id?: string;
    /** What the box is for, read by a screen reader. */
    label?: string;
    /** What Generate does, read by a screen reader and shown as its tooltip. */
    sendLabel?: string;
    /** Why Generate waits while the box is empty. */
    emptyHint?: string;
  }
>(function PromptCard(
  {
    value,
    onChange,
    onSubmit,
    submitting,
    placeholder,
    mode,
    onRefine,
    refining,
    canRender,
    quality,
    onQuality,
    id = "ws-prompt",
    label = "Describe your electronics project",
    sendLabel = "Generate project",
    emptyHint = "describe your project first",
  },
  ref,
) {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const takesImages = mode === "ai";
  // The inspiration image (lib/create/inspiration.ts), shrunk in the page and
  // kept here until Generate stores it with the idea. One per idea: another
  // pick replaces it.
  const [inspiration, setInspiration] = React.useState<InspirationPick | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const takeImage = async (file: File) => {
    const problem = pickProblem(file);
    if (problem) {
      setImageError(problem);
      return;
    }
    try {
      const dataUrl = await shrinkInspiration(file);
      setInspiration({ dataUrl, name: file.name || "Pasted image" });
      setImageError(null);
    } catch {
      setImageError("We couldn't open that picture — try a JPG or PNG.");
    }
  };
  const dropImage = () => {
    setInspiration(null);
    setImageError(null);
    requestAnimationFrame(() => localRef.current?.focus());
  };
  // Generate. The picture goes up first, so the chat opens already holding
  // it; if it can't be kept, the idea waits here with the reason rather than
  // opening without what the maker asked for. An empty box or a short balance
  // goes straight to the caller, which says why.
  const send = async () => {
    if (uploading) return;
    if (!inspiration || !value.trim() || !canRender) {
      onSubmit();
      return;
    }
    setUploading(true);
    setImageError(null);
    const up = await uploadInspiration(inspiration.dataUrl);
    setUploading(false);
    if ("error" in up) {
      setImageError(up.error);
      return;
    }
    onSubmit({ inspiration: up.url, inspirationName: inspiration.name });
  };
  // No dep array on purpose. The listening view below replaces this
  // whole card, so the textarea is unmounted and remounted once per
  // dictation; a handle computed only at mount would hand the parent a
  // detached node for the rest of the session, and its three focus calls
  // (empty submit, caret back after Enhance, example chip) would quietly
  // do nothing.
  React.useImperativeHandle(ref, () => localRef.current as HTMLTextAreaElement);

  // Dictation appends what was said to whatever is already typed.
  const voice = useVoiceInput({
    onFinal: (said) => {
      const cur = value.trim();
      onChange(cur ? `${cur} ${said}` : said);
    },
  });
  const listening = voice.status === "listening";

  // `listening` is in the deps because Cancel leaves the draft exactly
  // as it was: the textarea comes back at its default rows and nothing
  // about the value changed, so only the swap itself can re-grow it.
  React.useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, listening]);

  // Leaving the listening view takes the textarea's place back, so put
  // the caret where typing continues — at the end of the draft, after
  // whatever the transcript just appended.
  const returnToComposer = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = localRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  // The mic button is one of the controls the listening view replaces,
  // so the click that opened the session leaves focus on a removed
  // element. Park it on the view itself: the live region is read, and
  // Tab carries on into Cancel / Stop & review rather than restarting
  // at the top of the page. Coming back out is the same problem in
  // reverse, and it is not only Cancel / Stop that gets there — a
  // session also ends by itself (a silence timeout, the OS taking the
  // microphone), which would drop focus on <body>. So the transition
  // owns the hand-back, not the two buttons.
  const viewRef = React.useRef<HTMLDivElement>(null);
  const wasListening = React.useRef(false);
  React.useEffect(() => {
    if (listening) viewRef.current?.focus();
    else if (wasListening.current) returnToComposer();
    wasListening.current = listening;
  }, [listening, returnToComposer]);

  // Enter sends and Shift+Enter breaks the line, the way the chat's composer
  // and the Refine box already worked — this box alone wanted ⌘/Ctrl+Enter.
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const canRefine = value.trim().length >= 6 && !refining;
  const voiceError = voiceErrorMessage(voice.status);

  // While the microphone is open the card IS the listening view — the
  // textarea and its toolbar would otherwise be taking clicks that
  // belong to Cancel / Stop & review. The two overrides keep the card's
  // own box (1 px neutral border, 20 px padding) so nothing shifts on
  // the swap; the component's own default is a 1.5 px brand border at
  // 16 px, which is right where it isn't standing in for a card. The
  // view merges its classes through `cn()`, so these simply replace the
  // defaults — no `!` needed to out-shout them.
  if (listening) {
    return (
      <div ref={viewRef} tabIndex={-1} className="outline-none">
        <VoiceListening
          levels={voice.levels}
          interim={voice.interim}
          onCancel={voice.cancel}
          onStop={voice.stop}
          className="border border-border p-[20px]"
        />
      </div>
    );
  }

  return (
    <div>
      {/* Focus shows: the brand border the chat composer already wears. It
          was border → border, which changed nothing. */}
      {/* A picture can also be dropped on the card or pasted into the box —
          the brand border says a drop will land. */}
      <div
        className={cn(
          "rounded-2xl border bg-bg-surface focus-within:border-border-brand",
          dragging ? "border-dashed border-border-brand" : "border-border",
        )}
        onDragOver={
          takesImages
            ? (e) => {
                if (!Array.from(e.dataTransfer.types).includes("Files")) return;
                e.preventDefault();
                setDragging(true);
              }
            : undefined
        }
        onDragLeave={
          takesImages
            ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
              }
            : undefined
        }
        onDrop={
          takesImages
            ? (e) => {
                const file =
                  Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ?? e.dataTransfer.files[0];
                setDragging(false);
                if (!file) return;
                e.preventDefault();
                void takeImage(file);
              }
            : undefined
        }
      >
        {/* The picture going with the idea, small: a thumbnail, its own file
            name and the way to take it off (owner, 2026-11-01: no title or
            explanation beside it). */}
        {takesImages && inspiration && (
          <div className="px-[20px] pt-[16px]">
            <div className="inline-flex max-w-full items-center gap-[8px] rounded-lg border border-solid border-border py-[4px] pl-[4px] pr-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in this page */}
              <img
                src={inspiration.dataUrl}
                alt="Your inspiration image"
                width={32}
                height={24}
                className="h-[24px] w-[32px] shrink-0 rounded-sm object-cover"
              />
              <span className="min-w-0 truncate text-sm text-text-secondary">{inspiration.name}</span>
              <button
                type="button"
                onClick={dropImage}
                aria-label={`Remove ${inspiration.name}`}
                title="Remove"
                className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
              >
                <Icon icon={Cancel01Icon} size={14} />
              </button>
            </div>
          </div>
        )}
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          id={id}
          ref={localRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onPaste={
            takesImages
              ? (e) => {
                  // A pasted picture is an inspiration image; pasted text stays text.
                  const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
                  if (!file) return;
                  e.preventDefault();
                  void takeImage(file);
                }
              : undefined
          }
          placeholder={placeholder}
          rows={3}
          className="block w-full resize-none bg-transparent px-[20px] pt-[20px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary"
        />

        {/* Wraps on a phone: with Quality beside the mic the row is wider
            than the card, so Enhance and Generate take a second line, still
            at the right. On anything wider it is the one row it always was. */}
        <div className="flex flex-wrap items-center justify-between gap-[8px] px-[12px] pb-[12px] pt-[4px]">
          {/* The attach button is back now that the picture goes with the
              prompt: the main product's concept is drawn from it (owner,
              2026-11-01). It was taken out while the file went nowhere. */}
          <div className="flex shrink-0 items-center gap-[4px]">
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
            {takesImages && (
              <>
                <ToolbarIconButton
                  ariaLabel={inspiration ? "Change the inspiration image" : "Add an inspiration image"}
                  onClick={() => fileRef.current?.click()}
                  icon={ImageAdd01Icon}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept={INSPIRATION_TYPES.join(",")}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void takeImage(file);
                  }}
                />
              </>
            )}
            {mode === "ai" && (
              <QualityMenu value={quality} onChange={onQuality} variant="toolbar" price={buildPrice} />
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-[8px]">
            {mode === "ai" && (
              <RefineButton
                onClick={onRefine}
                refining={refining}
                disabled={!canRefine}
              />
            )}
            <SendButton
              onClick={() => void send()}
              submitting={submitting || uploading}
              hasText={value.trim().length > 0}
              canRender={canRender}
              label={sendLabel}
              emptyHint={emptyHint}
            />
          </div>
        </div>
      </div>

      {/* Why the last session produced nothing. It is derived from the
          hook's status, so the next successful start clears it. The
          region is always in the DOM — a live region mounted together
          with its text is announced by no screen reader, because there
          was nothing there to watch change. Empty it carries no margin,
          so nothing below it moves. */}
      <p
        role="status"
        className={cn(
          "px-[4px] text-sm text-text-error",
          (voiceError || imageError) && "mt-[10px]",
        )}
      >
        {voiceError ?? imageError}
      </p>
    </div>
  );
});

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

function RefineButton({
  onClick,
  refining,
  disabled,
}: {
  onClick: () => void;
  refining: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Enhance the prompt with AI"
      title="Rewrite your idea into a clearer, concrete brief"
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
        className={refining ? "animate-spin motion-reduce:animate-none" : undefined}
      />
      {refining ? "Enhancing…" : "Enhance"}
    </button>
  );
}

// Two states, one control. Nothing typed → a quiet square that says the
// box is the next step (disabled, so the click can't go nowhere). Text
// typed → the page's one primary button, labelled with what it will do.
// It always starts an AI chat: a project on Home, a product in a project's
// Add a product dialog (the caller's `sendLabel` says which).
function SendButton({
  onClick,
  submitting,
  hasText,
  label,
  emptyHint,
  canRender,
}: {
  canRender: boolean;
  onClick: () => void;
  submitting: boolean;
  hasText: boolean;
  label: string;
  emptyHint: string;
}) {
  if (!hasText || !canRender) {
    const why = !hasText
      ? emptyHint
      : "not enough credits to render a concept";
    return (
      <button
        type="button"
        disabled
        aria-disabled
        aria-label={`${label} — ${why}`}
        title={why.charAt(0).toUpperCase() + why.slice(1)}
        className="inline-flex h-[40px] w-[40px] cursor-not-allowed items-center justify-center rounded-lg bg-[var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
      >
        <Icon icon={AiMagicIcon} size={18} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      aria-busy={submitting}
      aria-label={submitting ? "Opening your concept chat…" : label}
      title={submitting ? "Opening your concept chat…" : label}
      className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-button-primary-bg px-[16px] text-md font-semibold text-button-primary-text outline-none transition-colors duration-fast hover:bg-button-primary-bg-hover focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-wait disabled:opacity-60"
    >
      {submitting ? "Opening…" : "Generate"}
      <span
        aria-hidden
        className={submitting ? "inline-flex motion-safe:animate-spin" : "inline-flex"}
      >
        <Icon
          icon={submitting ? Refresh01Icon : SparklesIcon}
          size={16}
          strokeWidth={1.8}
        />
      </span>
    </button>
  );
}
