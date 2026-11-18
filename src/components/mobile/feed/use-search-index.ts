"use client";

// What Global Search looks through, from the stores the web already keeps:
// People (the creator directory, lib/people/ids.ts), Post (the Feed's clips and
// the projects you shared), Projects (the feed's projects and yours), Parts &
// Agile Module (the part catalogue and the Agile Modules, lib/pcb/part-
// catalog.ts), Marketplace (the clips with something on sale: the samples'
// listings and your own live listings and auctions), Blog (your blogs that
// readers can open), then what the web's ⌘K finds too: Settings (every row,
// opening its phone page) and Help & tutorials (the tutorial pages and the FAQ).

import * as React from "react";
import { mobileSettingsHref } from "@/components/mobile/settings/root";
import { useBlog } from "@/lib/blog/store";
import { slugOf } from "@/lib/blog/slug";
import type { BlogCover } from "@/lib/blog/types";
import { PROJECTS } from "@/lib/feed";
import { FEED_CLIPS, type ClipOffer, type FeedClip } from "@/lib/innovations/clips";
import type { SearchEntry } from "@/lib/innovations/search";
import { useManualProjects } from "@/lib/manual/projects";
import { directory, profileHref, type Person } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";
import { SAMPLE_PROFILES } from "@/lib/people/sample-profiles";
import { MODULE_CATALOG, PART_CATALOG } from "@/lib/pcb/part-catalog";
import { NAV_PAGES } from "@/lib/settings/registry";
import { SETTINGS_ROWS } from "@/lib/settings/rows";
import { FAQS } from "@/lib/support/faq";
import { pagesOf } from "@/lib/tutorials/catalog";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";
import { useMineClips } from "./use-clips";

export type SearchItem =
  | { type: "person"; person: Person; subtitle: string; followKey: string | null; href: string }
  | { type: "post"; clip: FeedClip }
  | { type: "project"; id: string; name: string; image: string | null; by: string; href: string }
  | { type: "part"; title: string; tag: "Part" | "Agile Module"; meta: string; facts: { label: string; value: string }[]; features: readonly string[] }
  | { type: "market"; clip: FeedClip; offer: ClipOffer }
  | { type: "blog"; id: string; title: string; by: string; at: number; cover: BlogCover | null; href: string }
  | { type: "settings"; title: string; where: string; href: string }
  | { type: "help"; title: string; where: string; href: string };

/** What a person does, in a line: their headline, else what they are here. */
function subtitleOf(p: Person): string {
  if (p.kind === "feed") {
    const key = p.id.slice("feed:".length);
    return SAMPLE_PROFILES[key]?.headline ?? "Creator";
  }
  return p.kind === "demo" ? "Demo creator" : "You";
}

/** Settings and Help never change while the app runs: indexed once. */
let FIXED: SearchEntry<SearchItem>[] | null = null;
function fixedEntries(): SearchEntry<SearchItem>[] {
  if (FIXED) return FIXED;
  const out: SearchEntry<SearchItem>[] = [];
  for (const m of MODULE_CATALOG) {
    out.push({
      kind: "parts",
      id: m.id,
      title: m.name,
      words: [m.summary, ...m.features, ...m.parts],
      ref: { type: "part", title: m.name, tag: "Agile Module", meta: m.summary, facts: [{ label: "Parts", value: m.parts.join(", ") }], features: m.features },
    });
  }
  for (const p of PART_CATALOG) {
    out.push({
      kind: "parts",
      id: p.id,
      title: p.part,
      words: [p.mfr, p.pkg, ...p.features],
      ref: {
        type: "part",
        title: p.part,
        tag: "Part",
        meta: `${p.mfr} · ${p.pkg} · ${p.price}`,
        facts: [
          { label: "Maker", value: p.mfr },
          { label: "Package", value: p.pkg },
          { label: "Price", value: p.price },
        ],
        features: p.features,
      },
    });
  }
  for (const page of NAV_PAGES) {
    const hit = { page: page.id, pageLabel: page.label, rowId: null, label: page.label, href: page.href };
    out.push({ kind: "settings", id: `settings:${page.id}`, title: page.label, words: [], ref: { type: "settings", title: page.label, where: "Settings", href: mobileSettingsHref(hit) } });
    for (const row of SETTINGS_ROWS[page.id] ?? []) {
      const rowHit = { page: page.id, pageLabel: page.label, rowId: row.id, label: row.label, help: row.help, href: row.href ?? page.href };
      out.push({
        kind: "settings",
        id: `settings:${page.id}:${row.id}`,
        title: row.label,
        words: [...(row.keywords ?? []), row.help ?? ""],
        ref: { type: "settings", title: row.label, where: `Settings › ${page.label}`, href: mobileSettingsHref(rowHit) },
      });
    }
  }
  for (const c of TUTORIAL_CATEGORIES) {
    for (const { page } of pagesOf(c)) {
      out.push({
        kind: "help",
        id: `tutorial:${c.slug}:${page.slug}`,
        title: page.title,
        words: [c.title, page.summary ?? ""],
        ref: { type: "help", title: page.title, where: `Tutorials › ${c.title}`, href: `/m/tutorials/${c.slug}/${page.slug}` },
      });
    }
  }
  for (const f of FAQS) {
    out.push({ kind: "help", id: `faq:${f.id}`, title: f.q, words: [f.a], ref: { type: "help", title: f.q, where: "Help · FAQ", href: "/m/help" } });
  }
  out.push({ kind: "help", id: "help:report", title: "Report a problem", words: ["bug", "issue", "broken"], ref: { type: "help", title: "Report a problem", where: "Help", href: "/m/help/report" } });
  out.push({ kind: "help", id: "help:contact", title: "Contact support", words: ["help", "support", "email"], ref: { type: "help", title: "Contact support", where: "Help", href: "/m/help/contact" } });
  FIXED = out;
  return out;
}

export function useSearchIndex(): { hydrated: boolean; entries: SearchEntry<SearchItem>[] } {
  const { hydrated: profileRead, fields } = useMyProfile();
  const { hydrated: projectsRead, projects } = useManualProjects();
  const { hydrated: mineRead, clips: mine } = useMineClips();
  const blog = useBlog();

  const entries = React.useMemo(() => {
    const out: SearchEntry<SearchItem>[] = [];
    for (const p of directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle })) {
      if (p.kind === "me") continue;
      const subtitle = subtitleOf(p);
      out.push({
        kind: "people",
        id: p.id,
        title: p.name,
        words: [subtitle, p.handle],
        ref: { type: "person", person: p, subtitle, followKey: p.kind === "feed" ? p.id.slice("feed:".length) : null, href: `/m${profileHref(p)}` },
      });
    }
    // Your shared projects first, as on the Feed.
    const posts = [...mine, ...FEED_CLIPS];
    for (const c of posts) {
      out.push({ kind: "post", id: c.id, title: c.title, words: [c.creator.name, c.description, c.category ?? ""], ref: { type: "post", clip: c } });
    }
    for (const p of PROJECTS) {
      out.push({
        kind: "projects",
        id: p.id,
        title: p.title,
        words: [p.creator.name, p.category],
        ref: { type: "project", id: p.id, name: p.title, image: p.image ?? null, by: p.creator.name, href: `/m/projects/${p.id}` },
      });
    }
    for (const p of projects) {
      const name = p.name.trim() || "Untitled project";
      out.push({
        kind: "projects",
        id: p.id,
        title: name,
        words: [p.description ?? ""],
        ref: { type: "project", id: p.id, name, image: null, by: "You", href: `/m/projects/${encodeURIComponent(p.id)}` },
      });
    }
    for (const c of posts) {
      if (c.kind !== "project" || !c.offers.length) continue;
      out.push({ kind: "marketplace", id: c.id, title: c.title, words: [c.creator.name, c.description], ref: { type: "market", clip: c, offer: c.offers[0] } });
    }
    for (const a of blog.data.articles) {
      if (!a.live || a.takenDown) continue;
      const title = a.live.title.trim() || "Untitled blog";
      out.push({
        kind: "blog",
        id: a.id,
        title,
        words: a.live.topics,
        ref: { type: "blog", id: a.id, title, by: fields.name.trim() || "You", at: a.live.approvedAt, cover: a.live.cover, href: `/m/blog/${slugOf(a)}` },
      });
    }
    // Parts come before Marketplace in the chips' order; groupResults sorts by kind, so order here is free.
    out.push(...fixedEntries());
    return out;
  }, [fields.name, fields.latinName, fields.handle, projects, mine, blog.data.articles]);

  return { hydrated: profileRead && projectsRead && mineRead && blog.hydrated, entries };
}
