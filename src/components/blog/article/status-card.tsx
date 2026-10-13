"use client";

// The article page's status card (spec § Screens 4): the only home of the
// article's status, what it means, and what can be done about it. Buttons for
// the status's main actions, the ⋯ for the rest (never both). While the IDEEZA
// team asks for changes the card turns warning-toned and holds the reasons and
// the one way to act on them, Edit article; a taken-down article says why. A
// demo round is labelled as the automatic check it is. Earlier rounds fold
// away under "Earlier reviews (n)".

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  Link01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, IconButton, Menu, buttonVariants } from "@/components/ideeza";
import { StatusBadges } from "@/components/blog/status-badges";
import type { ArticleActions } from "@/components/blog/article-actions";
import { cardActions, cardReasons, earlierReviews, statusLine, type CardButton, type ReasonLine } from "@/lib/blog/article-view";
import { DEMO_REVIEW_NOTE } from "@/lib/blog/demo-review";
import { editHref, slugOf } from "@/lib/blog/slug";
import { statusOf } from "@/lib/blog/status";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** DS Badge MD (24 px, Caption/MD), as the status badges. */
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";

function Reasons({ lines }: { lines: readonly ReasonLine[] }) {
  return (
    <ol className="m-0 flex list-decimal flex-col gap-4 pl-12 text-md leading-md marker:text-text-secondary">
      {lines.map((r, i) => (
        <li key={i} className="pl-2">
          <strong className="font-semibold text-text-primary">{r.title}</strong> <span className="text-text-secondary">{r.detail}</span>
        </li>
      ))}
    </ol>
  );
}

function DemoBadge() {
  return (
    <Badge tone="neutral" className={BADGE_MD}>
      Demo review
    </Badge>
  );
}

function Earlier({ article }: { article: BlogArticle }) {
  const rounds = earlierReviews(article);
  const [open, setOpen] = React.useState(false);
  const panel = React.useId();
  if (!rounds.length) return null;
  return (
    <div className="flex flex-col gap-6 border-0 border-t border-solid border-border-subtle pt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-[32px] w-fit cursor-pointer items-center gap-3 rounded-md text-md font-semibold leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          TAP,
        )}
      >
        Earlier reviews ({rounds.length})
        <span aria-hidden className={cn("inline-flex transition-transform duration-fast", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <ul id={panel} hidden={!open} className={cn("m-0 list-none flex-col gap-8 p-0", open ? "flex" : "hidden")}>
        {rounds.map((r) => (
          <li key={r.at} className="flex flex-col gap-4">
            <p className="flex flex-wrap items-center gap-4 text-md leading-md">
              <time dateTime={new Date(r.at).toISOString()} className="font-semibold text-text-primary">
                {r.date}
              </time>
              <span className="text-text-secondary">{r.outcome}</span>
              {r.demo && <DemoBadge />}
            </p>
            {r.lines.length > 0 && <Reasons lines={r.lines} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

const BUTTON_ICON = {
  "copy-link": Link01Icon,
  edit: PencilEdit02Icon,
  "discard-changes": Undo02Icon,
} as const;

const BUTTON_LABEL = { "copy-link": "Copy link", edit: "Edit", "discard-changes": "Discard changes" } as const;

function CardAction({ kind, article, actions }: { kind: CardButton; article: BlogArticle; actions: ArticleActions }) {
  if (kind === "continue" || kind === "fix") {
    return (
      <Link href={editHref(slugOf(article))} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "no-underline hover:text-[color:var(--color-button-primary-text)]", TAP)}>
        {kind === "fix" ? "Edit article" : "Continue writing"}
      </Link>
    );
  }
  return (
    <Button
      type="button"
      hierarchy="secondary"
      size="lg"
      className={TAP}
      iconLeading={<Icon icon={BUTTON_ICON[kind]} size={16} />}
      onClick={() => actions.run(kind, article)}
    >
      {BUTTON_LABEL[kind]}
    </Button>
  );
}

export function StatusCard({ article, draftDiffers, actions }: { article: BlogArticle; draftDiffers: boolean; actions: ArticleActions }) {
  const s = statusOf(article);
  const line = statusLine(article, draftDiffers);
  const reasons = cardReasons(article);
  const { buttons, omit } = cardActions(s);
  const menu = actions.menuItems(article, { omit });
  const warn = s === "needs";
  // With reasons to act on, the one way to act sits under them (mockup Article.dc).
  const fixBelow = !!reasons && buttons.includes("fix");
  const top = buttons.filter((b) => !(fixBelow && b === "fix"));

  return (
    <section
      aria-label="Article status"
      className={cn(
        "flex flex-col gap-8 rounded-xl border border-solid p-8",
        warn ? "border-[color:var(--color-border-warning)] bg-bg-warning-subtle" : "border-border-subtle bg-bg-surface",
      )}
    >
      {/* The ⋯ keeps the top-right corner; on a narrow card the buttons wrap under the sentence. */}
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-6">
          <div className="flex min-h-[40px] min-w-0 flex-[1_1_320px] flex-wrap items-center gap-4">
            <StatusBadges article={article} />
            <p className="min-w-0 text-md leading-md text-text-secondary">
              {line.lead && <strong className="font-semibold text-text-primary">{line.lead} </strong>}
              {line.text}
            </p>
          </div>
          {top.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              {top.map((b) => (
                <CardAction key={b} kind={b} article={article} actions={actions} />
              ))}
            </div>
          )}
        </div>
        {menu.length > 0 && (
          <Menu
            label="More actions for this article"
            align="end"
            items={menu}
            trigger={(props) => (
              <IconButton
                {...props}
                type="button"
                hierarchy="secondary"
                size="lg"
                aria-label="More actions for this article"
                icon={<Icon icon={MoreHorizontalIcon} size={20} />}
                className="shrink-0 border-solid max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
              />
            )}
          />
        )}
      </div>

      {reasons && (
        <div className="flex flex-col gap-6 border-0 border-t border-solid border-border-subtle pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-lg font-semibold leading-lg text-text-primary">{reasons.title}</p>
            {reasons.demo && <DemoBadge />}
          </div>
          {reasons.lines.length > 0 ? (
            <Reasons lines={reasons.lines} />
          ) : (
            <p className="text-md leading-md text-text-secondary">No reason was given.</p>
          )}
          {reasons.demo && <p className="text-sm leading-sm text-text-secondary">{DEMO_REVIEW_NOTE}</p>}
          {fixBelow && (
            <div className="flex flex-wrap items-center gap-6">
              <CardAction kind="fix" article={article} actions={actions} />
            </div>
          )}
        </div>
      )}

      <Earlier article={article} />
    </section>
  );
}
