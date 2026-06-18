import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { VideoJobsProvider } from "@/components/video-jobs/video-jobs-provider";
import { GlobalRenderIndicator } from "@/components/video-jobs/global-render-indicator";

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
          <VideoJobsProvider>
            {children}
            <GlobalRenderIndicator />
          </VideoJobsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
