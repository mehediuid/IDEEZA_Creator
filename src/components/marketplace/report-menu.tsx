"use client";

// The ⋯ beside Share on every Explore marketplace details page (owner,
// 2026-11-24: "a marketplace item can't be reported — it must be"): Report
// project on a project's page, Report product on a product's, then the
// Innovations Report dialog (reason, optional note, Send report). The page
// speaks to the demo buyer ("Shopping as"), so a listing of this browser's can
// be reported as on a sample's. Until there is moderation the report is kept in
// this browser with the reported posts (`useReportedPost`): a project's report
// is its post's — Innovations and the phone read "Reported" too — and a
// product's is "{post id}#{product id}" (lib/data/reports.ts), listed in
// Settings › Reports you made.

import * as React from "react";
import { Flag01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, Menu, type MenuItem } from "@/components/ideeza";
import { useReportedPost } from "@/components/innovations/post-bits";
import { ReportDialog } from "@/components/innovations/report-dialog";
import { usePostToast } from "@/components/innovations/toast";

export function MarketReportMenu({ reportId, target }: { reportId: string; target: "project" | "product" }) {
  const toast = usePostToast();
  const { reported, markReported } = useReportedPost(reportId);
  const [reporting, setReporting] = React.useState(false);
  const items: MenuItem[] = [
    reported
      ? { id: "report", label: "Reported", icon: <Icon icon={Flag01Icon} size={20} />, disabled: true, hint: `You reported this ${target}.`, onSelect: () => {} }
      : { id: "report", label: `Report ${target}`, icon: <Icon icon={Flag01Icon} size={20} />, onSelect: () => setReporting(true) },
  ];
  return (
    <>
      <Menu
        label={target === "project" ? "Project actions" : "Product actions"}
        align="end"
        items={items}
        trigger={(props) => (
          <IconButton
            {...props}
            type="button"
            hierarchy="secondary"
            size="md"
            aria-label={`More actions for this ${target}`}
            icon={<Icon icon={MoreHorizontalIcon} size={18} />}
            className="shrink-0 border-solid max-md:size-[var(--touch-min)]"
          />
        )}
      />
      <ReportDialog
        open={reporting}
        target={target}
        onClose={() => setReporting(false)}
        onSend={() => {
          setReporting(false);
          toast(markReported() ? "Report sent. In this demo nobody reviews reports yet." : "Couldn't send the report from this browser. Try again.");
        }}
      />
    </>
  );
}
