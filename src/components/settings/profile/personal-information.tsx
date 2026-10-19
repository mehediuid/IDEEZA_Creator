"use client";

// /settings/personal-information (User Panel V2 General | Personal
// information 22048:29733, spec 2026-10-19-settings-design.md §5.3). Four
// cards, each with Edit (Cancel / Update):
//   Profile Details — Bio (your profile's headline) and About yourself (its
//     About), both also in Edit profile; Permanent Address and up to five
//     Shipping Addresses, private (`ideeza:account:identity`).
//   Abilities — skills and top three specialities (abilities.tsx).
//   Connected Accounts — Facebook, X, Instagram, LinkedIn as profile URLs;
//     they show with your profile's links.
//   Additional Information — your time zone (this device's, or one you choose,
//     which Edit profile then leaves alone) and the languages you speak.

import * as React from "react";
import { Add01Icon, Facebook01Icon, InstagramIcon, Linkedin01Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Checkbox, ModalFrame, SelectMenu, Tag, TextInput, Textarea } from "@/components/ideeza";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { cn } from "@/lib/utils";
import { ADDRESS_MAX, CITY_MAX, saveIdentity, useIdentity, type Address, type ShippingAddress } from "@/lib/account/identity";
import {
  BIO_MAX,
  HEADLINE_MAX,
  LANGUAGES_MAX,
  SOCIAL_NETWORKS,
  SOCIAL_WORDS,
  cleanLanguages,
  socialNameOf,
  socialUrlOf,
  type Social,
  type SocialNetwork,
} from "@/lib/people/fields";
import { spokenLanguageOptions } from "@/lib/people/languages";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { DEVICE_ZONE, deviceZone, timeZoneChoices, zoneChoiceOf, zoneLabelOf, zonePatchOf } from "@/lib/people/time-zones";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsCard } from "../settings-card";
import { SettingsFrame } from "../settings-frame";
import { AbilitiesCard } from "./abilities";
import { Chips, Field, FormField, Panel, TAP, describedBy, useCardEdit } from "./parts";
import { AddressLines, COUNTRY_OPTIONS, ShippingEditor, ShippingView } from "./shipping";

const PROSE = "m-0 max-w-[62ch] whitespace-pre-line [text-wrap:pretty]";

export function PersonalInformationPage() {
  return (
    <SettingsFrame page="personal-information">
      <ProfileDetailsCard />
      <AbilitiesCard />
      <ConnectedAccountsCard />
      <AdditionalInformationCard />
    </SettingsFrame>
  );
}

function CardEdit({ editing, start, editRef, label }: { editing: boolean; start: () => void; editRef: React.Ref<HTMLDivElement>; label: string }) {
  if (editing) return null;
  return (
    <div ref={editRef}>
      <EditButton onClick={start} aria-label={label} />
    </div>
  );
}

const hasAddress = (a: Address) => !!(a.country || a.city || a.address);

// ─────────────────────────── Profile Details ───────────────────────────

function ProfileDetailsCard() {
  const { hydrated, fields } = useMyProfile();
  const { hydrated: idReady, identity } = useIdentity();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  const ready = hydrated && idReady;
  return (
    <SettingsCard id="profile-details" title="Profile Details" action={<CardEdit editing={editing} start={start} editRef={editRef} label="Edit profile details" />}>
      {editing ? (
        <ProfileDetailsForm
          formRef={formRef}
          initial={{ headline: fields.headline, bio: fields.bio, permanentAddress: identity.permanentAddress, shipping: identity.shipping }}
          onDone={stop}
        />
      ) : (
        <>
          <Field id="bio" label="Bio" ready={ready}>
            {fields.headline}
          </Field>
          <Field id="about" label="About yourself" ready={ready}>
            {fields.bio && <p className={PROSE}>{fields.bio}</p>}
          </Field>
          <Field id="permanent-address" label="Permanent Address" ready={ready}>
            {hasAddress(identity.permanentAddress) && (
              <Panel>
                <AddressLines address={identity.permanentAddress} />
              </Panel>
            )}
          </Field>
          <Field id="shipping-address" label="Shipping Address" ready={ready}>
            {identity.shipping.length > 0 && <ShippingView list={identity.shipping} />}
          </Field>
          <p className="m-0 pt-[4px] text-md leading-md text-text-tertiary">Your addresses are private. They are never shown on your profile.</p>
        </>
      )}
    </SettingsCard>
  );
}

function ProfileDetailsForm({
  formRef,
  initial,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  initial: { headline: string; bio: string; permanentAddress: Address; shipping: ShippingAddress[] };
  onDone: () => void;
}) {
  const ids = React.useId();
  const [headline, setHeadline] = React.useState(initial.headline);
  const [bio, setBio] = React.useState(initial.bio);
  const [address, setAddress] = React.useState(initial.permanentAddress);
  const [shipping, setShipping] = React.useState(initial.shipping);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof Address) => (v: string) => setAddress((a) => ({ ...a, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = saveProfile({ headline, bio });
    const b = a.ok ? saveIdentity({ permanentAddress: address, shipping }) : a;
    if (!b.ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[20px] pt-[8px]">
      <FormField
        id={`${ids}-bio`}
        label="Bio"
        hint={<span className="tabular-nums">{`One line under your name on your profile · ${headline.length}/${HEADLINE_MAX}`}</span>}
      >
        <TextInput
          id={`${ids}-bio`}
          size="xl"
          value={headline}
          onValueChange={setHeadline}
          maxLength={HEADLINE_MAX}
          placeholder="Hardware maker building solar sensors"
          aria-describedby={`${ids}-bio-note`}
        />
      </FormField>
      <FormField
        id={`${ids}-about`}
        label="About yourself"
        hint={<span className="tabular-nums">{`Shown as About on your profile · ${bio.length}/${BIO_MAX}`}</span>}
      >
        <Textarea id={`${ids}-about`} value={bio} onValueChange={setBio} maxLength={BIO_MAX} rows={5} aria-describedby={`${ids}-about-note`} />
      </FormField>
      <fieldset className="m-0 flex min-w-0 flex-col gap-[12px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">Permanent Address</legend>
        <SelectMenu
          label="Country"
          placeholder="Choose a country"
          options={COUNTRY_OPTIONS}
          value={address.country || null}
          onChange={set("country")}
        />
        <div className="[container-type:inline-size]">
          <div className="grid grid-cols-1 gap-[12px] [@container(min-width:520px)]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <FormField id={`${ids}-city`} label="City">
              <TextInput id={`${ids}-city`} size="xl" value={address.city} onValueChange={set("city")} maxLength={CITY_MAX} autoComplete="address-level2" />
            </FormField>
            <FormField id={`${ids}-address`} label="Address">
              <TextInput
                id={`${ids}-address`}
                size="xl"
                value={address.address}
                onValueChange={set("address")}
                maxLength={ADDRESS_MAX}
                autoComplete="street-address"
              />
            </FormField>
          </div>
        </div>
      </fieldset>
      <fieldset className="m-0 flex min-w-0 flex-col gap-[8px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">Shipping Address</legend>
        <ShippingEditor list={shipping} onChange={setShipping} />
      </fieldset>
      <CardFormActions onCancel={onDone} error={error} />
    </form>
  );
}

// ─────────────────────────── Connected Accounts ───────────────────────────

const SOCIAL_ICON: Record<SocialNetwork, typeof Facebook01Icon> = {
  facebook: Facebook01Icon,
  x: NewTwitterIcon,
  instagram: InstagramIcon,
  linkedin: Linkedin01Icon,
};

const SOCIAL_PLACEHOLDER: Record<SocialNetwork, string> = {
  facebook: "https://facebook.com/yourname",
  x: "https://x.com/yourname",
  instagram: "https://instagram.com/yourname",
  linkedin: "https://linkedin.com/in/yourname",
};

const SOCIAL_HOST: Record<SocialNetwork, string> = { facebook: "facebook.com", x: "x.com", instagram: "instagram.com", linkedin: "linkedin.com" };

function ConnectedAccountsCard() {
  const { hydrated, fields } = useMyProfile();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  return (
    <SettingsCard id="connected-accounts" title="Connected Accounts" action={<CardEdit editing={editing} start={start} editRef={editRef} label="Edit connected accounts" />}>
      {editing ? (
        <ConnectedAccountsForm formRef={formRef} initial={fields.social} onDone={stop} />
      ) : (
        <Field label="Social Media" ready={hydrated}>
          <ul role="list" className="m-0 flex list-none flex-col gap-[10px] p-0 pt-[2px]">
            {SOCIAL_NETWORKS.map((n) => {
              const url = fields.social[n];
              return (
                <li key={n} className="flex min-w-0 flex-wrap items-center gap-x-[12px] gap-y-[2px]">
                  <span aria-hidden className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                    <Icon icon={SOCIAL_ICON[n]} size={14} />
                  </span>
                  <span className="text-md font-medium leading-md text-text-primary">{SOCIAL_WORDS[n]}</span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="min-w-0 rounded-xs text-md leading-md text-text-brand underline-offset-[3px] outline-none [overflow-wrap:anywhere] hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {socialNameOf(n, url)}
                      <span className="sr-only">{` on ${SOCIAL_WORDS[n]} (opens in a new tab)`}</span>
                    </a>
                  ) : (
                    <span className="text-md leading-md text-text-disabled">Not connected</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Field>
      )}
    </SettingsCard>
  );
}

function ConnectedAccountsForm({ formRef, initial, onDone }: { formRef: React.RefObject<HTMLFormElement | null>; initial: Social; onDone: () => void }) {
  const ids = React.useId();
  const [draft, setDraft] = React.useState<Social>(initial);
  const [bad, setBad] = React.useState<Partial<Record<SocialNetwork, boolean>>>({});
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...draft };
    const wrong: Partial<Record<SocialNetwork, boolean>> = {};
    for (const n of SOCIAL_NETWORKS) {
      const url = socialUrlOf(n, draft[n]);
      if (url === null) wrong[n] = true;
      else next[n] = url;
    }
    const first = SOCIAL_NETWORKS.find((n) => wrong[n]);
    if (first) {
      setBad(wrong);
      document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    if (!saveProfile({ social: next }).ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[16px] pt-[8px]">
      <p className="m-0 text-md leading-md text-text-tertiary">Your profile address or username on each. They show with your links on your profile.</p>
      {SOCIAL_NETWORKS.map((n) => {
        const id = `${ids}-${n}`;
        const problem = bad[n] ? `Enter your ${SOCIAL_HOST[n]} profile address, or just your username.` : null;
        return (
          <FormField key={n} id={id} label={SOCIAL_WORDS[n]} error={problem}>
            <TextInput
              id={id}
              size="xl"
              value={draft[n]}
              onValueChange={(v) => {
                setDraft((d) => ({ ...d, [n]: v }));
                setBad((b) => ({ ...b, [n]: false }));
              }}
              placeholder={SOCIAL_PLACEHOLDER[n]}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              invalid={!!problem}
              {...describedBy(id, problem, null)}
            />
          </FormField>
        );
      })}
      <CardFormActions onCancel={onDone} error={error} />
    </form>
  );
}

// ─────────────────────────── Additional Information ───────────────────────────

function AdditionalInformationCard() {
  const { hydrated, fields } = useMyProfile();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  const now = useMinuteClock();
  const ready = hydrated && now > 0;
  const choice = zoneChoiceOf(fields);
  const device = ready ? deviceZone() : null;
  const zone = choice === DEVICE_ZONE ? device : choice;
  return (
    <SettingsCard id="additional-information" title="Additional Information" action={<CardEdit editing={editing} start={start} editRef={editRef} label="Edit additional information" />}>
      {editing ? (
        <AdditionalInformationForm formRef={formRef} choice={choice} languages={fields.languages} now={now} onDone={stop} />
      ) : (
        <>
          <Field id="timezone" label="Timezone" ready={ready}>
            {zone && (
              <span>
                {zoneLabelOf(zone, now)}
                {choice === DEVICE_ZONE && <span className="text-text-tertiary"> · this device</span>}
              </span>
            )}
          </Field>
          <Field id="languages" label="Language" ready={ready}>
            {fields.languages.length > 0 && <Chips chips={fields.languages} />}
          </Field>
        </>
      )}
    </SettingsCard>
  );
}

function AdditionalInformationForm({
  formRef,
  choice: initialChoice,
  languages: initialLanguages,
  now,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  choice: string;
  languages: string[];
  now: number;
  onDone: () => void;
}) {
  const [choice, setChoice] = React.useState(initialChoice);
  const [languages, setLanguages] = React.useState(initialLanguages);
  const [picking, setPicking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const device = deviceZone();
  const options = React.useMemo(() => timeZoneChoices(device, now), [device, now]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveProfile({ ...zonePatchOf(choice, device), languages }).ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[20px] pt-[8px]">
      <SelectMenu
        label="Timezone"
        placeholder="Choose a time zone"
        options={options}
        value={choice}
        onChange={setChoice}
        hint="Used wherever the app shows your time. Choosing one here keeps it, even when you edit your profile on another device."
      />
      <fieldset className="m-0 flex min-w-0 flex-col gap-[8px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">Language</legend>
        {languages.length > 0 ? (
          <ul role="list" aria-label="Languages you speak" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
            {languages.map((l) => (
              <li key={l}>
                <Tag
                  size="md"
                  selected
                  onDismiss={() => {
                    setLanguages((prev) => prev.filter((x) => x !== l));
                    requestAnimationFrame(() => addRef.current?.focus());
                  }}
                  dismissLabel={`Remove ${l}`}
                >
                  {l}
                </Tag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-md leading-md text-text-tertiary">The languages you speak show on your profile.</p>
        )}
        <Button
          ref={addRef}
          type="button"
          hierarchy="tonal"
          size="md"
          iconLeading={<Icon icon={Add01Icon} size={16} />}
          onClick={() => setPicking(true)}
          className={cn("w-fit", TAP)}
        >
          {languages.length ? "Add Another" : "Add Language"}
        </Button>
      </fieldset>
      <LanguageDialog
        open={picking}
        value={languages}
        onClose={() => {
          setPicking(false);
          requestAnimationFrame(() => addRef.current?.focus());
        }}
        onSave={setLanguages}
      />
      <CardFormActions onCancel={onDone} error={error} />
    </form>
  );
}

/** Figma's Select Language (22048:30021): a tick for each language you speak, Cancel / Update. */
function LanguageDialog({ open, value, onClose, onSave }: { open: boolean; value: string[]; onClose: () => void; onSave: (v: string[]) => void }) {
  const [draft, setDraft] = React.useState(value);
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) setDraft(value);
  }
  const options = React.useMemo(() => {
    const listed = spokenLanguageOptions();
    return [...listed, ...value.filter((v) => !listed.includes(v))];
  }, [value]);
  const full = draft.length >= LANGUAGES_MAX;

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title="Select Language"
      description={full ? `${LANGUAGES_MAX} is the most. Untick one to choose another.` : "Tick every language you speak."}
      footer={
        <div className="flex w-full justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            onClick={() => {
              onSave(cleanLanguages(options.filter((o) => draft.includes(o))));
              onClose();
            }}
          >
            Update
          </Button>
        </div>
      }
    >
      <ul role="list" aria-label="Languages" className="m-0 flex list-none flex-col gap-[2px] p-0">
        {options.map((o) => {
          const on = draft.includes(o);
          const off = !on && full;
          return (
            <li key={o}>
              <label
                className={cn(
                  "flex min-h-[44px] items-center gap-[12px] rounded-lg px-[12px] py-[8px] transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus",
                  off ? "cursor-not-allowed" : "cursor-pointer hover:bg-bg-subtle",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={off}
                  onChange={() => setDraft((d) => (on ? d.filter((x) => x !== o) : [...d, o]))}
                  className="sr-only"
                />
                <Checkbox checked={on} disabled={off} decorative />
                <span className={cn("text-md leading-md", off ? "text-text-disabled" : "text-text-primary")}>{o}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </ModalFrame>
  );
}
