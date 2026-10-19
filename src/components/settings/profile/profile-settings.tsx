"use client";

// /settings/profile (User Panel V2 General | Profile 22048:28793, spec
// 2026-10-19-settings-design.md §5.2). Two cards:
//   Profile Picture — your photo, the same one Edit profile sets (IndexedDB
//     `ideeza-profile`, so the sidebar and your profile change with it):
//     Upload New Picture opens Figma's Upload Profile Picture dialog, Remove
//     takes it away.
//   Profile — First Name, Last Name and Gender (private: `ideeza:account:
//     identity`), your Handle (`/creators/<handle>`, checked as you type) and
//     Links (your profile's links, the same five Edit profile shows), and the
//     connected demo wallet's address. Edit turns the card into a form;
//     nothing is saved before Update.
// Email, phone and birthday arrive with sign-in (spec D4, D18), so they are
// not shown.

import * as React from "react";
import Link from "next/link";
import { Add01Icon, Cancel01Icon, CheckmarkCircle02Icon, ImageUpload01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, IconButton, ModalFrame, TestnetDemoBadge, TextInput } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { GENDER_MAX, NAME_MAX, genderWordsOf, saveIdentity, useIdentity, type Gender } from "@/lib/account/identity";
import { LINKS_MAX, linkOf } from "@/lib/people/fields";
import { cleanHandle, HANDLE_MAX } from "@/lib/people/handle";
import { ME, handleProblem } from "@/lib/people/ids";
import { deletePhoto, putPhoto, resizePhoto, useMyPhoto } from "@/lib/people/photo-store";
import { saveProfile, useMe, useMyProfile } from "@/lib/people/profile-store";
import { demoAddress, makerId, shortAddress } from "@/lib/wallet/demo-wallet";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsCard } from "../settings-card";
import { ChoiceRow } from "../settings-choice";
import { SettingsFrame } from "../settings-frame";
import { Field, FormField, TAP, describedBy, useCardEdit } from "./parts";

/** The limit Edit profile enforces before it resizes a photo (photo-store.ts PHOTO_MAX_BYTES). */
const PHOTO_RULE = "PNG, JPG under 10 MB";
const PHOTO_REFUSED = "Choose a JPG or PNG image under 10 MB.";

const CARD = "flex flex-col rounded-xl border border-solid border-border bg-bg-surface p-[16px]";
const ARRIVED =
  "scroll-mt-24 data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";
const LINK = "rounded-xs font-medium text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function ProfileSettingsPage() {
  return (
    <SettingsFrame page="profile">
      <PhotoCard />
      <ProfileCard />
    </SettingsFrame>
  );
}

// ─────────────────────────── Profile Picture ───────────────────────────

function PhotoCard() {
  const photo = useMyPhoto();
  const me = useMe();
  const titleId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const uploadRef = React.useRef<HTMLButtonElement>(null);

  const remove = async () => {
    setBusy(true);
    const r = await deletePhoto();
    setBusy(false);
    setError(r.ok ? null : SAVE_FAILED);
    if (r.ok) uploadRef.current?.focus();
  };

  return (
    <section id="photo" aria-labelledby={titleId} className={`${CARD} ${ARRIVED}`}>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[12px]">
        <Avatar size="lg" initials={me.initials} src={photo.url ?? undefined} label="Your profile picture" className="shrink-0" />
        <div className="flex min-w-[160px] flex-1 flex-col gap-[2px]">
          <h2 id={titleId} className="m-0 text-lg font-semibold leading-lg text-text-primary">
            Profile Picture
          </h2>
          <p className="m-0 text-md leading-md text-text-secondary">{PHOTO_RULE}</p>
        </div>
        <div className="flex flex-wrap gap-[8px]">
          <Button
            ref={uploadRef}
            type="button"
            hierarchy="tonal"
            size="md"
            iconLeading={<Icon icon={Upload04Icon} size={16} />}
            onClick={() => setOpen(true)}
            className={TAP}
          >
            Upload New Picture
          </Button>
          <Button
            type="button"
            hierarchy="outline-brand"
            size="md"
            disabled={!photo.hydrated || !photo.url}
            loading={busy}
            onClick={remove}
            className={TAP}
          >
            Remove
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="m-0 mt-[12px] text-md leading-md text-text-error">
          {error}
        </p>
      )}
      <UploadPhotoDialog
        open={open}
        current={photo.url}
        initials={me.initials}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => uploadRef.current?.focus());
        }}
      />
    </section>
  );
}

/** Figma's Upload Profile Picture (22048:29632): drop or choose a picture, see it as it will show, Update. */
function UploadPhotoDialog({ open, current, initials, onClose }: { open: boolean; current: string | null; initials: string; onClose: () => void }) {
  const [picked, setPicked] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const hintId = React.useId();

  // Every opening starts empty (during render, no second pass).
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setPicked(null);
      setError(null);
      setSaving(false);
    }
  }
  React.useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url);
  }, [picked]);

  const take = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const blob = await resizePhoto(file);
    if (!blob) {
      setError(PHOTO_REFUSED);
      return;
    }
    setPicked({ blob, url: URL.createObjectURL(blob) });
  };

  const save = async () => {
    if (!picked || saving) return;
    setSaving(true);
    const r = await putPhoto(picked.blob);
    setSaving(false);
    if (!r.ok) {
      setError(SAVE_FAILED);
      return;
    }
    onClose();
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title="Upload Profile Picture"
      footer={
        <div className="flex w-full justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" disabled={!picked} loading={saving} onClick={save}>
            Update
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[16px]">
        <button
          type="button"
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void take(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-[12px] rounded-xl border-[length:var(--border-width-1-5)] border-dashed p-[24px] text-center outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
            over ? "border-border-brand bg-bg-brand-subtle" : "border-border-strong bg-bg-surface hover:bg-bg-subtle",
          )}
        >
          {picked || current ? (
            <Avatar size="xl" initials={initials} src={picked?.url ?? current ?? undefined} />
          ) : (
            <span aria-hidden className="text-text-tertiary">
              <Icon icon={ImageUpload01Icon} size={32} />
            </span>
          )}
          <span className="text-md font-semibold leading-md text-text-primary">
            {picked ? "Choose another picture" : "Drag a picture here, or choose one"}
          </span>
          <span id={hintId} className="text-md leading-md text-text-secondary">
            {picked ? "This is how it will look. Update to use it." : `${PHOTO_RULE}. It is cropped to a square.`}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {error && (
          <p role="alert" className="m-0 text-md leading-md text-text-error">
            {error}
          </p>
        )}
      </div>
    </ModalFrame>
  );
}

// ─────────────────────────── Profile ───────────────────────────

type GenderChoice = "male" | "female" | "unsaid" | "custom";

const GENDER_OPTIONS: { value: GenderChoice; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unsaid", label: "Prefer not to say" },
  { value: "custom", label: "Custom" },
];

function genderChoiceOf(g: Gender): GenderChoice | null {
  if (!g) return null;
  return GENDER_OPTIONS.find((o) => o.value === g && o.value !== "custom")?.value ?? "custom";
}

const LINK_PLACEHOLDERS = ["yoursite.com", "github.com/you", "linkedin.com/in/you", "youtube.com/@you", "x.com/you"];

type LinkRow = { key: number; value: string; bad: boolean };

const noSubscribe = () => () => {};

/** "naimrahman.dev/work" from "https://www.naimrahman.dev/work". */
function hostPathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}

function ProfileCard() {
  const { hydrated, fields } = useMyProfile();
  const { hydrated: idReady, identity } = useIdentity();
  const wallet = useDemoWallet();
  const { openManage } = useWalletRequest();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  const ready = hydrated && idReady;

  const handle = fields.handle;
  const href = `/creators/${handle || ME}`;
  const walletId = wallet ? makerId(wallet.account) : null;
  const connected = !!(wallet && walletId && wallet.identities[walletId]?.connected);

  return (
    <SettingsCard
      id="profile"
      title="Profile"
      action={
        !editing && (
          <div ref={editRef}>
            <EditButton onClick={start} aria-label="Edit profile" />
          </div>
        )
      }
    >
      {editing ? (
        <ProfileForm
          formRef={formRef}
          initial={{
            firstName: identity.firstName,
            lastName: identity.lastName,
            gender: identity.gender,
            handle,
            links: fields.links,
          }}
          onDone={stop}
        />
      ) : (
        <div className="[container-type:inline-size]">
          <div className="grid grid-cols-1 gap-x-[24px] [@container(min-width:520px)]:grid-cols-2">
            <Field id="name" label="First Name" ready={ready}>
              {identity.firstName}
            </Field>
            <Field label="Last Name" ready={ready}>
              {identity.lastName}
            </Field>
            <Field id="handle" label="Handle" ready={ready}>
              <span className="flex flex-col gap-[2px]">
                <Link href={href} className={cn(LINK, "w-fit")}>
                  {href}
                </Link>
                {!handle && <span className="text-md leading-md text-text-tertiary">Choose a handle to give your profile its own address</span>}
              </span>
            </Field>
            <Field id="gender" label="Gender" ready={ready}>
              {genderWordsOf(identity.gender)}
            </Field>
            <Field id="links" label="Links" ready={ready}>
              {fields.links.length > 0 && (
                <ul role="list" className="m-0 flex list-none flex-col gap-[4px] p-0">
                  {fields.links.map((l) => (
                    <li key={l} className="min-w-0">
                      <a href={l} target="_blank" rel="noopener noreferrer nofollow" className={cn(LINK, "break-all")}>
                        {hostPathOf(l)}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            <Field id="wallet" label="Wallet Address" ready={ready && wallet !== undefined}>
              {connected && walletId ? (
                <span className="flex flex-wrap items-center gap-[8px]">
                  <span className="font-mono" title={demoAddress(walletId)}>
                    {shortAddress(demoAddress(walletId))}
                  </span>
                  <TestnetDemoBadge />
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-[12px]">
                  <span className="text-text-secondary">Not connected</span>
                  <Button type="button" hierarchy="outline-brand" size="sm" onClick={openManage} className={TAP}>
                    Connect
                  </Button>
                </span>
              )}
            </Field>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

function ProfileForm({
  formRef,
  initial,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  initial: { firstName: string; lastName: string; gender: Gender; handle: string; links: string[] };
  onDone: () => void;
}) {
  const ids = React.useId();
  const [firstName, setFirstName] = React.useState(initial.firstName);
  const [lastName, setLastName] = React.useState(initial.lastName);
  const [handle, setHandle] = React.useState(initial.handle);
  const [gender, setGender] = React.useState<GenderChoice | null>(genderChoiceOf(initial.gender));
  const [customGender, setCustomGender] = React.useState(genderChoiceOf(initial.gender) === "custom" ? initial.gender : "");
  const [genderError, setGenderError] = React.useState<string | null>(null);
  const [links, setLinks] = React.useState<LinkRow[]>(() =>
    (initial.links.length ? initial.links : [""]).map((value, key) => ({ key, value, bad: false })),
  );
  const nextKey = React.useRef(LINKS_MAX);
  const [error, setError] = React.useState<string | null>(null);
  const host = React.useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
  const handleRef = React.useRef<HTMLInputElement>(null);
  const customRef = React.useRef<HTMLInputElement>(null);
  const linkRefs = React.useRef(new Map<number, HTMLInputElement>());
  const focusLink = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (focusLink.current === null) return;
    linkRefs.current.get(focusLink.current)?.focus();
    focusLink.current = null;
  }, [links]);

  const h = cleanHandle(handle);
  const handleIssue = h ? handleProblem(h) : null;
  const linkBad = (v: string) => v.trim() !== "" && linkOf(v) === null;

  const addLink = () => {
    if (links.length >= LINKS_MAX) return;
    const key = nextKey.current++;
    focusLink.current = key;
    setLinks((prev) => [...prev, { key, value: "", bad: false }]);
  };
  const removeLink = (key: number) =>
    setLinks((prev) => {
      if (prev.length === 1) {
        focusLink.current = prev[0].key;
        return [{ ...prev[0], value: "", bad: false }];
      }
      const at = prev.findIndex((l) => l.key === key);
      const next = prev.filter((l) => l.key !== key);
      focusLink.current = (next[at] ?? next[at - 1]).key;
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleIssue) {
      handleRef.current?.focus();
      return;
    }
    if (gender === "custom" && !customGender.trim()) {
      setGenderError("Write how you describe your gender, or choose another option.");
      customRef.current?.focus();
      return;
    }
    const firstBad = links.find((l) => linkBad(l.value));
    if (firstBad) {
      setLinks((prev) => prev.map((l) => ({ ...l, bad: linkBad(l.value) })));
      linkRefs.current.get(firstBad.key)?.focus();
      return;
    }
    const nextGender: Gender = gender === "custom" ? customGender : (gender ?? "");
    const a = saveIdentity({ firstName, lastName, gender: nextGender });
    const b = a.ok
      ? saveProfile({
          handle: h,
          links: links.flatMap((l) => {
            const url = linkOf(l.value);
            return url ? [url] : [];
          }),
        })
      : a;
    if (!b.ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  const firstId = `${ids}-first`;
  const lastId = `${ids}-last`;
  const handleId = `${ids}-handle`;
  const customId = `${ids}-gender-custom`;
  const handleHint = h ? (
    <span className="flex items-center gap-[6px] text-text-success">
      <Icon icon={CheckmarkCircle02Icon} size={16} className="shrink-0" />
      <span className="[overflow-wrap:anywhere]">{`${h === initial.handle ? "Your profile" : "Available"}: ${host}/creators/${h}`}</span>
    </span>
  ) : (
    `Your profile stays at ${host}/creators/me until you choose one. 3 to ${HANDLE_MAX} lower-case letters, numbers or hyphens.`
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[20px] pt-[8px]">
      <div className="[container-type:inline-size]">
        <div className="grid grid-cols-1 gap-[16px] [@container(min-width:520px)]:grid-cols-2">
          <FormField id={firstId} label="First Name">
            <TextInput id={firstId} size="xl" value={firstName} onValueChange={setFirstName} maxLength={NAME_MAX} autoComplete="given-name" />
          </FormField>
          <FormField id={lastId} label="Last Name">
            <TextInput id={lastId} size="xl" value={lastName} onValueChange={setLastName} maxLength={NAME_MAX} autoComplete="family-name" />
          </FormField>
        </div>
      </div>
      <p className="m-0 -mt-[8px] text-md leading-md text-text-tertiary">Your first and last name are private. Your profile shows the name you give in Edit profile.</p>
      <FormField id={handleId} label="Handle" error={handleIssue} hint={handleHint}>
        <TextInput
          ref={handleRef}
          id={handleId}
          size="xl"
          value={handle}
          onValueChange={(v) => setHandle(v.toLowerCase())}
          maxLength={HANDLE_MAX + 5}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="your-name"
          invalid={!!handleIssue}
          {...describedBy(handleId, handleIssue, handleHint)}
        />
      </FormField>
      <fieldset className="m-0 flex min-w-0 flex-col gap-[6px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">Gender</legend>
        <div role="radiogroup" aria-label="Gender" className="flex flex-wrap gap-x-[8px] gap-y-[2px]">
          {GENDER_OPTIONS.map((o) => (
            <ChoiceRow
              key={o.value}
              name={`${ids}-gender`}
              option={o}
              checked={gender === o.value}
              onChange={(v) => {
                setGender(v);
                setGenderError(null);
                if (v === "custom") requestAnimationFrame(() => customRef.current?.focus());
              }}
            />
          ))}
        </div>
        {gender === "custom" && (
          <FormField id={customId} label="Your gender" error={genderError} className="pl-[12px]">
            <TextInput
              ref={customRef}
              id={customId}
              size="xl"
              value={customGender}
              onValueChange={(v) => {
                setCustomGender(v);
                setGenderError(null);
              }}
              maxLength={GENDER_MAX}
              invalid={!!genderError}
              {...describedBy(customId, genderError, null)}
            />
          </FormField>
        )}
      </fieldset>
      <fieldset className="m-0 flex min-w-0 flex-col gap-[8px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">Links</legend>
        <p className="m-0 -mt-[6px] text-md leading-md text-text-tertiary">{`Up to ${LINKS_MAX}. They show on your profile.`}</p>
        {links.map((link, i) => {
          const id = `${ids}-link-${link.key}`;
          const bad = link.bad ? "Enter a web address, like yoursite.com." : null;
          return (
            <div key={link.key} className="flex flex-col gap-[4px]">
              <div className="flex items-center gap-[8px]">
                <TextInput
                  ref={(el) => {
                    if (el) linkRefs.current.set(link.key, el);
                    else linkRefs.current.delete(link.key);
                  }}
                  id={id}
                  size="xl"
                  aria-label={`Link ${i + 1}`}
                  value={link.value}
                  onValueChange={(v) => setLinks((prev) => prev.map((l) => (l.key === link.key ? { ...l, value: v, bad: false } : l)))}
                  placeholder={LINK_PLACEHOLDERS[i] ?? "yoursite.com"}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  invalid={!!bad}
                  containerClassName="min-w-0 flex-1"
                  {...describedBy(id, bad, null)}
                />
                <IconButton
                  type="button"
                  hierarchy="ghost"
                  size="xl"
                  aria-label={`Remove link ${i + 1}`}
                  icon={<Icon icon={Cancel01Icon} size={18} />}
                  onClick={() => removeLink(link.key)}
                  className="shrink-0"
                />
              </div>
              {bad && (
                <p id={`${id}-note`} role="alert" className="m-0 text-md leading-md text-text-error">
                  {bad}
                </p>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          hierarchy="ghost"
          size="md"
          iconLeading={<Icon icon={Add01Icon} size={16} />}
          onClick={addLink}
          disabled={links.length >= LINKS_MAX}
          className={cn("w-fit", TAP)}
        >
          {links.length >= LINKS_MAX ? `${LINKS_MAX} links is the most` : "Add link"}
        </Button>
      </fieldset>
      <CardFormActions onCancel={onDone} error={error} />
    </form>
  );
}
