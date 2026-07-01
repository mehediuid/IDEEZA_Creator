// Generate real AI thumbnails for the Innovations feed, ONCE, and cache them.
//
//   node scripts/generate-feed-images.mjs            # generate missing only
//   node scripts/generate-feed-images.mjs --force    # regenerate everything
//
// Why a script (not per-request): image generation takes seconds per image —
// doing it on every page load would be slow. So we pre-generate, cache to
// /public/innovations/<slug>.<ext>, and the feed serves those static files
// (instant). The feed falls back to Unsplash (then a gradient) for any gap, so
// nothing ever shows broken.
//
// Providers (set IMAGE_PROVIDER in .env.local):
//   • pollinations  (default) — free, NO API key. Uses FLUX under the hood.
//   • openrouter             — paid; needs OPENROUTER_API_KEY + account credits.
//
// Safe to re-run: skips slugs that already have a file (unless --force) and
// rewrites src/lib/feed-image-manifest.ts from whatever images exist on disk.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "innovations");
const MANIFEST = path.join(ROOT, "src", "lib", "feed-image-manifest.ts");

const FORCE = process.argv.includes("--force");
// Pollinations' free tier serves ~1 request at a time (queue max 1), so go
// sequential with a gap between requests. OpenRouter tolerates more, but 1 is
// safe for both.
const CONCURRENCY = 1;
const INTER_REQUEST_DELAY_MS = 2000;
const MAX_RETRIES = 4;
const REQUEST_TIMEOUT_MS = 90_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── project seeds (kept in sync with src/lib/feed.ts SEEDS) ──────────────────
const SEEDS = [
  ["Hexapod walking robot", "robotics"],
  ["Soil moisture mesh network", "iot"],
  ["E-ink smartwatch", "wearables"],
  ["65W GaN charger board", "power"],
  ["Pocket synth + sequencer", "audio"],
  ["Line-following micro rover", "robotics"],
  ["Air quality room sensor", "iot"],
  ["Gesture-control glove", "wearables"],
  ["Solar MPPT controller", "power"],
  ["Lo-fi guitar pedal", "audio"],
  ["Robotic arm with haptics", "robotics"],
  ["Smart plant watering hub", "iot"],
  ["Heart-rate fitness band", "wearables"],
  ["Bench power supply 0-30V", "power"],
  ["Eurorack noise module", "audio"],
  ["Self-balancing two-wheeler", "robotics"],
  ["Door + window contact sensor", "iot"],
  ["AR caption glasses", "wearables"],
  ["USB-C power meter", "power"],
  ["Portable contact mic mixer", "audio"],
  ["Swarm beacon drone", "robotics"],
  ["LoRa weather station", "iot"],
  ["Posture-tracking pendant", "wearables"],
  ["18650 battery balancer", "power"],
  ["Tube preamp clone", "audio"],
  ["Quadruped pet companion", "robotics"],
  ["Desk occupancy tracker", "iot"],
  ["Sleep-stage ring", "wearables"],
  ["Wireless Qi charge pad", "power"],
  ["Granular sampler box", "audio"],
  ["Pick-and-place head", "robotics"],
  ["Greenhouse climate node", "iot"],
  ["Haptic navigation cuff", "wearables"],
  ["Supercapacitor jump pack", "power"],
  ["Modular drum machine", "audio"],
  ["Cable-driven gripper", "robotics"],
];

// Must match feed.ts slugify exactly.
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function buildPrompt(title, category) {
  return [
    `Professional product photograph of "${title}", a real-world ${category} electronics hardware project.`,
    "A single physical device or prototype as the hero subject, studio softbox lighting,",
    "shallow depth of field, clean minimal background, crisp macro detail, modern industrial design,",
    "exposed PCB and components where fitting. Photoreal, 4:3 framing.",
    "No text, no logos, no watermark, no people, no hands.",
  ].join(" ");
}

// ── tiny .env.local loader (no deps) ─────────────────────────────────────────
async function loadEnvLocal() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // no .env.local — rely on process.env
  }
}

// ── providers ────────────────────────────────────────────────────────────────

// Pollinations — free, no key. Returns the image bytes directly.
async function generatePollinations({ title, category, seed }) {
  const prompt = buildPrompt(title, category);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=800&height=600&nologo=true&model=flux&seed=${seed}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "image/*" } });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.retriable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) {
    const text = await res.text().catch(() => "");
    const err = new Error(`non-image response (${ct}): ${text.slice(0, 150)}`);
    err.retriable = true;
    throw err;
  }
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1500) throw new Error("image too small / empty");
  return { buffer, ext };
}

// OpenRouter — paid; needs OPENROUTER_API_KEY + credits.
async function generateOpenRouter({ apiKey, model, title, category }) {
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: buildPrompt(title, category) }],
    modalities: ["image", "text"],
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ideeza.app",
        "X-Title": "IDEEZA Innovations",
      },
      body,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    err.retriable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  let url = msg?.images?.[0]?.image_url?.url;
  if (!url && Array.isArray(msg.content)) {
    const part = msg.content.find((c) => c?.image_url?.url || c?.type === "image_url");
    url = part?.image_url?.url;
  }
  if (!url || !url.startsWith("data:")) {
    throw new Error(`no image (finish: ${data?.choices?.[0]?.finish_reason ?? "?"})`);
  }
  const m = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(url);
  if (!m) throw new Error("unrecognized image data URL");
  return { buffer: Buffer.from(m[2], "base64"), ext: EXT_BY_MIME[m[1]] ?? "png" };
}

async function withRetries(fn) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_RETRIES || e?.retriable === false) break;
      // 429 (busy queue) needs real breathing room on the free tier.
      const base = /HTTP 429/.test(String(e?.message)) ? 5000 : 1500;
      await sleep(base * attempt);
    }
  }
  throw lastErr;
}

async function findExisting(slug) {
  for (const ext of ["png", "jpg", "webp"]) {
    const p = path.join(OUT_DIR, `${slug}.${ext}`);
    try {
      await fs.access(p);
      return `${slug}.${ext}`;
    } catch {}
  }
  return null;
}

async function removeExisting(slug) {
  for (const ext of ["png", "jpg", "webp"]) {
    await fs.rm(path.join(OUT_DIR, `${slug}.${ext}`), { force: true });
  }
}

async function writeManifest() {
  const entries = [];
  for (const [title] of SEEDS) {
    const slug = slugify(title);
    const file = await findExisting(slug);
    if (file) entries.push([slug, `/innovations/${file}`]);
  }
  const body = entries
    .map(([slug, p]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(p)},`)
    .join("\n");
  const content = `// Generated-image manifest — slug → cached public path.
//
// AUTO-GENERATED by scripts/generate-feed-images.mjs. Do not edit by hand.
// Until the generator runs, this is empty and the feed falls back to Unsplash.
//
// This file is intentionally data-only and safe to import on the edge.

export const GENERATED_IMAGES: Record<string, string> = {
${body}
};
`;
  await fs.writeFile(MANIFEST, content, "utf8");
  return entries.length;
}

async function main() {
  await loadEnvLocal();
  const provider = (process.env.IMAGE_PROVIDER || "pollinations").toLowerCase();
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";

  if (provider === "openrouter" && !apiKey) {
    console.error("\n✖ IMAGE_PROVIDER=openrouter but OPENROUTER_API_KEY is missing.\n");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`▸ provider: ${provider}${provider === "openrouter" ? ` (${model})` : " (free, no key)"}`);
  console.log(`▸ output: public/innovations/  (${FORCE ? "force regenerate" : "skip existing"})\n`);

  const tasks = [];
  SEEDS.forEach(([title, category], idx) => {
    const slug = slugify(title);
    tasks.push({ slug, title, category, seed: idx + 1 });
  });

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i++];
      if (!FORCE && (await findExisting(task.slug))) {
        skipped++;
        console.log(`· skip   ${task.slug} (exists)`);
        continue;
      }
      try {
        const result = await withRetries(() =>
          provider === "openrouter"
            ? generateOpenRouter({ apiKey, model, ...task })
            : generatePollinations(task),
        );
        if (FORCE) await removeExisting(task.slug);
        await fs.writeFile(
          path.join(OUT_DIR, `${task.slug}.${result.ext}`),
          result.buffer,
        );
        ok++;
        console.log(`✓ ${task.slug}.${result.ext} (${(result.buffer.length / 1024).toFixed(0)} KB)`);
      } catch (e) {
        failed++;
        console.warn(`✖ ${task.slug}: ${String(e?.message ?? e).slice(0, 120)}`);
      }
      await sleep(INTER_REQUEST_DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const total = await writeManifest();
  console.log(
    `\nDone. generated ${ok}, skipped ${skipped}, failed ${failed}. Manifest lists ${total}/${SEEDS.length} image(s).`,
  );
  if (failed > 0) console.log("Re-run to retry the failed ones (existing images are skipped).");
  console.log("The Innovations feed uses the cached images (Unsplash for any gap).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
