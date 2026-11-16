"use client";

// Join the hackathon — the prototype's step 02 "Join from this page and pick
// your university. You get a personal referral link." One choice (university,
// or the open category) and the eligibility the rules set (18+, in Ethiopia),
// then a "You're in" state with the personal link to share.

import * as React from "react";
import { ModalFrame } from "@/components/ideeza/dialog";
import { Select } from "@/components/ideeza/select";
import { Checkbox } from "@/components/ideeza/checkbox";
import { buttonVariants } from "@/components/ideeza/button";
import { cn } from "@/lib/utils";
import { HACKATHON, UNIVERSITIES } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";

const OPEN = "__open";

export function JoinDialog({ open, onClose, container }: { open: boolean; onClose: () => void; container: Element | null }) {
  const { entry } = useHackathon();
  const [university, setUniversity] = React.useState("");
  const [eligible, setEligible] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const link =
    typeof window === "undefined" || !entry.joined
      ? ""
      : `${window.location.origin}/hackathons?ref=${encodeURIComponent(entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`;

  const close = () => {
    setTried(false);
    setCopied(false);
    onClose();
  };

  const submit = () => {
    setTried(true);
    if (!university || !eligible) return;
    entry.join(university === OPEN ? "" : university);
  };

  const joined = entry.joined;

  return (
    <ModalFrame
      open={open}
      onClose={close}
      container={container}
      size="xs"
      title={joined ? "You're in" : "Join the hackathon"}
      description={
        joined
          ? `${joined.university || "Open category"} · ${HACKATHON.name}`
          : "Pick your university. You compete as an individual and get a personal link to share."
      }
      footer={
        joined ? (
          <button type="button" onClick={close} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "w-full")}>
            Done
          </button>
        ) : (
          <button type="button" onClick={submit} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "w-full")}>
            Join
          </button>
        )
      }
    >
      {joined ? (
        <div className="flex flex-col gap-8">
          <p className="text-md leading-md text-[color:var(--color-text-secondary)]">
            Build {HACKATHON.minProducts} or more products with IDEEZA AI, publish them to Give to Community, and share your link. Votes and referrals from it add to your points.
          </p>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium leading-sm text-[color:var(--color-text-secondary)]">Your personal link</span>
            <div className="flex items-center gap-4 rounded-xl border border-solid border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] py-3 pl-6 pr-3">
              <span className="min-w-0 flex-1 truncate text-md leading-md text-[color:var(--color-text-primary)]">{link}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link).then(() => setCopied(true));
                }}
                className={buttonVariants({ hierarchy: "secondary", size: "sm" })}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <label className="flex flex-col gap-3">
            <span className="text-sm font-medium leading-sm text-[color:var(--color-text-primary)]">University</span>
            <Select
              size="lg"
              value={university}
              placeholder="Choose your university"
              onChange={setUniversity}
              options={[...UNIVERSITIES.map((u) => ({ label: u, value: u })), { label: "Not at a university — open category", value: OPEN }]}
            />
            {tried && !university ? <span className="text-sm leading-sm text-[color:var(--color-text-error)]">Choose your university, or the open category.</span> : null}
          </label>
          {/* The whole line toggles (the box alone was a small target). */}
          <button
            type="button"
            role="checkbox"
            aria-checked={eligible}
            onClick={() => setEligible((v) => !v)}
            className="flex cursor-pointer items-start gap-4 border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:shadow-focus-brand"
          >
            <Checkbox checked={eligible} decorative size="sm" />
            <span className="text-md leading-md text-[color:var(--color-text-secondary)]">
              I am {HACKATHON.minAge} or older and live in {HACKATHON.where}.
            </span>
          </button>
          {tried && !eligible ? <span className="-mt-4 text-sm leading-sm text-[color:var(--color-text-error)]">The hackathon is open to people {HACKATHON.minAge}+ in {HACKATHON.where}.</span> : null}
        </div>
      )}
    </ModalFrame>
  );
}
