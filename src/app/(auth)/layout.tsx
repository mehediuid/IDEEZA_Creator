import * as React from "react";
import { AuthStage } from "@/components/auth/auth-stage";

// Sign up and Sign in (the demo sign-in, lib/account/auth.ts): outside the app
// shell. From `lg` the 3D stage fills the left, the height of the window and
// still while the form on the right scrolls; below `lg` a shorter stage sits
// above the form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-bg-page font-sans text-text-primary lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(460px,1fr)]">
      <div className="p-[12px] pb-0 lg:sticky lg:top-0 lg:h-dvh lg:p-[16px] lg:pr-0">
        <div className="h-[300px] lg:h-full">
          <AuthStage />
        </div>
      </div>
      <div className="flex min-w-0 flex-col lg:min-h-dvh">
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-[28px] px-[var(--layout-page-inset)] py-[40px] lg:px-0 lg:py-[64px]">
          {children}
        </main>
        <p className="m-0 px-[var(--layout-page-inset)] pb-[24px] text-center text-sm leading-sm text-text-tertiary">
          Demo: your account and your work stay in this browser.
        </p>
      </div>
    </div>
  );
}
