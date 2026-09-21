"use client";

// The left rail: the conversation, and everything the flow is doing.
//
// The work itself lives on the canvas beside this — the questions first, then
// the concepts. What belongs here is the running account of it: what the maker
// asked, what was decided, and what is happening right now. A render takes the
// better part of a minute and a multi-product build runs several at once, so
// "what is happening" is not a detail. Nothing here is a control; every one of
// these lines has its real surface on the canvas.
//
// Each line is one fact, in the order it happened, so the rail can be read top
// to bottom as the story of the build.

import * as React from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ChatSession, ChatTurn } from "@/lib/create/history";

export function ChatRail({
  chat,
  labels,
}: {
  chat: ChatSession;
  /** Concept numbering, shared with the canvas so both name a concept the
   *  same way. */
  labels: Map<string, string>;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.turns.length]);

  return (
    <div className="flex flex-col gap-[18px] px-[18px] py-[20px]">
      {chat.turns.map((turn) => (
        <RailLine key={turn.id} turn={turn} labels={labels} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function RailLine({
  turn,
  labels,
}: {
  turn: ChatTurn;
  labels: Map<string, string>;
}) {
  if (turn.role === "user") {
    return (
      <div className="flex flex-col gap-[4px]">
        <Who>You</Who>
        <p className="whitespace-pre-wrap text-md leading-relaxed text-text-primary">
          {turn.text}
        </p>
      </div>
    );
  }

  if (turn.role === "setup") {
    return (
      <div className="flex flex-col gap-[6px]">
        <Who>IDEEZA</Who>
        {turn.status === "loading" && (
          <Status tone="working">Reading your idea…</Status>
        )}
        {turn.status === "asking" && (
          <Status tone="working">
            {turn.companions.length > 0
              ? "A few questions before we draw →"
              : "One question before we draw →"}
          </Status>
        )}
        {turn.status === "answered" && turn.answer && (
          <Status tone="done">
            {turn.answer.picked.length + 1} product
            {turn.answer.picked.length ? "s" : ""}
            {turn.answer.projectName ? ` in ${turn.answer.projectName}` : ""}
          </Status>
        )}
      </div>
    );
  }

  const label = labels.get(turn.id) ?? "1";
  if (turn.status === "pending") {
    return (
      <Status tone="working">
        Drawing concept {label}
        {typeof turn.progress === "number" ? ` · ${turn.progress}%` : "…"}
      </Status>
    );
  }
  if (turn.status === "failed") {
    return <Status tone="bad">Concept {label} didn&apos;t come through</Status>;
  }
  return <Status tone="done">Concept {label} is ready</Status>;
}

function Who({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
      {children}
    </span>
  );
}

/** One thing that happened, or is happening. The glyph carries the state so
 *  the words do not have to repeat it. */
function Status({
  tone,
  children,
}: {
  tone: "working" | "done" | "bad";
  children: React.ReactNode;
}) {
  return (
    <p
      className={[
        "flex items-start gap-[8px] text-sm leading-relaxed",
        tone === "bad" ? "text-text-error" : "text-text-secondary",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "mt-[2px] shrink-0",
          tone === "working" ? "animate-spin text-text-tertiary" : "",
          tone === "done" ? "text-text-success" : "",
          tone === "bad" ? "text-[var(--color-icon-error)]" : "",
        ].join(" ")}
      >
        <Icon
          icon={
            tone === "working"
              ? Loading03Icon
              : tone === "done"
                ? CheckmarkCircle02Icon
                : Alert02Icon
          }
          size={14}
        />
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
