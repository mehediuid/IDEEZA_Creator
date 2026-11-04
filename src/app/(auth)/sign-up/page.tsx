import * as React from "react";
import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create your account · IDEEZA" };

export default function SignUpPage() {
  // The form reads its link (?email=, ?next=…): its own Suspense, so the page still prerenders.
  return (
    <React.Suspense fallback={null}>
      <SignUpForm />
    </React.Suspense>
  );
}
