"use client";

// Settings › Privacy & safety › Hidden words (Figma "Hide word" 22048:34705 /
// 34764): the words as chips in one box with the input after them, "Remaining
// n of 500", and Cancel / Save once something changed. A comma or Enter makes
// a chip, Backspace in an empty input takes the last one off. What they hide:
// someone else's comment on your shared projects (lib/innovations/comments.ts)
// and a message request (lib/messages/rules.ts `requestHidden`); the matcher
// is `hiddenWordIn` (lib/settings/audience.ts).

import * as React from "react";
import { Tag } from "@/components/ideeza";
import { addWords, wordsRemaining } from "@/lib/settings/audience";
import { HIDDEN_WORDS_MAX, updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { CardFormActions, SAVE_FAILED, SettingsCard } from "./settings-card";

export function HiddenWordsCard() {
  const saved = useSettings().blocking.hiddenWords;
  // null = nothing changed yet: the box shows what is saved.
  const [edited, setEdited] = React.useState<string[] | null>(null);
  const draft = edited ?? saved;
  const [typed, setTyped] = React.useState("");
  const [notice, setNotice] = React.useState<{ tone: "error" | "status"; text: string } | null>(null);
  const inputId = React.useId();
  const helpId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dirty = edited !== null || typed.trim() !== "";

  const take = (text: string): string[] => {
    const r = addWords(draft, text);
    setEdited(r.words);
    setTyped("");
    setNotice(r.over > 0 ? { tone: "error", text: `You can hide up to ${HIDDEN_WORDS_MAX} words. ${r.over} didn't fit.` } : null);
    return r.words;
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const words = typed.trim() ? take(typed) : draft;
    if (!updateSettings("blocking", { hiddenWords: words })) {
      setNotice({ tone: "error", text: SAVE_FAILED });
      return;
    }
    setEdited(null);
    setNotice({ tone: "status", text: words.length ? "Saved. These words are hidden now." : "Saved. No words are hidden." });
  };

  const cancel = () => {
    setEdited(null);
    setTyped("");
    setNotice(null);
  };

  return (
    <SettingsCard
      id="hidden-words"
      title="Hidden words"
      description="Someone else's comment on your shared projects, or a message request, that uses one of these words is hidden. The person who wrote it still sees it."
    >
      <form onSubmit={save} className="flex flex-col gap-[6px] pt-[8px]">
        <label htmlFor={inputId} className="text-sm leading-sm text-text-secondary">
          Words to hide
        </label>
        <div className="flex min-h-[88px] flex-wrap content-start items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface p-[8px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
          {draft.length > 0 && (
            <ul role="list" aria-label="Hidden words" className="m-0 contents p-0">
              {draft.map((w) => (
                <li key={w} className="contents">
                  <Tag
                    size="md"
                    onDismiss={() => {
                      setEdited(draft.filter((x) => x !== w));
                      setNotice(null);
                      inputRef.current?.focus();
                    }}
                    dismissLabel={`Remove ${w}`}
                  >
                    {w}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={inputRef}
            id={inputId}
            value={typed}
            aria-describedby={helpId}
            placeholder={draft.length ? "" : "eg. tree, #tree, NFT, টাকা"}
            onChange={(e) => {
              const v = e.target.value;
              if (v.includes(",")) take(v);
              else setTyped(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (typed.trim()) take(typed);
              } else if (e.key === "Backspace" && !typed && draft.length) {
                setEdited(draft.slice(0, -1));
              }
            }}
            className="min-h-[32px] min-w-[160px] flex-1 border-0 bg-transparent px-[4px] text-md leading-md text-text-primary outline-none placeholder:text-text-tertiary max-md:min-h-[var(--touch-min)]"
          />
        </div>
        <p id={helpId} className="m-0 text-sm leading-sm text-text-tertiary">
          Remaining {wordsRemaining(draft)} of {HIDDEN_WORDS_MAX}. Separate words with a comma or Enter. A word matches the whole word in any
          case and its #tag; “#nft” matches only the tag.
        </p>
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn("m-0 text-md leading-md", notice.tone === "error" ? "text-text-error" : "text-text-secondary")}
          >
            {notice.text}
          </p>
        )}
        {dirty && <CardFormActions onCancel={cancel} submitLabel="Save" />}
      </form>
    </SettingsCard>
  );
}
