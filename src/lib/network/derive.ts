// Everything the flow works out rather than asks: what a product's parts say
// it can do, the role each product plays from the arrows it has (Figma "Role
// rules"), the values the Review step fills in, the unsaved-change list, the
// links a master change breaks, and what still stops "Create network".

import {
  CLOUD_TYPES,
  SENSORS,
  SENSOR_PAYLOAD,
  labelOf,
  protocolInfo,
} from "./catalog";
import type {
  AgentPlacement,
  Carries,
  CloudType,
  Frequency,
  MapLink,
  MapNode,
  Middle,
  NetInterface,
  NetProduct,
  Network,
  ProductField,
  ProductSettings,
  ProtocolKey,
  Role,
  SensorType,
  Topology,
} from "./types";

export type PartLike = { name: string; role?: string; category: string };

const text = (p: PartLike) => `${p.name} ${p.role ?? ""}`.toLowerCase();

// ───────────────────────── parts → capabilities ─────────────────────────

export function detectMcu(parts: PartLike[]): string | null {
  const mcu = parts.find((p) => p.category === "Microcontroller");
  return mcu ? mcu.name.trim() : null;
}

/** Radios named by the parts list. An ESP32 carries Wi-Fi, BLE and ESP-NOW
 *  on the die; an ESP8266 Wi-Fi and ESP-NOW. Anything else has to be a part
 *  of its own. Nothing is assumed for a part the list does not name. */
const RADIO_RULES: [RegExp, ProtocolKey[]][] = [
  [/esp32(?!-s2)/, ["WF", "BL", "EN"]],
  [/esp32-s2/, ["WF", "EN"]],
  [/esp8266|esp-?12|esp-?01/, ["WF", "EN"]],
  [/wi-?fi|wlan|cc3200|rtl87|atwinc|pico ?w/, ["WF"]],
  [/\bble\b|bluetooth|nrf52|hm-?10|hc-?0[56]/, ["BL"]],
  [/zigbee|xbee|cc2530|cc2652|efr32/, ["ZB"]],
  [/\bthread\b|matter/, ["MT"]],
  [/lora|sx12[5-8]\d|rfm9[5-8]|ra-0[12]/, ["LR"]],
  [/\bcan\b|can bus|mcp2515|tja10\d\d|sn65hvd23/, ["CN"]],
  [/rs-?485|max3?485/, ["R5"]],
  [/rs-?232|max3?232/, ["R2"]],
];

export function detectRadios(parts: PartLike[]): ProtocolKey[] {
  const found = new Set<ProtocolKey>();
  for (const part of parts) {
    const t = text(part);
    for (const [re, keys] of RADIO_RULES) if (re.test(t)) keys.forEach((k) => found.add(k));
  }
  return [...found];
}

// First match wins, so the combined sensors sit ahead of their halves.
const SENSOR_RULES: [RegExp, SensorType][] = [
  [/dht|sht\d|am23\d\d|bme280|bme680|hdc10|aht\d|si70\d\d|temp(?:erature)?\s*(?:&|\+|and|\/)\s*humid/, "temp-hum"],
  [/ds18b20|lm35|tmp\d|thermistor|ntc|max3185|thermocouple|temperature/, "temp"],
  [/humidity/, "hum"],
  [/pir|hc-?sr501|motion sensor|presence/, "pir"],
  [/reed|door sensor|magnetic switch|hall/, "reed"],
  [/soil|moisture/, "soil"],
  [/mq-?\d|co2|ccs811|scd4\d|\bgas\b|smoke|sgp\d/, "gas"],
  [/ldr|photoresistor|bh1750|tsl25|light sensor|lux|veml/, "light"],
  [/bmp\d|pressure|barometer|ms5611|lps\d/, "pressure"],
  [/ina2\d\d|acs7\d\d|current sensor|power monitor|pzem/, "current"],
  [/mpu-?\d|\bimu\b|accelerometer|gyro|lsm6|bno0\d\d|icm-?\d/, "imu"],
  [/hc-?sr04|ultrasonic|jsn-sr|maxbotix/, "ultrasonic"],
  [/\bir\b|infrared|tsop|vl53|time-of-flight/, "ir"],
  [/\bph\b|\bec\b sensor|conductivity|\btds\b/, "ph"],
  [/gps|gnss|neo-?\d|ublox/, "gps"],
  [/battery|fuel gauge|max170\d\d/, "battery"],
];

export function detectSensor(parts: PartLike[]): SensorType {
  for (const part of parts.filter((p) => p.category === "Sensor")) {
    const t = text(part);
    for (const [re, sensor] of SENSOR_RULES) if (re.test(t)) return sensor;
  }
  return "none";
}

const ACT_RULES: [RegExp, string][] = [
  [/fan|motor|esc\b|pump/, "speed"],
  [/led|lamp|bulb|light|dimmer/, "on / off · dim"],
  [/relay|switch|solenoid|valve/, "on / off"],
  [/servo|stepper|actuator/, "position"],
  [/display|oled|lcd|e-?paper|screen/, "display data"],
  [/buzzer|speaker|siren/, "alerts"],
];

export function detectActLabel(parts: PartLike[]): string {
  for (const part of parts.filter(
    (p) => p.category === "Actuator" || p.category === "Display & I/O",
  )) {
    const t = text(part);
    for (const [re, label] of ACT_RULES) if (re.test(t)) return label;
  }
  return "commands";
}

export function productFromParts(input: {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  parts: PartLike[];
}): NetProduct {
  const parts = input.parts;
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    imageUrl: input.imageUrl,
    mcu: detectMcu(parts),
    radios: detectRadios(parts),
    sensor: detectSensor(parts),
    senses: parts.some((p) => p.category === "Sensor"),
    acts: parts.some((p) => p.category === "Actuator" || p.category === "Display & I/O"),
    actLabel: detectActLabel(parts),
  };
}

/** "ESP32-S3 · BLE + Wi-Fi" — the Setup card's chip. Empty when the parts
 *  list names neither an MCU nor a radio. */
export function productChip(p: NetProduct): string {
  const radios = p.radios
    .map((k) => protocolInfo(k).radioLabel)
    .filter((l): l is string => !!l);
  const radio = [...new Set(radios)].join(" + ");
  return [p.mcu, radio].filter(Boolean).join(" · ");
}

/** Can this product speak that protocol, by its own parts? Wi-Fi + MQTT
 *  needs Wi-Fi; the on-board buses need nothing. A product with no parts
 *  listed is not second-guessed. */
export function speaks(p: NetProduct, protocol: ProtocolKey): boolean {
  if (protocol === "I2" || protocol === "SP") return true;
  if (!p.mcu && !p.radios.length) return true;
  const need = protocol === "WM" ? "WF" : protocol;
  return p.radios.includes(need);
}

// ───────────────────────── names ─────────────────────────

export function brokerName(cloudType: CloudType): string {
  return cloudType === "mqtt" ? "MQTT Broker" : cloudType === "none" ? "Broker" : "Cloud server";
}

export function nodeName(id: string, products: NetProduct[], cloudType: CloudType): string {
  if (id === "broker") return brokerName(cloudType);
  if (id === "app") return "App (APK)";
  return products.find((p) => p.id === id)?.name ?? "Removed product";
}

// ───────────────────────── link direction ─────────────────────────

/** The node that starts the conversation — the arrow's tail. */
export function starter(link: MapLink): string {
  return link.initiator === "target" ? link.to : link.from;
}

export function receiver(link: MapLink): string {
  return link.initiator === "target" ? link.from : link.to;
}

/** How a link looks from one of its ends. */
export function directionAt(link: MapLink, nodeId: string): "out" | "in" | "both" | null {
  if (link.from !== nodeId && link.to !== nodeId) return null;
  if (link.initiator === "both") return "both";
  return starter(link) === nodeId ? "out" : "in";
}

export function linkTitle(link: MapLink, name: (id: string) => string): string {
  const arrow = link.initiator === "both" ? "↔" : "→";
  return `${name(starter(link))} ${arrow} ${name(receiver(link))}`;
}

/** The end that sends the data a sensor / events link carries — the starter,
 *  or on a two-way link whichever end is a product. */
export function dataSender(link: MapLink, isProduct: (id: string) => boolean): string {
  if (link.initiator !== "both") return starter(link);
  return isProduct(link.from) ? link.from : link.to;
}

const touches = (l: MapLink, id: string) => l.from === id || l.to === id;

// ───────────────────────── roles (Figma Role rules) ─────────────────────────

export function pickMaster(productIds: string[], links: MapLink[]): string | null {
  const twoWay = (id: string, carries?: Carries[]) =>
    links.some(
      (l) =>
        touches(l, id) &&
        l.initiator === "both" &&
        (!carries || carries.includes(l.carries)),
    );
  return (
    productIds.find((id) => twoWay(id, ["sensor", "data+commands"])) ??
    productIds.find((id) => twoWay(id)) ??
    null
  );
}

export function roleOf(id: string, links: MapLink[], masterId: string | null): Role {
  const own = links.filter((l) => touches(l, id));
  if (!own.length) return "Standby";
  if (new Set(own.map((l) => l.protocol)).size >= 2) return "Gateway";
  const dirs = own.map((l) => directionAt(l, id));
  if (dirs.includes("both")) return id === masterId ? "Master" : "Peer";
  if (dirs.every((d) => d === "out")) return "Independent";
  if (dirs.every((d) => d === "in")) return "Slave";
  return "Peer";
}

export function rolesOf(
  productIds: string[],
  links: MapLink[],
  masterId: string | null,
): Record<string, Role> {
  return Object.fromEntries(productIds.map((id) => [id, roleOf(id, links, masterId)]));
}

export const ROLE_LABEL: Record<Role, string> = {
  Master: "Master",
  Slave: "Slave",
  Independent: "Independent",
  Peer: "Peer",
  Gateway: "Gateway",
  Standby: "Slave (Standby)",
};

/** The product form's Master field: itself for everything the Role rules
 *  put in charge of itself, else the network's master. */
export function masterFieldOf(role: Role, masterId: string | null): string {
  if (role === "Slave" || role === "Standby") return masterId ?? "";
  return "self";
}

// ───────────────────────── Q answers → fields ─────────────────────────

export const TOPOLOGY_OF_MIDDLE: Record<Middle, Topology> = {
  direct: "p2p",
  cloud: "star",
  gateway: "tree",
};

export function cloudTypeOfMiddle(middle: Middle, networkCloud: CloudType): CloudType {
  if (middle === "direct") return "none";
  return networkCloud === "none" ? "mqtt" : networkCloud;
}

export function carriesSensor(c: Carries): boolean {
  return c === "sensor" || c === "data+commands";
}

/** The arrow's words when nobody wrote them: the sender's sensor, or what
 *  the receiver does. */
export function defaultLabel(
  link: Pick<MapLink, "from" | "to" | "initiator" | "carries">,
  products: NetProduct[],
): string {
  const byId = (id: string) => products.find((p) => p.id === id);
  const l = link as MapLink;
  const sender = byId(dataSender(l, (id) => !!byId(id)));
  const target = byId(receiver(l));
  const payload = sender && sender.sensor !== "none" ? SENSOR_PAYLOAD[sender.sensor] : "data";
  switch (link.carries) {
    case "sensor":
      return payload;
    case "events":
      return sender?.sensor === "reed" || sender?.sensor === "pir" ? payload : "events";
    case "commands":
      return target?.actLabel ?? "commands";
    case "data+commands":
      return `${payload} · setpoint`;
  }
}

export type FilledRow = { label: string; value: string };

/** The link panel's "Filled in for you" — what the three answers set. */
export function filledIn(
  link: MapLink,
  network: Pick<Network, "cloudType">,
  products: NetProduct[],
): FilledRow[] {
  const name = (id: string) => nodeName(id, products, network.cloudType);
  const fromRole =
    link.initiator === "both" ? "Peer" : link.initiator === "source" ? "Master" : "Slave";
  const toRole =
    link.initiator === "both" ? "Peer" : link.initiator === "source" ? "Slave" : "Master";
  const isProduct = (id: string) => products.some((p) => p.id === id);
  const sender = products.find((p) => p.id === dataSender(link, isProduct));
  const sensor =
    link.carries === "commands"
      ? "—"
      : sender
        ? labelOf(SENSORS, sender.sensor)
        : "—";
  return [
    { label: `Source role (${name(link.from)})`, value: fromRole },
    { label: `Target role (${name(link.to)})`, value: toRole },
    { label: "Topology", value: TOPOLOGY_LABEL[TOPOLOGY_OF_MIDDLE[link.middle]] },
    { label: "Cloud type", value: labelOf(CLOUD_TYPES, cloudTypeOfMiddle(link.middle, network.cloudType)) },
    { label: "Sensor field", value: sensor },
  ];
}

const TOPOLOGY_LABEL: Record<Topology, string> = {
  star: "Star",
  mesh: "Mesh",
  bus: "Bus",
  p2p: "P2P",
  tree: "Tree",
  ring: "Ring",
};

export function topologyLabel(t: Topology): string {
  return TOPOLOGY_LABEL[t];
}

// ───────────────────────── Review auto-fill ─────────────────────────

export function frequencyFor(protocol: ProtocolKey, preferred: Frequency): Frequency {
  const allowed = protocolInfo(protocol).frequencies;
  return allowed.includes(preferred) ? preferred : allowed[0];
}

const AGENT_OF_ROLE: Record<Role, AgentPlacement> = {
  Master: "cloud",
  Gateway: "edge-gateway",
  Independent: "edge-product",
  Peer: "distributed",
  Slave: "none",
  Standby: "none",
};

/** Every field of one product's row, as the map implies it. */
export function autoSettings(
  product: NetProduct,
  network: Pick<Network, "links" | "masterId" | "protocol" | "frequency" | "repeater" | "topology" | "cloudType">,
): Omit<ProductSettings, "touched"> {
  const own = network.links.filter((l) => touches(l, product.id));
  const role = roleOf(product.id, network.links, network.masterId);
  const middles = own.map((l) => l.middle);
  const topology: Topology = !own.length
    ? network.topology
    : middles.includes("gateway")
      ? "tree"
      : middles.every((m) => m === "direct")
        ? role === "Peer" && own.length > 1
          ? "mesh"
          : "p2p"
        : "star";
  const protocols = [...new Set(own.map((l) => l.protocol))];
  const interfaces: NetInterface[] = (protocols.length ? protocols : [network.protocol]).map(
    (protocol) => ({ protocol, frequency: frequencyFor(protocol, network.frequency) }),
  );
  const repeater = interfaces.every((i) => protocolInfo(i.protocol).repeater)
    ? network.repeater
    : "none";
  const agent: AgentPlacement =
    role === "Master" && network.cloudType === "none" ? "edge-product" : AGENT_OF_ROLE[role];
  const sensor = product.sensor;
  const sharesData =
    sensor === "none" || agent === "none" || network.cloudType === "none" ? "off" : "full";
  return {
    topology,
    interfaces,
    repeater,
    sensor,
    agent,
    sharesData,
    redundancy: role === "Standby" ? "standby" : "none",
  };
}

/** The map's values under the maker's own edits — a field they changed
 *  stays what they made it. */
export function mergeSettings(
  auto: Omit<ProductSettings, "touched">,
  prev: ProductSettings | undefined,
): ProductSettings {
  if (!prev) return { ...auto, touched: [] };
  const out: ProductSettings = { ...auto, touched: prev.touched };
  for (const field of prev.touched) {
    (out as Record<ProductField, unknown>)[field] = prev[field];
  }
  return out;
}

export function settingsFor(
  products: NetProduct[],
  network: Pick<Network, "links" | "masterId" | "protocol" | "frequency" | "repeater" | "topology" | "cloudType" | "products">,
): Record<string, ProductSettings> {
  return Object.fromEntries(
    products.map((p) => [p.id, mergeSettings(autoSettings(p, network), network.products[p.id])]),
  );
}

// ───────────────────────── summaries ─────────────────────────

export function protocolsUsed(links: MapLink[]): ProtocolKey[] {
  return [...new Set(links.filter((l) => l.from !== "app" && l.to !== "app").map((l) => l.protocol))];
}

export function mapStatusLine(nodes: MapNode[], links: MapLink[]): string {
  const count = (k: MapNode["kind"]) => nodes.filter((n) => n.kind === k).length;
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const protocols = protocolsUsed(links).map((k) => protocolInfo(k).name);
  return [
    plural(links.length, "connection"),
    plural(count("product"), "product"),
    count("app") ? plural(count("app"), "app") : null,
    count("broker") ? plural(count("broker"), "broker") : null,
    protocols.length ? protocols.join(" + ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ───────────────────────── unsaved changes ─────────────────────────

export type Change = { count: number; text: string };

const linkKey = (l: MapLink) =>
  JSON.stringify([l.from, l.to, l.protocol, l.initiator, l.middle, l.carries, l.label, l.fromSide, l.toSide]);

/** What editing changed, one line per kind — "1 link added · Master
 *  changed to Smart Fan". */
export function diffNetworks(before: Network, after: Network, name: (id: string) => string): Change[] {
  const beforeIds = new Set(before.links.map((l) => l.id));
  const afterIds = new Set(after.links.map((l) => l.id));
  const added = after.links.filter((l) => !beforeIds.has(l.id)).length;
  const removed = before.links.filter((l) => !afterIds.has(l.id)).length;
  const changed = after.links.filter((l) => {
    const was = before.links.find((b) => b.id === l.id);
    return was && linkKey(was) !== linkKey(l);
  }).length;
  const moved = after.nodes.filter((n) => {
    const was = before.nodes.find((b) => b.id === n.id);
    return was && (was.x !== n.x || was.y !== n.y);
  }).length;
  const settings = Object.keys(after.products).filter(
    (id) => JSON.stringify(after.products[id]) !== JSON.stringify(before.products[id]),
  ).length;
  const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const out: Change[] = [];
  if (added) out.push({ count: added, text: `${added} ${s(added, "link", "links")} added` });
  if (removed) out.push({ count: removed, text: `${removed} ${s(removed, "link", "links")} removed` });
  if (changed) out.push({ count: changed, text: `${changed} ${s(changed, "link", "links")} changed` });
  if (after.masterId !== before.masterId)
    out.push({ count: 1, text: after.masterId ? `Master changed to ${name(after.masterId)}` : "Master cleared" });
  if (settings)
    out.push({ count: settings, text: `${settings} product ${s(settings, "setting", "settings")} changed` });
  if (moved) out.push({ count: moved, text: `${moved} ${s(moved, "box", "boxes")} moved` });
  return out;
}

// ───────────────────────── master change (spec D7) ─────────────────────────

/** Making another product the master. The old master's two-way links carry
 *  a setpoint loop only a master has, so they go; the new master's links
 *  become two-way, which is what makes it a master under the Role rules.
 *  Every other link and every product setting stays. */
export function masterChange(
  links: MapLink[],
  oldMaster: string | null,
  newMaster: string | null,
): { links: MapLink[]; removed: MapLink[] } {
  if (oldMaster === newMaster) return { links, removed: [] };
  const removed = oldMaster
    ? links.filter(
        (l) =>
          touches(l, oldMaster) &&
          l.initiator === "both" &&
          (!newMaster || !touches(l, newMaster)),
      )
    : [];
  const gone = new Set(removed.map((l) => l.id));
  const next = links
    .filter((l) => !gone.has(l.id))
    .map((l) =>
      newMaster && touches(l, newMaster) && l.initiator !== "both"
        ? { ...l, initiator: "both" as const, carries: "data+commands" as const }
        : l,
    );
  return { links: next, removed };
}

// ───────────────────────── what stops Create ─────────────────────────

export function sendsSensorData(productId: string, links: MapLink[], isProduct: (id: string) => boolean): boolean {
  return links.some(
    (l) => touches(l, productId) && carriesSensor(l.carries) && dataSender(l, isProduct) === productId,
  );
}

export type ProductStatus = { ready: boolean; text: string };

export function productStatus(
  product: NetProduct,
  settings: ProductSettings,
  links: MapLink[],
  isProduct: (id: string) => boolean,
): ProductStatus {
  if (settings.sensor === "none" && sendsSensorData(product.id, links, isProduct))
    return { ready: false, text: "Needs sensor type" };
  return { ready: true, text: "Ready" };
}

/** The first thing, read top-down, that stops the network being created —
 *  said under the button, where a keyboard and a touch screen reach it. */
export function createBlocker(
  network: Pick<Network, "cloudType" | "cloudPassword" | "links">,
  products: NetProduct[],
  settings: Record<string, ProductSettings>,
): string | null {
  if (!network.links.length) return "Draw at least one link on the canvas first.";
  if (network.cloudType !== "none" && !network.cloudPassword.trim())
    return "Add a cloud password — every product needs it to join the cloud.";
  const isProduct = (id: string) => products.some((p) => p.id === id);
  for (const p of products) {
    const s = settings[p.id];
    if (s && !productStatus(p, s, network.links, isProduct).ready)
      return `Pick a sensor type for ${p.name} — its link carries sensor data.`;
  }
  return null;
}
