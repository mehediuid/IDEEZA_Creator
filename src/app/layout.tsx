import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { VideoJobsProvider } from "@/components/video-jobs/video-jobs-provider";
import { GlobalRenderIndicator } from "@/components/video-jobs/global-render-indicator";
import { ProductFlowProvider } from "@/components/product-flow/product-flow-provider";
import { PcbProvider } from "@/lib/pcb/store";
import { CreateHistoryProvider } from "@/lib/create/history";
import { CreatePlanProvider } from "@/lib/create/plan";
import { ManualProjectsProvider } from "@/lib/manual/projects";

export const metadata: Metadata = {
  title: "IDEEZA Creator Panel",
  description: "Creator dashboard built on the IDEEZA design system",
};

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
                      powers the QuotaCard on /history. */}
                  <CreatePlanProvider>
                    <CreateHistoryProvider>
                      {children}
                      <GlobalRenderIndicator />
                    </CreateHistoryProvider>
                  </CreatePlanProvider>
                </VideoJobsProvider>
              </ProductFlowProvider>
            </ManualProjectsProvider>
          </PcbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
