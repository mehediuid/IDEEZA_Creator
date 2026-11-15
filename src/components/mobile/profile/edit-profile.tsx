"use client";

// PR-30…38c · Edit profile on the phone: one form, the web's fields and rules
// (components/profile/edit-profile-dialog.tsx, lib/people/fields.ts) — Photos
// (cover and photo, resized on the phone and kept where the web keeps them),
// About you (name in any script, the English-letters name, headline with
// Suggest from my work, About, location, Open to), Skills (the skills,
// top specialties and languages sheets), Links (up to 5) and Social accounts.
// Laid out as the phone edits a profile (mobile UX pass 2026-11-15): the
// cover with the photo over its foot, then grouped rows (label over value)
// that each open a focused sheet editor writing the draft as you type —
// Name, Headline (with Suggest), About, Location, Open to, the skills sheets,
// one row per link, one per social account; a link or account is checked
// when its sheet closes, and Save opens the first bad one again.
// Save profile stays off until something changes and rides on the keyboard;
// every way out with changes — ✕, the phone's Back or swipe, the browser's
// Back — asks "Discard changes?" (PR-37), and closing the tab asks too; a
// refused write keeps every field and says so; saved, it goes back to where
// it was opened from (your profile, Settings › Account) with "Profile saved",
// and a direct link's ✕ or Save lands on your profile, never outside the app.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, Camera01Icon, Cancel01Icon, ImageAdd01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { IconButton } from "@/components/ideeza/icon-button";
import { Segmented } from "@/components/ideeza/segmented";
import { Spinner } from "@/components/ideeza/spinner";
import { Tag } from "@/components/ideeza/tag";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import {
  BIO_MAX,
  HEADLINE_MAX,
  LANGUAGES_MAX,
  LINKS_MAX,
  LOCATION_MAX,
  NAME_MAX,
  OPEN_TO_WORDS,
  SKILLS_MAX,
  SOCIAL_NETWORKS,
  SOCIAL_WORDS,
  SPECIALITIES_MAX,
  YEARS,
  YEARS_WORDS,
  cleanLanguages,
  cleanSkills,
  linkOf,
  socialNameOf,
  socialUrlOf,
  type OpenTo,
  type ProfileFields,
  type SocialNetwork,
  type Speciality,
  type Years,
} from "@/lib/people/fields";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { spokenLanguageOptions } from "@/lib/people/languages";
import { languageMatches, phoneProfileHref } from "@/lib/people/phone-profile";
import { deleteCover, deletePhoto, putCover, putPhoto, useMyCover, useMyPhoto } from "@/lib/people/photo-store";
import { readProfileFields, saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Chevron, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { canGoBack, useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { T } from "../type";
import { PICTURE_FILE_ERROR, usePicturePicker } from "./picture-picker";
import { useOwnData } from "./use-profile";

const HINT = cn(T.caption, "text-text-tertiary");
const SECTION = T.section;
const FIELD_ERROR = cn(T.caption, "text-text-error");
/** A text button under a field (A03 Link MD). */
const TEXT_BUTTON = cn(T.rowTitle, "-my-4 inline-flex min-h-[44px] items-center self-start outline-none hover:underline focus-visible:underline");
const LINK_ERROR = "Enter a web address, like yoursite.com";

const SOCIAL_PREFIX: Record<SocialNetwork, string> = {
  facebook: "facebook.com/",
  x: "x.com/",
  instagram: "instagram.com/",
  linkedin: "linkedin.com/in/",
};

const OPEN_TO_OPTIONS: { value: OpenTo; label: string }[] = [
  ...(Object.entries(OPEN_TO_WORDS) as [Exclude<OpenTo, "">, string][]).map(([value, label]) => ({ value, label })),
  { value: "", label: "Don’t show this" },
];

/** One more history entry at this same address, so the next Back lands here first. */
const pushGuard = () => window.history.pushState(window.history.state, "", window.location.href);

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** This device's time zone, so others see your local time next to where you are (as the web). */
function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

type Picture = { kind: "keep" } | { kind: "new"; blob: Blob; url: string } | { kind: "remove" };
type Suggest = { kind: "idle" } | { kind: "running" } | { kind: "draft"; text: string } | { kind: "failed" };
type Draft = {
  name: string;
  latinName: string;
  headline: string;
  bio: string;
  location: string;
  openTo: OpenTo;
  skills: string[];
  specialities: Speciality[];
  languages: string[];
  links: string[];
  social: Record<SocialNetwork, string>;
};

function draftOf(f: ProfileFields): Draft {
  return {
    name: f.name,
    latinName: f.latinName,
    headline: f.headline,
    bio: f.bio,
    location: f.location,
    openTo: f.openTo,
    skills: [...f.skills],
    specialities: [...f.specialities],
    languages: [...f.languages],
    links: f.links.map((u) => u.replace(/^https?:\/\//, "")),
    social: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, f.social[n] ? socialNameOf(n, f.social[n]) : ""])) as Record<SocialNetwork, string>,
  };
}

/** The ✕ top bar Edit profile draws (Mobile / Top bar with Close in the left slot). */
function CloseBar({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex h-[56px] shrink-0 items-center gap-4 px-8">
      <div className="flex min-w-[44px] shrink-0">
        <IconButton hierarchy="secondary" size="xl" aria-label="Close" icon={<Icon icon={Cancel01Icon} size={22} />} onClick={onClose} />
      </div>
      <h1 className={cn(T.screenTitle, "min-w-0 flex-1 truncate text-center")}>Edit profile</h1>
      <div className="min-w-[44px] shrink-0" />
    </header>
  );
}

export function EditProfileScreen() {
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const cover = useMyCover();
  const from = useSearchParams().get("from");
  const back = useGoBack(from === "settings" ? "/m/settings/account" : phoneProfileHref(ownHandleOf(fields.handle)));
  if (!hydrated || !photo.hydrated || !cover.hydrated) {
    return (
      <Screen top={<CloseBar onClose={back} />}>
        <div className="px-8 pt-4">
          <ListBones rows={5} />
        </div>
      </Screen>
    );
  }
  return <EditForm fields={fields} photoUrl={photo.url} coverUrl={cover.url} />;
}

/** A focused editor a row opens: one sheet over the form, writing the draft as you type. */
type Editor =
  | { kind: "name" | "headline" | "bio" | "location" | "openTo" }
  | { kind: "link"; index: number }
  | { kind: "social"; network: SocialNetwork };

const socialError = (n: SocialNetwork) => `Enter your ${SOCIAL_PREFIX[n].replace(/\/.*$/, "")} address, or just your username.`;

/** Focuses a sheet's field once the sheet has taken focus (the kit focuses its first control). */
function useFocusOnOpen(open: boolean, ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) {
  React.useEffect(() => {
    if (!open) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => ref.current?.focus());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, ref]);
}

/** A row of the form (label over its value, the chevron): opens the field's editor. With nothing
 *  in it, the field's placeholder in the quiet ink; an error under it in red. */
function FieldRow({
  label,
  value,
  placeholder,
  sub,
  error,
  lines = 1,
  onClick,
}: {
  label: string;
  value: string;
  placeholder?: string;
  sub?: string | null;
  error?: string | null;
  /** Two lines for the long fields (Headline, About). */
  lines?: 1 | 2;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className={LIST_ROW}>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={T.meta}>{label}</span>
          <span className={cn(T.bodyLg, "break-words", lines === 2 ? "line-clamp-2" : "truncate", !value.trim() && "text-text-tertiary")}>
            {value.trim() || placeholder || " "}
          </span>
          {sub && <span className={cn(T.meta, "truncate")}>{sub}</span>}
          {error && <span className={FIELD_ERROR}>{error}</span>}
        </span>
        <Chevron />
      </button>
    </li>
  );
}

function EditForm({ fields, photoUrl, coverUrl }: { fields: ProfileFields; photoUrl: string | null; coverUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const own = useOwnData(fields);
  const base = React.useId();
  const [initial] = React.useState(() => draftOf(fields));
  const [d, setD] = React.useState<Draft>(initial);
  const set = (patch: Partial<Draft>) => setD((v) => ({ ...v, ...patch }));
  const [linkErrors, setLinkErrors] = React.useState<boolean[]>([]);
  const [socialErrors, setSocialErrors] = React.useState<Partial<Record<SocialNetwork, boolean>>>({});
  const [pic, setPic] = React.useState<Picture>({ kind: "keep" });
  const [coverPic, setCoverPic] = React.useState<Picture>({ kind: "keep" });
  const [fileError, setFileError] = React.useState<{ what: "photo" | "cover"; text: string } | null>(null);
  const [sheet, setSheet] = React.useState<"skills" | "specialities" | "languages" | null>(null);
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [suggest, setSuggest] = React.useState<Suggest>({ kind: "idle" });
  const [saving, setSaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [discard, setDiscard] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);
  React.useEffect(() => () => {
    if (pic.kind === "new") URL.revokeObjectURL(pic.url);
  }, [pic]);
  React.useEffect(() => () => {
    if (coverPic.kind === "new") URL.revokeObjectURL(coverPic.url);
  }, [coverPic]);

  const typedLinks = d.links.map((l) => l.trim()).filter(Boolean);
  const dirty =
    d.name.trim() !== initial.name.trim() ||
    d.latinName.trim() !== initial.latinName.trim() ||
    d.headline.trim() !== initial.headline.trim() ||
    d.bio.trim() !== initial.bio.trim() ||
    d.location.trim() !== initial.location.trim() ||
    d.openTo !== initial.openTo ||
    !sameList(d.skills, initial.skills) ||
    d.specialities.map((x) => `${x.skill}\n${x.years}`).join("\n") !== initial.specialities.map((x) => `${x.skill}\n${x.years}`).join("\n") ||
    !sameList(d.languages, initial.languages) ||
    !sameList(typedLinks, initial.links.map((l) => l.trim()).filter(Boolean)) ||
    SOCIAL_NETWORKS.some((n) => d.social[n].trim() !== initial.social[n]) ||
    pic.kind !== "keep" ||
    coverPic.kind !== "keep";

  // ── the editors ──
  // Leaving a link's or a social account's editor checks the address (validate on blur): an empty
  // link goes, a bad one keeps its sheet's error on its row. Done keeps the sheet open on an error.
  const finishLink = (i: number) => {
    const v = (d.links[i] ?? "").trim();
    if (!v) {
      set({ links: d.links.filter((_, j) => j !== i) });
      setLinkErrors(linkErrors.filter((_, j) => j !== i));
    } else setLinkErrors(d.links.map((_, j) => (j === i ? linkOf(v) === null : !!linkErrors[j])));
    setEditor(null);
  };
  const finishSocial = (n: SocialNetwork) => {
    setSocialErrors({ ...socialErrors, [n]: socialUrlOf(n, d.social[n]) === null });
    setEditor(null);
  };
  const closeEditor = () => {
    if (editor?.kind === "link") finishLink(editor.index);
    else if (editor?.kind === "social") finishSocial(editor.network);
    else setEditor(null);
  };
  const addLink = () => {
    set({ links: [...d.links, ""] });
    setLinkErrors([...d.links.map((_, j) => !!linkErrors[j]), false]);
    setEditor({ kind: "link", index: d.links.length });
  };

  // ── the ways out ──
  // In the app, ✕ and Save go back to the screen Edit was opened from (your profile, Settings ›
  // Account). Opened on its own (a direct link, a reload), there is no screen behind it, so they
  // put its parent in its place: Settings › Account for `?from=settings`, else your profile.
  const from = useSearchParams().get("from");
  const me = phoneProfileHref(ownHandleOf(fields.handle));
  const parent = from === "settings" ? "/m/settings/account" : me;
  const go = React.useCallback(() => {
    if (canGoBack()) router.back();
    else router.replace(parent);
  }, [router, parent]);

  // While there are changes, one extra history entry (the same address) sits on top of this
  // screen, so the phone's Back, a swipe back and the browser's Back land on it first: the entry
  // is put back and "Discard changes?" asks, exactly as ✕ does. With an editor sheet open, that
  // Back closes the sheet first.
  const guarded = React.useRef(false);
  const leaving = React.useRef(false);
  const live = React.useRef({ dirty, saving, layer: false, closeLayer: () => {} });
  React.useEffect(() => {
    live.current = {
      dirty,
      saving,
      layer: editor !== null || sheet !== null,
      closeLayer: () => {
        if (editor) closeEditor();
        setSheet(null);
      },
    };
  });
  React.useEffect(() => {
    if (!dirty || guarded.current || leaving.current) return;
    pushGuard();
    guarded.current = true;
  }, [dirty]);
  React.useEffect(() => {
    const onPop = () => {
      if (leaving.current || !guarded.current) return;
      if (live.current.layer) {
        pushGuard();
        live.current.closeLayer();
        return;
      }
      if (live.current.dirty || live.current.saving) {
        pushGuard();
        if (!live.current.saving) setDiscard(true);
        return;
      }
      // The changes were undone by hand: Back just leaves.
      guarded.current = false;
      leaving.current = true;
      go();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go]);
  // Closing the tab or reloading with changes: the browser's own "Leave site?" prompt.
  React.useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const leave = () => {
    leaving.current = true;
    if (!guarded.current) return go();
    // Step off the guard entry first, then leave from the screen's own entry.
    guarded.current = false;
    window.addEventListener("popstate", () => window.setTimeout(go, 0), { once: true });
    window.history.back();
  };
  const close = () => {
    if (saving) return;
    if (dirty) setDiscard(true);
    else leave();
  };

  // ── photo and cover ──
  const shownPhoto = pic.kind === "new" ? pic.url : pic.kind === "remove" ? null : photoUrl;
  const ownCover = coverPic.kind === "new" ? coverPic.url : coverPic.kind === "remove" ? null : coverUrl;
  const shownCover = ownCover ?? own.fallbackCover;
  const picker = usePicturePicker({
    has: { photo: !!shownPhoto, cover: !!ownCover },
    onPick: (what, blob) => {
      setFileError(null);
      const next: Picture = { kind: "new", blob, url: URL.createObjectURL(blob) };
      if (what === "photo") setPic(next);
      else setCoverPic(next);
    },
    onRemove: (what) => (what === "photo" ? setPic({ kind: "remove" }) : setCoverPic({ kind: "remove" })),
    onBadFile: (what) => setFileError({ what, text: PICTURE_FILE_ERROR }),
  });

  // ── Suggest from my work (D7): your shared projects' titles and stories only ──
  const noShared = own.ready && own.shared.length === 0;
  const runSuggest = async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSuggest({ kind: "running" });
    try {
      const res = await fetch("/api/profile/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: own.shared }),
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
  const cancelSuggest = () => {
    abortRef.current?.abort();
    setSuggest({ kind: "idle" });
  };

  // ── save ──
  const save = async () => {
    if (saving || !dirty) return;
    const badLinks = d.links.map((l) => l.trim() !== "" && linkOf(l) === null);
    const urls = {} as Record<SocialNetwork, string>;
    const badSocial: Partial<Record<SocialNetwork, boolean>> = {};
    for (const n of SOCIAL_NETWORKS) {
      const url = socialUrlOf(n, d.social[n]);
      if (url === null) badSocial[n] = true;
      else urls[n] = url;
    }
    setLinkErrors(badLinks);
    setSocialErrors(badSocial);
    // An error opens that field's editor, its field focused.
    const firstLink = badLinks.indexOf(true);
    if (firstLink >= 0) return setEditor({ kind: "link", index: firstLink });
    const firstSocial = SOCIAL_NETWORKS.find((n) => badSocial[n]);
    if (firstSocial) return setEditor({ kind: "social", network: firstSocial });

    setSaving(true);
    setFailed(false);
    const wrote = saveProfile({
      name: d.name,
      latinName: d.latinName,
      headline: d.headline,
      bio: d.bio,
      location: d.location,
      // Your local time shows next to where you are, so the zone goes with a location, unless
      // you chose your time zone in Settings: that one stays.
      ...(readProfileFields().timeZoneManual ? {} : { timeZone: d.location.trim() ? deviceZone() : null }),
      links: d.links.flatMap((l) => {
        const url = linkOf(l);
        return url ? [url] : [];
      }),
      openTo: d.openTo,
      skills: d.skills,
      specialities: d.specialities.filter((x) => d.skills.includes(x.skill)),
      languages: cleanLanguages(d.languages),
      social: urls,
    });
    let filesOk = true;
    if (wrote.ok && pic.kind === "new") filesOk = (await putPhoto(pic.blob)).ok;
    if (wrote.ok && pic.kind === "remove") filesOk = (await deletePhoto()).ok;
    if (wrote.ok && filesOk && coverPic.kind === "new") filesOk = (await putCover(coverPic.blob)).ok;
    if (wrote.ok && filesOk && coverPic.kind === "remove") filesOk = (await deleteCover()).ok;
    setSaving(false);
    if (!wrote.ok || !filesOk) {
      setFailed(true);
      document.getElementById(`${base}-top`)?.scrollIntoView({ block: "start" });
      return;
    }
    toast({ title: "Profile saved" });
    leave();
  };

  const name = displayNameOf(d.name);
  const setLink = (i: number, v: string) => {
    set({ links: d.links.map((x, j) => (j === i ? v : x)) });
    if (linkErrors[i]) setLinkErrors(linkErrors.map((e, j) => (j === i ? false : e)));
  };
  const setSocial = (n: SocialNetwork, v: string) => {
    set({ social: { ...d.social, [n]: v } });
    if (socialErrors[n]) setSocialErrors({ ...socialErrors, [n]: false });
  };
  const openToLabel = OPEN_TO_OPTIONS.find((o) => o.value === d.openTo)?.label ?? "";
  const linkEditing = editor?.kind === "link" ? editor.index : null;
  const socialEditing = editor?.kind === "social" ? editor.network : null;

  return (
    <Screen
      top={<CloseBar onClose={close} />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" disabled={!dirty} loading={saving} onClick={save}>
            Save profile
          </Button>
        </BottomBar>
      }
    >
      <div id={`${base}-top`} className="flex flex-col gap-8 px-8 pb-12">
        {failed && (
          <Banner tone="error" title="Couldn’t save">
            Try again. Your changes are kept.
          </Banner>
        )}
        <p className={T.body}>Other creators see these on your profile.</p>

        {/* Photos: the cover with your photo over its foot, as your profile draws them */}
        <section aria-labelledby={`${base}-photos`} className="flex flex-col gap-4">
          <h2 id={`${base}-photos`} className={SECTION}>
            Photos
          </h2>
          <div className="flex flex-col">
            <div className="relative">
              <div className="relative aspect-[375/140] w-full overflow-hidden rounded-lg bg-bg-brand-subtle">
                {shownCover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownCover} alt="Your cover" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute bottom-4 right-4">
                  <Button hierarchy="secondary" size="sm" iconLeading={<Icon icon={ImageAdd01Icon} size={14} />} onClick={() => picker.open("cover")}>
                    {ownCover ? "Change cover" : "Add cover"}
                  </Button>
                </div>
              </div>
              <div className="absolute -bottom-[32px] left-6">
                <Avatar size="xl" phone initials={initialsOf(name, d.latinName || null)} src={shownPhoto ?? undefined} label="Your photo" className="ring-4 ring-bg-page" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button hierarchy="secondary" size="md" iconLeading={<Icon icon={Camera01Icon} size={16} />} onClick={() => picker.open("photo")}>
                {shownPhoto ? "Change photo" : "Add photo"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className={HINT}>{!ownCover && shownCover ? "Showing your featured project’s picture until you add one." : "A wide picture works best, at least 1200 px across."}</p>
            <p className={HINT}>JPG or PNG. Resized on your device before it is saved.</p>
            {fileError && (
              <p role="alert" className={FIELD_ERROR}>
                {fileError.text}
              </p>
            )}
          </div>
        </section>

        {/* About you */}
        <section aria-labelledby={`${base}-about`} className="flex flex-col gap-4">
          <h2 id={`${base}-about`} className={SECTION}>
            About you
          </h2>
          <ListCard>
            <FieldRow label="Name" value={d.name} placeholder="You" sub={d.latinName.trim() || null} onClick={() => setEditor({ kind: "name" })} />
            <FieldRow label="Headline" value={d.headline} placeholder="What you build, in a few words" lines={2} onClick={() => setEditor({ kind: "headline" })} />
            <FieldRow label="About" value={d.bio} placeholder="What you build, who it is for, and what you are working on now" lines={2} onClick={() => setEditor({ kind: "bio" })} />
            <FieldRow label="Location" value={d.location} placeholder="City, country" onClick={() => setEditor({ kind: "location" })} />
            <FieldRow label="Open to" value={openToLabel} onClick={() => setEditor({ kind: "openTo" })} />
          </ListCard>
        </section>

        {/* Skills */}
        <section aria-labelledby={`${base}-skills`} className="flex flex-col gap-4">
          <h2 id={`${base}-skills`} className={SECTION}>
            Skills
          </h2>
          <ListCard>
            <ListRow title="Your skills" value={`${d.skills.length} of ${SKILLS_MAX}`} onClick={() => setSheet("skills")} />
            <ListRow title="Top specialties" value={`${d.specialities.length} of ${SPECIALITIES_MAX}`} onClick={() => setSheet("specialities")} />
            <ListRow title="Languages" value={String(d.languages.length)} onClick={() => setSheet("languages")} />
          </ListCard>
          {d.skills.length > 0 && (
            <ul aria-label="Your skills" className="m-0 flex list-none flex-wrap gap-4 p-0">
              {d.skills.map((s) => (
                <li key={s}>
                  <Tag size="md">{s}</Tag>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Links */}
        <section aria-labelledby={`${base}-links`} className="flex flex-col gap-4">
          <h2 id={`${base}-links`} className={SECTION}>
            Links (up to {LINKS_MAX})
          </h2>
          <ListCard>
            {d.links.map((l, i) => (
              <FieldRow key={i} label={`Link ${i + 1}`} value={l} placeholder="yoursite.com" error={linkErrors[i] ? LINK_ERROR : null} onClick={() => setEditor({ kind: "link", index: i })} />
            ))}
            {d.links.length < LINKS_MAX && (
              <li>
                <button type="button" onClick={addLink} className={cn(LIST_ROW, "text-text-brand")}>
                  <span className="shrink-0 text-[color:var(--color-icon-brand)]">
                    <Icon icon={Add01Icon} size={24} />
                  </span>
                  <span className={cn(T.rowTitle, "min-w-0 flex-1 text-text-brand")}>Add link</span>
                </button>
              </li>
            )}
          </ListCard>
        </section>

        {/* Social accounts */}
        <section aria-labelledby={`${base}-social`} className="flex flex-col gap-4">
          <h2 id={`${base}-social`} className={SECTION}>
            Social accounts
          </h2>
          <ListCard>
            {SOCIAL_NETWORKS.map((n) => (
              <FieldRow
                key={n}
                label={SOCIAL_WORDS[n]}
                value={d.social[n].trim() ? `${SOCIAL_PREFIX[n]}${d.social[n].trim()}` : ""}
                placeholder="username"
                error={socialErrors[n] ? socialError(n) : null}
                onClick={() => setEditor({ kind: "social", network: n })}
              />
            ))}
          </ListCard>
        </section>
      </div>

      {picker.sheets}
      <NameSheet open={editor?.kind === "name"} onClose={closeEditor} name={d.name} latinName={d.latinName} onName={(v) => set({ name: v.slice(0, NAME_MAX) })} onLatinName={(v) => set({ latinName: v.slice(0, NAME_MAX) })} />
      <TextSheet
        open={editor?.kind === "headline"}
        onClose={closeEditor}
        title="Headline"
        rows={2}
        max={HEADLINE_MAX}
        placeholder="What you build, in a few words"
        value={d.headline}
        onChange={(v) => set({ headline: v.slice(0, HEADLINE_MAX) })}
      >
        <SuggestLine
          state={suggest}
          noShared={noShared}
          ready={own.ready}
          onRun={runSuggest}
          onCancel={cancelSuggest}
          onUse={(text) => {
            set({ headline: text.slice(0, HEADLINE_MAX) });
            setSuggest({ kind: "idle" });
          }}
          onDiscard={() => setSuggest({ kind: "idle" })}
        />
      </TextSheet>
      <TextSheet
        open={editor?.kind === "bio"}
        onClose={closeEditor}
        title="About"
        rows={6}
        max={BIO_MAX}
        placeholder="What you build, who it is for, and what you are working on now"
        value={d.bio}
        onChange={(v) => set({ bio: v.slice(0, BIO_MAX) })}
      />
      <LineSheet
        open={editor?.kind === "location"}
        onClose={closeEditor}
        title="Location"
        value={d.location}
        onChange={(v) => set({ location: v.slice(0, LOCATION_MAX) })}
        hint="A city is enough. Your local time shows next to it."
        input={{ maxLength: LOCATION_MAX, placeholder: "City, country", autoComplete: "address-level2" }}
      />
      <PickSheet open={editor?.kind === "openTo"} onClose={closeEditor} title="Open to" value={d.openTo} options={OPEN_TO_OPTIONS} onPick={(v) => set({ openTo: v })} />
      <LineSheet
        open={linkEditing !== null}
        onClose={closeEditor}
        title={`Link ${(linkEditing ?? 0) + 1}`}
        value={linkEditing !== null ? (d.links[linkEditing] ?? "") : ""}
        onChange={(v) => linkEditing !== null && setLink(linkEditing, v)}
        error={linkEditing !== null && linkErrors[linkEditing] ? LINK_ERROR : null}
        onDone={() => {
          if (linkEditing === null) return;
          const v = (d.links[linkEditing] ?? "").trim();
          if (v && linkOf(v) === null) return setLinkErrors(d.links.map((_, j) => (j === linkEditing ? true : !!linkErrors[j])));
          finishLink(linkEditing);
        }}
        remove={
          linkEditing !== null
            ? {
                label: "Remove link",
                onClick: () => {
                  set({ links: d.links.filter((_, j) => j !== linkEditing) });
                  setLinkErrors(linkErrors.filter((_, j) => j !== linkEditing));
                  setEditor(null);
                },
              }
            : undefined
        }
        input={{ type: "url", inputMode: "url", autoCapitalize: "none", autoCorrect: "off", placeholder: "yoursite.com" }}
      />
      <LineSheet
        open={socialEditing !== null}
        onClose={closeEditor}
        title={socialEditing ? SOCIAL_WORDS[socialEditing] : ""}
        value={socialEditing ? d.social[socialEditing] : ""}
        onChange={(v) => socialEditing && setSocial(socialEditing, v)}
        error={socialEditing && socialErrors[socialEditing] ? socialError(socialEditing) : null}
        onDone={() => {
          if (!socialEditing) return;
          if (socialUrlOf(socialEditing, d.social[socialEditing]) === null) return setSocialErrors({ ...socialErrors, [socialEditing]: true });
          finishSocial(socialEditing);
        }}
        input={{ prefixText: socialEditing ? SOCIAL_PREFIX[socialEditing] : undefined, autoCapitalize: "none", autoCorrect: "off", placeholder: "username" }}
      />
      <SkillsSheet open={sheet === "skills"} onClose={() => setSheet(null)} skills={d.skills} onChange={(skills) => set({ skills, specialities: d.specialities.filter((x) => skills.includes(x.skill)) })} />
      <SpecialitiesSheet open={sheet === "specialities"} onClose={() => setSheet(null)} skills={d.skills} specialities={d.specialities} onChange={(specialities) => set({ specialities })} />
      <LanguagesSheet open={sheet === "languages"} onClose={() => setSheet(null)} languages={d.languages} onChange={(languages) => set({ languages })} />
      <ConfirmSheet
        open={discard}
        onClose={() => setDiscard(false)}
        title="Discard changes?"
        body="Your edits to your profile are lost."
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={leave}
      />
    </Screen>
  );
}

// ─────────────────────────── the focused editors ───────────────────────────

const doneButton = (onClick: () => void) => (
  <Button size="xl" className="w-full" onClick={onClick}>
    Done
  </Button>
);

/** Name: the name in any script and the English-letters name, with the web's counter and hints. */
function NameSheet({
  open,
  onClose,
  name,
  latinName,
  onName,
  onLatinName,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  latinName: string;
  onName: (v: string) => void;
  onLatinName: (v: string) => void;
}) {
  const ids = useFieldIds(["name", "latin"] as const);
  const ref = React.useRef<HTMLInputElement>(null);
  useFocusOnOpen(open, ref);
  return (
    <Sheet open={open} onClose={onClose} title="Name" actions={doneButton(onClose)}>
      <Field label={`Name (${name.length}/${NAME_MAX})`} htmlFor={ids.name.id}>
        <TextInput ref={ref} id={ids.name.id} size="xl" maxLength={NAME_MAX} placeholder="You" autoComplete="name" value={name} onValueChange={onName} />
        <p className={HINT}>{name.trim() ? "Any script. This is the name other creators see." : "You can leave this empty. Others see “Unnamed creator”."}</p>
      </Field>
      <Field label="Name in English letters (optional)" htmlFor={ids.latin.id}>
        <TextInput id={ids.latin.id} size="xl" maxLength={NAME_MAX} enterKeyHint="done" value={latinName} onValueChange={onLatinName} onKeyDown={(e) => e.key === "Enter" && onClose()} />
        <p className={HINT}>Shown under your name, and used when people search.</p>
      </Field>
    </Sheet>
  );
}

/** Headline, About: one text area with its counter; Headline carries Suggest from my work. */
function TextSheet({
  open,
  onClose,
  title,
  rows,
  max,
  placeholder,
  value,
  onChange,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: number;
  max: number;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  children?: React.ReactNode;
}) {
  const id = React.useId();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  useFocusOnOpen(open, ref);
  return (
    <Sheet open={open} onClose={onClose} title={title} actions={doneButton(onClose)}>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="sr-only">
          {title}
        </label>
        <Textarea ref={ref} id={id} rows={rows} maxLength={max} placeholder={placeholder} value={value} onValueChange={onChange} />
        <p className={cn(HINT, "tabular-nums")}>
          {value.length}/{max}
        </p>
      </div>
      {children}
    </Sheet>
  );
}

/** One line: Location, a link, a social account. `onDone` checks the value first (a link, an
 *  account); `remove` is a link's Remove link. */
function LineSheet({
  open,
  onClose,
  title,
  value,
  onChange,
  hint,
  error,
  onDone,
  remove,
  input,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string | null;
  onDone?: () => void;
  remove?: { label: string; onClick: () => void };
  input: Omit<React.ComponentProps<typeof TextInput>, "value" | "onValueChange" | "size" | "id">;
}) {
  const id = React.useId();
  const ref = React.useRef<HTMLInputElement>(null);
  useFocusOnOpen(open, ref);
  const done = onDone ?? onClose;
  React.useEffect(() => {
    if (open && error) ref.current?.focus();
  }, [open, error]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          {doneButton(done)}
          {remove && (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={remove.onClick}>
              {remove.label}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="sr-only">
          {title}
        </label>
        <TextInput
          ref={ref}
          id={id}
          size="xl"
          enterKeyHint="done"
          {...input}
          value={value}
          invalid={!!error}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onValueChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              done();
            }
          }}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className={FIELD_ERROR}>
            {error}
          </p>
        ) : (
          hint && <p className={HINT}>{hint}</p>
        )}
      </div>
    </Sheet>
  );
}

// ─────────────────────────── Suggest from my work (PR-34…34c) ───────────────────────────

function SuggestLine({
  state,
  noShared,
  ready,
  onRun,
  onCancel,
  onUse,
  onDiscard,
}: {
  state: Suggest;
  noShared: boolean;
  ready: boolean;
  onRun: () => void;
  onCancel: () => void;
  onUse: (text: string) => void;
  onDiscard: () => void;
}) {
  if (state.kind === "running") {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className={cn(T.meta, "flex items-start gap-4")}>
          <Spinner size={16} />
          Reading your shared projects… this can take up to 40 seconds.
        </p>
        <button type="button" onClick={onCancel} className={TEXT_BUTTON}>
          Cancel
        </button>
      </div>
    );
  }
  if (state.kind === "draft") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-6">
        <span className="self-start">
          <Badge tone="brand">AI draft</Badge>
        </span>
        <p className={cn(T.body, "text-text-primary")}>{state.text}</p>
        <p className={HINT}>Not saved until you save your profile.</p>
        <div className="grid grid-cols-2 gap-4">
          <Button size="md" className="w-full" onClick={() => onUse(state.text)}>
            Use this
          </Button>
          <Button hierarchy="secondary" size="md" className="w-full" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    );
  }
  // PR-34c: with nothing shared there is nothing to read, so the alert takes the link's place.
  if (noShared) return <Banner tone="info">Share a project first, and the AI can suggest a headline from it.</Banner>;
  return (
    <div className="flex flex-col gap-2">
      {state.kind === "failed" && (
        <Banner
          tone="error"
          title="Couldn’t write a suggestion"
          action={
            <button type="button" className="font-medium hover:underline" onClick={onRun}>
              Try again
            </button>
          }
        >
          Your headline is unchanged.
        </Banner>
      )}
      {state.kind === "idle" && (
        <button type="button" disabled={!ready} onClick={onRun} className={cn(TEXT_BUTTON, "text-text-brand disabled:cursor-not-allowed disabled:text-text-disabled disabled:no-underline")}>
          Suggest from my work
        </button>
      )}
    </div>
  );
}

// ─────────────────────────── the sheets (PR-35…35c) ───────────────────────────

function SkillsSheet({ open, onClose, skills, onChange }: { open: boolean; onClose: () => void; skills: string[]; onChange: (s: string[]) => void }) {
  const id = React.useId();
  const [typed, setTyped] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const full = skills.length >= SKILLS_MAX;
  const add = () => {
    const words = typed.split(",").map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    const next = cleanSkills([...skills, ...words]);
    if (next.length - skills.length < words.length) setNote(next.length >= SKILLS_MAX ? "Remove a skill to add another." : "You already have that skill.");
    else {
      setNote(null);
      setTyped("");
    }
    onChange(next);
  };
  const done = () => {
    setTyped("");
    setNote(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={done}
      title="Your skills"
      description={`${skills.length} of ${SKILLS_MAX}`}
      actions={
        <Button size="xl" className="w-full" onClick={done}>
          Done
        </Button>
      }
    >
      <Field label="Add a skill" htmlFor={id} error={note && !full ? note : undefined} errorId={`${id}-error`}>
        <div className="flex items-start gap-4">
          <TextInput
            id={id}
            size="xl"
            enterKeyHint="done"
            placeholder="Firmware"
            containerClassName="flex-1"
            disabled={full}
            value={typed}
            invalid={!!note && !full}
            aria-invalid={(!!note && !full) || undefined}
            aria-describedby={note && !full ? `${id}-error` : undefined}
            onValueChange={(v) => {
              setTyped(v);
              setNote(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button hierarchy="secondary" size="xl" disabled={full || !typed.trim()} onClick={add}>
            Add
          </Button>
        </div>
      </Field>
      {skills.length > 0 && (
        <ul aria-label="Your skills" className="m-0 flex list-none flex-wrap gap-4 p-0">
          {skills.map((s) => (
            <li key={s}>
              <Tag size="md" onDismiss={() => onChange(skills.filter((x) => x !== s))} dismissLabel={`Remove ${s}`}>
                {s}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      <p className={HINT}>{full ? "Remove a skill to add another." : "Press Enter to add one. A comma separates several."}</p>
    </Sheet>
  );
}

function SpecialitiesSheet({
  open,
  onClose,
  skills,
  specialities,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  skills: string[];
  specialities: Speciality[];
  onChange: (s: Speciality[]) => void;
}) {
  const full = specialities.length >= SPECIALITIES_MAX;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Top specialties"
      description={`Pick up to ${SPECIALITIES_MAX} from your skills.`}
      actions={
        <Button size="xl" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      {skills.length === 0 ? (
        <p className={T.body}>Add your skills first. Your top specialties come from them.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {skills.map((s) => {
            const picked = specialities.find((x) => x.skill === s);
            const off = !picked && full;
            return (
              <li key={s} className="flex flex-col gap-2">
                <label className={cn("relative flex min-h-[44px] items-center gap-6 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus", off ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!picked}
                    disabled={off}
                    onChange={() => onChange(picked ? specialities.filter((x) => x.skill !== s) : [...specialities, { skill: s, years: "1-2" }])}
                  />
                  <Checkbox checked={!!picked} disabled={off} decorative />
                  <span className={cn(T.bodyLg, off && "text-text-disabled")}>{s}</span>
                </label>
                {picked && (
                  // PR-35b: the years are picked in this sheet (one sheet, one scrim), not in a second one.
                  <div className="flex items-center gap-4 pl-[32px]">
                    <Segmented
                      label={`Years of ${s}`}
                      size="md"
                      value={picked.years}
                      options={YEARS.map((y) => ({ value: y, label: YEARS_WORDS[y].replace(/ Years$/, "") }))}
                      onChange={(y: Years) => onChange(specialities.map((x) => (x.skill === s ? { ...x, years: y } : x)))}
                    />
                    <span className={T.meta}>years</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {full && <p className={HINT}>You picked {SPECIALITIES_MAX}. Untick one to pick another.</p>}
    </Sheet>
  );
}

function LanguagesSheet({ open, onClose, languages, onChange }: { open: boolean; onClose: () => void; languages: string[]; onChange: (l: string[]) => void }) {
  const options = React.useMemo(() => spokenLanguageOptions(), []);
  const [q, setQ] = React.useState("");
  const id = React.useId();
  const full = languages.length >= LANGUAGES_MAX;
  const query = q.trim();
  const matches = languageMatches(options, query).filter((l) => !languages.includes(l)).slice(0, 8);
  const done = () => {
    setQ("");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={done}
      title="Languages"
      description={`${languages.length} of ${LANGUAGES_MAX}`}
      actions={
        <Button size="xl" className="w-full" onClick={done}>
          Done
        </Button>
      }
    >
      <label htmlFor={id} className="sr-only">
        Search languages
      </label>
      <TextInput
        id={id}
        size="xl"
        type="search"
        placeholder="Search languages"
        disabled={full}
        value={q}
        onValueChange={setQ}
        suffix={<Icon icon={Search01Icon} size={20} />}
      />
      {full && <p className={HINT}>Remove a language to add another.</p>}
      {query && !full && (
        <ul aria-label="Matching languages" className="-mx-8 m-0 flex list-none flex-col p-0">
          {matches.length === 0 ? (
            <li className={cn(T.body, "px-8 py-4")}>No language matches “{q.trim()}”.</li>
          ) : (
            matches.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...languages, l].slice(0, LANGUAGES_MAX));
                    setQ("");
                  }}
                  className={cn(T.bodyLg, "flex min-h-[44px] w-full items-center rounded-md px-8 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  {l}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {languages.length > 0 && (
        <ul aria-label="Languages you speak" className="m-0 flex list-none flex-wrap gap-4 p-0">
          {languages.map((l) => (
            <li key={l}>
              <Tag size="md" onDismiss={() => onChange(languages.filter((x) => x !== l))} dismissLabel={`Remove ${l}`}>
                {l}
              </Tag>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
