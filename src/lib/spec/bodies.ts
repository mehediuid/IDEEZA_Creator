// Body size and typical running current for the parts a concept names — the
// data the spec's sizes and runtimes are computed from. Dimensions are the
// datasheet outlines in millimetres of the part as makers buy it (a module on
// its breakout, where that is how it is sold); current is a typical draw,
// not a peak. A name no entry matches takes its category's default and is
// reported as an estimate, never passed off as measured.

import type { ConceptPart, ConceptPartCategory } from "../create/concept";

/** On the PCB, loose inside the enclosure, or not inside it at all. */
export type Placement = "board" | "case" | "outside";
export type Body = { l: number; w: number; h: number; at: Placement; mA: number };

const b = (l: number, w: number, h: number, at: Placement, mA: number): Body => ({
  l,
  w,
  h,
  at,
  mA,
});

// A leading "(x4)"/"x4" or a trailing "4 x"/"4×" states how many of this
// part the concept means — a bare digit next to the word is read, never a
// number spelled out, so "four SG90 servos" still counts as one until the
// maker or the AI writes the digit form.
const QTY_AFTER_X = /(?:^|[(\s,])[x×]\s*(\d{1,2})\b/i;
const QTY_BEFORE_X = /\b(\d{1,2})\s*[x×](?:[)\s,]|$)/i;

// A resolution or a grid ("128 x 64", "16 x 2", "8x8") states a size, not a
// count — a digit on both sides of the "x" (allowing only whitespace between)
// means this is a dimension, so qtyOf reads nothing from it at all. Without
// this, "0.96\" OLED 128 x 64" read as sixteen OLEDs and "M3 x 10 screws"
// read as ten.
const DIMENSION = /\d\s*[x×]\s*\d/;

/** How many of this part its own name says there are — 1 when it says
 *  nothing, capped at 16 so a typo can't blow up the board or the draw. */
export function qtyOf(name: string): number {
  const n = name.toLowerCase();
  if (DIMENSION.test(n)) return 1;
  const m = n.match(QTY_AFTER_X) ?? n.match(QTY_BEFORE_X);
  const count = m ? Number(m[1]) : 1;
  return Number.isFinite(count) && count > 0 ? Math.min(count, 16) : 1;
}

// A stated wattage on an LED is the part's own word for its current — read
// straight off it instead of the single-status-LED default every "3 W
// emitter" would otherwise take. "LED emitter"/"high-power LED" with no
// number named still means more than a 5 mm indicator, so it takes 3 W.
const LED_WATTS = /(\d+(?:\.\d+)?)\s*w\b/;
const HIGH_POWER_NAME = /high-?power\s+led|led\s+emitter/;

function highPowerLedBody(name: string): Body | null {
  const watts = name.match(LED_WATTS)?.[1];
  // A wattage only counts when it is stated on an LED — "3 W buzzer" is not
  // one — but "LED emitter"/"high-power LED" names it plainly enough
  // without a number.
  if (watts && /\bleds?\b/.test(name)) {
    return b(10, 10, 5, "board", Math.round((Number(watts) / 3.7) * 1000));
  }
  if (HIGH_POWER_NAME.test(name)) return b(10, 10, 5, "board", Math.round((3 / 3.7) * 1000));
  return null;
}

// An addressable matrix names its own grid ("8x32") — the whole panel is the
// part, not one pixel, so its footprint and draw scale with N × M rather
// than falling to the bare-pixel rule below. A bare "panel" is not enough on
// its own to mean this: an LCD, OLED, TFT, e-ink or touch panel states a
// resolution too ("TFT LCD panel 320x240"), and none of those is an LED
// grid — so an LED word is required, and any of those other panel kinds
// rules it out even if "matrix" or a grid also appears in the name. The
// solar/anemometer outside-rule (below, in RULES) also names its own
// dimension ("Solar panel 110x60mm") and must win over this — excluding
// "solar" here is what lets it.
const MATRIX_GRID = /(\d{1,3})\s*[x×]\s*(\d{1,3})/;
const MATRIX_NAME = /\bleds?\b|pixel|ws2812\w*|sk6812\w*|neopixel|matrix/;
const MATRIX_EXCLUDE = /solar|lcd|oled|tft|e-?ink|touch/;

function ledMatrixBody(name: string): Body | null {
  if (MATRIX_EXCLUDE.test(name)) return null;
  const grid = name.match(MATRIX_GRID);
  if (!grid || !MATRIX_NAME.test(name)) return null;
  const n = Number(grid[1]);
  const m = Number(grid[2]);
  return b(m * 10, n * 10, 3, "case", Math.min(n * m * 10, 3000));
}

// First match wins, so a driver or a charger sits ahead of the motor or the
// battery its own name mentions.
const RULES: [RegExp, Body][] = [
  [/l298/, b(43, 43, 27, "board", 20)],
  [/tb6612|drv88\d\d|l9110|l293|motor driver|h-?bridge/, b(20, 20, 3, "board", 5)],
  // A stepper's driver board and a brushless motor's ESC carry the motor's
  // current, they don't add to it — each one sits ahead of the stepper and
  // brushless rules its own name would otherwise fall into.
  [/uln2003|stepper driver/, b(35, 32, 15, "board", 5)],
  [/\besc\b(?!\s*(?:key|button))/, b(45, 24, 8, "case", 5)],
  [/tp4056|charger|charging (?:module|board|ic)/, b(26, 17, 4, "board", 2)],
  [/mp1584|lm2596|mt3608|buck|boost/, b(22, 17, 4, "board", 5)],
  [/ams1117|lm1117|ap2112|\bldo\b|regulator/, b(7, 6.5, 1.8, "board", 5)],
  [/esp32-?c3/, b(16.6, 13.2, 2.4, "board", 50)],
  [/esp32-?s3/, b(25.5, 18, 3.1, "board", 90)],
  [/esp32|wroom/, b(25.5, 18, 3.1, "board", 80)],
  [/esp8266|esp-?12/, b(24, 16, 3, "board", 70)],
  [/arduino nano/, b(45, 18, 8, "board", 20)],
  // Ahead of the bare ATmega rule below — a maker who spells it out as
  // "ATmega32U4 Pro Micro" still means this board, not the ATtiny default.
  [/pro\s*micro|32u4/, b(33, 18, 4, "board", 15)],
  [/atmega|attiny/, b(9, 9, 1.2, "board", 10)],
  [/rp2040|\bpico\b/, b(51, 21, 4, "board", 25)],
  [/stm32/, b(10, 10, 1.6, "board", 20)],
  [/nrf52/, b(16, 10, 2, "board", 10)],
  [/nrf24/, b(29, 15, 12, "board", 12)],
  [/lora|sx12\d\d|rfm9\d/, b(16, 16, 3, "board", 40)],
  [/zigbee|cc25\d\d/, b(28, 16, 3, "board", 30)],
  [/hc-?0[56]/, b(27, 13, 3, "board", 30)],
  [/\bgps\b|neo-?[678]m/, b(35, 25, 8, "board", 45)],
  [/sim800|sim7\d\d|\bgsm\b|\blte\b/, b(24, 24, 3, "board", 100)],
  [/dht22|am2302/, b(25, 15, 7.7, "board", 2)],
  [/dht11/, b(15.5, 12, 5.5, "board", 2)],
  // An NDIR CO2 module carries its own IR source and pump; a plain gas
  // sensor default (a 15x12x3 mm breakout) is an order of magnitude small.
  [/mh-?z19|ndir/, b(33, 20, 9, "board", 20)],
  // A particulate sensor's fan and housing make it the largest "sensor" in
  // most air-quality concepts, not the smallest.
  [/pms5003|particulate/, b(50, 38, 21, "case", 100)],
  [/mpu-?\d{4}|\bimu\b|accelerometer|gyro/, b(20, 16, 3, "board", 4)],
  [/hc-?sr04|ultrasonic/, b(45, 20, 15, "case", 15)],
  [/\bpir\b|hc-?sr501/, b(32, 24, 25, "case", 1)],
  [/soil|moisture probe/, b(60, 20, 2, "outside", 5)],
  // A solar panel is normally the largest external part of what it powers;
  // a cup anemometer is a mechanical assembly outside the enclosure too —
  // neither is the tiny board-mounted part its category default assumes.
  [/solar panel|anemometer/, b(0, 0, 0, "outside", 0)],
  // A reed switch is a magnetic position sensor mounted away from the
  // board (a fork, a door frame) — ahead of the generic switch rule below,
  // which would otherwise read it as a panel-mounted tactile button.
  [/reed/, b(14, 3, 3, "board", 0)],
  [/ds18b20/, b(5, 5, 5, "board", 1)],
  [/bh1750/, b(19, 14, 3, "board", 1)],
  [/camera|ov2640|ov5640/, b(24, 24, 10, "board", 100)],
  [/microphone|\bmic\b|inmp441/, b(14, 12, 3, "board", 1)],
  // A "motor mount" or a "servo bracket" is the hardware that holds the
  // motor or servo, not the part itself — ahead of both, so it never reads
  // as extra current draw or an extra case body.
  [/\b(?:mount|bracket)\b/, b(0, 0, 0, "outside", 0)],
  [/mg99\d/, b(40, 20, 43, "case", 300)],
  [/servo|sg90|mg90/, b(23, 12, 29, "case", 100)],
  [/\bn20\b/, b(34, 12, 10, "case", 60)],
  [/brushless|bldc/, b(28, 28, 20, "case", 1000)],
  // A 28BYJ-48 is a small geared 5 V stepper, not the NEMA 17 below.
  [/28byj/, b(42, 28, 19, "case", 240)],
  [/stepper|nema/, b(42, 42, 34, "case", 400)],
  [/pump/, b(45, 24, 24, "case", 200)],
  [/\bfan\b/, b(40, 40, 10, "case", 150)],
  // A PTC element or resistive heater draws well past the generic Actuator
  // default — close to what a real mug/kettle warmer pulls off a 1S pack.
  [/heater|heating|\bptc\b/, b(30, 20, 5, "case", 1000)],
  [/vibration|haptic/, b(10, 10, 3, "case", 80)],
  [/motor/, b(70, 22, 19, "case", 150)],
  [/relay/, b(19, 15, 15, "board", 70)],
  [/buzzer/, b(12, 12, 9.5, "board", 20)],
  [/speaker/, b(28, 28, 8, "case", 100)],
  [/(?:led|pixel|ws2812\w*|sk6812\w*|neopixel)\s+(?:strip|ring)/, b(100, 10, 3, "case", 300)],
  [/ws2812|sk6812|neopixel/, b(5, 5, 1.6, "board", 20)],
  [/\bleds?\b/, b(5, 5, 1.6, "board", 10)],
  [/oled|ssd1306|sh1106/, b(27, 27, 4, "board", 20)],
  [/1602|2004|character lcd/, b(80, 36, 12, "case", 25)],
  [/tft|st7789|ili9341|\blcd\b/, b(45, 35, 4, "case", 60)],
  [/e-?ink|e-?paper/, b(48, 33, 2, "case", 5)],
  [/joystick|thumbstick/, b(34, 26, 32, "case", 1)],
  [/keypad/, b(77, 70, 10, "case", 0)],
  [/encoder/, b(13, 12, 20, "board", 1)],
  // A capacitive touch pad on its breakout — ahead of the button rule, which
  // a "touch button" would otherwise read as a 6 mm tactile switch.
  [/ttp223|touch (?:sensor|pad|button)/, b(24, 16, 3, "board", 2)],
  [/button|switch|tactile/, b(6, 6, 5, "board", 0)],
  [/usb-?c|type-?c/, b(9, 7.5, 3.2, "board", 0)],
  [/micro-?usb/, b(8, 6, 3, "board", 0)],
  [/micro-?sd|sd card/, b(15, 14, 2, "board", 20)],
  [/barrel|dc jack/, b(14, 9, 11, "board", 0)],
  [/terminal/, b(10, 7.5, 10, "board", 0)],
  [/\bjst\b/, b(6, 4.5, 6, "board", 0)],
  [/header/, b(25, 2.5, 8.5, "board", 0)],
  [
    /enclosure|housing|\bcase\b|chassis|frame|wheel|screw|standoff|mount|strap|lid|knob|gear|propeller|antenna|\bfeet\b|\bmagnets?\b|gasket|o-?ring/,
    b(0, 0, 0, "outside", 0),
  ],
];

const DEFAULTS: Record<ConceptPartCategory, Body> = {
  Microcontroller: b(25.5, 18, 3.1, "board", 80),
  Sensor: b(15, 12, 3, "board", 3),
  Actuator: b(30, 20, 15, "case", 100),
  "Power Management": b(7, 6.5, 1.8, "board", 5),
  "Display & I/O": b(25, 25, 5, "board", 15),
  Connectivity: b(16, 16, 3, "board", 20),
  Passive: b(1.6, 0.8, 0.5, "board", 0),
  // An unrecognised mechanical part is more often the enclosure's own
  // hardware than something soldered to the board.
  "Connector & mech": b(0, 0, 0, "outside", 0),
};

export function bodyOf(part: ConceptPart): { body: Body; estimated: boolean } {
  const name = part.name.toLowerCase();
  // Both read a number out of the name itself, so they run ahead of the
  // fixed-body table — a matrix or a stated wattage before the single-pixel
  // and single-status-LED rules they'd otherwise fall into.
  const highPowerLed = highPowerLedBody(name);
  if (highPowerLed) return { body: highPowerLed, estimated: false };
  const ledMatrix = ledMatrixBody(name);
  if (ledMatrix) return { body: ledMatrix, estimated: false };
  for (const [re, body] of RULES) if (re.test(name)) return { body, estimated: false };
  return {
    body: DEFAULTS[part.category] ?? DEFAULTS.Sensor,
    // A passive's size barely moves a board, and an unknown mechanical part
    // takes no room inside; neither is worth calling an estimate.
    estimated: part.category !== "Passive" && part.category !== "Connector & mech",
  };
}
