// The sample Innovations posts: one full post for every feed project
// (lib/feed.ts), so the post page reads like a real community while there is
// no backend. Each feed project has a hand-written entry below (story,
// description, stage, products with specs and parts, and a seeded comment
// thread for about 60 % of them). A project that is not in the table gets a
// post from its category's template, so samplePostOf never fails.
//
// Pure and deterministic: no clock, no randomness. Comment times are
// "minutes ago" against the `now` the caller passes.
//
// Relative imports only (node:test loads the compiled module).

import { CATEGORIES, PROJECTS, type Project, type ProjectCategory } from "../feed";
import type { PostComment } from "./comments";
import { personOf } from "./people";
import { postIdOfSample } from "./slug";
import type { InnovationPost, PostMedia, PostPart, PostPiece, PostProduct, PostSpec } from "./types";

// ─────────────────────────── seed shapes ───────────────────────────

type SpecRow = readonly [label: string, value: string];
type PartRow = readonly [name: string, qty: number, use: string];
type License = "Commercial use" | "Personal use";

type ProductSeed = {
  id: string;
  name: string;
  summary: string;
  /** Only when stated; the first product always shows the feed image. */
  image?: string;
  /** Defaults to all five pieces. */
  pieces?: readonly PostPiece[];
  specs: readonly SpecRow[];
  parts: readonly PartRow[];
};

type CommentSeed = {
  by: string;
  /** Minutes before `now`. */
  ago: number;
  likes: number;
  body: string;
  image?: string;
  /** Minutes before `now` it was edited. */
  edited?: number;
  /** Minutes before `now` the maker hid it. */
  hidden?: number;
  /** A nested-level reply that answers someone other than the reply it sits under. */
  replyTo?: string;
  replies?: readonly CommentSeed[];
};

type PostSeed = {
  /** A project Activity type (journey.ts CATALOGUES.project) — what the maker is doing now. */
  stage: string;
  story: string;
  description: string;
  network?: string;
  /** Minted posts only. */
  license?: License;
  /** [label, price] rows; minted posts only, about half of them. */
  listing?: readonly (readonly [string, string])[];
  products: readonly ProductSeed[];
  comments?: readonly CommentSeed[];
};

const ALL_PIECES: readonly PostPiece[] = ["3d", "pcb", "code", "wiring", "parts"];
const NO_CODE: readonly PostPiece[] = ["3d", "pcb", "wiring", "parts"];
const PRINTED_ONLY: readonly PostPiece[] = ["3d", "parts"];

const HOUR = 3_600_000;
const MINUTE = 60_000;
const MAIN = "Whole project (Main NFT)";
const VIRTUAL = "Virtual copy";
const physical = (sold: number, of: number) => `Physical copy · ${sold} of ${of} sold`;

// ─────────────────────────── the 36 feed posts ───────────────────────────

const SEEDS: Record<string, PostSeed> = {
  "hexapod-walking-robot": {
    stage: "prototype",
    story:
      "I wanted a walking robot my kids could drive around the living room without it tipping over on the rug. Six legs with three servos each turned out to be the easiest way to stay stable. The gait code is short enough to change in an evening, so you can teach it new walks or slow it down for thick carpet. Print the legs in PETG, the hips take the most load.",
    description:
      "An 18-servo hexapod with a tripod gait that walks on carpet, tile and grass. An ESP32-S3 drives two PCA9685 servo boards and reads a BMI270 to keep the body level on slopes. It runs about 40 minutes on a 2S 2200 mAh pack. The handheld remote talks to it over ESP-NOW, so there is no router in the way.",
    network: "ESP-NOW · 1 robot, 1 remote",
    products: [
      {
        id: "hexapod",
        name: "Hexapod",
        summary: "18-servo walker with an ESP32-S3 and body levelling",
        specs: [
          ["Controller", "ESP32-S3"],
          ["Servos", "18 × MG90S"],
          ["Power", "2S Li-ion, 7.4 V"],
          ["Run time", "About 40 min"],
          ["Weight", "1.1 kg"],
          ["Size", "320 × 280 × 120 mm"],
        ],
        parts: [
          ["ESP32-S3-WROOM-1 module", 1, "Controller"],
          ["PCA9685 PWM driver", 2, "Servo signals"],
          ["MG90S metal-gear servo", 18, "Legs"],
          ["BMI270 IMU", 1, "Body levelling"],
          ["MP1584 buck converter, 5 V 3 A", 3, "Servo power"],
          ["AMS1117-3.3 regulator", 1, "3.3 V rail"],
          ["2S 2200 mAh Li-ion pack", 1, "Battery"],
          ["XT30 connector", 1, "Battery lead"],
          ["10 kΩ resistor, 0603", 6, "Pull-ups"],
          ["100 nF capacitor, 0603", 10, "Decoupling"],
          ["470 µF capacitor, 16 V", 3, "Servo bulk"],
          ["Leg segments, 3D printed", 18, "PETG"],
          ["M2 × 6 screw", 72, "Servo horns"],
          ["Body plates, 3D printed", 2, "PETG"],
        ],
      },
      {
        id: "remote",
        name: "Handheld Remote",
        summary: "ESP32-C3 remote with two thumbsticks and a gait switch",
        specs: [
          ["Controller", "ESP32-C3"],
          ["Radio", "ESP-NOW, 2.4 GHz"],
          ["Inputs", "2 thumbsticks, 4 buttons"],
          ["Power", "1000 mAh LiPo, USB-C"],
          ["Range", "About 50 m"],
        ],
        parts: [
          ["ESP32-C3-MINI-1 module", 1, "Controller, radio"],
          ["Analog thumbstick module", 2, "Steering, height"],
          ["6 mm tactile switch", 4, "Gait, stand, sit, reset"],
          ["TP4056 charger", 1, "Charging"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["1000 mAh LiPo cell", 1, "Battery"],
          ["USB-C receptacle, 16-pin", 1, "Charging port"],
          ["Shell, 3D printed", 2, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "k3",
        ago: 420,
        likes: 8,
        body: "How much current do all 18 servos pull when it stands up from sitting? I am wondering if one MP1584 per six servos is enough.",
        replies: [
          {
            by: "c1",
            ago: 360,
            likes: 5,
            body: "Standing up peaks around 4.5 A for half a second. Three MP1584s, one per pair of legs on each side, is the minimum. I added the 470 µF caps after the ESP32 browned out twice.",
          },
        ],
      },
      {
        by: "c6",
        ago: 2600,
        likes: 3,
        body: "The tripod gait looks so smooth in the photos. Does it handle thick rugs?",
        replies: [
          {
            by: "c1",
            ago: 2500,
            likes: 2,
            body: "Short pile is fine. On a shaggy rug it catches the front legs, so I raise the body 10 mm with the remote and it gets through.",
          },
        ],
      },
      { by: "k5", ago: 90, likes: 0, body: "Printing the legs now. Is PETG at 40 % infill strong enough for the hips?" },
    ],
  },

  "soil-moisture-mesh-network": {
    stage: "pilot-run",
    story:
      "Our community garden has 30 beds and nobody knew which ones were drying out. I built cheap soil nodes that report over Thread to one gateway in the shed, and the readings show up on a page anyone in the garden can open. We made 25 nodes in a weekend with a hot plate and a stencil. If you run a shared garden, the gateway page works without any cloud account.",
    description:
      "Battery soil nodes that measure moisture and soil temperature every 15 minutes and send them over a Thread mesh. Each node relays for its neighbours, so a long row of beds needs no extra repeaters. The gateway in the shed collects everything and serves a simple chart page on the local network. A pair of AA cells lasts about six months.",
    network: "Thread mesh · 25 nodes, 1 gateway",
    products: [
      {
        id: "node",
        name: "Soil Node",
        summary: "Moisture and soil temperature stake on a Thread mesh",
        specs: [
          ["Controller", "nRF52840"],
          ["Sensors", "Capacitive moisture, soil temperature"],
          ["Radio", "Thread, 802.15.4"],
          ["Power", "2 × AA"],
          ["Battery life", "About 6 months"],
          ["Size", "30 × 160 mm stake"],
        ],
        parts: [
          ["nRF52840 module (MDBT50Q)", 1, "Controller, radio"],
          ["Capacitive sensing pad (on PCB)", 1, "Moisture"],
          ["DS18B20 temperature sensor", 1, "Soil temperature"],
          ["TPS63031 buck-boost converter", 1, "3.3 V from AA"],
          ["2 × AA battery holder", 1, "Battery"],
          ["100 nF capacitor, 0603", 5, "Decoupling"],
          ["10 µF capacitor, 0805", 2, "Bulk"],
          ["4.7 kΩ resistor, 0603", 2, "1-Wire pull-up"],
          ["Conformal coating", 1, "Moisture protection"],
          ["Cap and stake, 3D printed", 1, "PETG"],
        ],
      },
      {
        id: "gateway",
        name: "Gateway",
        summary: "Thread border router with Wi-Fi and a local chart page",
        specs: [
          ["Controller", "ESP32-S3 + nRF52840"],
          ["Radio", "Wi-Fi + Thread"],
          ["Power", "5 V USB-C"],
          ["Storage", "microSD, a year of readings"],
          ["Size", "90 × 60 × 25 mm"],
        ],
        parts: [
          ["ESP32-S3-WROOM-1 module", 1, "Wi-Fi, web page"],
          ["nRF52840 module (MDBT50Q)", 1, "Thread radio"],
          ["microSD socket", 1, "Reading log"],
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["WS2812B LED", 1, "Status"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
          ["Enclosure, 3D printed", 1, "PETG"],
        ],
      },
    ],
    comments: [
      {
        by: "c8",
        ago: 1500,
        likes: 12,
        body: "How far apart can the nodes be before the mesh breaks up? Our allotment is about 80 m long.",
        replies: [
          {
            by: "c2",
            ago: 1450,
            likes: 7,
            body: "Between nodes I get about 25 m with plants in the way. With a node in every other bed you will be fine over 80 m, each one relays.",
            replies: [{ by: "k4", ago: 1300, likes: 1, body: "Good to know. Our beds are every 6 m, so that is plenty." }],
          },
        ],
      },
      {
        by: "c4",
        ago: 5000,
        likes: 9,
        body: "I used your probe pad layout as a starting point for my watering hub. Thanks for sharing the stencil files.",
        replies: [{ by: "c2", ago: 4900, likes: 4, body: "That is great to hear. Post a photo when it is running." }],
      },
    ],
  },

  "e-ink-smartwatch": {
    stage: "testing",
    story:
      "Every smartwatch I owned needed charging every night, so I made one that does not. The e-ink screen only draws power when the minute changes, and mine lasts about three weeks. It shows the time, steps, the next calendar event and phone notifications. The case is printed, so you can resize it for your wrist or write your own watch face in a few lines of code.",
    description:
      "A low-power watch built around a 1.54 in e-ink display and an nRF52840. It counts steps with a BMA423, shows notifications from your phone over Bluetooth LE, and buzzes for alarms. Charging is through magnetic pogo pins. Expect about three weeks between charges with notifications on.",
    network: "Bluetooth LE",
    license: "Personal use",
    listing: [
      [MAIN, "0.25 ETH"],
      [VIRTUAL, "0.01 ETH"],
    ],
    products: [
      {
        id: "watch",
        name: "E-ink Watch",
        summary: "nRF52840 watch with a 1.54 in e-ink screen and a step counter",
        specs: [
          ["Controller", "nRF52840"],
          ["Display", "1.54 in e-ink, 200 × 200"],
          ["Radio", "Bluetooth LE 5"],
          ["Battery", "200 mAh LiPo"],
          ["Battery life", "About 3 weeks"],
          ["Size", "44 × 38 × 12 mm"],
        ],
        parts: [
          ["nRF52840 module (MDBT50Q)", 1, "Controller, Bluetooth"],
          ["1.54 in e-ink display, 200 × 200", 1, "Display"],
          ["BMA423 accelerometer", 1, "Steps, wrist raise"],
          ["PCF8563 RTC", 1, "Timekeeping"],
          ["32.768 kHz crystal", 1, "RTC clock"],
          ["Coin vibration motor", 1, "Alarms"],
          ["BQ25101 charger", 1, "Charging"],
          ["TPS7A02 regulator, 3.3 V", 1, "3.3 V rail"],
          ["200 mAh LiPo cell", 1, "Battery"],
          ["Magnetic pogo connector, 2-pin", 1, "Charging"],
          ["3 mm side switch", 3, "Buttons"],
          ["100 nF capacitor, 0402", 8, "Decoupling"],
          ["Case, 3D printed resin", 1, "Body"],
          ["22 mm silicone strap", 1, "Strap"],
        ],
      },
    ],
    comments: [
      {
        by: "k6",
        ago: 200,
        likes: 6,
        body: "Three weeks with notifications on is impressive. Do you do a full refresh every minute or a partial one?",
        replies: [
          {
            by: "c3",
            ago: 150,
            likes: 4,
            body: "Partial updates each minute and a full refresh every hour to clear the ghosting. The full refresh is the expensive one.",
          },
        ],
      },
      {
        by: "c1",
        ago: 3000,
        likes: 4,
        body: "Would it fit a smaller wrist? My partner wants one.",
        replies: [
          {
            by: "c3",
            ago: 2900,
            likes: 2,
            body: "The case scales down to about 40 mm wide. Below that the display no longer fits, so that is the limit.",
          },
        ],
      },
      { by: "k2", ago: 30, likes: 1, body: "Does it work with iOS notifications or only Android?" },
    ],
  },

  "65w-gan-charger-board": {
    stage: "ready-for-manufacture",
    story:
      "I travel with a laptop, a phone and a camera, and I wanted one small charger for all three. GaN transistors let the board switch fast enough to shrink the transformer, so it fits in a box the size of a deck of cards. It passed my own load tests at 65 W for four hours. If you build one, treat the mains side with respect and test it behind an isolation transformer first.",
    description:
      "A 65 W USB-C PD charger built on an active-clamp flyback with a Navitas GaN power stage. It negotiates 5, 9, 15 and 20 V with any PD device and stays under 55 °C at full load in a closed case. The board has routed creepage slots between the mains and output sides. Two ports share the power, 45 W plus 20 W when both are in use.",
    license: "Commercial use",
    products: [
      {
        id: "charger",
        name: "GaN Charger",
        summary: "65 W two-port USB-C PD charger on a GaN flyback",
        specs: [
          ["Input", "100–240 V AC"],
          ["Output", "USB-C PD 3.0, up to 65 W"],
          ["Ports", "2 × USB-C"],
          ["Efficiency", "About 93 % at full load"],
          ["Topology", "Active-clamp flyback, GaN"],
          ["Size", "58 × 58 × 28 mm"],
        ],
        parts: [
          ["NV6125 GaN power IC", 1, "Main switch"],
          ["NCP1568 flyback controller", 1, "PWM control"],
          ["MP6908 synchronous rectifier controller", 1, "Secondary side"],
          ["STUSB4710 PD controller", 2, "Port negotiation"],
          ["PC817 optocoupler", 1, "Feedback"],
          ["TL431 reference", 1, "Feedback"],
          ["MB10F bridge rectifier", 1, "Mains rectifier"],
          ["RM8 transformer, custom wound", 1, "Isolation"],
          ["T2A fuse", 1, "Input protection"],
          ["MOV, 275 V", 1, "Surge"],
          ["Common-mode choke", 1, "EMI filter"],
          ["Y capacitor, 1 nF", 1, "EMI"],
          ["Bulk capacitor, 47 µF 400 V", 1, "Input bulk"],
          ["Polymer capacitor, 470 µF 25 V", 2, "Output"],
          ["USB-C receptacle, 24-pin", 2, "Outputs"],
          ["Enclosure, 3D printed PC-FR", 1, "Flame-rated case"],
        ],
      },
    ],
    comments: [
      {
        by: "c7",
        ago: 800,
        likes: 15,
        body: "What did you use to check the creepage distances? I want to build one but I am nervous about the mains side.",
        replies: [
          {
            by: "c4",
            ago: 760,
            likes: 10,
            edited: 740,
            body: "I followed the IEC 62368 distances for reinforced insulation, 6.4 mm between primary and secondary, and added the routed slot under the transformer. Test with an isolation transformer and a current-limited variac before anything else.",
            replies: [{ by: "c7", ago: 600, likes: 2, body: "Thank you. Ordering a variac first, then." }],
          },
        ],
      },
      {
        by: "c2",
        ago: 4000,
        likes: 7,
        body: "How warm does the transformer get at 65 W in the closed case?",
        replies: [{ by: "c4", ago: 3900, likes: 3, body: "About 78 °C on the core after an hour at full load, with the case at 52 °C." }],
      },
    ],
  },

  "pocket-synth-sequencer": {
    stage: "prototype",
    story:
      "I wanted something to make beats on the train without opening a laptop. This fits in a jacket pocket, has 16 step keys and a small speaker, and runs on two AAA cells. The synth engine is open, so you can add your own waveforms or change the scale. I mostly use it to sketch ideas and finish them later at home through the line out.",
    description:
      "A pocket synthesizer with a 16-step sequencer, four voices and a built-in speaker. An RP2040 runs the sound engine and sends audio to a PCM5102A DAC for the headphone and line out. Patterns save to flash, and MIDI over USB-C lets it sync with a DAW. Two AAA cells last about ten hours of playing.",
    products: [
      {
        id: "synth",
        name: "Pocket Synth",
        summary: "RP2040 synth with 16 step keys, a speaker and USB MIDI",
        specs: [
          ["Controller", "RP2040"],
          ["Audio", "PCM5102A DAC, 44.1 kHz"],
          ["Voices", "4"],
          ["Inputs", "16 step keys, 4 knobs"],
          ["Outputs", "Speaker, 3.5 mm jack, USB MIDI"],
          ["Power", "2 × AAA or USB-C"],
        ],
        parts: [
          ["RP2040 microcontroller", 1, "Sound engine"],
          ["W25Q16 flash, 2 MB", 1, "Firmware, patterns"],
          ["PCM5102A DAC", 1, "Audio out"],
          ["PAM8302 amplifier", 1, "Speaker drive"],
          ["28 mm speaker", 1, "Speaker"],
          ["3.5 mm audio jack", 1, "Line out"],
          ["6 mm tactile switch", 20, "Steps, function keys"],
          ["9 mm potentiometer, 10 kΩ", 4, "Knobs"],
          ["12 MHz crystal", 1, "Clock"],
          ["TPS61023 boost converter", 1, "3.3 V from AAA"],
          ["2 × AAA battery holder", 1, "Battery"],
          ["USB-C receptacle, 16-pin", 1, "Power, MIDI"],
          ["SSD1306 0.96 in OLED", 1, "Display"],
          ["100 nF capacitor, 0402", 12, "Decoupling"],
          ["Case, 3D printed", 2, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c3",
        ago: 2200,
        likes: 4,
        body: "Love the size. Could the sequencer send MIDI out to drive other synths too?",
        replies: [{ by: "c5", ago: 2100, likes: 2, body: "Yes, USB MIDI goes both ways. Notes and clock go out on the same port." }],
      },
    ],
  },

  "line-following-micro-rover": {
    stage: "launched",
    story:
      "I teach a robotics club and the kits we bought were either too fragile or too expensive. This rover costs under 15 dollars in parts, fits on a palm, and follows a black tape line at a good speed. The students tune the PID values from a phone page and see the result straight away. Feel free to use it in your class, and tell me which lessons worked.",
    description:
      "A palm-sized line follower with five reflectance sensors and two N20 gear motors. An ESP32-C3 runs the PID loop and serves a small page where you can change the gains while it drives. It runs on a single 18650 cell for about two hours. The chassis is the PCB itself, so there is almost nothing to assemble.",
    products: [
      {
        id: "rover",
        name: "Micro Rover",
        summary: "Five-sensor line follower with live PID tuning",
        specs: [
          ["Controller", "ESP32-C3"],
          ["Sensors", "5 × reflectance"],
          ["Motors", "2 × N20, 300 RPM"],
          ["Power", "1 × 18650"],
          ["Run time", "About 2 h"],
          ["Size", "70 × 60 × 35 mm"],
        ],
        parts: [
          ["ESP32-C3-MINI-1 module", 1, "Controller, Wi-Fi"],
          ["ITR8307 reflectance sensor", 5, "Line sensing"],
          ["DRV8833 motor driver", 1, "Motors"],
          ["N20 gear motor, 300 RPM", 2, "Drive"],
          ["32 mm wheel", 2, "Wheels"],
          ["Ball caster", 1, "Front support"],
          ["18650 holder", 1, "Battery"],
          ["TP4056 charger", 1, "Charging"],
          ["MT3608 boost converter", 1, "Motor rail"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["1 kΩ resistor, 0603", 5, "Sensor LEDs"],
          ["10 kΩ resistor, 0603", 5, "Sensor loads"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
        ],
      },
    ],
  },

  "air-quality-room-sensor": {
    stage: "pilot-run",
    story:
      "My daughter's room got stuffy at night and I wanted to know if it was CO2 or just warm air. This sensor measures real CO2, fine dust and VOCs, and the LED ring turns amber when it is time to open a window. We now sleep with the window open a crack and the readings stay under 900 ppm. Put one in a bedroom and one in the kitchen and compare.",
    description:
      "A room sensor that measures CO2, PM2.5, VOCs, temperature and humidity. It uses a true NDIR CO2 sensor instead of an estimate, and a fan-driven particle sensor for dust. The front LED ring goes green, amber or red, and the readings go over Wi-Fi to Home Assistant through MQTT. It runs from USB-C and draws under 1 W.",
    network: "Wi-Fi · MQTT",
    license: "Commercial use",
    listing: [
      [MAIN, "0.30 ETH"],
      [physical(6, 50), "0.04 ETH"],
      [VIRTUAL, "0.015 ETH"],
    ],
    products: [
      {
        id: "sensor",
        name: "Room Sensor",
        summary: "CO2, PM2.5 and VOC sensor with an LED ring",
        specs: [
          ["Controller", "ESP32-C3"],
          ["Sensors", "CO2 (NDIR), PM2.5, VOC, temperature, humidity"],
          ["Radio", "Wi-Fi, MQTT"],
          ["Power", "5 V USB-C, under 1 W"],
          ["Indicator", "12-LED ring"],
          ["Size", "80 × 80 × 32 mm"],
        ],
        parts: [
          ["ESP32-C3-MINI-1 module", 1, "Controller, Wi-Fi"],
          ["SCD41 CO2 sensor", 1, "CO2"],
          ["PMSA003I particle sensor", 1, "PM2.5"],
          ["SGP41 VOC sensor", 1, "VOC, NOx"],
          ["SHT40 sensor", 1, "Temperature, humidity"],
          ["WS2812B LED", 12, "Status ring"],
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["4.7 kΩ resistor, 0603", 2, "I2C pull-ups"],
          ["100 nF capacitor, 0603", 8, "Decoupling"],
          ["10 µF capacitor, 0805", 2, "Bulk"],
          ["Enclosure, 3D printed", 2, "PETG, vented"],
        ],
      },
    ],
    comments: [
      {
        by: "c2",
        ago: 350,
        likes: 11,
        body: "Where did you put the SCD41 relative to the ESP32? Mine reads high because the board warms it.",
        replies: [
          {
            by: "c7",
            ago: 300,
            likes: 8,
            body: "On a separate tab of the board with a slot cut around it, at the bottom of the case where the air comes in. The ESP32 sits at the top, so its heat rises away.",
          },
          { by: "c8", ago: 250, likes: 2, body: "Same issue here. A slot made a 1.5 °C difference for me." },
        ],
      },
      {
        by: "k4",
        ago: 1800,
        likes: 5,
        body: "Is the Home Assistant setup automatic, or do I add the MQTT topics by hand?",
        replies: [{ by: "c7", ago: 1700, likes: 3, body: "It uses MQTT discovery, so the sensors appear on their own once the broker is set." }],
      },
      { by: "c5", ago: 60, likes: 1, body: "Built two. The amber light is now my reminder to open the kitchen window." },
    ],
  },

  "gesture-control-glove": {
    stage: "design",
    story:
      "I do live visuals at small gigs and want to change scenes without walking back to the laptop. The glove will read finger bend and hand tilt and send them as MIDI over Bluetooth, so a closed fist can trigger the next scene and a wrist tilt can fade the lights. The board and the wrist pod are drawn up now. It should work with any app that takes MIDI, so musicians could bend notes with it too.",
    description:
      "A glove with five flex sensors and a 6-axis IMU that turns hand shapes into Bluetooth MIDI. An nRF52840 samples the fingers 100 times a second and sends notes and control changes with low latency. You teach it gestures by holding a pose and pressing the button on the wrist. A 300 mAh cell should last about eight hours of use.",
    network: "Bluetooth LE",
    products: [
      {
        id: "glove",
        name: "MIDI Glove",
        summary: "Flex and motion sensing glove that speaks Bluetooth MIDI",
        specs: [
          ["Controller", "nRF52840"],
          ["Sensors", "5 flex sensors, 6-axis IMU"],
          ["Radio", "Bluetooth LE MIDI"],
          ["Latency", "Under 15 ms"],
          ["Battery", "300 mAh, about 8 h"],
          ["Weight", "62 g"],
        ],
        parts: [
          ["nRF52840 module (MDBT50Q)", 1, "Controller, Bluetooth"],
          ["Flex sensor, 2.2 in", 5, "Finger bend"],
          ["BMI270 IMU", 1, "Hand tilt"],
          ["MCP6004 op-amp", 2, "Flex buffers"],
          ["47 kΩ resistor, 0603", 5, "Flex dividers"],
          ["300 mAh LiPo cell", 1, "Battery"],
          ["TP4056 charger", 1, "Charging"],
          ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
          ["USB-C receptacle, 16-pin", 1, "Charging"],
          ["6 mm tactile switch", 1, "Teach button"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
          ["Wrist pod, 3D printed TPU", 1, "Housing"],
          ["Fabric glove", 1, "Base glove"],
        ],
      },
    ],
  },

  "solar-mppt-controller": {
    stage: "launched",
    story:
      "Our village workshop runs off two 100 W panels, and the cheap PWM controller wasted a lot of the morning sun. This MPPT board tracks the panel's best point and gets about 20 % more into the battery on cloudy days. We have built twelve of them for neighbours. It handles 12 V and 24 V lead-acid or LiFePO4, and you can read everything over Bluetooth.",
    description:
      "A 20 A MPPT solar charge controller for 12 V and 24 V systems. A synchronous buck stage switched by an STM32G0 tracks the panel's maximum power point every second. It supports lead-acid and LiFePO4 profiles with temperature compensation. Live voltage, current and daily yield show on the OLED and in a phone app over Bluetooth LE.",
    network: "Bluetooth LE",
    license: "Commercial use",
    products: [
      {
        id: "controller",
        name: "MPPT Controller",
        summary: "20 A solar charger for 12 V and 24 V batteries",
        specs: [
          ["Controller", "STM32G0"],
          ["Input", "Up to 50 V panel"],
          ["Output", "12 V or 24 V battery, 20 A"],
          ["Efficiency", "Up to 97 %"],
          ["Display", "0.96 in OLED"],
          ["Size", "140 × 90 × 40 mm"],
        ],
        parts: [
          ["STM32G071 microcontroller", 1, "MPPT control"],
          ["ESP32-C3-MINI-1 module", 1, "Bluetooth, app"],
          ["IR2104 half-bridge driver", 1, "Gate drive"],
          ["BSC070N10NS3 MOSFET", 4, "Buck switches"],
          ["INA226 current monitor", 2, "Panel and battery current"],
          ["Shunt resistor, 2 mΩ 2512", 2, "Current sense"],
          ["Inductor, 33 µH 25 A", 1, "Buck inductor"],
          ["Polymer capacitor, 470 µF 63 V", 4, "Input, output"],
          ["10 kΩ NTC thermistor", 1, "Battery temperature"],
          ["SSD1306 0.96 in OLED", 1, "Display"],
          ["LMR16006 buck converter", 1, "Logic supply"],
          ["Screw terminal, 10 mm pitch", 2, "Panel, battery"],
          ["Heatsink, aluminium", 1, "MOSFET cooling"],
          ["Enclosure, aluminium extrusion", 1, "Case"],
        ],
      },
    ],
    comments: [
      {
        by: "k3",
        ago: 1000,
        likes: 9,
        body: "Which MPPT algorithm are you using? Perturb and observe, or incremental conductance?",
        replies: [
          {
            by: "c1",
            ago: 950,
            likes: 6,
            body: "Perturb and observe with a variable step. It takes big steps in the morning and small ones once it is close. Simple, and it has not got stuck yet.",
          },
        ],
      },
      {
        by: "c6",
        ago: 6000,
        likes: 4,
        body: "Twelve built for neighbours is great. Any failures so far?",
        replies: [{ by: "c1", ago: 5800, likes: 3, body: "One, a cracked MOSFET from a panel wired backwards. I added a reverse-polarity fuse after that." }],
      },
    ],
  },

  "lo-fi-guitar-pedal": {
    stage: "manufacturing",
    story:
      "I love the warbly sound of old tape decks, and every pedal that does it costs more than my guitar. This one gets close with a bucket-brigade delay chip and a slow wobble. It is fully analog, so there is no firmware to flash. Everything is through-hole and fits a standard 125B box, which makes it a nice second pedal build.",
    description:
      "An analog lo-fi pedal that adds tape-style wow, flutter and a short dark echo. An MN3207 bucket-brigade chip makes the delay, and an LFO bends its clock for the wobble. Knobs set depth, rate, tone and mix. It runs from a standard 9 V pedal supply and has true bypass.",
    license: "Personal use",
    listing: [
      [physical(11, 40), "0.03 ETH"],
      [VIRTUAL, "0.008 ETH"],
    ],
    products: [
      {
        id: "pedal",
        name: "Lo-fi Pedal",
        summary: "Analog bucket-brigade wobble and short echo in a 125B box",
        pieces: NO_CODE,
        specs: [
          ["Type", "Analog, bucket-brigade"],
          ["Controls", "Depth, rate, tone, mix"],
          ["Bypass", "True bypass, 3PDT"],
          ["Power", "9 V DC, center negative"],
          ["Current", "Under 30 mA"],
          ["Enclosure", "125B"],
        ],
        parts: [
          ["MN3207 BBD chip", 1, "Delay line"],
          ["MN3102 clock driver", 1, "BBD clock"],
          ["TL072 op-amp", 2, "Filters, mixer"],
          ["3PDT footswitch", 1, "Bypass"],
          ["16 mm potentiometer, 100 kΩ", 4, "Knobs"],
          ["1/4 in mono jack", 2, "In, out"],
          ["DC barrel jack, 2.1 mm", 1, "Power"],
          ["1N5817 diode", 1, "Reverse protection"],
          ["Film capacitor, assorted", 14, "Filters"],
          ["Metal film resistor, assorted", 32, "Bias, gain"],
          ["3 mm LED", 1, "On indicator"],
          ["125B aluminium enclosure", 1, "Case"],
        ],
      },
    ],
    comments: [
      {
        by: "c5",
        ago: 500,
        likes: 13,
        body: "Built it in one evening. The wobble at full depth is wonderfully seasick.",
        replies: [
          {
            by: "c2",
            ago: 470,
            likes: 4,
            body: "That is the right word for it. Try depth at 3 o'clock with the rate slow for a softer warble.",
          },
        ],
      },
      {
        by: "c3",
        ago: 2600,
        likes: 3,
        body: "Is the MN3207 still easy to find? I hear it is getting rare.",
        replies: [
          {
            by: "c2",
            ago: 2500,
            likes: 2,
            body: "Still available from a couple of suppliers. The Coolaudio V3207 is a drop-in replacement.",
            replies: [
              { by: "c3", ago: 2450, likes: 1, body: "Perfect, I will grab a V3207 then. Same clock chip?" },
              { by: "c2", ago: 2400, likes: 1, replyTo: "c3", body: "Yes, the V3102 pairs with it. Same pinout, so no board changes." },
            ],
          },
        ],
      },
      { by: "k6", ago: 20, likes: 0, body: "Which drilling template did you use for the enclosure?" },
    ],
  },

  "robotic-arm-with-haptics": {
    stage: "prototype",
    story:
      "I wanted to feel what the gripper feels when it picks up an egg. The arm copies a small leader arm on my desk, and the force in the gripper comes back as resistance in the leader's trigger. It is slow and careful rather than fast. I use it to teach my students about feedback, and it is also fun for picking up things you should not touch.",
    description:
      "A 5-axis desktop arm driven by a leader arm with haptic feedback in the grip. Each joint uses a serial bus servo with position readback, and a load cell in the gripper measures squeeze force. The leader's trigger has a small motor that pushes back in proportion to that force. Both arms talk to one ESP32-S3 at 1 kHz over a wired bus.",
    products: [
      {
        id: "arm",
        name: "Haptic Arm",
        summary: "5-axis arm and leader arm with force feedback in the grip",
        specs: [
          ["Controller", "ESP32-S3"],
          ["Axes", "5 plus gripper"],
          ["Actuators", "STS3215 serial servos"],
          ["Reach", "280 mm"],
          ["Payload", "250 g"],
          ["Feedback", "Grip force, 0–10 N"],
        ],
        parts: [
          ["ESP32-S3-WROOM-1 module", 1, "Controller"],
          ["STS3215 serial bus servo", 6, "Joints, gripper"],
          ["Load cell, 1 kg", 1, "Grip force"],
          ["HX711 load cell amplifier", 1, "Force reading"],
          ["DRV8833 motor driver", 1, "Trigger feedback"],
          ["N20 gear motor", 1, "Trigger feedback"],
          ["AS5600 magnetic encoder", 6, "Leader arm joints"],
          ["74HC126 buffer", 1, "Servo bus"],
          ["12 V 5 A power supply", 1, "Power"],
          ["MP1584 buck converter", 1, "5 V rail"],
          ["Arm links, 3D printed", 9, "PETG"],
          ["6802 bearing", 5, "Joints"],
          ["M3 × 10 screw", 40, "Assembly"],
        ],
      },
    ],
  },

  "smart-plant-watering-hub": {
    stage: "testing",
    story:
      "I kept killing my balcony herbs every time I travelled. This hub waters up to four pots from one 5 L tank, using soil moisture instead of a timer. Two probes have run on my balcony for six weeks on one charge. If you build one, tell me how your soil readings compare.",
    description:
      "A Wi-Fi watering hub for up to four pots. Each capacitive probe reports soil moisture over a low-power mesh, and the hub opens a pump channel when a pot drops below its threshold, then logs every watering. It runs from a 5 V USB-C supply, with an optional 18650 cell in each probe. Set thresholds and see the history on the hub's OLED or in the small dashboard it serves on your network.",
    network: "Mesh · 1 hub, 4 probes",
    license: "Commercial use",
    listing: [
      [MAIN, "0.40 ETH"],
      [physical(2, 30), "0.05 ETH"],
      [VIRTUAL, "0.02 ETH"],
    ],
    products: [
      {
        id: "hub",
        name: "Watering Hub",
        summary: "ESP32-C3 controller, 4 pump channels, small OLED",
        image: "/innovations/smart-plant-watering-hub.png",
        specs: [
          ["Controller", "ESP32-C3"],
          ["Power", "5 V USB-C"],
          ["Radio", "Wi-Fi + 802.15.4 mesh"],
          ["Outputs", "4 pumps, 500 mA each"],
          ["Display", "0.96 in OLED"],
          ["Size", "86 × 86 × 42 mm"],
        ],
        parts: [
          ["ESP32-C3-MINI-1 module", 1, "Controller, Wi-Fi"],
          ["SSD1306 0.96 in OLED", 1, "Display"],
          ["AO3400A N-MOSFET", 4, "Pump switches"],
          ["1N5819 Schottky diode", 4, "Flyback"],
          ["5 V mini submersible pump", 4, "Watering"],
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["AMS1117-3.3 regulator", 1, "3.3 V rail"],
          ["JST-PH 2-pin connector", 4, "Pump leads"],
          ["10 kΩ resistor, 0603", 6, "Pull-ups"],
          ["100 nF capacitor, 0603", 8, "Decoupling"],
          ["22 µF capacitor, 0805", 2, "Bulk"],
          ["6 mm tactile switch", 2, "Menu, reset"],
          ["WS2812B LED", 1, "Status"],
          ["Silicone tubing, 4 mm, 1 m", 4, "Water lines"],
          ["4-way manifold", 1, "Water lines"],
          ["5 L tank with lid", 1, "Reservoir"],
          ["M3 × 8 screw", 6, "Enclosure"],
          ["Enclosure, 3D printed", 1, "PETG"],
        ],
      },
      {
        id: "probe",
        name: "Soil Probe",
        summary: "Capacitive moisture probe on a low-power mesh, one per pot",
        image: "/innovations/soil-moisture-mesh-network.png",
        specs: [
          ["Controller", "nRF52840"],
          ["Power", "18650 cell or 5 V"],
          ["Sensor", "Capacitive, 0–100 %"],
          ["Radio", "802.15.4 mesh"],
          ["Battery life", "About 6 weeks"],
          ["Size", "48 × 48 × 30 mm"],
        ],
        parts: [
          ["nRF52840 module", 1, "Mesh radio"],
          ["Capacitive sensing pad (on PCB)", 1, "Moisture"],
          ["TLV9001 op-amp", 1, "Sensor front end"],
          ["18650 holder", 1, "Battery"],
          ["TP4056 charger", 1, "Charging"],
          ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
          ["100 nF capacitor, 0603", 4, "Decoupling"],
          ["10 kΩ resistor, 0603", 3, "Divider"],
          ["Enclosure, 3D printed", 1, "Coated stake"],
        ],
      },
    ],
    comments: [
      {
        by: "c2",
        ago: 300,
        likes: 21,
        body: "Which probe firmware handles the mesh retries? Mine drops packets when the balcony door is closed. Did you raise the radio power or add a repeater?",
        replies: [
          {
            by: "c4",
            ago: 240,
            likes: 9,
            edited: 230,
            body: "I raised TX power to +4 dBm and added a retry with backoff in mesh.c. Any hub on USB power also relays for the probes near it, so a second hub by the door fixes it too.",
            replies: [{ by: "c3", ago: 120, likes: 3, body: "Same here. +4 dBm was enough through one wall. Thanks for writing it up." }],
          },
          { by: "c8", ago: 180, likes: 1, body: "Is relay mode on by default, or do I flash a different build for the hub?" },
          { by: "c6", ago: 90, likes: 2, body: "How is battery life on the probes with the higher TX power? Still around six weeks?" },
          { by: "c1", ago: 60, likes: 0, body: "Following this. Same problem here behind a brick wall." },
        ],
      },
      {
        by: "c5",
        ago: 1440,
        likes: 14,
        image: "/innovations/greenhouse-climate-node.jpg",
        body: "Built one this weekend for my greenhouse with a 3 L tank. The OLED is great, but the pump is louder than I expected at night, so I moved it into a cupboard and ran the tubing through the door frame. Would a quieter peristaltic pump work on the same driver, or does it need a bigger MOSFET? Also, the lid clips were a little tight on my printer and I had to scale them to 101%.",
        replies: [
          {
            by: "c4",
            ago: 1380,
            likes: 6,
            body: "Great build! A 12 V peristaltic pump needs its own supply, and the AO3400A on the board can switch it. I will add it as an option in the parts list.",
          },
          { by: "c7", ago: 1200, likes: 4, body: "The Kamoer NKP pumps are quiet. I use one on a similar setup." },
          { by: "c5", ago: 1100, likes: 1, body: "Thanks both, ordering one." },
        ],
      },
      { by: "c7", ago: 40, likes: 2, body: "Could the probes report soil temperature too? It would help with seedlings in spring." },
      { by: "k1", ago: 2000, likes: 0, hidden: 1980, body: "Cheap pumps here!!! Check the link in my profile, 70% off today only." },
      {
        by: "c1",
        ago: 2880,
        likes: 5,
        body: "Love that it waters by moisture and not on a timer. How do you calibrate dry and wet for different soils?",
      },
    ],
  },

  "heart-rate-fitness-band": {
    stage: "testing",
    story:
      "I run three times a week and wanted my heart rate without a subscription or an app that sells my data. The band reads an optical sensor at the wrist and stores everything on the band itself. You pull your runs off over Bluetooth as a plain CSV. It is not a medical device, but it tracks my chest strap within a few beats per minute on steady runs.",
    description:
      "A slim wrist band with an optical heart-rate sensor, a step counter and a small OLED. A MAX30101 reads pulse at the wrist, and an nRF52832 logs a week of data to flash. It broadcasts as a standard Bluetooth heart-rate sensor, so most sport apps and bike computers can read it live. One charge lasts about five days.",
    network: "Bluetooth LE",
    license: "Personal use",
    products: [
      {
        id: "band",
        name: "Fitness Band",
        summary: "Optical heart-rate band that keeps your runs on the band",
        specs: [
          ["Controller", "nRF52832"],
          ["Sensors", "Optical heart rate, accelerometer"],
          ["Display", "0.49 in OLED"],
          ["Radio", "Bluetooth LE, heart-rate profile"],
          ["Battery", "120 mAh, about 5 days"],
          ["Water", "Splash resistant"],
        ],
        parts: [
          ["nRF52832 module", 1, "Controller, Bluetooth"],
          ["MAX30101 pulse sensor", 1, "Heart rate"],
          ["LIS2DH12 accelerometer", 1, "Steps"],
          ["0.49 in OLED, 64 × 32", 1, "Display"],
          ["W25Q32 flash, 4 MB", 1, "Data log"],
          ["120 mAh LiPo cell", 1, "Battery"],
          ["BQ25101 charger", 1, "Charging"],
          ["TPS7A02 regulator, 3.3 V", 1, "3.3 V rail"],
          ["Magnetic pogo connector, 2-pin", 1, "Charging"],
          ["Capacitive touch pad (on PCB)", 1, "Button"],
          ["100 nF capacitor, 0402", 8, "Decoupling"],
          ["Band, 3D printed TPU", 1, "Strap"],
        ],
      },
    ],
    comments: [
      {
        by: "c4",
        ago: 400,
        likes: 7,
        body: "How does the optical reading hold up on interval sprints? Mine lags on fast changes.",
        replies: [
          {
            by: "c5",
            ago: 380,
            likes: 5,
            body: "It lags a few seconds on sprints, like most wrist sensors. Wearing it a finger width higher up the arm helped a lot.",
          },
        ],
      },
      { by: "k5", ago: 3000, likes: 2, body: "Thank you for keeping the data on the band. The CSV export is exactly what I wanted." },
    ],
  },

  "bench-power-supply-0-30v": {
    stage: "ready-for-manufacture",
    story:
      "My first bench supply was a modified computer PSU and it scared me every time I switched it on. This one is linear after a switching pre-regulator, so it stays quiet and still runs cool. It does 0 to 30 V at up to 3 A with a real current limit that has saved a lot of my prototypes. Two encoders set voltage and current, and the display shows both at once.",
    description:
      "A 0–30 V, 0–3 A lab supply with constant voltage and constant current modes. A switching pre-regulator keeps the linear pass stage only a couple of volts above the output, so the heatsink stays small. An STM32G0 sets the limits through a 16-bit DAC and reads them back with an INA228. Output ripple is under 2 mV.",
    products: [
      {
        id: "supply",
        name: "Bench Supply",
        summary: "0–30 V, 0–3 A linear supply with a switching pre-regulator",
        specs: [
          ["Output", "0–30 V, 0–3 A"],
          ["Modes", "Constant voltage, constant current"],
          ["Ripple", "Under 2 mV"],
          ["Controller", "STM32G0"],
          ["Display", "2.0 in IPS"],
          ["Input", "36 V DC adapter"],
        ],
        parts: [
          ["STM32G0B1 microcontroller", 1, "Control"],
          ["LM5116 buck controller", 1, "Pre-regulator"],
          ["TIP142 Darlington", 1, "Linear pass"],
          ["OPA2192 op-amp", 1, "Voltage and current loops"],
          ["DAC8552 16-bit DAC", 1, "Set points"],
          ["INA228 power monitor", 1, "Readback"],
          ["Shunt resistor, 10 mΩ", 1, "Current sense"],
          ["ST7789 2.0 in IPS display", 1, "Display"],
          ["EC11 rotary encoder", 2, "Voltage, current"],
          ["Binding post", 3, "Output"],
          ["Heatsink, 80 mm", 1, "Pass stage"],
          ["40 mm fan", 1, "Cooling"],
          ["36 V 4 A adapter", 1, "Power in"],
          ["Enclosure, sheet aluminium", 1, "Case"],
        ],
      },
    ],
  },

  "eurorack-noise-module": {
    stage: "prototype",
    story:
      "I wanted a noise source with more colour than the usual white and pink. This module gives white, pink, red and a crackly stepped noise from a shift register, all analog. It takes 4 HP and costs very little to build. Patch the red noise into a filter for wind and surf sounds, that is my favourite.",
    description:
      "A 4 HP Eurorack module with four noise outputs: white, pink, red and a stepped crackle. The white noise comes from a reverse-biased transistor junction, and passive filters shape it into pink and red. A CD4015 shift register clocked by the noise makes the crackle. It draws 18 mA from the +12 V rail.",
    license: "Commercial use",
    listing: [[VIRTUAL, "0.005 ETH"]],
    products: [
      {
        id: "module",
        name: "Noise Module",
        summary: "4 HP analog module with four noise colours",
        pieces: NO_CODE,
        specs: [
          ["Width", "4 HP"],
          ["Outputs", "White, pink, red, crackle"],
          ["Level", "10 V peak to peak"],
          ["Power", "+12 V 18 mA, −12 V 12 mA"],
          ["Depth", "30 mm"],
          ["Type", "Analog"],
        ],
        parts: [
          ["2N3904 transistor", 2, "Noise source"],
          ["TL074 op-amp", 2, "Gain, filters"],
          ["CD4015 shift register", 1, "Crackle"],
          ["Thonkiconn 3.5 mm jack", 4, "Outputs"],
          ["10-pin Eurorack header", 1, "Power"],
          ["1N5819 Schottky diode", 2, "Reverse protection"],
          ["10 µF capacitor, 25 V", 4, "Rail filtering"],
          ["100 nF capacitor, 0805", 8, "Decoupling"],
          ["Resistor, 0805, assorted", 22, "Gain, filters"],
          ["Front panel, PCB", 1, "Panel"],
        ],
      },
    ],
  },

  "self-balancing-two-wheeler": {
    stage: "testing",
    story:
      "This started as a weekend project to finally understand PID control and turned into a little robot that follows me around the flat. It balances on two wheels using an IMU and two stepper motors. I tuned it until it could carry a cup of tea without spilling. If you are learning control loops, the code keeps the balancing loop and the speed loop clearly apart.",
    description:
      "A two-wheeled balancing robot with stepper motors for smooth control at low speed. A BMI270 IMU feeds a 200 Hz balancing loop on an ESP32, and a slower outer loop handles speed and steering. You drive it from a phone over Bluetooth, and it holds its spot when left alone. A 3S pack gives about an hour of driving.",
    network: "Bluetooth LE",
    products: [
      {
        id: "robot",
        name: "Balancing Robot",
        summary: "Stepper-driven two-wheeler with a phone remote",
        specs: [
          ["Controller", "ESP32"],
          ["Motors", "2 × NEMA 17 steppers"],
          ["Drivers", "TMC2209"],
          ["Sensor", "BMI270 IMU"],
          ["Power", "3S Li-ion, 11.1 V"],
          ["Run time", "About 1 h"],
        ],
        parts: [
          ["ESP32-WROOM-32E module", 1, "Controller, Bluetooth"],
          ["BMI270 IMU", 1, "Tilt"],
          ["TMC2209 stepper driver", 2, "Motors"],
          ["NEMA 17 stepper, 40 mm", 2, "Wheels"],
          ["90 mm wheel", 2, "Wheels"],
          ["3S 2600 mAh Li-ion pack", 1, "Battery"],
          ["MP1584 buck converter", 1, "5 V rail"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["100 µF capacitor, 35 V", 2, "Driver bulk"],
          ["XT30 connector", 1, "Battery lead"],
          ["Frame plates, 3D printed", 3, "PETG"],
          ["M3 threaded rod", 2, "Frame"],
        ],
      },
    ],
    comments: [
      {
        by: "c1",
        ago: 700,
        likes: 6,
        body: "Steppers instead of DC motors is a nice choice for low speed. Did you need microstepping to stop the jitter?",
        replies: [
          {
            by: "c8",
            ago: 650,
            likes: 4,
            body: "Yes, 1/16 microstepping on the TMC2209. At full steps it buzzed and wobbled when standing still.",
          },
        ],
      },
      { by: "k2", ago: 100, likes: 1, body: "The tea test is the best benchmark I have seen." },
    ],
  },

  "door-window-contact-sensor": {
    stage: "pilot-run",
    story:
      "Someone tried our back window last winter, so I put a sensor on every door and window in the house. Each one is a tiny Zigbee board with a reed switch that lasts years on a coin cell. They work with Home Assistant through the USB bridge, or with any Zigbee hub you already own. I printed the cases in white so they disappear on the frames.",
    description:
      "Small Zigbee contact sensors that report open and closed in under a second. A reed switch and magnet do the sensing, and the board sleeps between events, so a CR2032 lasts two to three years. The USB bridge plugs into a home server and works with Zigbee2MQTT. Each sensor also reports its battery level and raises a tamper alarm if the case is opened.",
    network: "Zigbee · 12 sensors, 1 bridge",
    products: [
      {
        id: "sensor",
        name: "Contact Sensor",
        summary: "Zigbee reed sensor with a tamper switch, coin cell powered",
        specs: [
          ["Controller", "EFR32MG21"],
          ["Radio", "Zigbee 3.0"],
          ["Sensing", "Reed switch, tamper switch"],
          ["Battery", "CR2032, 2 to 3 years"],
          ["Size", "42 × 22 × 11 mm"],
        ],
        parts: [
          ["MGM210P module (EFR32MG21)", 1, "Controller, Zigbee"],
          ["Reed switch, normally open", 1, "Contact sensing"],
          ["Neodymium magnet, 10 × 5 mm", 1, "Magnet half"],
          ["Tamper switch", 1, "Case opened"],
          ["CR2032 holder", 1, "Battery"],
          ["100 nF capacitor, 0402", 4, "Decoupling"],
          ["10 µF capacitor, 0603", 1, "Bulk"],
          ["1 MΩ resistor, 0402", 2, "Reed pull-up"],
          ["Case and magnet block, 3D printed", 2, "PLA"],
        ],
      },
      {
        id: "bridge",
        name: "USB Bridge",
        summary: "Zigbee coordinator stick for Home Assistant",
        specs: [
          ["Radio", "Zigbee 3.0 coordinator"],
          ["Interface", "USB-A"],
          ["Range", "About 30 m indoors"],
          ["Antenna", "External, 2 dBi"],
          ["Size", "70 × 25 × 12 mm"],
        ],
        parts: [
          ["MGM210P module (EFR32MG21)", 1, "Coordinator radio"],
          ["CP2102N USB-UART", 1, "USB link"],
          ["USB-A plug", 1, "Connector"],
          ["U.FL connector", 1, "Antenna"],
          ["2 dBi dipole antenna", 1, "Antenna"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["100 nF capacitor, 0402", 6, "Decoupling"],
          ["Shell, 3D printed", 1, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c3",
        ago: 900,
        likes: 8,
        body: "Do these pair with a Hue bridge, or only with Zigbee2MQTT?",
        replies: [
          {
            by: "c1",
            ago: 860,
            likes: 5,
            body: "They use the standard IAS Zone cluster, so most Zigbee hubs see them as contact sensors. I have only tested Zigbee2MQTT and ZHA myself.",
          },
          { by: "k4", ago: 600, likes: 2, body: "Works with my SmartThings hub too." },
        ],
      },
      {
        by: "k6",
        ago: 4300,
        likes: 3,
        body: "Two to three years on a CR2032 sounds optimistic. How did you measure it?",
        replies: [
          {
            by: "c1",
            ago: 4200,
            likes: 2,
            body: "I measured 1.8 µA asleep and about 40 events a day with a power profiler, and worked it out from that. Real life may vary.",
          },
        ],
      },
    ],
  },

  "ar-caption-glasses": {
    stage: "prototype",
    story:
      "My grandmother lost most of her hearing and stopped joining family dinners. These glasses show live captions of what people say on a small display at the edge of the lens. Speech recognition runs on the phone, so the clip stays light and only has to draw the text. She follows conversations again. The clip fits most frames, so you can add it to glasses you already wear.",
    description:
      "A clip-on display that puts live captions in the corner of your glasses. Two MEMS microphones pick up speech, the phone turns it into text, and the text comes back over Bluetooth to a 0.39 in micro OLED behind a small prism. The clip weighs 28 g and runs about four hours per charge. Text size and position are set from the phone.",
    network: "Bluetooth LE",
    license: "Personal use",
    products: [
      {
        id: "clip",
        name: "Caption Clip",
        summary: "Micro OLED clip that shows live captions on your glasses",
        specs: [
          ["Controller", "nRF5340"],
          ["Display", "0.39 in micro OLED"],
          ["Microphones", "2 × INMP441"],
          ["Radio", "Bluetooth LE Audio"],
          ["Battery", "150 mAh, about 4 h"],
          ["Weight", "28 g"],
        ],
        parts: [
          ["nRF5340 module", 1, "Controller, Bluetooth"],
          ["0.39 in micro OLED module", 1, "Display"],
          ["INMP441 MEMS microphone", 2, "Speech pickup"],
          ["Glass prism, 10 mm", 1, "Image to eye"],
          ["150 mAh LiPo cell", 1, "Battery"],
          ["BQ25101 charger", 1, "Charging"],
          ["TPS7A02 regulator, 3.3 V", 1, "3.3 V rail"],
          ["USB-C receptacle, 16-pin", 1, "Charging"],
          ["100 nF capacitor, 0402", 8, "Decoupling"],
          ["Clip housing, 3D printed resin", 1, "Body"],
          ["Spring clip, stainless", 1, "Frame mount"],
        ],
      },
    ],
  },

  "usb-c-power-meter": {
    stage: "manufacturing",
    story:
      "I kept buying cables that claimed 100 W and then charged my laptop at 15 W. This meter sits between the charger and the device and shows voltage, current, the agreed PD profile and the cable's e-marker. It is the tool I reach for most on my bench. You can also log a charging session over Bluetooth and see where your phone slows down.",
    description:
      "An inline USB-C meter that reads up to 48 V and 5 A with 0.1 % accuracy. An INA228 measures voltage and current, and an STM32G0 decodes the USB PD messages on the CC lines, so you can see exactly what the charger and device agreed. A 1.14 in IPS screen shows live values and graphs. Logs can be pulled to a phone over Bluetooth LE.",
    network: "Bluetooth LE",
    license: "Commercial use",
    listing: [
      [MAIN, "0.60 ETH"],
      [physical(38, 100), "0.02 ETH"],
    ],
    products: [
      {
        id: "meter",
        name: "Power Meter",
        summary: "Inline USB-C meter with PD decoding and logging",
        specs: [
          ["Range", "0–48 V, 0–5 A"],
          ["Accuracy", "0.1 %"],
          ["Controller", "STM32G071"],
          ["Display", "1.14 in IPS"],
          ["Radio", "Bluetooth LE logging"],
          ["Size", "52 × 24 × 12 mm"],
        ],
        parts: [
          ["STM32G071 microcontroller", 1, "PD decoding, display"],
          ["nRF52805 module", 1, "Bluetooth logging"],
          ["INA228 power monitor", 1, "Voltage, current"],
          ["Shunt resistor, 5 mΩ", 1, "Current sense"],
          ["ST7789 1.14 in IPS display", 1, "Display"],
          ["USB-C plug, 24-pin", 1, "Input"],
          ["USB-C receptacle, 24-pin", 1, "Output"],
          ["LMR36006 buck converter", 1, "Logic supply from VBUS"],
          ["6 mm tactile switch", 1, "Page button"],
          ["100 nF capacitor, 0402", 8, "Decoupling"],
          ["Case, 3D printed", 2, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c4",
        ago: 1100,
        likes: 10,
        body: "This found two fake 100 W cables in my drawer within five minutes.",
        replies: [{ by: "c3", ago: 1050, likes: 4, body: "That is exactly why I made it. The e-marker page is the most useful one." }],
      },
      {
        by: "c7",
        ago: 2000,
        likes: 5,
        body: "Could it also request PD profiles, like a trigger board?",
        replies: [
          {
            by: "c3",
            ago: 1900,
            likes: 3,
            body: "Not yet. The STM32G071 can do it, so a trigger mode is on my list for the next firmware.",
          },
          { by: "c7", ago: 1850, likes: 1, body: "Looking forward to it." },
        ],
      },
      { by: "k3", ago: 15, likes: 0, body: "Any plans for a USB-A version?" },
    ],
  },

  "portable-contact-mic-mixer": {
    stage: "design",
    story:
      "I record the sounds of things, like rain on a tin roof or a bridge humming in the wind. Contact mics need high-impedance inputs, and carrying a big mixer to a bridge is no fun. This box will take four piezo mics, mix them and record straight to microSD. The parts are chosen and I am checking that the board and case fit together before ordering. Tell me if four inputs is enough for you.",
    description:
      "A four-channel mixer for piezo contact microphones with a built-in recorder. Each input has a JFET buffer with 1 MΩ impedance, so piezos keep their low end. Levels and pan are set with knobs, and the mix goes to headphones and to a PCM1808 ADC, from which an RP2040 writes 24-bit WAV files to microSD. Two AA cells should last a whole afternoon.",
    products: [
      {
        id: "mixer",
        name: "Contact Mic Mixer",
        summary: "Four piezo inputs mixed and recorded to microSD",
        specs: [
          ["Inputs", "4 × piezo, 1 MΩ"],
          ["Recording", "24-bit WAV to microSD"],
          ["Controller", "RP2040"],
          ["Outputs", "Headphones, line out"],
          ["Power", "2 × AA, about 5 h"],
          ["Size", "120 × 80 × 30 mm"],
        ],
        parts: [
          ["MMBFJ201 JFET", 4, "Input buffers"],
          ["TL074 op-amp", 2, "Gain, mix"],
          ["PCM1808 ADC", 1, "Recorder input"],
          ["RP2040 microcontroller", 1, "Recorder"],
          ["W25Q16 flash, 2 MB", 1, "Firmware"],
          ["microSD socket", 1, "Recordings"],
          ["TPA6132A2 headphone amplifier", 1, "Headphones"],
          ["9 mm potentiometer, 50 kΩ", 8, "Levels, pan"],
          ["3.5 mm audio jack", 6, "Inputs, outputs"],
          ["TPS61023 boost converter", 1, "3.3 V rail"],
          ["LM2664 charge pump", 1, "Negative rail"],
          ["2 × AA battery holder", 1, "Battery"],
          ["Enclosure, 3D printed", 1, "PETG"],
        ],
      },
    ],
  },

  "swarm-beacon-drone": {
    stage: "design",
    story:
      "I want to see how far simple rules can take a group of small drones. The plan is for each drone to range to ground beacons and to its neighbours over UWB, so the swarm knows where everyone is indoors without GPS. The ranging works on my bench, and the frame and flight controller are next. The goal is five drones flying a slow figure eight in our sports hall.",
    description:
      "A 90 mm indoor drone built for swarm experiments. Ultra-wideband ranging to four ground beacons gives each drone its position to about 10 cm, and the drones share positions with each other over the same radio. An STM32F405 runs the flight controller and the swarm rules. Each drone should fly about seven minutes on a 1S 450 mAh pack.",
    network: "UWB · 5 drones, 4 beacons",
    products: [
      {
        id: "drone",
        name: "Beacon Drone",
        summary: "90 mm indoor drone with UWB positioning",
        specs: [
          ["Controller", "STM32F405"],
          ["Positioning", "UWB, about 10 cm"],
          ["Frame", "90 mm, brushless"],
          ["Battery", "1S 450 mAh"],
          ["Flight time", "About 7 min"],
          ["Weight", "48 g"],
        ],
        parts: [
          ["STM32F405 microcontroller", 1, "Flight control"],
          ["DWM3000 UWB module", 1, "Positioning, swarm radio"],
          ["BMI270 IMU", 1, "Attitude"],
          ["BMP390 barometer", 1, "Altitude"],
          ["4-in-1 ESC, 12 A", 1, "Motors"],
          ["1102 brushless motor, 10000 KV", 4, "Thrust"],
          ["40 mm propeller", 4, "Thrust"],
          ["1S 450 mAh LiPo", 1, "Battery"],
          ["TPS63001 buck-boost converter", 1, "3.3 V rail"],
          ["Frame, 3D printed", 1, "Carbon-filled nylon"],
          ["100 nF capacitor, 0402", 10, "Decoupling"],
        ],
      },
      {
        id: "beacon",
        name: "Ground Beacon",
        summary: "UWB anchor on a tripod mount, USB-C powered",
        specs: [
          ["Controller", "nRF52833"],
          ["Radio", "UWB anchor"],
          ["Power", "5 V USB-C"],
          ["Mount", "1/4 in tripod thread"],
          ["Size", "60 × 60 × 20 mm"],
        ],
        parts: [
          ["DWM3000 UWB module", 1, "Anchor"],
          ["nRF52833 module", 1, "Controller"],
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["1/4 in threaded insert", 1, "Tripod mount"],
          ["100 nF capacitor, 0402", 6, "Decoupling"],
          ["Case, 3D printed", 1, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c6",
        ago: 1300,
        likes: 4,
        body: "How will you keep UWB ranging stable with all the motor noise?",
        replies: [
          {
            by: "c5",
            ago: 1250,
            likes: 3,
            body: "A separate LDO for the DWM3000 and a ground plane cut between the ESC and the radio. Bench results look clean so far, flight is the real test.",
          },
        ],
      },
    ],
  },

  "lora-weather-station": {
    stage: "ready-for-manufacture",
    story:
      "Our farm is in a valley and the forecast for the nearest town is always wrong for us. The station on the hill measures wind, rain, temperature and pressure, and sends it 2 km down to the house over LoRa. It has run on a small solar panel since last spring without a visit. The indoor display shows the last 24 hours, which is all my father checks before cutting hay.",
    description:
      "A solar weather station with an anemometer, wind vane, tipping rain gauge and a BME280. An STM32WL with built-in LoRa sends readings every five minutes and reaches about 2 km over open fields. A 2 W panel and an 18650 keep it going through winter. The indoor display receives the same packets and shows the last day of readings on an e-ink screen.",
    network: "LoRa · 2 km",
    license: "Commercial use",
    listing: [[VIRTUAL, "0.02 ETH"]],
    products: [
      {
        id: "station",
        name: "Weather Station",
        summary: "Solar LoRa station with wind, rain and pressure sensors",
        specs: [
          ["Controller", "STM32WLE5"],
          ["Radio", "LoRa, 868 MHz"],
          ["Sensors", "Wind, rain, temperature, humidity, pressure"],
          ["Power", "2 W solar + 18650"],
          ["Range", "About 2 km"],
          ["Interval", "5 min"],
        ],
        parts: [
          ["LoRa-E5 module (STM32WLE5)", 1, "Controller, LoRa"],
          ["BME280 sensor", 1, "Temperature, humidity, pressure"],
          ["Cup anemometer", 1, "Wind speed"],
          ["Wind vane", 1, "Wind direction"],
          ["Tipping bucket rain gauge", 1, "Rain"],
          ["CN3791 solar charger", 1, "Solar charging"],
          ["18650 cell, 3000 mAh", 1, "Battery"],
          ["2 W 6 V solar panel", 1, "Power"],
          ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
          ["SMA connector", 1, "Antenna"],
          ["868 MHz antenna, 3 dBi", 1, "Antenna"],
          ["Radiation shield plates, 3D printed", 6, "ASA"],
          ["Stainless hose clamp", 2, "Pole mount"],
        ],
      },
      {
        id: "display",
        name: "Indoor Display",
        summary: "E-ink receiver showing the last 24 hours",
        specs: [
          ["Controller", "STM32WLE5"],
          ["Display", "4.2 in e-ink"],
          ["Radio", "LoRa receiver"],
          ["Power", "5 V USB-C or 3 × AAA"],
          ["Size", "105 × 90 × 18 mm"],
        ],
        parts: [
          ["LoRa-E5 module (STM32WLE5)", 1, "Receiver"],
          ["4.2 in e-ink display, 400 × 300", 1, "Display"],
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
          ["3 × AAA battery holder", 1, "Backup power"],
          ["SMA connector", 1, "Antenna"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
          ["Frame, 3D printed", 1, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c2",
        ago: 260,
        likes: 9,
        body: "2 km in a valley over LoRa is good. Which spreading factor do you run?",
        replies: [
          { by: "c6", ago: 220, likes: 6, body: "SF9 at 125 kHz. SF7 dropped packets when the hay was tall, SF9 has been solid." },
        ],
      },
      {
        by: "c8",
        ago: 3600,
        likes: 6,
        body: "How does the 18650 cope with frost?",
        replies: [
          {
            by: "c6",
            ago: 3500,
            likes: 4,
            body: "The charger stops below 0 °C and the cell just discharges slowly. It has not dropped out yet, and the coldest night was minus 9 °C.",
          },
        ],
      },
      {
        by: "k5",
        ago: 800,
        likes: 2,
        body: "Did you print the radiation shield in ASA or PETG?",
        replies: [{ by: "c6", ago: 760, likes: 1, body: "ASA. PETG went soft and yellow after one summer." }],
      },
    ],
  },

  "posture-tracking-pendant": {
    stage: "planning",
    story:
      "I work at a desk all day and my back lets me know about it. The idea is a small pendant that notices when I slump forward for more than a few minutes and gives one short buzz. Nothing more than that. I have a parts list and a first sketch of the case, and I would love to hear where you think it should hang to read posture best.",
    description:
      "A small pendant that tracks how you sit and gently buzzes when you slouch for too long. A BMI270 measures the tilt of your chest, and the nRF52832 learns your upright angle when you press the button once. It logs posture time per hour, which you can view in a phone app over Bluetooth. A charge should last about two weeks.",
    network: "Bluetooth LE",
    products: [
      {
        id: "pendant",
        name: "Posture Pendant",
        summary: "Tilt-sensing pendant that buzzes when you slouch",
        specs: [
          ["Controller", "nRF52832"],
          ["Sensor", "BMI270 IMU"],
          ["Feedback", "Vibration motor"],
          ["Radio", "Bluetooth LE"],
          ["Battery", "80 mAh, about 2 weeks"],
          ["Size", "30 × 30 × 9 mm"],
        ],
        parts: [
          ["nRF52832 module", 1, "Controller, Bluetooth"],
          ["BMI270 IMU", 1, "Tilt"],
          ["Coin vibration motor", 1, "Reminder"],
          ["AO3400A N-MOSFET", 1, "Motor switch"],
          ["80 mAh LiPo cell", 1, "Battery"],
          ["BQ25101 charger", 1, "Charging"],
          ["TPS7A02 regulator, 3.3 V", 1, "3.3 V rail"],
          ["Magnetic pogo connector, 2-pin", 1, "Charging"],
          ["3 mm side switch", 1, "Calibrate"],
          ["100 nF capacitor, 0402", 6, "Decoupling"],
          ["Pendant shell, 3D printed resin", 2, "Body"],
        ],
      },
    ],
  },

  "18650-battery-balancer": {
    stage: "testing",
    story:
      "I build e-bike packs from reclaimed laptop cells, and cheap balancers only bleed off a few milliamps. This board moves charge from the fullest cell to the emptiest, so a mismatched pack evens out in hours instead of days. It covers 4 to 8 cells in series. Please use it with a proper BMS. It balances, but it does not protect.",
    description:
      "An active balancer for 4S to 8S packs of 18650 cells. Switched capacitors shuttle up to 2 A from high cells to low ones, and a BQ76952 measures each cell to 1 mV. An STM32G0 picks which pair to balance and shows cell voltages on a small OLED. It sleeps at 50 µA when the pack is idle and balanced.",
    license: "Commercial use",
    products: [
      {
        id: "balancer",
        name: "Active Balancer",
        summary: "4S to 8S switched-capacitor balancer with cell readout",
        specs: [
          ["Cells", "4S to 8S Li-ion"],
          ["Balance current", "Up to 2 A"],
          ["Method", "Switched capacitor"],
          ["Monitor", "BQ76952, 1 mV"],
          ["Controller", "STM32G0"],
          ["Idle draw", "50 µA"],
        ],
        parts: [
          ["BQ76952 battery monitor", 1, "Cell voltages"],
          ["STM32G031 microcontroller", 1, "Balancing logic"],
          ["AO3400A N-MOSFET", 16, "Cell switches"],
          ["AO3401A P-MOSFET", 16, "Cell switches"],
          ["Polymer capacitor, 470 µF 16 V", 2, "Charge shuttle"],
          ["Shunt resistor, 1 mΩ", 1, "Pack current"],
          ["SSD1306 0.96 in OLED", 1, "Display"],
          ["LMR36006 buck converter", 1, "Logic supply"],
          ["JST-XH 9-pin connector", 1, "Balance leads"],
          ["10 kΩ NTC thermistor", 2, "Cell temperature"],
          ["100 nF capacitor, 0603", 12, "Decoupling"],
          ["Enclosure, 3D printed", 1, "PETG"],
        ],
      },
    ],
  },

  "tube-preamp-clone": {
    stage: "testing",
    story:
      "My uncle had an old studio tube preamp and I wanted that warmth for my home recordings without paying vintage prices. This clone uses two 12AX7 stages and a proper output transformer, and it sounds closer to the real thing than I expected. The plate supply is 250 V, so build it with care and keep the bleeder resistor. It is the most satisfying thing I have soldered.",
    description:
      "A single-channel mic and instrument preamp with two 12AX7 gain stages and a transformer-balanced output. A small boost supply makes the 250 V plate voltage from a 12 V adapter, and the heaters run on filtered DC to keep hum down. Gain goes up to 60 dB, with a pad, phantom power and a high-pass switch.",
    license: "Personal use",
    products: [
      {
        id: "preamp",
        name: "Tube Preamp",
        summary: "Two-stage 12AX7 mic and instrument preamp",
        pieces: NO_CODE,
        specs: [
          ["Channels", "1, mic and instrument"],
          ["Tubes", "2 × 12AX7"],
          ["Gain", "Up to 60 dB"],
          ["Plate voltage", "250 V"],
          ["Power", "12 V DC adapter"],
          ["Size", "Half-rack, 1U"],
        ],
        parts: [
          ["12AX7 tube", 2, "Gain stages"],
          ["Noval tube socket", 2, "Tubes"],
          ["Input transformer, 1:10", 1, "Mic input"],
          ["Output transformer, 10k:600", 1, "Balanced out"],
          ["MAX1771 boost controller", 1, "250 V supply"],
          ["IRF840 MOSFET", 1, "High-voltage switch"],
          ["Electrolytic capacitor, 47 µF 400 V", 3, "High-voltage filtering"],
          ["Heater filter capacitor, 4700 µF", 1, "DC heaters"],
          ["XLR combo jack", 1, "Input"],
          ["XLR male connector", 1, "Output"],
          ["11-position rotary switch", 1, "Gain"],
          ["Toggle switch", 3, "Pad, phantom, high-pass"],
          ["Metal film resistor, 1 W, assorted", 18, "Plate, cathode"],
          ["Half-rack steel enclosure", 1, "Case"],
        ],
      },
    ],
    comments: [
      {
        by: "c7",
        ago: 1600,
        likes: 7,
        body: "How much hum do you get with the heaters on DC?",
        replies: [
          { by: "c1", ago: 1550, likes: 4, body: "Under −90 dB at mid gain. On AC heaters it was around −70 dB, so DC was worth it." },
        ],
      },
      { by: "k2", ago: 50, likes: 1, body: "Thanks for the note about the bleeder resistor. Easy to forget." },
    ],
  },

  "quadruped-pet-companion": {
    stage: "design",
    story:
      "Our flat does not allow pets, so I am building one that does not shed. It will walk, sit, tilt its head when you talk to it and go back to its dock to charge. The legs, the dock and the board are drawn, and I am checking that the servos and battery fit before printing. My niece has already named it Biscuit. Tricks will be small scripts, so kids can write new ones without touching the walking code.",
    description:
      "A small four-legged robot with 12 servos, a camera and a pair of microphones for turning towards voices. An ESP32-S3 handles the gait and simple behaviours, and it finds its dock by following an IR beacon. It should walk for about an hour, then charge on the dock through two spring contacts. Tricks are short scripts you edit over Wi-Fi.",
    network: "Wi-Fi",
    products: [
      {
        id: "pet",
        name: "Quadruped",
        summary: "12-servo walking pet with a camera, two mics and IR docking",
        specs: [
          ["Controller", "ESP32-S3"],
          ["Servos", "12 × MG92B"],
          ["Sensors", "Camera, 2 microphones, IMU"],
          ["Battery", "2S 1500 mAh"],
          ["Run time", "About 1 h"],
          ["Size", "240 × 120 × 160 mm"],
        ],
        parts: [
          ["ESP32-S3-WROOM-1 module", 1, "Controller, Wi-Fi"],
          ["OV2640 camera", 1, "Vision"],
          ["INMP441 MEMS microphone", 2, "Voice direction"],
          ["BMI270 IMU", 1, "Balance"],
          ["PCA9685 PWM driver", 1, "Servo signals"],
          ["MG92B servo", 12, "Legs, head"],
          ["TSOP38238 IR receiver", 2, "Dock finding"],
          ["MP1584 buck converter", 2, "Servo rail"],
          ["2S 1500 mAh LiPo", 1, "Battery"],
          ["Charge contact pad", 2, "Charging"],
          ["Body shells, 3D printed", 6, "PETG"],
          ["M2 × 6 screw", 48, "Assembly"],
        ],
      },
      {
        id: "dock",
        name: "Charging Dock",
        summary: "Spring-contact dock with an IR homing beacon",
        pieces: NO_CODE,
        specs: [
          ["Input", "12 V DC"],
          ["Output", "2S charge, 1 A"],
          ["Beacon", "IR, 38 kHz"],
          ["Size", "160 × 120 × 40 mm"],
        ],
        parts: [
          ["TP5100 2S charger", 1, "Charging"],
          ["NE555 timer", 1, "IR beacon carrier"],
          ["IR LED, 940 nm", 2, "Beacon"],
          ["Spring contact", 2, "Charge contacts"],
          ["DC barrel jack, 2.1 mm", 1, "Power in"],
          ["Base, 3D printed", 1, "PETG"],
          ["Rubber foot", 4, "Grip"],
        ],
      },
    ],
  },

  "desk-occupancy-tracker": {
    stage: "ready-for-manufacture",
    story:
      "Our office went hybrid and half the desks sat empty while people hunted for a free one. This sensor clips under a desk and uses a small radar to tell if someone is sitting there, without a camera. The room screen then shows free desks in green. We fitted 40 desks in a day, and nobody has had to change a battery yet.",
    description:
      "A presence sensor that clips under a desk and reports whether it is in use. A 60 GHz radar picks up movement as small as breathing, so a person reading quietly still counts as present, and no images are ever taken. Sensors send their status over a Bluetooth mesh to a gateway that feeds a floor map. Two AA cells last about 18 months with the radar duty-cycled.",
    network: "Bluetooth mesh · 40 desks",
    license: "Commercial use",
    products: [
      {
        id: "sensor",
        name: "Desk Sensor",
        summary: "Under-desk radar presence sensor on a Bluetooth mesh",
        specs: [
          ["Controller", "nRF52840"],
          ["Sensor", "60 GHz radar"],
          ["Radio", "Bluetooth mesh"],
          ["Power", "2 × AA, about 18 months"],
          ["Privacy", "No camera, no audio"],
          ["Size", "70 × 45 × 20 mm"],
        ],
        parts: [
          ["nRF52840 module (MDBT50Q)", 1, "Controller, mesh"],
          ["BGT60TR13C radar module", 1, "Presence"],
          ["TPS63031 buck-boost converter", 1, "3.3 V from AA"],
          ["2 × AA battery holder", 1, "Battery"],
          ["AO3400A N-MOSFET", 1, "Radar power switch"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
          ["10 µF capacitor, 0805", 2, "Bulk"],
          ["Clip housing, 3D printed", 1, "PETG"],
          ["Double-sided foam tape", 1, "Mount"],
        ],
      },
    ],
    comments: [
      {
        by: "c6",
        ago: 480,
        likes: 8,
        body: "Can the radar tell two people apart at a shared desk?",
        replies: [
          { by: "c3", ago: 440, likes: 5, body: "No, it only says present or not. For one desk that is all the booking screen needs." },
        ],
      },
      {
        by: "c2",
        ago: 2500,
        likes: 3,
        body: "How did the facilities team feel about the no-camera approach?",
        replies: [{ by: "c3", ago: 2400, likes: 3, body: "It was the reason they agreed. Nobody wanted cameras under desks." }],
      },
    ],
  },

  "sleep-stage-ring": {
    stage: "prototype",
    story:
      "I wanted to understand why I wake up tired, but I did not want to wear a watch to bed. The ring measures pulse, skin temperature and movement through the night and estimates light, deep and REM sleep. It is not as polished as the commercial ones, but I can read every number it takes. The ring size is one parameter in the model, so you can print one that fits.",
    description:
      "A sleep tracker in a ring, with an optical pulse sensor, skin temperature and an accelerometer. An nRF52832 logs a night of data and estimates sleep stages from heart-rate variability and movement. In the morning it syncs to your phone over Bluetooth LE. A 22 mAh cell lasts about three nights, and the cradle charges it through two gold contacts.",
    network: "Bluetooth LE",
    license: "Personal use",
    listing: [
      [MAIN, "0.35 ETH"],
      [VIRTUAL, "0.012 ETH"],
    ],
    products: [
      {
        id: "ring",
        name: "Sleep Ring",
        summary: "Pulse, temperature and motion ring for sleep stages",
        specs: [
          ["Controller", "nRF52832"],
          ["Sensors", "Pulse, skin temperature, accelerometer"],
          ["Radio", "Bluetooth LE"],
          ["Battery", "22 mAh, about 3 nights"],
          ["Sizes", "US 6 to 13"],
          ["Weight", "5 g"],
        ],
        parts: [
          ["nRF52832, WLCSP", 1, "Controller, Bluetooth"],
          ["MAX86141 optical front end", 1, "Pulse"],
          ["Green and IR LED pair", 1, "Pulse light"],
          ["Photodiode", 2, "Pulse sensing"],
          ["TMP117 temperature sensor", 1, "Skin temperature"],
          ["LIS2DW12 accelerometer", 1, "Movement"],
          ["22 mAh curved LiPo cell", 1, "Battery"],
          ["BQ25120A charger", 1, "Charging, 1.8 V rail"],
          ["Flex PCB, 4-layer", 1, "Circuit"],
          ["Gold contact pad", 2, "Charging"],
          ["Ring shell, resin", 1, "Body"],
        ],
      },
      {
        id: "cradle",
        name: "Charging Cradle",
        summary: "USB-C cradle with two pogo contacts",
        pieces: NO_CODE,
        specs: [
          ["Input", "5 V USB-C"],
          ["Output", "5 V to the ring's charger"],
          ["Contacts", "2 × pogo pin"],
          ["Size", "40 × 40 × 18 mm"],
        ],
        parts: [
          ["USB-C receptacle, 16-pin", 1, "Power in"],
          ["Pogo pin connector, 2-pin", 1, "Ring contacts"],
          ["5.1 kΩ resistor, 0603", 2, "USB-C CC"],
          ["Green LED, 0603", 1, "Power light"],
          ["1 kΩ resistor, 0603", 1, "LED"],
          ["Cradle, 3D printed", 1, "PLA"],
        ],
      },
    ],
    comments: [
      {
        by: "c6",
        ago: 700,
        likes: 9,
        body: "How do you get sleep stages out of HRV? Is it a trained model?",
        replies: [
          {
            by: "c4",
            ago: 650,
            likes: 6,
            body: "A small decision tree trained on my own nights against a headband EEG. It is rough, so the app shows a confidence next to each stage.",
          },
        ],
      },
      {
        by: "c1",
        ago: 4000,
        likes: 3,
        body: "The resizable shell is clever. Does the battery fit in a US 6?",
        replies: [{ by: "c4", ago: 3900, likes: 2, body: "Just about. US 6 uses a 15 mAh cell instead, so expect two nights." }],
      },
    ],
  },

  "wireless-qi-charge-pad": {
    stage: "prototype",
    story:
      "I wanted a charger built into my desk, flush with the wood, and every pad I bought was too thick. This board is 6 mm thick and charges through 5 mm of oak. I routed a pocket from underneath and the phone just charges where it sits. The coil and board fit most desks, so measure your top and print the spacer to match.",
    description:
      "A thin Qi charging transmitter that mounts under a desk or shelf. It uses a Qi transmitter chip with foreign object detection, so a coin or key on the pad will not heat up. It delivers up to 15 W through as much as 5 mm of wood. A 12 V adapter powers it, and a small LED on the edge shows charging status.",
    products: [
      {
        id: "pad",
        name: "Under-desk Qi Pad",
        summary: "6 mm thin Qi transmitter that charges through wood",
        specs: [
          ["Standard", "Qi, up to 15 W"],
          ["Charges through", "Up to 5 mm wood"],
          ["Controller", "P9242-R"],
          ["Input", "12 V DC"],
          ["Safety", "Foreign object detection"],
          ["Size", "70 × 70 × 6 mm"],
        ],
        parts: [
          ["P9242-R Qi transmitter", 1, "Qi controller"],
          ["Qi coil, A11 type", 1, "Transmit coil"],
          ["CSD17575Q3 MOSFET", 4, "Full bridge"],
          ["C0G capacitor, 100 nF", 4, "Resonant tank"],
          ["TPS54331 buck converter", 1, "5 V rail"],
          ["DC barrel jack, 2.1 mm", 1, "Power in"],
          ["Blue LED, 0603", 1, "Status"],
          ["Ferrite sheet, 70 mm", 1, "Shield"],
          ["Spacer, 3D printed", 1, "PETG"],
        ],
      },
    ],
  },

  "granular-sampler-box": {
    stage: "planning",
    story:
      "Granular synthesis turns a two-second recording into a whole evening of texture, and I want it in a box with knobs instead of a plugin. Right now I am writing down what it must do: how long it records, how many grains, which controls get their own knob. I use plugins for ambient sets and for sound in short films, and I would like to stop opening a laptop for that. Tell me which controls you would want under your fingers.",
    description:
      "A standalone granular sampler planned around a Teensy 4.1 and a stereo codec. It should record up to 30 seconds from the line input or a built-in microphone, then play up to 32 grains at once with controls for size, density, pitch and spray. Eight knobs and a small screen keep it hands-on. It runs on USB-C power and takes MIDI in for clock and notes.",
    license: "Personal use",
    products: [
      {
        id: "sampler",
        name: "Granular Sampler",
        summary: "Teensy 4.1 sampler with 32 grains and eight knobs",
        specs: [
          ["Controller", "Teensy 4.1 (i.MX RT1062)"],
          ["Audio", "SGTL5000 codec, 44.1 kHz stereo"],
          ["Sampling", "Up to 30 s"],
          ["Grains", "Up to 32"],
          ["Controls", "8 knobs, 4 buttons"],
          ["Power", "5 V USB-C"],
        ],
        parts: [
          ["Teensy 4.1 board", 1, "Grain engine"],
          ["SGTL5000 codec", 1, "Audio in, out"],
          ["PSRAM, 8 MB", 1, "Sample memory"],
          ["CMA-4544 electret capsule", 1, "Built-in mic"],
          ["9 mm potentiometer, 10 kΩ", 8, "Knobs"],
          ["6 mm tactile switch", 4, "Record, freeze, mode, shift"],
          ["ST7789 1.54 in IPS display", 1, "Display"],
          ["3.5 mm audio jack", 3, "Line in, line out, headphones"],
          ["6N138 optocoupler", 1, "MIDI in"],
          ["3.5 mm TRS MIDI jack", 1, "MIDI in"],
          ["USB-C receptacle, 16-pin", 1, "Power"],
          ["Enclosure, 3D printed", 2, "PETG"],
        ],
      },
    ],
  },

  "pick-and-place-head": {
    stage: "pilot-run",
    story:
      "I assemble small batches of boards for friends, and placing 0402 parts by hand was eating my weekends. This head bolts onto a 3D printer gantry and turns it into a slow but accurate pick-and-place. It has a vacuum nozzle, a rotation stepper and a camera that looks up to correct each part. Running OpenPnP, it places about 600 parts an hour on my old printer.",
    description:
      "A pick-and-place head for converted 3D printer gantries running OpenPnP. A NEMA 8 stepper rotates the nozzle, a small vacuum pump and a solenoid valve pick and release, and a pressure sensor checks every pick. A bottom camera corrects rotation and offset before placing. The nozzle changer holds four Juki-style nozzles for parts from 0402 to SOIC.",
    products: [
      {
        id: "head",
        name: "Placement Head",
        summary: "Vacuum nozzle head with rotation and a pick check",
        specs: [
          ["Controller", "STM32G0"],
          ["Rotation", "NEMA 8 stepper, 0.1°"],
          ["Vacuum", "Pump, valve and pressure sensor"],
          ["Nozzles", "Juki 500 series"],
          ["Speed", "About 600 parts an hour"],
          ["Weight", "280 g"],
        ],
        parts: [
          ["STM32G0B1 microcontroller", 1, "Head control"],
          ["TMC2209 stepper driver", 1, "Rotation"],
          ["NEMA 8 stepper motor", 1, "Nozzle rotation"],
          ["12 V mini vacuum pump", 1, "Vacuum"],
          ["12 V solenoid valve", 1, "Release"],
          ["XGZP6847 pressure sensor", 1, "Pick check"],
          ["AO3400A N-MOSFET", 2, "Pump, valve switches"],
          ["1N5819 Schottky diode", 2, "Flyback"],
          ["Juki nozzle holder", 1, "Nozzle mount"],
          ["USB camera, 5 MP", 1, "Bottom vision"],
          ["Head carriage, 3D printed", 1, "PETG"],
          ["Silicone tubing, 4 mm, 1 m", 1, "Vacuum line"],
        ],
      },
      {
        id: "changer",
        name: "Nozzle Changer",
        summary: "Four-slot holder for Juki nozzles on a 2020 rail",
        pieces: PRINTED_ONLY,
        specs: [
          ["Slots", "4 nozzles"],
          ["Mount", "2020 extrusion"],
          ["Material", "PETG with steel pins"],
          ["Size", "110 × 40 × 25 mm"],
        ],
        parts: [
          ["Changer body, 3D printed", 1, "PETG"],
          ["Juki 502 nozzle", 1, "0402"],
          ["Juki 503 nozzle", 1, "0603"],
          ["Juki 504 nozzle", 1, "0805, SOT-23"],
          ["Juki 505 nozzle", 1, "SOIC"],
          ["Steel dowel pin, 3 × 12 mm", 4, "Nozzle locating"],
          ["M5 T-nut", 2, "Rail mount"],
        ],
      },
    ],
  },

  "greenhouse-climate-node": {
    stage: "testing",
    story:
      "My greenhouse cooks the tomatoes on sunny days when I am at work. The node measures air and light, opens the roof vent with a linear actuator when it gets too hot, and closes it again in the evening. It has saved two crops so far. You can set your own limits for each season from the web page, and it keeps working if the Wi-Fi goes down.",
    description:
      "A climate controller for small greenhouses. The node measures temperature, humidity, light and CO2 and drives a vent opener and a fan by your rules. The rules run on the node itself, so it keeps the greenhouse safe even without a network. It reports over Wi-Fi to a small dashboard, and the vent opener has end-stop switches so it never strains the frame.",
    network: "Wi-Fi",
    products: [
      {
        id: "node",
        name: "Climate Node",
        summary: "Greenhouse controller for temperature, humidity, light and CO2",
        specs: [
          ["Controller", "ESP32-S3"],
          ["Sensors", "Temperature, humidity, light, CO2"],
          ["Outputs", "Vent, fan, 2 relays"],
          ["Radio", "Wi-Fi"],
          ["Power", "12 V DC"],
          ["Size", "120 × 90 × 50 mm, IP54"],
        ],
        parts: [
          ["ESP32-S3-WROOM-1 module", 1, "Controller, Wi-Fi"],
          ["SHT45 sensor", 1, "Temperature, humidity"],
          ["SCD41 CO2 sensor", 1, "CO2"],
          ["BH1750 light sensor", 1, "Light"],
          ["5 V relay, 10 A", 2, "Fan, heater"],
          ["ULN2003A driver", 1, "Relay coils"],
          ["MP1584 buck converter", 1, "5 V rail"],
          ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
          ["Cable gland, M12", 4, "Weather sealing"],
          ["DC barrel jack, 2.1 mm", 1, "Power in"],
          ["IP54 enclosure", 1, "Case"],
          ["4.7 kΩ resistor, 0603", 2, "I2C pull-ups"],
        ],
      },
      {
        id: "vent",
        name: "Vent Opener",
        summary: "Linear actuator vent arm with end stops",
        pieces: NO_CODE,
        specs: [
          ["Actuator", "12 V linear, 200 mm stroke"],
          ["Driver", "DRV8871"],
          ["Limits", "2 end-stop switches"],
          ["Force", "150 N"],
          ["Link", "4-wire cable to the node"],
        ],
        parts: [
          ["12 V linear actuator, 200 mm", 1, "Vent arm"],
          ["DRV8871 motor driver", 1, "Actuator drive"],
          ["Lever micro switch", 2, "End stops"],
          ["JST-XH 4-pin connector", 1, "Node link"],
          ["100 µF capacitor, 25 V", 1, "Bulk"],
          ["Bracket set, 3D printed", 2, "ASA"],
          ["M6 × 30 bolt", 2, "Frame mount"],
        ],
      },
    ],
    comments: [
      {
        by: "c5",
        ago: 2000,
        likes: 11,
        body: "This is what I needed. Does the vent opener cope with wind gusts when it is open?",
        replies: [
          {
            by: "c8",
            ago: 1900,
            likes: 6,
            body: "The actuator holds 150 N when stopped, and the node closes the vent when the wind is over a limit. I have a cheap anemometer on the roof for that.",
          },
          { by: "c5", ago: 1800, likes: 2, body: "Clever. I will add an anemometer too." },
        ],
      },
      {
        by: "k4",
        ago: 300,
        likes: 2,
        body: "What happens if the node loses power with the vent open?",
        replies: [
          { by: "c8", ago: 260, likes: 2, body: "It stays where it is. A spring return would be safer, and I am testing one now." },
        ],
      },
    ],
  },

  "haptic-navigation-cuff": {
    stage: "prototype",
    story:
      "A friend who is blind asked if there was a way to follow walking directions without a voice in her ear all the time. The cuff sits on the forearm with eight small motors in a ring, and the one pointing the right way buzzes. Directions come from the phone's maps over Bluetooth. She now walks to the market with her ears free for traffic.",
    description:
      "A soft cuff with eight vibration motors that points the way by touch. The phone sends the next heading over Bluetooth, and the cuff uses its own compass to buzz the motor facing that direction, even as you turn your arm. Distance to the next turn is shown by the pulse rate. A 400 mAh cell lasts a full day of walking.",
    network: "Bluetooth LE",
    license: "Personal use",
    products: [
      {
        id: "cuff",
        name: "Haptic Cuff",
        summary: "Eight-motor forearm cuff that points the way by touch",
        specs: [
          ["Controller", "nRF52840"],
          ["Motors", "8 × coin vibration"],
          ["Sensors", "BMM350 compass, BMI270 IMU"],
          ["Radio", "Bluetooth LE"],
          ["Battery", "400 mAh, about 1 day"],
          ["Weight", "70 g"],
        ],
        parts: [
          ["nRF52840 module (MDBT50Q)", 1, "Controller, Bluetooth"],
          ["BMM350 magnetometer", 1, "Heading"],
          ["BMI270 IMU", 1, "Arm orientation"],
          ["Coin vibration motor", 8, "Direction"],
          ["AO3400A N-MOSFET", 8, "Motor switches"],
          ["1N4148 diode", 8, "Flyback"],
          ["400 mAh LiPo cell", 1, "Battery"],
          ["TP4056 charger", 1, "Charging"],
          ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
          ["USB-C receptacle, 16-pin", 1, "Charging"],
          ["Flex cable, 8-way", 1, "Motor ring"],
          ["Neoprene cuff with hook-and-loop strap", 1, "Strap"],
          ["Electronics pod, 3D printed", 1, "PETG"],
        ],
      },
    ],
    comments: [
      {
        by: "k6",
        ago: 1200,
        likes: 14,
        body: "This is a beautiful idea. Are eight motors enough to tell directions apart on a thin arm?",
        replies: [
          {
            by: "c1",
            ago: 1150,
            likes: 9,
            body: "On a thin arm we ended up with six active and the two under the wrist off. The phone app lets you pick which motors to use.",
          },
        ],
      },
      {
        by: "c4",
        ago: 600,
        likes: 5,
        body: "Could it use the phone's compass instead of its own?",
        replies: [
          {
            by: "c1",
            ago: 560,
            likes: 3,
            body: "We tried that, but the phone sits in a pocket at random angles. The cuff knows where the arm points.",
          },
        ],
      },
    ],
  },

  "supercapacitor-jump-pack": {
    stage: "pilot-run",
    story:
      "Lithium jump packs die in a cold car or a hot summer, and mine was flat the one time I needed it. This pack uses supercapacitors that charge from a nearly dead car battery or from USB-C in about two minutes, then deliver a big burst to the starter. It works at minus 30 °C. I keep one in each of our cars and have not needed a call-out since.",
    description:
      "A jump starter that stores energy in six 3000 F supercapacitors instead of a lithium battery. It tops itself up from a weak car battery through the clamps, or from a USB-C PD charger in about two minutes. It delivers over 800 A for the few seconds a starter needs. A balancing board keeps every cell under 2.7 V, and reverse polarity on the clamps is blocked.",
    license: "Commercial use",
    listing: [
      [MAIN, "0.80 ETH"],
      [physical(3, 20), "0.09 ETH"],
      [VIRTUAL, "0.03 ETH"],
    ],
    products: [
      {
        id: "pack",
        name: "Jump Pack",
        summary: "Six-supercapacitor jump starter with USB-C charging",
        specs: [
          ["Storage", "6 × 3000 F supercapacitors"],
          ["Peak current", "Over 800 A"],
          ["Charging", "USB-C PD, about 2 min"],
          ["Temperature", "−30 to 60 °C"],
          ["Controller", "STM32G0"],
          ["Weight", "1.9 kg"],
        ],
        parts: [
          ["3000 F 2.7 V supercapacitor", 6, "Energy storage"],
          ["Supercapacitor balancing board, 6S", 1, "Cell balancing"],
          ["STM32G031 microcontroller", 1, "Charge control"],
          ["LT8390 buck-boost controller", 1, "Charging from USB-C or car"],
          ["STUSB4500 PD sink controller", 1, "USB-C PD"],
          ["USB-C receptacle, 24-pin", 1, "Charging"],
          ["LTC4359 ideal diode controller", 1, "Reverse block"],
          ["IPT007N06N MOSFET", 4, "Reverse block switch"],
          ["Copper busbar", 2, "High-current path"],
          ["Clamp set, 4 AWG", 1, "Jump leads"],
          ["0.28 in 7-segment display", 1, "Voltage readout"],
          ["Case, 3D printed PC", 1, "Case"],
        ],
      },
    ],
    comments: [
      {
        by: "c3",
        ago: 900,
        likes: 9,
        body: "Did you test at minus 30 °C, or is that from the datasheet?",
        replies: [
          {
            by: "c2",
            ago: 850,
            likes: 6,
            body: "Both. The datasheet says minus 40. I left it in a chest freezer at minus 28 overnight and started my car with it the next morning.",
          },
        ],
      },
      {
        by: "c7",
        ago: 3200,
        likes: 4,
        body: "How many starts do you get per charge?",
        replies: [
          {
            by: "c2",
            ago: 3100,
            likes: 3,
            body: "Two or three for a petrol car. After that it needs a top-up from the battery or USB-C, which takes a couple of minutes.",
          },
        ],
      },
      { by: "k5", ago: 120, likes: 1, body: "Would the 4 AWG clamps be enough for a diesel van?" },
    ],
  },

  "modular-drum-machine": {
    stage: "design",
    story:
      "I play in a two-piece band and need a drum machine that grows as our songs get more complicated. The main unit will have eight voices and a sequencer, and pad modules will snap onto the side for live fills. Each voice is a small synth rather than a sample, so one knob can bend a kick into a tom. The boards and case are drawn now. Build the main unit first, the pads are optional.",
    description:
      "A drum machine with eight synthesized voices, a 64-step sequencer and magnetic add-on pad modules. An STM32H743 runs the voices and the sequencer, and a PCM5102A DAC drives the main output. Pad modules connect with pogo pins and send velocity over I2C. It syncs to other gear by MIDI and analog clock.",
    products: [
      {
        id: "main",
        name: "Main Unit",
        summary: "Eight-voice drum synth with a 64-step sequencer",
        specs: [
          ["Controller", "STM32H743"],
          ["Voices", "8, synthesized"],
          ["Sequencer", "64 steps, 16 patterns"],
          ["Audio", "PCM5102A, stereo out"],
          ["Sync", "MIDI, analog clock"],
          ["Power", "9 V DC"],
        ],
        parts: [
          ["STM32H743 microcontroller", 1, "Voices, sequencer"],
          ["PCM5102A DAC", 1, "Audio out"],
          ["6 mm tactile switch", 24, "Steps, function keys"],
          ["WS2812B-2020 LED", 16, "Step lights"],
          ["9 mm potentiometer, 10 kΩ", 12, "Voice knobs"],
          ["6N138 optocoupler", 1, "MIDI in"],
          ["3.5 mm audio jack", 4, "Out, clock in, clock out, MIDI"],
          ["TPS5430 buck converter", 1, "5 V rail"],
          ["LM1117-3.3 regulator", 1, "3.3 V rail"],
          ["DC barrel jack, 2.1 mm", 1, "Power in"],
          ["Pogo connector, 4-pin", 2, "Pad modules"],
          ["Neodymium magnet, 6 × 3 mm", 4, "Module attach"],
          ["Enclosure, 3D printed", 2, "PETG"],
        ],
      },
      {
        id: "pads",
        name: "Pad Module",
        summary: "Four velocity pads that snap on magnetically",
        specs: [
          ["Controller", "RP2040"],
          ["Pads", "4 × FSR, velocity"],
          ["Link", "I2C over pogo pins"],
          ["Power", "From the main unit"],
          ["Size", "100 × 100 × 20 mm"],
        ],
        parts: [
          ["RP2040 microcontroller", 1, "Pad scanning"],
          ["W25Q16 flash, 2 MB", 1, "Firmware"],
          ["FSR 402 sensor", 4, "Pads"],
          ["Pogo pin connector, 4-pin", 1, "Link to main unit"],
          ["Neodymium magnet, 6 × 3 mm", 4, "Attach"],
          ["Silicone pad, cast", 4, "Pad tops"],
          ["100 nF capacitor, 0603", 6, "Decoupling"],
          ["Frame, 3D printed", 1, "PETG"],
        ],
      },
    ],
    comments: [
      {
        by: "c5",
        ago: 1700,
        likes: 5,
        body: "Magnetic pad modules are a great idea. Are you planning a fader module too?",
        replies: [{ by: "c3", ago: 1650, likes: 3, body: "Yes, a four-fader mixer module is next on the list after the pads." }],
      },
    ],
  },

  "cable-driven-gripper": {
    stage: "design",
    story:
      "Robot grippers are usually heavy at the wrist, which ruins small arms. My plan keeps the motor in the base and pulls the fingers with Dyneema cables, so the hand should weigh about 90 g. The fingers curl around odd shapes like a real hand. I am keeping the finger set separate, so you can print soft or hard fingers for different jobs.",
    description:
      "A three-finger underactuated gripper driven by cables from a remote motor. One geared DC motor with a current sensor pulls all three fingers, and the fingers adapt to the shape they grab. Grip force is set by the current limit. The finger set prints in TPU or PETG and swaps with two screws.",
    products: [
      {
        id: "gripper",
        name: "Gripper",
        summary: "Three-finger cable-driven gripper with a remote motor",
        specs: [
          ["Controller", "STM32G031"],
          ["Motor", "N20 gear motor, 1000:1"],
          ["Fingers", "3, underactuated"],
          ["Grip force", "Up to 15 N"],
          ["Hand weight", "90 g"],
          ["Interface", "UART or PWM"],
        ],
        parts: [
          ["STM32G031 microcontroller", 1, "Motor control"],
          ["DRV8871 motor driver", 1, "Motor"],
          ["N20 gear motor, 1000:1", 1, "Cable pull"],
          ["INA180 current sense amplifier", 1, "Grip force"],
          ["Shunt resistor, 50 mΩ", 1, "Current sense"],
          ["Dyneema line, 0.5 mm, 1 m", 2, "Tendons"],
          ["PTFE tube, 2 mm, 1 m", 1, "Cable guide"],
          ["Spool, 3D printed", 1, "PETG"],
          ["Base housing, 3D printed", 1, "PETG"],
          ["623 bearing", 2, "Spool"],
          ["JST-PH 4-pin connector", 1, "Control and power"],
        ],
      },
      {
        id: "fingers",
        name: "Finger Set",
        summary: "Swappable TPU or PETG fingers with spring joints",
        pieces: PRINTED_ONLY,
        specs: [
          ["Fingers", "3, two joints each"],
          ["Material", "TPU 95A or PETG"],
          ["Joints", "Torsion springs"],
          ["Swap", "2 × M3 screws"],
        ],
        parts: [
          ["Finger links, 3D printed", 6, "TPU or PETG"],
          ["Palm plate, 3D printed", 1, "PETG"],
          ["Silicone fingertip pad", 3, "Grip"],
          ["Torsion spring, 0.5 mm", 6, "Joint return"],
          ["Steel pin, 2 × 16 mm", 6, "Joint axles"],
          ["M3 × 8 screw", 2, "Mount"],
        ],
      },
    ],
  },
};

// ─────────────────────────── category templates ───────────────────────────
// For a feed project without a hand-written entry: the title woven into the
// category's copy, and one of two openings picked by the slug.

type Template = {
  summary: string;
  stories: readonly ((t: string) => string)[];
  description: (t: string) => string;
  specs: readonly SpecRow[];
  parts: readonly PartRow[];
  network: string | null;
};

const TEMPLATES: Record<ProjectCategory, Template> = {
  robotics: {
    summary: "ESP32-S3 controller with servo and motor drivers",
    stories: [
      (t) =>
        `I built this ${t} to learn motion control on something I could hold. The controller and drivers are on one board, so the wiring stays short and tidy. If you build one, start slow and tune the gains before you add speed.`,
      (t) =>
        `My ${t} started as a weekend experiment and kept growing. Everything prints on a normal printer and the parts are easy to find. Change the motion code to make it your own, and tell me what you taught it.`,
    ],
    description: (t) =>
      `${aOf(t)} ${t} built around an ESP32-S3 with servo and motor drivers on one board. An IMU keeps track of its orientation, and the motion code runs at a steady 200 Hz. It runs from a 2S Li-ion pack and can be driven from a phone.`,
    specs: [
      ["Controller", "ESP32-S3"],
      ["Actuators", "Servos and DC motors"],
      ["Sensor", "BMI270 IMU"],
      ["Power", "2S Li-ion, 7.4 V"],
    ],
    parts: [
      ["ESP32-S3-WROOM-1 module", 1, "Controller"],
      ["PCA9685 PWM driver", 1, "Servo signals"],
      ["DRV8833 motor driver", 1, "Motors"],
      ["BMI270 IMU", 1, "Orientation"],
      ["MP1584 buck converter", 1, "5 V rail"],
      ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
      ["Frame parts, 3D printed", 4, "PETG"],
    ],
    network: null,
  },
  iot: {
    summary: "ESP32-C3 sensor node that reports over Wi-Fi",
    stories: [
      (t) =>
        `I wanted to know what was really happening at home, so I built this ${t}. It reports every few minutes and keeps working if the network drops. Put one in a few rooms and compare the readings.`,
      (t) =>
        `This ${t} came from a question I kept asking myself and could not answer without data. It is cheap to build and runs for months on one supply. If you build one, share your readings so we can compare.`,
    ],
    description: (t) =>
      `${aOf(t)} ${t} built on an ESP32-C3 that reports its readings over Wi-Fi. It keeps a day of data on the board, so nothing is lost when the network drops. It runs from 5 V USB-C and serves a small status page on your network.`,
    specs: [
      ["Controller", "ESP32-C3"],
      ["Radio", "Wi-Fi"],
      ["Power", "5 V USB-C"],
      ["Interval", "5 min"],
    ],
    parts: [
      ["ESP32-C3-MINI-1 module", 1, "Controller, Wi-Fi"],
      ["SHT40 sensor", 1, "Temperature, humidity"],
      ["USB-C receptacle, 16-pin", 1, "Power in"],
      ["AP2112K-3.3 regulator", 1, "3.3 V rail"],
      ["100 nF capacitor, 0603", 6, "Decoupling"],
      ["Enclosure, 3D printed", 1, "PETG"],
    ],
    network: "Wi-Fi",
  },
  wearables: {
    summary: "nRF52840 wearable with an IMU and a small LiPo cell",
    stories: [
      (t) =>
        `I wanted a ${t} that I could open up and change, so I made my own. It talks to my phone over Bluetooth and lasts days on a charge. The case is printed, so you can resize it to fit.`,
      (t) =>
        `Every ${t} I found sent my data somewhere I could not see. This one keeps it on the device until I pull it off. Build one and tell me how the battery life holds up for you.`,
    ],
    description: (t) =>
      `${aOf(t)} ${t} built around an nRF52840 with a 6-axis IMU and a small LiPo cell. It syncs to your phone over Bluetooth LE and charges through magnetic pogo pins. The printed case can be resized to fit.`,
    specs: [
      ["Controller", "nRF52840"],
      ["Sensor", "BMI270 IMU"],
      ["Radio", "Bluetooth LE"],
      ["Battery", "150 mAh LiPo"],
    ],
    parts: [
      ["nRF52840 module (MDBT50Q)", 1, "Controller, Bluetooth"],
      ["BMI270 IMU", 1, "Motion"],
      ["150 mAh LiPo cell", 1, "Battery"],
      ["BQ25101 charger", 1, "Charging"],
      ["TPS7A02 regulator, 3.3 V", 1, "3.3 V rail"],
      ["Magnetic pogo connector, 2-pin", 1, "Charging"],
      ["Case, 3D printed resin", 1, "Body"],
    ],
    network: "Bluetooth LE",
  },
  power: {
    summary: "STM32G0-controlled power stage with current sensing",
    stories: [
      (t) =>
        `I needed a ${t} I could trust on my bench, so I designed one with proper current sensing and protection. It has run for weeks without trouble. Please be careful with the high-current side when you build it.`,
      (t) =>
        `The ${t} I bought kept failing, so I made my own and measured everything. The layout keeps the hot loop small and the sense lines clean. If you build one, check your current limit before you connect a load.`,
    ],
    description: (t) =>
      `${aOf(t)} ${t} with an STM32G0 managing the power stage and an INA226 reading voltage and current. It has over-current, over-temperature and reverse-polarity protection. Live readings show on a small OLED.`,
    specs: [
      ["Controller", "STM32G0"],
      ["Sensing", "INA226, voltage and current"],
      ["Protection", "Over-current, over-temperature, reverse polarity"],
      ["Display", "0.96 in OLED"],
    ],
    parts: [
      ["STM32G031 microcontroller", 1, "Control"],
      ["INA226 current monitor", 1, "Voltage, current"],
      ["Shunt resistor, 5 mΩ", 1, "Current sense"],
      ["AO3400A N-MOSFET", 2, "Switching"],
      ["SSD1306 0.96 in OLED", 1, "Display"],
      ["10 kΩ NTC thermistor", 1, "Temperature"],
      ["Enclosure, 3D printed", 1, "PETG"],
    ],
    network: null,
  },
  audio: {
    summary: "RP2040 audio engine with a PCM5102A DAC",
    stories: [
      (t) =>
        `I wanted a ${t} with real knobs and no laptop, so I built one. The sound engine is open, so you can change the waveforms or add your own effects. Plug it into anything with a line input.`,
      (t) =>
        `This ${t} started as a way to learn DSP and became my favourite thing to play with. It runs on USB-C power and fits in a small bag. Tell me what sounds you get out of it.`,
    ],
    description: (t) =>
      `${aOf(t)} ${t} with an RP2040 running the audio engine and a PCM5102A DAC for clean line and headphone outputs. Knobs and keys keep it hands-on, and USB MIDI lets it sync with other gear. It runs from 5 V USB-C.`,
    specs: [
      ["Controller", "RP2040"],
      ["Audio", "PCM5102A DAC, 44.1 kHz"],
      ["Outputs", "Line out, headphones, USB MIDI"],
      ["Power", "5 V USB-C"],
    ],
    parts: [
      ["RP2040 microcontroller", 1, "Audio engine"],
      ["W25Q16 flash, 2 MB", 1, "Firmware"],
      ["PCM5102A DAC", 1, "Audio out"],
      ["9 mm potentiometer, 10 kΩ", 4, "Knobs"],
      ["3.5 mm audio jack", 2, "Line out, headphones"],
      ["USB-C receptacle, 16-pin", 1, "Power, MIDI"],
      ["Case, 3D printed", 2, "PLA"],
    ],
    network: null,
  },
};

/** Fallback stages (project Activity types), weighted towards Prototype … Pilot run. */
const TEMPLATE_STAGES: readonly string[] = [
  "prototype",
  "testing",
  "prototype",
  "ready-for-manufacture",
  "pilot-run",
  "testing",
  "design",
  "design",
];

/** FNV-1a, so a template choice depends only on the slug. */
function hashOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** "A" or "An" before a title in a sentence. */
const aOf = (t: string) => (/^[aeiou]/i.test(t) ? "An" : "A");

/** "Hexapod walking robot" → "hexapod walking robot"; "LoRa weather station" stays. */
function inSentence(title: string): string {
  const first = title.split(" ")[0] ?? "";
  const rest = first.slice(1);
  return rest === rest.toLowerCase() ? title.charAt(0).toLowerCase() + title.slice(1) : title;
}

function templateSeedOf(project: Project): PostSeed {
  const tpl = TEMPLATES[project.category];
  const h = hashOf(project.slug);
  const t = inSentence(project.title);
  return {
    stage: TEMPLATE_STAGES[h % TEMPLATE_STAGES.length],
    story: tpl.stories[h % tpl.stories.length](t),
    description: tpl.description(t),
    network: tpl.network ?? undefined,
    license: project.minted ? (h % 3 === 0 ? "Personal use" : "Commercial use") : undefined,
    products: [{ id: "main", name: project.title, summary: tpl.summary, specs: tpl.specs, parts: tpl.parts }],
  };
}

// ─────────────────────────── building a post ───────────────────────────

function seedOf(project: Project): PostSeed {
  return Object.prototype.hasOwnProperty.call(SEEDS, project.slug) ? SEEDS[project.slug] : templateSeedOf(project);
}

/** 12 for "p12"; a stable number from the id for anything else. */
function feedNumberOf(feedId: string): number {
  const m = /^p(\d+)$/.exec(feedId);
  return m ? Number(m[1]) : hashOf(feedId) % 1000;
}

function productOf(seed: ProductSeed, index: number, coverImage: string | null): PostProduct {
  return {
    id: seed.id,
    name: seed.name,
    summary: seed.summary,
    image: index === 0 ? seed.image ?? coverImage : seed.image ?? null,
    pieces: ALL_PIECES.filter((p) => (seed.pieces ?? ALL_PIECES).includes(p)),
    specs: seed.specs.map(([label, value]): PostSpec => ({ label, value })),
    parts: seed.parts.map(([name, qty, use]): PostPart => ({ name, qty, use })),
    build: null,
  };
}

function mediaOf(products: readonly PostProduct[], coverImage: string | null): PostMedia[] {
  const media: PostMedia[] = [];
  const first = products[0];
  if (coverImage) media.push({ kind: "image", src: coverImage, alt: `${first.name}: ${first.summary}`, label: "Cover" });
  for (const p of products) {
    if (p.image && !media.some((m) => m.kind === "image" && m.src === p.image)) {
      media.push({ kind: "image", src: p.image, alt: `${p.name}: ${p.summary}`, label: p.name });
    }
  }
  return media;
}

/** The full sample post for a feed project. Pure: the same project gives the same post. */
export function samplePostOf(project: Project): InnovationPost {
  const seed = seedOf(project);
  const n = feedNumberOf(project.id);
  const cover = project.image ?? null;
  const products = seed.products.map((p, i) => productOf(p, i, cover));
  const category = CATEGORIES.find((c) => c.id === project.category)?.label ?? null;
  return {
    id: postIdOfSample(project.id),
    slug: project.slug,
    source: "sample",
    projectId: null,
    title: project.title,
    category,
    description: seed.description,
    story: seed.story,
    stage: seed.stage,
    sharedAt: project.createdAt,
    createdAt: project.createdAt,
    updatedAt: project.createdAt + (3 + ((n * 7) % 20)) * HOUR,
    creator: personOf(project.creator.id),
    minted: project.minted,
    license: project.minted ? seed.license ?? "Commercial use" : null,
    chain: project.minted ? "Polygon" : null,
    network: seed.network ?? null,
    media: mediaOf(products, cover),
    products,
    partsCount: products.reduce((sum, p) => sum + p.parts.length, 0),
    listing:
      project.minted && seed.listing && seed.listing.length > 0
        ? { rows: seed.listing.map(([label, price]) => ({ label, price })), href: "/marketplace" }
        : null,
    base: { appreciations: project.appreciations, views: project.views },
    shared: true,
  };
}

/** One post per feed project, in feed order. */
export const SAMPLE_POSTS: InnovationPost[] = PROJECTS.map(samplePostOf);

export function samplePostBySlug(slug: string): InnovationPost | null {
  return SAMPLE_POSTS.find((p) => p.slug === slug) ?? null;
}

// ─────────────────────────── seeded comments ───────────────────────────

/** The seed thread of a sample post, timed against `now`. Unknown id ⇒ []. */
export function sampleCommentsOf(postId: string, now: number): PostComment[] {
  const project = PROJECTS.find((p) => postIdOfSample(p.id) === postId);
  if (!project) return [];
  const seeds = Object.prototype.hasOwnProperty.call(SEEDS, project.slug) ? SEEDS[project.slug].comments : undefined;
  if (!seeds) return [];
  const n = feedNumberOf(project.id);
  const out: PostComment[] = [];
  let k = 0;
  const at = (minutes: number) => now - minutes * MINUTE;
  const walk = (list: readonly CommentSeed[], parentId: string | null) => {
    for (const s of list) {
      k += 1;
      const id = `s${n}-${k}`;
      out.push({
        id,
        postId,
        parentId,
        authorId: s.by,
        body: s.body,
        replyTo: s.replyTo ?? null,
        image: s.image ?? null,
        createdAt: at(s.ago),
        editedAt: s.edited === undefined ? null : at(s.edited),
        hiddenAt: s.hidden === undefined ? null : at(s.hidden),
        deletedAt: null,
        likes: s.likes,
        likedByMe: false,
      });
      if (s.replies) walk(s.replies, id);
    }
  };
  walk(seeds, null);
  return out;
}

const SEED_FNS = new Map<string, (now: number) => PostComment[]>();

/** One stable seed function per post, so a card or a page can hand it to the comments store
 *  without a memo of its own. */
export function sampleSeedOf(postId: string): (now: number) => PostComment[] {
  let fn = SEED_FNS.get(postId);
  if (!fn) {
    fn = (now: number) => sampleCommentsOf(postId, now);
    SEED_FNS.set(postId, fn);
  }
  return fn;
}
