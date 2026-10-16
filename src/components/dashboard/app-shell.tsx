"use client";

// The app shell — the sidebar (left, 280 px or the 64 px rail), <main> beside
// it, the ⌘K palette and the build attention toast — around every page in the
// (dashboard) and (create) route groups.
//
// It is mounted once, by the root layout, and chooses itself by route group.
// Each group's layout used to hold its own copy, so walking the sidebar from a
// page in one group to a page in the other (Home → History, Innovations → My
// projects) unmounted the whole shell and built it again: the sidebar's state,
// and <main> with its scroll. The two groups are only folders now.
//
// Theme: respects the global ThemeProvider (light / dark / system). Users
// switch the theme from the profile menu inside the sidebar.
//
// Search: ⌘K (or ⌃K on non-mac) opens the CommandPalette from anywhere in the
// shell. The sidebar's Search row triggers the same modal.

import * as React from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { BuildAttentionBanner } from "@/components/create/attention-banner";
import { CommandPalette } from "./command-palette";
import { MainRouteEffects } from "./main-scroll";
import { DashboardSidebar } from "./sidebar";

/** The route groups whose pages sit in the shell. The editors and the package
 *  flow live outside them and keep their own chrome. */
const SHELL_GROUPS = new Set(["(dashboard)", "(create)"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const group = useSelectedLayoutSegment();
  if (group === null || !SHELL_GROUPS.has(group)) return children;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
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
    // sidebar beside it). On paper (an invoice's Print or save as PDF) only
    // the page prints.
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg-page font-sans text-text-primary md:flex-row print:block print:h-auto print:overflow-visible">
      {/* First in the document, so it is the first Tab stop — it sat after
          the whole sidebar, sixteen stops in, where skipping was pointless. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="contents print:hidden">
        <DashboardSidebar onOpenSearch={() => setSearchOpen(true)} />
      </div>
      {/* The scroll-padding is the height of a bar fixed or stuck over main
          while a page shows one (useMainScrollPadding), so focus never lands
          under it. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto outline-none [scroll-padding-bottom:var(--main-obscured-bottom,0px)] [scroll-padding-top:var(--main-obscured-top,0px)] print:overflow-visible"
      >
        {children}
      </main>
      <React.Suspense fallback={null}>
        <MainRouteEffects />
      </React.Suspense>
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <div className="contents print:hidden">
        <BuildAttentionBanner />
      </div>
    </div>
  );
}
