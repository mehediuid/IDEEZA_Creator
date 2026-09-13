# Ai-Flow parity · Plan 5 — Voice prompt

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the design's Listening state (dot + "Listening…", live 78-bar waveform, Cancel / Stop & review) on top of the shared `useVoiceInput` hook and use it in all three composers (audit §5).

**Architecture:** One `VoiceListening` component swaps in for the prompt-card body while `status === "listening"`. The hook (Plan 1 Task 3) owns recognition + microphone levels.

**Tech Stack:** as Plan 1. Web Speech API + Web Audio API.

## Global Constraints

Same as Plan 1. Copy source: audit §5 — verbatim; screenshots `voice*.png`. **Depends on Plan 1** (hook + composer rework). Motion 150–250 ms ease-out; `prefers-reduced-motion` → static bars.

---

### Task 1: `VoiceListening` component

**Files:**
- Create: `src/components/voice/voice-listening.tsx`

**Interfaces (produces):**
```tsx
export function VoiceListening(props: { levels: number[]; interim: string; onCancel: () => void; onStop: () => void; className?: string }): JSX.Element;
```
Design: container matches the prompt box (1.5 px border `--color-border-brand`, `--radius-2xl`, padding 16, gap 14). Header row: 10 px dot `--color-bg-brand` + **"Listening…"** (15 px semibold `--color-text-primary`). Waveform: 48 px tall flex row, 78 bars `w-[3px] gap-[3px] rounded-[2px]` `--color-bg-brand`; bar i height = `4 + 32 · levels[i]` px for the recorded region; the trailing 24 bars (no sample yet) at `opacity-20` height 4 px; when fewer than 78 samples exist, left-align the recorded ones. Optional interim transcript line under the waveform in `--color-text-secondary` (one line, truncated) — present in the hook, not in the design; show it only when non-empty. Footer: left **"Tap Stop when you're done"** (12 px `--color-text-tertiary`); right **"Cancel"** (ghost) · **"Stop & review"** (primary). `role="status"` `aria-live="polite"` on the header.

- [ ] **Step 1: Build it.**
- [ ] **Step 2: tsc; visual check in Task 2.**
- [ ] **Step 3: Commit** `feat(voice): VoiceListening — dot, live waveform, Cancel / Stop & review`.

---

### Task 2: Wire into the three composers + send states

**Files:** `src/components/dashboard/workspace-prompt.tsx`, `src/components/create/prompt-bar.tsx`, `src/components/create/image-editor-modal.tsx`

Behaviour: mic click → `start()`; while listening the textarea + toolbar are replaced by `VoiceListening`; **Cancel** → `cancel()`, previous text intact; **Stop & review** → `stop()` → `onFinal(text)` appends to the draft (space-joined), the composer returns and the textarea is focused with the caret at the end; the send control follows Plan 1's rule (disabled ai-magic when empty → enabled when text exists). Errors: `unsupported` → mic disabled with the existing tooltip; `denied` → inline line under the composer **"Microphone access was blocked — allow it in the browser to use voice."**; `failed` → "Voice input stopped unexpectedly — try again." Both lines in `--color-text-error`, dismissed on the next successful start.

- [ ] **Step 1: Home prompt card.**
- [ ] **Step 2: Chat `PromptBar` and refine overlay.**
- [ ] **Step 3: tsc + CDP**: launch Chrome with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`; click mic → "Listening…" + 78 bar elements; Cancel restores; Stop & review returns the textarea (SpeechRecognition may be unavailable headless — assert the UI transitions and the `denied/unsupported` lines by stubbing `window.SpeechRecognition` in the page).
- [ ] **Step 4: Update CLAUDE.md §5** ("AI create & build flow": voice listening state, shared hook) and STRUCTURE.md (`components/voice/`, `lib/voice/`).
- [ ] **Step 5: Commit** `feat(voice): listening state in every composer (Ai-Flow Voice 2–4); docs`.
