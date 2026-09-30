// The concept-stage network (docs/superpowers/specs/2026-09-30-concept-
// network-design.md): the rule fallback, the model's links, the radio →
// protocol mapping, Change link's radio edits, and the Network Save writes.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  APP,
  CLOUD,
  conceptLinks,
  conceptNetworkOf,
  connectsLine,
  endsLine,
  linkEditFor,
  parseNetworkReply,
  problemLine,
  protocolChange,
  protocolChoices,
  radioReset,
  rolesLine,
  rolesOf,
  travelsLine,
} from "../../.tmp-test/lib/create/concept-network.js";
import { projectState } from "../../.tmp-test/lib/create/project-state.js";
import { PROTOCOL_OF_RADIO, protocolOfRadio } from "../../.tmp-test/lib/network/catalog.js";
import { detectRadios, pickMaster, roleOf } from "../../.tmp-test/lib/network/derive.js";
import { networkForSave, networkFromConcept, builtLinks } from "../../.tmp-test/lib/network/from-concept.js";
import { networkProducts } from "../../.tmp-test/lib/network/products.js";
import { buildsOf } from "../../.tmp-test/lib/manual/project-read.js";
import { sanitizeNetwork } from "../../.tmp-test/lib/network/store.js";
import { effectiveParts } from "../../.tmp-test/lib/spec/derive.js";
import { radioKeyOf } from "../../.tmp-test/lib/spec/catalog.js";
import { T, build, companion, part, project, row } from "./fixtures/projects.mjs";

const p = (name, category, role = "") => ({ name, role, category });
const ESP32 = p("ESP32-WROOM-32", "Microcontroller");
const ATMEGA = p("ATmega328P", "Microcontroller");
const NRF = p("nRF24L01+ 2.4 GHz module", "Connectivity");
const LORA = p("SX1276 LoRa module", "Connectivity");
const MOTOR = p("TT gear motor", "Actuator");
const DRIVER = p("TB6612FNG motor driver", "Power Management");
const STICK = p("Dual-axis joystick", "Display & I/O");
const LED = p("1W LED", "Actuator");
const SOIL = p("Capacitive soil moisture sensor", "Sensor");
const TP = p("TP4056 charger", "Power Management");
const CELL = p("1S Li-Po battery", "Power Management");

/** A product as the network reads it; `speaks` is whether its parts name a
 *  radio, as ResolvedSpec.speaks is on a fresh concept. */
function end(id, name, parts, o = {}) {
  return {
    id,
    name,
    primary: id === "primary",
    parts,
    conceptParts: parts,
    speaks: o.speaks ?? radioKeyOf(parts) !== "none",
    locked: o.locked ?? false,
    edits: o.edits ?? {},
    turnId: o.turnId ?? `t-${id}`,
  };
}

const car = end("primary", "Car", [ESP32, MOTOR, DRIVER, NRF]);
const remote = end("remote-controller", "Remote controller", [ATMEGA, STICK, NRF]);

// ───────────────────────── the rule fallback ─────────────────────────

test("rule: a remote commands the car over their shared nRF24, and is its Master", () => {
  const links = conceptLinks([car, remote], {});
  assert.equal(links.length, 1);
  const [l] = links;
  assert.equal(l.from, "remote-controller");
  assert.equal(l.to, "primary");
  assert.equal(l.carries, "commands");
  assert.equal(l.twoWay, false);
  assert.equal(l.source, "rules");
  assert.equal(l.radio, "nrf24");
  assert.equal(l.protocol, "NR");
  assert.equal(l.problem, null);
  assert.equal(endsLine(l, [car, remote]), "Remote controller → Car");
  assert.equal(connectsLine(l), "nRF24 · 2.4 GHz · Direct");
  assert.equal(travelsLine(l, [car, remote]), "Steering and throttle commands");
  assert.equal(rolesLine(l, rolesOf(links), [car, remote]), "Remote controller: Master · Car: Slave");
  assert.equal(l.id, "primary~remote-controller");
});

test("rule: a drone's controller links, its battery charger doesn't", () => {
  const drone = end("primary", "Drone", [ESP32, p("Brushless motors (x4)", "Actuator"), NRF]);
  const ctl = end("controller", "Controller", [ATMEGA, STICK, NRF]);
  const charger = end("battery-charger", "Battery charger", [ESP32, TP]);
  const links = conceptLinks([drone, ctl, charger], {});
  assert.deepEqual(
    links.map((l) => [l.from, l.to, l.carries]),
    [["controller", "primary", "commands"]],
  );
});

test("rule: a sensor node reports its readings to the base station", () => {
  const node = end("primary", "Soil sensor node", [ESP32, SOIL, LORA]);
  const base = end("base-station", "Base station", [ESP32, LORA]);
  const links = conceptLinks([node, base], {});
  assert.equal(links.length, 1);
  const [l] = links;
  assert.deepEqual([l.from, l.to, l.carries, l.twoWay], ["primary", "base-station", "sensor", false]);
  assert.equal(connectsLine(l), "LoRa · Sub-GHz · Direct");
  assert.equal(travelsLine(l, [node, base]), "Soil moisture readings");
  assert.equal(rolesLine(l, rolesOf(links), [node, base]), "Soil sensor node: Independent · Base station: Slave");
});

test("rule: a lamp alone talks to the phone app over its radio — the cloud when the prompt asks", () => {
  const lamp = end("primary", "Lamp", [ESP32, LED]);
  const [l] = conceptLinks([lamp], { prompt: "a desk lamp" });
  assert.equal(l.to, APP);
  assert.equal(l.twoWay, true);
  assert.equal(l.carries, "data+commands");
  assert.equal(endsLine(l, [lamp]), "Lamp ↔ Phone app");
  assert.match(connectsLine(l), / · 2\.4 GHz · Direct$/);
  assert.equal(travelsLine(l, [lamp]), "Status and light commands");
  const [c] = conceptLinks([lamp], { prompt: "a lamp I can switch from anywhere" });
  assert.equal(c.to, CLOUD);
  assert.equal(endsLine(c, [lamp]), "Lamp ↔ Cloud");
  assert.match(connectsLine(c), /Through cloud$/);
});

test("rule: no radio anywhere is no link, and the section hides", () => {
  const lamp = end("primary", "Lamp", [ATMEGA, LED]);
  assert.deepEqual(conceptLinks([lamp], {}), []);
});

test("rule: a primary with no radio, commanded by a remote, says so on the link", () => {
  const plain = end("primary", "Car", [ATMEGA, MOTOR, DRIVER], { speaks: false });
  const [l] = conceptLinks([plain, remote], {});
  assert.deepEqual(l.problem, { kind: "no-radio", productId: "primary" });
  assert.equal(problemLine(l, [plain, remote]), "Car has no radio yet — pick a protocol to add one");
  assert.equal(connectsLine(l), null);
});

test("rule: two different radios can't talk yet", () => {
  const loraRemote = end("remote-controller", "Remote controller", [ATMEGA, STICK, LORA]);
  const [l] = conceptLinks([car, loraRemote], {});
  assert.deepEqual(l.problem, { kind: "mismatch" });
  assert.equal(problemLine(l, [car, loraRemote]), "These two can't talk yet — pick one protocol");
});

// ───────────────────────── the model's links ─────────────────────────

test("AI: links parse strictly — unknown names, bad carries and a missing twoWay are dropped", () => {
  const companions = [
    { id: "remote-controller", name: "Remote controller" },
    { id: "battery-charger", name: "Battery charger" },
  ];
  const reply = parseNetworkReply(
    {
      product: "RC car",
      links: [
        { from: "Remote controller", to: "RC car", carries: "commands", twoWay: true },
        { from: "Phone", to: "RC car", carries: "commands", twoWay: false },
        { from: "Battery charger", to: "main", carries: "power", twoWay: false },
        { from: "Battery charger", to: "main", carries: "data" },
        { from: "Remote controller", to: "RC car", carries: "data", twoWay: false },
      ],
      app: "tablet",
    },
    companions,
    "RC car",
  );
  assert.deepEqual(reply, {
    links: [{ from: "remote-controller", to: "primary", carries: "commands", twoWay: true }],
    app: null,
  });
  assert.equal(parseNetworkReply({ links: [{ from: "x", to: "y", carries: "commands", twoWay: true }] }, companions), null);
  assert.deepEqual(parseNetworkReply({ links: [], app: "cloud" }, []), { links: [], app: "cloud" });
});

test("AI: the model's link wins for the products it named; the rule answers the rest", () => {
  const base = end("base-station", "Base station", [ESP32, NRF]);
  const links = conceptLinks([car, remote, base], {
    reply: { links: [{ from: "remote-controller", to: "primary", carries: "data+commands", twoWay: true }], app: null },
  });
  assert.deepEqual(
    links.map((l) => [l.from, l.to, l.carries, l.twoWay, l.source]),
    [
      ["remote-controller", "primary", "data+commands", true, "ai"],
      ["primary", "base-station", "sensor", false, "rules"],
    ],
  );
});

test("AI: a lone product's app answer is used", () => {
  const lamp = end("primary", "Lamp", [ESP32, LED]);
  const [l] = conceptLinks([lamp], { reply: { links: [], app: "cloud" }, prompt: "a lamp" });
  assert.equal(l.to, CLOUD);
  assert.equal(l.source, "ai");
});

// ───────────────────────── radio → protocol ─────────────────────────

test("the radio → protocol mapping covers every spec radio, nRF24 and cellular included", () => {
  assert.deepEqual(PROTOCOL_OF_RADIO, {
    wifi: "WF",
    ble: "BL",
    "esp-now": "EN",
    nrf24: "NR",
    lora: "LR",
    zigbee: "ZB",
    cellular: "CL",
  });
  assert.equal(protocolOfRadio("none"), null);
  assert.equal(protocolOfRadio(null), null);
  assert.deepEqual(detectRadios([NRF]), ["NR"]);
  assert.deepEqual(detectRadios([p("SIM800L GSM module", "Connectivity")]), ["CL"]);
});

test("role rules: a product that only sends commands is the Master of the one it drives", () => {
  const links = [
    { id: "l", from: "r", to: "c", fromSide: "right", toSide: "left", protocol: "NR", initiator: "source", middle: "direct", carries: "commands", label: "" },
  ];
  const master = pickMaster(["r", "c"], links);
  assert.equal(master, "r");
  assert.equal(roleOf("r", links, master), "Master");
  assert.equal(roleOf("c", links, master), "Slave");
  // Outgoing events only stays Independent (Figma Role rules).
  const events = [{ ...links[0], carries: "events" }];
  assert.equal(roleOf("r", events, pickMaster(["r", "c"], events)), "Independent");
});

// ───────────────────────── Change link ─────────────────────────

test("a protocol change writes SpecEdits.radio on both products, and their parts follow", () => {
  const [l] = conceptLinks([car, remote], {});
  const choices = protocolChoices(l, [car, remote]);
  assert.ok(choices.includes("ble") && choices.includes("nrf24"));
  assert.ok(!choices.includes("esp-now"), "ESP-NOW needs an ESP on both ends");
  const edits = protocolChange(l, [car, remote], "ble");
  assert.deepEqual(
    edits.map((e) => [e.productId, e.edits.radio]),
    [
      ["remote-controller", "ble"],
      ["primary", "ble"],
    ],
  );
  for (const e of edits) {
    const peer = e.productId === "primary" ? car : remote;
    assert.equal(e.edits.basedOn, peer.turnId);
    assert.equal(radioKeyOf(effectiveParts(peer.conceptParts, "none", e.edits)), "ble");
  }
  // Already on nRF24: nothing to write.
  assert.deepEqual(protocolChange(l, [car, remote], "nrf24"), []);
});

test("Back to suggested puts an edited radio back to the concept's", () => {
  const edited = { ...remote, edits: { radio: "ble", basedOn: "t-remote-controller" } };
  const [l] = conceptLinks([car, edited], {});
  const reset = radioReset(l, [car, edited]);
  assert.deepEqual(reset.map((r) => r.productId), ["remote-controller"]);
  assert.equal(reset[0].edits.radio, undefined);
});

test("a direction and what-travels edit applies over the suggestion, and the suggestion is no edit", () => {
  const [l] = conceptLinks([car, remote], {});
  assert.equal(linkEditFor(l, { from: l.from, twoWay: false, carries: "commands" }), null);
  const edit = linkEditFor(l, { from: "primary", twoWay: true, carries: "data+commands" });
  assert.deepEqual(edit, { direction: { from: "primary", twoWay: true }, carries: "data+commands" });
  const [after] = conceptLinks([car, remote], { edits: { links: { [l.id]: edit } } });
  assert.deepEqual([after.from, after.to, after.twoWay, after.carries, after.edited], ["primary", "remote-controller", true, "data+commands", true]);
  assert.equal(endsLine(after, [car, remote]), "Car ↔ Remote controller");
});

// ───────────────────────── the section, off the project ─────────────────────────

function chatWith(turns, answer = { projectId: "", projectName: "Car", picked: ["remote-controller"] }) {
  return {
    id: "c1",
    title: "Car",
    createdAt: T,
    updatedAt: T,
    turns: [
      {
        id: "s1",
        role: "setup",
        prompt: "I want a remote control and car",
        status: "answered",
        productName: "Car",
        companions: [{ id: "remote-controller", name: "Remote controller", why: "Drives it." }],
        answer,
        ts: T,
      },
      ...turns,
    ],
  };
}
const drawn = (id, companionOf, parts, status = "ready") => ({
  id,
  role: "assistant",
  prompt: "x",
  kind: "fresh",
  status,
  imageUrl: status === "ready" ? `https://img.test/${id}.png` : undefined,
  ...(companionOf ? { companionOf } : {}),
  ...(status === "ready" ? { concept: { title: id, summary: "", description: "", parts } } : {}),
  ts: T,
});

test("the section: shown with the link once answered, working while a product is still drawing", () => {
  const ready = conceptNetworkOf(
    projectState(chatWith([drawn("a1", undefined, [ESP32, MOTOR, DRIVER, NRF]), drawn("a2", "remote-controller", [ATMEGA, STICK, NRF])])),
  );
  assert.equal(ready.show, true);
  assert.equal(ready.working, false);
  assert.equal(ready.links.length, 1);
  assert.deepEqual([...ready.onLink].sort(), ["primary", "remote-controller"]);
  const drawing = conceptNetworkOf(
    projectState(chatWith([drawn("a1", undefined, [ESP32, MOTOR, DRIVER, NRF]), drawn("a2", "remote-controller", [], "pending")])),
  );
  assert.equal(drawing.working, true);
  assert.equal(drawing.show, true);
  const none = conceptNetworkOf(
    projectState(chatWith([drawn("a1", undefined, [ATMEGA, LED])], { projectId: "", projectName: "Lamp", picked: [] })),
  );
  assert.equal(none.show, false);
});

// ───────────────────────── Save ─────────────────────────

function savedCar() {
  const job = build({
    id: "b1",
    chatId: "c1",
    title: "Car",
    createdAt: T,
    status: "ready",
    parts: [ESP32, MOTOR, DRIVER, NRF],
    companions: [companion({ id: "remote-controller", name: "Remote controller", parts: [ATMEGA, STICK, NRF] })],
  });
  const proj = project({
    id: "p1",
    name: "Car project",
    createdAt: T,
    builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
    products: [row("r1", "Car", "", "b1", "primary", T), row("r2", "Remote controller", "", "b1", "remote-controller", T)],
  });
  return { job, proj, products: networkProducts(proj, buildsOf(proj, [job])) };
}

test("the concept network becomes a Network that passes sanitizeNetwork", () => {
  const { job, proj, products } = savedCar();
  const chat = chatWith([]);
  const { links, ends } = builtLinks(job, chat);
  const net = networkFromConcept({ projectId: proj.id, name: proj.name, products, links, ends, now: T });
  assert.ok(net);
  assert.deepEqual(sanitizeNetwork(JSON.parse(JSON.stringify(net)), proj.id), net);
  assert.equal(net.intent, "p2p");
  assert.equal(net.method, "ai");
  assert.equal(net.mapSource, "rules");
  assert.equal(net.name, "Car project");
  assert.deepEqual(net.productIds.sort(), ["p-car", "p-remote-controller"]);
  assert.equal(net.links.length, 1);
  assert.deepEqual(
    [net.links[0].from, net.links[0].to, net.links[0].protocol, net.links[0].initiator, net.links[0].middle],
    ["p-remote-controller", "p-car", "NR", "source", "direct"],
  );
  assert.equal(net.masterId, "p-remote-controller");
  assert.deepEqual(Object.keys(net.products).sort(), ["p-car", "p-remote-controller"]);
  assert.deepEqual(net.products["p-car"].interfaces, [{ protocol: "NR", frequency: "2.4" }]);
  assert.deepEqual(net.nodes.map((n) => n.id).sort(), ["p-car", "p-remote-controller"]);
});

test("Save writes the network only when the project has none", () => {
  const { job, proj, products } = savedCar();
  const input = { projectId: proj.id, name: proj.name, products, job, chat: chatWith([]), now: T };
  const fresh = networkForSave({ ...input, existing: null });
  assert.ok(fresh);
  assert.equal(networkForSave({ ...input, existing: fresh }), null);
});

test("Save: a lone lamp's phone app link is a ctrl network with an app box and no broker", () => {
  const job = build({ id: "b2", chatId: "c2", title: "Lamp", createdAt: T, status: "ready", parts: [ESP32, LED] });
  const proj = project({
    id: "p2",
    name: "Lamp",
    createdAt: T,
    builds: [{ buildId: "b2", chatId: "c2", version: 1, savedAt: T }],
    products: [row("r1", "Lamp", "", "b2", "primary", T)],
  });
  const products = networkProducts(proj, buildsOf(proj, [job]));
  const net = networkForSave({ existing: null, projectId: "p2", name: "Lamp", products, job, chat: null, now: T });
  assert.equal(net.intent, "ctrl");
  assert.deepEqual(net.nodes.map((n) => n.kind).sort(), ["app", "product"]);
  assert.deepEqual([net.links[0].from, net.links[0].to, net.links[0].initiator], ["p-lamp", "app", "both"]);
});

test("Save: a link whose ends don't agree on a radio is left for the Connection Map", () => {
  const job = build({
    id: "b3",
    chatId: "c3",
    title: "Car",
    createdAt: T,
    status: "ready",
    parts: [ESP32, MOTOR, DRIVER, NRF],
    companions: [companion({ id: "remote-controller", name: "Remote controller", parts: [ATMEGA, STICK, LORA] })],
  });
  const proj = project({
    id: "p3",
    name: "Car",
    createdAt: T,
    builds: [{ buildId: "b3", chatId: "c3", version: 1, savedAt: T }],
    products: [row("r1", "Car", "", "b3", "primary", T), row("r2", "Remote controller", "", "b3", "remote-controller", T)],
  });
  const products = networkProducts(proj, buildsOf(proj, [job]));
  assert.equal(networkForSave({ existing: null, projectId: "p3", name: "Car", products, job, chat: null, now: T }), null);
  void CELL;
  void part;
});
