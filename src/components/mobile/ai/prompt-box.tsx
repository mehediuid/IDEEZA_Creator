"use client";

// The Prompt Box (Figma "AI Generate Input", 01–04 and Voice prompt 01–07):
// the box the idea is typed or spoken into, with the mic, Enhance and send on
// its foot. One box for the AI tab's start and its chat, as the web has one
// composer (prompt-bar.tsx): Enter sends and Shift+Enter breaks the line, the
// box grows with its text, Enhance rewrites the draft through /api/refine (a
// brief for a new idea, one instruction for a change), and the mic dictates
// through the web's voice hook in the language set in Settings.
//
// Voice: the mic turns the box into its listening state (02): a brand dot
// and "Listening…", the words as they arrive (03), the waveform of the real
// microphone level, ✕ to throw the words away and ✓ to put them in the box
// (04). A browser that blocks the microphone shows "Microphone is off" over
// the box (07); one with no recogniser keeps the mic off with its reason.
// Every control is a 44 px tap target (the send and ✓ draw 32 inside it),
// 8 px apart.

import * as React from "react";
import {
  AiMagicIcon,
  ArrowUp02Icon,
  Cancel01Icon,
  MagicWand01Icon,
  Mic01Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { useVoiceInput } from "@/lib/voice/use-voice-input";
import { cn } from "@/lib/utils";
import { usePrePrompt } from "../kit/permission-sheet";
import { useOnline } from "../kit/states";
import { OFFLINE_REASON } from "./parts";
import { T } from "../type";

const BARS = 44;
/** The box grows to about five lines, then scrolls inside. */
const MAX_HEIGHT = 140;

export function PromptBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  sendKind = "generate",
  canSend,
  sendReason,
  disabled = false,
  busy = false,
  enhanceMode = "brief",
  extra,
  inputId,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called with the trimmed text; return false to keep the draft (nothing was started). */
  onSubmit: (text: string) => boolean | void;
  placeholder: string;
  /** The start screen generates (the AI sparkle); the chat sends (the arrow). */
  sendKind?: "generate" | "send";
  /** False keeps the send off, with `sendReason` said under the box when pressed. */
  canSend: boolean;
  sendReason?: string;
  /** The whole box is off (the question still open). */
  disabled?: boolean;
  busy?: boolean;
  enhanceMode?: "brief" | "change";
  /** Controls beside the mic (the start screen's Quality). */
  extra?: React.ReactNode;
  inputId?: string;
}) {
  const ta = React.useRef<HTMLTextAreaElement>(null);
  const [refining, setRefining] = React.useState(false);
  const [held, setHeld] = React.useState<string | null>(null);
  const [micOff, setMicOff] = React.useState(false);
  const [enhanceFailed, setEnhanceFailed] = React.useState(false);
  // Offline, nothing here reaches the model: send and Enhance are held with the reason.
  const online = useOnline();
  const mic = usePrePrompt("microphone", { body: "To describe your device by voice. You can always type it instead." });
  const valueRef = React.useRef(value);
  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const voice = useVoiceInput({
    onFinal: (text) => {
      const said = text.trim();
      if (!said) return;
      const now = valueRef.current.trim();
      onChange(now ? `${now} ${said}` : said);
      requestAnimationFrame(() => {
        const el = ta.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    },
  });
  const listening = voice.status === "listening";
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the recogniser's own status
    if (voice.status === "denied" || voice.status === "failed") setMicOff(true);
  }, [voice.status]);

  // The box grows with its text (04 "Bigger text box").
  React.useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_HEIGHT, el.scrollHeight)}px`;
  }, [value, listening]);

  const trimmed = value.trim();
  const ready = !!trimmed && canSend && online && !disabled && !busy && !refining;

  const send = () => {
    if (busy || disabled) return;
    if (!trimmed) {
      ta.current?.focus();
      return;
    }
    if (!online) {
      setHeld(OFFLINE_REASON);
      return;
    }
    if (!canSend) {
      setHeld(sendReason ?? null);
      return;
    }
    const kept = onSubmit(trimmed);
    if (kept !== false) onChange("");
  };

  const enhance = async () => {
    if (!trimmed || refining || disabled || !online) return;
    setRefining(true);
    setEnhanceFailed(false);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, mode: enhanceMode }),
      });
      const data = (await res.json()) as { refined?: string };
      if (!res.ok || !data.refined?.trim()) throw new Error("no rewrite");
      onChange(data.refined.trim());
      requestAnimationFrame(() => ta.current?.focus());
    } catch {
      // The draft stays as it was, and the maker is told so.
      setEnhanceFailed(true);
    } finally {
      setRefining(false);
    }
  };

  // KIT-PM-03: the first time, a pre-prompt says why before the browser asks.
  const startVoice = () => {
    setMicOff(false);
    mic.ask(() => voice.start());
  };

  const recorded = voice.levels.length > BARS ? voice.levels.slice(-BARS) : voice.levels;

  return (
    <div className="flex flex-col gap-4 px-8">
      {micOff && (
        <Banner
          tone="attention"
          title="Microphone is off"
          action={
            <button type="button" onClick={startVoice} className="-my-3 inline-flex min-h-[44px] items-center hover:underline">
              Try again
            </button>
          }
        >
          Turn it on in your browser&apos;s settings to speak your idea. You can still type it.
        </Banner>
      )}
      <div
        className={cn(
          "flex flex-col gap-8 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-bg-surface p-8 transition-colors duration-fast",
          disabled ? "border-border-subtle" : "border-[var(--color-input-border-focus)]",
        )}
      >
        {listening ? (
          <div className="flex min-h-[24px] flex-col gap-3" role="status" aria-live="polite">
            <p className={cn(T.body, "inline-flex items-center gap-3")}>
              <span aria-hidden className="size-[8px] rounded-full bg-bg-brand motion-safe:animate-pulse" />
              Listening…
            </p>
            {voice.interim.trim() && <p className={cn(T.body, "text-text-primary")}>{voice.interim.trim()}</p>}
          </div>
        ) : (
          <textarea
            ref={ta}
            id={inputId}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              if (held) setHeld(null);
              if (enhanceFailed) setEnhanceFailed(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className={cn(T.bodyLg, "block min-h-[24px] w-full resize-none bg-transparent outline-none placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed")}
          />
        )}

        {listening ? (
          <div className="flex items-center gap-6">
            {/* 32 px drawn, 44 px to tap (lens 16). */}
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Cancel — throw away what was said"
              className="group -my-3 -ml-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none"
            >
              <span className="inline-flex size-[32px] items-center justify-center rounded-full transition-colors duration-fast group-hover:bg-bg-subtle group-active:bg-bg-subtle group-focus-visible:ring-2 group-focus-visible:ring-border-focus">
                <span className="inline-flex rounded-full border-[length:var(--border-width-1-5)] border-solid border-current p-1">
                  <Icon icon={Cancel01Icon} size={12} />
                </span>
              </span>
            </button>
            <span aria-hidden className="flex h-[24px] min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
              {Array.from({ length: BARS }, (_, i) => {
                const lvl = recorded[i];
                return (
                  <span
                    key={i}
                    className={cn("w-[2px] shrink-0 rounded-full", lvl === undefined ? "bg-bg-brand-subtle" : "bg-bg-brand")}
                    style={{ height: `${lvl === undefined ? 4 : Math.max(3, Math.min(24, 3 + lvl * 60))}px` }}
                  />
                );
              })}
            </span>
            <button
              type="button"
              onClick={voice.stop}
              aria-label="Done — put what was said in the box"
              className="group -my-3 -mr-3 inline-flex size-[44px] shrink-0 items-center justify-center outline-none"
            >
              <span className="inline-flex size-[32px] items-center justify-center rounded-md bg-bg-brand text-[color:var(--color-icon-on-brand)] transition-colors duration-fast group-hover:bg-bg-brand-hover group-active:bg-bg-brand-hover group-focus-visible:ring-2 group-focus-visible:ring-border-focus">
                <Icon icon={Tick02Icon} size={18} />
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={startVoice}
              disabled={disabled || !voice.supported}
              aria-label={voice.supported ? "Speak your idea" : "Voice input isn't available in this browser"}
              title={voice.supported ? undefined : "Voice input isn't available in this browser"}
              className="-my-3 -ml-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-[color:var(--color-icon-disabled)] disabled:hover:bg-transparent"
            >
              <Icon icon={Mic01Icon} size={20} />
            </button>
            {extra}
            <span className="flex-1" />
            <button
              type="button"
              onClick={enhance}
              disabled={disabled || !trimmed || refining || !online}
              aria-busy={refining || undefined}
              title={!online ? OFFLINE_REASON : undefined}
              className={cn(
                T.body, "-my-3 inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2 outline-none transition-colors duration-fast active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:active:bg-transparent",
                refining ? "text-text-brand" : "text-text-primary disabled:text-text-disabled",
              )}
            >
              <span className={cn("inline-flex shrink-0", refining && "motion-safe:animate-spin")}>
                <Icon icon={refining ? Refresh01Icon : MagicWand01Icon} size={16} />
              </span>
              Enhance
            </button>
            <button
              type="button"
              onClick={send}
              aria-disabled={!ready || undefined}
              aria-busy={busy || undefined}
              aria-label={sendKind === "generate" ? "Generate" : "Send"}
              className={cn("group -my-3 -mr-3 inline-flex size-[44px] shrink-0 items-center justify-center outline-none", !(ready || busy) && "cursor-not-allowed")}
            >
              <span
                className={cn(
                  "inline-flex size-[32px] items-center justify-center rounded-md transition-colors duration-fast group-focus-visible:ring-2 group-focus-visible:ring-border-focus",
                  ready || busy
                    ? "bg-bg-brand text-[color:var(--color-icon-on-brand)] group-hover:bg-bg-brand-hover group-active:bg-bg-brand-hover"
                    : "bg-bg-subtle text-[color:var(--color-icon-disabled)]",
                )}
              >
                <span className={cn("inline-flex", busy && "motion-safe:animate-spin")}>
                  <Icon icon={busy ? Refresh01Icon : sendKind === "generate" ? AiMagicIcon : ArrowUp02Icon} size={18} />
                </span>
              </span>
            </button>
          </div>
        )}
      </div>
      {enhanceFailed && (
        <p role="status" className={T.meta}>
          Couldn&apos;t enhance — your words are unchanged.
        </p>
      )}
      {held && (
        <p role="status" className={cn(T.meta, "text-text-error")}>
          {held}
        </p>
      )}
      {mic.sheet}
    </div>
  );
}
