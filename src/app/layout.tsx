import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { VideoJobsProvider } from "@/components/video-jobs/video-jobs-provider";
import { GlobalRenderIndicator } from "@/components/video-jobs/global-render-indicator";
import { ProductFlowProvider } from "@/components/product-flow/product-flow-provider";
import { FlowStepper } from "@/components/product-flow/flow-stepper";
import { PcbProvider } from "@/lib/pcb/store";

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
            <ProductFlowProvider>
              <VideoJobsProvider>
                {children}
                <FlowStepper />
                <GlobalRenderIndicator />
              </VideoJobsProvider>
            </ProductFlowProvider>
          </PcbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
