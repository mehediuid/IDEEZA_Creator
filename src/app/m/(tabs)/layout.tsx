"use client";

// The five tabs (Figma Navbar Container): the tab bar stays mounted while you
// move between them, and the screen above it scrolls on its own. A running
// build's bar (AI create's build queue popups) shows on every tab, docked
// under the screen's header (ai/build-pill.tsx), never over its content.

import { BuildPill } from "@/components/mobile/ai/build-pill";
import { TabBarProvider } from "@/components/mobile/device";
import { TabBar } from "@/components/mobile/tab-bar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TabBarProvider value>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">{children}</div>
        <TabBar />
        <BuildPill />
      </div>
    </TabBarProvider>
  );
}
