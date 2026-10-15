"use client";

// The post page's one toast (plan §7): "Comment posted", "Link copied",
// "Comment deleted · Undo". One at a time, bottom centre, above the phone's
// action bar; it never takes focus and is announced politely. A toast with
// Undo stays 6 s, the rest 4 s; a new one replaces the old.

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; text: string; undo?: () => void };
type Ctx = (text: string, undo?: () => void) => void;

const ToastContext = React.createContext<Ctx>(() => {});

export function usePostToast(): Ctx {
  return React.useContext(ToastContext);
}

export function PostToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<Toast | null>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const seq = React.useRef(0);
  const show = React.useCallback<Ctx>((text, undo) => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, text, undo });
    timer.current = window.setTimeout(() => setToast(null), undo ? 6000 : 4000);
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex justify-center px-8 pb-10 max-md:pb-[88px]">
        {toast && (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex max-w-[480px] items-center gap-8 rounded-xl bg-bg-inverse px-8 py-6 text-sm text-text-inverse shadow-3",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal",
            )}
          >
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  window.clearTimeout(timer.current);
                  setToast(null);
                }}
                className="inline-flex items-center rounded-md font-semibold text-text-inverse underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:px-4"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
