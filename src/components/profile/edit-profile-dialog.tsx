"use client";

// Edit profile (spec 2026-10-14-creator-profile-design.md): the one home of
// your profile's own words — cover (owner, 2026-10-14), photo, name in any
// script, the name in English letters, a one-line headline, and (Portfolio,
// 2026-10-14) About, where you are, two links and what you are open to. "Suggest from my work" (owner
// decision D7) drafts the headline from your shared projects only; the draft
// sits under the field, labelled, until you press Use this, and nothing is
// saved before Save profile. Cancel with changes asks "Discard changes?".

import * as React from "react";
import { AiMagicIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, ModalFrame, TextInput, Textarea } from "@/components/ideeza";
import { RadioRow } from "@/components/messages/choice";
import { cn } from "@/lib/utils";
import { BIO_MAX, HEADLINE_MAX, LINKS_MAX, LOCATION_MAX, NAME_MAX, OPEN_TO_WORDS, linkOf, type OpenTo } from "@/lib/people/fields";
import { displayNameOf, initialsOf } from "@/lib/people/ids";
import { deleteCover, deletePhoto, putCover, putPhoto, resizeCover, resizePhoto } from "@/lib/people/photo-store";
import { saveProfile } from "@/lib/people/profile-store";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LABEL = "text-md font-semibold text-text-primary";
const QUIET = "text-sm tabular-nums text-text-secondary";
const HELP = "text-md text-text-secondary";
const PILL =
  "inline-flex min-h-[32px] shrink-0 items-center gap-2 rounded-full border border-solid border-border bg-bg-surface px-5 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-bg-surface motion-reduce:transition-none";

const WRITE_FAILED = "Couldn't save. This browser's storage is full or blocked.";

const OPEN_TO_OPTIONS: { value: OpenTo; label: string }[] = [
  ...(Object.entries(OPEN_TO_WORDS) as [Exclude<OpenTo, "">, string][]).map(([value, label]) => ({ value, label })),
  { value: "", label: "Don't show this" },
];

/** This device's time zone, so others see your local time next to where you are. */
function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

type Photo = { kind: "keep" } | { kind: "new"; blob: Blob; url: string } | { kind: "remove" };
type Suggest = { kind: "idle" } | { kind: "running" } | { kind: "draft"; text: string } | { kind: "failed" };

export function EditProfileDialog({
  initial,
  photoUrl,
  coverUrl,
  fallbackCover,
  shared,
  onClose,
  onSaved,
}: {
  initial: { name: string; latinName: string; headline: string; bio: string; location: string; links: readonly string[]; openTo: OpenTo };
  photoUrl: string | null;
  /** The cover you uploaded; null when you haven't. */
  coverUrl: string | null;
  /** What the page shows without one: your featured project's picture. */
  fallbackCover: string | null;
  /** Your shared projects' public words, what the suggestion may read. */
  shared: readonly { title: string; story: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = React.useId();
  const nameId = React.useId();
  const latinId = React.useId();
  const headlineId = React.useId();
  const headlineHelpId = React.useId();
  const bioId = React.useId();
  const locationId = React.useId();
  const linksId = React.useId();
  const openToId = React.useId();
  const photoHelpId = React.useId();
  const coverHelpId = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(initial.name);
  const [latinName, setLatinName] = React.useState(initial.latinName);
  const [headline, setHeadline] = React.useState(initial.headline);
  const [bio, setBio] = React.useState(initial.bio);
  const [location, setLocation] = React.useState(initial.location);
  const [links, setLinks] = React.useState<string[]>(() => Array.from({ length: LINKS_MAX }, (_, i) => initial.links[i] ?? ""));
  const [badLinks, setBadLinks] = React.useState<boolean[]>(() => Array.from({ length: LINKS_MAX }, () => false));
  const [openTo, setOpenTo] = React.useState<OpenTo>(initial.openTo);
  const linkRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [photo, setPhoto] = React.useState<Photo>({ kind: "keep" });
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [cover, setCover] = React.useState<Photo>({ kind: "keep" });
  const [coverError, setCoverError] = React.useState<string | null>(null);
  const [suggest, setSuggest] = React.useState<Suggest>({ kind: "idle" });
  const [saving, setSaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);
  React.useEffect(() => () => {
    if (photo.kind === "new") URL.revokeObjectURL(photo.url);
  }, [photo]);
  React.useEffect(() => () => {
    if (cover.kind === "new") URL.revokeObjectURL(cover.url);
  }, [cover]);

  const dirty =
    name.trim() !== initial.name.trim() ||
    latinName.trim() !== initial.latinName.trim() ||
    headline.trim() !== initial.headline.trim() ||
    bio.trim() !== initial.bio.trim() ||
    location.trim() !== initial.location.trim() ||
    links.map((l) => l.trim()).join("\n") !== Array.from({ length: LINKS_MAX }, (_, i) => initial.links[i] ?? "").join("\n") ||
    openTo !== initial.openTo ||
    photo.kind !== "keep" ||
    cover.kind !== "keep";

  const linkBad = (raw: string) => raw.trim() !== "" && linkOf(raw) === null;

  const shownPhoto = photo.kind === "new" ? photo.url : photo.kind === "remove" ? null : photoUrl;
  const ownCover = cover.kind === "new" ? cover.url : cover.kind === "remove" ? null : coverUrl;
  const shownCover = ownCover ?? fallbackCover;

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setCoverError(null);
    const blob = await resizeCover(file);
    if (!blob) {
      setCoverError("Choose a JPG or PNG image under 10 MB.");
      return;
    }
    setCover((prev) => {
      if (prev.kind === "new") URL.revokeObjectURL(prev.url);
      return { kind: "new", blob, url: URL.createObjectURL(blob) };
    });
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    const blob = await resizePhoto(file);
    if (!blob) {
      setPhotoError("Choose a JPG or PNG image under 10 MB.");
      return;
    }
    setPhoto((prev) => {
      if (prev.kind === "new") URL.revokeObjectURL(prev.url);
      return { kind: "new", blob, url: URL.createObjectURL(blob) };
    });
  };

  const runSuggest = async () => {
    if (suggest.kind === "running") {
      abortRef.current?.abort();
      setSuggest({ kind: "idle" });
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSuggest({ kind: "running" });
    try {
      const res = await fetch("/api/profile/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: shared }),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => null)) as { headline?: unknown } | null;
      if (ctrl.signal.aborted) return;
      const text = res.ok && typeof body?.headline === "string" ? body.headline : null;
      setSuggest(text ? { kind: "draft", text } : { kind: "failed" });
    } catch {
      if (!ctrl.signal.aborted) setSuggest({ kind: "failed" });
    }
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    if (!dirty && !failed) {
      onClose();
      return;
    }
    const bad = links.map(linkBad);
    if (bad.some(Boolean)) {
      setBadLinks(bad);
      linkRefs.current[bad.indexOf(true)]?.focus();
      return;
    }
    setSaving(true);
    setFailed(false);
    const wrote = saveProfile({
      name,
      latinName,
      headline,
      bio,
      location,
      // Your local time shows only next to where you are, so the zone goes with a location.
      timeZone: location.trim() ? deviceZone() : null,
      links: links.flatMap((l) => {
        const url = linkOf(l);
        return url ? [url] : [];
      }),
      openTo,
    });
    let photoOk = true;
    if (wrote.ok && photo.kind === "new") photoOk = (await putPhoto(photo.blob)).ok;
    if (wrote.ok && photo.kind === "remove") photoOk = (await deletePhoto()).ok;
    if (wrote.ok && photoOk && cover.kind === "new") photoOk = (await putCover(cover.blob)).ok;
    if (wrote.ok && photoOk && cover.kind === "remove") photoOk = (await deleteCover()).ok;
    setSaving(false);
    if (!wrote.ok || !photoOk) {
      setFailed(true);
      return;
    }
    onSaved();
  };

  const requestClose = () => {
    if (saving) return;
    if (!dirty) {
      onClose();
      return;
    }
    setConfirming(true);
    requestAnimationFrame(() => keepRef.current?.focus());
  };
  const keepEditing = () => {
    setConfirming(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const noShared = shared.length === 0;
  const suggestLine =
    suggest.kind === "running"
      ? "Reading your shared projects… this can take up to 40 seconds."
      : suggest.kind === "failed"
        ? "Couldn't write a suggestion. Try again."
        : noShared
          ? "Share a project first, and the AI can suggest a headline from it."
          : "";

  return (
    <ModalFrame
      open
      onClose={confirming ? keepEditing : requestClose}
      size="sm"
      sheet
      title="Edit profile"
      description="Other creators see these on your profile."
      initialFocus={nameRef}
      closeUnavailable={saving}
      footer={
        confirming ? (
          <div role="group" aria-label="Discard changes?" className="flex w-full flex-wrap items-center gap-4">
            <p className="mr-auto text-md font-semibold text-text-primary">Discard changes?</p>
            <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" onClick={keepEditing} className={TAP}>
              Keep editing
            </Button>
            <Button type="button" hierarchy="ghost" size="lg" onClick={onClose} className={cn(TAP, "text-text-error")}>
              Discard
            </Button>
          </div>
        ) : (
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <Button type="button" hierarchy="ghost" size="lg" onClick={requestClose} disabled={saving} className={TAP}>
              Cancel
            </Button>
            <Button type="submit" form={formId} hierarchy="primary" size="lg" disabled={saving} className={TAP}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        )
      }
    >
      <form id={formId} onSubmit={save} noValidate className="flex flex-col gap-8 pt-4">
        <div className="flex flex-col gap-3">
          <span className={LABEL}>Cover</span>
          <div className="relative h-[96px] overflow-hidden rounded-xl bg-bg-brand-subtle">
            {shownCover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownCover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" hierarchy="secondary" size="md" onClick={() => coverFileRef.current?.click()} aria-describedby={coverHelpId} className={TAP}>
              {ownCover ? "Change cover" : "Upload cover"}
            </Button>
            <Button
              type="button"
              hierarchy="ghost"
              size="md"
              disabled={!ownCover}
              onClick={() => {
                setCoverError(null);
                setCover((prev) => {
                  if (prev.kind === "new") URL.revokeObjectURL(prev.url);
                  return coverUrl ? { kind: "remove" } : { kind: "keep" };
                });
              }}
              className={TAP}
            >
              Remove
            </Button>
          </div>
          <p id={coverHelpId} aria-live="polite" className={coverError ? "text-md text-text-error" : QUIET}>
            {coverError ??
              (!ownCover && fallbackCover
                ? "Showing your featured project's picture until you add one."
                : "A wide picture works best, at least 1200 px across.")}
          </p>
          <input
            ref={coverFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void pickCover(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className={LABEL}>Photo</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Avatar size="lg" initials={initialsOf(displayNameOf(name), latinName || null)} src={shownPhoto ?? undefined} />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-3">
                <Button type="button" hierarchy="secondary" size="md" onClick={() => fileRef.current?.click()} aria-describedby={photoHelpId} className={TAP}>
                  Upload photo
                </Button>
                <Button
                  type="button"
                  hierarchy="ghost"
                  size="md"
                  disabled={!shownPhoto}
                  onClick={() => {
                    setPhotoError(null);
                    setPhoto((prev) => {
                      if (prev.kind === "new") URL.revokeObjectURL(prev.url);
                      return photoUrl ? { kind: "remove" } : { kind: "keep" };
                    });
                  }}
                  className={TAP}
                >
                  Remove
                </Button>
              </div>
              <p id={photoHelpId} aria-live="polite" className={photoError ? "text-md text-text-error" : QUIET}>
                {photoError ?? "JPG or PNG. Resized on your device before it is saved."}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={nameId} className={LABEL}>
              Name
            </label>
            <span aria-hidden className={QUIET}>{`${name.trim().length}/${NAME_MAX}`}</span>
          </div>
          <TextInput
            ref={nameRef}
            id={nameId}
            size="lg"
            value={name}
            maxLength={NAME_MAX}
            onValueChange={setName}
            autoComplete="name"
            placeholder="You"
            containerClassName={TAP}
          />
          <p className={HELP}>Any script. This is the name other creators see.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={latinId} className={LABEL}>
            Name in English letters <span className="font-regular text-text-secondary">(optional)</span>
          </label>
          <TextInput
            id={latinId}
            size="lg"
            value={latinName}
            maxLength={NAME_MAX}
            onValueChange={setLatinName}
            autoComplete="off"
            containerClassName={TAP}
          />
          <p className={HELP}>Shown under your name, and used when people search.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <label htmlFor={headlineId} className={LABEL}>
              Headline
            </label>
            <button type="button" onClick={() => void runSuggest()} disabled={noShared} className={cn(PILL, TAP)}>
              <Icon icon={suggest.kind === "running" ? Cancel01Icon : AiMagicIcon} size={16} />
              {suggest.kind === "running" ? "Cancel" : "Suggest from my work"}
            </button>
          </div>
          <TextInput
            id={headlineId}
            size="lg"
            value={headline}
            maxLength={HEADLINE_MAX}
            onValueChange={setHeadline}
            aria-describedby={headlineHelpId}
            placeholder="What you build, in a few words"
            autoComplete="off"
            containerClassName={TAP}
          />
          <div id={headlineHelpId} className="flex items-baseline justify-between gap-4">
            <span className={HELP}>For example: Builds solar soil sensors for small farms</span>
            <span className={QUIET}>{`${headline.trim().length}/${HEADLINE_MAX}`}</span>
          </div>
          <p aria-live="polite" className={cn(HELP, !suggestLine && "sr-only")}>
            {suggestLine}
          </p>
          {suggest.kind === "draft" && (
            <div role="group" aria-label="AI draft" className="flex flex-col gap-3 rounded-xl border border-solid border-border-ai bg-bg-ai-subtle px-6 py-5">
              <span className="text-sm font-semibold text-text-ai">
                {`Draft from your ${shared.length} shared ${shared.length === 1 ? "project" : "projects"} · not saved`}
              </span>
              <p className="text-md text-text-primary">{suggest.text}</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  hierarchy="secondary"
                  size="md"
                  className={TAP}
                  onClick={() => {
                    setHeadline(suggest.text.slice(0, HEADLINE_MAX));
                    setSuggest({ kind: "idle" });
                  }}
                >
                  Use this
                </Button>
                <Button type="button" hierarchy="ghost" size="md" className={TAP} onClick={() => setSuggest({ kind: "idle" })}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={bioId} className={LABEL}>
              About <span className="font-regular text-text-secondary">(optional)</span>
            </label>
            <span aria-hidden className={QUIET}>{`${bio.trim().length}/${BIO_MAX}`}</span>
          </div>
          <Textarea id={bioId} rows={4} value={bio} maxLength={BIO_MAX} onValueChange={setBio} placeholder="What you build, who it is for, and what you are working on now" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={locationId} className={LABEL}>
            Location <span className="font-regular text-text-secondary">(optional)</span>
          </label>
          <TextInput
            id={locationId}
            size="lg"
            value={location}
            maxLength={LOCATION_MAX}
            onValueChange={setLocation}
            autoComplete="address-level2"
            placeholder="City, country"
            containerClassName={TAP}
          />
          <p className={HELP}>A city is enough. Your local time shows next to it.</p>
        </div>

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend id={linksId} className={cn(LABEL, "mb-2 p-0")}>
            Links <span className="font-regular text-text-secondary">(optional)</span>
          </legend>
          {links.map((value, i) => (
            <div key={i} className="flex flex-col gap-1">
              <TextInput
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                size="lg"
                type="url"
                inputMode="url"
                value={value}
                invalid={badLinks[i]}
                aria-label={`Link ${i + 1}`}
                aria-invalid={badLinks[i] || undefined}
                aria-describedby={badLinks[i] ? `${linksId}-${i}` : undefined}
                onValueChange={(v) => {
                  setLinks((prev) => prev.map((x, j) => (j === i ? v : x)));
                  if (badLinks[i]) setBadLinks((prev) => prev.map((x, j) => (j === i ? false : x)));
                }}
                onBlur={() => setBadLinks((prev) => prev.map((x, j) => (j === i ? linkBad(value) : x)))}
                placeholder={i === 0 ? "yoursite.com" : "github.com/you"}
                autoComplete="url"
                containerClassName={TAP}
              />
              {badLinks[i] && (
                <p id={`${linksId}-${i}`} className="text-md text-text-error">
                  Enter a web address, like yoursite.com
                </p>
              )}
            </div>
          ))}
        </fieldset>

        {/* relative: the rows' visually hidden inputs are placed in here, so focusing one scrolls
            the form, never the dialog's frame. */}
        <div role="radiogroup" aria-labelledby={openToId} aria-describedby={`${openToId}-help`} className="relative flex flex-col gap-1">
          <p id={openToId} className={LABEL}>
            Open to
          </p>
          <p id={`${openToId}-help`} className={cn(HELP, "mb-1")}>
            Shown on your profile, so people know when to reach out.
          </p>
          {OPEN_TO_OPTIONS.map((o) => (
            <RadioRow key={o.value || "none"} name={openToId} checked={openTo === o.value} onChange={() => setOpenTo(o.value)} label={o.label} />
          ))}
        </div>

        <div aria-live="polite" className="text-md empty:hidden">
          {failed && <p className="text-text-error">{WRITE_FAILED}</p>}
        </div>
      </form>
    </ModalFrame>
  );
}
