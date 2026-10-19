// Who you are on paper (Settings › Profile and Personal Information, spec
// 2026-10-19-settings-design.md §5.2–5.3, D2): your legal first and last name,
// gender, permanent address and up to five shipping addresses, exactly one of
// them the default whenever there are any. Private: nothing here is shown on
// your profile or to anyone else. localStorage `ideeza:account:identity`,
// versioned and normalized on every read, through the shared key store so the
// settings pages agree without a reload. Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { countryCodeOf } from "./countries";

export const IDENTITY_KEY = "ideeza:account:identity";

export const NAME_MAX = 60;
export const GENDER_MAX = 40;
export const PLACE_NAME_MAX = 40;
export const CITY_MAX = 80;
export const ADDRESS_MAX = 200;
export const SHIPPING_MAX = 5;

/** "male" · "female" · "unsaid" (Prefer not to say) · any words you choose · "" (not given). */
export type Gender = "" | "male" | "female" | "unsaid" | (string & {});

export const GENDER_WORDS: Record<"male" | "female" | "unsaid", string> = { male: "Male", female: "Female", unsaid: "Prefer not to say" };

export type Address = { country: string; city: string; address: string };

export type ShippingAddress = Address & { id: string; name: string; isDefault: boolean };

/** What you type for a shipping address. */
export type ShippingInput = Address & { name: string };

export type IdentityV1 = {
  v: 1;
  firstName: string;
  lastName: string;
  gender: Gender;
  permanentAddress: Address;
  shipping: ShippingAddress[];
};

const NO_ADDRESS: Address = { country: "", city: "", address: "" };

export const EMPTY_IDENTITY: IdentityV1 = {
  v: 1,
  firstName: "",
  lastName: "",
  gender: "",
  permanentAddress: NO_ADDRESS,
  shipping: [],
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max).trim() : "");

function genderOf(v: unknown): Gender {
  const words = text(v, GENDER_MAX);
  const key = words.toLowerCase();
  if (key === "male" || key === "female" || key === "unsaid") return key;
  if (key === "prefer not to say") return "unsaid";
  return words;
}

/** "Male", "Prefer not to say", your own words, or "" when not given. */
export function genderWordsOf(g: Gender): string {
  return Object.hasOwn(GENDER_WORDS, g) ? GENDER_WORDS[g as keyof typeof GENDER_WORDS] : g;
}

function addressOf(v: unknown): Address {
  if (!isObj(v)) return NO_ADDRESS;
  return { country: countryCodeOf(v.country) ?? "", city: text(v.city, CITY_MAX), address: text(v.address, ADDRESS_MAX) };
}

/** The input cleaned as stored; null when it has no street address. */
export function shippingInputOf(v: unknown): ShippingInput | null {
  if (!isObj(v)) return null;
  const a = addressOf(v);
  if (!a.address) return null;
  return { name: text(v.name, PLACE_NAME_MAX), ...a };
}

/** Exactly one default when there are any: the first that claims it, else the first. */
function oneDefault(list: ShippingAddress[]): ShippingAddress[] {
  const at = Math.max(0, list.findIndex((s) => s.isDefault));
  return list.map((s, i) => (s.isDefault === (i === at) ? s : { ...s, isDefault: i === at }));
}

function cleanShipping(v: unknown): ShippingAddress[] {
  if (!Array.isArray(v)) return [];
  const out: ShippingAddress[] = [];
  const ids = new Set<string>();
  for (const item of v) {
    const input = shippingInputOf(item);
    if (!input || !isObj(item)) continue;
    let id = text(item.id, 40) || `s${out.length + 1}`;
    for (let n = 2; ids.has(id); n += 1) id = `${text(item.id, 40) || "s"}-${n}`;
    ids.add(id);
    out.push({ id, ...input, isDefault: item.isDefault === true });
    if (out.length >= SHIPPING_MAX) break;
  }
  return oneDefault(out);
}

export function normalizeIdentity(raw: unknown): IdentityV1 {
  if (!isObj(raw)) return EMPTY_IDENTITY;
  return {
    v: 1,
    firstName: text(raw.firstName, NAME_MAX),
    lastName: text(raw.lastName, NAME_MAX),
    gender: genderOf(raw.gender),
    permanentAddress: addressOf(raw.permanentAddress),
    shipping: cleanShipping(raw.shipping),
  };
}

/** Adds an address (the default when it is the first); a sixth is refused and the list kept. */
export function addShipping(
  list: readonly ShippingAddress[],
  input: ShippingInput,
  id: string,
): { list: ShippingAddress[]; refused: boolean } {
  const clean = shippingInputOf(input);
  if (list.length >= SHIPPING_MAX || !clean) return { list: list as ShippingAddress[], refused: true };
  return { list: oneDefault([...list, { id, ...clean, isDefault: list.length === 0 }]), refused: false };
}

/** Changes one address's words; the default stays where it was. */
export function updateShipping(list: readonly ShippingAddress[], id: string, patch: Partial<ShippingInput>): ShippingAddress[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    const clean = shippingInputOf({ ...s, ...patch });
    return clean ? { ...s, ...clean } : s;
  });
}

/** Takes one away; when it was the default, the first left becomes the default. */
export function removeShipping(list: readonly ShippingAddress[], id: string): ShippingAddress[] {
  return oneDefault(list.filter((s) => s.id !== id));
}

/** Makes `id` the default; an unknown id changes nothing. */
export function makeDefaultShipping(list: readonly ShippingAddress[], id: string): ShippingAddress[] {
  if (!list.some((s) => s.id === id)) return list as ShippingAddress[];
  return list.map((s) => (s.isDefault === (s.id === id) ? s : { ...s, isDefault: s.id === id }));
}

// ─────────────────────────── the store ───────────────────────────

function readIdentity(): IdentityV1 {
  return normalizeIdentity(parseStored(readStoredKey(IDENTITY_KEY)).value);
}

export type IdentityPatch = Partial<Omit<IdentityV1, "v">>;

/** Lays `patch` over the freshest copy and saves; refused (nothing written) when the stored
 *  record can't be read or the browser won't store it. */
export function saveIdentity(patch: IdentityPatch): WriteResult {
  if (storedUnreadable(IDENTITY_KEY, isObj)) return { ok: false };
  return writeStoredKey(IDENTITY_KEY, normalizeIdentity({ ...readIdentity(), ...patch }));
}

export function useIdentity(): { hydrated: boolean; identity: IdentityV1 } {
  const { hydrated, raw } = useStoredKey(IDENTITY_KEY);
  const identity = React.useMemo(() => normalizeIdentity(parseStored(raw).value), [raw]);
  return { hydrated, identity };
}
