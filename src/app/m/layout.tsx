import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { MobileRoot } from "@/components/mobile/mobile-root";

// The mobile prototype (/m), built from the mobile Figma (fKXxJ25dXvxWWa0kCKeSF4).
// It shares the web's stores and API routes; its screens are its own.

export const metadata: Metadata = {
  title: "IDEEZA",
  appleWebApp: { capable: true, title: "IDEEZA", statusBarStyle: "default" },
};

// Edge to edge on a phone, so the safe-area insets are real (notch, home bar);
// the keyboard shrinks the page on Android, so the foot rides on it.
export const viewport: Viewport = { viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  // The tab bar's AI orb loads with the page, so its slot is never empty while the app starts.
  preload("/m/ai-orb.svg", { as: "image", type: "image/svg+xml" });
  return <MobileRoot>{children}</MobileRoot>;
}
