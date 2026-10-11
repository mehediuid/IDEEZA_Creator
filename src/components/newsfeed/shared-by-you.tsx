"use client";

// "Shared by you" — the projects this browser's maker shared to Innovations
// (the project page's ⋯ › Share to Innovations; `showcasedAt` on the
// project). The feed below is a sample dataset with no write path, so a
// shared project shows here, at the top of Innovations, newest first: a
// cover, the name with the post's status, its story, its product count and
// when it was shared, linking to its project page. Nothing renders until the
// stores are read, or when nothing is shared.

import * as React from "react";
import Link from "next/link";
import { CpuIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf, productRowsOf } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { stageWordOf } from "@/lib/manual/share-post";

export function SharedByYou() {
  const { projects, hydrated } = useManualProjects();
  const { builds, hydrated: buildsHydrated } = useCreateHistory();
  const headingId = React.useId();

  const shared = React.useMemo(
    () =>
      projects
        .filter((p) => typeof p.showcasedAt === "number")
        .sort((a, b) => (b.showcasedAt ?? 0) - (a.showcasedAt ?? 0))
        .map((p) => ({
          id: p.id,
          name: p.name.trim() || "Untitled project",
          products: productRowsOf(p).length,
          at: p.showcasedAt as number,
          cover: coverOf(p, buildsOf(p, builds)),
          story: p.post?.story.trim() ?? "",
          status: stageWordOf(p.post?.stage ?? null),
        })),
    [projects, builds],
  );

  if (!hydrated || !buildsHydrated || shared.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-[12px]">
      <h2 id={headingId} className="text-md font-semibold text-text-primary">
        Shared by you
      </h2>
      <ul role="list" className="m-0 grid list-none grid-cols-1 gap-[16px] p-0 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-4">
        {shared.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="group flex items-start gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[10px] outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
            >
              <span className="relative flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-text-tertiary">
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Icon icon={CpuIcon} size={18} />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-[4px]">
                <span className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[2px]">
                  <span className="truncate text-md font-semibold text-text-primary group-hover:text-text-primary">{p.name}</span>
                  {p.status && (
                    <span className="rounded-full bg-bg-brand-subtle px-[8px] py-[1px] text-xs font-semibold text-text-brand">{p.status}</span>
                  )}
                </span>
                {p.story && <span className="line-clamp-2 text-sm leading-relaxed text-text-secondary">{p.story}</span>}
                <span className="text-sm text-text-tertiary">
                  {`${p.products} ${p.products === 1 ? "product" : "products"} · Shared ${formatDate(p.at)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
