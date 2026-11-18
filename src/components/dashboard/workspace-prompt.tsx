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
  ArrowRight01Icon,
  Cancel01Icon,
  FavouriteIcon,
  Refresh01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import {
  ITEM_KINDS,
  ITEM_LABELS,
  useCreateHistory,
} from "@/lib/create/history";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { OutOfCreditsLine } from "@/components/credits/out-of-credits";
import { useManualProjects } from "@/lib/manual/projects";
import { formatCount, PROJECTS, type Project } from "@/lib/feed";
import { MintedBadge } from "@/components/newsfeed/minted-badge";
import { BuildManuallyInfo } from "./build-manually-info";
import { ProjectInfoModal } from "./project-info-modal";
import { HeroGlow } from "./hero-glow";
import { DELIVERABLE_ICON } from "./deliverable-icon";
import { SourceNudge } from "@/components/auth/source-picker";
import { PromptCard, useLastQuality, type PromptImage } from "./prompt-card";
import { Icon } from "./icon";

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

// `/?addTo=<projectId>` — how a project page's "Add a product" used to start
// here (P2-TABS-29); the page opens its own dialog now, and this stays for an
// address already shared or bookmarked. Read
// from the address itself rather than useSearchParams, so the page needs no
// Suspense boundary; the server has no address, so the chip appears once
// the page is in the browser. Back and Forward re-read it.
function subscribeLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
function useAddToParam(): string | null {
  return React.useSyncExternalStore(
    subscribeLocation,
    () => new URLSearchParams(window.location.search).get("addTo"),
    () => null,
  );
}


export function WorkspacePrompt() {
  const router = useRouter();
  const { createChat } = useCreateHistory();
  // "Adding to {project}" (P2-TABS-29): the chat this sends starts its
  // question on that project, so the build it makes joins it when saved. An
  // id that names no project in this browser shows nothing and adds nowhere.
  const addToId = useAddToParam();
  const { hydrated: projectsHydrated, projects } = useManualProjects();
  const [addToDropped, setAddToDropped] = React.useState(false);
  const addTo =
    !addToDropped && addToId && projectsHydrated ? (projects.find((p) => p.id === addToId) ?? null) : null;
  const dropAddTo = () => {
    setAddToDropped(true);
    router.replace("/", { scroll: false });
    requestAnimationFrame(() => taRef.current?.focus());
  };
  // The first concept costs a render like any other, so the send is shut
  // here rather than letting the chat open and fail its opening turn.
  // The rendered balance, not canAfford(): the provider refreshes that ref
  // in its own effect, which runs after this child's.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const canRender = !creditsHydrated || balance >= CONCEPT_COST;
  const [mode, setMode] = React.useState<Mode>("ai");
  const [prompt, setPrompt] = React.useState("");
  // Quality goes with the idea into its chat: every concept rendered there
  // uses it, and each product is built at it unless its card changes it
  // (lib/create/quality.ts). The next idea starts at the one picked last.
  const [quality, setQuality] = useLastQuality();
  const [refining, setRefining] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  // Manual-mode modal lives at this level so a click on "Create
  // Project" inside BuildManuallyInfo can open it, and the dropdown
  // inside it reads from ManualProjectsProvider.
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [chipOffset, setChipOffset] = React.useState(0);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // `/?prompt=<idea>` — the landing page's "Describe your hardware idea" box
  // hands its text here. It fills the box (nothing is sent: a render costs
  // credits) and drops out of the address, so a reload starts clean.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handed = params.get("prompt")?.trim();
    if (!handed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the address after hydration
    setPrompt(handed);
    params.delete("prompt");
    const rest = params.toString();
    router.replace(rest ? `/?${rest}` : "/", { scroll: false });
    requestAnimationFrame(() => taRef.current?.focus());
  }, [router]);

  // AI mode is the only mode that uses the prompt textarea today. The
  // manual path is driven by the BuildManuallyInfo panel + the
  // Project Information modal mounted at the bottom of this component.
  // `image`: the inspiration image, already stored by the box (prompt-card.tsx).
  const handleSubmit = (image?: PromptImage) => {
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
      const session = createChat(trimmed, {
        quality,
        ...image,
        ...(addTo ? { addTo: addTo.id } : null),
      });
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
      <div className="relative mx-auto w-full max-w-[760px] px-[var(--layout-page-inset)] pt-[64px]">
        {/* After a skipped "where did you hear about us?" (lib/account/auth.ts). */}
        <SourceNudge className="mb-[40px]" />
        <h1 className="text-center text-5xl font-bold tracking-close text-text-primary">
          What will you build today?
        </h1>
        <p className="mx-auto mt-[16px] max-w-[560px] text-center text-md leading-relaxed text-text-secondary">
          Turn your electronics idea into a buildable design — with AI or on
          your own. No wallet or KYC to start.
        </p>

        <div className="mt-[40px] flex justify-center">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div data-tour="home-composer" className="mt-[24px]">
          {mode === "ai" && addTo && (
            <div className="mb-[12px] flex justify-center">
              <p className="inline-flex max-w-full items-center gap-[4px] rounded-full border border-solid border-border bg-bg-surface py-[2px] pl-[14px] pr-[2px] text-sm text-text-secondary">
                <span className="min-w-0 truncate">
                  Adding to <strong className="font-semibold text-text-primary">{addTo.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={dropAddTo}
                  aria-label={`Stop adding to ${addTo.name}`}
                  className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[44px]"
                >
                  <Icon icon={Cancel01Icon} size={16} />
                </button>
              </p>
            </div>
          )}
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
              quality={quality}
              onQuality={setQuality}
            />
          ) : (
            <BuildManuallyInfo onCreate={() => setProjectModalOpen(true)} />
          )}
          {/* Upgrade plan C1: out of credits, said under the prompt with both ways out. */}
          {mode === "ai" && creditsHydrated && !canRender && <OutOfCreditsLine className="mt-[12px]" />}
        </div>

        {/* Chips suggest prompts — only meaningful in AI mode. */}
        {mode === "ai" && (
          <div data-tour="home-examples" className="mt-[16px]">
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


function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  // A radio group is one Tab stop: the chosen option takes focus and the
  // arrows move the choice. Both options used to be Tab stops of their own
  // while the group announced itself as a radiogroup.
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    // Read now: React clears currentTarget once the handler returns.
    const group = e.currentTarget as HTMLElement;
    onChange(mode === "ai" ? "manual" : "ai");
    requestAnimationFrame(() =>
      group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
    );
  };
  return (
    <div
      role="radiogroup"
      aria-label="How you want to start the project"
      data-tour="home-mode"
      onKeyDown={onKey}
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
      tabIndex={active ? 0 : -1}
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

function WhatYouGet() {
  return (
    <div
      data-tour="home-get"
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
      // On the page frame's edge (F07 — Page Layout), like every page's
      // content: the inset, filling the width. Its columns follow the strip's
      // own width, not the window's — beside the sidebar a 1024 window has a
      // 680 px strip, where four columns cut every title.
      className="mt-[64px] w-full px-[var(--layout-page-inset)] [container-type:inline-size]"
    >
      <div className="w-full">
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
          className="grid grid-cols-1 gap-[16px] [@container(min-width:560px)]:grid-cols-2 [@container(min-width:900px)]:grid-cols-4"
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
      {/* Image header — carries the Minted badge, top-right. The card's own
          border answers a hover; the picture zooming as well was decoration. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-bg-surface-raised">
        {item.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover"
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
