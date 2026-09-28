"use client";

// StorageErrorBanner — COR-93. A write the browser refused says so on the page,
// instead of the silent `catch {}` both stores had. One line in the error
// tone while any store key's latest write is unsaved; it goes as soon as that
// key saves again.
//
// It is always mounted: empty and visually hidden while nothing has failed,
// filled in place when something does. A polite region that is already on the
// page is read when its words change; one inserted with its words already in
// often isn't.

import { Banner } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";

export function StorageErrorBanner({ className }: { className?: string }) {
  const { writeError } = useManualProjects();
  return (
    <Banner tone="error" className={writeError ? className : "sr-only"}>
      {writeError ? WRITE_ERROR_MESSAGE : ""}
    </Banner>
  );
}
