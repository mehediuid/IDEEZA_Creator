// BUILDLOAD's fixtures (spec §3.4): car, car-booked, lamp, plate, legacy,
// plus the two v2 builds the Load and dropped-product checks attach. Real
// stored shapes, built with the projects fixtures' own build() / companion()
// / part() / spec() — the numbers the tests expect come from running the
// real bomFor / netsFor / firmwareFor / deriveAssembly on these parts.

import { MIN, T, build, companion, items, part, project, row, spec } from "./projects.mjs";

export { MIN, T };

export const CAR_PARTS = [
  part("ESP32"),
  part("USB-C connector", "Connector & mech"),
  part("3V3 LDO", "Power Management"),
  part("TT gear motor (x2)", "Actuator"),
  part("TB6612FNG motor driver", "Power Management"),
  part("HC-SR04 ultrasonic sensor", "Sensor"),
  part("100nF capacitor", "Passive"),
  part("M3 screws (x4)", "Connector & mech"),
];

export const REMOTE_PARTS = [
  part("nRF24L01", "Connectivity"),
  part("2 x AA holder", "Power Management"),
  part("Tactile button", "Display & I/O"),
];

const remote = (o = {}) =>
  companion({ id: "remote", name: "Remote controller", title: "Remote controller", parts: REMOTE_PARTS, ...o });

export const CAR_GLB = "https://assets.test/car.glb";

/** Build b1: chat c1, version 1, all ten items ready, the primary's GLB. */
export const b1 = {
  ...build({ id: "b1", chatId: "c1", title: "RC Car", parts: CAR_PARTS, companions: [remote()], createdAt: T, status: "ready" }),
  modelGlbUrl: CAR_GLB,
};

/** Version 2 of chat c1: the car gains a status LED; the remote is the same. */
export const b2 = {
  ...build({
    id: "b2",
    chatId: "c1",
    title: "RC Car",
    parts: [...CAR_PARTS.slice(0, 7), part("Status LED", "Actuator"), CAR_PARTS[7]],
    companions: [remote()],
    createdAt: T + 60 * MIN,
    status: "ready",
  }),
  modelGlbUrl: CAR_GLB,
};

/** Version 2 without the remote, so prd_b is dropped (COR-108). */
export const b2NoRemote = { ...b2, id: "b2x", companions: [] };

/** Project `car` (id proj_car): prd_a → b1's primary, prd_b → b1's remote. */
export const carProject = project({
  id: "proj_car",
  slug: "car",
  name: "RC Car",
  productName: "RC Car",
  description: "",
  buildId: "b1",
  createdAt: T,
  builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
  products: [
    row("prd_a", "RC Car", "", "b1", "primary", T),
    row("prd_b", "Remote controller", "", "b1", "remote", T),
  ],
});

/** The car booked with a spec: its board is 50 × 40, so the outline line shows. */
export const carBooked = {
  ...build({ id: "b-booked", chatId: "c-booked", title: "RC Car", parts: CAR_PARTS, spec: spec(), createdAt: T }),
  modelGlbUrl: "/models/sample.glb",
};

/** A lamp: its WS2812 ring (D1) gets VBUS, GND and DIN — three nets, so an
 *  `ic` on the sheet, and an `led` in Wiring. */
export const lamp = build({
  id: "b-lamp",
  chatId: "c-lamp",
  title: "Desk Lamp",
  parts: [
    part("ESP32"),
    part("USB-C connector", "Connector & mech"),
    part("3V3 LDO", "Power Management"),
    part("WS2812 LED ring", "Actuator"),
  ],
  createdAt: T,
});

/** A plate: hardware only, so there is no board and nothing to wire. */
export const plate = build({
  id: "b-plate",
  chatId: "c-plate",
  title: "Name Plate",
  parts: [part("Printed plate", "Connector & mech"), part("Rubber feet (x4)", "Connector & mech")],
  createdAt: T,
});

/** A build older than the Code piece: its code item is skipped. */
export const legacy = build({
  id: "b-legacy",
  chatId: "c-legacy",
  title: "RC Car",
  parts: CAR_PARTS,
  items: items("ready", { code: "skipped" }),
  createdAt: T,
});

/** A battery-powered ESP32 with no regulator: the pack feeds 3V3 to the MCU
 *  and VBAT to the LED, two supplies it feeds, so one has no free pin. */
export const battery = build({
  id: "b-battery",
  chatId: "c-battery",
  title: "Night Light",
  parts: [part("ESP32"), part("2 x AA holder", "Power Management"), part("WS2812 LED", "Actuator")],
  createdAt: T,
});

/** Five sensors: the fifth one's column starts past the A4 frame. */
export const wide = build({
  id: "b-wide",
  chatId: "c-wide",
  title: "Weather Station",
  parts: [
    part("ESP32"),
    part("USB-C connector", "Connector & mech"),
    part("3V3 LDO", "Power Management"),
    part("BME280 sensor", "Sensor"),
    part("VEML7700 light sensor", "Sensor"),
    part("SGP30 air sensor", "Sensor"),
    part("SHT31 humidity sensor", "Sensor"),
    part("MPU6050 motion sensor", "Sensor"),
  ],
  createdAt: T,
});

/** A crystal (Y1) has no land pattern, so it stays on the schematic. */
export const clocked = build({
  id: "b-clock",
  chatId: "c-clock",
  title: "Clock",
  parts: [part("ATmega328P"), part("16MHz crystal", "Passive"), part("USB-C connector", "Connector & mech")],
  createdAt: T,
});

export const ALL = { car: b1, carBooked, lamp, plate, legacy, battery, wide, clocked, b2 };
