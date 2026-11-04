import * as React from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in · IDEEZA" };

export default function SignInPage() {
  // The form reads its link (?email=, ?next=…): its own Suspense, so the page still prerenders.
  return (
    <React.Suspense fallback={null}>
      <SignInForm />
    </React.Suspense>
  );
}
