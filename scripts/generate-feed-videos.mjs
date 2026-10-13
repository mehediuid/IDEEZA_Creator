// Render the sample Innovations posts' product videos, ONCE, and keep them as
// static files (owner, 2026-10-13: every post and every product opens on its
// video).
//
//   node scripts/generate-feed-videos.mjs            # render missing only
//   node scripts/generate-feed-videos.mjs --force    # render everything again
//
// One 10 s clip per sample post × product, at
// public/innovations/videos/<slug>--<productId>.mp4 — the path
// `sampleVideoSrc` in src/lib/innovations/sample-posts.ts points at. Each clip
// follows the app's own browser-made clip plan (src/lib/video/frames.ts):
// 0–3 s a slow zoom 1.00→1.08, 3–6 s held at 1.35 panning left to right,
// 6–10 s pulling back 1.20→1.00, one on-screen line per scene: the product's
// name, its summary, "Built with IDEEZA". The picture is the product's image,
// else the post's cover.
//
// Needs ffmpeg with libx264 on PATH (or FFMPEG=/path/to/ffmpeg) and a bold
// TrueType font (VIDEO_FONT, default macOS Arial Bold). It reads the posts by
// compiling src/lib with the unit tests' tsconfig, so it never drifts from them.

import { execFileSync, spawn } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const OUT_DIR = path.join(PUBLIC, "innovations", "videos");
const FORCE = process.argv.includes("--force");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FONT = process.env.VIDEO_FONT || "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
const CONCURRENCY = 4;

/** At most `max` characters, cut at a word, with an ellipsis when cut. */
function shortLine(text, max = 60) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

function filterOf(dir) {
  const text = (file, size, enable) =>
    `drawtext=fontfile='${FONT}':textfile=${path.join(dir, file)}:fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=h-62:enable='${enable}'`;
  return [
    "[0:v]scale=1708:960:force_original_aspect_ratio=increase,crop=1708:960",
    "zoompan=z='if(lt(on,72),1+0.08*on/72,if(lt(on,144),1.35,1.2-0.2*(on-144)/96))':x='if(between(on,72,143),(iw-iw/zoom)*(on-72)/71,(iw-iw/zoom)/2)':y='(ih-ih/zoom)/2':d=1:s=854x480:fps=24",
    "format=yuv420p",
    "drawbox=y=ih-96:w=iw:h=96:color=black@0.45:t=fill",
    text("l0.txt", 26, "lt(t,3)"),
    text("l1.txt", 22, "between(t,3,6)"),
    text("l2.txt", 24, "gte(t,6)"),
  ].join(",");
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `${cmd} exited ${code}`))));
  });
}

async function render(job) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ideeza-video-"));
  try {
    await fs.writeFile(path.join(dir, "l0.txt"), job.lines[0]);
    await fs.writeFile(path.join(dir, "l1.txt"), job.lines[1]);
    await fs.writeFile(path.join(dir, "l2.txt"), job.lines[2]);
    await run(FFMPEG, [
      "-y", "-loglevel", "error",
      "-loop", "1", "-i", job.image, "-t", "10",
      "-filter_complex", filterOf(dir),
      "-r", "24", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
      "-movflags", "+faststart", "-an", job.out,
    ]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  // The posts as the app reads them: compile src/lib the way the unit tests do.
  execFileSync("npx", ["tsc", "-p", "tests/projects/tsconfig.json"], { cwd: ROOT, stdio: "inherit" });
  const require = createRequire(import.meta.url);
  const { SAMPLE_POSTS, sampleVideoSrc } = require(path.join(ROOT, ".tmp-test", "lib", "innovations", "sample-posts.js"));

  await fs.mkdir(OUT_DIR, { recursive: true });
  const jobs = [];
  for (const post of SAMPLE_POSTS) {
    const cover = post.media.find((m) => m.kind === "image")?.src ?? null;
    for (const product of post.products) {
      const picture = product.image ?? cover;
      const out = path.join(PUBLIC, sampleVideoSrc(post.slug, product.id));
      if (!picture || !picture.startsWith("/")) {
        console.warn(`skip ${post.slug}/${product.id}: no local picture`);
        continue;
      }
      if (!FORCE && existsSync(out)) continue;
      jobs.push({
        out,
        image: path.join(PUBLIC, picture),
        lines: [shortLine(product.name, 40), shortLine(product.summary), "Built with IDEEZA"],
      });
    }
  }
  console.log(`${jobs.length} clip(s) to render`);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await render(job);
      done += 1;
      console.log(`  ${done}/${jobs.length} ${path.relative(ROOT, job.out)}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
