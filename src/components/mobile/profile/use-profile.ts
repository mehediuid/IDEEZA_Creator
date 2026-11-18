"use client";

// What a creator profile on the phone shows, worked out the way the web's
// profile page works it out (components/profile/profile-page.tsx, the same
// lib/people logic): your own work that is already public (shared to the
// Feed, or on sale), a sample creator's posts, the four counts, the newest
// project Activity, the chips they build with, and how they are tied to you.
// Every link points at the phone's own screens.

import * as React from "react";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useMessageRefusalFor } from "@/components/profile/person-actions";
import { useCreateHistory } from "@/lib/create/history";
import { readStoredKey, subscribeStores } from "@/lib/key-store";
import { FEED_CLIPS } from "@/lib/innovations/clips";
import { partsOf } from "@/lib/innovations/mine-post";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { postIdOfProject } from "@/lib/innovations/slug";
import { isPostVideo } from "@/lib/innovations/types";
import { teamOf } from "@/lib/manual/contributors";
import { JOURNEY_KEY, type ProjectJourney } from "@/lib/manual/journey";
import { decodeJourney } from "@/lib/manual/journey-store";
import { buildsOf, coverOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import type { StartParams } from "@/lib/messages/links";
import type { ProfileFields } from "@/lib/people/fields";
import type { Person } from "@/lib/people/ids";
import { listingFactsOf } from "@/lib/people/listing-facts";
import { madeOfMine, madeOfSample, ownerCounts, type MadeItem, type MineInput } from "@/lib/people/made";
import { phoneProjectHref } from "@/lib/people/phone-profile";
import { activityOf, builtWithOf, featuredOf, worksOnOf, type ActivityItem } from "@/lib/people/portfolio";
import { SAMPLE_PROFILES, type SampleProfile } from "@/lib/people/sample-profiles";
import { tiesOf } from "@/lib/people/ties";

/** What a project card adds to the Made item: the post behind it (reactions and comments are
 *  keyed by it), Minted, the length of its first video, the clip its comments open on. */
export type CardFacts = {
  postId: string;
  base: { appreciations: number; views: number };
  minted: boolean;
  videoMs: number | null;
  clipId: string | null;
};

export function cardFactsOf(item: MadeItem): CardFacts {
  const postId = item.projectId ? postIdOfProject(item.projectId) : item.key;
  const post = item.projectId ? null : SAMPLE_POSTS.find((p) => p.id === item.key);
  const video = post?.media.find(isPostVideo);
  const clip = FEED_CLIPS.find((c) => c.postId === postId && c.kind === "project");
  return {
    postId,
    base: post?.base ?? { appreciations: 0, views: 0 },
    minted: post?.minted ?? false,
    videoMs: video?.durationMs ?? null,
    clipId: clip?.id ?? null,
  };
}

function useJourneysRaw(ids: readonly string[]): (string | null)[] | null {
  const snapshot = React.useSyncExternalStore(
    subscribeStores,
    () => JSON.stringify(ids.map((id) => readStoredKey(JOURNEY_KEY(id)))),
    () => "",
  );
  return React.useMemo(() => (snapshot ? (JSON.parse(snapshot) as (string | null)[]) : null), [snapshot]);
}

export type OwnData = {
  ready: boolean;
  made: MadeItem[];
  activity: ActivityItem[];
  builtWith: string[];
  /** Projects others can see, and those only you see. */
  counts: { shown: number; hidden: number };
  /** Since you first saved your profile or made your first project. */
  since: number | null;
  /** Your shared projects' public words: all "Suggest from my work" may read. */
  shared: { title: string; story: string }[];
  /** The featured project's picture: the cover until you upload one. */
  fallbackCover: string | null;
  now: number;
};

export function useOwnData(fields: ProfileFields): OwnData {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: marketReady, data: market } = useMarket();
  const ids = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(ids);
  const journeys = useJourneysRaw(ids);
  const now = useMinuteClock();
  const ready = projectsReady && buildsReady && marketReady && editions.hydrated && journeys !== null && now > 0;

  const facts = React.useMemo(() => {
    if (!ready || !journeys) return [];
    return projects.map((p, i) => {
      const refs = buildsOf(p, builds);
      const products = productsOfProject(p, refs).filter((x) => x.dropped === null);
      return {
        project: p,
        refs,
        journey: decodeJourney(journeys[i] ?? null) as ProjectJourney,
        products: products.length,
        parts: products.flatMap((x) => (x.built ? partsOf(x.built.product).map((r) => r.name) : [])),
      };
    });
  }, [ready, journeys, projects, builds]);

  const made = React.useMemo(() => {
    const inputs: MineInput[] = facts.map(({ project: p, refs, journey, products }) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      showcasedAt: typeof p.showcasedAt === "number" ? p.showcasedAt : null,
      cover: coverOf(p, refs),
      journey,
      products,
      summary: p.post?.story.trim() || p.description.trim(),
      category: null,
      ...listingFactsOf(p.id, market.listings, market.sales, editions.record),
    }));
    return madeOfMine(inputs, fields.pins);
  }, [facts, market, editions.record, fields.pins]);

  return React.useMemo(() => {
    const shown = new Map(made.flatMap((m) => (m.projectId ? [[m.projectId, m] as const] : [])));
    const visible = facts.filter((f) => shown.has(f.project.id));
    const firstProject = projects.reduce<number | null>((at, p) => (at === null || p.createdAt < at ? p.createdAt : at), null);
    const since = [fields.since, firstProject].filter((v): v is number => v !== null).reduce<number | null>((a, b) => (a === null || b < a ? b : a), null);
    return {
      ready,
      made,
      activity: activityOf(
        visible.map((f) => {
          const m = shown.get(f.project.id)!;
          return { id: f.project.id, title: m.title, href: phoneProjectHref(m), journey: f.journey };
        }),
        20,
      ),
      builtWith: builtWithOf(visible.map((f) => f.parts)),
      counts: ownerCounts(projects, made),
      since,
      shared: projects
        .filter((p) => typeof p.showcasedAt === "number")
        .map((p) => ({ title: p.name.trim(), story: p.post?.story ?? "" }))
        .filter((p) => p.title),
      fallbackCover: featuredOf(made)?.featured.cover ?? null,
      now,
    };
  }, [ready, made, facts, projects, fields.since, now]);
}

export type OtherData = {
  ready: boolean;
  about: SampleProfile | null;
  made: MadeItem[];
  activity: ActivityItem[];
  builtWith: string[];
  worksOn: string[];
  appreciations: number;
  since: number | null;
  /** How they are tied to you, from your side; only you see it. */
  tie: string | null;
  /** The subject a conversation starts from; null when you share none. */
  start: StartParams | null;
  /** Why Message can't start; null when it can. */
  refusal: string | null;
  now: number;
};

export function useOtherData(person: Person): OtherData {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: marketReady, data: market } = useMarket();
  const { hydrated: reactionsReady, reactions } = useReactions();
  const now = useMinuteClock();
  const ready = projectsReady && marketReady && reactionsReady && now > 0;

  const feedId = person.kind === "feed" ? person.id.slice("feed:".length) : null;
  const posts = React.useMemo(() => (feedId ? SAMPLE_POSTS.filter((p) => p.creator.id === feedId) : []), [feedId]);
  const made = React.useMemo(() => (feedId && now > 0 ? madeOfSample(SAMPLE_POSTS, feedId, now) : []), [feedId, now]);

  const start: StartParams | null = React.useMemo(() => {
    if (posts.length) {
      const newest = posts.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return { kind: "post", to: person.id, slug: newest.slug };
    }
    const mine = new Set(projects.map((p) => p.id));
    const sale = market.sales.filter((x) => x.buyerId === person.id && mine.has(x.projectId)).sort((a, b) => b.at - a.at)[0];
    return sale ? { kind: "direct", to: person.id, projectId: sale.projectId, about: { kind: "purchase", saleId: sale.id } } : null;
  }, [posts, projects, market.sales, person.id]);
  const refusal = useMessageRefusalFor(person, start);

  return React.useMemo(() => {
    const appreciations = posts.reduce((n, p) => n + countsOf(reactions, p.id, p.base).appreciations, 0);
    return {
      ready,
      about: feedId ? (SAMPLE_PROFILES[feedId] ?? null) : null,
      made,
      activity:
        now > 0
          ? activityOf(
              posts.map((p) => ({ id: p.id, title: p.title, href: phoneProjectHref({ projectId: null, key: p.id }), journey: sampleJourneyOf(p, now) })),
              20,
            )
          : [],
      builtWith: builtWithOf(posts.map((p) => p.products.flatMap((x) => x.parts.map((r) => r.name)))),
      worksOn: worksOnOf(made),
      appreciations,
      since: posts.length ? posts.reduce((a, p) => Math.min(a, p.createdAt), Infinity) : null,
      tie: tiesOf(person.id, {
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
        sales: market.sales,
        teams: projects.map((p) => ({ projectId: p.id, members: teamOf(p.contributors ?? []) })),
      }),
      start,
      refusal,
      now,
    };
  }, [ready, feedId, posts, made, reactions, now, person.id, projects, market.sales, start, refusal]);
}
