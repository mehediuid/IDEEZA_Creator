#!/usr/bin/env node
// Drives one mobile-prototype screen in headless Chrome over CDP (AGENTS.md ›
// Verification) at a phone's size, and saves a screenshot: what an agent
// building the /m prototype looks at instead of the shared browser pane.
//
//   node scripts/mobile-shot.mjs --url http://localhost:3111/m/kit --out /tmp/kit.png \
//     [--profile /tmp/m-profile] [--signin] [--steps steps.js] [--wait 1500] \
//     [--width 375 --height 812] [--dark]
//
// --profile  keeps localStorage between runs (a Chrome user-data dir); without
//            it every run starts from an empty browser.
// --signin   seeds a verified demo account ("Maya Karim", maya@demo.test) and
//            signs it in before the page loads, so the tabs open.
// --steps    a file of JS run in the page after it loads (top-level await is
//            fine: it is wrapped in an async function); its return value is
//            printed. Click, type, open sheets — then the screenshot is taken.
// --dark     prefers-color-scheme: dark (light otherwise).
// Prints {result, errors} as JSON: errors are console errors and uncaught
// exceptions. Exits 1 when Chrome can't start.
//
// Each run talks only to its own Chrome: Chrome picks a free debugging port
// (--remote-debugging-port=0) and writes it to <profile>/DevToolsActivePort,
// which is read here, so parallel runs never attach to each other's browser.
// At the end Chrome is closed over CDP and given up to 10 s to exit on its
// own, so the localStorage it wrote reaches a --profile before it is killed.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, []),
);

const url = String(args.url ?? "");
const out = String(args.out ?? join(tmpdir(), "mobile-shot.png"));
const width = Number(args.width ?? 375);
const height = Number(args.height ?? 812);
const wait = Number(args.wait ?? 1500);
if (!url) {
  console.error("--url is required");
  process.exit(1);
}

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = args.profile ? String(args.profile) : mkdtempSync(join(tmpdir(), "mshot-"));
// A port file left by an earlier run would point at a dead (or someone else's) Chrome.
rmSync(join(profile, "DevToolsActivePort"), { force: true });
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let exited = false;
const exit = new Promise((r) => chrome.once("exit", () => r((exited = true))));

/** The port this run's Chrome chose: the first line of <profile>/DevToolsActivePort. */
async function devtoolsPort() {
  const file = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 120; i++) {
    if (exited) throw new Error("Chrome exited before it started (is the profile in use by another Chrome?)");
    if (existsSync(file)) {
      const port = Number(readFileSync(file, "utf8").split("\n")[0]);
      if (port > 0) return port;
    }
    await sleep(250);
  }
  throw new Error("Chrome did not start");
}

async function target() {
  const port = await devtoolsPort();
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error("Chrome did not start");
}

let ws;
let seq = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
}

async function load(to) {
  await send("Page.navigate", { url: to });
  await sleep(wait);
}

try {
  // Node 22's own WebSocket (no dependency).
  ws = new WebSocket(await target());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400));
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push((msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 400));
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: args.dark ? "dark" : "light" }] });

  if (args.signin) {
    await load(new URL("/m/kit", url).href);
    await evaluate(`(() => {
      const now = Date.now();
      const accounts = JSON.parse(localStorage.getItem("ideeza:accounts") || "[]").filter((a) => a.email !== "maya@demo.test");
      accounts.push({ v: 1, firstName: "Maya", lastName: "Karim", email: "maya@demo.test", passwordHash: "x", salt: "x", birthDate: "", consentAt: now, createdAt: now, verifiedAt: now, source: "", sourceVia: "", sourceOther: "", sourceSkipped: true, nudgeClosed: true, country: "BD" });
      localStorage.setItem("ideeza:accounts", JSON.stringify(accounts));
      localStorage.setItem("ideeza:session", JSON.stringify({ v: 1, email: "maya@demo.test", at: now }));
      localStorage.setItem("ideeza:m:phone", JSON.stringify({ explored: true, faceIdOffered: true, faceIdPending: false, cameraAsked: true, photosAsked: true }));
      localStorage.setItem("ideeza:welcome-offer", JSON.stringify({ v: 1, byEmail: { "maya@demo.test": { startedAt: Date.now(), closedAt: Date.now(), usedAt: null } } }));
      return true;
    })()`);
  }
  await load(url);
  let result = null;
  if (args.steps) {
    const code = readFileSync(String(args.steps), "utf8");
    result = await evaluate(`(async () => { ${code}\n})()`);
    await sleep(Math.min(wait, 1200));
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(JSON.stringify({ out, result, errors }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ out: null, result: null, errors: [...errors, String(e)] }, null, 2));
  process.exitCode = 1;
} finally {
  // Close Chrome properly first and wait for it to exit (up to 10 s), so localStorage written
  // this run is flushed to the profile on disk; only a Chrome that hangs is killed.
  let closing = false;
  try {
    if (ws?.readyState === WebSocket.OPEN) {
      closing = true;
      await Promise.race([send("Browser.close"), sleep(3000)]);
    }
  } catch {
    // already gone
  }
  ws?.close();
  if (!exited && !closing) chrome.kill("SIGTERM");
  if (!exited) await Promise.race([exit, sleep(10_000)]);
  if (!exited) chrome.kill("SIGKILL");
  if (!args.profile) rmSync(profile, { recursive: true, force: true });
}
