"use client";

// CommandPalette — ⌘K modal for IDEEZA's dashboard. Opens from the
// sidebar search row or via the global ⌘K shortcut. Flat list with
// per-row category meta on the right (matches the Blink reference) and
// optional keyboard shortcuts (⌘N for "Start a new project").
//
// Sections covered:
//   • Actions     — start a new project, open the quick-start tour
//   • Pages       — the 7 sidebar nav destinations
//   • Resources   — Tutorial / Tour guide / Help / Report a problem
//   • Theme       — Light / Dark / System
//   • Account     — Profile, Wallet, Settings, Upgrade, Sign out
//
// Keyboard:
//   • Arrow ↑ / ↓ moves selection
//   • Enter activates the highlighted command
//   • Esc closes the modal
//   • Typing filters by label (case-insensitive)

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Add01Icon,
  BookOpen01Icon,
  Bug01Icon,
  Compass01Icon,
  ComputerIcon,
  CpuIcon,
  CrownIcon,
  Folder01Icon,
  Home01Icon,
  HelpCircleIcon,
  HistoryIcon,
  Logout01Icon,
  Mail01Icon,
  Moon01Icon,
  MortarboardIcon,
  News01Icon,
  Rocket01Icon,
  Search01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  Sun01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { Icon, type IconValue } from "./icon";

type Command = {
  id: string;
  label: string;
  category: string;
  icon: IconValue;
  shortcut?: string;
  primary?: boolean;
  onActivate: () => void;
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const commands = React.useMemo<Command[]>(() => {
    const exit = (fn: () => void) => () => {
      fn();
      onClose();
    };
    const go = (href: string) => exit(() => router.push(href));
    return [
      // Actions
      {
        id: "new",
        label: "Start a new project",
        category: "Actions",
        icon: Add01Icon,
        shortcut: "⌘N",
        primary: true,
        onActivate: go("/"),
      },
      {
        id: "tour",
        label: "Open Quick start tour",
        category: "Actions",
        icon: Rocket01Icon,
        onActivate: exit(() => {}),
      },
      // Pages
      { id: "home", label: "Home", category: "Pages",
        icon: Home01Icon, onActivate: go("/") },
      { id: "history", label: "History", category: "Pages",
        icon: HistoryIcon, onActivate: go("/history") },
      { id: "history-builds", label: "Open project create history", category: "Pages",
        icon: HistoryIcon, onActivate: go("/history?tab=builds") },
      { id: "projects", label: "My projects", category: "Pages",
        icon: Folder01Icon, onActivate: go("/projects") },
      { id: "parts", label: "Parts & agile module", category: "Pages",
        icon: CpuIcon, onActivate: go("/parts") },
      { id: "marketplace", label: "Explore marketplace", category: "Pages",
        icon: ShoppingBag01Icon, onActivate: go("/marketplace") },
      { id: "innovations", label: "Innovations", category: "Pages",
        icon: News01Icon, onActivate: go("/innovations") },
      { id: "messages", label: "Messages", category: "Pages",
        icon: Mail01Icon, onActivate: go("/messages") },
      { id: "blog", label: "Blog", category: "Pages",
        icon: BookOpen01Icon, onActivate: go("/blog") },
      // Resources
      { id: "tutorial", label: "Open the tutorial", category: "Resources",
        icon: MortarboardIcon, onActivate: exit(() => {}) },
      { id: "tourguide", label: "Tour guide", category: "Resources",
        icon: Compass01Icon, onActivate: exit(() => {}) },
      { id: "help", label: "Help & support", category: "Resources",
        icon: HelpCircleIcon, onActivate: exit(() => {}) },
      { id: "bug", label: "Report a problem", category: "Resources",
        icon: Bug01Icon, onActivate: exit(() => {}) },
      // Theme
      { id: "theme-light", label: "Switch to Light theme", category: "Theme",
        icon: Sun01Icon, onActivate: exit(() => setTheme("light")) },
      { id: "theme-dark", label: "Switch to Dark theme", category: "Theme",
        icon: Moon01Icon, onActivate: exit(() => setTheme("dark")) },
      { id: "theme-system", label: "Match system theme", category: "Theme",
        icon: ComputerIcon, onActivate: exit(() => setTheme("system")) },
      // Account
      { id: "profile", label: "Profile", category: "Account",
        icon: User02Icon, onActivate: exit(() => {}) },
      { id: "wallet", label: "Wallet & tokens", category: "Account",
        icon: Wallet01Icon, onActivate: exit(() => {}) },
      { id: "settings", label: "Settings", category: "Account",
        icon: Settings01Icon, onActivate: exit(() => {}) },
      { id: "upgrade", label: "Upgrade to Pro", category: "Account",
        icon: CrownIcon, onActivate: exit(() => {}) },
      { id: "signout", label: "Sign out", category: "Account",
        icon: Logout01Icon, onActivate: exit(() => {}) },
    ];
  }, [router, setTheme, onClose]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset selection + scroll to top whenever the filter changes.
  React.useEffect(() => {
    setSelected(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [filtered]);

  // Focus the input every time the palette opens; reset state on close.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    // Defer focus so the modal renders first.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Keyboard nav within the palette.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) =>
          Math.min(i + 1, Math.max(0, filtered.length - 1)),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selected];
        if (cmd) cmd.onActivate();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, selected, onClose]);

  // Keep the selected row scrolled into view.
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-idx="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search commands, pages, and settings"
      onClick={onClose}
      className="fixed inset-0 z-modal flex items-start justify-center px-[16px] pt-[15vh]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-bg-page/60 backdrop-blur-sm"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-bg-surface shadow-3"
      >
        <div className="flex h-[56px] items-center gap-[12px] px-[20px]">
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={Search01Icon} size={20} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, pages, settings…"
            aria-label="Search"
            className="flex-1 bg-transparent text-md text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="inline-flex h-[24px] items-center rounded-md border border-border px-[8px] font-mono text-2xs font-medium text-text-tertiary">
            ESC
          </kbd>
        </div>

        <div aria-hidden className="border-t border-border" />

        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[420px] overflow-y-auto p-[8px]"
        >
          {filtered.length === 0 ? (
            <div className="px-[20px] py-[40px] text-center text-md text-text-tertiary">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <CommandRow
                key={cmd.id}
                cmd={cmd}
                index={idx}
                selected={selected === idx}
                onHover={() => setSelected(idx)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CommandRow({
  cmd,
  index,
  selected,
  onHover,
}: {
  cmd: Command;
  index: number;
  selected: boolean;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      data-cmd-idx={index}
      aria-selected={selected}
      onClick={cmd.onActivate}
      onMouseEnter={onHover}
      className={[
        "flex h-[48px] w-full items-center gap-[12px] rounded-md px-[12px] text-left outline-none transition-colors duration-fast",
        selected ? "bg-bg-surface-raised" : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "shrink-0",
          selected && cmd.primary
            ? "text-text-brand"
            : "text-text-secondary",
        ].join(" ")}
      >
        <Icon icon={cmd.icon} size={20} />
      </span>
      <span
        className={[
          "flex-1 truncate text-md text-text-primary",
          selected ? "font-medium" : "font-regular",
        ].join(" ")}
      >
        {cmd.label}
      </span>
      {cmd.shortcut ? (
        <kbd className="inline-flex h-[22px] items-center rounded border border-border px-[6px] font-mono text-2xs font-medium text-text-tertiary">
          {cmd.shortcut}
        </kbd>
      ) : (
        <span className="text-sm text-text-tertiary">{cmd.category}</span>
      )}
    </button>
  );
}
