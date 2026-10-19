"use client";

// /settings/blocking (User Panel V2 "Audience | Blocking" 22048:34661): one
// card, "Manage Blocking", with three rows.
// - Block users › the "Blocked Users List" modal (22048:34824): + Add Blocked
//   User, Search Contact, each person with Unblock. Add Blocked User opens
//   "Blocked New Users" (22048:34934 / 34986 / 35039): search the people
//   you've met, "Search result for …", Block. One blocked list everywhere: a
//   profile's Block and Messages' Block write it too.
// - Block message › the "Blocked Message List" modal (23712:52073): your
//   conversations with someone you blocked, each with Unblock.
// - Hide specific words ⌄ opens in place (22048:34705 / 34764): the note,
//   "Write keyword" with the words as chips, "Remaining n of 500", Cancel /
//   Update. They hide others' comments on your shared projects and message
//   requests that use them (lib/settings/audience.ts).
// The blocked list replaces Messages' old Message settings dialog (D13).

import * as React from "react";
import { Alert02Icon, ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, Tag } from "@/components/ideeza";
import { HIDDEN_WORDS_MAX, updateSettings } from "@/lib/settings/prefs";
import { addWords, wordsRemaining } from "@/lib/settings/audience";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { BlockedMessagesDialog, BlockedUsersDialog } from "./blocking-dialogs";
import { CardFormActions, SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

export function BlockingPage() {
  const [dialog, setDialog] = React.useState<"users" | "messages" | null>(null);
  return (
    <SettingsFrame page="blocking">
      <SettingsCard title="Manage Blocking">
        <SettingsRow id="block-users" label="Block users" help="Manage all your block list from here." onClick={() => setDialog("users")} />
        <SettingsRow
          id="block-message"
          label="Block message"
          help="Manage all your blocked message list from here."
          onClick={() => setDialog("messages")}
        />
        <HiddenWords />
      </SettingsCard>
      {dialog === "users" && <BlockedUsersDialog onClose={() => setDialog(null)} />}
      {dialog === "messages" && <BlockedMessagesDialog onClose={() => setDialog(null)} />}
    </SettingsFrame>
  );
}

const ROW_ID = "hide-words";

function HiddenWords() {
  const saved = useSettings().blocking.hiddenWords;
  const [open, setOpen] = React.useState(false);
  // null = nothing changed yet: the panel shows what is saved.
  const [edited, setEdited] = React.useState<string[] | null>(null);
  const draft = edited ?? saved;
  const [typed, setTyped] = React.useState("");
  const [notice, setNotice] = React.useState<{ tone: "error" | "status"; text: string } | null>(null);
  const panelId = React.useId();
  const inputId = React.useId();
  const remainingId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Arriving at #hide-words (search, ⌘K, Messages' "Hidden words") opens it.
  React.useEffect(() => {
    const check = () => {
      if (window.location.hash === `#${ROW_ID}`) setOpen(true);
    };
    const first = window.setTimeout(check, 0);
    window.addEventListener("hashchange", check);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("hashchange", check);
    };
  }, []);

  const openPanel = (next: boolean) => {
    setEdited(null);
    setTyped("");
    setNotice(null);
    setOpen(next);
  };

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

  const cancel = () => openPanel(false);

  return (
    <div id={ROW_ID} className="flex scroll-mt-24 flex-col rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus">
      <SettingsRow
        label="Hide specific words"
        help="Hide words that are sensitive for you from comments on your shared projects and from message requests."
        control={
          <IconButton
            hierarchy="ghost"
            size="md"
            aria-label="Hide specific words"
            aria-expanded={open}
            aria-controls={panelId}
            icon={<Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={20} />}
            onClick={() => openPanel(!open)}
            className="-mr-[8px] max-md:size-[var(--touch-min)]"
          />
        }
      />
      {open && (
        <form id={panelId} onSubmit={save} className="flex flex-col gap-[12px] pb-[4px] pt-[4px]">
          <p className="m-0 flex max-w-[62ch] items-start gap-[8px] text-md leading-md text-text-secondary">
            <Icon icon={Alert02Icon} size={18} className="mt-[1px] shrink-0 text-text-tertiary" />
            <span>
              Comments and message requests with these words stay visible to the people who wrote them. For everyone else,
              they&apos;re no longer visible. This covers comments on your shared projects and your message requests.
            </span>
          </p>
          <div className="flex flex-col gap-[6px]">
            <label htmlFor={inputId} className="text-md font-medium leading-md text-text-primary">
              Write keyword
            </label>
            <div
              className="flex min-h-[96px] flex-wrap content-start items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface p-[8px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
            >
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
                aria-describedby={remainingId}
                placeholder={draft.length ? "" : "eg. tree, #tree, NFT, #NFT"}
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
            <p id={remainingId} className="m-0 text-md leading-md text-text-tertiary">
              Remaining {wordsRemaining(draft)} of {HIDDEN_WORDS_MAX}. Separate words with a comma or Enter.
            </p>
          </div>
          {notice && (
            <p role={notice.tone === "error" ? "alert" : "status"} className={cn("m-0 text-md leading-md", notice.tone === "error" ? "text-text-error" : "text-text-secondary")}>
              {notice.text}
            </p>
          )}
          <CardFormActions onCancel={cancel} submitLabel={saved.length ? "Update" : "Save"} />
        </form>
      )}
    </div>
  );
}
