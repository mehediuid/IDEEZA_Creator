// The browser-made clip (Phase 2 VIDEO P2-VIDEO-2, owner decision 9). The AI
// video model isn't connected, so the last render stage draws and encodes a
// real 10-second, 30 fps, silent file here, from the product's image and the
// take's three on-screen lines — a file the player can actually play.
//
// - Frames follow `framePlan` (lib/video/frames.ts): three scenes, 250 ms
//   cross-fades, a title band from 7.5 s.
// - Colours and the typeface are the design tokens, resolved with
//   getComputedStyle at render time, so this file holds no hex.
// - Encoding: WebCodecs `VideoEncoder` into an MP4 (mp4-muxer, MIT). The
//   codec is picked at plan time — H.264 first (plays everywhere), then VP9,
//   then AV1 — whichever this browser can encode. It runs faster than real
//   time and keeps going in a hidden tab.
// - Fallback: `canvas.captureStream()` + `MediaRecorder`, in real time. Its
//   WebM carries no duration, so the file's Duration is patched in
//   (`patchWebmDuration`) — without it `video.duration` reads Infinity.
// - Neither: `unsupported`.
//
// The project video (`renderJoin`, owner 2026-10-21) goes through the same two
// encoders: an intro card, each product's stored clip cut in order (seeked
// frame by frame, with a chapter label top left), an outro card, 250 ms
// cross-fades between them (`joinFrameAt`, lib/video/project-video.ts).
//
// Browser-only.

import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { getClip } from "@/lib/video/clip-store";
import { framePlan, type FramePlan } from "@/lib/video/frames";
import { INTRO_MS, joinFrameAt, joinLengthMs, type JoinSegment } from "@/lib/video/project-video";
import { VIDEO_QUALITY, type JoinPlan, type OnScreenLines, type VideoQuality } from "@/lib/video/types";

export type ClipInput = {
  lines: OnScreenLines;
  imageUrl: string | null;
  productName: string;
  quality: VideoQuality;
};

export type JoinInput = {
  plan: JoinPlan;
  /** Titles the intro when its first line is blank. */
  projectName: string;
  quality: VideoQuality;
};

export type RenderedClip = {
  video: Blob;
  poster: Blob;
  mime: string;
  width: number;
  height: number;
  durationMs: number;
  usedImage: boolean;
};

export type ClipRenderFailure = "unsupported" | "encode" | "cancelled";

export class ClipRenderError extends Error {
  constructor(
    readonly kind: ClipRenderFailure,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = "ClipRenderError";
  }
}

const FPS = 30;
const SECONDS = 10;
const FRAME_US = 1_000_000 / FPS;
const POSTER_SEC = 1.5;
const SCENE_STARTS = [0, 3, 6] as const;
/** A product clip that hasn't loaded by then fails the project video. */
const SOURCE_LOAD_MS = 15_000;
/** A seek that never reports back: the frame it has is drawn after this. */
const SEEK_TIMEOUT_MS = 1_000;
/** More stuck seeks in a row than this: the clip won't seek, and the take fails. */
const SEEK_STALLS_MAX = 3;

// ─────────────────────────── what this browser can do ───────────────────────────

function hasWebCodecs(): boolean {
  return typeof window !== "undefined" && typeof window.VideoEncoder === "function" && typeof window.VideoFrame === "function";
}

function hasRecorder(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder === "function" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

/** False when neither encoder path exists: the take fails as `unsupported`. */
export function canMakeClips(): boolean {
  return hasWebCodecs() || hasRecorder();
}

type CodecPlan = { muxer: "avc" | "vp9" | "av1"; config: VideoEncoderConfig };

async function planCodec(width: number, height: number): Promise<CodecPlan | null> {
  const bitrate = height >= 720 ? 3_000_000 : 1_200_000;
  const base = { width, height, bitrate, framerate: FPS };
  const candidates: CodecPlan[] = [
    // Constrained Baseline, level 3.1: up to 1280×720 at 30 fps.
    { muxer: "avc", config: { ...base, codec: "avc1.42001f", avc: { format: "avc" } } },
    { muxer: "vp9", config: { ...base, codec: "vp09.00.10.08" } },
    { muxer: "av1", config: { ...base, codec: "av01.0.04M.08" } },
  ];
  for (const c of candidates) {
    try {
      const res = await VideoEncoder.isConfigSupported(c.config);
      if (res.supported) return c;
    } catch {
      // A codec string this browser doesn't know: try the next.
    }
  }
  return null;
}

// ─────────────────────────── tokens ───────────────────────────

type Stop = { color: string; at: number | null };
type Gradient = { angleDeg: number; stops: Stop[] };
type Theme = { brand: Gradient | null; ai: Gradient | null; white: string; overlay: string; font: string };

/** Splits on commas that aren't inside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** `linear-gradient(135deg, <color> 0%, <color> 100%)` → angle and stops. */
function parseGradient(value: string): Gradient | null {
  const m = /linear-gradient\(([\s\S]*)\)\s*$/.exec(value.trim());
  if (!m) return null;
  const parts = splitTop(m[1]);
  let angleDeg = 180;
  if (parts.length && /deg\s*$/.test(parts[0])) angleDeg = parseFloat(parts.shift()!) || 0;
  const stops = parts.map((p): Stop => {
    const pm = /^(.*?)\s+(-?[\d.]+)%$/.exec(p);
    return pm ? { color: pm[1].trim(), at: parseFloat(pm[2]) / 100 } : { color: p, at: null };
  });
  return stops.length >= 2 ? { angleDeg, stops } : null;
}

function readTheme(): Theme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    brand: parseGradient(v("--gradient-brand")),
    ai: parseGradient(v("--gradient-ai")),
    white: v("--color-white") || v("--color-text-on-brand"),
    overlay: v("--color-bg-overlay"),
    font: v("--font-family-display") || v("--font-family-body") || "sans-serif",
  };
}

// ─────────────────────────── the product image ───────────────────────────

function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    let sameOrigin = true;
    try {
      sameOrigin = new URL(url, location.href).origin === location.origin;
    } catch {
      // A malformed URL fails to load below.
    }
    if (!sameOrigin) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** A cross-origin image without CORS taints the canvas and no frame can be
 *  read from it; the gradient stands in instead. */
function taints(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return false;
  } catch {
    return true;
  }
}

// ─────────────────────────── drawing ───────────────────────────

/** Draws the frame at `t` seconds; a project video's awaits its seeks. */
type Painter = (t: number) => void | Promise<void>;

/** What both painters draw with: the canvas, the token theme, and sizes
 *  authored at 360p (`k`). */
type Kit = {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  k: number;
  theme: Theme;
  font: (weight: number, px: number) => string;
  fillGradient: (g: Gradient | null) => void;
  wrap: (text: string, maxWidth: number, maxLines: number) => string[];
  scrim: (x: number, y: number, w: number, h: number, alpha: number) => void;
};

function makeKit(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme): Kit {
  const k = H / 360; // every size below is authored at 360p
  const font = (weight: number, px: number) => `${weight} ${Math.round(px * k)}px ${theme.font}`;

  const fillGradient = (g: Gradient | null) => {
    if (!g) {
      ctx.fillStyle = theme.overlay || "black";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    // CSS angles run clockwise from "to top"; the line passes through the centre.
    const a = (g.angleDeg * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const grad = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
    g.stops.forEach((s, i) => {
      const at = s.at ?? i / (g.stops.length - 1);
      try {
        grad.addColorStop(Math.min(1, Math.max(0, at)), s.color);
      } catch {
        // A colour the canvas can't parse: the other stops still paint.
      }
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  };

  const wrap = (text: string, maxWidth: number, maxLines: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
      return kept;
    }
    return lines;
  };

  const scrim = (x: number, y: number, w: number, h: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.overlay || "black";
    const r = 10 * k;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  };

  return { ctx, W, H, k, theme, font, fillGradient, wrap, scrim };
}

function makePainter(kit: Kit, input: ClipInput, img: HTMLImageElement | null): Painter {
  const { ctx, W, H, k, theme, font, fillGradient, wrap, scrim } = kit;

  const picture = (plan: FramePlan) => {
    if (img) {
      const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const s = base * plan.scale;
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      const x = (W - dw) / 2 - (plan.offsetX * (dw - W)) / 2;
      const y = (H - dh) / 2 - (plan.offsetY * (dh - H)) / 2;
      ctx.fillStyle = theme.overlay || "black";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, x, y, dw, dh);
      return;
    }
    // No image: the brand gradients, zooming and panning like the picture
    // would, with the product's name centred over them.
    ctx.save();
    ctx.translate(W / 2 - (plan.offsetX * W * (plan.scale - 1)) / 2, H / 2);
    ctx.scale(plan.scale, plan.scale);
    ctx.translate(-W / 2, -H / 2);
    fillGradient(plan.scene === 1 ? theme.ai : theme.brand);
    ctx.restore();
    if (plan.scene !== 2) {
      ctx.save();
      ctx.fillStyle = theme.white;
      ctx.font = font(700, 40);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = wrap(input.productName, W - 96 * k, 2);
      const lh = 48 * k;
      lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 24 * k + (i - (lines.length - 1) / 2) * lh));
      ctx.restore();
    }
  };

  const caption = (text: string) => {
    if (!text.trim()) return;
    ctx.save();
    ctx.font = font(600, 20);
    const lines = wrap(text, W - 112 * k, 2);
    const lh = 26 * k;
    const padX = 16 * k;
    const padY = 10 * k;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
    const h = lines.length * lh + padY * 2;
    const x = (W - w) / 2;
    const y = H - h - 24 * k;
    scrim(x, y, w, h, 0.62);
    ctx.fillStyle = theme.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + padY + lh * (i + 0.5)));
    ctx.restore();
  };

  const titleBand = (title: string, line: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const bandH = 112 * k;
    const y = H - bandH;
    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = theme.overlay || "black";
    ctx.fillRect(0, y, W, bandH);
    ctx.restore();
    ctx.fillStyle = theme.white;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = font(700, 30);
    const [name] = wrap(title, W - 64 * k, 1);
    ctx.fillText(name, 32 * k, y + 48 * k);
    if (line.trim()) {
      ctx.font = font(500, 18);
      const [sub] = wrap(line, W - 64 * k, 1);
      ctx.fillText(sub, 32 * k, y + 82 * k);
    }
    ctx.restore();
  };

  return (t: number) => {
    const plan = framePlan(t, input.lines, input.productName);
    if (plan.fade < 1) {
      // The scene before, at its last instant, under this one fading in.
      const prev = framePlan(SCENE_STARTS[plan.scene] - 0.001, input.lines, input.productName);
      picture(prev);
      ctx.save();
      ctx.globalAlpha = plan.fade;
      picture(plan);
      ctx.restore();
    } else {
      picture(plan);
    }
    if (plan.title) titleBand(plan.title, plan.line, Math.min(1, (t - 7.5) / 0.25));
    // On the gradient the name is already centred; a line that only repeats it isn't drawn twice.
    else if (img || plan.scene === 2 || plan.line.trim() !== input.productName.trim()) caption(plan.line);
  };
}

// ─────────────────────────── the project video ───────────────────────────

/** A product's stored clip as a frame source: muted, inline, loading at once. */
function sourceVideo(url: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  return v;
}

function sourceReady(v: HTMLVideoElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return resolve();
    let timer = 0;
    const settle = (err: ClipRenderError | null) => {
      window.clearTimeout(timer);
      v.removeEventListener("loadeddata", onData);
      v.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };
    const onData = () => settle(null);
    const onError = () => settle(new ClipRenderError("encode", "a product clip won't load"));
    const onAbort = () => settle(new ClipRenderError("cancelled"));
    v.addEventListener("loadeddata", onData);
    v.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
    timer = window.setTimeout(() => settle(new ClipRenderError("encode", "a product clip took too long to load")), SOURCE_LOAD_MS);
  });
}

function makeJoinPainter(
  kit: Kit,
  plan: JoinPlan,
  projectName: string,
  videos: HTMLVideoElement[],
  signal?: AbortSignal,
): Painter {
  const { ctx, W, H, k, theme, font, fillGradient, wrap, scrim } = kit;
  let stalls = 0;

  /** Resolves once `v` shows `sec` (clamped to the clip), or after the timeout with the frame it has. */
  const seek = (v: HTMLVideoElement, sec: number) =>
    new Promise<void>((resolve, reject) => {
      const end = Number.isFinite(v.duration) ? Math.max(0, v.duration - 0.001) : sec;
      const to = Math.max(0, Math.min(end, sec));
      if (!v.seeking && Math.abs(v.currentTime - to) < 0.0005) return resolve();
      let timer = 0;
      const settle = (stalled: boolean) => {
        window.clearTimeout(timer);
        v.removeEventListener("seeked", onSeeked);
        stalls = stalled ? stalls + 1 : 0;
        if (stalls > SEEK_STALLS_MAX) reject(new ClipRenderError("encode", "a product clip won't seek"));
        else resolve();
      };
      const onSeeked = () => settle(false);
      v.addEventListener("seeked", onSeeked);
      timer = window.setTimeout(() => settle(true), SEEK_TIMEOUT_MS);
      v.currentTime = to;
    });

  /** The intro and outro: the brand gradient, a big line, a smaller one beneath. */
  const card = (big: string, small: string) => {
    fillGradient(theme.brand);
    ctx.save();
    ctx.fillStyle = theme.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(500, 20);
    const smallLines = small.trim() ? wrap(small, W - 128 * k, 2) : [];
    ctx.font = font(700, 40);
    const bigLines = wrap(big, W - 96 * k, 2);
    const bigLh = 48 * k;
    const smallLh = 26 * k;
    const gap = smallLines.length ? 12 * k : 0;
    let y = (H - bigLines.length * bigLh - gap - smallLines.length * smallLh) / 2;
    bigLines.forEach((l, i) => ctx.fillText(l, W / 2, y + bigLh * (i + 0.5)));
    y += bigLines.length * bigLh + gap;
    ctx.font = font(500, 20);
    smallLines.forEach((l, i) => ctx.fillText(l, W / 2, y + smallLh * (i + 0.5)));
    ctx.restore();
  };

  /** The product's name, top left: its clip already carries a caption and title band at the bottom. */
  const chapter = (label: string) => {
    if (!label.trim()) return;
    ctx.save();
    ctx.font = font(600, 16);
    const [text] = wrap(label, W / 2, 1);
    const padX = 12 * k;
    const h = 30 * k;
    const x = 20 * k;
    const y = 20 * k;
    // Under a cross-fade the scrim fades with the rest of the frame.
    scrim(x, y, ctx.measureText(text).width + padX * 2, h, 0.62 * ctx.globalAlpha);
    ctx.fillStyle = theme.white;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + h / 2);
    ctx.restore();
  };

  const cut = async (seg: JoinSegment) => {
    const c = plan.cuts[seg.index];
    const v = videos[seg.index];
    // The middle of the frame's slot, so float rounding never lands on the frame before.
    await seek(v, (c.fromMs + seg.localMs) / 1000 + 0.5 / FPS);
    ctx.fillStyle = theme.overlay || "black";
    ctx.fillRect(0, 0, W, H);
    if (v.videoWidth && v.videoHeight) {
      const s = Math.max(W / v.videoWidth, H / v.videoHeight);
      const dw = v.videoWidth * s;
      const dh = v.videoHeight * s;
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    chapter(c.label);
  };

  const segment = async (seg: JoinSegment) => {
    if (seg.segment === "cut") return cut(seg);
    if (seg.segment === "intro") return card(plan.intro[0].trim() || projectName, plan.intro[1]);
    card(plan.outro, "");
  };

  return async (t: number) => {
    checkAbort(signal);
    const frame = joinFrameAt(plan, t);
    if (!frame.prev) return segment(frame);
    await segment(frame.prev);
    ctx.save();
    ctx.globalAlpha = frame.fade;
    await segment(frame);
    ctx.restore();
  };
}

// ─────────────────────────── helpers ───────────────────────────

/** Yields to the event loop without timer throttling (a hidden tab clamps
 *  setTimeout; a MessageChannel isn't). */
function yieldOnce(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      ch.port1.close();
      resolve();
    };
    ch.port2.postMessage(0);
  });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ClipRenderError("encode", "poster"))), "image/jpeg", 0.86),
  );
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new ClipRenderError("cancelled");
}

/** How long a clip runs, and the moment its poster is taken. */
type Timing = { seconds: number; posterSec: number };
type Encoded = { video: Blob; poster: Blob; mime: string; durationMs: number };

// ─────────────────────────── the WebCodecs path ───────────────────────────

async function encodeWithWebCodecs(
  canvas: HTMLCanvasElement,
  paint: Painter,
  plan: CodecPlan,
  timing: Timing,
  signal?: AbortSignal,
): Promise<Encoded> {
  const { width, height } = canvas;
  const frames = Math.round(timing.seconds * FPS);
  const posterFrame = Math.round(timing.posterSec * FPS);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: plan.muxer, width, height, frameRate: FPS },
    fastStart: "in-memory",
  });
  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e;
    },
  });
  encoder.configure(plan.config);
  let poster: Blob | null = null;
  try {
    for (let i = 0; i < frames; i++) {
      checkAbort(signal);
      if (failure) throw failure;
      await paint(i / FPS);
      if (i === posterFrame) poster = await toJpeg(canvas);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * FRAME_US), duration: Math.round(FRAME_US) });
      encoder.encode(frame, { keyFrame: i % FPS === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await yieldOnce();
      if (i % 15 === 0) await yieldOnce();
    }
    await encoder.flush();
    if (failure) throw failure;
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
  muxer.finalize();
  const buffer = muxer.target.buffer;
  if (!poster) throw new ClipRenderError("encode", "no poster");
  return {
    video: new Blob([buffer], { type: "video/mp4" }),
    poster,
    mime: "video/mp4",
    durationMs: Math.round(timing.seconds * 1000),
  };
}

// ─────────────────────────── the MediaRecorder fallback ───────────────────────────

function recorderMime(): string {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
}

async function encodeWithRecorder(
  canvas: HTMLCanvasElement,
  paint: Painter,
  timing: Timing,
  signal?: AbortSignal,
): Promise<Encoded> {
  await paint(0);
  const stream = canvas.captureStream(FPS);
  const mimeType = recorderMime();
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : null),
    videoBitsPerSecond: canvas.height >= 720 ? 3_000_000 : 1_200_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  let poster: Blob | null = null;
  let posterPending: Promise<void> | null = null;
  recorder.start(250);
  const t0 = performance.now();
  let elapsed = 0;
  try {
    // Real time: the recorder captures what the canvas shows as it shows it.
    while (elapsed < timing.seconds * 1000) {
      checkAbort(signal);
      await paint(elapsed / 1000);
      if (!poster && !posterPending && elapsed >= timing.posterSec * 1000) {
        posterPending = toJpeg(canvas).then((b) => {
          poster = b;
        });
      }
      await new Promise((r) => setTimeout(r, 1000 / FPS));
      elapsed = performance.now() - t0;
    }
    await paint(timing.seconds);
    elapsed = performance.now() - t0;
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    for (const track of stream.getTracks()) track.stop();
  }
  await stopped;
  await posterPending;
  checkAbort(signal);
  const type = recorder.mimeType || mimeType || "video/webm";
  let video = new Blob(chunks, { type });
  if (/webm/i.test(type)) {
    const patched = patchWebmDuration(await video.arrayBuffer(), elapsed);
    video = new Blob([patched], { type });
  }
  if (!poster) throw new ClipRenderError("encode", "no poster");
  return { video, poster, mime: type.split(";")[0], durationMs: Math.round(elapsed) };
}

// ─────────────────────────── WebM duration (EBML) ───────────────────────────

const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_DURATION = 0x4489;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const UNKNOWN_SIZE = -1;

type Vint = { value: number; length: number };

function readVint(b: Uint8Array, at: number, keepMarker: boolean): Vint | null {
  const first = b[at];
  if (first === undefined || first === 0) return null;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || at + length > b.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + b[at + i];
    if (b[at + i] !== 0xff) allOnes = false;
  }
  return { value: !keepMarker && allOnes ? UNKNOWN_SIZE : value, length };
}

/** An 8-byte size vint, so a rewritten size always fits where it goes. */
function sizeVint8(size: number): Uint8Array {
  const out = new Uint8Array(8);
  out[0] = 0x01;
  let v = size;
  for (let i = 7; i >= 1; i--) {
    out[i] = v % 256;
    v = Math.floor(v / 256);
  }
  return out;
}

function float64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, value, false);
  return out;
}

/**
 * MediaRecorder's WebM has no Segment › Info › Duration, so a player reads the
 * clip's duration as Infinity. This writes `durationMs` into it: an existing
 * Duration is overwritten in place; a missing one is appended to Info, whose
 * size (and a known Segment size) are re-encoded to match. A buffer that
 * doesn't parse comes back unchanged.
 */
export function patchWebmDuration(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  const b = new Uint8Array(buffer);
  // EBML header, then the Segment.
  const headId = readVint(b, 0, true);
  const headSize = headId && readVint(b, headId.length, false);
  if (!headId || !headSize || headSize.value === UNKNOWN_SIZE) return buffer;
  const segAt = headId.length + headSize.length + headSize.value;
  const segId = readVint(b, segAt, true);
  if (!segId || segId.value !== ID_SEGMENT) return buffer;
  const segSize = readVint(b, segAt + segId.length, false);
  if (!segSize) return buffer;
  const segBody = segAt + segId.length + segSize.length;
  const segEnd = segSize.value === UNKNOWN_SIZE ? b.length : Math.min(b.length, segBody + segSize.value);

  // Find Info among the Segment's children.
  let at = segBody;
  while (at < segEnd) {
    const id = readVint(b, at, true);
    const size = id && readVint(b, at + id.length, false);
    if (!id || !size || size.value === UNKNOWN_SIZE) return buffer;
    const body = at + id.length + size.length;
    if (id.value === ID_INFO) {
      const infoEnd = body + size.value;
      let scale = 1_000_000;
      let durAt = -1;
      let durLen = 0;
      let c = body;
      while (c < infoEnd) {
        const cid = readVint(b, c, true);
        const csize = cid && readVint(b, c + cid.length, false);
        if (!cid || !csize || csize.value === UNKNOWN_SIZE) return buffer;
        const cbody = c + cid.length + csize.length;
        if (cid.value === ID_TIMECODE_SCALE) {
          let v = 0;
          for (let i = 0; i < csize.value; i++) v = v * 256 + b[cbody + i];
          if (v > 0) scale = v;
        } else if (cid.value === ID_DURATION) {
          durAt = cbody;
          durLen = csize.value;
        }
        c = cbody + csize.value;
      }
      const ticks = (durationMs * 1_000_000) / scale;
      if (durAt !== -1 && (durLen === 8 || durLen === 4)) {
        const view = new DataView(buffer.slice(0));
        if (durLen === 8) view.setFloat64(durAt, ticks, false);
        else view.setFloat32(durAt, ticks, false);
        return view.buffer;
      }
      // Append Duration (id 0x4489, size 8, float64) at the end of Info.
      const element = new Uint8Array([0x44, 0x89, 0x88, ...float64(ticks)]);
      const newInfoSize = size.value + element.length;
      const infoSizeBytes = sizeVint8(newInfoSize);
      const segSizeBytes = segSize.value === UNKNOWN_SIZE ? null : sizeVint8(segSize.value + element.length + (8 - size.length));
      const parts: Uint8Array[] = [
        b.subarray(0, segAt + segId.length),
        segSizeBytes ?? b.subarray(segAt + segId.length, segBody),
        b.subarray(segBody, at + id.length),
        infoSizeBytes,
        b.subarray(body, infoEnd),
        element,
        b.subarray(infoEnd),
      ];
      const total = parts.reduce((n, p) => n + p.length, 0);
      const out = new Uint8Array(total);
      let o = 0;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      return out.buffer;
    }
    at = body + size.value;
  }
  return buffer;
}

// ─────────────────────────── the entry points ───────────────────────────

/** The token theme, once the faces the frames use have loaded. */
async function themeWithFonts(weights: number[]): Promise<Theme> {
  const theme = readTheme();
  try {
    await Promise.all(weights.map((w) => document.fonts?.load(`${w} 30px ${theme.font}`)));
  } catch {
    // The fallback face draws instead.
  }
  return theme;
}

function canvasFor(width: number, height: number, theme: Theme): { canvas: HTMLCanvasElement; kit: Kit } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new ClipRenderError("unsupported", "no 2d canvas");
  return { canvas, kit: makeKit(ctx, width, height, theme) };
}

/** WebCodecs when this browser can encode a codec, else the recorder, else `unsupported`. */
async function encode(canvas: HTMLCanvasElement, paint: Painter, timing: Timing, signal?: AbortSignal): Promise<Encoded> {
  const plan = hasWebCodecs() ? await planCodec(canvas.width, canvas.height) : null;
  if (plan) return encodeWithWebCodecs(canvas, paint, plan, timing, signal);
  if (hasRecorder()) return encodeWithRecorder(canvas, paint, timing, signal);
  throw new ClipRenderError("unsupported", "no encodable codec");
}

function asRenderError(e: unknown): ClipRenderError {
  return e instanceof ClipRenderError ? e : new ClipRenderError("encode", e instanceof Error ? e.message : String(e));
}

/**
 * Draws and encodes one take. Throws ClipRenderError: `unsupported` when this
 * browser has no encoder, `cancelled` when `signal` aborts, `encode` for
 * anything else that goes wrong. An image that won't load (a 404, a tainted
 * cross-origin file) isn't a failure — the gradient stands in.
 */
export async function renderClip(input: ClipInput, opts: { signal?: AbortSignal } = {}): Promise<RenderedClip> {
  if (!canMakeClips()) throw new ClipRenderError("unsupported");
  const { width, height } = VIDEO_QUALITY[input.quality];
  const loaded = await loadImage(input.imageUrl);
  const img = loaded && !taints(loaded) ? loaded : null;
  checkAbort(opts.signal);

  const theme = await themeWithFonts([700]);
  const { canvas, kit } = canvasFor(width, height, theme);
  const paint = makePainter(kit, input, img);

  try {
    const out = await encode(canvas, paint, { seconds: SECONDS, posterSec: POSTER_SEC }, opts.signal);
    return { ...out, width, height, usedImage: img !== null };
  } catch (e) {
    throw asRenderError(e);
  }
}

/**
 * Joins the products' stored clips into the project video: `joinLengthMs(plan)`
 * long, its poster 1.5 s into the first cut. Throws ClipRenderError like
 * renderClip; a product clip this browser doesn't hold, or one that won't load
 * or seek, is `encode`.
 */
export async function renderJoin(input: JoinInput, opts: { signal?: AbortSignal } = {}): Promise<RenderedClip> {
  if (!canMakeClips()) throw new ClipRenderError("unsupported");
  const { plan } = input;
  const { width, height } = VIDEO_QUALITY[input.quality];
  const urls: string[] = [];
  const videos: HTMLVideoElement[] = [];
  try {
    for (const cut of plan.cuts) {
      const rec = await getClip(cut.takeId);
      checkAbort(opts.signal);
      if (!rec) throw new ClipRenderError("encode", `no clip for ${cut.label}`);
      const url = URL.createObjectURL(rec.video);
      urls.push(url);
      const video = sourceVideo(url);
      videos.push(video);
      await sourceReady(video, opts.signal);
    }

    const theme = await themeWithFonts([700, 600, 500]);
    checkAbort(opts.signal);
    const { canvas, kit } = canvasFor(width, height, theme);
    const paint = makeJoinPainter(kit, plan, input.projectName, videos, opts.signal);
    const timing = { seconds: joinLengthMs(plan) / 1000, posterSec: INTRO_MS / 1000 + POSTER_SEC };
    const out = await encode(canvas, paint, timing, opts.signal);
    return { ...out, width, height, usedImage: true };
  } catch (e) {
    throw asRenderError(e);
  } finally {
    for (const v of videos) {
      v.removeAttribute("src");
      v.load();
    }
    for (const url of urls) URL.revokeObjectURL(url);
  }
}
