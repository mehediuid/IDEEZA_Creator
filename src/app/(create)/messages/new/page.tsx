// /messages/new — where every entry point lands (spec §6): `?to=…&project=…
// &about=…`, `?to=feed:…&post=…` or `?team=…`, plus `?as=`. StartView opens the
// existing conversation or a draft whose first Send creates it; it reads the
// address, so it renders under a Suspense boundary.

import * as React from "react";
import { PaneLoading } from "@/components/messages/pane-state";
import { StartView } from "@/components/messages/start-view";

export default function NewConversationPage() {
  return (
    <React.Suspense fallback={<PaneLoading />}>
      <StartView />
    </React.Suspense>
  );
}
