"use client";

// Small pieces the post page and its product view share: the breadcrumb (its
// first crumb goes back to the feed as it was left, filters and scroll, when
// that is where the visitor came from), Copy link, the post's "Reported" mark,
// a product's piece chips, and the rail's sticky offset.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Image01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { LOCKED_PIECES, OPEN_PIECES, PIECE_LABEL, type PostProduct } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";
import { usePostToast } from "./toast";
import { motionReduced } from "@/lib/settings/appearance";

/** A control a thumb can hit on a phone or a touch screen. */
export const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** A rail block, and any other bordered block on the page. */
export const CARD = "rounded-xl border border-solid border-border bg-bg-surface p-8";

export const FEED_HREF = "/innovations";

// ─────────────────────────── breadcrumb ───────────────────────────

type NavigationEntries = { currentEntry: { index: number } | null; entries: () => { url: string | null }[] };

/** Whether the page before this one, in this tab, was the feed. Read from the
 *  Navigation API where the browser has it; without it the crumb is a plain link. */
function cameFromFeed(): boolean {
  const nav = (window as unknown as { navigation?: NavigationEntries }).navigation;
  const at = nav?.currentEntry?.index ?? -1;
  if (!nav || at < 1 || typeof nav.entries !== "function") return false;
  const prev = nav.entries()[at - 1]?.url;
  if (!prev) return false;
  try {
    const url = new URL(prev);
    return url.origin === window.location.origin && url.pathname === FEED_HREF;
  } catch {
    return false;
  }
}

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export type PostCrumb = { label: string; href?: string };

/** "Innovations › {post}" or "Innovations › {post} › {product}". The first crumb is
 *  the feed; the last is this page. A middle crumb reads "…" below a 640 px page. */
export function PostBreadcrumb({ trail }: { trail: readonly PostCrumb[] }) {
  const router = useRouter();
  const all: PostCrumb[] = [{ label: "Innovations", href: FEED_HREF }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-3 text-md leading-md">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          const middle = i > 0 && !last;
          return (
            <li key={`${i}:${crumb.label}`} className={last ? "flex min-w-0 items-center gap-3" : "flex shrink-0 items-center gap-3"}>
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} title={crumb.label} className="truncate font-semibold text-text-primary">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  aria-label={middle ? crumb.label : undefined}
                  onClick={
                    i === 0
                      ? (e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                          if (!cameFromFeed()) return;
                          e.preventDefault();
                          router.back();
                        }
                      : undefined
                  }
                  className={CRUMB_LINK}
                >
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

// ─────────────────────────── copy link ───────────────────────────

/** Copies the address of `href` on this site and says so in the post's toast. */
export function useCopyLink(href: string): () => void {
  const toast = usePostToast();
  return React.useCallback(() => {
    const url = new URL(href, window.location.origin).toString();
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied"))
      .catch(() => toast("Couldn't copy the link. Copy it from the address bar."));
  }, [href, toast]);
}

// ─────────────────────────── reported ───────────────────────────

/** The posts this browser reported. Until there is moderation a report stays
 *  here, so the same post can't be reported twice (its menu reads "Reported"). */
const REPORTED_POSTS_KEY = "ideeza:innovations:reported-posts";

const idsIn = (raw: string | null): string[] => {
  const { value } = parseStored(raw);
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
};

export function useReportedPost(postId: string): { reported: boolean; markReported: () => boolean } {
  const { hydrated, raw } = useStoredKey(REPORTED_POSTS_KEY);
  const reported = React.useMemo(() => idsIn(raw).includes(postId), [raw, postId]);
  const markReported = React.useCallback(() => {
    if (!hydrated) return false;
    const cur = idsIn(readStoredKey(REPORTED_POSTS_KEY));
    if (cur.includes(postId)) return true;
    return writeStoredKey(REPORTED_POSTS_KEY, [...cur, postId]).ok;
  }, [hydrated, postId]);
  return { reported, markReported };
}

// ─────────────────────────── images ───────────────────────────

/** An image that gives way to `fallback` when it doesn't load (a concept image
 *  this server no longer holds, say). An error before hydration counts too. */
export function PostImg({ src, alt = "", className, fallback }: { src: string; alt?: string; className?: string; fallback: React.ReactNode }) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  if (failedSrc === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(el) => {
        if (el && el.complete && el.naturalWidth === 0) setFailedSrc(src);
      }}
      src={src}
      alt={alt}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}

/** What an image that didn't load leaves in its place. */
export function ImageGone({ label }: { label?: string }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm leading-sm text-text-secondary">
      <Icon icon={Image01Icon} size={label ? 24 : 18} className="text-text-tertiary" />
      {label}
    </span>
  );
}

// ─────────────────────────── pieces ───────────────────────────

/** A product's pieces as chips: the open ones plain, the ones that come with a copy with a lock. */
export function PieceChips({ product, className }: { product: PostProduct; className?: string }) {
  const open = OPEN_PIECES.filter((k) => product.pieces.includes(k));
  const locked = LOCKED_PIECES.filter((k) => product.pieces.includes(k));
  if (open.length + locked.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap gap-3", className)}>
      {open.map((k) => (
        <Tag key={k} size="sm">
          {k === "parts" && product.parts.length > 0 ? partsLabel(product.parts.length) : PIECE_LABEL[k]}
        </Tag>
      ))}
      {locked.map((k) => (
        <Tag key={k} size="sm" icon={<Icon icon={SquareLock02Icon} size={12} />} className="text-text-secondary">
          {PIECE_LABEL[k]}
          <span className="sr-only">, comes with a copy</span>
        </Tag>
      ))}
    </span>
  );
}

export const partsLabel = (n: number) => `${n} ${n === 1 ? "part" : "parts"}`;
export const productsLabel = (n: number) => `${n} ${n === 1 ? "product" : "products"}`;

/** "0:12" for a clip's length. */
export function durationLabel(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─────────────────────────── sticky rail ───────────────────────────

/**
 * The rail's sticky offset. A rail shorter than the page's scroll area sticks
 * `gap` px from its top; a taller one sticks once its foot is `gap` px above
 * the bottom, so every block in it can still be reached. Measured, so the
 * value goes inline (data, not styling).
 */
export function useStickyTop(gap: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [top, setTop] = React.useState(gap);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const scroller = el.closest<HTMLElement>("#main-content");
    const measure = () => {
      const view = scroller?.clientHeight ?? window.innerHeight;
      const next = Math.min(gap, view - el.offsetHeight - gap);
      setTop((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [gap]);
  return { ref, top };
}

/** Brings the comment thread into view (the counts line, the phone bar, `#comments`). */
export function scrollToComments(behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById("comments");
  if (!el) return;
  const still = motionReduced();
  el.scrollIntoView({ behavior: still ? "auto" : behavior, block: "start" });
}
