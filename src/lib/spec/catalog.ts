// The parts the spec sheet can put into a product — real parts, under the
// names makers buy them by, each one sized from its datasheet in bodies.ts
// (a test holds every name here to a body rule, never a category default).
// An edit stores the key (types.ts); the name is what the BOM, the wiring and
// the firmware see once edits.ts has put the part in.
//
// The readers below say which of these a list of parts already has — what
// the sheet shows "From the concept" before the maker changes it, and what
// edits.ts takes out before it puts the maker's choice in.

import type { ConceptPart, ConceptPartCategory } from "../create/concept";
import { isBatteryPart } from "./batteries";
import { qtyOf } from "./bodies";
import {
  RADIO_KEYS,
  type AddableKey,
  type AiHints,
  type ChargePortKey,
  type EnvironmentKey,
  type McuKey,
  type MotorKey,
  type MountingKey,
  type RadioKey,
  type ServoKey,
} from "./types";

export type CatalogPart = {
  /** What the sheet's control says — the part a maker buys. */
  label: string;
  /** What the BOM says. */
  name: string;
  role: string;
  category: ConceptPartCategory;
  /** What it is for, in a maker's words — the line under its name in a
   *  menu ("Plastic gearbox for wheels · cheap"), so a list of part numbers
   *  says what each one does. The card and the sheet both read it here. */
  forWhat?: string;
};

const part = (
  label: string,
  name: string,
  role: string,
  category: ConceptPartCategory,
  forWhat?: string,
): CatalogPart => ({ label, name, role, category, ...(forWhat ? { forWhat } : {}) });

export const FIRMWARE_ROLE = "Runs the firmware";

export const MCUS: Record<McuKey, CatalogPart> = {
  esp32: part(
    "ESP32-WROOM-32",
    "ESP32-WROOM-32",
    FIRMWARE_ROLE,
    "Microcontroller",
    "Wi-Fi + Bluetooth built in · the usual pick",
  ),
  "esp32-c3": part(
    "ESP32-C3",
    "ESP32-C3",
    FIRMWARE_ROLE,
    "Microcontroller",
    "Wi-Fi + Bluetooth built in · smaller, uses less power",
  ),
  rp2040: part(
    "RP2040 (Pico)",
    "RP2040 (Pico)",
    FIRMWARE_ROLE,
    "Microcontroller",
    "Fast, no wireless — a radio module is added if you pick one",
  ),
  atmega328p: part(
    "ATmega328P (Arduino Nano)",
    "ATmega328P (Arduino Nano)",
    FIRMWARE_ROLE,
    "Microcontroller",
    "Simple Arduino chip, no wireless — a radio module is added if you pick one",
  ),
};

/** `module` is the part that carries the radio when the MCU doesn't have it
 *  on its die. ESP-NOW has none — it is Espressif's own protocol, so only an
 *  ESP speaks it. `forWhat` is what the radio is for; `adds` is what picking
 *  it on a chip without it puts in. */
export type RadioInfo = { label: string; module: CatalogPart | null; forWhat: string; adds?: string };

export const RADIOS: Record<RadioKey, RadioInfo> = {
  none: { label: "None", module: null, forWhat: "No wireless" },
  wifi: {
    label: "Wi-Fi",
    module: part("ESP-01 (ESP8266)", "ESP-01 Wi-Fi module (ESP8266)", "Connects over Wi-Fi", "Connectivity"),
    forWhat: "Phone app or home network",
    adds: "adds a module",
  },
  ble: {
    label: "Bluetooth LE",
    module: part("nRF52840", "nRF52840 BLE module", "Connects over Bluetooth LE", "Connectivity"),
    forWhat: "Phone app, a few metres",
    adds: "adds a module",
  },
  "esp-now": { label: "ESP-NOW", module: null, forWhat: "Direct link between two ESP chips, no router" },
  nrf24: {
    label: "nRF24L01",
    module: part("nRF24L01", "nRF24L01+ 2.4 GHz module", "Links over nRF24", "Connectivity"),
    forWhat: "Direct link to a remote, about 100 m",
    adds: "adds a small module",
  },
  lora: {
    label: "LoRa SX1276",
    module: part("LoRa SX1276", "LoRa SX1276 module", "Links over LoRa", "Connectivity"),
    forWhat: "Kilometres, short messages",
    adds: "adds a module",
  },
  zigbee: {
    label: "Zigbee (CC2530)",
    module: part("CC2530", "CC2530 Zigbee module", "Joins a Zigbee network", "Connectivity"),
    forWhat: "Smart-home hubs",
    adds: "adds a module",
  },
  cellular: {
    label: "Cellular (SIM800L)",
    module: part("SIM800L", "SIM800L GSM module", "Connects over the cellular network", "Connectivity"),
    forWhat: "Anywhere with phone signal · needs a SIM",
    adds: "adds a module",
  },
};

/** A radio's line in the sheet's menu: what it is for, then where it sits —
 *  "Phone app or home network · built into the chip", or "· adds a module"
 *  on a chip that doesn't have it. */
export function radioSub(key: RadioKey, builtIn: boolean): string {
  const r = RADIOS[key];
  if (key === "none") return r.forWhat;
  const where = builtIn ? (key === "esp-now" ? "built in" : "built into the chip") : (r.adds ?? "adds a module");
  return `${r.forWhat} · ${where}`;
}

/** A drive motor and the driver it needs — `per` motors to one driver. */
export type MotorInfo = CatalogPart & { driver: { part: CatalogPart; per: number } };

const TB6612 = part("TB6612FNG", "TB6612FNG motor driver", "Drives the motors", "Actuator");

export const MOTORS: Record<MotorKey, MotorInfo> = {
  tt: {
    ...part("TT gear motor", "TT gear motor", "Drives the product", "Actuator", "Plastic gearbox for wheels · cheap"),
    driver: { part: TB6612, per: 2 },
  },
  n20: {
    ...part("N20 gear motor", "N20 gear motor", "Drives the product", "Actuator", "Tiny metal gearbox · small robots"),
    driver: { part: TB6612, per: 2 },
  },
  brushless: {
    ...part(
      "Brushless motor",
      "Brushless motor",
      "Drives the product",
      "Actuator",
      "Very fast · racers and drones · adds a speed controller",
    ),
    driver: { part: part("ESC", "30A brushless ESC", "Drives the brushless motor", "Actuator"), per: 1 },
  },
  "28byj": {
    ...part("28BYJ stepper", "28BYJ-48 stepper motor", "Turns in steps", "Actuator", "Slow, precise steps · not for wheels"),
    driver: { part: part("ULN2003", "ULN2003 stepper driver", "Drives the stepper", "Actuator"), per: 1 },
  },
};

/** What a motor's driver is, in words: a speed controller for a brushless
 *  motor, a motor driver chip for the rest. */
export const driverWord = (driver: CatalogPart) =>
  /\besc\b/i.test(driver.name) ? "speed controller" : "motor driver chip";

export const SERVOS: Record<ServoKey, CatalogPart> = {
  sg90: part("SG90 servo", "SG90 servo", "Moves to an angle", "Actuator"),
  mg996r: part("MG996R servo", "MG996R servo", "Moves to an angle under load", "Actuator"),
};

/** The "+ Add a part" menu's groups, in the order it lists them. */
export const ADD_GROUPS = ["Senses", "Controls", "Shows", "Sounds", "Switches"] as const;
export type AddGroup = (typeof ADD_GROUPS)[number];
/** An addable part leads with what it is for (`plain`, "Temperature &
 *  humidity"); its `label` is the part itself ("DHT22"), the menu row's sub. */
export type AddablePart = CatalogPart & { group: AddGroup; plain: string };

const add = (
  group: AddGroup,
  plain: string,
  label: string,
  name: string,
  role: string,
  category: ConceptPartCategory,
): AddablePart => ({ ...part(label, name, role, category), group, plain });

export const ADDABLE: Record<AddableKey, AddablePart> = {
  dht22: add(
    "Senses",
    "Temperature & humidity",
    "DHT22",
    "DHT22 temperature and humidity sensor",
    "Senses temperature and humidity",
    "Sensor",
  ),
  pir: add("Senses", "People moving nearby", "HC-SR501 PIR", "HC-SR501 PIR motion sensor", "Senses motion", "Sensor"),
  gps: add("Senses", "Position (GPS)", "NEO-6M", "NEO-6M GPS module", "Finds its position", "Sensor"),
  imu: add("Senses", "Tilt & motion", "MPU-6050", "MPU-6050 IMU", "Senses tilt and motion", "Sensor"),
  ultrasonic: add(
    "Senses",
    "Distance",
    "HC-SR04 ultrasonic",
    "HC-SR04 ultrasonic sensor",
    "Measures distance",
    "Sensor",
  ),
  light: add("Senses", "Light level", "BH1750", "BH1750 light sensor", "Senses light", "Sensor"),
  soil: add(
    "Senses",
    "Soil moisture",
    "Capacitive sensor",
    "Capacitive soil moisture sensor",
    "Senses soil moisture",
    "Sensor",
  ),
  button: add("Controls", "Push button", "Tactile button", "Tactile button", "Takes a press", "Display & I/O"),
  joystick: add("Controls", "Joystick", "2-axis module", "Joystick module", "Takes a direction", "Display & I/O"),
  encoder: add("Controls", "Turn knob", "Rotary encoder", "Rotary encoder", "Takes a turn", "Display & I/O"),
  touch: add("Controls", "Touch pad", "TTP223", "TTP223 touch sensor", "Takes a touch", "Display & I/O"),
  oled: add("Shows", "Small screen, text", '0.96" OLED', '0.96" OLED display', "Shows text and icons", "Display & I/O"),
  tft: add("Shows", "Colour screen", '1.8" TFT', '1.8" TFT display', "Shows colour graphics", "Display & I/O"),
  eink: add(
    "Shows",
    "Paper-like screen",
    '2.13" e-ink',
    '2.13" e-ink display',
    "Shows a still image without power",
    "Display & I/O",
  ),
  led: add("Shows", "Status light", "LED", "Status LED", "Shows its state", "Actuator"),
  "led-strip": add("Shows", "Colour light strip", "WS2812B", "WS2812B LED strip", "Lights up in colour", "Actuator"),
  buzzer: add("Sounds", "Beeper", "Piezo buzzer", "Piezo buzzer", "Beeps", "Actuator"),
  speaker: add("Sounds", "Speaker", "Mini speaker", "Mini speaker", "Plays sound", "Actuator"),
  relay: add("Switches", "Switch a big load on/off", "5 V relay", "5V relay module", "Switches a high-current load", "Actuator"),
};

/** What each case wall is like, by its thickness — the Wall menu's sub. */
const WALL_NOTES: Record<string, string> = {
  "1.2": "Lightest, flexes",
  "1.6": "Light",
  "2.0": "Standard",
  "2.4": "Sturdy",
  "2.8": "Tough",
  "3.2": "Very tough",
  "3.6": "Drop-proof",
  "4.0": "Drop-proof, heaviest",
};

export const wallNote = (mm: number): string | undefined => WALL_NOTES[mm.toFixed(1)];

export const CHARGE_PORTS: Record<ChargePortKey, { label: string; part: CatalogPart | null }> = {
  "usb-c": {
    label: "USB-C",
    part: part("USB-C", "USB-C connector", "Charges and powers the product", "Connector & mech"),
  },
  "micro-usb": {
    label: "Micro-USB",
    part: part("Micro-USB", "Micro-USB connector", "Charges and powers the product", "Connector & mech"),
  },
  barrel: {
    label: "Barrel jack",
    part: part("Barrel jack", "DC barrel jack", "Takes the wall adapter", "Connector & mech"),
  },
  none: { label: "None", part: null },
};

export const MOUNTINGS: Record<MountingKey, CatalogPart> = {
  "rubber-feet": part("Rubber feet", "Rubber feet (x4)", "Keeps it steady on a surface", "Connector & mech"),
  screws: part("M3 screws", "M3 mounting screws (x4)", "Screws it to a surface", "Connector & mech"),
  magnets: part("Magnets", "Neodymium disc magnets (x4)", "Holds it to steel", "Connector & mech"),
};

export const ENVIRONMENTS: Record<EnvironmentKey, { label: string }> = {
  indoor: { label: "Indoor" },
  "splash-proof": { label: "Splash-proof" },
  waterproof: { label: "Waterproof" },
};

/** What Waterproof puts in: a seal in the lid's seam. */
export const GASKET = part("Gasket", "Silicone O-ring gasket", "Seals the case", "Connector & mech");

// ───────────────────────── what a list already has ─────────────────────────

const lower = (p: ConceptPart) => p.name.toLowerCase();
export const isMcu = (p: ConceptPart) => p.category === "Microcontroller";

/** The kind a name reads as, first match wins. */
function kindOf<K>(table: [RegExp, K][], text: string): K | undefined {
  return table.find(([re]) => re.test(text))?.[1];
}

// The radios an MCU has on its die, by its name — the network map's reading
// (lib/network/derive.ts), so the sheet and the map agree on what a chip
// carries.
const ON_DIE: [RegExp, RadioKey[]][] = [
  [/esp32-?s2/, ["wifi", "esp-now"]],
  [/esp32/, ["wifi", "ble", "esp-now"]],
  [/esp8266|esp-?12|esp-?01/, ["wifi", "esp-now"]],
  [/nrf52/, ["ble"]],
  [/pico ?w\b/, ["wifi", "ble"]],
];

// The radios a chip's own words state — "Arduino Nano 33 BLE", "Uno R4
// WiFi", "STM32WB55 BLE" — for a chip the table above doesn't list. The
// words the card's reading of an MCU (confidence.ts's PROTOCOLS) always
// found, so a chip that names its radio is never read as having none.
const STATED: [RegExp, RadioKey][] = [
  [/esp-?now/, "esp-now"],
  [/nrf24/, "nrf24"],
  [/lora|sx12\d\d|rfm9\d/, "lora"],
  [/zigbee|cc25\d\d/, "zigbee"],
  [/\bble\b|bluetooth/, "ble"],
  [/wi-?fi/, "wifi"],
];

const statedRadios = (text: string): RadioKey[] =>
  STATED.filter(([re]) => re.test(text)).map(([, k]) => k);

/** The radios on an MCU's die: the table's, or the ones a chip it doesn't
 *  list states in its name — a radio it states is on the die. Read off the
 *  name alone: the role is the sheet's to write (mcuRole), and writing it
 *  must never take a radio off the chip. */
export function builtInRadios(mcu: ConceptPart | undefined): RadioKey[] {
  if (!mcu) return [];
  const n = lower(mcu);
  return kindOf(ON_DIE, n) ?? statedRadios(n);
}

// A radio module's protocol by its name. ESP-NOW and nRF24 go first: an
// "ESP-NOW" or "nRF24 2.4G" part would otherwise read as Wi-Fi or cellular.
// An HC-05/06 is Bluetooth Classic, which no key here is — null, so the card
// falls back to the protocol table's "Bluetooth" and never says BLE.
const MODULES: [RegExp, RadioKey | null][] = [
  [/hc-?0[56]/, null],
  [/esp-?now/, "esp-now"],
  [/nrf24/, "nrf24"],
  [/lora|sx12\d\d|rfm9\d/, "lora"],
  [/zigbee|xbee|cc25\d\d/, "zigbee"],
  [/sim\d{3}|\bgsm\b|\blte\b|cellular|\bmodem\b/, "cellular"],
  [/nrf52|\bble\b|bluetooth|hm-?1[01]/, "ble"],
  [/wi-?fi|\besp/, "wifi"],
];
// A wired link is not a radio, however much of a "transceiver" it is.
const WIRED = /\bcan\b|rs-?\d{3}|uart|usb|ethernet|mcp2515|\bi2c\b|\bspi\b|rj45/;
const RADIO_WORDS = /radio|wireless|\brf\b|\d{3}\s*mhz|transceiver|antenna/;

export function isRadioPart(p: ConceptPart): boolean {
  if (p.category !== "Connectivity") return false;
  const n = lower(p);
  return !WIRED.test(n) && (RADIO_WORDS.test(n) || MODULES.some(([re]) => re.test(n)));
}

/** The MCU's role once the maker has picked its radio. What it speaks is
 *  said in the words the card's radio reading (confidence.ts) and the
 *  network map both find — and "radio off" for a chip whose radio the
 *  product leaves unused. */
export function mcuRole(radio: RadioKey, onDie: RadioKey[]): string {
  if (onDie.includes(radio)) return `${FIRMWARE_ROLE} · ${RADIOS[radio].label} built in`;
  if (radio === "none" && onDie.length) return `${FIRMWARE_ROLE} · radio off`;
  return FIRMWARE_ROLE;
}

// What an MCU's name and role say it speaks, tried in the order
// confidence.ts's protocolOf tries them, so the sheet and the card read the
// same radio off the same chip.
const SAID: [RegExp, RadioKey][] = [
  [/radio off/, "none"],
  [/esp-?now/, "esp-now"],
  [/\bble\b|bluetooth/, "ble"],
  [/wi-?fi/, "wifi"],
];

/** The radio mcuRole wrote into the role — the maker's pick. */
function pickedRadio(role: string): RadioKey | undefined {
  if (role.endsWith(" · radio off")) return "none";
  return RADIO_KEYS.find((k) => role.endsWith(` · ${RADIOS[k].label} built in`));
}

/** The radio the product uses off its MCU's die — null when it has a
 *  module of its own, or an MCU with no radio. The maker's pick is read
 *  first: a chip whose name lists two ("ESP32 (Wi-Fi + BLE)") would read as
 *  the first of them otherwise. A radio a chip's role states counts as on
 *  its die too, when its name states none. */
export function builtInRadioOf(parts: ConceptPart[]): RadioKey | null {
  if (parts.some(isRadioPart)) return null;
  const mcu = parts.find(isMcu);
  if (!mcu) return null;
  const onDie = builtInRadios(mcu);
  const has = onDie.length ? onDie : statedRadios(mcu.role.toLowerCase());
  const picked = pickedRadio(mcu.role);
  if (picked && (picked === "none" || has.includes(picked))) return picked;
  if (!has.length) return null;
  const said = kindOf(SAID, `${mcu.name} ${mcu.role}`.toLowerCase());
  return said && (said === "none" || has.includes(said)) ? said : has[0];
}

/** The sheet's Connects: a radio module first — a dedicated radio outranks
 *  the MCU's, as the card reads it — then the MCU's own. Null for a radio
 *  module this catalog doesn't list. */
export function radioKeyOf(parts: ConceptPart[]): RadioKey | null {
  const radio = parts.find(isRadioPart);
  if (radio) return kindOf(MODULES, lower(radio)) ?? null;
  return builtInRadioOf(parts) ?? "none";
}

/** Whether these parts carry a radio: a module — one this catalog doesn't
 *  list included — or one on the MCU's die that isn't switched off. */
export function namesRadio(parts: ConceptPart[]): boolean {
  return radioKeyOf(parts) !== "none";
}

export type RadioChoice = { key: RadioKey; label: string; builtIn: boolean };

/** The radios these parts' MCU can have: its own, and every one a module
 *  brings — ESP-NOW only on an ESP. */
export function radioChoices(parts: ConceptPart[]): RadioChoice[] {
  const onDie = builtInRadios(parts.find(isMcu));
  return RADIO_KEYS.filter((k) => k === "none" || onDie.includes(k) || RADIOS[k].module).map(
    (k) => ({ key: k, label: RADIOS[k].label, builtIn: onDie.includes(k) }),
  );
}

// An S2/S3/H2 is an ESP32 the catalog doesn't carry — its own name, not
// the WROOM's, even when the module it sits on says "WROOM".
const MCU_NAMES: [RegExp, McuKey | null][] = [
  [/esp32-?c3/, "esp32-c3"],
  [/esp32-?[sh]\d/, null],
  [/esp32|wroom/, "esp32"],
  [/rp2040|\bpico\b/, "rp2040"],
  [/atmega328|arduino (?:nano|uno)/, "atmega328p"],
];

/** The sheet's Brain. Null for an MCU this catalog doesn't list, or none. */
export function mcuKeyOf(parts: ConceptPart[]): McuKey | null {
  const mcu = parts.find(isMcu);
  return mcu ? (kindOf(MCU_NAMES, lower(mcu)) ?? null) : null;
}

const MOTOR_WORDS = /motor|stepper|brushless|bldc|\bn20\b|28byj|nema/;
const NOT_DRIVE = /driver|controller|\besc\b|shield|mount|bracket|servo|vibration|haptic|pump|\bfan\b/;
const DRIVER =
  /motor (?:driver|controller|shield)|h-?bridge|\bl29[38]|l9110|tb6612|drv88\d\d|\besc\b(?!\s*(?:key|button))|uln2003|a4988|tmc2\d{3}|stepper driver/;
const SERVO = /servo|sg90|mg90|mg99\d/;

/** A motor that drives the product along — not a servo, a buzzer-like
 *  vibration motor, a pump or a fan, and not the driver or mount its own
 *  name mentions. */
export function isDriveMotor(p: ConceptPart): boolean {
  const n = lower(p);
  return !isMcu(p) && MOTOR_WORDS.test(n) && !NOT_DRIVE.test(n);
}

/** An H-bridge, an ESC or a stepper driver — the sheet sets these with the
 *  motors they drive. A servo driver (PCA9685) is not one. */
export function isMotorDriver(p: ConceptPart): boolean {
  const n = lower(p);
  return !isMcu(p) && DRIVER.test(n) && !/servo|pca9685/.test(n);
}

export function isServo(p: ConceptPart): boolean {
  const n = lower(p);
  return !isMcu(p) && SERVO.test(n) && !/mount|bracket|driver|pca9685|horn|tester/.test(n);
}

const MOTOR_KINDS: [RegExp, MotorKey][] = [
  [/\btt\b/, "tt"],
  [/\bn20\b/, "n20"],
  [/brushless|bldc/, "brushless"],
  [/28byj/, "28byj"],
];
const SERVO_KINDS: [RegExp, ServoKey][] = [
  [/mg99\d/, "mg996r"],
  [/sg90/, "sg90"],
];

/** Kind of the first, count of them all. Null kind for one the catalog
 *  doesn't list; null for none at all. */
export type DriveReading<K> = { kind: K | null; count: number } | null;

function driveOf<K>(parts: ConceptPart[], is: (p: ConceptPart) => boolean, kinds: [RegExp, K][]): DriveReading<K> {
  const own = parts.filter(is);
  if (!own.length) return null;
  return {
    kind: kindOf(kinds, lower(own[0])) ?? null,
    count: own.reduce((s, p) => s + qtyOf(p.name), 0),
  };
}

/** The sheet's Moves: the drive motors, then the servos apart. */
export const motorsOf = (parts: ConceptPart[]) => driveOf(parts, isDriveMotor, MOTOR_KINDS);
export const servosOf = (parts: ConceptPart[]) => driveOf(parts, isServo, SERVO_KINDS);

const PORT = /usb|type-?c|barrel|dc jack|power jack/;
// A charger module carries a port of its own, and a cable or a serial
// bridge names USB without being the product's socket.
const NOT_PORT = /cable|hub|charg(?:er|ing (?:module|board|ic))|tp40\d\d|uart|serial|ch340|cp210/;
const PORT_KINDS: [RegExp, ChargePortKey][] = [
  [/usb-?c|type-?c/, "usb-c"],
  [/micro-?\s?usb/, "micro-usb"],
  [/barrel|dc jack|power jack/, "barrel"],
];

/** The socket the product is charged or powered through. */
export function isChargePort(p: ConceptPart): boolean {
  const n = lower(p);
  const socket =
    p.category === "Connector & mech" ||
    (p.category === "Power Management" && /port|connector|jack|socket|receptacle/.test(n));
  return socket && PORT.test(n) && !NOT_PORT.test(n);
}

/** "none" when there is no port; null for a USB port of a kind not listed. */
export function chargePortOf(parts: ConceptPart[]): ChargePortKey | null {
  const port = parts.find(isChargePort);
  return port ? (kindOf(PORT_KINDS, lower(port)) ?? null) : "none";
}

// A bare set of screws or bolts — "M3 screws (x4)", "M4 bolt", "4 x M3 x 10
// screws" — is what fastens a product where it sits. A screw terminal, a lead
// screw, a standoff kit or a screw-top lid is not: the name has to start
// with the screws themselves, a count and an M2–M6 size aside.
const BARE_SCREWS =
  /^(?:\d{1,2}\s*[x×]\s+)?(?:m[2-6](?:\.5)?(?:\s*[x×]\s*\d+\s*(?:mm)?)?\s+)?(?:screws?|bolts?)\b(?![\s-]*(?:terminal|top|cap|driver))/;

const MOUNTING_KINDS: [RegExp, MountingKey][] = [
  [/\bfeet\b|\bfoot\b|rubber (?:bumpers?|pads?)/, "rubber-feet"],
  [/\bmagnets?\b/, "magnets"],
  [/mounting screws?|screws?.*\bmount|wall mount/, "screws"],
  [BARE_SCREWS, "screws"],
];

/** What holds the product where it sits — not a magnetic connector, and not
 *  the standoffs that hold the board inside it. */
export function isMounting(p: ConceptPart): boolean {
  const n = lower(p);
  return (
    p.category === "Connector & mech" &&
    !/connector|charg|cable/.test(n) &&
    MOUNTING_KINDS.some(([re]) => re.test(n))
  );
}

export function mountingOf(parts: ConceptPart[]): MountingKey | null {
  const m = parts.find(isMounting);
  return m ? (kindOf(MOUNTING_KINDS, lower(m)) ?? null) : null;
}

export function isGasket(p: ConceptPart): boolean {
  return p.category === "Connector & mech" && /gasket|\bo-?ring/.test(lower(p));
}

/** A sealed case, or the use the model said the product has. */
export function environmentOf(parts: ConceptPart[], hints: AiHints = {}): EnvironmentKey {
  if (parts.some(isGasket) || hints.useCase?.includes("waterproof")) return "waterproof";
  return hints.useCase?.includes("outdoor") ? "splash-proof" : "indoor";
}

/** The sheet section a part is shown in. */
export type PartRole =
  | "brain"
  | "connects"
  | "power"
  | "moves"
  | "senses"
  | "controls"
  | "shows"
  | "sounds"
  | "switches"
  | "case"
  | "other";

const SOUNDS = /buzzer|speaker|piezo|\bsiren\b/;
const SWITCHES = /relay|mosfet|\bssr\b/;
const SHOWS =
  /oled|lcd|tft|e-?ink|e-?paper|display|screen|matrix|segment|\bleds?\b|pixel|ws2812|sk6812|neopixel|strip|lamp/;
const MOVES = /motor|servo|stepper|brushless|bldc|pump|\bfan\b|vibration|haptic|propeller|solenoid/;

export function partRole(p: ConceptPart): PartRole {
  const n = lower(p);
  if (isMcu(p)) return "brain";
  // A driver or an ESC sits with the motors it drives, whatever category the
  // model filed it under.
  if (isDriveMotor(p) || isMotorDriver(p) || isServo(p)) return "moves";
  if (isBatteryPart(p) || p.category === "Power Management" || isChargePort(p)) return "power";
  if (p.category === "Connectivity") return isRadioPart(p) ? "connects" : "other";
  if (p.category === "Connector & mech") return "case";
  if (p.category === "Passive") return "other";
  if (SOUNDS.test(n)) return "sounds";
  if (SWITCHES.test(n)) return "switches";
  // A touch pad or a button is how the maker's hand gets in, whichever
  // category it came filed under; a reed "switch" is still a sensor.
  if (p.category === "Sensor") return /touch|button/.test(n) ? "controls" : "senses";
  if (SHOWS.test(n)) return "shows";
  if (p.category === "Display & I/O") return "controls";
  return MOVES.test(n) ? "moves" : "other";
}
