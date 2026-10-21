import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { VideoJobsProvider } from "@/components/video-jobs/video-jobs-provider";
import { GlobalRenderIndicator } from "@/components/video-jobs/global-render-indicator";
import { ProductFlowProvider } from "@/components/product-flow/product-flow-provider";
import { PcbProvider } from "@/lib/pcb/store";
import { CreateHistoryProvider } from "@/lib/create/history";
import { CreatePlanProvider, PlanCredits } from "@/lib/create/plan";
import { CreditsProvider } from "@/lib/create/credits";
import { ManualProjectsProvider } from "@/lib/manual/projects";
import { MarketProvider } from "@/lib/market/market-store";
import { BuildSimulator } from "@/components/create/build-simulator";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { BuyCreditsProvider } from "@/components/credits/buy-credits";
import { VideosDialogHost } from "@/components/projects/make-videos";
import { ProjectVideoDialogHost } from "@/components/video-jobs/project-video-dialog";
import { PlanRunner } from "@/components/projects/business-plan/plan-runner";
import { CommerceRoot } from "@/components/commerce/commerce-root";
import { ReportProblemHost } from "@/components/support/report-problem";
import { AppShell } from "@/components/dashboard/app-shell";
import { NoticePopups } from "@/components/notifications/notice-popups";
import { SIDEBAR_PREPAINT } from "@/components/dashboard/sidebar-state";
import { APPEARANCE_PREPAINT } from "@/lib/settings/appearance";
import { AppearanceSync } from "@/components/settings/appearance-sync";

export const metadata: Metadata = {
  title: "IDEEZA Creator Panel",
  description: "Creator dashboard built on the IDEEZA design system",
};

// ToastLayer — the two toast stacks. GlobalRenderIndicator and
// BuildAttentionBanner live in different React subtrees (one hangs off the
// root, the other off the app shell around the pages), so each portals its card
// into its own labelled slot here instead of self-positioning with `fixed`.
// The attention toast is top-centre: it asks for something and goes away. A
// video render reports for minutes, and parked top-centre it sat over every
// page's heading and Back link for the whole render, so it has the
// bottom-right corner instead — where a background job's progress usually is.
function ToastLayer() {
  return (
    <>
      {/* At phone width it docks at the foot instead: top-centre it covered
          the menu button and the Canvas/Chat tabs, so nothing could be
          reached until the toast was dismissed. There it shares the foot
          with a render toast, so it stands on top of one when one is up
          (and of its "+N more videos" line under it, when there is one).
          From `md` it used to sit at top-16px, which the project page's own
          header then had to fit under — its title, action pair and Preview
          as buyer all sit on that same first row (spec §3.3, COR-8), and a
          two-line attention message reached as far as the button (COR-103,
          "the attention toast never covers the header primary"). No
          (create) page has a separate app bar above its own header (the
          shell is sidebar + `main`, `components/dashboard/app-shell.tsx`), so 132px clears
          every page's first row instead of measuring one page at a time.
          It spans main, not the window — attention-banner.tsx writes main's
          edges — so the toast centres on the page beside the sidebar. */}
      <div
        id="ideeza-toast-layer"
        className="pointer-events-none fixed bottom-[16px] left-[var(--toast-main-left,0px)] right-[var(--toast-main-right,0px)] z-toast flex flex-col items-center gap-[8px] px-[16px] max-md:[body:has(.ix-render-toast)_&]:bottom-[88px] max-md:[body:has(.ix-render-toast):has(.ix-render-more)_&]:bottom-[120px] md:bottom-auto md:top-[132px]"
      >
        <div
          id="ideeza-toast-layer-attention"
          data-slot="attention"
          className="flex max-w-full flex-col items-center gap-[8px]"
        />
      </div>
      <div
        id="ideeza-toast-layer-render"
        data-slot="render"
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: "var(--z-toast)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The sidebar's collapsed choice, on <html> before the first paint
            (sidebar-state.ts), so a collapsed sidebar never paints at 280. */}
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_PREPAINT }} />
        {/* Settings › Appearance's text size, contrast and motion, the same
            way (lib/settings/appearance.ts); AppearanceSync follows changes. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_PREPAINT }} />
      </head>
      <body>
        <AppearanceSync />
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
              {/* MarketProvider: listings, sales, bids and support, read by the
                  project page, My projects and Explore marketplace alike. */}
              <MarketProvider>
                {/* CommerceRoot: commerce's guards and record hooks, which
                    engineering asks without importing commerce, and the
                    commerce-split@1 storage migration. Renders nothing. */}
                <CommerceRoot />
                <ProductFlowProvider>
                  <VideoJobsProvider>
                    {/* CreateHistoryProvider sits at the root so the home
                        hero (in the dashboard layout) can mint a new chat
                        session and route to it, AND the (create) routes
                        can read/mutate the same store. CreatePlanProvider
                        holds the plan; CreditsProvider is where a
                        full-product build charges/refunds credits. */}
                    <CreatePlanProvider>
                      <CreditsProvider>
                        <CreateHistoryProvider>
                          {/* WalletProvider: the one Demo wallet dialog and
                              useWalletRequest(), inside the projects and
                              market stores its requests write to. */}
                          <WalletProvider>
                            {/* BuyCreditsProvider: the one Buy credits dialog,
                                opened in place from every shortfall. */}
                            <BuyCreditsProvider>
                              {/* The sidebar and <main> around every page of
                                  the (dashboard) and (create) groups: one
                                  shell, so moving between them never builds
                                  it again. */}
                              <AppShell>{children}</AppShell>
                              {/* The products' videos dialog a missing-video step
                                  opens (make-videos.tsx): here, so it outlives the
                                  step's row when the last video lands. */}
                              <VideosDialogHost />
                              {/* The Project video dialog, opened by
                                  openProjectVideoDialog() from a toast or a
                                  render's Try again, on any page. */}
                              <ProjectVideoDialogHost />
                              {/* Report a problem: one dialog for every page,
                                  editors included, since they sit outside
                                  the app shell. Opened by
                                  openReportProblem() from anywhere. */}
                              <ReportProblemHost />
                            </BuyCreditsProvider>
                          </WalletProvider>
                          {/* A build is a background job: it has to keep
                              running whatever page the user is on, so the
                              worker lives here rather than on the build
                              page. Renders nothing. */}
                          <BuildSimulator />
                          {/* The notices' pop-ups outside a hidden tab and
                              the once-a-day summary, editors included. */}
                          <NoticePopups />
                          {/* The plan's credits for each monthly period. */}
                          <PlanCredits />
                          <GlobalRenderIndicator />
                          <PlanRunner />
                        </CreateHistoryProvider>
                      </CreditsProvider>
                    </CreatePlanProvider>
                  </VideoJobsProvider>
                </ProductFlowProvider>
              </MarketProvider>
            </ManualProjectsProvider>
          </PcbProvider>
        </ThemeProvider>
        <ToastLayer />
      </body>
    </html>
  );
}
