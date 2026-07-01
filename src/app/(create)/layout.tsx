"use client";

// (create) route group — wraps /chat/[id], /build/[id], and the two
// /history surfaces. Reuses the dashboard sidebar so users can always
// navigate back to Home / Templates / etc. The CreateHistoryProvider
// is hoisted to the root layout so the home prompt can mint chats and
// route into them.

import * as React from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { BuildAttentionBanner } from "@/components/create/attention-banner";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);

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
