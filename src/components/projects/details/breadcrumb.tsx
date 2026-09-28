// Breadcrumb (COR-4): "My projects › {project}", and on the product page
// "My projects › {project} › {product}".
// - Links are ≥ 24 px tall, 44 px on touch.
// - The last crumb is the page: plain text, aria-current, truncated with its
//   full name in `title`.
// - A crumb between the first and the last reads "…" below a 640 px page
//   container (§3.4), and keeps its name for assistive tech.
// It needs a PAGE_CONTAINER ancestor, which both pages have.

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export type Crumb = { label: string; href?: string };

const LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function Breadcrumb({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-3 text-sm leading-sm">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          const middle = i > 0 && !last;
          return (
            <li
              key={`${i}:${crumb.label}`}
              className={last ? "flex min-w-0 items-center gap-3" : "flex shrink-0 items-center gap-3"}
            >
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {last || !crumb.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  title={crumb.label}
                  className="truncate font-semibold text-text-primary"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} aria-label={middle ? crumb.label : undefined} className={LINK}>
                  {middle ? (
                    <>
                      <span className="hidden [@container(min-width:640px)]:inline">{crumb.label}</span>
                      <span aria-hidden className="[@container(min-width:640px)]:hidden">
                        …
                      </span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
