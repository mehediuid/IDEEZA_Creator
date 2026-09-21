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
  // Which product each concept belongs to, read off the setup answer, so a
  // render line names the thing being drawn instead of a number.
  const productOf = React.useMemo(() => {
    const out = new Map<string, string>();
    const setup = chat.turns.find((t) => t.role === "setup");
    const named =
      setup?.role === "setup"
        ? new Map(setup.companions.map((c) => [c.id, c.name]))
        : new Map<string, string>();
    const primary =
      setup?.role === "setup"
        ? (setup.productName?.trim() || "Your product")
        : "Your product";
    for (const t of chat.turns) {
      if (t.role !== "assistant") continue;
      out.set(t.id, t.companionOf ? (named.get(t.companionOf) ?? "Companion") : primary);
    }
    return out;
  }, [chat.turns]);

  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.turns.length]);

  return (
    <div className="flex flex-col gap-[18px] px-[18px] py-[20px]">
      {chat.turns.map((turn) => (
        <RailLine
          key={turn.id}
          turn={turn}
          labels={labels}
          productOf={productOf}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function RailLine({
  turn,
  labels,
  productOf,
}: {
  turn: ChatTurn;
  labels: Map<string, string>;
  /** What each concept is a concept OF, so a render reads as
   *  "Remote controller · 61%" rather than "Concept 2 · 61%". */
  productOf: Map<string, string>;
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
    const names = turn.companions.map((c) => c.name);
    return (
      <div className="flex flex-col gap-[8px]">
        <Who>IDEEZA</Who>
        {turn.status === "loading" && (
          <>
            <Status tone="working">Reading your idea</Status>
            <Status tone="waiting">Working out what it needs</Status>
          </>
        )}
        {turn.status === "asking" && (
          <>
            <Status tone="done">Read your idea</Status>
            {names.length > 0 ? (
              <Status tone="done">
                This needs {names.length + 1} products
                <Sub>{[turn.productName ?? "your product", ...names].join(" · ")}</Sub>
              </Status>
            ) : (
              <Status tone="done">One product, nothing else needed</Status>
            )}
            <Status tone="working">Waiting on your answers →</Status>
          </>
        )}
        {turn.status === "answered" && turn.answer && (
          <>
            <Status tone="done">Read your idea</Status>
            <Status tone="done">
              Building {turn.answer.picked.length + 1} product
              {turn.answer.picked.length ? "s" : ""}
            </Status>
            {turn.answer.projectName && (
              <Status tone="done">
                Project
                <Sub>{turn.answer.projectName}</Sub>
              </Status>
            )}
          </>
        )}
      </div>
    );
  }

  const what = productOf.get(turn.id) ?? `Concept ${labels.get(turn.id) ?? "1"}`;
  if (turn.status === "pending") {
    return (
      <Status tone="working" indent>
        {what}
        <Sub>
          Drawing
          {typeof turn.progress === "number" ? ` · ${turn.progress}%` : "…"}
        </Sub>
      </Status>
    );
  }
  if (turn.status === "failed") {
    return (
      <Status tone="bad" indent>
        {what}
        <Sub>Didn’t come through — nothing was charged</Sub>
      </Status>
    );
  }
  return (
    <Status tone="done" indent>
      {what}
      <Sub>Concept ready</Sub>
    </Status>
  );
}

/** The second line of a status: the detail under the thing it is about. */
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-[1px] block text-sm text-text-tertiary">{children}</span>
  );
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
  indent = false,
}: {
  tone: "working" | "waiting" | "done" | "bad";
  children: React.ReactNode;
  /** A render belongs under the project it is for, so it sits in from the
   *  decisions above it rather than reading as another decision. */
  indent?: boolean;
}) {
  return (
    <p
      className={[
        "flex items-start gap-[8px] text-sm leading-relaxed",
        indent ? "pl-[14px]" : "",
        tone === "bad" ? "text-text-error" : "text-text-secondary",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "mt-[2px] shrink-0",
          tone === "working" ? "animate-spin text-text-tertiary" : "",
          tone === "waiting" ? "text-text-disabled" : "",
          tone === "done" ? "text-text-success" : "",
          tone === "bad" ? "text-[var(--color-icon-error)]" : "",
        ].join(" ")}
      >
        <Icon
          icon={
            tone === "working" || tone === "waiting"
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
