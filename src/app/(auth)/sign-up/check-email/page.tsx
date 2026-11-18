import type { Metadata } from "next";
import { CheckEmail } from "@/components/auth/check-email";

export const metadata: Metadata = { title: "Check your email · IDEEZA" };

export default function CheckEmailPage() {
  return <CheckEmail />;
}
