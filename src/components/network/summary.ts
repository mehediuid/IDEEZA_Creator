// Sentences and rows the network surfaces print about a saved network, so the
// project page, the Connection Map and the review card say the same thing.

import { AGENTS, CLOUD_TYPES, REDUNDANCIES, SENSORS, labelOf, protocolInfo } from "@/lib/network/catalog";
import {
  ROLE_LABEL,
  directionAt,
  nodeName,
  protocolsUsed,
  topologyLabel,
} from "@/lib/network/derive";
import type { NetProduct, Network, ProductSettings, Role } from "@/lib/network/types";

export function networkMeta(network: Network): string {
  const products = network.productIds.length;
  const protocols = protocolsUsed(network.links).map((k) => protocolInfo(k).name).join(" + ");
  return [
    `${products} ${products === 1 ? "product" : "products"}`,
    `${network.links.length} ${network.links.length === 1 ? "link" : "links"}`,
    protocols || null,
    topologyLabel(network.topology),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function networkSummaryRows(network: Network, products: NetProduct[]) {
  return [
    { label: "Cloud name", value: network.cloudType === "none" ? "—" : network.cloudName || "Not set" },
    { label: "Cloud type", value: labelOf(CLOUD_TYPES, network.cloudType) },
    { label: "Topology", value: topologyLabel(network.topology) },
    { label: "Master", value: network.masterId ? nodeName(network.masterId, products, network.cloudType) : "None" },
    { label: "Products · links", value: `${network.productIds.length} · ${network.links.length}` },
  ];
}

/** Figma 12's line under a product's name — its interfaces, and what it
 *  sends and receives, read off its own arrows. */
export function productSentence(product: NetProduct, network: Network, settings: ProductSettings): string {
  const own = network.links.filter((l) => l.from === product.id || l.to === product.id);
  const names = settings.interfaces.map((i) => protocolInfo(i.protocol).name).join(" + ");
  const cloud = own.some((l) => l.middle === "cloud") ? " to the cloud" : "";
  const sends = own.filter((l) => directionAt(l, product.id) !== "in").map((l) => l.label);
  const gets = own.filter((l) => directionAt(l, product.id) === "in").map((l) => l.label);
  const count = settings.interfaces.length;
  const parts = [`${count} ${count === 1 ? "interface" : "interfaces"} — ${names}${cloud}.`];
  if (sends.length) parts.push(`Sends ${sends.join(", ")}.`);
  if (gets.length) parts.push(`Receives ${gets.join(", ")}.`);
  if (!own.length) parts.push("No links yet — kept as a standby spare.");
  return parts.join(" ");
}

export function productSettingRows(settings: ProductSettings, role: Role) {
  return [
    { label: "Role", value: ROLE_LABEL[role] },
    { label: "Interfaces", value: settings.interfaces.map((i) => protocolInfo(i.protocol).name).join(" + ") },
    { label: "Sensor type", value: labelOf(SENSORS, settings.sensor) },
    { label: "Agent placement", value: labelOf(AGENTS, settings.agent) },
    { label: "Redundancy", value: labelOf(REDUNDANCIES, settings.redundancy) },
  ];
}
