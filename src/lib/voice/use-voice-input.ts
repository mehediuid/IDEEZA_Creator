"use client";

// useVoiceInput — the app's single Web Speech dictation hook.
//
// Two surfaces dictate into a text box today (the home prompt card and
// the concept editor's "Describe edits" bar) and each carried its own
// copy of the same recogniser. One hook now owns it, and adds the two
// things a copy can't share: a live `interim` transcript while you talk
// and `levels`, the microphone's own loudness sampled from an
// AnalyserNode, so a caller can draw a real waveform instead of a
// decorative one.
//
// Contract: `start()` opens a continuous session, `stop()` ends it and
// fires `onFinal` once with everything that was said, `cancel()` ends it
// and discards. `status` says why nothing is happening — the browser has
// no SpeechRecognition ("unsupported"), the user refused the microphone
// ("denied"), or the session died ("failed").

import * as React from "react";

export type VoiceStatus =
  | "idle"
  | "listening"
  | "unsupported"
  | "denied"
  | "failed";

// The browser's SpeechRecognition, typed to the surface we use. The DOM
// lib doesn't declare it (it's still prefixed in Chrome).
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal?: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

// How many loudness samples a caller gets — one screenful of waveform.
const LEVEL_SAMPLES = 78;
// Sample at ~30 fps by taking every other animation frame.
const FRAME_SKIP = 2;

function recognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
}

export function useVoiceInput(opts: { onFinal: (text: string) => void }): {
  status: VoiceStatus;
  interim: string;
  levels: number[];
  start: () => void;
  stop: () => void;
  cancel: () => void;
  supported: boolean;
} {
  // The caller's callback may be a fresh closure every render; keep the
  // latest in a ref so a session opened earlier never fires a stale one.
  const onFinalRef = React.useRef(opts.onFinal);
  React.useEffect(() => {
    onFinalRef.current = opts.onFinal;
  });

  const [supported, setSupported] = React.useState(false);
  const [status, setStatus] = React.useState<VoiceStatus>("idle");
  const [interim, setInterim] = React.useState("");
  const [levels, setLevels] = React.useState<number[]>([]);

  const recogRef = React.useRef<SpeechRecognitionLike | null>(null);
  const finalRef = React.useRef("");
  const interimRef = React.useRef("");
  // Set while a session is ending, so `onend` can't fire onFinal twice
  // and a cancelled session can't fire it at all.
  const deliveredRef = React.useRef(false);

  const streamRef = React.useRef<MediaStream | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // Support is a client fact — resolve it after mount so SSR and the
  // first client render agree.
  React.useEffect(() => {
    const ok = !!recognitionCtor();
    setSupported(ok);
    if (!ok) setStatus("unsupported");
  }, []);

  const teardownAudio = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const track of streamRef.current?.getTracks() ?? []) {
      try {
        track.stop();
      } catch {}
    }
    streamRef.current = null;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => {});
    }
  }, []);

  // Microphone loudness: RMS of the time-domain samples, 0..1, kept to
  // the last LEVEL_SAMPLES readings (newest last).
  const startMeter = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
      }
      return;
    }
    streamRef.current = stream;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      frame += 1;
      if (frame % FRAME_SKIP !== 0) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sum / buf.length));
      setLevels((prev) => {
        const next = prev.length >= LEVEL_SAMPLES ? prev.slice(1) : prev.slice();
        next.push(rms);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // End the session. `discard` is cancel(); otherwise the accumulated
  // transcript (plus whatever was still interim) is delivered once.
  const end = React.useCallback(
    (discard: boolean) => {
      const r = recogRef.current;
      recogRef.current = null;
      if (r) {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        try {
          if (discard) r.abort();
          else r.stop();
        } catch {}
      }
      teardownAudio();
      setLevels([]);
      setInterim("");
      setStatus((s) => (s === "listening" ? "idle" : s));
      const said = [finalRef.current.trim(), interimRef.current.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();
      finalRef.current = "";
      interimRef.current = "";
      if (!discard && !deliveredRef.current && said) {
        deliveredRef.current = true;
        onFinalRef.current(said);
      }
    },
    [teardownAudio],
  );

  const start = React.useCallback(() => {
    if (recogRef.current) return;
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    finalRef.current = "";
    interimRef.current = "";
    deliveredRef.current = false;
    r.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res?.[0]?.transcript ?? "";
        if (!text) continue;
        if (res.isFinal) {
          finalRef.current = `${finalRef.current} ${text}`.trim();
        } else {
          pending += `${text} `;
        }
      }
      interimRef.current = pending.trim();
      setInterim(interimRef.current);
    };
    r.onerror = (e) => {
      const kind = e?.error;
      const denied = kind === "not-allowed" || kind === "service-not-allowed";
      // "no-speech"/"aborted" are ordinary ends, not failures.
      const failed = !denied && kind !== "no-speech" && kind !== "aborted";
      end(true);
      setStatus(denied ? "denied" : failed ? "failed" : "idle");
    };
    // The browser ends a session on its own (a long silence, or the OS
    // taking the mic). Deliver what was said rather than losing it.
    r.onend = () => {
      if (recogRef.current === r) end(false);
    };
    try {
      r.start();
    } catch {
      setStatus("failed");
      return;
    }
    recogRef.current = r;
    setStatus("listening");
    void startMeter();
  }, [end, startMeter]);

  const stop = React.useCallback(() => {
    if (!recogRef.current) return;
    end(false);
  }, [end]);

  const cancel = React.useCallback(() => {
    if (!recogRef.current) return;
    end(true);
  }, [end]);

  // Never leave the microphone open behind a closed surface.
  React.useEffect(() => {
    return () => {
      const r = recogRef.current;
      recogRef.current = null;
      if (r) {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        try {
          r.abort();
        } catch {}
      }
      teardownAudio();
    };
  }, [teardownAudio]);

  return { status, interim, levels, start, stop, cancel, supported };
}
