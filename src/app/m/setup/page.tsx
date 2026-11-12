"use client";

// AU-14…17 · Your profile, four optional steps after Name and handle, with
// the web's fields and limits (lib/people/fields.ts): 1 Photo and headline,
// 2 About you, 3 Skills and top 3 specialities, 4 Links. Continue saves the
// step and Skip moves on, both always on; four A22 segments show the step.
// The photo menu (14b) asks the kit's pre-prompt the first time (KIT-PM-01
// camera, PM-02 photos); a failed upload keeps the text (14e); a 4th
// speciality is refused (16b); a failed save keeps what was typed (17b). A
// link or a social profile that can't be saved says why under its field, and
// Finish goes to the first one. Finish → the Welcome map.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, Camera01Icon, Delete02Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FIELD_LABEL, Field, useFieldIds } from "@/components/auth/auth-parts";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Tag } from "@/components/ideeza/tag";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, type AlertSpec } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { usePrePrompt } from "@/components/mobile/kit/permission-sheet";
import { ActionSheet } from "@/components/mobile/kit/sheet";
import { SheetSelect } from "@/components/mobile/kit/sheet-select";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { T } from "@/components/mobile/type";
import { mobileNext } from "@/lib/account/phone";
import {
  BIO_MAX,
  HEADLINE_MAX,
  LANGUAGES_MAX,
  LINKS_MAX,
  LOCATION_MAX,
  SKILLS_MAX,
  SOCIAL_NETWORKS,
  SOCIAL_WORDS,
  SPECIALITIES_MAX,
  YEARS,
  YEARS_WORDS,
  cleanSkills,
  linkOf,
  socialNameOf,
  socialUrlOf,
  type OpenTo,
  type ProfileFields,
  type SocialNetwork,
  type Years,
} from "@/lib/people/fields";
import { initialsOf } from "@/lib/people/ids";
import { spokenLanguageOptions } from "@/lib/people/languages";
import { deletePhoto, putPhoto, resizePhoto, useMyPhoto } from "@/lib/people/photo-store";
import { readProfileFields, saveProfile, type ProfilePatch } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";

const STEPS = ["Photo and headline", "About you", "Skills", "Links"] as const;

const SOCIAL_PREFIX: Record<SocialNetwork, string> = {
  facebook: "facebook.com/",
  x: "x.com/",
  instagram: "instagram.com/",
  linkedin: "linkedin.com/in/",
};

/** Why a social profile can't be saved: "Enter a Facebook username or a facebook.com link." */
const socialError = (n: SocialNetwork) => `Enter a ${SOCIAL_WORDS[n]} username or a ${SOCIAL_PREFIX[n].split("/")[0]} link.`;

const HELPER = cn(T.meta, "text-text-tertiary");

const OPEN_TO: readonly { value: OpenTo; label: string }[] = [
  { value: "both", label: "Collaboration and questions" },
  { value: "collaboration", label: "Collaboration" },
  { value: "questions", label: "Questions" },
  { value: "", label: "Don’t show this" },
];

export default function SetupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const step = Math.min(4, Math.max(1, Number(params.get("step")) || 1));
  const next = mobileNext(params.get("next"));
  const tail = next === "/m" ? "" : `next=${encodeURIComponent(next)}`;
  const [f, setF] = React.useState<ProfileFields>(readProfileFields);
  const [alert, setAlert] = React.useState<AlertSpec | null>(null);
  const [linkErrors, setLinkErrors] = React.useState<string[]>([]);
  // Finish was pressed with a social profile that can't be saved: each one says why.
  const [socialsTried, setSocialsTried] = React.useState(false);
  const [socials, setSocials] = React.useState<Record<SocialNetwork, string>>(() => {
    const p = readProfileFields();
    return Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, p.social[n] ? socialNameOf(n, p.social[n]) : ""])) as Record<SocialNetwork, string>;
  });
  const [links, setLinks] = React.useState<string[]>(() => {
    const l = readProfileFields().links;
    return l.length ? l.map((u) => u.replace(/^https?:\/\//, "")) : [""];
  });
  const set = (patch: Partial<ProfileFields>) => setF((v) => ({ ...v, ...patch }));

  const goTo = (n: number) => {
    setAlert(null);
    router.push(n > 4 ? `/m/welcome-map${tail ? `?${tail}` : ""}` : `/m/setup?step=${n}${tail ? `&${tail}` : ""}`);
  };

  const patchFor = (): ProfilePatch | null => {
    if (step === 1) return { latinName: f.latinName.trim(), headline: f.headline.trim() };
    if (step === 2) return { bio: f.bio.trim(), location: f.location.trim(), languages: f.languages, openTo: f.openTo };
    if (step === 3) return { skills: f.skills, specialities: f.specialities };
    const errs = links.map((raw) => (raw.trim() && !linkOf(raw) ? "Enter a web address like example.com." : ""));
    const social = Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, socialUrlOf(n, socials[n])])) as Record<SocialNetwork, string | null>;
    setLinkErrors(errs);
    setSocialsTried(true);
    if (errs.some(Boolean) || Object.values(social).some((v) => v === null)) {
      // To the first field that says why.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#m-app [aria-invalid="true"]')?.focus());
      return null;
    }
    return { links: links.map((raw) => linkOf(raw)).filter((u): u is string => !!u), social: social as Record<SocialNetwork, string> };
  };

  const save = () => {
    const patch = patchFor();
    if (!patch) return;
    if (!saveProfile(patch).ok) {
      const kept = step === 4 ? "Your links are kept." : "What you typed is kept.";
      return setAlert({ tone: "error", title: "Couldn’t save", body: `${kept} Try again.`, action: <button type="button" className="font-medium hover:underline" onClick={save}>Try again</button> });
    }
    goTo(step + 1);
  };

  return (
    <Screen
      top={<TopBar back title="Your profile" />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" onClick={save}>
            {step === 4 ? "Finish" : "Continue"}
          </Button>
          <Button hierarchy="ghost" size="xl" className="w-full" onClick={() => goTo(step + 1)}>
            Skip
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <div className="flex flex-col gap-2">
          <p className={T.meta}>
            Step {step} of 4 · {STEPS[step - 1]}
          </p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <ProgressBar key={s} value={i < step ? 100 : 0} label={`Step ${i + 1}: ${s}`} className="flex-1" />
            ))}
          </div>
        </div>
        {step === 1 && <PhotoStep f={f} set={set} setAlert={setAlert} alert={alert} />}
        {step === 2 && <AboutStep f={f} set={set} alert={alert} />}
        {step === 3 && <SkillsStep f={f} set={set} alert={alert} />}
        {step === 4 && (
          <LinksStep links={links} setLinks={setLinks} errors={linkErrors} socials={socials} setSocials={setSocials} socialsTried={socialsTried} alert={alert} />
        )}
      </div>
    </Screen>
  );
}

type StepProps = { f: ProfileFields; set: (p: Partial<ProfileFields>) => void; alert: AlertSpec | null };

function Counter({ n, max }: { n: number; max: number }) {
  return (
    <p className={cn(HELPER, "tabular-nums")}>
      {n}/{max}
    </p>
  );
}

function PhotoStep({ f, set, alert, setAlert }: StepProps & { setAlert: (a: AlertSpec | null) => void }) {
  const ids = useFieldIds(["latin", "headline"] as const);
  const photo = useMyPhoto();
  const [menu, setMenu] = React.useState(false);
  const cameraAsk = usePrePrompt("camera");
  const photosAsk = usePrePrompt("photos");
  const camera = React.useRef<HTMLInputElement>(null);
  const library = React.useRef<HTMLInputElement>(null);
  const last = React.useRef<File | null>(null);

  const upload = async (file: File) => {
    last.current = file;
    const blob = await resizePhoto(file);
    const ok = blob ? (await putPhoto(blob)).ok : false;
    setAlert(
      ok
        ? null
        : {
            tone: "error",
            title: "Couldn’t upload your photo",
            body: "Check your connection and try again. Your headline is kept.",
            action: (
              <button type="button" className="font-medium hover:underline" onClick={() => last.current && void upload(last.current)}>
                Try again
              </button>
            ),
          },
    );
  };

  // The kit's pre-prompt the first time (KIT-PM-01 camera, PM-02 photos), then the phone's own picker.
  const pick = (kind: "camera" | "photos") =>
    (kind === "camera" ? cameraAsk : photosAsk).ask(() => (kind === "camera" ? camera : library).current?.click());

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void upload(file);
  };

  return (
    <>
      <AccountHeading title="Add a photo and headline">Both are optional. You can change them later in your profile.</AccountHeading>
      <AccountAlert alert={alert} />
      <div className="flex flex-col items-center gap-4 py-2">
        <Avatar size="xl" initials={initialsOf(f.name, f.latinName)} src={photo.url ?? undefined} label={`${f.name || "Your"} photo`} />
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Camera01Icon} size={20} />} onClick={() => setMenu(true)}>
          {photo.url ? "Change photo" : "Add photo"}
        </Button>
        <input ref={camera} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        <input ref={library} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
      </div>
      <Field label="Name in English letters (optional)" htmlFor={ids.latin.id}>
        <TextInput id={ids.latin.id} size="xl" value={f.latinName} onValueChange={(v) => set({ latinName: v.slice(0, 60) })} />
        <p className={HELPER}>Only if your name uses another script.</p>
      </Field>
      <Field label="Headline" htmlFor={ids.headline.id}>
        <Textarea
          id={ids.headline.id}
          rows={2}
          maxLength={HEADLINE_MAX}
          placeholder="For example: Builds solar soil sensors for small farms"
          value={f.headline}
          onValueChange={(v) => set({ headline: v.slice(0, HEADLINE_MAX) })}
        />
        <Counter n={f.headline.length} max={HEADLINE_MAX} />
      </Field>
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Profile photo"
        items={[
          { label: "Take photo", icon: Camera01Icon, onSelect: () => pick("camera") },
          { label: "Choose from library", icon: Image01Icon, onSelect: () => pick("photos") },
          ...(photo.url ? [{ label: "Remove photo", icon: Delete02Icon, destructive: true, onSelect: () => void deletePhoto() }] : []),
        ]}
      />
      {cameraAsk.sheet}
      {photosAsk.sheet}
    </>
  );
}

function AboutStep({ f, set, alert }: StepProps) {
  const ids = useFieldIds(["bio", "location", "languages"] as const);
  const languages = React.useMemo(() => spokenLanguageOptions(), []);
  const full = f.languages.length >= LANGUAGES_MAX;
  return (
    <>
      <AccountHeading title="About you">Tell other creators what you make.</AccountHeading>
      <AccountAlert alert={alert} />
      <Field label="About" htmlFor={ids.bio.id}>
        <Textarea id={ids.bio.id} rows={4} maxLength={BIO_MAX} value={f.bio} onValueChange={(v) => set({ bio: v.slice(0, BIO_MAX) })} />
        <Counter n={f.bio.length} max={BIO_MAX} />
      </Field>
      <Field label="Location" htmlFor={ids.location.id}>
        <TextInput
          id={ids.location.id}
          size="xl"
          autoComplete="address-level2"
          maxLength={LOCATION_MAX}
          value={f.location}
          onValueChange={(v) => set({ location: v })}
        />
        <p className={HELPER}>City, country</p>
      </Field>
      <div className="flex flex-col gap-4">
        <label htmlFor={ids.languages.id} className={FIELD_LABEL}>
          Languages (up to {LANGUAGES_MAX})
        </label>
        {!full && (
          <SheetSelect
            id={ids.languages.id}
            title="Add a language"
            placeholder="Add a language"
            value=""
            options={languages.filter((l) => !f.languages.includes(l)).map((l) => ({ value: l, label: l }))}
            onChange={(l) => set({ languages: [...f.languages, l].slice(0, LANGUAGES_MAX) })}
          />
        )}
        {f.languages.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {f.languages.map((l) => (
              <Tag key={l} size="md" onDismiss={() => set({ languages: f.languages.filter((x) => x !== l) })} dismissLabel={`Remove ${l}`}>
                {l}
              </Tag>
            ))}
          </div>
        )}
      </div>
      <fieldset className="flex flex-col">
        <legend className={cn(FIELD_LABEL, "pb-2")}>Open to</legend>
        {OPEN_TO.map((o) => (
          <label key={o.label} className="relative flex min-h-[44px] cursor-pointer items-center gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input type="radio" name="open-to" className="sr-only" checked={f.openTo === o.value} onChange={() => set({ openTo: o.value })} />
            <Radio checked={f.openTo === o.value} decorative />
            <span className={T.bodyLg}>{o.label}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

function SkillsStep({ f, set, alert }: StepProps) {
  const ids = useFieldIds(["skill"] as const);
  const [typing, setTyping] = React.useState("");
  const [refused, setRefused] = React.useState(false);
  const add = () => {
    const skills = cleanSkills([...f.skills, typing]);
    set({ skills });
    setTyping("");
  };
  const remove = (s: string) => set({ skills: f.skills.filter((x) => x !== s), specialities: f.specialities.filter((p) => p.skill !== s) });
  const toggle = (s: string) => {
    if (f.specialities.some((p) => p.skill === s)) {
      setRefused(false);
      return set({ specialities: f.specialities.filter((p) => p.skill !== s) });
    }
    if (f.specialities.length >= SPECIALITIES_MAX) return setRefused(true);
    set({ specialities: [...f.specialities, { skill: s, years: "0-1" }] });
  };
  return (
    <>
      <AccountHeading title="Skills">Add up to 16. Then pick your top 3.</AccountHeading>
      <AccountAlert alert={alert} />
      <div className="flex flex-col gap-4">
        <Field label="Add skills" htmlFor={ids.skill.id}>
          <TextInput
            id={ids.skill.id}
            size="xl"
            enterKeyHint="done"
            placeholder="Type a skill, then Return"
            value={typing}
            disabled={f.skills.length >= SKILLS_MAX}
            onValueChange={setTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (typing.trim()) add();
              }
            }}
          />
          <p className={HELPER}>
            {f.skills.length} of {SKILLS_MAX}
          </p>
        </Field>
        {f.skills.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {f.skills.map((s) => (
              <Tag key={s} size="md" onDismiss={() => remove(s)} dismissLabel={`Remove ${s}`}>
                {s}
              </Tag>
            ))}
          </div>
        )}
      </div>
      {f.skills.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className={FIELD_LABEL}>Your top 3 specialities</p>
          <div className="flex flex-wrap gap-4">
            {f.skills.map((s) => (
              <Tag key={s} size="md" selected={f.specialities.some((p) => p.skill === s)} onClick={() => toggle(s)}>
                {s}
              </Tag>
            ))}
          </div>
          {refused && <p className={cn(T.meta, "text-text-error")}>You can pick 3. Remove one to add another.</p>}
          {f.specialities.map((p) => (
            <div key={p.skill} className="flex flex-col gap-2">
              <p className={FIELD_LABEL}>{p.skill}</p>
              <SheetSelect
                title={`Years of ${p.skill}`}
                value={p.years}
                options={YEARS.map((y) => ({ value: y, label: YEARS_WORDS[y] }))}
                onChange={(y) => set({ specialities: f.specialities.map((x) => (x.skill === p.skill ? { ...x, years: y as Years } : x)) })}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LinksStep({
  links,
  setLinks,
  errors,
  socials,
  setSocials,
  socialsTried,
  alert,
}: {
  links: string[];
  setLinks: (l: string[]) => void;
  errors: string[];
  socials: Record<SocialNetwork, string>;
  setSocials: (s: Record<SocialNetwork, string>) => void;
  /** Finish was pressed: a profile that can't be saved says why. */
  socialsTried: boolean;
  alert: AlertSpec | null;
}) {
  const base = React.useId();
  return (
    <>
      <AccountHeading title="Links">Up to 5 links, plus your social profiles.</AccountHeading>
      <AccountAlert alert={alert} />
      <div className="flex flex-col gap-4">
        {links.map((l, i) => (
          <Field key={i} label={`Link ${i + 1}`} htmlFor={`${base}-link-${i}`} error={errors[i]} errorId={`${base}-link-${i}-error`}>
            <TextInput
              id={`${base}-link-${i}`}
              size="xl"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              value={l}
              invalid={!!errors[i]}
              aria-invalid={!!errors[i] || undefined}
              aria-describedby={errors[i] ? `${base}-link-${i}-error` : undefined}
              onValueChange={(v) => setLinks(links.map((x, j) => (j === i ? v : x)))}
            />
          </Field>
        ))}
        {links.length < LINKS_MAX && (
          <Button hierarchy="ghost" size="xl" className="w-full" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={() => setLinks([...links, ""])}>
            Add a link
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <p className={FIELD_LABEL}>Social profiles</p>
        {SOCIAL_NETWORKS.map((n) => {
          const bad = socialUrlOf(n, socials[n]) === null;
          const error = bad && socialsTried ? socialError(n) : "";
          return (
          <Field key={n} label={SOCIAL_WORDS[n]} htmlFor={`${base}-${n}`} error={error} errorId={`${base}-${n}-error`}>
            <TextInput
              id={`${base}-${n}`}
              size="xl"
              prefixText={SOCIAL_PREFIX[n]}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="username"
              value={socials[n]}
              invalid={bad}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? `${base}-${n}-error` : undefined}
              onValueChange={(v) => setSocials({ ...socials, [n]: v })}
            />
          </Field>
          );
        })}
      </div>
    </>
  );
}
