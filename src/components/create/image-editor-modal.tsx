"use client";

// ImageEditorModal — full-screen concept editor (Google "Describe edits" style).
//
// Opened from a concept card's Refine action. Shows the chosen image large; the
// "Describe edits" bar at the bottom evolves THAT image, keeping the same
// concept (the orchestrator drives the refine). Submitting an edit CLOSES the
// editor — the refine then lands in the chat thread, where the user watches it
// render and can reopen Refine on the result to iterate.
//
// A11y: role=dialog + aria-modal, Esc + click-outside close, the edit box is
// focused on open, every control is labelled, voice has a keyboard/click path.

import * as React from "react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function ImageEditorModal({
  open,
  image,
  title,
  conceptNumber,
  onClose,
  onSubmitEdit,
}: {
  open: boolean;
  image: string | null;
  title: string;
  conceptNumber: number;
  onClose: () => void;
  onSubmitEdit: (text: string) => void;
}) {
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const textRef = React.useRef(text);
  textRef.current = text;
  const [voiceSupported, setVoiceSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recogRef = React.useRef<SpeechRecognitionLike | null>(null);

  // Focus the edit box on open.
  React.useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Esc closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-grow the edit box.
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  // Web Speech API — append transcript to the edit box.
  React.useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const SRCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined;
    if (!SRCtor) return;
    setVoiceSupported(true);
    const r = new SRCtor();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += `${e.results[i]?.[0]?.transcript ?? ""} `;
      }
      transcript = transcript.trim();
      if (!transcript) return;
      const cur = textRef.current.trim();
      setText(cur ? `${cur} ${transcript}` : transcript);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {}
    };
  }, []);

  const toggleVoice = () => {
    const r = recogRef.current;
    if (!r) return;
    if (listening) {
      try {
        r.stop();
      } catch {}
      setListening(false);
      return;
    }
    try {
      r.start();
      setListening(true);
      inputRef.current?.focus();
    } catch {
      setListening(false);
    }
  };

  if (!open) return null;

  const canSubmit = text.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    onSubmitEdit(text.trim());
    setText("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Refine Concept ${conceptNumber}`}
      className="fixed inset-0 z-modal flex flex-col bg-bg-page/95 backdrop-blur-sm"
    >
      {/* Top bar */}
      <header className="flex items-center gap-[12px] px-[20px] py-[16px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={20} />
        </button>
        <p className="min-w-0 flex-1 truncate text-md font-medium text-text-primary">
          {title}
        </p>
        <span className="shrink-0 rounded-full bg-bg-brand-subtle px-[10px] py-[4px] text-2xs font-bold uppercase tracking-wider text-text-brand">
          Concept {conceptNumber}
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
              alt={`Concept ${conceptNumber}: ${title}`}
              className="max-h-[calc(100dvh-220px)] w-auto rounded-xl object-contain"
            />
          </div>
        )}
      </div>

      {/* Describe-edits bar */}
      <div className="px-[24px] pb-[28px] pt-[12px]">
        <div className="mx-auto flex w-full max-w-[760px] items-end gap-[6px] rounded-3xl border border-border bg-bg-surface p-[8px]">
          <label htmlFor="img-edit" className="sr-only">
            Describe the edit you want
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
            placeholder="Describe edits"
            className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent px-[12px] py-[8px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-60"
          />
          <button
            type="button"
            onClick={voiceSupported ? toggleVoice : undefined}
            disabled={!voiceSupported}
            aria-label={
              !voiceSupported
                ? "Voice input isn't supported in this browser"
                : listening
                  ? "Stop voice input"
                  : "Use voice input"
            }
            aria-pressed={listening}
            title="Voice input"
            className={[
              "inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-fast",
              "focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40",
              listening
                ? "bg-bg-brand-subtle text-text-brand"
                : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
            ].join(" ")}
          >
            <Icon icon={Mic01Icon} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Apply edit"
            title="Apply edit"
            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-violet-600 text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-[8px] text-center text-2xs font-medium text-text-tertiary">
          Describe a change — it evolves this image, keeping the same concept.
          The result lands in your chat below.
        </p>
      </div>
    </div>
  );
}
