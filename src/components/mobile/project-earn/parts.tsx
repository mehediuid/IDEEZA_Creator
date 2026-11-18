"use client";

// Earn's shared phone parts (Figma 12–17 at 375 px, the web's Earn surface):
// · EARN_CARD — the one card: radius/xl, border/default, 16 padding, 12 apart;
//   EarnH2 / EARN_LEAD — the card's heading and its plain sentence;
// · FactRows — label and value rows in a ListCard (Price, Copies sold, …);
// · StepFix — a missing ladder step's one-tap fix, as the phone does it: Open
//   products (the Products tab), Make videos (the products' videos in a sheet,
//   each opening its video maker — the web's dialog), Go to mint (Earn › Sell),
//   Connect wallet (the Demo wallet sheet), Confirm ownership (writes it at
//   once), Choose a license (LicenseSheet), Verify identity (the phone's one
//   identity check, KYC Level 1 in Settings — the web links to Get paid's);
//   each secondary, so the screen's one primary stays its own;
// · MissingSteps / LevelCheck — "Before you can {verb}" with those steps;
// · the frame's pieces (Earn is a hub whose sections push their own screens):
//   InfoButton — ⓘ beside a heading, its explanation in a sheet (lens 1);
//   FactGrid — up to three facts, a small label over each value (lens 2);
//   EarnLink — a link that opens a section of this Earn in place;
//   EarnBar / useEarnTopActions — the open section's BottomBar and ⋯.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckmarkCircle02Icon, CircleIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { LICENSES, type License } from "@/lib/brief/types";
import type { LadderStep, LevelCheck as Check } from "@/lib/commerce/ladder";
import { saveDraftLicense } from "@/lib/commerce/license";
import type { EarnSection } from "@/lib/manual/earn-route";
import { useManualProjects } from "@/lib/manual/projects";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { LIST_CARD, LIST_ROW, ListCard } from "../kit/list";
import type { TopBarAction } from "../top-bar";
import { useEarn } from "./context";
import { MakeVideosSheet } from "./sell/parts";
import { useBackState } from "../nav-trail";
import { T } from "../type";

export const EARN_CARD = cn(LIST_CARD, "gap-6 p-8");
export const EARN_STACK = "flex flex-col gap-12";
export const EARN_H2_CLASS = T.section;
export const EARN_H3_CLASS = T.section;
export const EARN_LEAD = T.body;
export const EARN_NOTE = T.meta;
/** A fix or a row's one quiet button, on the phone's 44 px. */
export const FIX_BUTTON = cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full");

export function EarnH2({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn(EARN_H2_CLASS, className)}>
      {children}
    </h2>
  );
}

/** Label · value rows (Mobile / Info row) in a ListCard. */
export function FactRows({ rows, label }: { rows: readonly { label: string; value: React.ReactNode }[]; label?: string }) {
  return (
    <ListCard label={label}>
      {rows.map((r) => (
        <li key={r.label} className={cn(LIST_ROW, "items-start justify-between hover:bg-transparent")}>
          <span className={cn(T.body, "shrink-0")}>{r.label}</span>
          <span className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{r.value}</span>
        </li>
      ))}
    </ListCard>
  );
}

// ─────────────────────────── the frame's pieces ───────────────────────────

/** ⓘ beside a heading (44 px): the heading's explanation, in the kit's sheet, so it isn't printed inline. */
export function InfoButton({ title, label, children }: { title: string; label?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <IconButton
        hierarchy="ghost"
        size="xl"
        aria-label={label ?? `About ${title}`}
        aria-haspopup="dialog"
        icon={<Icon icon={InformationCircleIcon} size={20} />}
        onClick={() => setOpen(true)}
        className="-my-3 shrink-0"
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}

export type GridFact = { label: string; value: string };

/** Up to three facts in a row, a small label over each value (the buy box's facts). */
export function FactGrid({ facts, className }: { facts: readonly GridFact[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-3 gap-x-8 gap-y-6", className)}>
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1">
          <dt className={T.micro}>{f.label}</dt>
          <dd className={cn(T.rowTitle, "break-words tabular-nums")}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Where a phone address lands inside this project's Earn (`…/earn`, `…/earn/money#customers`); null elsewhere
 *  (the mint, another project, an address with a query, which a real navigation reads). */
export function earnPlaceOf(href: string, projectId: string): { section: EarnSection; hash?: string } | null {
  const base = `/m/projects/${encodeURIComponent(projectId)}/earn`;
  if (!href.startsWith(base)) return null;
  const m = /^(?:\/(sell|plan|money))?\/?(?:#(.+))?$/.exec(href.slice(base.length));
  if (!m) return null;
  return { section: (m[1] as EarnSection | undefined) ?? "overview", hash: m[2] };
}

/** A link inside Earn: a section of this project's Earn opens in place (pushed, no fetch, Back
 *  comes back); anything else is an ordinary link. */
export function EarnLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "onClick">) {
  const { project, openSection } = useEarn();
  const place = openSection ? earnPlaceOf(href, project.id) : null;
  if (!place || !openSection)
    return (
      <Link href={href} className={className} {...rest}>
        {children}
      </Link>
    );
  return (
    <a
      href={href}
      className={className}
      {...rest}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openSection(place.section, place.hash);
      }}
    >
      {children}
    </a>
  );
}

/** The open section's one primary, in a BottomBar pinned at the screen's foot (the thumb zone).
 *  Inline where the screen has no foot of Earn's (the mint). */
export function EarnBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { footEl } = useEarn();
  const bar = <BottomBar className={cn("gap-6 pt-8", className)}>{children}</BottomBar>;
  if (footEl === undefined) return bar;
  return footEl ? createPortal(bar, footEl) : null;
}

/** The open section's actions in the top bar's right slot (⋯), while it is shown. */
export function useEarnTopActions(actions: readonly TopBarAction[]): void {
  const { setTopActions } = useEarn();
  const latest = React.useRef(actions);
  React.useEffect(() => {
    latest.current = actions;
  });
  const key = actions.map((a) => a.label).join("\n");
  React.useEffect(() => {
    if (!setTopActions) return;
    setTopActions(latest.current.map((a) => ({ ...a, onClick: () => latest.current.find((b) => b.label === a.label)?.onClick() })));
    return () => setTopActions([]);
  }, [setTopActions, key]);
}

type FixProps = {
  step: LadderStep;
  projectId: string;
  /** The project's chosen license, for the license sheet. */
  license: License | null;
  announce?: (message: string) => void;
  describedBy?: string;
};

/** One missing step's fix. */
export function StepFix({ step, projectId, license, announce, describedBy }: FixProps) {
  const { openManage } = useWalletRequest();
  const { setOwnerConfirmed } = useManualProjects();
  const toast = useToast();
  const pathname = usePathname();
  const [sheet, setSheet] = useBackState<"license" | "videos" | null>(`stepfix-${step.fix.kind}`, null);
  const label = step.fix.label;
  const said = (m: string) => {
    toast({ title: m });
    announce?.(m);
  };
  switch (step.fix.kind) {
    case "products":
      return (
        <Link href={phoneProjectHref(projectId, "products")} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "media":
      return (
        <>
          <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={() => setSheet("videos")}>
            {label}
          </Button>
          {sheet === "videos" && <MakeVideosSheet onClose={() => setSheet(null)} />}
        </>
      );
    case "mint":
      return (
        <Link href={phoneEarnHref(projectId, "sell")} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "wallet":
      return (
        <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={openManage}>
          {label}
        </Button>
      );
    case "ownership":
      return (
        <Button
          hierarchy="secondary"
          size="xl"
          className="w-full"
          aria-describedby={describedBy}
          onClick={() => {
            setOwnerConfirmed(projectId, Date.now());
            said("Ownership confirmed.");
          }}
        >
          {label}
        </Button>
      );
    case "license":
      return (
        <>
          <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={() => setSheet("license")}>
            {label}
          </Button>
          <LicenseSheet open={sheet === "license"} projectId={projectId} current={license} onClose={() => setSheet(null)} onSaved={said} />
        </>
      );
    case "identity":
      return (
        <Link href={`/m/settings/kyc/1?next=${encodeURIComponent(pathname)}`} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
  }
}

/** Steps as rows: done or not, the step, and — while missing — why and its fix. */
export function MissingSteps({ steps, ...fix }: Omit<FixProps, "step" | "describedBy"> & { steps: readonly (LadderStep & { ok?: boolean })[] }) {
  const base = React.useId();
  return (
    <ul className="flex flex-col">
      {steps.map((s) => {
        const done = s.ok === true;
        const reasonId = `${base}-${s.id}`;
        return (
          <li key={s.id} className="flex items-start gap-4 border-b-[length:var(--border-width-1)] border-solid border-border py-6 first:pt-0 last:border-b-0 last:pb-0">
            <span aria-hidden className={cn("mt-px inline-flex shrink-0", done ? "text-text-success" : "text-text-tertiary")}>
              <Icon icon={done ? CheckmarkCircle02Icon : CircleIcon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-3">
              <span className={T.rowTitle}>
                {s.label}
                <span className="sr-only">{done ? ", done" : ", not done yet"}</span>
              </span>
              {!done && (
                <>
                  <span id={reasonId} className={EARN_LEAD}>
                    {s.reason}
                  </span>
                  <StepFix step={s} describedBy={reasonId} {...fix} />
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Before you can {what}" and the missing steps, or nothing once the check passes. */
export function LevelCheck({ check, what, id, ...fix }: Omit<FixProps, "step" | "describedBy"> & { check: Check; what: string; id?: string }) {
  const headingId = React.useId();
  if (check.ok) return null;
  return (
    <section id={id} aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className={EARN_H3_CLASS}>
        {`Before you can ${what}`}
      </h3>
      <MissingSteps steps={check.missing} {...fix} />
    </section>
  );
}

const LICENSE_OPTIONS = LICENSES.map((l) => ({ value: l.value, label: l.label }));

/** Choose a license (the web's dialog as a sheet): the Brief's list; Save license writes the draft's license. */
export function LicenseSheet({
  open,
  projectId,
  current,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  current: License | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const [value, setValue] = React.useState<License | null>(current);
  const [problem, setProblem] = React.useState<string | null>(null);
  const ids = useFieldIds(["license"] as const);
  const [was, setWas] = React.useState(open);
  if (was !== open) {
    setWas(open);
    if (open) {
      setValue(current);
      setProblem(null);
    }
  }
  const info = LICENSES.find((l) => l.value === value)?.info;
  const save = () => {
    if (!value) return setProblem("Choose a license.");
    const r = saveDraftLicense(projectId, value);
    if (r === "unreadable") return setProblem("This project's Brief can't be read, so the license wasn't saved.");
    if (r === "refused") return setProblem("This browser couldn't save it (storage is full or blocked). Nothing changed.");
    onSaved?.(`License set: ${LICENSES.find((l) => l.value === value)?.label ?? value}.`);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={current ? "Change license" : "Choose a license"}
      description={current ? `Now: ${LICENSES.find((l) => l.value === current)?.label ?? current}` : "The terms your project is sold under."}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={save}>
            Save license
          </Button>
        </>
      }
    >
      <Field label="License" htmlFor={ids.license.id} error={problem} errorId={ids.license.errorId}>
        <SheetSelect
          id={ids.license.id}
          title="License"
          placeholder="Select a license"
          value={value ?? ""}
          options={LICENSE_OPTIONS}
          invalid={!!problem}
          onChange={(v) => {
            setValue(v as License);
            setProblem(null);
          }}
        />
      </Field>
      {info && <p className={EARN_NOTE}>{info}</p>}
      {current && <Banner tone="info">Buyers keep their license. People who already bought keep the license they bought under. New buyers get this one.</Banner>}
    </Sheet>
  );
}

