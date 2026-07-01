"use client";

// WorkspacePrompt — the entire main content of the dashboard. One job:
// help the user describe an electronics project and start the build.
// Uses Hugeicons (IDEEZA DS icon set) via the shared `Icon` wrapper.
//
// Sizing note: the Tailwind preset overrides `spacing` with DS tokens,
// so component dimensions use explicit arbitrary px values for clarity.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckListIcon,
  CheckmarkBadge01Icon,
  CpuIcon,
  DeliveryBox01Icon,
  DropletIcon,
  IdeaIcon,
  MagicWand01Icon,
  Mic01Icon,
  Refresh01Icon,
  SparklesIcon,
  SquareUnlock01Icon,
  TemperatureIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { useCreateHistory } from "@/lib/create/history";
import { BuildManuallyInfo } from "./build-manually-info";
import { ProjectInfoModal } from "./project-info-modal";
import { Icon, type IconValue } from "./icon";

type Mode = "ai" | "manual";

const CHIPS = [
  "Smart plant watering system",
  "Bluetooth temperature logger",
  "Gesture-controlled LED strip",
];

type ExampleCard = {
  id: string;
  title: string;
  tagline: string;
  category: string;
  parts: number;
  icon: IconValue;
  image?: string;
};

const EXAMPLES: ExampleCard[] = [
  {
    id: "smart-plant",
    title: "Smart plant monitor",
    tagline: "Water when dry.",
    category: "IoT · Soil sensor",
    parts: 12,
    icon: DropletIcon,
    image: "/images/browse-project/smart-plant.png",
  },
  {
    id: "ble-logger",
    title: "BLE temperature logger",
    tagline: "Track every degree.",
    category: "Wearable · Bluetooth",
    parts: 9,
    icon: TemperatureIcon,
    image: "/images/browse-project/ble-logger.png",
  },
  {
    id: "gesture-led",
    title: "Gesture LED strip",
    tagline: "Wave to light.",
    category: "Home · Vision",
    parts: 15,
    icon: IdeaIcon,
    image: "/images/browse-project/gesture-led.png",
  },
  {
    id: "heart-band",
    title: "Heart-rate band",
    tagline: "Pulse on your wrist.",
    category: "Wearable · Health",
    parts: 8,
    icon: CpuIcon,
    image: "/images/browse-project/heart-band.png",
  },
];

const AI_PLACEHOLDER =
  "A smart plant watering system that alerts me when the soil is dry";

export function WorkspacePrompt() {
  const router = useRouter();
  const { createChat } = useCreateHistory();
  const [mode, setMode] = React.useState<Mode>("ai");
  const [prompt, setPrompt] = React.useState("");
  const [refining, setRefining] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  // Manual-mode modal lives at this level so a click on "Create
  // Project" inside BuildManuallyInfo can open it, and the dropdown
  // inside it reads from ManualProjectsProvider.
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // AI mode is the only mode that uses the prompt textarea today. The
  // manual path is driven by the BuildManuallyInfo panel + the
  // Project Information modal mounted at the bottom of this component.
  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      taRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const session = createChat(trimmed);
      router.push(`/chat/${session.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Enhance prompt — rewrites the rough idea into a concrete brief via a free
  // LLM (server-side /api/refine → Pollinations), then drops it back in the box.
  const handleRefine = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || refining) return;
    setRefining(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as { refined?: string };
      if (data.refined && data.refined.trim()) {
        setPrompt(data.refined.trim());
        requestAnimationFrame(() => taRef.current?.focus());
      }
    } catch {
      // keep the original prompt on failure
    } finally {
      setRefining(false);
    }
  };

  const pickChip = (text: string) => {
    setPrompt(text);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // Manual mode hides the prompt card entirely, so placeholder is only
  // used for AI mode now.
  const placeholder = AI_PLACEHOLDER;

  return (
    <div className="flex min-h-full w-full flex-col pb-[64px]">
      {/* Hero — centered narrow column. */}
      <div className="mx-auto w-full max-w-[760px] px-[32px] pt-[64px]">
        <h1 className="text-center text-5xl font-bold tracking-tight text-text-primary">
          What will you build today?
        </h1>
        <p className="mx-auto mt-[16px] max-w-[560px] text-center text-md leading-relaxed text-text-secondary">
          Describe your electronics idea. AI drafts the schematic, parts list,
          and build steps — ready to mint on-chain when you are.
        </p>

        <div className="mt-[40px] flex justify-center">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div className="mt-[24px]">
          {mode === "ai" ? (
            <PromptCard
              ref={taRef}
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              submitting={submitting}
              placeholder={placeholder}
              mode={mode}
              onRefine={handleRefine}
              refining={refining}
            />
          ) : (
            <BuildManuallyInfo onCreate={() => setProjectModalOpen(true)} />
          )}
        </div>

        {/* Chips suggest prompts — only meaningful in AI mode. */}
        {mode === "ai" && (
          <div className="mt-[16px]">
            <Chips items={CHIPS} onPick={pickChip} />
          </div>
        )}

        {/* Unified footer hints — "what you'll get" + reassurance. */}
        <div className="mt-[48px] flex flex-col items-center gap-[16px]">
          <WhatYouGet />
          <Reassurance />
        </div>
      </div>

      {/* Examples — full main width, capped at 1400px. */}
      <Examples items={EXAMPLES} />

      {/* Manual mode → Create Project → opens this modal. Closing
          dismisses; submitting persists the project and routes into
          the editor (handled inside the modal). */}
      <ProjectInfoModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </div>
  );
}

// ────────────────────────────────── parts ───────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How you want to start the project"
      className="inline-flex h-[48px] items-center gap-[4px] rounded-full border border-border bg-bg-surface p-[4px]"
    >
      <ModeButton
        active={mode === "ai"}
        onClick={() => onChange("ai")}
        icon={SparklesIcon}
        label="Generate with AI"
      />
      <ModeButton
        active={mode === "manual"}
        onClick={() => onChange("manual")}
        icon={Wrench01Icon}
        label="Build manually"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconValue;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[
        "inline-flex h-[40px] items-center gap-[8px] rounded-full px-[20px] text-md font-semibold outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus",
        active
          ? "bg-bg-surface-raised text-text-primary"
          : "text-text-secondary hover:text-text-primary",
      ].join(" ")}
    >
      <Icon icon={icon} />
      {label}
    </button>
  );
}

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

const PromptCard = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    submitting: boolean;
    placeholder: string;
    mode: Mode;
    onRefine: () => void;
    refining: boolean;
  }
>(function PromptCard(
  { value, onChange, onSubmit, submitting, placeholder, mode, onRefine, refining },
  ref,
) {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useImperativeHandle(
    ref,
    () => localRef.current as HTMLTextAreaElement,
    [],
  );
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = React.useState<string | null>(null);

  // Latest value / onChange for the (mount-once) speech callback.
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const [voiceSupported, setVoiceSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recogRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  // Web Speech API — transcribe speech and append it to the prompt.
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
      const cur = valueRef.current.trim();
      onChangeRef.current(cur ? `${cur} ${transcript}` : transcript);
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
      localRef.current?.focus();
    } catch {
      setListening(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAttachment(f.name);
    e.target.value = "";
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canRefine = value.trim().length >= 6 && !refining;

  return (
    <div className="rounded-2xl border border-border bg-bg-surface focus-within:border-border">
      <label htmlFor="ws-prompt" className="sr-only">
        Describe your electronics project
      </label>
      <textarea
        id="ws-prompt"
        ref={localRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={3}
        className="block w-full resize-none bg-transparent px-[20px] pt-[20px] text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary"
      />

      {attachment && (
        <div className="px-[20px] pb-[4px]">
          <span className="inline-flex max-w-full items-center gap-[8px] rounded-lg border border-border bg-bg-surface-raised py-[6px] pl-[10px] pr-[6px] text-sm text-text-secondary">
            <Icon icon={Attachment01Icon} size={14} />
            <span className="max-w-[280px] truncate">{attachment}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Remove attachment"
              className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-[8px] px-[12px] pb-[12px] pt-[4px]">
        <div className="flex items-center gap-[4px]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={onPickFile}
          />
          <ToolbarIconButton
            ariaLabel="Attach a reference image"
            onClick={() => fileRef.current?.click()}
            icon={Attachment01Icon}
          />
          <ToolbarIconButton
            ariaLabel={
              !voiceSupported
                ? "Voice input isn't supported in this browser"
                : listening
                  ? "Stop voice input"
                  : "Use voice input"
            }
            onClick={voiceSupported ? toggleVoice : undefined}
            icon={Mic01Icon}
            active={listening}
            disabled={!voiceSupported}
          />
        </div>

        <div className="flex items-center gap-[8px]">
          {mode === "ai" && (
            <RefineButton
              onClick={onRefine}
              refining={refining}
              disabled={!canRefine}
            />
          )}
          <SendButton onClick={onSubmit} disabled={submitting} mode={mode} />
        </div>
      </div>
    </div>
  );
});

function ToolbarIconButton({
  ariaLabel,
  onClick,
  icon,
  active,
  disabled,
}: {
  ariaLabel: string;
  onClick?: () => void;
  icon: IconValue;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={ariaLabel}
      className={[
        "inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-bg-brand-subtle text-text-brand"
          : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
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
      {refining ? "Enhancing…" : "Enhance prompt"}
    </button>
  );
}

function SendButton({
  onClick,
  disabled,
  mode,
}: {
  onClick: () => void;
  disabled: boolean;
  mode: Mode;
}) {
  const label = mode === "ai" ? "Generate project" : "Open manual builder";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-violet-600 text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-wait disabled:opacity-60"
    >
      <Icon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
    </button>
  );
}

function Chips({
  items,
  onPick,
}: {
  items: readonly string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-[6px]">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="inline-flex h-[32px] items-center gap-[6px] rounded-md border border-border bg-bg-surface px-[12px] text-sm font-regular text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={SparklesIcon} size={14} />
          </span>
          {t}
        </button>
      ))}
      <button
        type="button"
        aria-label="Shuffle example ideas"
        className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-md border border-border bg-bg-surface text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Refresh01Icon} size={14} />
      </button>
    </div>
  );
}

function WhatYouGet() {
  const items: Array<{ icon: IconValue; label: string }> = [
    { icon: Activity01Icon, label: "Schematic" },
    { icon: DeliveryBox01Icon, label: "Parts list" },
    { icon: CheckListIcon, label: "Build steps" },
  ];
  return (
    <div
      aria-label="Each AI generation produces a schematic, a parts list, and build steps"
      className="flex flex-wrap items-center justify-center gap-[6px]"
    >
      <span className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
        You&apos;ll get
      </span>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 && (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-[6px] text-sm font-regular text-text-secondary">
            <span aria-hidden className="text-text-tertiary">
              <Icon icon={it.icon} size={14} />
            </span>
            <span className="text-text-primary">{it.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Reassurance() {
  return (
    <p className="inline-flex items-center gap-[8px] text-sm font-regular text-text-tertiary">
      <span aria-hidden>
        <Icon icon={SquareUnlock01Icon} size={14} />
      </span>
      No wallet or KYC needed to start — only when you sell.
    </p>
  );
}

function Examples({ items }: { items: ExampleCard[] }) {
  return (
    <section
      aria-labelledby="examples-heading"
      className="mt-[64px] w-full px-[40px]"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-[20px] flex items-end justify-between gap-[16px]">
          <h2
            id="examples-heading"
            className="inline-flex h-[36px] items-center rounded-lg bg-bg-surface px-[16px] text-md font-semibold text-text-primary"
          >
            Browse Project
          </h2>
          <a
            href="/marketplace"
            className="inline-flex h-[36px] items-center gap-[8px] rounded-lg px-[12px] text-md font-semibold text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Browse all
            <Icon icon={ArrowUpRight01Icon} />
          </a>
        </header>

        <ul
          role="list"
          className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4"
        >
          {items.map((p) => (
            <li key={p.id}>
              <ExampleTile item={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ExampleTile({ item }: { item: ExampleCard }) {
  return (
    <a
      href={`/marketplace/${item.id}`}
      aria-label={`${item.title} — ${item.category}`}
      className="group block overflow-hidden rounded-xl border border-border bg-bg-surface outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {/* Image header — clean, no text or badge overlays. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-bg-surface-raised">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={`${item.title} — ${item.tagline}`}
            className="h-full w-full object-cover transition-transform duration-normal ease-standard group-hover:scale-[1.02]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-text-tertiary"
          >
            <Icon icon={item.icon} size={24} />
          </div>
        )}
      </div>

      {/* Card body — product name + Minted + metadata. */}
      <div className="px-[20px] py-[16px]">
        <div className="flex items-center justify-between gap-[12px]">
          <p className="truncate text-md font-semibold text-text-primary">
            {item.title}
          </p>
          <span className="inline-flex shrink-0 items-center gap-[4px] text-2xs font-bold uppercase tracking-wider text-text-brand">
            <Icon icon={CheckmarkBadge01Icon} size={12} />
            Minted
          </span>
        </div>
        <p className="mt-[4px] truncate text-sm text-text-tertiary">
          {item.category} · {item.parts} parts
        </p>
      </div>
    </a>
  );
}
