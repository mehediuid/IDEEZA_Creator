"use client";

// 05 · Versions (M6) and 05d · Review version n. The web's Versions rail
// block as its own screen, opened from the page's Versions row: one card per
// chat, its "From chat “…”" row first (it opens the chat on the AI tab), then
// each saved version newest first — "Version n · current", "Saved …", the
// pieces, and Added / Dropped / Changed (Products for version 1), each product
// a row that opens it at that version. More than 5: Show all versions.
//
// Review version n (05d), opened by the Overview's notice: what changed per
// product, then Save version n — the web's version save (`saveBuild`, kind
// "version") behind the edit gate (a live listing pauses first) — or Not now.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AiChat02Icon, GitBranchIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { piecesOf } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { VERSIONS_SHOWN, firstVersions, versionCountOf, versionGroupsOf } from "@/lib/manual/rail-rows";
import { saveModeOf, versionChangesOf } from "@/lib/manual/save-step";
import { changeLinesOf, phoneHrefOf, phoneProjectHref, phoneProjectPath } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { PRESSED } from "../kit/press";
import { T } from "../type";
import { EmptyState } from "../kit/state";
import { Chevron, LIST_CARD, LIST_ROW, ListCard, ProductRow } from "./parts";

const ROW = cn("flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED);
import { ProjectLoading, ProjectMissing } from "./project-screen";
import { usePhoneWriteGate } from "./write-gate";

export function VersionsScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const [all, setAll] = React.useState(false);
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  const { project, view } = data;
  const groups = versionGroupsOf(view.versions, view.lineages, project.id);
  const total = versionCountOf(groups);
  const shown = all ? groups : firstVersions(groups, VERSIONS_SHOWN);
  return (
    <Screen top={<TopBar back={phoneProjectHref(project.id)} title="Versions" />} className="px-8 pb-12">
      <div className="flex flex-col gap-8">
        <p className={T.meta}>{project.name} · newest first</p>
        {groups.length === 0 && <p className={T.body}>Made by hand — there are no saved versions to compare.</p>}
        {shown.map((g) => (
          // One card per chat: the chat's row first (it opens the chat), then each saved version.
          <ul key={g.key} aria-label={g.heading} className={LIST_CARD}>
            {g.chatHref ? (
              <li className={LIST_ROW}>
                <Link href={phoneHrefOf(g.chatHref) ?? "/m/ai"} className={ROW}>
                  <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                    <Icon icon={AiChat02Icon} size={24} />
                  </span>
                  <span className={cn(T.rowTitle, "min-w-0 flex-1 truncate")}>{g.heading}</span>
                  <Chevron />
                </Link>
              </li>
            ) : (
              <li className={cn(LIST_ROW, "p-6")}>
                <p className={cn(T.rowTitle, "text-text-secondary")}>{g.heading}</p>
              </li>
            )}
            {g.rows.map((r) => (
              <li key={r.key} className={cn(LIST_ROW, "flex flex-col gap-2 p-6")}>
                <span className={T.name}>{r.title}</span>
                {r.saved && <span className={T.meta}>{r.saved.map((m) => (m.kind === "time" ? m.time.text : m.text)).join("")}</span>}
                {(r.pieces || r.gone) && (
                  <span className={T.meta}>{[r.pieces, r.gone ? "Its build isn't in this browser any more." : null].filter(Boolean).join(" · ")}</span>
                )}
                {r.lines.map((l) => (
                  <div key={l.label} className="flex flex-col pt-2">
                    <p className={T.meta}>{l.label}</p>
                    <ul className="flex flex-col">
                      {l.items.map((it, i) => (
                        <li key={`${it.name}-${i}`}>
                          {it.href ? (
                            // Each product opens at this version: a row, not an inline link.
                            <Link
                              href={phoneHrefOf(it.href) ?? "#"}
                              className={cn("-mx-2 flex min-h-[44px] items-center gap-4 rounded-md px-2 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED)}
                            >
                              <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>{it.name}</span>
                              <Chevron />
                            </Link>
                          ) : (
                            <span className={cn(T.body, "flex min-h-[44px] items-center text-text-primary")}>{it.name}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        ))}
        {total > VERSIONS_SHOWN && (
          <div>
            <Button hierarchy="secondary" size="xl" onClick={() => setAll((v) => !v)}>
              {all ? "Show fewer versions" : "Show all versions"}
            </Button>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ─────────────────────────── 05d · Review version n ───────────────────────────

export function ReviewVersionScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const params = useSearchParams();
  const buildId = params.get("build");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  return <ReviewVersion projectId={data.project.id} buildId={buildId} />;
}

function ReviewVersion({ projectId, buildId }: { projectId: string; buildId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { projects, saveBuild } = useManualProjects();
  const { builds, chats } = useCreateHistory();
  const gate = usePhoneWriteGate(projectId);
  const [refused, setRefused] = React.useState<string | null>(null);
  const project = projects.find((p) => p.id === projectId) ?? null;
  const job = builds.find((b) => b.id === buildId) ?? null;
  const back = phoneProjectHref(projectId);
  const goBack = useGoBack(back);
  const [now] = React.useState(() => Date.now());

  const review = React.useMemo(() => {
    if (!project || !job) return null;
    const lineage = builds.filter((b) => b.chatId === job.chatId && b.id !== job.id);
    const mode = saveModeOf(job, lineage, projects, builds, chats);
    if (mode.kind === "saved") return { saved: true as const };
    const version = mode.kind === "version" ? mode.version : 1;
    const changes = versionChangesOf(project, job, lineage, builds, chats, now);
    const products = productsOf(job);
    const pieces = Object.fromEntries(products.map((p) => [p.name, p.items.filter((i) => i.status !== "skipped").length]));
    const lines = changeLinesOf({ version, ...changes, products: products.map((p) => p.name), pieces });
    const thumbs = new Map(products.map((p) => [p.name, p.conceptImageUrl]));
    const p = piecesOf(job);
    return { saved: false as const, lineage, version, lines, thumbs, pieces: p, mode };
  }, [project, job, builds, chats, projects, now]);

  if (!project || !job || !review) {
    return (
      <Screen top={<TopBar back={back} title="Review version" />} className="px-8">
        <p className={cn(T.body, "pt-8")}>This build isn&apos;t in this browser any more.</p>
      </Screen>
    );
  }
  if (review.saved) {
    return (
      <Screen top={<TopBar back={back} title="Review version" />} className="px-8 pt-8">
        <EmptyState icon={GitBranchIcon} title="This version is saved already" body="It's in Versions." action={{ label: "Open Versions", href: phoneProjectPath(projectId, "versions") }} />
      </Screen>
    );
  }

  const v = review.version;
  const save = () => {
    setRefused(null);
    const out = gate.guard("addProduct", (undo) => {
      const result = saveBuild(job, review.lineage, { kind: "version", projectId });
      if (!result) {
        undo();
        return setRefused("That project isn't in this browser any more.");
      }
      toast({ title: `Version ${v} saved` });
      router.replace(back);
    });
    if (out.kind === "refused") setRefused(out.reason);
  };

  return (
    <Screen
      top={<TopBar back={back} title={`Review version ${v}`} />}
      footer={
        <BottomBar className="gap-6 pt-8">
          {/* What Save does, right above it. */}
          <p className={T.meta}>
            Saving makes version {v} the current one. Version {Math.max(1, v - 1)} stays in Versions, and you can open it any time.
          </p>
          <Button size="xl" className="w-full" onClick={save}>
            Save version {v}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={goBack}>
            Not now
          </Button>
        </BottomBar>
      }
      className="px-8 pb-12"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className={T.title}>Version {v} is ready</h2>
          <p className={T.meta}>
            Built from the chat on {formatDateTime(job.endedAt ?? job.updatedAt)} ·{" "}
            {review.pieces.ready === review.pieces.total ? `All ${review.pieces.total} pieces ready` : `${review.pieces.ready} of ${review.pieces.total} pieces ready`}
          </p>
        </div>
        <h3 className={T.section}>What changed</h3>
        <ListCard label="What changed">
          {review.lines.map((l) => (
            <ProductRow key={`${l.tone}-${l.name}`} thumb={review.thumbs.get(l.name) ?? null} name={l.name} meta={l.line} />
          ))}
        </ListCard>
        {(refused || gate.reasonOf("addProduct")) && <Banner tone="attention">{refused ?? gate.reasonOf("addProduct")}</Banner>}
      </div>
      {gate.sheet}
    </Screen>
  );
}
