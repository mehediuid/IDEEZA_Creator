"use client";

// "Where did you hear about IDEEZA?" — the web's one question (Notion Part 1;
// components/auth/source-picker.tsx), asked once on the phone right after
// Sign up (/m/source), and only when the link that brought them didn't say
// (its utm_source is kept with the account). The web's six choices in its order, as A18 tags
// with the web's icons: a tap saves and goes on; Other asks for a word first;
// Skip for now goes on without an answer.

import * as React from "react";
import {
  GoogleIcon,
  Linkedin01Icon,
  MoreHorizontalCircle01Icon,
  Ticket01Icon,
  UserGroupIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import { OTHER_MAX, SOURCES, SOURCE_WORDS, answerSource, skipSource, type Source } from "@/lib/account/auth";
import { BottomBar } from "../kit/bottom-bar";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, REFUSED_ALERT } from "./parts";

const SOURCE_ICON: Record<Source, IconValue> = {
  youtube: YoutubeIcon,
  friend: UserGroupIcon,
  google: GoogleIcon,
  linkedin: Linkedin01Icon,
  event: Ticket01Icon,
  other: MoreHorizontalCircle01Icon,
};

export function SourceStep({ onDone }: { onDone: () => void }) {
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
      top={<TopBar title="One question" />}
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
        className={ACCOUNT_CONTENT}
        onSubmit={(e) => {
          e.preventDefault();
          if (other) answer("other");
        }}
      >
        <AccountHeading title="Where did you hear about IDEEZA?">One tap. It helps us reach more makers like you.</AccountHeading>
        <AccountAlert alert={refused ? REFUSED_ALERT : null} />
        <div role="group" aria-label="Where you heard about IDEEZA" className="flex flex-wrap gap-4">
          {SOURCES.map((s) => (
            <Tag key={s} size="lg" icon={<Icon icon={SOURCE_ICON[s]} size={16} />} selected={s === "other" && other} onClick={() => pick(s)}>
              {SOURCE_WORDS[s]}
            </Tag>
          ))}
        </div>
        {other && (
          <Field label="Where? (optional)" htmlFor={ids.other.id}>
            <TextInput ref={otherRef} id={ids.other.id} size="xl" maxLength={OTHER_MAX} value={words} onValueChange={setWords} />
          </Field>
        )}
      </form>
    </Screen>
  );
}
