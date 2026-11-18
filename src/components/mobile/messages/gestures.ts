"use client";

// The two touch gestures the Message tab adds to a tap: swipe a conversation
// row left to show its action (Archive · Unarchive, MS-05), and on a message,
// press and hold for its menu (MS-19, KIT-RB-05) or swipe it right to reply
// (KIT-KB-02b). A gesture only claims the pointer once it is clearly sideways,
// so the list and the thread still scroll; a swipe never also counts as a tap.

import * as React from "react";

const SLOP = 8;

/** Keeps the pointer's moves coming to this element; a pointer that already went up has none to keep. */
function capture(e: React.PointerEvent) {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    // Nothing to capture: the moves still arrive while the finger stays on the element.
  }
}
const HOLD_MS = 500;

type Start = { x: number; y: number; base: number; sideways: boolean | null };

export function useRowSwipe(actionWidth: number) {
  const [open, setOpen] = React.useState(false);
  const [drag, setDragState] = React.useState<number | null>(null);
  const dragNow = React.useRef<number | null>(null);
  const setDrag = (d: number | null) => {
    dragNow.current = d;
    setDragState(d);
  };
  const start = React.useRef<Start | null>(null);
  const swiped = React.useRef(false);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, base: open ? -actionWidth : 0, sideways: null };
      swiped.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (s.sideways === null) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        s.sideways = Math.abs(dx) > Math.abs(dy);
        if (!s.sideways) {
          start.current = null;
          return;
        }
        capture(e);
      }
      swiped.current = true;
      setDrag(Math.min(0, Math.max(-actionWidth, s.base + dx)));
    },
    onPointerUp: () => {
      start.current = null;
      const d = dragNow.current;
      if (d !== null) setOpen(d < -actionWidth / 2);
      setDrag(null);
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (swiped.current || open) {
        e.preventDefault();
        e.stopPropagation();
        swiped.current = false;
        if (open) setOpen(false);
      }
    },
  };

  return { offset: drag ?? (open ? -actionWidth : 0), dragging: drag !== null, open, close: () => setOpen(false), handlers };
}

const REPLY_AT = 48;
const REPLY_MAX = 72;

export function useBubbleGestures({ onHold, onReply }: { onHold: (() => void) | null; onReply: (() => void) | null }) {
  const [dx, setDxState] = React.useState(0);
  const dxNow = React.useRef(0);
  const setDx = (d: number) => {
    dxNow.current = d;
    setDxState(d);
  };
  const start = React.useRef<Start | null>(null);
  const timer = React.useRef<number | null>(null);
  const held = React.useRef(false);

  const stopTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  React.useEffect(() => stopTimer, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, base: 0, sideways: null };
      held.current = false;
      stopTimer();
      if (onHold) {
        timer.current = window.setTimeout(() => {
          held.current = true;
          start.current = null;
          onHold();
        }, HOLD_MS);
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const mx = e.clientX - s.x;
      const my = e.clientY - s.y;
      if (s.sideways === null) {
        if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return;
        stopTimer();
        s.sideways = Math.abs(mx) > Math.abs(my) && mx > 0 && !!onReply;
        if (!s.sideways) {
          start.current = null;
          return;
        }
        capture(e);
      }
      setDx(Math.max(0, Math.min(REPLY_MAX, mx)));
    },
    onPointerUp: () => {
      stopTimer();
      start.current = null;
      if (dxNow.current >= REPLY_AT) onReply?.();
      setDx(0);
    },
    onPointerCancel: () => {
      stopTimer();
      start.current = null;
      setDx(0);
    },
    // A hold already opened the menu: the release isn't also a tap (a photo's viewer).
    onClickCapture: (e: React.MouseEvent) => {
      if (!held.current) return;
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // A right click, or the browser's own long-press: the same menu, once.
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (held.current || !onHold) return;
      stopTimer();
      onHold();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!onHold) return;
      if (e.key === "Enter" || e.key === " " || e.key === "ContextMenu") {
        e.preventDefault();
        onHold();
      }
    },
  };

  return { offset: dx, replyArmed: dx >= REPLY_AT, handlers };
}
