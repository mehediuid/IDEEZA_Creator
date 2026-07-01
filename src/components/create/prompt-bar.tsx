"use client";

// PromptBar — bottom-pinned chat input. Same toolbar shape as the home
// hero prompt card so the chat feels like a continuation of the home
// flow. Auto-refine + voice + attach are present per spec §4a.

import * as React from "react";
import {
  ArrowRight01Icon,
  Attachment01Icon,
  MagicWand01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

const REFINE_STORAGE_KEY = "ideeza:dashboard:hero:refine-on";

export function PromptBar({
  onSubmit,
  busy,
  placeholder = "Describe a change, or ask for a fresh take…",
}: {
  onSubmit: (text: string) => void;
  busy: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState("");
  const [refineOn, setRefineOn] = React.useState(true);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Share the auto-refine preference with the home hero.
  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(REFINE_STORAGE_KEY);
      if (v === "0") setRefineOn(false);
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      window.localStorage.setItem(REFINE_STORAGE_KEY, refineOn ? "1" : "0");
    } catch {}
  }, [refineOn]);

  // Auto-grow the textarea up to ~5 lines.
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
    setValue("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-bg-surface focus-within:border-border-strong">
      <label htmlFor="chat-prompt" className="sr-only">
        Continue the concept conversation
      </label>
      <textarea
        id="chat-prompt"
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={2}
        disabled={busy}
        className="block w-full resize-none bg-transparent px-[20px] pt-[16px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-[8px] px-[12px] pb-[12px] pt-[4px]">
        <div className="flex items-center gap-[4px]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => (e.target.value = "")}
          />
          <ToolbarButton
            ariaLabel="Attach a reference image"
            onClick={() => fileRef.current?.click()}
          >
            <Icon icon={Attachment01Icon} />
          </ToolbarButton>
          <ToolbarButton ariaLabel="Use voice input">
            <Icon icon={Mic01Icon} />
          </ToolbarButton>
        </div>
        <div className="flex items-center gap-[8px]">
          <RefinePill on={refineOn} onClick={() => setRefineOn((v) => !v)} />
          <button
            type="button"
            onClick={send}
            disabled={busy || !value.trim()}
            aria-label="Send"
            title="Send (Enter)"
            className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-violet-600 text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {children}
    </button>
  );
}

function RefinePill({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "Enhance prompt is on" : "Enhance prompt is off"}
      className={[
        "inline-flex h-[40px] items-center gap-[8px] rounded-lg px-[12px] text-sm font-medium outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus",
        on
          ? "bg-bg-brand-subtle text-text-brand"
          : "text-text-secondary hover:bg-bg-surface-raised",
      ].join(" ")}
    >
      <Icon icon={MagicWand01Icon} />
      Enhance prompt
    </button>
  );
}
