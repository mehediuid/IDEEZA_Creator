"use client";

// AU-13 · Name and handle, after the email is verified (or a provider made the
// account). The name is any script; the handle follows the web's rules and
// words (lib/people/handle.ts, ids.ts): Checking… (13), Available (13b), taken
// with three suggestions (13c, near what they typed once they have typed a
// handle of their own), the format error (13d). An empty name says so. No
// Back: the account exists and this is its first step. Continue saves both to
// the account and the profile; then the web's one question, "Where did you
// hear about IDEEZA?" (`?step=source`, only when the link didn't say), and
// the optional profile steps. On a narrow phone the address prefix shortens
// to "creators/" so the handle has room; the line under it has it in full.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountHeading, AccountAlert } from "@/components/mobile/account/parts";
import { SourceStep } from "@/components/mobile/account/source-step";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { T } from "@/components/mobile/type";
import { needsSourceQuestion, saveAccountName, useAuth } from "@/lib/account/auth";
import { handleBaseOf, handleSuggestions, mobileNext, updatePhoneAccount } from "@/lib/account/phone";
import { NAME_MAX } from "@/lib/people/fields";
import { HANDLE_MAX, cleanHandle } from "@/lib/people/handle";
import { handleProblem } from "@/lib/people/ids";
import { readProfileFields, saveProfile } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";

const CHECK_MS = 400;
const PREFIX = "ideeza.com/creators/";
/** Under this width the full prefix leaves the handle too little room (a 320 px phone). */
const NARROW_PX = 340;

/** Whether the element is narrower than `px` (the phone frame's width, not the window's). */
function useNarrow(px: number): [React.RefObject<HTMLFormElement | null>, boolean] {
  const ref = React.useRef<HTMLFormElement>(null);
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setNarrow(el.clientWidth < px);
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, [px]);
  return [ref, narrow];
}

export default function HandlePage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const { account } = useAuth();
  const ids = useFieldIds(["name", "handle"] as const);
  const [name, setName] = React.useState(() => {
    const fromAccount = account ? `${account.firstName} ${account.lastName}`.trim() : "";
    return fromAccount || readProfileFields().name;
  });
  // Follows the name (rafi-ahmed) until they type a handle of their own.
  const [own, setOwn] = React.useState<string | null>(() => readProfileFields().handle || null);
  const handle = own ?? handleBaseOf(name);
  const setHandle = (h: string) => setOwn(h);
  const [checked, setChecked] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [nameLeft, setNameLeft] = React.useState(false);
  const [form, narrow] = useNarrow(NARROW_PX);
  const setupHref = `/m/setup?step=1${next === "/m" ? "" : `&next=${encodeURIComponent(next)}`}`;

  // "Checking…" while typing settles, then the answer.
  React.useEffect(() => {
    const id = window.setTimeout(() => setChecked(cleanHandle(handle)), CHECK_MS);
    return () => window.clearTimeout(id);
  }, [handle]);

  const clean = cleanHandle(handle);
  const checking = checked !== clean;
  // Nothing typed yet is not an error (errors show once there is something to judge).
  const problem = checking || !clean ? null : handleProblem(clean);
  const taken = problem === "Another creator has this handle. Try another.";
  const ok = !checking && !!clean && !problem && !!name.trim();
  // Said once they have left the field empty, or have a handle and still no name.
  const nameError = !name.trim() && (nameLeft || (!!clean && !checking && !problem)) ? "Enter your name." : "";

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const [first = "", ...rest] = name.trim().split(/\s+/);
    const saved = saveAccountName(first, rest.join(" ")).ok && saveProfile({ name: name.trim(), handle: clean }).ok;
    if (!saved) return setFailed(true);
    if (account) updatePhoneAccount(account.email, (a) => ({ ...a, handleOwed: false }));
    if (account && needsSourceQuestion(account)) return router.push(`/m/handle?step=source${next === "/m" ? "" : `&next=${encodeURIComponent(next)}`}`);
    router.push(setupHref);
  };

  if (params.get("step") === "source") return <SourceStep onDone={() => router.replace(setupHref)} />;

  return (
    <Screen
      top={<TopBar title="Name and handle" />}
      footer={
        <BottomBar>
          <Button type="submit" form="handle" size="xl" className="w-full" disabled={!ok}>
            Continue
          </Button>
        </BottomBar>
      }
    >
      <form ref={form} id="handle" noValidate onSubmit={go} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Choose your handle">Your profile’s address. You can change it later in Settings.</AccountHeading>
        <AccountAlert alert={failed ? { tone: "error", title: "Couldn’t save", body: "Your name and handle are kept. Try again." } : null} />
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor={ids.name.id} error={nameError} errorId={ids.name.errorId}>
            <TextInput
              id={ids.name.id}
              size="xl"
              autoComplete="name"
              maxLength={NAME_MAX}
              value={name}
              onValueChange={setName}
              onBlur={() => setNameLeft(true)}
              invalid={!!nameError}
              aria-invalid={!!nameError || undefined}
              aria-describedby={nameError ? ids.name.errorId : `${ids.name.id}-help`}
            />
            {!nameError && (
              <p id={`${ids.name.id}-help`} className={cn(T.meta, "text-text-tertiary")}>
                Any script. This is the name other creators see.
              </p>
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Handle" htmlFor={ids.handle.id}>
              <TextInput
                id={ids.handle.id}
                size="xl"
                prefixText={narrow ? "creators/" : PREFIX}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={HANDLE_MAX + 5}
                value={handle}
                onValueChange={setHandle}
                invalid={!!problem}
                aria-invalid={!!problem || undefined}
                aria-describedby={ids.handle.errorId}
              />
            </Field>
            <p id={ids.handle.errorId} aria-live="polite" className={cn(T.meta, "flex min-h-[18px] items-center gap-4")}>
              {!clean ? null : checking ? (
                <>
                  <Spinner size={16} />
                  <span className="text-text-secondary">Checking…</span>
                </>
              ) : problem ? (
                <span className="text-text-error">{problem}</span>
              ) : (
                <>
                  <span className="text-[color:var(--color-icon-success)]">
                    <Icon icon={CheckmarkCircle02Icon} size={16} />
                  </span>
                  <span className="text-text-success">
                    Available: {PREFIX}
                    {clean}
                  </span>
                </>
              )}
            </p>
          </div>
          {taken && (
            <div className="flex flex-wrap gap-4" aria-label="Free handles">
              {handleSuggestions(own === null ? name : "", clean).map((s) => (
                <Tag key={s} size="md" onClick={() => setHandle(s)}>
                  {s}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </form>
    </Screen>
  );
}
