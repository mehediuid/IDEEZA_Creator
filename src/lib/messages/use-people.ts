// The people Messages reads, live (spec §3): every project's team, the
// Innovations creators and the market's sales, so a name, how someone stands
// to a project, or a team's members are never copied into a conversation
// beyond its snapshot. With your settings it also gives the start rules what
// they can't read from the messages (Settings › Audience): who works with you
// and whether your quiet mode is on.

import * as React from "react";
import { PROJECTS } from "../feed";
import { teamOf } from "../manual/contributors";
import { useManualProjects } from "../manual/projects";
import { useMarket } from "../market/market-store";
import type { Tie } from "../settings/audience";
import { quietModeOn } from "../settings/prefs";
import { useSettings } from "../settings/use-settings";
import type { StartPolicy } from "./rules";
import {
  feedPersonId,
  personOf,
  relationOf,
  type PeopleSources,
  type Person,
  type Relation,
  type TeamSource,
  workTieOf,
} from "./people";
import { ME, type Participant, type PersonId, type Subject } from "./types";

const CREATORS = (() => {
  const seen = new Map<string, string>();
  for (const p of PROJECTS) if (!seen.has(p.creator.id)) seen.set(p.creator.id, p.creator.name);
  return [...seen].map(([id, name]) => ({ id, name }));
})();

const POST_CREATOR = new Map(PROJECTS.map((p) => [p.slug, feedPersonId(p.creator.id)]));

/** Every project in this browser is yours; a post is its creator's. */
export function ownerOfSubject(subject: Subject): PersonId | null {
  return subject.kind === "project" ? ME : (POST_CREATOR.get(subject.slug) ?? null);
}

export type MessagePeople = {
  hydrated: boolean;
  sources: PeopleSources;
  teamIdsOf: (projectId: string) => PersonId[];
  personOf: (id: PersonId, snapshots?: readonly Participant[]) => Person;
  nameOf: (id: PersonId) => string;
  ownerOf: (subject: Subject) => PersonId | null;
  /** How `other` stands to `subject`, seen by `viewer`. */
  relationOf: (viewer: PersonId, other: PersonId, subject: Subject, o?: { askedListing?: boolean }) => Relation;
  /** How someone works with you across your projects. */
  tieOf: (id: PersonId) => Tie;
  /** What `canStart` needs beyond the messages: ties to you, and your quiet mode. */
  policy: StartPolicy;
};

export function useMessagePeople(): MessagePeople {
  const { projects, hydrated } = useManualProjects();
  const { data: market, hydrated: marketHydrated } = useMarket();
  const settings = useSettings();
  const teams = React.useMemo<TeamSource[]>(
    () =>
      projects.map((p) => ({
        projectId: p.id,
        projectName: p.name.trim() || "Untitled project",
        members: teamOf(p.contributors ?? []),
      })),
    [projects],
  );
  return React.useMemo(() => {
    const sources: PeopleSources = { teams, creators: CREATORS };
    const teamIdsOf = (projectId: string) => teams.find((t) => t.projectId === projectId)?.members.map((m) => m.id) ?? [];
    const of = (id: PersonId, snapshots: readonly Participant[] = []) => personOf(id, sources, snapshots);
    const ctx = { sales: market.sales, teams, ownerOf: ownerOfSubject };
    const tieOf = (id: PersonId) => workTieOf(id, ctx);
    const policy: StartPolicy = {
      tied: (a, b) => (a === ME ? tieOf(b) : b === ME ? tieOf(a) : null) !== null,
      quiet: (person) => person === ME && quietModeOn(settings, Date.now()),
    };
    return {
      hydrated: hydrated && marketHydrated,
      sources,
      teamIdsOf,
      personOf: of,
      nameOf: (id: PersonId) => of(id).name,
      ownerOf: ownerOfSubject,
      relationOf: (viewer, other, subject, o) => relationOf(viewer, other, subject, ctx, o),
      tieOf,
      policy,
    };
  }, [teams, hydrated, marketHydrated, market.sales, settings]);
}
