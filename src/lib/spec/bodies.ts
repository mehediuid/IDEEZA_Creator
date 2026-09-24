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

// First match wins, so a driver or a charger sits ahead of the motor or the
// battery its own name mentions.
const RULES: [RegExp, Body][] = [
  [/l298/, b(43, 43, 27, "board", 20)],
  [/tb6612|drv88\d\d|l9110|l293|motor driver|h-?bridge/, b(20, 20, 3, "board", 5)],
  [/tp4056|charg/, b(26, 17, 4, "board", 2)],
  [/mp1584|lm2596|mt3608|buck|boost/, b(22, 17, 4, "board", 5)],
  [/ams1117|lm1117|ap2112|\bldo\b|regulator/, b(7, 6.5, 1.8, "board", 5)],
  [/esp32-?c3/, b(16.6, 13.2, 2.4, "board", 50)],
  [/esp32-?s3/, b(25.5, 18, 3.1, "board", 90)],
  [/esp32|wroom/, b(25.5, 18, 3.1, "board", 80)],
  [/esp8266|esp-?12/, b(24, 16, 3, "board", 70)],
  [/arduino nano/, b(45, 18, 8, "board", 20)],
  [/atmega|attiny/, b(9, 9, 1.2, "board", 10)],
  [/rp2040|\bpico\b/, b(51, 21, 4, "board", 25)],
  [/stm32/, b(10, 10, 1.6, "board", 20)],
  [/nrf52/, b(16, 10, 2, "board", 10)],
  [/nrf24/, b(29, 15, 12, "board", 12)],
  [/lora|sx12\d\d|rfm9\d/, b(16, 16, 3, "board", 40)],
  [/hc-?0[56]/, b(27, 13, 3, "board", 30)],
  [/\bgps\b|neo-?[678]m/, b(35, 25, 8, "board", 45)],
  [/sim800|sim7\d\d|\bgsm\b|\blte\b/, b(24, 24, 3, "board", 100)],
  [/dht22|am2302/, b(25, 15, 7.7, "board", 2)],
  [/dht11/, b(15.5, 12, 5.5, "board", 2)],
  [/mpu-?\d{4}|\bimu\b|accelerometer|gyro/, b(20, 16, 3, "board", 4)],
  [/hc-?sr04|ultrasonic/, b(45, 20, 15, "case", 15)],
  [/\bpir\b|hc-?sr501/, b(32, 24, 25, "case", 1)],
  [/soil|moisture probe/, b(60, 20, 2, "outside", 5)],
  [/ds18b20/, b(5, 5, 5, "board", 1)],
  [/camera|ov2640|ov5640/, b(24, 24, 10, "board", 100)],
  [/microphone|\bmic\b|inmp441/, b(14, 12, 3, "board", 1)],
  [/mg99\d/, b(40, 20, 43, "case", 300)],
  [/servo|sg90|mg90/, b(23, 12, 29, "case", 100)],
  [/\bn20\b/, b(34, 12, 10, "case", 60)],
  [/brushless|bldc/, b(28, 28, 20, "case", 1000)],
  [/stepper|nema|28byj/, b(42, 42, 34, "case", 400)],
  [/pump/, b(45, 24, 24, "case", 200)],
  [/\bfan\b/, b(40, 40, 10, "case", 150)],
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
  [/button|switch|tactile/, b(6, 6, 5, "board", 0)],
  [/usb-?c|type-?c/, b(9, 7.5, 3.2, "board", 0)],
  [/micro-?usb/, b(8, 6, 3, "board", 0)],
  [/micro-?sd|sd card/, b(15, 14, 2, "board", 20)],
  [/barrel|dc jack/, b(14, 9, 11, "board", 0)],
  [/terminal/, b(10, 7.5, 10, "board", 0)],
  [/\bjst\b/, b(6, 4.5, 6, "board", 0)],
  [/header/, b(25, 2.5, 8.5, "board", 0)],
  [
    /enclosure|housing|\bcase\b|chassis|frame|wheel|screw|standoff|mount|strap|lid|knob|gear|propeller|antenna/,
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
  for (const [re, body] of RULES) if (re.test(name)) return { body, estimated: false };
  return {
    body: DEFAULTS[part.category] ?? DEFAULTS.Sensor,
    // A passive's size barely moves a board, and an unknown mechanical part
    // takes no room inside; neither is worth calling an estimate.
    estimated: part.category !== "Passive" && part.category !== "Connector & mech",
  };
}
