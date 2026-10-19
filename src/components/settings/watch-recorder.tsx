"use client";

// Settings › Your activity › Videos you have watched: a post's video counts as
// watched once it has played for 3 seconds (skipping ahead doesn't count).
// Wrapped round a post's video stage; media events don't bubble, so it
// listens in the capture phase and hears whichever <video> plays inside —
// the browser's player for a sample post, the app's own for a shared clip.
// It adds no box of its own (display: contents).

import * as React from "react";
import { recordWatch, WATCHED_SECONDS } from "@/lib/data/activity-log";
import { postHref } from "@/lib/innovations/slug";

type Progress = { last: number; played: number; done: boolean };

export function WatchRecorder({
  post,
  video,
  children,
}: {
  post: { id: string; slug: string; title: string };
  video: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const what = React.useRef({ postId: post.id, postTitle: post.title, href: postHref(post.slug), video });
  React.useEffect(() => {
    what.current = { postId: post.id, postTitle: post.title, href: postHref(post.slug), video };
  }, [post.id, post.title, post.slug, video]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new WeakMap<HTMLVideoElement, Progress>();
    const videoOf = (e: Event) => (e.target instanceof HTMLVideoElement ? e.target : null);
    const onTime = (e: Event) => {
      const v = videoOf(e);
      if (!v) return;
      const s = seen.get(v);
      if (!s) {
        seen.set(v, { last: v.currentTime, played: 0, done: false });
        return;
      }
      const step = v.currentTime - s.last;
      s.last = v.currentTime;
      if (v.paused || v.seeking || step <= 0 || step > 1.5) return;
      s.played += step;
      if (!s.done && s.played >= WATCHED_SECONDS) {
        s.done = true;
        recordWatch(what.current);
      }
    };
    const onJump = (e: Event) => {
      const v = videoOf(e);
      const s = v && seen.get(v);
      if (v && s) s.last = v.currentTime;
    };
    const onEmptied = (e: Event) => {
      const v = videoOf(e);
      if (v) seen.delete(v);
    };
    el.addEventListener("timeupdate", onTime, true);
    el.addEventListener("seeked", onJump, true);
    el.addEventListener("play", onJump, true);
    el.addEventListener("emptied", onEmptied, true);
    return () => {
      el.removeEventListener("timeupdate", onTime, true);
      el.removeEventListener("seeked", onJump, true);
      el.removeEventListener("play", onJump, true);
      el.removeEventListener("emptied", onEmptied, true);
    };
  }, []);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
