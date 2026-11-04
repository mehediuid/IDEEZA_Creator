"use client";

// Where did you hear about IDEEZA? (Notion Part 1): one tap, in Notion's order
// (YouTube · Friend · Google · LinkedIn · Event · Other). A choice saves at
// once; Other asks for a word first. The page right after verifying shows
// them as tiles (SourceQuestion); Home's card after a Skip shows the same
// choices, with the same icons, as tags (SourceNudge).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  GoogleIcon,
  Linkedin01Icon,
  MoreHorizontalCircle01Icon,
  Ticket01Icon,
  UserGroupIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import {
  OTHER_MAX,
  SOURCES,
  SOURCE_WORDS,
  answerSource,
  closeSourceNudge,
  needsSourceQuestion,
  showsSourceNudge,
  skipSource,
  useAuth,
  type Source,
} from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { AuthHeading, FIELD_ERROR } from "./auth-parts";

const REFUSED = "This browser wouldn't save that. Check that it allows this site to store data, then try again.";

const SOURCE_ICON: Record<Source, IconValue> = {
  youtube: YoutubeIcon,
  friend: UserGroupIcon,
  google: GoogleIcon,
  linkedin: Linkedin01Icon,
  event: Ticket01Icon,
  other: MoreHorizontalCircle01Icon,
};

const SOURCE_HINT: Record<Source, string> = {
  youtube: "A video or a channel",
  friend: "Someone told you",
  google: "You searched",
  linkedin: "A post or a profile",
  event: "A fair, talk or meetup",
  other: "Somewhere else",
};

const TILE =
  "group flex min-h-[112px] cursor-pointer flex-col items-start gap-[12px] rounded-[var(--radius-xl)] border-[length:var(--border-width-1-5)] border-solid bg-bg-surface p-[16px] text-left outline-none transition-[border-color,box-shadow,transform] duration-[var(--motion-duration-normal)] ease-out hover:-translate-y-[2px] hover:border-[var(--color-border-brand)] hover:shadow-2 focus-visible:shadow-focus-brand motion-reduce:hover:translate-y-0";

function SourcePicker({ onAnswered, variant }: { onAnswered: () => void; variant: "tiles" | "tags" }) {
  const [other, setOther] = React.useState(false);
  const [words, setWords] = React.useState("");
  const [refused, setRefused] = React.useState(false);
  const otherRef = React.useRef<HTMLInputElement>(null);

  const pick = (s: Source) => {
    if (s === "other") {
      setOther(true);
      requestAnimationFrame(() => otherRef.current?.focus());
      return;
    }
    if (!answerSource(s, "").ok) return setRefused(true);
    onAnswered();
  };

  const submitOther = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerSource("other", words).ok) return setRefused(true);
    onAnswered();
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {variant === "tiles" ? (
        <div role="group" aria-label="Where you heard about IDEEZA" className="grid grid-cols-2 gap-[12px] sm:grid-cols-3">
          {SOURCES.map((s) => {
            const on = s === "other" && other;
            return (
              <button
                key={s}
                type="button"
                aria-label={SOURCE_WORDS[s]}
                aria-pressed={s === "other" ? on : undefined}
                onClick={() => pick(s)}
                className={cn(TILE, on ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-subtle)]" : "border-[var(--color-border-default)]")}
              >
                <span
                  aria-hidden
                  className="inline-flex size-[40px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-icon-brand)] transition-colors duration-[var(--motion-duration-normal)] group-hover:bg-[image:var(--gradient-button-ai)] group-hover:text-[color:var(--color-white)]"
                >
                  <Icon icon={SOURCE_ICON[s]} size={20} />
                </span>
                <span className="flex flex-col">
                  <span className="text-md font-semibold leading-md text-text-primary">{SOURCE_WORDS[s]}</span>
                  <span className="text-sm leading-sm text-text-tertiary">{SOURCE_HINT[s]}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div role="group" aria-label="Where you heard about IDEEZA" className="flex flex-wrap gap-[8px]">
          {SOURCES.map((s) => (
            <Tag key={s} size="lg" icon={<Icon icon={SOURCE_ICON[s]} size={16} />} selected={s === "other" && other} onClick={() => pick(s)}>
              {SOURCE_WORDS[s]}
            </Tag>
          ))}
        </div>
      )}
      {other ? (
        <form className="flex gap-[8px]" onSubmit={submitOther}>
          <TextInput
            ref={otherRef}
            size={variant === "tiles" ? "xl" : "lg"}
            value={words}
            onValueChange={setWords}
            maxLength={OTHER_MAX}
            placeholder="Where? (optional)"
            aria-label="Where you heard about IDEEZA"
            containerClassName="min-w-0 flex-1"
          />
          <Button type="submit" hierarchy="primary" size={variant === "tiles" ? "xl" : "lg"}>
            Continue
          </Button>
        </form>
      ) : null}
      {refused ? (
        <p role="alert" className={FIELD_ERROR}>
          {REFUSED}
        </p>
      ) : null}
    </div>
  );
}

/** The page right after verifying. Skip goes to Home, which asks again later. */
export function SourceQuestion() {
  const router = useRouter();
  const { hydrated, account, signedIn } = useAuth();
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated || leaving) return;
    if (!signedIn || !account || !needsSourceQuestion(account)) router.replace("/");
  }, [hydrated, account, signedIn, leaving, router]);

  if (!hydrated || !signedIn || !account || (!leaving && !needsSourceQuestion(account))) return null;

  const home = () => {
    setLeaving(true);
    router.replace("/");
  };

  return (
    <>
      <p className="m-0 inline-flex w-fit items-center gap-[8px] rounded-full bg-[var(--color-bg-success-subtle)] py-[4px] pl-[8px] pr-[12px] text-sm font-medium leading-sm text-text-primary">
        <span aria-hidden className="text-[color:var(--color-icon-success)]">
          <Icon icon={CheckmarkCircle02Icon} size={16} />
        </span>
        Your account is ready, {account.firstName}
      </p>
      <AuthHeading title="Where did you hear about IDEEZA?">One tap and you&apos;re in. It helps us reach more makers like you.</AuthHeading>
      <SourcePicker variant="tiles" onAnswered={home} />
      <div>
        <Button
          hierarchy="ghost"
          size="md"
          onClick={() => {
            skipSource();
            home();
          }}
        >
          Skip for now
        </Button>
      </div>
    </>
  );
}

/** Home's soft nudge after a Skip (Notion Part 1, Part 2.5): never forced, closes for good. */
export function SourceNudge({ className }: { className?: string }) {
  const { hydrated, account, signedIn } = useAuth();
  const titleId = React.useId();
  if (!hydrated || !signedIn || !account || !showsSourceNudge(account)) return null;
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[16px] text-left shadow-1", className)}
    >
      <div className="flex items-start gap-[12px]">
        <span
          aria-hidden
          className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[image:var(--gradient-button-ai)] text-[color:var(--color-white)]"
        >
          <Icon icon={UserGroupIcon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="m-0 text-md font-semibold leading-md text-text-primary">
            Finish your profile
          </h2>
          <p className="m-0 text-sm leading-sm text-text-secondary">Where did you hear about IDEEZA? One tap.</p>
        </div>
        <IconButton size="sm" aria-label="Close" onClick={() => closeSourceNudge()} icon={<Icon icon={Cancel01Icon} size={16} />} />
      </div>
      <SourcePicker variant="tags" onAnswered={() => undefined} />
    </section>
  );
}
