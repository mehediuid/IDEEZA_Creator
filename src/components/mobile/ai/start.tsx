"use client";

// The AI tab's first screen (Full AI flow 01–04, Voice prompt 01–04 and 07):
// the hero over the AI wash (one line, the pieces as chips), "Start from an
// idea" with Shuffle as two-line chips right above the composer, and the
// Prompt Box pinned at the foot, with no credits line under it (owner 2026-11-22:
// the web's Home box says no price; a concept's cost shows where it is drawn); out of
// credits, one slim state row sits above the box: "You're out of credits.
// They refill on 8 Dec.", Buy credits (the sheet, Starter picked) and the next
// plan's line (CL-032). Typing hides the ideas so the box can grow (02–04).
// The box takes an inspiration image beside the mic (CL-027): Generate stores
// it, then starts the web's chat (createChat, with the Quality picked here and
// the picture, as Home does) and opens it; the first render waits for the
// setup question, so nothing is charged yet.
// ⋯ holds History and Buy credits. A tab root: no Back (the tab bar is the
// way between tabs). `?chat=<id>` opens that chat in place of the start;
// `?focus=1` puts the cursor in the Prompt Box.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AiMagicIcon, Clock01Icon, Coins01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Button } from "@/components/ideeza/button";
import { Tag } from "@/components/ideeza/tag";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { ITEM_KINDS, ITEM_LABELS, useCreateHistory } from "@/lib/create/history";
import type { PromptImage } from "@/components/dashboard/prompt-card";
import { IDEAS, IDEAS_SHOWN, ideasAt } from "@/lib/mobile-ai/flow";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { ActionSheet } from "../kit/sheet";
import { OutOfCreditsRow } from "../plans/upsell";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { BuyCreditsSheet } from "./buy-credits-sheet";
import { PromptBox } from "./prompt-box";
import { QualityPicker, useLastQuality } from "./quality";

const PIECES_SHOWN = ITEM_KINDS.filter((k) => k !== "parts");

export function AiStart() {
  const router = useRouter();
  // An old link to a chat (`/m/ai?chat=<id>`, as a project's Add a product and a product's
  // "Open chat" used to write) lands on that chat, not on an empty start.
  const params = useSearchParams();
  const linkedChat = params.get("chat");
  React.useEffect(() => {
    if (linkedChat) router.replace(`/m/ai/chat/${encodeURIComponent(linkedChat)}`);
  }, [linkedChat, router]);
  // `?focus=1` (the Welcome map's "Start with my idea"): the box is ready to type in.
  const focus = params.get("focus") === "1";
  React.useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById("ai-start-prompt")?.focus());
  }, [focus]);
  const { createChat } = useCreateHistory();
  const { hydrated, balance } = useCredits();
  const [prompt, setPrompt] = React.useState("");
  const [quality, setQuality] = useLastQuality();
  const [submitting, setSubmitting] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [menu, setMenu] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const canRender = !hydrated || balance >= CONCEPT_COST;
  const inputId = "ai-start-prompt";

  // `image`: the inspiration image, already stored by the box (prompt-box.tsx).
  const generate = (text: string, image?: PromptImage) => {
    if (!canRender || submitting) return false;
    setSubmitting(true);
    try {
      const session = createChat(text, { quality, ...image });
      router.push(`/m/ai/chat/${session.id}`);
    } catch {
      setSubmitting(false);
      return false;
    }
    // The box keeps the words until the chat opens.
    return false;
  };

  const pick = (title: string) => {
    setPrompt(title);
    requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  };

  return (
    <div className="relative isolate h-full">
      <AiWash />
      <Screen
        top={<TopBar actions={[{ icon: MORE_ICON, label: "More", onClick: () => setMenu(true) }]} />}
        footer={
          <div className="pb-5 pt-4">
            {/* Out of credits: one slim state row above the composer with its one action and the next
                plan up (CL-032; owner rule: never a warning hung under the form). The box still takes a
                draft; Generate stays held. */}
            {hydrated && !canRender && <OutOfCreditsRow className="mx-8 mb-4" onBuy={() => setBuying(true)} />}
            <PromptBox
              inputId={inputId}
              value={prompt}
              onChange={setPrompt}
              onSubmit={generate}
              placeholder="Describe your device"
              canSend={canRender}
              busy={submitting}
              takesImage
              extra={<QualityPicker value={quality} onChange={setQuality} />}
            />
          </div>
        }
      >
        <div className="flex min-h-full flex-col">
          {/* The hero: one line under the headline (lens 1); the full "what a build
              makes" sentence is in the credits line's ⓘ sheet, the chips name the pieces. */}
          <section className="flex flex-col items-center gap-5 px-12 pt-10 text-center">
            <span className="px-8 py-2">
              <IdeezaLogo mark height={40} decorative />
            </span>
            <h2 className={T.hero}>
              What will you
              <br />
              <span className="text-text-brand">build today?</span>
            </h2>
            <p className={T.body}>Describe a device in plain words.</p>
            <ul aria-label="You'll get" className="flex flex-wrap justify-center gap-2 pt-1">
              {PIECES_SHOWN.map((k) => (
                <li key={k}>
                  <Tag size="sm">{ITEM_LABELS[k]}</Tag>
                </li>
              ))}
            </ul>
          </section>
          {/* Suggestions as tappable chips right above the composer (ChatGPT / Perplexity):
              a picture when the idea has one, its title and parts line; a tap fills the box. */}
          {!prompt.trim() && (
            <section aria-labelledby="ideas-title" className="mt-auto flex flex-col gap-3 pb-1 pt-10">
              <div className="flex items-center justify-between gap-4 pl-8 pr-5">
                <h3 id="ideas-title" className={T.section}>
                  Start from an idea
                </h3>
                <Button
                  hierarchy="ghost"
                  size="lg"
                  iconLeading={<Icon icon={Refresh01Icon} size={16} />}
                  onClick={() => setOffset((o) => (o + IDEAS_SHOWN) % IDEAS.length)}
                >
                  Shuffle
                </Button>
              </div>
              <ul className="flex gap-4 overflow-x-auto px-8 pb-2 [scrollbar-width:none]">
                {ideasAt(offset).map((idea) => (
                  <li key={idea.title} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => pick(idea.title)}
                      className="flex min-h-[56px] max-w-[232px] items-center gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface py-3 pl-3 pr-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <span className="relative inline-flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
                        {idea.image ? <Image src={idea.image} alt="" fill sizes="40px" className="object-cover" /> : <Icon icon={AiMagicIcon} size={18} />}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className={cn(T.rowTitle, "truncate")}>{idea.title}</span>
                        <span className={cn(T.meta, "truncate text-text-tertiary")}>{idea.line}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Screen>
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: "History", icon: Clock01Icon, onSelect: () => router.push("/m/ai/history") },
          { label: "Buy credits", icon: Coins01Icon, onSelect: () => setBuying(true) },
        ]}
      />
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={CONCEPT_COST} />
    </div>
  );
}

/** The AI wash and dot grid behind the hero (Figma "Ambient background"). */
function AiWash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] overflow-hidden">
      <div className="absolute inset-x-[-30%] top-[-200px] h-[420px] rounded-full bg-[image:var(--gradient-ai)] opacity-40 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-border-subtle)_1px,transparent_1px)] [background-size:12px_12px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    </div>
  );
}

