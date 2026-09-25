"use client";

// The build's left rail: the whole pipeline, stated up front.
//
// The build page used to be the pipeline — five rows per product down the
// middle of the screen, with nothing else on it until everything finished.
// That is the wrong way round: the list of what will be made is a small,
// fixed thing that never changes, while the thing worth the screen is what
// has actually been made. So the pipeline moved here, beside the canvas, and
// the canvas shows each piece as it lands.
//
// Every piece is listed from the moment the build starts, including the ones
// that have not begun — the point of a pipeline is that you can see the whole
// of it, and a list that grows as it goes tells you nothing about how much is
// left. Products are headings, because a system build runs the same five
// pieces once per product and "PCB" on its own would not say whose.

import * as React from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  ITEM_LABELS,
  productsOf,
  rollupBuild,
  statusOf,
  type BuildItem,
  type BuildJob,
} from "@/lib/create/history";

// What the build is doing, in one word — the rail used to say "Building"
// beside "every piece is ready".
export const STATE_WORD: Record<ReturnType<typeof statusOf>, string> = {
  queued: "Queued",
  running: "Building",
  ready: "Build ready",
  partial: "Needs a retry",
  failed: "Build stopped",
};

export function BuildRail({
  job,
  title,
  /** Which product the canvas is showing, so the rail can mark it. */
  activeProductId,
  onPickProduct,
}: {
  job: BuildJob;
  /** What the build is called — the project, the same name the review card
   *  carries. Falls back to the project named at the question, then to the
   *  primary product. */
  title?: string;
  activeProductId?: string;
  onPickProduct?: (productId: string) => void;
}) {
  const products = React.useMemo(() => productsOf(job), [job]);
  const roll = rollupBuild(job);
  const state = statusOf(job);
  const name = title?.trim() || job.projectChoiceName?.trim() || job.title;

  return (
    <div className="flex flex-col gap-[20px] px-[18px] py-[20px]">
      <div className="flex flex-col gap-[4px]">
        <span className="text-sm font-semibold text-text-tertiary">
          {STATE_WORD[state]}
        </span>
        <p className="text-md font-semibold text-text-primary">{name}</p>
        <p className="text-sm text-text-tertiary">
          {products.length} product{products.length === 1 ? "" : "s"} ·{" "}
          {state === "ready"
            ? "every piece is ready"
            : state === "queued"
              ? "waiting to start"
              : `${Math.round(roll.progress)}% done`}
        </p>
      </div>

      {products.map((product) => (
        <section key={product.id} className="flex flex-col gap-[6px]">
          {/* A product's name, and — where the canvas can show it — the way to
              show it. Selection reads as the selected row everywhere else in
              the app reads: the quiet fill, not violet caps text. */}
          {products.length > 1 && (
            <button
              type="button"
              onClick={() => onPickProduct?.(product.id)}
              disabled={!onPickProduct}
              aria-pressed={product.id === activeProductId}
              className={[
                "w-full rounded-lg px-[6px] py-[5px] text-left text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                product.id === activeProductId
                  ? "bg-bg-subtle text-text-primary"
                  : "text-text-secondary",
                onPickProduct ? "hover:bg-bg-subtle" : "cursor-default",
              ].join(" ")}
            >
              {product.name}
            </button>
          )}
          <ul role="list" className="flex flex-col gap-[2px]">
            {product.items
              .filter((i) => i.status !== "skipped")
              .map((item) => (
                <PipelineRow key={item.kind} item={item} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function PipelineRow({ item }: { item: BuildItem }) {
  const tone =
    item.status === "ready"
      ? "done"
      : item.status === "failed"
        ? "bad"
        : item.status === "building"
          ? "working"
          : "waiting";
  return (
    <li
      data-testid="pipeline-row"
      className={[
        "flex items-center gap-[8px] rounded-lg px-[6px] py-[5px] text-sm",
        tone === "bad" ? "text-text-error" : "text-text-secondary",
        tone === "waiting" ? "text-text-tertiary" : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex shrink-0",
          tone === "working" ? "animate-spin text-text-tertiary" : "",
          tone === "done" ? "text-text-success" : "",
          tone === "bad" ? "text-[var(--color-icon-error)]" : "",
          tone === "waiting" ? "text-text-disabled" : "",
        ].join(" ")}
      >
        <Icon
          icon={
            tone === "done"
              ? CheckmarkCircle02Icon
              : tone === "bad"
                ? Alert02Icon
                : Loading03Icon
          }
          size={14}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{ITEM_LABELS[item.kind]}</span>
      <span className="shrink-0 tabular-nums text-sm text-text-tertiary">
        {item.status === "ready"
          ? "Ready"
          : item.status === "failed"
            ? "Failed"
            : item.status === "building"
              ? `${Math.round(item.progress)}%`
              : "Waiting"}
      </span>
    </li>
  );
}
