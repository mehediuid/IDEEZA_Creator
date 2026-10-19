"use client";

// /settings/security (User Panel V2 General | Security 22048:30800). Every
// row of the design needs accounts — a password, two-step verification,
// security question, login alerts, signed-in devices, deactivate and delete
// — and the app has no sign-in yet, so none is shown as a control that would
// pretend to work (spec D18). The page says so plainly and points at the one
// thing that protects work today: a download of it.

import Link from "next/link";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { SettingsCard } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

const LATER = [
  "Password",
  "2-Step verification",
  "Security question",
  "Login alerts",
  "Where you logged in, and signing out of other devices",
  "Deactivate or delete your account",
];

export function SecurityPage() {
  return (
    <SettingsFrame page="security">
      <SettingsCard
        id="sign-in"
        title="Accounts and sign-in aren't in the app yet"
        description="Your work is saved in this browser only. When sign-in arrives, these will be here:"
      >
        <div className="flex flex-col gap-[16px] pt-[8px]">
          <ul role="list" className="m-0 flex flex-col gap-[6px] pl-0">
            {LATER.map((l) => (
              <li key={l} className="flex items-start gap-[10px] text-md leading-md text-text-secondary">
                <span aria-hidden className="mt-[2px] shrink-0 text-text-tertiary">
                  <Icon icon={Shield01Icon} size={16} />
                </span>
                {l}
              </li>
            ))}
          </ul>
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
            Until then, clearing this browser&apos;s data removes your work. Keep a copy of it.
          </p>
          <Link href="/settings/personal-data" className={buttonVariants({ hierarchy: "tonal", size: "md", className: "w-fit" })}>
            Download your information
          </Link>
        </div>
      </SettingsCard>
    </SettingsFrame>
  );
}
