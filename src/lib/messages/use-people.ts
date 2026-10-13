// The people Messages reads, live (spec §3): every project's team, the
// Innovations creators and the market's sales, so a name, a role tag or a
// team's members are never copied into a conversation beyond its snapshot.

import * as React from "react";
import { PROJECTS } from "../feed";
import { teamOf } from "../manual/contributors";
import { useManualProjects } from "../manual/projects";
import { useMarket } from "../market/market-store";
import { personOf, roleTagOf, type PeopleSources, type Person, type TeamSource } from "./people";
import type { Participant, PersonId, Subject } from "./types";

const CREATORS = (() => {
  const seen = new Map<string, string>();
  for (const p of PROJECTS) if (!seen.has(p.creator.id)) seen.set(p.creator.id, p.creator.name);
  return [...seen].map(([id, name]) => ({ id, name }));
})();

export type MessagePeople = {
  hydrated: boolean;
  sources: PeopleSources;
  teamIdsOf: (projectId: string) => PersonId[];
  personOf: (id: PersonId, snapshots?: readonly Participant[]) => Person;
  nameOf: (id: PersonId) => string;
  roleTagOf: (id: PersonId, subject: Subject) => string;
};

export function useMessagePeople(): MessagePeople {
  const { projects, hydrated } = useManualProjects();
  const { data: market, hydrated: marketHydrated } = useMarket();
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
    return {
      hydrated: hydrated && marketHydrated,
      sources,
      teamIdsOf,
      personOf: of,
      nameOf: (id: PersonId) => of(id).name,
      roleTagOf: (id: PersonId, subject: Subject) => roleTagOf(id, subject, { sales: market.sales, teams }),
    };
  }, [teams, hydrated, marketHydrated, market.sales]);
}
