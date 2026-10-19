"use client";

// Settings — the frame every settings page sits in (User Panel V2 "✅
// Settings", e.g. General | Security 22048:30800): a white sheet on the page
// frame holding the settings side-nav, a hairline, and the page — its
// breadcrumb (Settings › Group › Page), its title, then its cards. From a
// 768 px page container down the side-nav goes and a "Settings" link leads
// back to the list (spec §2); the sheet then runs edge to edge.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Page, PageHeader } from "@/components/ideeza";
import { settingsCrumbs, settingsPage, SETTINGS_HOME, type SettingsPageId } from "@/lib/settings/registry";
import { SettingsNav } from "./settings-nav";
import { useArrivalHighlight } from "./use-arrival-highlight";

export function SettingsFrame({
  page,
  description,
  actions,
  children,
}: {
  page: SettingsPageId;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const info = settingsPage(page);
  useArrivalHighlight();
  return (
    <Page className="max-md:p-0">
      <div className="flex min-h-[calc(100dvh-var(--layout-page-inset)-var(--spacing-24))] rounded-2xl bg-bg-surface max-md:min-h-0 max-md:rounded-none">
        <nav
          aria-label="Settings"
          className="hidden w-[var(--layout-sidebar)] shrink-0 border-r border-solid border-border px-[16px] py-[24px] [@container(min-width:768px)]:block"
        >
          <SettingsNav current={page} />
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-[24px] p-[24px] max-md:p-[16px]">
          {page !== "home" && (
            <Link
              href={SETTINGS_HOME}
              className="inline-flex w-fit items-center gap-[6px] rounded-md text-md font-medium leading-md text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@container(min-width:768px)]:hidden"
            >
              <Icon icon={ArrowLeft01Icon} size={16} />
              Settings
            </Link>
          )}
          <PageHeader
            className="mb-0"
            title={info.title}
            description={description}
            actions={actions}
            breadcrumb={<SettingsCrumbs page={page} />}
          />
          {children}
        </div>
      </div>
    </Page>
  );
}

function SettingsCrumbs({ page }: { page: SettingsPageId }) {
  const crumbs = settingsCrumbs(page);
  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-[6px] text-md leading-md">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.label} className="flex items-center gap-[6px]">
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="rounded-sm text-text-primary outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "text-text-tertiary underline decoration-border-strong underline-offset-4" : "text-text-primary"}
                >
                  {c.label}
                </span>
              )}
              {!last && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
