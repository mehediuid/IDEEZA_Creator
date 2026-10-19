"use client";

// Reads the Report page uses: every post's stored comments (one key
// per post, so they are found by prefix and re-read when any store changes),
// and a post's title, address and maker from its id — a sample post from the
// sample set, your own from your projects. Read-only.

import * as React from "react";
import { subscribeStores } from "@/lib/key-store";
import { storedCommentsIn, type PostComment } from "@/lib/innovations/comments";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { mineSlugOf, postHref } from "@/lib/innovations/slug";
import { useManualProjects } from "@/lib/manual/projects";

const COMMENTS_PREFIX = "ideeza:innovations:comments:";

export type StoredThread = { postId: string; comments: PostComment[]; reported: string[] };

function readThreads(): StoredThread[] {
  const out: StoredThread[] = [];
  try {
    const s = window.localStorage;
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (!key || !key.startsWith(COMMENTS_PREFIX)) continue;
      const postId = key.slice(COMMENTS_PREFIX.length);
      let value: unknown = null;
      try {
        value = JSON.parse(s.getItem(key) ?? "null");
      } catch {
        continue;
      }
      const stored = storedCommentsIn(value, postId);
      if (stored) out.push({ postId, comments: stored.comments, reported: stored.reported });
    }
  } catch {
    // Site data blocked: nothing to read.
  }
  return out;
}

/** Every post's stored comments; null until read. */
export function useStoredThreads(): StoredThread[] | null {
  const [threads, setThreads] = React.useState<StoredThread[] | null>(null);
  React.useEffect(() => {
    const read = () => setThreads(readThreads());
    read();
    return subscribeStores(read);
  }, []);
  return threads;
}

export type PostInfo = { title: string; href: string; maker: string | null };

const SAMPLE_BY_ID = new Map(SAMPLE_POSTS.map((p) => [p.id, p]));

/** A post's title, address and maker ("you" for your own); null when it is no longer here. */
export function usePostLookup(): { hydrated: boolean; post: (postId: string) => PostInfo | null } {
  const { hydrated, projects } = useManualProjects();
  const post = React.useCallback(
    (postId: string): PostInfo | null => {
      const sample = SAMPLE_BY_ID.get(postId);
      if (sample) return { title: sample.title, href: postHref(sample.slug), maker: sample.creator.name };
      if (postId.startsWith("mine:")) {
        const p = projects.find((x) => x.id === postId.slice("mine:".length));
        if (p) return { title: p.name, href: postHref(mineSlugOf(p)), maker: null };
      }
      return null;
    },
    [projects],
  );
  return { hydrated, post };
}
