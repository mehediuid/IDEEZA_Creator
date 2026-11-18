"use client";

// A build's news where no build pill can say it (Shared kit KIT-TO-03 / 03b /
// 03c, 10617:4745 · 4793 · 4829): off the five tabs — a project, a product,
// Settings, the AI chat of another build — a build that starts running says
// so with its bar, one that finishes says "Build ready", one that stops (a
// piece failed, or the whole build on our side) says "Build stopped"; each
// with Open, to the build's chat. Mounted once by the /m root. Nothing is said
// about the build already on screen (its chat or its pieces), nor about what
// happened before this page loaded, and ready / stopped follow Settings ›
// Notifications (the web's toast gate).

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { allItems, statusOf, useCreateHistory, type BuildJob } from "@/lib/create/history";
import { buildNotices } from "@/lib/notifications/sources";
import { useToastGate } from "@/components/notifications/use-notices";
import { BUILD_TOASTS, useToast } from "../kit/toast";
import { pillOnScreen } from "./build-pill";

type Phase = "waiting" | "running" | "ready" | "stopped";

function phaseOf(job: BuildJob): Phase {
  if (job.blocked) return "waiting";
  const s = statusOf(job);
  if (s === "queued") return "waiting";
  if (s === "running") return "running";
  return s === "ready" ? "ready" : "stopped";
}

export function BuildWatcher() {
  const { hydrated, builds, attentionBuilds, getChat } = useCreateHistory();
  const allowed = useToastGate();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const seen = React.useRef<Map<string, Phase> | null>(null);

  React.useEffect(() => {
    if (!hydrated) return;
    const first = seen.current === null;
    const was = seen.current ?? new Map<string, Phase>();
    const next = new Map<string, Phase>();
    for (const job of builds) {
      const phase = phaseOf(job);
      next.set(job.id, phase);
      const before = was.get(job.id);
      // The first look only learns where every build stands; news is a change after it.
      if (first || before === phase || (before === undefined && phase !== "running")) continue;
      if (pillOnScreen()) continue;
      if (pathname === `/m/ai/chat/${job.chatId}` || pathname === `/m/ai/build/${job.id}`) continue;
      const open = () => router.push(getChat(job.chatId) ? `/m/ai/chat/${job.chatId}` : `/m/ai/build/${job.id}`);
      const name = job.projectChoiceName?.trim() || job.title;
      if (phase === "running") {
        const live = allItems(job).filter((i) => i.status !== "skipped");
        const progress = live.length ? live.reduce((s, i) => s + i.progress, 0) / live.length : 0;
        toast(BUILD_TOASTS.running(name, progress, open));
        continue;
      }
      if (phase !== "ready" && phase !== "stopped") continue;
      const att = attentionBuilds.find((a) => a.job.id === job.id);
      if (att && !allowed(buildNotices([att], (id) => !!getChat(id))[0])) continue;
      toast(phase === "ready" ? BUILD_TOASTS.ready(open) : BUILD_TOASTS.stopped(open));
    }
    seen.current = next;
  }, [hydrated, builds, attentionBuilds, allowed, getChat, pathname, router, toast]);

  return null;
}
