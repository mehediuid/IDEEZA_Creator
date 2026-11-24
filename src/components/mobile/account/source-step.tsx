"use client";

// "Where did you hear about IDEEZA?" — the web's one question (Notion Part 1;
// components/auth/source-picker.tsx), asked once on the phone right after
// Sign up (/m/source), and only when the link that brought them didn't say
// (its utm_source is kept with the account). One header (the question; no
// top-bar title over it), under the web's "Your account is ready, {name}" and
// with its line "One tap and you're in. …" (AUTH-13). The web's six choices in
// its order, with the web's icons and each its hint as the meta line, as
// full-width rows the way a phone's onboarding asks: a tap saves and goes on;
// Other ticks its row and asks for a word first (Continue in the bottom bar);
// Skip for now goes on without an answer.

import * as React from "react";
import {
  CheckmarkCircle02Icon,
  GoogleIcon,
  Linkedin01Icon,
  MoreHorizontalCircle01Icon,
  Tick02Icon,
  Ticket01Icon,
  UserGroupIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { SOURCE_HINT } from "@/components/auth/source-picker";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { OTHER_MAX, SOURCES, SOURCE_WORDS, answerSource, skipSource, type Source } from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { Screen } from "../screen";
import { T } from "../type";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, REFUSED_ALERT } from "./parts";

const SOURCE_ICON: Record<Source, IconValue> = {
  youtube: YoutubeIcon,
  friend: UserGroupIcon,
  google: GoogleIcon,
  linkedin: Linkedin01Icon,
  event: Ticket01Icon,
  other: MoreHorizontalCircle01Icon,
};

export function SourceStep({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const ids = useFieldIds(["other"] as const);
  const [other, setOther] = React.useState(false);
  const [words, setWords] = React.useState("");
  const [refused, setRefused] = React.useState(false);
  const otherRef = React.useRef<HTMLInputElement>(null);

  const answer = (s: Source) => {
    if (!answerSource(s, s === "other" ? words : "").ok) return setRefused(true);
    onDone();
  };
  const pick = (s: Source) => {
    if (s !== "other") return answer(s);
    setOther(true);
    requestAnimationFrame(() => otherRef.current?.focus());
  };

  return (
    <Screen
      footer={
        <BottomBar>
          {other && (
            <Button type="submit" form="source" size="xl" className="w-full">
              Continue
            </Button>
          )}
          <Button
            hierarchy="ghost"
            size="xl"
            className="w-full"
            onClick={() => {
              skipSource();
              onDone();
            }}
          >
            Skip for now
          </Button>
        </BottomBar>
      }
    >
      <form
        id="source"
        noValidate
        className={cn(ACCOUNT_CONTENT, "pt-12")}
        onSubmit={(e) => {
          e.preventDefault();
          if (other) answer("other");
        }}
      >
        <p className={cn(T.rowTitle, "inline-flex w-fit items-center gap-4 rounded-full bg-bg-success-subtle py-2 pl-4 pr-6")}>
          <span aria-hidden className="text-[color:var(--color-icon-success)]">
            <Icon icon={CheckmarkCircle02Icon} size={16} />
          </span>
          {firstName ? `Your account is ready, ${firstName}` : "Your account is ready"}
        </p>
        <AccountHeading title="Where did you hear about IDEEZA?">One tap and you’re in. It helps us reach more makers like you.</AccountHeading>
        <AccountAlert alert={refused ? REFUSED_ALERT : null} />
        <ul role="list" aria-label="Where you heard about IDEEZA" className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {SOURCES.map((s) => {
            const on = s === "other" && other;
            return (
              <li key={s}>
                <button type="button" aria-pressed={s === "other" ? on : undefined} onClick={() => pick(s)} className={cn(LIST_ROW, "min-h-[56px]")}>
                  <span className="shrink-0 text-[color:var(--color-icon-default)]">
                    <Icon icon={SOURCE_ICON[s]} size={24} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={T.bodyLg}>{SOURCE_WORDS[s]}</span>
                    <span className={T.meta}>{SOURCE_HINT[s]}</span>
                  </span>
                  {s === "other" ? (
                    on && (
                      <span className="shrink-0 text-[color:var(--color-icon-brand)]">
                        <Icon icon={Tick02Icon} size={20} />
                      </span>
                    )
                  ) : (
                    <Chevron />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {other && (
          <Field label="Where? (optional)" htmlFor={ids.other.id}>
            <TextInput ref={otherRef} id={ids.other.id} size="xl" maxLength={OTHER_MAX} value={words} onValueChange={setWords} />
          </Field>
        )}
      </form>
    </Screen>
  );
}
