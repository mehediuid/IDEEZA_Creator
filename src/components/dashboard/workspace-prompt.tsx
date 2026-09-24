"use client";

// WorkspacePrompt — the entire main content of the dashboard. One job:
// help the user describe an electronics project and start the build.
// Uses Hugeicons (IDEEZA DS icon set) via the shared `Icon` wrapper.
//
// Sizing note: the Tailwind preset overrides `spacing` with DS tokens,
// so component dimensions use explicit arbitrary px values for clarity.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowRight01Icon,
  CodeIcon,
  CpuIcon,
  CubeIcon,
  ElectricWireIcon,
  FavouriteIcon,
  PackageIcon,
  MagicWand01Icon,
  Mic01Icon,
  PlusSignIcon,
  Refresh01Icon,
  SparklesIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  ITEM_KINDS,
  ITEM_LABELS,
  useCreateHistory,
  type BuildItemKind,
} from "@/lib/create/history";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { useVoiceInput, voiceErrorMessage } from "@/lib/voice/use-voice-input";
import { VoiceListening } from "@/components/voice/voice-listening";
import { formatCount, PROJECTS, type Project } from "@/lib/feed";
import { MintedBadge } from "@/components/newsfeed/minted-badge";
import { BuildManuallyInfo } from "./build-manually-info";
import { ProjectInfoModal } from "./project-info-modal";
import { Icon, type IconValue } from "./icon";

type Mode = "ai" | "manual";

// Nine ideas, three on screen. Shuffle rotates the window through the
// pool, so the button really changes what is offered instead of
// re-rendering the same three.
const CHIP_POOL = [
  "Voice-controlled lamp",
  "NFC crypto tap card",
  "Solar-powered charger",
  "Smart plant waterer",
  "Bluetooth door sensor",
  "E-ink weather display",
  "USB-C power bank",
  "Gesture-controlled LED strip",
  "Pocket air-quality monitor",
];
const CHIPS_SHOWN = 3;

// "Get inspired" shows real community projects — the same feed dataset the
// Innovations grid reads — so every card links to a page that exists and
// every count on it is the project's own.
const INSPIRATION: Project[] = PROJECTS.slice(0, 4);

const AI_PLACEHOLDER = "Describe your electronics project...";

export function WorkspacePrompt() {
  const router = useRouter();
  const { createChat } = useCreateHistory();
  // The first concept costs a render like any other, so the send is shut
  // here rather than letting the chat open and fail its opening turn.
  // The rendered balance, not canAfford(): the provider refreshes that ref
  // in its own effect, which runs after this child's.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const canRender = !creditsHydrated || balance >= CONCEPT_COST;
  const [mode, setMode] = React.useState<Mode>("ai");
  const [prompt, setPrompt] = React.useState("");
  const [refining, setRefining] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  // Manual-mode modal lives at this level so a click on "Create
  // Project" inside BuildManuallyInfo can open it, and the dropdown
  // inside it reads from ManualProjectsProvider.
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [chipOffset, setChipOffset] = React.useState(0);
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
    if (!canRender) return;
    // Busy, and it STAYS busy. The clear used to sit in a `finally` beside
    // a `router.push` that is not awaited, so both updates landed in one
    // tick, React resolved the queue back to false and bailed out: the
    // button never painted its busy state once. Meanwhile the push fetches
    // a route payload — hundreds of milliseconds, seconds in dev — and the
    // concept render behind it takes the better part of a minute, so the
    // very first press in the product looked like it had missed. This
    // component unmounts on the navigation, so there is nothing to clear;
    // if the push throws, the catch hands the control back.
    setSubmitting(true);
    try {
      const session = createChat(trimmed);
      router.push(`/chat/${session.id}`);
    } catch {
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

  const chips = React.useMemo(
    () =>
      Array.from(
        { length: CHIPS_SHOWN },
        (_, i) => CHIP_POOL[(chipOffset + i) % CHIP_POOL.length],
      ),
    [chipOffset],
  );

  return (
    <div className="relative flex min-h-full w-full flex-col pb-[64px]">
      <HeroGlow />

      {/* Hero — centered narrow column. */}
      <div className="relative mx-auto w-full max-w-[760px] px-[32px] pt-[64px]">
        <h1 className="text-center text-5xl font-bold tracking-tight text-text-primary">
          What will you build today?
        </h1>
        <p className="mx-auto mt-[16px] max-w-[560px] text-center text-md leading-relaxed text-text-secondary">
          Turn your electronics idea into a buildable design — with AI or on
          your own. No wallet or KYC to start.
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
              canRender={canRender}
            />
          ) : (
            <BuildManuallyInfo onCreate={() => setProjectModalOpen(true)} />
          )}
        </div>

        {/* Chips suggest prompts — only meaningful in AI mode. */}
        {mode === "ai" && (
          <div className="mt-[16px]">
            <Chips
              items={chips}
              onPick={pickChip}
              onShuffle={() =>
                setChipOffset((o) => (o + CHIPS_SHOWN) % CHIP_POOL.length)
              }
            />
          </div>
        )}

        <div className="mt-[48px] flex flex-col items-center">
          <WhatYouGet />
        </div>
      </div>

      {/* Examples — full main width, capped at 1400px. */}
      <Examples items={INSPIRATION} />

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

// The soft violet wash behind the hero — still, because it is the ground the
// headline sits on. Over it, one small light travels along the top edge and
// fades at both ends, so the loop has no seam. Decorative, never in the way:
// nothing below the hero moves, and under reduced motion the light is simply
// absent, leaving the wash exactly as it was.
function HeroGlow() {
  return (
    <div
      aria-hidden
      // Tall enough that the clip falls where the glow has already reached
      // the page's own colour. `overflow-hidden` is here for the travelling
      // light, which crosses ±42vw and would otherwise widen the page — but
      // it was cutting the wash at 420px while a 120px blur was still 33
      // levels above the background, leaving a hard rule across the hero.
      className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden"
    >
      <div className="flex justify-center">
        <div
          className="h-[420px] w-[1100px] max-w-[140%] -translate-y-[38%] rounded-full opacity-25 blur-[120px]"
          style={{ backgroundImage: "var(--gradient-ai)" }}
        />
      </div>
      <div
        className="ix-hero-sweep absolute left-1/2 top-0 h-[190px] w-[380px] rounded-full blur-[90px]"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      />
    </div>
  );
}

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
        label="Generate with AI"
      />
      <ModeButton
        active={mode === "manual"}
        onClick={() => onChange("manual")}
        label="Build manually"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[
        "inline-flex h-[40px] items-center rounded-full px-[20px] text-md font-semibold outline-none transition-colors duration-fast",
        "focus-visible:ring-2 focus-visible:ring-border-focus",
        active
          ? "bg-bg-surface-raised text-text-primary"
          : "text-text-secondary hover:text-text-primary",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

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
    /** False when the balance cannot cover one concept render. */
    canRender: boolean;
  }
>(function PromptCard(
  { value, onChange, onSubmit, submitting, placeholder, mode, onRefine, refining, canRender },
  ref,
) {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
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

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
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

        <div className="flex items-center justify-between gap-[8px] px-[12px] pb-[12px] pt-[4px]">
          <div className="flex items-center gap-[4px]">
            <ToolbarIconButton
              ariaLabel="Attach a reference image — not sent to the generator yet"
              icon={PlusSignIcon}
              disabled
            />
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
            {mode === "ai" && (
              <RefineButton
                onClick={onRefine}
                refining={refining}
                disabled={!canRefine}
              />
            )}
            <SendButton
              onClick={onSubmit}
              submitting={submitting}
              hasText={value.trim().length > 0}
              canRender={canRender}
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
          voiceError && "mt-[10px]",
        )}
      >
        {voiceError}
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
// PromptCard only renders in AI mode (WorkspacePrompt swaps to
// BuildManuallyInfo for manual mode), so this always generates a project.
function SendButton({
  onClick,
  submitting,
  hasText,
  canRender,
}: {
  canRender: boolean;
  onClick: () => void;
  submitting: boolean;
  hasText: boolean;
}) {
  const label = "Generate project";

  if (!hasText || !canRender) {
    const why = !hasText
      ? "describe your project first"
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

function Chips({
  items,
  onPick,
  onShuffle,
}: {
  items: readonly string[];
  onPick: (text: string) => void;
  onShuffle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-[8px]">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="inline-flex h-[32px] items-center rounded-full bg-bg-subtle px-[14px] text-sm font-regular text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {t}
        </button>
      ))}
      <button
        type="button"
        onClick={onShuffle}
        aria-label="Show three other ideas"
        title="Show three other ideas"
        className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full bg-bg-subtle text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Refresh01Icon} size={14} />
      </button>
    </div>
  );
}

// What a build really delivers — the same five pieces, in the same order and
// with the same names, as the build's own tabs. This used to promise
// "Schematic · Parts list · Build steps", which is not what arrives.
const DELIVERABLE_ICON: Record<BuildItemKind, IconValue> = {
  "3d": CubeIcon,
  pcb: CpuIcon,
  code: CodeIcon,
  wiring: ElectricWireIcon,
  parts: PackageIcon,
};

function WhatYouGet() {
  return (
    <div
      aria-label={`Each build delivers: ${ITEM_KINDS.map((k) => ITEM_LABELS[k]).join(", ")}`}
      className="flex flex-wrap items-center justify-center gap-[6px]"
    >
      <span className="text-sm text-text-tertiary">You&apos;ll get</span>
      {ITEM_KINDS.map((kind, i) => (
        <React.Fragment key={kind}>
          {i > 0 && (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-[6px] text-sm font-regular text-text-secondary">
            <span aria-hidden className="text-text-tertiary">
              <Icon icon={DELIVERABLE_ICON[kind]} size={14} />
            </span>
            <span className="text-text-primary">{ITEM_LABELS[kind]}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Examples({ items }: { items: Project[] }) {
  return (
    <section
      aria-labelledby="examples-heading"
      className="mt-[64px] w-full px-[40px]"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-[20px] flex items-end justify-between gap-[16px]">
          <h2
            id="examples-heading"
            className="text-lg font-bold text-text-primary"
          >
            Get inspired
          </h2>
          <Link
            href="/innovations"
            className="inline-flex h-[36px] items-center gap-[6px] rounded-lg px-[12px] text-md font-semibold text-text-brand outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Browse all
            <Icon icon={ArrowRight01Icon} />
          </Link>
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

function ExampleTile({ item }: { item: Project }) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <Link
      href={`/innovations/${item.slug}`}
      aria-label={`Open project ${item.title} by ${item.creator.name}`}
      className="group block overflow-hidden rounded-xl border border-border bg-bg-surface outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {/* Image header — carries the Minted badge, top-right. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-bg-surface-raised">
        {item.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-normal ease-standard group-hover:scale-[1.02]"
          />
        ) : (
          <div
            aria-hidden
            className="h-full w-full"
            style={{ background: item.gradient }}
          />
        )}
        {item.minted && (
          <span className="pointer-events-none absolute right-[10px] top-[10px]">
            <MintedBadge />
          </span>
        )}
      </div>

      {/* Card body — project name, then the counts the project carries. */}
      <div className="px-[16px] py-[14px]">
        <p className="truncate text-md font-semibold text-text-primary">
          {item.title}
        </p>
        <div className="mt-[6px] flex items-center gap-[10px] text-xs font-medium tabular-nums text-text-tertiary">
          <span className="min-w-0 flex-1 truncate font-regular">
            {item.creator.name}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-[4px]"
            title={`${item.views} views`}
          >
            <Icon icon={ViewIcon} size={13} strokeWidth={1.6} />
            {formatCount(item.views)}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-[4px]"
            title={`${item.appreciations} appreciations`}
          >
            <Icon icon={FavouriteIcon} size={13} strokeWidth={1.6} />
            {formatCount(item.appreciations)}
          </span>
        </div>
      </div>
    </Link>
  );
}
