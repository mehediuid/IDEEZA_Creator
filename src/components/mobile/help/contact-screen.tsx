"use client";

// Contact support (/m/help/contact; mobile Figma "Contact support · Live
// chat"). IDEEZA has no live agents, so nobody pretends to type: each message
// goes to the IDEEZA team as a report (/api/reports, kind "other", with up
// to 3 screenshots), and the thread answers with its reference in the web's
// words (support/report-problem.tsx): the team can't reply in the app yet and
// Settings › Your reports keeps it — no email is promised, as on the web
// (SET-3; lib/support/support-chat.ts keeps the thread in this browser).
// A message that didn't arrive says so and can be sent again;
// after a reload its screenshots are gone (they are never stored), and it
// says so before sending the words alone. The Figma's composer is kept:
// the emoji button opens a sheet that types at the cursor, and the mic sits
// where Send is while the box is empty (as a phone's chat apps do), off: a
// tap says why in a toast, since the app sends no audio anywhere.

import * as React from "react";
import { Cancel01Icon, Image01Icon, Mic01Icon, SentIcon, SmileIcon, Tick02Icon, TickDouble02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Textarea } from "@/components/ideeza/text-input";
import { rememberSentReport } from "@/lib/data/reports";
import { IMAGES_MAX, admitImages, titleOf } from "@/lib/support/problem-report";
import { imageFilesOf, shrinkFile, type ReportImage } from "@/lib/support/report-images";
import { useDates, type Dates } from "@/lib/settings/use-dates";
import { MESSAGE_MAX, putMessage, readChat, writeChat, type ChatMessage } from "@/lib/support/support-chat";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { newReportId, phoneContext, postReport } from "./report-screen";

/** A message's day in the thread, in Settings › Language & region's format and zone (SET-18): "Today", else its date. */
const dayOf = (dates: Dates, ts: number) => {
  const d = dates.date(ts);
  return d === dates.date(Date.now()) ? "Today" : d;
};

type Shot = ReportImage & { url: string };
/** The time now, outside render (the handlers stamp messages with it). */
const nowMs = () => Date.now();

/** The emoji sheet's set: everyday faces and hands, typed where the cursor is. */
const EMOJI = ["😀", "😃", "😄", "😁", "😅", "😂", "🙂", "😉", "😊", "😍", "🤔", "😐", "😕", "🙁", "😢", "😭", "😡", "😮", "😴", "🤯", "👍", "👎", "👏", "🙏", "👋", "🙌", "💪", "👀", "✅", "❌", "⚠️", "❓", "❗", "💡", "🔧", "🐞", "🚀", "🎉", "❤️", "🔥"];
const ICON_BTN =
  "inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:text-[color:var(--color-icon-disabled)] disabled:hover:bg-transparent";

export function ContactScreen() {
  const online = useOnline();
  const dates = useDates();
  const day = (ts: number) => dayOf(dates, ts);
  const toast = useToast();
  const [thread, setThread] = React.useState<ChatMessage[] | null>(null);
  const [text, setText] = React.useState("");
  const [shots, setShots] = React.useState<Shot[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [emoji, setEmoji] = React.useState(false);
  const boxRef = React.useRef<HTMLTextAreaElement>(null);
  const pending = React.useRef(new Map<string, Shot[]>());
  // The ids whose screenshots this page still holds (state, so render never reads the ref).
  const [held, setHeld] = React.useState<ReadonlySet<string>>(() => new Set());
  const hold = (id: string, on: boolean) =>
    setHeld((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [context] = React.useState(() => phoneContext("/m/help/contact"));

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
    setThread(readChat());
  }, []);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.length]);

  const save = (m: ChatMessage) =>
    setThread((t) => {
      const next = putMessage(t ?? [], m);
      if (!writeChat(next)) toast({ title: "This browser couldn’t keep the conversation (storage is full or blocked).", lead: "error" });
      return next;
    });

  const deliver = async (m: ChatMessage, images: readonly Shot[]) => {
    save({ ...m, state: "sending" });
    try {
      const details = m.text.trim() || "(screenshots only)";
      const r = await postReport(
        { id: m.id, kind: "other", impact: "fyi", details, title: `Support: ${titleOf(details, "other")}`, context, images: images.map((s) => ({ width: s.width, height: s.height })) },
        images,
      );
      if (!r.ref) throw new Error(String(r.status));
      rememberSentReport({ ref: r.ref, kind: "other", title: `Support: ${titleOf(details, "other")}`, at: nowMs() });
      pending.current.delete(m.id);
      hold(m.id, false);
      save({ ...m, state: "sent", ref: r.ref });
    } catch {
      save({ ...m, state: "failed" });
    }
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !shots.length) || busy) return;
    if (!online) {
      toast({ title: "You’re offline. Your message is kept here; send it when you’re back online.", lead: "error" });
      return;
    }
    setBusy(true);
    const m: ChatMessage = { id: newReportId(), text: body.slice(0, MESSAGE_MAX), at: nowMs(), state: "sending", ...(shots.length ? { images: shots.length } : {}) };
    const images = shots;
    pending.current.set(m.id, images);
    if (images.length) hold(m.id, true);
    setText("");
    setShots([]);
    await deliver(m, images);
    setBusy(false);
  };

  const addFiles = async (files: File[]) => {
    const { take, note } = admitImages(shots.length, files.length);
    if (note) toast({ title: note });
    for (const file of files.slice(0, take)) {
      const r = await shrinkFile(file, newReportId());
      if (r.ok) setShots((s) => [...s, { ...r.image, url: URL.createObjectURL(r.image.blob) }].slice(0, IMAGES_MAX));
      else toast({ title: r.reason, lead: "error" });
    }
  };

  /** Types `e` where the cursor was, and puts the cursor after it. */
  const insert = (e: string) => {
    const box = boxRef.current;
    const at = box?.selectionStart ?? text.length;
    const to = box?.selectionEnd ?? text.length;
    const next = (text.slice(0, at) + e + text.slice(to)).slice(0, MESSAGE_MAX);
    setText(next);
    setEmoji(false);
    window.setTimeout(() => {
      box?.focus();
      box?.setSelectionRange(at + e.length, at + e.length);
    }, 0);
  };

  /** A retry: the screenshots go with it while this page still holds them; after a reload, the words alone. */
  const retry = (m: ChatMessage) => {
    const images = pending.current.get(m.id);
    if (images) return void deliver(m, images);
    void deliver({ id: m.id, text: m.text, at: m.at, state: m.state }, []);
  };

  return (
    <Screen
      top={<TopBar back="/m/help" title="Contact support" />}
      className="px-8 pb-8 pt-4"
      footer={
        <div className="flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 pb-4 pt-5">
          {shots.length > 0 && (
            <ul className="flex gap-3">
              {shots.map((s) => (
                <li key={s.key} className="relative size-[56px] overflow-hidden rounded-lg bg-bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={s.url} alt={s.name} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => setShots((xs) => xs.filter((x) => x.key !== s.key))}
                    className="absolute right-0 top-0 inline-flex size-[24px] items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]"
                  >
                    <Icon icon={Cancel01Icon} size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void addFiles(imageFilesOf(e.target.files));
                e.target.value = "";
              }}
            />
            <button type="button" aria-label="Add a screenshot" disabled={shots.length >= IMAGES_MAX} onClick={() => fileRef.current?.click()} className={ICON_BTN}>
              <Icon icon={Image01Icon} size={22} />
            </button>
            <button type="button" aria-label="Add an emoji" aria-haspopup="dialog" onClick={() => setEmoji(true)} className={ICON_BTN}>
              <Icon icon={SmileIcon} size={22} />
            </button>
            <Textarea
              ref={boxRef}
              aria-label="Your message"
              rows={1}
              value={text}
              maxLength={MESSAGE_MAX}
              onValueChange={setText}
              placeholder="Send a message…"
              containerClassName="flex-1"
              className="max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {!text.trim() && !shots.length ? (
              <button
                type="button"
                aria-label="Record a voice message"
                aria-disabled
                onClick={() => toast({ title: "Voice messages aren’t available yet. Type or add a screenshot." })}
                className={cn(ICON_BTN, "text-[color:var(--color-icon-disabled)] hover:bg-transparent")}
              >
                <Icon icon={Mic01Icon} size={22} />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send"
                disabled={busy}
                onClick={send}
                className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:opacity-90 disabled:bg-bg-subtle disabled:text-text-disabled"
              >
                <Icon icon={SentIcon} size={20} />
              </button>
            )}
          </div>
        </div>
      }
    >
      <p className={cn(T.meta, "-mt-2 pb-6 text-center")}>IDEEZA team · can’t reply in the app yet</p>
      <div className="pb-6">
        <OfflineBanner />
      </div>
      <ol className="flex flex-col gap-6" aria-live="polite">
        <TeamBubble>
          Hi, this is IDEEZA support. Tell us what you need: each message goes to the IDEEZA team. We can’t reply in the app yet.
        </TeamBubble>
        {(thread ?? []).map((m, i, all) => (
          <React.Fragment key={m.id}>
            {(i === 0 || day(all[i - 1].at) !== day(m.at)) && (
              <li className={cn(T.micro, "flex items-center gap-4 text-text-tertiary")}>
                <span aria-hidden className="h-[1px] flex-1 bg-[var(--color-border-default)]" />
                {day(m.at)}
                <span aria-hidden className="h-[1px] flex-1 bg-[var(--color-border-default)]" />
              </li>
            )}
            <li className="flex flex-col items-end gap-1">
              <div className={cn(T.body, "max-w-[85%] rounded-xl rounded-br-sm bg-bg-brand-subtle px-6 py-4 text-text-primary [overflow-wrap:anywhere]")}>
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                {m.images ? <p className={T.meta}>{m.images} {m.images === 1 ? "screenshot" : "screenshots"}</p> : null}
                <p className={cn(T.micro, "flex items-center justify-end gap-2 pt-1 text-text-tertiary")}>
                  {dates.time(m.at)}
                  {m.state === "sent" ? <Icon icon={TickDouble02Icon} size={14} aria-label="Sent" /> : m.state === "sending" ? <Icon icon={Tick02Icon} size={14} aria-label="Sending" /> : null}
                </p>
              </div>
              {m.state === "failed" && (
                <p role="alert" className={cn(T.caption, "flex flex-wrap items-center justify-end gap-2 text-text-error")}>
                  <Icon icon={Alert02Icon} size={14} />
                  Didn’t send.
                  {m.images && !held.has(m.id) ? " Its screenshots weren’t kept after the reload; add them again, or send the words alone." : ""}{" "}
                  <button type="button" className="min-h-[32px] font-medium underline" onClick={() => retry(m)}>
                    {m.images && !held.has(m.id) ? "Send the words" : "Try again"}
                  </button>
                </p>
              )}
            </li>
            {m.state === "sent" && m.ref && (
              <TeamBubble at={m.at}>
                It’s with the IDEEZA team as <span className="font-mono">{m.ref}</span>. We can’t reply in the app yet. Settings › Your reports keeps it.
              </TeamBubble>
            )}
          </React.Fragment>
        ))}
      </ol>
      <div ref={endRef} />
      <Sheet open={emoji} onClose={() => setEmoji(false)} title="Emoji">
        <ul className="grid grid-cols-8 gap-1">
          {EMOJI.map((e) => (
            <li key={e}>
              <button
                type="button"
                aria-label={`Add ${e}`}
                onClick={() => insert(e)}
                className={cn(T.title, "inline-flex size-[40px] items-center justify-center rounded-lg outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  );
}

function TeamBubble({ children, at }: { children: React.ReactNode; at?: number }) {
  const dates = useDates();
  return (
    <li className="flex items-end gap-3">
      <span aria-hidden className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-full bg-bg-surface ring-[length:var(--border-width-1)] ring-border">
        <IdeezaLogo mark height={14} decorative />
      </span>
      <div className={cn(T.body, "max-w-[85%] rounded-xl rounded-bl-sm bg-bg-surface px-6 py-4 text-text-primary ring-[length:var(--border-width-1)] ring-border")}>
        <p>{children}</p>
        {at !== undefined && <p className={cn(T.micro, "pt-1 text-right text-text-tertiary")}>{dates.time(at)}</p>}
      </div>
    </li>
  );
}
