"use client";

// Settings › Privacy › Link with search engine (Figma 22048:35155): while it
// is off — the default — your own profile page asks search engines not to
// list it, with <meta name="robots" content="noindex">. React puts the tag in
// the document's head and takes it out when the setting goes on. Only your
// profile carries your choice; other creators' pages are theirs.

import * as React from "react";
import { directory, personByHandle } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";
import { useSettings } from "@/lib/settings/use-settings";

export function ProfileRobots({ handle }: { handle: string }) {
  const { fields } = useMyProfile();
  const linked = useSettings().privacy.searchEngines;
  const mine = React.useMemo(
    () => personByHandle(directory({ name: fields.name, latinName: fields.latinName }), decodeURIComponent(handle))?.kind === "me",
    [fields.name, fields.latinName, handle],
  );
  if (!mine || linked) return null;
  return <meta name="robots" content="noindex" />;
}
