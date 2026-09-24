// The network a project's products form — which of them talk to each other,
// over which protocol, and what each one does (Figma "Add Network", section
// 44533:123190). One network per project, stored beside the project in this
// browser (see store.ts).

/** The twelve protocols, by the two-letter key the Figma protocol table and
 *  dropdown print beside each name. */
export type ProtocolKey =
  | "WF"
  | "WM"
  | "BL"
  | "EN"
  | "ZB"
  | "LR"
  | "MT"
  | "CN"
  | "R5"
  | "R2"
  | "I2"
  | "SP";

/** Setup's "What do you want to do?" — the network template. */
export type Intent = "ctrl" | "p2p" | "both" | "cloud";

export type Method = "ai" | "manual";

/** Who drew the map on screen: the model, the rule planner standing in for
 *  it, or the maker by hand. The banner says which — it never claims the AI
 *  drew a map it did not. */
export type MapSource = "ai" | "rules" | "manual";

/** Q1 · Who starts the conversation? — relative to the way the link was
 *  drawn (`from` is where the drawing started). */
export type Initiator = "source" | "target" | "both";
/** Q2 · Is anything in the middle? */
export type Middle = "direct" | "cloud" | "gateway";
/** Q3 · What travels on this link? */
export type Carries = "sensor" | "commands" | "events" | "data+commands";

export type Side = "top" | "right" | "bottom" | "left";

export type NodeKind = "product" | "broker" | "app";

/** A box on the map. A product node's id is the product's own id; the
 *  broker and the app are `"broker"` and `"app"`. */
export type MapNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** A broker drawn as a tall column beside the products it serves, so each
   *  arrow can meet it level with its product (Figma 05). */
  h?: number;
};

export type MapLink = {
  id: string;
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  protocol: ProtocolKey;
  initiator: Initiator;
  middle: Middle;
  carries: Carries;
  /** What the arrow carries, in a few words — "temp / humidity". */
  label: string;
};

export type Frequency = "2.4" | "5" | "868" | "915" | "433" | "na";
export type Topology = "star" | "mesh" | "bus" | "p2p" | "tree" | "ring";
export type CloudType = "mqtt" | "rest" | "ws" | "coap" | "amqp" | "none";
export type Repeater = "none" | "1" | "2" | "3" | "mesh";
export type SensorType =
  | "temp-hum"
  | "temp"
  | "hum"
  | "pir"
  | "reed"
  | "soil"
  | "gas"
  | "light"
  | "pressure"
  | "current"
  | "imu"
  | "ultrasonic"
  | "ir"
  | "ph"
  | "gps"
  | "battery"
  | "none";
export type AgentPlacement =
  | "cloud"
  | "edge-product"
  | "edge-gateway"
  | "distributed"
  | "none";
export type SharesData = "full" | "aggregated" | "alerts" | "off";
export type Redundancy = "none" | "standby" | "active-active" | "active-passive";

export type Role =
  | "Master"
  | "Slave"
  | "Independent"
  | "Peer"
  | "Gateway"
  | "Standby";

export type NetInterface = { protocol: ProtocolKey; frequency: Frequency };

/** One product's own network settings — the Review step's accordion row.
 *  Every field is filled in from the map; a field the maker changed is
 *  listed in `touched` and is no longer recomputed when the map changes. */
export type ProductSettings = {
  topology: Topology;
  interfaces: NetInterface[];
  repeater: Repeater;
  sensor: SensorType;
  agent: AgentPlacement;
  sharesData: SharesData;
  redundancy: Redundancy;
  touched: ProductField[];
};

export type ProductField = Exclude<keyof ProductSettings, "touched">;

export type Network = {
  version: 1;
  projectId: string;
  name: string;
  cloudName: string;
  cloudPassword: string;
  cloudType: CloudType;
  /** Network type — the default protocol, and the one new links take. */
  protocol: ProtocolKey;
  frequency: Frequency;
  topology: Topology;
  repeater: Repeater;
  /** The product every Slave answers to; null when nothing is in charge
   *  (a cloud-only network is all Independents). */
  masterId: string | null;
  intent: Intent;
  method: Method;
  mapSource: MapSource;
  productIds: string[];
  nodes: MapNode[];
  links: MapLink[];
  products: Record<string, ProductSettings>;
  createdAt: number;
  updatedAt: number;
};

/** A product as the network sees it: the project's product, with what its
 *  parts list says about it. Nothing here is guessed beyond the part names —
 *  a product with no parts has no MCU, no radio and no sensor. */
export type NetProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  mcu: string | null;
  /** Protocols its parts can speak (an ESP32 speaks Wi-Fi, BLE, ESP-NOW). */
  radios: ProtocolKey[];
  sensor: SensorType;
  /** It has a sensor part — it reports something. */
  senses: boolean;
  /** It has an actuator or output part — it can be told to do something. */
  acts: boolean;
  /** What its actuator does, for a command arrow's label ("on / off"). */
  actLabel: string;
};
