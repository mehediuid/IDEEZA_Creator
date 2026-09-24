"use client";

// Dashboard route group — Blink-style shell. Two regions:
//   • Sidebar (left, fixed, 280px) — nav, upgrade, profile menu.
//   • Main   (right) — single centered prompt + Browse Project strip.
//
// Theme: respects the global ThemeProvider (light / dark / system).
// Users switch the theme from the profile menu inside the sidebar.
//
// Search: ⌘K (or ⌃K on non-mac) opens the CommandPalette from anywhere
// in the dashboard. The sidebar's Search row triggers the same modal.

import * as React from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { BuildAttentionBanner } from "@/components/create/attention-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Global ⌘K / ⌃K toggle.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    // A column at phone width (the bar over the page), a row from `md` (the
    // sidebar beside it).
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg-page font-sans text-text-primary md:flex-row">
      {/* First in the document, so it is the first Tab stop — it sat after
          the whole sidebar, sixteen stops in, where skipping was pointless. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      <DashboardSidebar onOpenSearch={() => setSearchOpen(true)} />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto outline-none"
      >
        {children}
      </main>
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <BuildAttentionBanner />
    </div>
  );
}
