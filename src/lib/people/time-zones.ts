// The time zones Settings › Language & region › Time zone offers: every IANA
// zone this browser knows, with this device's zone first as "(this device)".
// The one you choose is your profile's `timeZone`, the one zone the app reads
// for you: dates and times (lib/settings/dates.ts) and your profile's local
// time. Pure.

/** The value of the first choice: follow this device. */
export const DEVICE_ZONE = "device";

/** This device's IANA time zone; null when the browser won't say. */
export function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** "GMT+6", "GMT-4", "GMT" for `zone` at `at`. */
export function zoneOffsetOf(zone: string, at: number): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "GMT";
  } catch {
    return "GMT";
  }
}

/** "America/New York (GMT-5)". */
export function zoneLabelOf(zone: string, at: number): string {
  return `${zone.replace(/_/g, " ")} (${zoneOffsetOf(zone, at)})`;
}

const FALLBACK_ZONES = ["UTC", "Europe/London", "Europe/Berlin", "Asia/Dhaka", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "America/New_York", "America/Los_Angeles"];

function allZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (list?.length) return list.includes("UTC") ? list : ["UTC", ...list];
  } catch {
    // Older browsers: the short list below.
  }
  return FALLBACK_ZONES;
}

export type ZoneChoice = { value: string; label: string; section: string };

/** This device's zone first, then every zone, A to Z. */
export function timeZoneChoices(device: string | null, at: number): ZoneChoice[] {
  const out: ZoneChoice[] = [];
  if (device) out.push({ value: DEVICE_ZONE, label: `${zoneLabelOf(device, at).replace(/ \((GMT[^)]*)\)$/, ", $1")} (this device)`, section: "This device" });
  for (const zone of allZones()) out.push({ value: zone, label: zoneLabelOf(zone, at), section: "All time zones" });
  return out;
}

/** The select's value for a profile: the zone you chose, or "device" while it follows this device. */
export function zoneChoiceOf(p: { timeZone: string | null; timeZoneManual: boolean }): string {
  return p.timeZoneManual && p.timeZone ? p.timeZone : DEVICE_ZONE;
}

/** The zone the app shows times in: the one you chose, or null while it follows this device. */
export function appZoneOf(p: { timeZone: string | null; timeZoneManual: boolean }): string | null {
  return p.timeZoneManual && p.timeZone ? p.timeZone : null;
}

/** What choosing `choice` saves: a zone you chose by hand, or this device's zone, followed. */
export function zonePatchOf(choice: string, device: string | null): { timeZone: string | null; timeZoneManual: boolean } {
  return choice === DEVICE_ZONE ? { timeZone: device, timeZoneManual: false } : { timeZone: choice, timeZoneManual: true };
}
