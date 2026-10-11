"use client";

// The commerce layer's mount at the app root (Build and Earn P1-1). Rendered
// once in app/layout.tsx; renders nothing.
// - While this module loads — before any gate renders, and before the
//   projects store reads storage — it registers commerce's guards
//   (lib/commerce/guards.ts) and the projects store's record hooks
//   (lib/commerce/record.ts), so engineering asks commerce without importing it.
// - Once mounted it runs the storage migration commerce-split@1, and removes
//   a project's commerce key when the project is deleted.

import * as React from "react";
import { EditPauseDialog } from "@/components/projects/listing/edit-pause-dialog";
import { registerCommerceGuards, type CommerceSource } from "@/lib/commerce/guards";
import { migrateCommerceSplit } from "@/lib/commerce/migrate";
import { browserCommerceStore, commerceRecordHooks, removeCommerceOnDelete } from "@/lib/commerce/record";
import { subscribeStores } from "@/lib/key-store";
import { readEditions } from "@/lib/market/editions-store";
import { readMarketNow, writeListings } from "@/lib/market/market-store";
import { registerProjectRecordHooks } from "@/lib/manual/public";

const SOURCE: CommerceSource = {
  market: readMarketNow,
  writeListings,
  editions: readEditions,
  subscribe: subscribeStores,
};

registerCommerceGuards(SOURCE, EditPauseDialog);
registerProjectRecordHooks(commerceRecordHooks(browserCommerceStore));

export function CommerceRoot() {
  React.useEffect(() => {
    const store = browserCommerceStore();
    if (!store) return;
    migrateCommerceSplit(store, Date.now());
    return removeCommerceOnDelete(store);
  }, []);
  return null;
}
