"use client";

// The external-link confirm (P2-TABS-8): "Open this link in a new tab?"
// before a maker-typed link leaves IDEEZA. One copy for every link the
// project page shows the maker's own words behind — Activity's link cards
// and the Legal block's Copyright and Trademark links (P2-TABS-23).

import { ConfirmDialog } from "@/components/ideeza";

export function LinkConfirmDialog({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <ConfirmDialog
      open
      title="Open this link in a new tab?"
      confirmLabel="Open link"
      tone="primary"
      onConfirm={() => {
        window.open(url, "_blank", "noopener");
        onClose();
      }}
      onCancel={onClose}
    >
      It leaves IDEEZA — only open links you trust.
    </ConfirmDialog>
  );
}
