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
    <div className="flex h-dvh w-full overflow-hidden bg-bg-page font-sans text-text-primary">
      <DashboardSidebar onOpenSearch={() => setSearchOpen(true)} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none"
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
