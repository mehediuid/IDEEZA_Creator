"use client";

// A six-digit code as six cells (Account AU-07, AU-12, AU-31). The DS has no
// code input, so each cell is a Text Input at 44 (the Figma note on MFR-13):
// border 1.5 input/border, radius/xl, the focus border and halo, the error
// border when the code is wrong. Typing moves on, Backspace moves back, a
// pasted or autofilled code fills them all (the number pad and one-time-code
// autofill on a phone).

import * as React from "react";
import { cn } from "@/lib/utils";
import { T } from "../type";

export function CodeCells({
  value,
  onChange,
  length = 6,
  invalid,
  disabled,
  autoFocus,
  label = "6-digit code",
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  React.useEffect(() => {
    if (autoFocus && !disabled) refs.current[Math.min(value.length, length - 1)]?.focus();
    // Only on arrival and when the cells come back on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  const put = (at: number, digits: string) => {
    const chars = value.padEnd(length, " ").split("");
    let i = at;
    for (const d of digits) {
      if (i >= length) break;
      chars[i] = d;
      i += 1;
    }
    onChange(chars.join("").replace(/\s+$/, "").replace(/\s/g, ""));
    focusAt(i);
  };

  return (
    <div role="group" aria-label={label} className="flex gap-4">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (digits) put(i, digits.slice(-length));
          }}
          onPaste={(e) => {
            const digits = e.clipboardData.getData("text").replace(/\D/g, "");
            if (!digits) return;
            e.preventDefault();
            put(0, digits.slice(0, length));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              const at = value[i] ? i : i - 1;
              if (at < 0) return;
              onChange(value.slice(0, at) + value.slice(at + 1));
              focusAt(at);
            } else if (e.key === "ArrowLeft") focusAt(i - 1);
            else if (e.key === "ArrowRight") focusAt(i + 1);
          }}
          className={cn(
            T.section,
            "h-[44px] w-full min-w-0 flex-1 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-[var(--color-input-bg)] text-center text-[color:var(--color-input-text)] outline-none transition-[border-color,box-shadow] duration-fast",
            "disabled:cursor-not-allowed disabled:border-[var(--color-input-border-disabled)] disabled:bg-[var(--color-input-bg-disabled)] disabled:text-text-disabled",
            invalid
              ? "border-[var(--color-input-border-error)] focus:shadow-focus-danger"
              : "border-[var(--color-input-border)] focus:border-[var(--color-input-border-focus)] focus:shadow-focus-brand",
          )}
        />
      ))}
    </div>
  );
}
