// Every table the Add Network flow reads, copied from the Figma spec sheets
// ("All parameters modal" 44533:123240 and "All dropdown" 44533:123191). The
// dropdowns, the rules in derive.ts and the All parameters reference dialog
// all read these, so what the reference says is what the controls do.

import type {
  AgentPlacement,
  Carries,
  CloudType,
  Frequency,
  Initiator,
  Intent,
  Middle,
  ProtocolKey,
  Redundancy,
  Repeater,
  SensorType,
  SharesData,
  Topology,
} from "./types";

export type ProtocolInfo = {
  key: ProtocolKey;
  name: string;
  /** Frequencies this protocol can run on, in the dropdown's order. */
  frequencies: Frequency[];
  frequencyNote: string;
  cloudBlock: string;
  useCase: string;
  /** Figma: "hide for I2C, SPI, CAN and RS-232 — no repeater concept there". */
  repeater: boolean;
  /** How it reads on a product's chip ("ESP32-S3 · Wi-Fi"); null for
   *  protocols that are not a radio a maker would name there. */
  radioLabel: string | null;
};

// Figma 44533:123345 — Protocols.
export const PROTOCOLS: ProtocolInfo[] = [
  { key: "WF", name: "Wi-Fi (direct)", frequencies: ["2.4", "5"], frequencyNote: "2.4 GHz or 5 GHz", cloudBlock: "Optional", useCase: "Local control, no cloud round-trip", repeater: true, radioLabel: "Wi-Fi" },
  { key: "WM", name: "Wi-Fi + MQTT", frequencies: ["2.4", "5"], frequencyNote: "2.4 GHz or 5 GHz", cloudBlock: "Required", useCase: "APK-controlled products via MQTT", repeater: true, radioLabel: null },
  { key: "BL", name: "BLE", frequencies: ["2.4"], frequencyNote: "2.4 GHz", cloudBlock: "Optional (via GW)", useCase: "Battery sensors, mobile-direct pairing", repeater: true, radioLabel: "BLE" },
  { key: "EN", name: "ESP-NOW", frequencies: ["2.4"], frequencyNote: "2.4 GHz", cloudBlock: "Blank (offline)", useCase: "ESP32 mesh, 1 ms latency, no router", repeater: true, radioLabel: null },
  { key: "ZB", name: "Zigbee / Thread", frequencies: ["2.4"], frequencyNote: "2.4 GHz", cloudBlock: "Via coordinator", useCase: "Large mesh, low power, self-healing", repeater: true, radioLabel: "Zigbee" },
  { key: "LR", name: "LoRa / LoRaWAN", frequencies: ["868", "915", "433"], frequencyNote: "Sub-GHz 868 / 915 MHz", cloudBlock: "Via GW", useCase: "2–15 km outdoor fleet", repeater: true, radioLabel: "LoRa" },
  { key: "MT", name: "Matter / Thread", frequencies: ["2.4"], frequencyNote: "2.4 GHz", cloudBlock: "Optional", useCase: "Smart home, cloudless, IP-based", repeater: true, radioLabel: "Matter" },
  { key: "CN", name: "CAN Bus", frequencies: ["na"], frequencyNote: "N/A (wired)", cloudBlock: "Via GW", useCase: "Industrial, automotive, 40 m bus", repeater: false, radioLabel: "CAN" },
  { key: "R5", name: "RS-485", frequencies: ["na"], frequencyNote: "N/A (wired)", cloudBlock: "Via GW", useCase: "Building automation, 1.2 km, 32 nodes", repeater: true, radioLabel: "RS-485" },
  { key: "R2", name: "RS-232", frequencies: ["na"], frequencyNote: "N/A (wired)", cloudBlock: "Via GW", useCase: "Point-to-point legacy serial, under 15 m", repeater: false, radioLabel: "RS-232" },
  { key: "I2", name: "I2C", frequencies: ["na"], frequencyNote: "N/A (on-board)", cloudBlock: "N/A", useCase: "Chip-to-chip, same PCB, multi-drop", repeater: false, radioLabel: null },
  { key: "SP", name: "SPI", frequencies: ["na"], frequencyNote: "N/A (on-board)", cloudBlock: "N/A", useCase: "Chip-to-chip, same PCB, high speed", repeater: false, radioLabel: null },
];

export const PROTOCOL_KEYS = PROTOCOLS.map((p) => p.key);

export function protocolInfo(key: ProtocolKey): ProtocolInfo {
  return PROTOCOLS.find((p) => p.key === key) ?? PROTOCOLS[1];
}

export type IntentInfo = {
  key: Intent;
  title: string;
  body: string;
  effect: string;
};

// Figma 02 (the cards) + 44533:123318 (Intent → effect on the dialog).
export const INTENTS: IntentInfo[] = [
  { key: "ctrl", title: "Control all via 1 App", body: "One APK monitors and controls every product. All share one cloud namespace.", effect: "Cloud name required; all products share one MQTT namespace" },
  { key: "p2p", title: "Products talk to each other", body: "Direct device-to-device over BLE, ESP-NOW, Zigbee or CAN. No cloud needed.", effect: "Cloud block optional; BLE / ESP-NOW / Zigbee / CAN preferred" },
  { key: "both", title: "Both — app + direct", body: "Products talk locally and the app controls them via cloud. Works offline too.", effect: "A gateway product is required; that gateway gets 2 interfaces" },
  { key: "cloud", title: "Cloud-only data sync", body: "Each product pushes data to the cloud on its own. No direct links.", effect: "No direct links; each product independent; cloud name required" },
];

export function intentInfo(key: Intent): IntentInfo {
  return INTENTS.find((i) => i.key === key) ?? INTENTS[0];
}

export type Option<V extends string> = { value: V; label: string; sub?: string };

export const FREQUENCIES: Option<Frequency>[] = [
  { value: "2.4", label: "2.4 GHz", sub: "Wi-Fi · BLE · Zigbee" },
  { value: "5", label: "5 GHz", sub: "Wi-Fi" },
  { value: "868", label: "Sub-GHz 868 MHz", sub: "LoRa EU" },
  { value: "915", label: "Sub-GHz 915 MHz", sub: "LoRa US" },
  { value: "433", label: "Sub-GHz 433 MHz", sub: "LoRa Asia" },
  { value: "na", label: "N/A (wired)", sub: "CAN · RS-485 · I2C" },
];

export const TOPOLOGIES: Option<Topology>[] = [
  { value: "star", label: "Star" },
  { value: "mesh", label: "Mesh" },
  { value: "bus", label: "Bus" },
  { value: "p2p", label: "P2P" },
  { value: "tree", label: "Tree" },
  { value: "ring", label: "Ring" },
];

export const CLOUD_TYPES: Option<CloudType>[] = [
  { value: "mqtt", label: "Pub/Sub (MQTT)" },
  { value: "rest", label: "REST API" },
  { value: "ws", label: "WebSocket" },
  { value: "coap", label: "CoAP" },
  { value: "amqp", label: "AMQP" },
  { value: "none", label: "None (offline)", sub: "ESP-NOW · BLE mesh" },
];

export const REPEATERS: Option<Repeater>[] = [
  { value: "none", label: "None" },
  { value: "1", label: "1 Repeater" },
  { value: "2", label: "2 Repeaters" },
  { value: "3", label: "3 Repeaters" },
  { value: "mesh", label: "Mesh (self-healing)", sub: "clashes with Topology" },
];

// Figma "Sensor type" — 17 options.
export const SENSORS: Option<SensorType>[] = [
  { value: "temp-hum", label: "Temperature + Humidity" },
  { value: "temp", label: "Temperature only" },
  { value: "hum", label: "Humidity only" },
  { value: "pir", label: "Motion (PIR)" },
  { value: "reed", label: "Reed Switch" },
  { value: "soil", label: "Soil Moisture" },
  { value: "gas", label: "CO2 / Gas" },
  { value: "light", label: "Light (LDR)" },
  { value: "pressure", label: "Pressure" },
  { value: "current", label: "Current / Power" },
  { value: "imu", label: "Accelerometer / Gyro" },
  { value: "ultrasonic", label: "Ultrasonic" },
  { value: "ir", label: "IR" },
  { value: "ph", label: "pH / EC" },
  { value: "gps", label: "GPS" },
  { value: "battery", label: "Battery Level" },
  { value: "none", label: "None" },
];

/** What a sensor's arrow is labelled with on the map. */
export const SENSOR_PAYLOAD: Record<SensorType, string> = {
  "temp-hum": "temp / humidity",
  temp: "temperature",
  hum: "humidity",
  pir: "motion",
  reed: "open / close",
  soil: "soil moisture",
  gas: "gas level",
  light: "light level",
  pressure: "pressure",
  current: "current / power",
  imu: "motion data",
  ultrasonic: "distance",
  ir: "IR signal",
  ph: "pH / EC",
  gps: "location",
  battery: "battery level",
  none: "data",
};

export const AGENTS: Option<AgentPlacement>[] = [
  { value: "cloud", label: "Cloud (centralized)" },
  { value: "edge-product", label: "Edge (this product)" },
  { value: "edge-gateway", label: "Edge (gateway)" },
  { value: "distributed", label: "Distributed" },
  { value: "none", label: "None" },
];

export const SHARES: Option<SharesData>[] = [
  { value: "full", label: "Full stream" },
  { value: "aggregated", label: "Aggregated only" },
  { value: "alerts", label: "Alerts only" },
  { value: "off", label: "Off" },
];

export const REDUNDANCIES: Option<Redundancy>[] = [
  { value: "none", label: "None" },
  { value: "standby", label: "Standby", sub: "fleet spare" },
  { value: "active-active", label: "Active-Active" },
  { value: "active-passive", label: "Active-Passive" },
];

export const INITIATOR_LABEL: Record<Initiator, string> = {
  source: "Source",
  target: "Target",
  both: "Both ways",
};

export const MIDDLES: Option<Middle>[] = [
  { value: "direct", label: "Direct" },
  { value: "cloud", label: "Cloud / MQTT" },
  { value: "gateway", label: "Gateway" },
];

export const CARRIES: Option<Carries>[] = [
  { value: "sensor", label: "Sensor data" },
  { value: "commands", label: "Commands" },
  { value: "events", label: "Events" },
  { value: "data+commands", label: "Data + commands" },
];

export function labelOf<V extends string>(options: Option<V>[], value: V): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

// Figma 44533:123241 — Dialog fields.
export const DIALOG_FIELDS: { field: string; type: string; options: string; from: string }[] = [
  { field: "Topology", type: "Select", options: "Star · Mesh · Bus · P2P · Tree · Ring", from: "Q2 middleman answer" },
  { field: "Master", type: "Select", options: "This product · [product name] · Gateway Hub", from: "Q1 initiator answer" },
  { field: "Network type", type: "Select", options: "the 12 protocols", from: "protocol chosen on the link" },
  { field: "Network Frequency", type: "Select", options: "2.4 GHz · 5 GHz · 868 · 915 · 433 MHz · N/A (wired)", from: "the protocol" },
  { field: "Add repeater", type: "Select", options: "None · 1 · 2 · 3 Repeaters · Mesh (self-healing)", from: "manual" },
  { field: "Cloud Name", type: "Text", options: "free text, same value on every product", from: "first entry, copied across" },
  { field: "Password", type: "Password", options: "free text with eye toggle", from: "manual — required" },
  { field: "Cloud type", type: "Select", options: "Pub/Sub MQTT · REST API · WebSocket · CoAP · AMQP · None (offline)", from: "Q2 + the goal" },
  { field: "Sensor", type: "Select", options: "17 options, Temperature + Humidity … None", from: "Q3 — required when Q3 says sensor data" },
  { field: "Agent Placement", type: "Select", options: "Cloud · Edge (this product) · Edge (gateway) · Distributed · None", from: "product role" },
  { field: "Shares Data With Cloud", type: "Select", options: "Full stream · Aggregated only · Alerts only · Off", from: "whether a sensor is set · disabled until Agent Placement is set" },
  { field: "Bridge (Gateway)", type: "Select", options: "Off · On (2nd protocol)", from: "turns on at 2+ interfaces" },
  { field: "Redundancy", type: "Select", options: "None · Standby · Active-Active · Active-Passive", from: "standby / spare flag" },
];

// Figma 44533:123430 — Role rules.
export const ROLE_RULES: { pattern: string; role: string; master: string; topology: string }[] = [
  { pattern: "Both directions, data up + setpoint down", role: "Master", master: "This product", topology: "Star" },
  { pattern: "Outgoing only, carries events only", role: "Independent", master: "This product", topology: "Star" },
  { pattern: "Incoming only (receives commands)", role: "Slave", master: "[Master product name]", topology: "Star" },
  { pattern: "Both directions", role: "Peer", master: "This product", topology: "Mesh / P2P" },
  { pattern: "Arrows on 2 or more protocols", role: "Gateway", master: "This product", topology: "one row per interface" },
  { pattern: "No arrows + standby flag", role: "Slave (Standby)", master: "[Master]", topology: "Redundancy = Standby" },
];

// Figma 44533:123472 — Scenarios.
export const SCENARIOS: { scenario: string; protocol: string; cloud: string; difference: string }[] = [
  { scenario: "1 · 4-Product Wi-Fi", protocol: "Wi-Fi + MQTT", cloud: "All", difference: "Shared cloud collection = one APK" },
  { scenario: "2 · BLE sensors + Wi-Fi gateway", protocol: "BLE + Wi-Fi + MQTT", cloud: "GW only", difference: "Gateway runs 2 interfaces" },
  { scenario: "3 · ESP-NOW local, fully offline", protocol: "ESP-NOW + BLE", cloud: "Blank", difference: "Cloud type = None; app pairs over BLE" },
  { scenario: "4 · LoRa long-range fleet", protocol: "LoRa + Wi-Fi GW", cloud: "GW only", difference: "Sub-GHz; spare gets Redundancy = Standby" },
  { scenario: "5 · Hybrid mixed protocols", protocol: "Wi-Fi + BLE + ESP-NOW", cloud: "Hub only", difference: "Hub carries 3 interface rows" },
  { scenario: "6 · Industrial CAN bus", protocol: "CAN + Ethernet + MQTT", cloud: "GW only", difference: "Real 2-wire bus, 120Ω terminated" },
];
