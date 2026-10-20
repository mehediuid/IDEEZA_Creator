"use client";

// CommandPalette — ⌘K modal for IDEEZA's dashboard. Opens from the
// sidebar search row or via the global ⌘K shortcut. Flat list with
// per-row category meta on the right (matches the Blink reference) and
// every settings row by name (lib/settings/search.ts) once you type.
//
// Sections covered:
//   • Actions     — start a new project
//   • Pages       — the 7 sidebar nav destinations
//   • Resources   — Report a problem (the tutorial, tour and help pages
//                   aren't built yet, so they aren't listed)
//   • Theme       — Light / Dark / System
//   • Account     — Profile, Wallet, Settings, Plan & billing, Pricing
//   • Settings    — while typing: the matching settings rows, each opening
//                   its row (/settings/<page>#<row>) or its home elsewhere
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
  ComputerIcon,
  CpuIcon,
  CreditCardIcon,
  Folder01Icon,
  Home01Icon,
  HistoryIcon,
  Mail01Icon,
  Moon01Icon,
  News01Icon,
  Search01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  Sun01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { Icon, type IconValue } from "./icon";
import { openReportProblem } from "@/lib/support/open-report";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { searchSettings } from "@/lib/settings/search";
import { PLAN_HREF, PRICING_HREF } from "@/lib/create/credit-pricing";
import { logActivations } from "@/lib/data/activity-log";

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
  const { openManage } = useWalletRequest();
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
        primary: true,
        onActivate: go("/"),
      },
      // Pages
      { id: "home", label: "Home", category: "Pages",
        icon: Home01Icon, onActivate: go("/") },
      { id: "history", label: "History", category: "Pages",
        icon: HistoryIcon, onActivate: go("/history") },
      { id: "history-builds", label: "Open build history", category: "Pages",
        icon: HistoryIcon, onActivate: go("/history?tab=builds") },
      { id: "projects", label: "My projects", category: "Pages",
        icon: Folder01Icon, onActivate: go("/projects") },
      { id: "parts", label: "Parts & agile module", category: "Pages",
        icon: CpuIcon, onActivate: go("/parts") },
      { id: "marketplace", label: "Explore marketplace", category: "Pages",
        icon: ShoppingBag01Icon, onActivate: go("/marketplace") },
      { id: "innovations", label: "Innovations", category: "Pages",
        icon: News01Icon, onActivate: go("/innovations") },
      // Blog follows Innovations, as the sidebar lists them: the two places to share.
      { id: "blog", label: "Blog", category: "Pages",
        icon: BookOpen01Icon, onActivate: go("/blog") },
      { id: "messages", label: "Messages", category: "Pages",
        icon: Mail01Icon, onActivate: go("/messages") },
      // Resources
      { id: "bug", label: "Report a problem", category: "Resources",
        icon: Bug01Icon, onActivate: exit(openReportProblem) },
      // Theme
      { id: "theme-light", label: "Switch to Light theme", category: "Theme",
        icon: Sun01Icon, onActivate: exit(() => setTheme("light")) },
      { id: "theme-dark", label: "Switch to Dark theme", category: "Theme",
        icon: Moon01Icon, onActivate: exit(() => setTheme("dark")) },
      { id: "theme-system", label: "Match system theme", category: "Theme",
        icon: ComputerIcon, onActivate: exit(() => setTheme("system")) },
      // Account
      { id: "profile", label: "Profile", category: "Account",
        icon: User02Icon, onActivate: exit(() => router.push("/creators/me")) },
      { id: "wallet", label: "Wallet & tokens", category: "Account",
        icon: Wallet01Icon, onActivate: exit(openManage) },
      { id: "settings", label: "Settings", category: "Account",
        icon: Settings01Icon, onActivate: go("/settings") },
      { id: "plan", label: "Plan & billing", category: "Account",
        icon: CreditCardIcon, onActivate: go(PLAN_HREF) },
      { id: "pricing", label: "Pricing", category: "Account",
        icon: CreditCardIcon, onActivate: go(PRICING_HREF) },
    ];
  }, [router, setTheme, onClose, openManage]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    const matched = commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
    const settings: Command[] = searchSettings(q, 8).map((h) => ({
      id: `setting:${h.href}`,
      label: h.label,
      category: h.rowId ? `Settings · ${h.pageLabel}` : "Settings",
      icon: Settings01Icon,
      onActivate: () => {
        router.push(h.href);
        onClose();
      },
    }));
    return logActivations([...matched, ...settings], query);
  }, [commands, query, router, onClose]);

  // Reset selection whenever the filter changes (during render, so no second pass after
  // paint), and scroll the list back to its top.
  const [seenFiltered, setSeenFiltered] = React.useState(filtered);
  if (seenFiltered !== filtered) {
    setSeenFiltered(filtered);
    setSelected(0);
  }
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [filtered]);

  // Every opening starts empty, on the first command; focus goes to the input.
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }
  React.useEffect(() => {
    if (!open) return;
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
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
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
