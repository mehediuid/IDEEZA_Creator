import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { VideoJobsProvider } from "@/components/video-jobs/video-jobs-provider";
import { GlobalRenderIndicator } from "@/components/video-jobs/global-render-indicator";
import { ProductFlowProvider } from "@/components/product-flow/product-flow-provider";
import { PcbProvider } from "@/lib/pcb/store";
import { CreateHistoryProvider } from "@/lib/create/history";
import { CreatePlanProvider } from "@/lib/create/plan";
import { CreditsProvider } from "@/lib/create/credits";
import { ManualProjectsProvider } from "@/lib/manual/projects";
import { BuildSimulator } from "@/components/create/build-simulator";

export const metadata: Metadata = {
  title: "IDEEZA Creator Panel",
  description: "Creator dashboard built on the IDEEZA design system",
};

// ToastLayer — the one shared top-centre toast stack. GlobalRenderIndicator
// and BuildAttentionBanner live in different React subtrees (one hangs off
// the root, the other off nested route-group layouts) but must never paint
// on top of each other, so each portals its card into its own labelled slot
// here instead of self-positioning with `fixed`. Slot order is fixed
// (attention above render) regardless of which tree renders first.
function ToastLayer() {
  return (
    <div
      id="ideeza-toast-layer"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "var(--z-toast)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <div
        id="ideeza-toast-layer-attention"
        data-slot="attention"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      />
      <div
        id="ideeza-toast-layer-render"
        data-slot="render"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* PcbProvider lives at the root so the AppMenuBar inside the
              TopBar can read the existing buildMenus / buildMenus2D /
              buildMenus3D wiring (Edit/View/Place/.../Help) from any flow
              route — /pcb, /code, /3d, /preview, /brief. PcbApp doesn't
              re-wrap; the single root store is reused. */}
          <PcbProvider>
            {/* ManualProjectsProvider owns per-project state (name,
                description, flowState, status). ProductFlowProvider is
                now a thin view over the active project's flowState, so
                ManualProjectsProvider must sit OUTSIDE it. */}
            <ManualProjectsProvider>
              <ProductFlowProvider>
                <VideoJobsProvider>
                  {/* CreateHistoryProvider sits at the root so the home
                      hero (in the dashboard layout) can mint a new chat
                      session and route to it, AND the (create) routes
                      can read/mutate the same store. CreatePlanProvider
                      powers the QuotaCard on /history; CreditsProvider
                      powers the Credits card beside it and is where a
                      full-product build charges/refunds credits. */}
                  <CreatePlanProvider>
                    <CreditsProvider>
                      <CreateHistoryProvider>
                        {children}
                        {/* A build is a background job: it has to keep
                            running whatever page the user is on, so the
                            worker lives here rather than on the build
                            page. Renders nothing. */}
                        <BuildSimulator />
                        <GlobalRenderIndicator />
                      </CreateHistoryProvider>
                    </CreditsProvider>
                  </CreatePlanProvider>
                </VideoJobsProvider>
              </ProductFlowProvider>
            </ManualProjectsProvider>
          </PcbProvider>
        </ThemeProvider>
        <ToastLayer />
      </body>
    </html>
  );
}
