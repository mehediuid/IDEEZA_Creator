// The off-board parts library (F3, D10): the parts a product needs that don't
// sit on the board — a battery, a speaker, a button on the case — each with a
// real size, the faces a snap can grab, and the leads a wire can end on.
// Sizes are a common part's datasheet outline. Millimetres; each part's
// frame has its bottom face at y = 0, centred in x/z.
//
// A built product's parts list names some of these (a battery, a speaker):
// `libraryKindOf` maps a part to the library's kind, so they arrive with the
// rest on Bring in. Pure; relative imports only.

import { axisAngle, Q0, type Vec3 } from "./math";
import type { AsmPart, Feature, Pin, Port, Solid } from "./types";

export type LibraryKind =
  | "lipo-503450"
  | "holder-18650"
  | "holder-cr2032"
  | "speaker-28"
  | "buzzer-12"
  | "tactile-6"
  | "slide-switch"
  | "usb-c"
  | "jst-ph-2"
  | "oled-096"
  | "led-5"
  | "vibration-motor";

type Body = { kind: "box"; size: Vec3; at?: Vec3; color: string } | { kind: "cyl"; r: number; h: number; at?: Vec3; color: string; axis?: "x" | "z" };

export type LibraryItem = {
  kind: LibraryKind;
  name: string;
  /** What a person reads in the picker: the outline in mm. */
  dims: string;
  /** The designator letters a built product uses for it. */
  prefix: string;
  bodies: Body[];
  pins: Array<Omit<Pin, "point" | "dir"> & { at: Vec3; dir: Vec3 }>;
  port?: Omit<Port, "id">;
};

const BLACK = "#1f2329";
const METAL = "#a3abb6";

export const LIBRARY: readonly LibraryItem[] = [
  {
    kind: "lipo-503450",
    name: "LiPo battery 503450 · 1000 mAh",
    dims: "50 × 34 × 5",
    prefix: "BT",
    bodies: [{ kind: "box", size: [50, 5, 34], color: "#aab6c8" }],
    pins: [
      { id: "+", label: "+", netHint: "VBAT", at: [-25, 2.5, -3], dir: [-1, 0, 0] },
      { id: "-", label: "−", netHint: "GND", at: [-25, 2.5, 3], dir: [-1, 0, 0] },
    ],
  },
  {
    kind: "holder-18650",
    name: "18650 cell holder",
    dims: "77 × 21 × 19",
    prefix: "BT",
    bodies: [{ kind: "box", size: [77, 19, 21], color: BLACK }],
    pins: [
      { id: "+", label: "+", netHint: "VBAT", at: [38.5, 3, 0], dir: [1, 0, 0] },
      { id: "-", label: "−", netHint: "GND", at: [-38.5, 3, 0], dir: [-1, 0, 0] },
    ],
  },
  {
    kind: "holder-cr2032",
    name: "CR2032 coin cell holder",
    dims: "Ø 23 × 6",
    prefix: "BT",
    bodies: [{ kind: "cyl", r: 11.5, h: 6, color: BLACK }],
    pins: [
      { id: "+", label: "+", netHint: "VBAT", at: [11.5, 3, 0], dir: [1, 0, 0] },
      { id: "-", label: "−", netHint: "GND", at: [-11.5, 3, 0], dir: [-1, 0, 0] },
    ],
  },
  {
    kind: "speaker-28",
    name: "Speaker 28 mm · 8 Ω",
    dims: "Ø 28 × 5",
    prefix: "LS",
    bodies: [{ kind: "cyl", r: 14, h: 5, color: "#2a2f37" }],
    pins: [
      { id: "+", label: "+", netHint: "SPK+", at: [5, 5, 0], dir: [0, 1, 0] },
      { id: "-", label: "−", netHint: "SPK-", at: [-5, 5, 0], dir: [0, 1, 0] },
    ],
  },
  {
    kind: "buzzer-12",
    name: "Buzzer 12 mm",
    dims: "Ø 12 × 9.5",
    prefix: "BZ",
    bodies: [{ kind: "cyl", r: 6, h: 9.5, color: BLACK }],
    pins: [
      { id: "+", label: "+", netHint: "BUZ", at: [3.25, 0, 0], dir: [0, -1, 0] },
      { id: "-", label: "−", netHint: "GND", at: [-3.25, 0, 0], dir: [0, -1, 0] },
    ],
  },
  {
    kind: "tactile-6",
    name: "Tactile button 6 × 6",
    dims: "6 × 6 × 5",
    prefix: "SW",
    bodies: [
      { kind: "box", size: [6, 3.5, 6], color: BLACK },
      { kind: "cyl", r: 1.75, h: 1.5, at: [0, 3.5, 0], color: "#3b4250" },
    ],
    pins: [
      { id: "1", label: "1", at: [-3.25, 0, -2.25], dir: [0, -1, 0] },
      { id: "2", label: "2", at: [3.25, 0, 2.25], dir: [0, -1, 0] },
    ],
  },
  {
    kind: "slide-switch",
    name: "Slide switch SS12D00",
    dims: "8.6 × 3.6 × 3.5",
    prefix: "SW",
    bodies: [
      { kind: "box", size: [8.6, 3.5, 3.6], color: METAL },
      { kind: "box", size: [1.5, 2, 1.5], at: [0, 3.5, 0], color: BLACK },
    ],
    pins: [
      { id: "1", label: "1", at: [-2, 0, 0], dir: [0, -1, 0] },
      { id: "2", label: "2", at: [0, 0, 0], dir: [0, -1, 0] },
      { id: "3", label: "3", at: [2, 0, 0], dir: [0, -1, 0] },
    ],
  },
  {
    kind: "usb-c",
    name: "USB-C socket (power)",
    dims: "9 × 7.4 × 3.2",
    prefix: "J",
    bodies: [{ kind: "box", size: [9, 3.2, 7.4], color: METAL }],
    pins: [
      { id: "vbus", label: "VBUS", netHint: "VBUS", at: [-2, 1.6, 3.7], dir: [0, 0, 1] },
      { id: "gnd", label: "GND", netHint: "GND", at: [2, 1.6, 3.7], dir: [0, 0, 1] },
    ],
    port: { label: "USB-C", center: [0, 1.6, -3.7], dir: [0, 0, -1], size: [9, 3.2] },
  },
  {
    kind: "jst-ph-2",
    name: "JST-PH 2-pin plug",
    dims: "6 × 4.5 × 6",
    prefix: "J",
    bodies: [{ kind: "box", size: [6, 6, 4.5], color: "#eef1f4" }],
    pins: [
      { id: "1", label: "1", at: [-1, 3, 2.25], dir: [0, 0, 1] },
      { id: "2", label: "2", at: [1, 3, 2.25], dir: [0, 0, 1] },
    ],
  },
  {
    kind: "oled-096",
    name: "OLED 0.96″ module (I²C)",
    dims: "27 × 27 × 4",
    prefix: "DSP",
    bodies: [
      { kind: "box", size: [27, 1.6, 27], color: "#1c4e80" },
      { kind: "box", size: [26, 1.4, 14], at: [0, 1.6, 1], color: "#0b0d10" },
    ],
    pins: [
      { id: "gnd", label: "GND", netHint: "GND", at: [-3.81, 1.6, -12], dir: [0, 1, 0] },
      { id: "vcc", label: "VCC", netHint: "VCC", at: [-1.27, 1.6, -12], dir: [0, 1, 0] },
      { id: "scl", label: "SCL", netHint: "SCL", at: [1.27, 1.6, -12], dir: [0, 1, 0] },
      { id: "sda", label: "SDA", netHint: "SDA", at: [3.81, 1.6, -12], dir: [0, 1, 0] },
    ],
  },
  {
    kind: "led-5",
    name: "LED 5 mm",
    dims: "Ø 5 × 8.6",
    prefix: "D",
    bodies: [{ kind: "cyl", r: 2.5, h: 8.6, color: "#e5484d" }],
    pins: [
      { id: "a", label: "A", netHint: "LED", at: [1.27, 0, 0], dir: [0, -1, 0] },
      { id: "k", label: "K", netHint: "GND", at: [-1.27, 0, 0], dir: [0, -1, 0] },
    ],
  },
  {
    kind: "vibration-motor",
    name: "Coin vibration motor",
    dims: "Ø 10 × 2.7",
    prefix: "M",
    bodies: [{ kind: "cyl", r: 5, h: 2.7, color: METAL }],
    pins: [
      { id: "+", label: "+", netHint: "MOT+", at: [5, 1.35, -1], dir: [1, 0, 0] },
      { id: "-", label: "−", netHint: "GND", at: [5, 1.35, 1], dir: [1, 0, 0] },
    ],
  },
];

export const LIBRARY_BY_KIND: Readonly<Record<string, LibraryItem>> = Object.fromEntries(LIBRARY.map((i) => [i.kind, i]));

const bodyTop = (b: Body) => (b.at?.[1] ?? 0) + (b.kind === "box" ? b.size[1] : b.h);

/** A library part for one instance. `label` is the instance's own name ("BT1"). */
export function libraryPart(instanceId: string, kind: string, label?: string): AsmPart | null {
  const item = LIBRARY_BY_KIND[kind];
  if (!item) return null;
  const name = label ? `${label} · ${item.name}` : item.name;
  const solids: Solid[] = item.bodies.map((b, i) => {
    const at = b.at ?? [0, 0, 0];
    if (b.kind === "box") {
      return { id: `body:${i}`, name: label ?? item.name, shape: { kind: "box", center: [at[0], at[1] + b.size[1] / 2, at[2]], size: b.size }, color: b.color };
    }
    return { id: `body:${i}`, name: label ?? item.name, shape: { kind: "cyl", center: [at[0], at[1] + b.h / 2, at[2]], r: b.r, h: b.h, q: b.axis === "x" ? axisAngle([0, 0, 1], Math.PI / 2) : Q0 }, color: b.color };
  });
  const main = item.bodies[0];
  const w = main.kind === "box" ? main.size[0] : main.r * 2;
  const d = main.kind === "box" ? main.size[2] : main.r * 2;
  const top = Math.max(...item.bodies.map(bodyTop));
  const mainH = main.kind === "box" ? main.size[1] : main.h;
  const features: Feature[] = [
    { id: "face:bottom", kind: "face", label: "Bottom", point: [0, 0, 0], dir: [0, -1, 0], size: [w, d] },
    { id: "face:top", kind: "face", label: "Top", point: [0, top, 0], dir: [0, 1, 0], size: [w, d] },
  ];
  if (main.kind === "box") {
    features.push(
      { id: "face:+x", kind: "face", label: "Right side", point: [w / 2, mainH / 2, 0], dir: [1, 0, 0], size: [d, mainH] },
      { id: "face:-x", kind: "face", label: "Left side", point: [-w / 2, mainH / 2, 0], dir: [-1, 0, 0], size: [d, mainH] },
      { id: "face:+z", kind: "face", label: "Front side", point: [0, mainH / 2, d / 2], dir: [0, 0, 1], size: [w, mainH] },
      { id: "face:-z", kind: "face", label: "Back side", point: [0, mainH / 2, -d / 2], dir: [0, 0, -1], size: [w, mainH] },
    );
  } else {
    features.push({ id: "axis:main", kind: "axis", label: "Axis", point: [0, 0, 0], dir: [0, 1, 0], radius: main.r, seat: "face:bottom" });
  }
  const pins: Pin[] = item.pins.map((p) => ({ id: p.id, label: label ? `${label} ${p.label}` : p.label, point: p.at, dir: p.dir, ...(p.netHint ? { netHint: p.netHint } : {}) }));
  return {
    id: instanceId,
    source: "library",
    ref: kind,
    name,
    origin: "Off-board library",
    solids,
    features,
    pins,
    defaultPose: { p: [0, 0, 0], q: Q0 },
    ...(item.port ? { ports: [{ id: "port", ...item.port, label: label ?? item.port.label }] } : {}),
  };
}

const LETTERS = (ref: string) => ref.trim().replace(/[^A-Za-z]/g, "").toUpperCase();

/** The library kind a built product's part is, or null when it's a board part
 *  (or a peripheral the library has nothing for yet). */
export function libraryKindOf(ref: string, name: string): LibraryKind | null {
  const p = LETTERS(ref);
  const n = name.toLowerCase();
  if (p === "BT" || /\b(battery|li-?po|lipo|li-?ion|18650|cr2032|coin cell)\b/.test(n)) {
    if (/18650/.test(n)) return "holder-18650";
    if (/cr20|coin/.test(n)) return "holder-cr2032";
    return "lipo-503450";
  }
  if (p === "LS" || p === "SPK" || /\bspeaker\b/.test(n)) return "speaker-28";
  if (p === "BZ" || /\bbuzzer\b/.test(n)) return "buzzer-12";
  if (p === "DSP" || /\b(oled|display|lcd)\b/.test(n)) return "oled-096";
  if (p === "M" || /\b(vibration|motor)\b/.test(n)) return "vibration-motor";
  if ((p === "SW" || p === "S") && /\bslide\b/.test(n)) return "slide-switch";
  if (p === "SW" || /\b(button|tactile|switch)\b/.test(n)) return "tactile-6";
  if (/\busb\b/.test(n) && (p === "J" || p === "P")) return "usb-c";
  if (p === "D" && /\b(led|ws2812|neopixel)\b/.test(n)) return "led-5";
  return null;
}

/** "BT1", "LS2": the next free label for a kind among the instances' labels. */
export function nextLabel(kind: LibraryKind, used: readonly string[]): string {
  const prefix = LIBRARY_BY_KIND[kind]?.prefix ?? "X";
  let n = 1;
  while (used.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
