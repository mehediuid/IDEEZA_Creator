"use client";

// Settings › Privacy & safety › Hidden words (mobile Figma "Settings · 2026
// update" 10688:2): ST-34 a 44 field and Add, the words as A18 chips whose ×
// removes one with a toast and Undo, ST-34b empty. Each Add and × saves at
// once (ST-92 when refused). The list and its rules are the web's
// (components/settings/hidden-words.tsx): `ideeza:settings` blocking.
// hiddenWords, up to 500, commas split words, `addWords` cleans them. What
// they hide: someone else's comment on your shared projects and a message
// request (lib/settings/audience.ts `hiddenWordIn`).

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import { addWords, wordsRemaining } from "@/lib/settings/audience";
import { HIDDEN_WORDS_MAX, readSettings, updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useToast } from "../kit/toast";
import { SaveFailed, SettingsScreen, useSaver } from "./kit";

const noSubscribe = () => () => {};
const useRunning = () => React.useSyncExternalStore(noSubscribe, () => true, () => false);

const save = (hiddenWords: string[]) => updateSettings("blocking", { hiddenWords });

/** Undo: the word goes back to its place in the list. */
function hideAgainAt(word: string, index: number): boolean {
  const words = readSettings().blocking.hiddenWords;
  if (words.includes(word)) return true;
  const next = [...words];
  next.splice(Math.min(index, next.length), 0, word);
  return save(next);
}

export function HiddenWordsSettings() {
  const words = useSettings().blocking.hiddenWords;
  const running = useRunning();
  const online = useOnline();
  const toast = useToast();
  const saver = useSaver();
  const [typed, setTyped] = React.useState("");
  const [over, setOver] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const off = !online;

  const add = (text: string) => {
    const r = addWords(words, text);
    setOver(r.over);
    if (r.words.length === words.length) {
      // Only words already hidden, or no room: nothing to save.
      if (!r.over) setTyped("");
      return;
    }
    if (saver.run("words", () => save(r.words))) setTyped("");
  };

  const remove = (word: string, index: number) => {
    if (!saver.run("words", () => save(readSettings().blocking.hiddenWords.filter((w) => w !== word)))) return;
    setOver(0);
    toast({
      title: `“${word}” removed`,
      action: {
        label: "Undo",
        onClick: () => {
          if (!hideAgainAt(word, index)) toast({ title: "Couldn’t undo. Nothing changed.", lead: "error" });
        },
      },
    });
    inputRef.current?.focus();
  };

  return (
    <SettingsScreen title="Hidden words" loading={!running}>
      <form
        className="mt-2 flex gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) add(typed);
        }}
      >
        <TextInput
          ref={inputRef}
          size="xl"
          value={typed}
          onValueChange={(v) => (v.includes(",") ? add(v) : setTyped(v))}
          placeholder="Add a word"
          aria-label="Words to hide"
          enterKeyHint="done"
          autoCapitalize="off"
          autoComplete="off"
          disabled={off}
          containerClassName="min-w-0 flex-1"
        />
        <Button type="submit" hierarchy="secondary" size="xl" disabled={off || !typed.trim()}>
          Add
        </Button>
      </form>
      {over > 0 && (
        <p role="alert" className={cn(T.meta, "text-text-error")}>
          You can hide up to {HIDDEN_WORDS_MAX} words. {over} didn’t fit.
        </p>
      )}
      <SaveFailed saver={saver} group="words" />
      {words.length > 0 && (
        <ul role="list" aria-label="Hidden words" className="flex flex-wrap gap-4">
          {words.map((w, i) => (
            <li key={w}>
              <Tag size="md" disabled={off} onDismiss={() => remove(w, i)} dismissLabel={`Remove ${w}`}>
                {w}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <p className={T.meta}>
          {words.length === 0 && "No hidden words yet. "}
          Someone else’s comment on your shared projects, or a message request, that uses one of these words is hidden. The person who wrote it still
          sees it.
        </p>
        <p className={cn(T.meta, "text-text-tertiary")}>
          Remaining {wordsRemaining(words)} of {HIDDEN_WORDS_MAX}. Separate words with a comma. A word matches the whole word in any case and its
          #tag; “#nft” matches only the tag.
        </p>
      </div>
    </SettingsScreen>
  );
}
