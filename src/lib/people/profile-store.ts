// Your profile fields, live (spec 2026-10-14-creator-profile-design.md):
// localStorage `ideeza:profile` through the shared key store, so every reader
// (the profile page, the sidebar, the dialog) agrees without a reload. A write
// reads the freshest copy first and is refused, leaving the key as it is,
// when the stored profile can't be read.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { PROFILE_KEY, normalizeProfile, pinToggled, type ProfileFields } from "./fields";
import { displayNameOf, initialsOf } from "./ids";

const isProfileShape = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);

function readProfile(): ProfileFields {
  return normalizeProfile(parseStored(readStoredKey(PROFILE_KEY)).value);
}

export type ProfilePatch = Partial<Pick<ProfileFields, "name" | "latinName" | "headline" | "pins">>;

export function saveProfile(patch: ProfilePatch): WriteResult {
  if (storedUnreadable(PROFILE_KEY, isProfileShape)) return { ok: false };
  const current = readProfile();
  return writeStoredKey(PROFILE_KEY, normalizeProfile({ ...current, ...patch, since: current.since ?? Date.now() }));
}

export function useMyProfile(): {
  hydrated: boolean;
  fields: ProfileFields;
  save: (patch: ProfilePatch) => WriteResult;
  /** `refused`: a fourth pin; `ok: false`: the browser refused the write. */
  togglePin: (projectId: string) => { ok: boolean; refused: boolean };
} {
  const { hydrated, raw } = useStoredKey(PROFILE_KEY);
  const fields = React.useMemo(() => normalizeProfile(parseStored(raw).value), [raw]);
  const togglePin = React.useCallback((projectId: string) => {
    const { fields: next, refused } = pinToggled(readProfile(), projectId);
    if (refused) return { ok: true, refused: true };
    return { ok: saveProfile({ pins: next.pins }).ok, refused: false };
  }, []);
  return { hydrated, fields, save: saveProfile, togglePin };
}

/** You as others see you: your name ("You" until you give one) and your initials. */
export function useMe(): { name: string; initials: string } {
  const { fields } = useMyProfile();
  return React.useMemo(() => {
    const name = displayNameOf(fields.name);
    return { name, initials: initialsOf(name, fields.latinName || null) };
  }, [fields.name, fields.latinName]);
}
