"use client";

// A creator's projects, every one (/m/creators/<handle>/projects; owner 2026-11-24: "View all
// projects" from the profile's More projects, so the rest are easy to find). The same public list
// the profile's Projects tab reads (pins first, then the newest change; never a draft or a private
// project), as the profile's 4:3 tiles in two columns, with a search by name once there are more
// than four. A locked profile (unless you work with them) or one you blocked shows no projects,
// as the profile itself doesn't.

import * as React from "react";
import { Folder01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { useBlocked } from "@/components/profile/person-actions";
import { SearchInput } from "@/components/ideeza/search-input";
import type { ProfileFields } from "@/lib/people/fields";
import { directory, personByHandle, type Person } from "@/lib/people/ids";
import type { MadeItem } from "@/lib/people/made";
import { firstNameOf, projectsMatching, sampleProfileLocked } from "@/lib/people/phone-profile";
import { useMyProfile } from "@/lib/people/profile-store";
import { EmptyState, NotFoundState } from "../kit/state";
import { ListBones } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { ProjectTile } from "./parts";
import { useOtherData, useOwnData } from "./use-profile";

/** Search shows once the list is longer than the profile's own grid. */
const SEARCH_FROM = 5;

function safeDecode(handle: string): string {
  try {
    return decodeURIComponent(handle);
  } catch {
    return "";
  }
}

export function CreatorProjectsScreen({ handle }: { handle: string }) {
  const { hydrated, fields } = useMyProfile();
  const dir = React.useMemo(
    () => directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle }),
    [fields.name, fields.latinName, fields.handle],
  );
  if (!hydrated) return <Frame title="Projects" items={null} />;
  const person = personByHandle(dir, safeDecode(handle));
  if (!person)
    return (
      <Screen top={<TopBar back title="Projects" />} className="px-8 pb-12">
        <NotFoundState thing="creator" body="The link may be old, or the name may have changed." />
      </Screen>
    );
  return person.kind === "me" ? <OwnProjects fields={fields} /> : <OtherProjects person={person} />;
}

function OwnProjects({ fields }: { fields: ProfileFields }) {
  const data = useOwnData(fields);
  return <Frame title="Your projects" items={data.made} own />;
}

function OtherProjects({ person }: { person: Person }) {
  const data = useOtherData(person);
  const blocks = useBlocked(person.id);
  const first = firstNameOf(person.name) ?? person.name;
  if (!data.ready || !blocks.hydrated) return <Frame title={`${first}’s projects`} items={null} />;
  const hidden = blocks.blocked || (sampleProfileLocked(person.id) && !data.tie);
  return <Frame title={`${first}’s projects`} items={data.made} hidden={hidden ? first : null} />;
}

function Frame({ title, items, own = false, hidden = null }: { title: string; items: readonly MadeItem[] | null; own?: boolean; hidden?: string | null }) {
  const [query, setQuery] = React.useState("");
  const shown = React.useMemo(() => (items ? projectsMatching(items, query) : []), [items, query]);
  return (
    <Screen top={<TopBar back title={title} />} className="px-8 pb-12">
      {items === null ? (
        <div className="pt-4">
          <ListBones rows={4} />
        </div>
      ) : hidden ? (
        <EmptyState icon={LockIcon} title="This profile is locked" body={`Only people who work with ${hidden} on a project can see their projects.`} />
      ) : items.length === 0 ? (
        <EmptyState icon={Folder01Icon} title="No public projects yet" body={own ? "A project shows here once you share it or put it on sale." : "Nothing shared yet."} />
      ) : (
        <div className="flex flex-col gap-6 pt-2">
          <p className={T.meta}>
            {items.length} {items.length === 1 ? "project" : "projects"}
            {own ? " others can see" : ""}
          </p>
          {items.length >= SEARCH_FROM && (
            <SearchInput value={query} onValueChange={setQuery} placeholder="Search projects" aria-label="Search projects by name" size="xl" />
          )}
          {shown.length === 0 ? (
            <p className={T.body}>No project matches “{query.trim()}”.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0">
              {shown.map((m) => (
                <ProjectTile key={m.key} item={m} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Screen>
  );
}
