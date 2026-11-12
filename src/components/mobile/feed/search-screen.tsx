"use client";

// Global Search (mobile Figma, Design - Light Mode › Global Search):
// - the field focused with nothing typed: Recent searches (Clear all; ✕ on a
//   row), a query or a person you opened;
// - typing: People, Projects and Blogs that match, the match in the brand ink
//   (a project also says who made it, so a match on the maker reads why);
//   a pick opens it;
// - Search (Enter): the chips People · Post · Projects · Parts & Agile Module
//   · Marketplace · Blog · Settings · Help & tutorials over every kind's
//   results (each with View all), or one kind's under its chip; a chip with
//   nothing typed lists all of it ("Search People" from the Feed). The query
//   and the chip live in the address (a chip changes at once, with no trip to
//   the server), so Back returns to them.
// Recent searches and Settings › Search history keep a search only while
// "Keep my search history" is on (the web's rule, recordSearch). People are
// followed as on the web (Follow / Following; no Friends, D-1). A result opens
// the phone's screen for it; a part or module opens its facts in a sheet.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft02Icon,
  Cancel01Icon,
  Clock01Icon,
  Comment01Icon,
  CpuIcon,
  FavouriteIcon,
  Globe02Icon,
  HelpCircleIcon,
  MoreHorizontalIcon,
  Search01Icon,
  Settings02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Tag } from "@/components/ideeza/tag";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { CoverImage } from "@/components/blog/cover-image";
import { recordSearch } from "@/lib/data/activity-log";
import { CATEGORIES, CREATORS, formatCount } from "@/lib/feed";
import { clipBuyHref, clipHref, OFFER_NAME } from "@/lib/innovations/clips";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { countsOf, follows, useReactions } from "@/lib/innovations/reactions";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import {
  groupResults,
  highlightParts,
  recentKeyOf,
  searchEntries,
  SEARCH_KINDS,
  SUGGEST_LABEL,
  suggestionsOf,
  withRecent,
  withoutRecent,
  type RecentSearch,
  type SearchEntry,
  type SearchKind,
} from "@/lib/innovations/search";
import { formatDate, formatDateTime } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { T } from "../type";
import { ClipMenu } from "./clip-menu";
import { useRecentSearches } from "./use-feed";
import type { Guard } from "./use-guest";
import { useSearchIndex, type SearchItem } from "./use-search-index";

type Entry = SearchEntry<SearchItem>;

const kindOf = (raw: string | null): SearchKind | null => SEARCH_KINDS.find((k) => k.id === raw)?.id ?? null;

/** How many of a kind the all-kinds results show before "View all". */
const PREVIEW = 3;

/** A result card: surface, border/default, radius/xl (the kit's card). */
const CARD = "flex w-full flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface text-left";

/** Search is signed in (the gate sends everyone else to Welcome), so a clip's ⋯ runs at once. */
const SIGNED_IN: Guard = (_title, run) => run();

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const back = useGoBack("/m");
  const urlQ = (params.get("q") ?? "").trim();
  const urlKind = kindOf(params.get("kind"));
  // What the address says, held here so a chip or a search shows at once; the address follows.
  const [state, setState] = React.useState({ q: urlQ, kind: urlKind, from: `${urlQ}|${urlKind}` });
  const fromUrl = `${urlQ}|${urlKind}`;
  if (state.from !== fromUrl) setState({ q: urlQ, kind: urlKind, from: fromUrl });
  const { q, kind } = state;
  const [text, setText] = React.useState(q);
  const [lastQ, setLastQ] = React.useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
  }
  const field = React.useRef<HTMLInputElement>(null);
  const { hydrated, entries } = useSearchIndex();
  const { recent, update } = useRecentSearches();
  const keep = useSettings().privacy.keepSearchHistory;
  const toast = useToast();

  const go = (nextQ: string, nextKind: SearchKind | null) => {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    if (nextKind) sp.set("kind", nextKind);
    setState((s) => ({ ...s, q: nextQ, kind: nextKind }));
    window.history.replaceState(null, "", `/m/search${sp.size ? `?${sp}` : ""}`);
  };

  /** Kept only while Settings › Search history keeps searches. */
  const remember = (r: RecentSearch) => {
    if (keep) update((list) => withRecent(list, r));
  };

  const runQuery = (t: string) => {
    remember({ kind: "query", text: t, at: Date.now() });
    recordSearch("palette", t);
    go(t, kind);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    field.current?.blur();
    runQuery(t);
  };

  const open = (entry: Entry) => {
    const it = entry.ref;
    const typed = text.trim() || q;
    if (typed) recordSearch("palette", typed, entry.title);
    if (it.type === "person") {
      remember({ kind: "person", id: it.person.id, name: it.person.name, subtitle: it.subtitle, href: it.href, at: Date.now() });
      router.push(it.href);
    } else if (it.type === "post" || it.type === "market") router.push(clipHref(it.clip.id));
    else if (it.type === "project" || it.type === "blog" || it.type === "settings" || it.type === "help") router.push(it.href);
  };

  const typing = text.trim() !== q || (!q && !kind);

  return (
    <Screen
      top={
        <form role="search" onSubmit={submit} className="flex h-[56px] shrink-0 items-center gap-4 px-8">
          <IconButton type="button" hierarchy="secondary" size="xl" aria-label="Back" icon={<Icon icon={ArrowLeft02Icon} size={22} />} onClick={back} />
          <div className="flex h-[44px] min-w-0 flex-1 items-center gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-6 focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand">
            <span className="text-[color:var(--color-icon-default)]">
              <Icon icon={Search01Icon} size={16} />
            </span>
            <input
              ref={field}
              type="search"
              enterKeyHint="search"
              aria-label="Search"
              autoFocus={!q && !kind}
              value={text}
              maxLength={100}
              placeholder="Search"
              onChange={(e) => setText(e.target.value)}
              className={cn(T.bodyLg, "min-w-0 flex-1 bg-transparent text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] [&::-webkit-search-cancel-button]:hidden")}
            />
            {text && (
              <button
                type="button"
                aria-label="Clear the search"
                onClick={() => {
                  setText("");
                  field.current?.focus();
                }}
                className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            )}
          </div>
        </form>
      }
    >
      {!hydrated ? (
        <div className="px-8">
          <ListBones rows={5} />
        </div>
      ) : typing && !text.trim() ? (
        <Recent
          keep={keep}
          recent={recent}
          onQuery={(t) => {
            setText(t);
            runQuery(t);
          }}
          onPerson={(href) => router.push(href)}
          onRemove={(key) => update((r) => withoutRecent(r, key))}
          onClear={() => {
            if (update(() => [])) toast({ title: "Recent searches cleared" });
          }}
        />
      ) : typing ? (
        <Suggestions entries={entries} q={text} onOpen={open} onSearch={() => submit()} />
      ) : (
        <Results entries={entries} q={q} kind={kind} onKind={(k) => go(q, k)} onOpen={open} />
      )}
    </Screen>
  );
}

function Recent({
  keep,
  recent,
  onQuery,
  onPerson,
  onRemove,
  onClear,
}: {
  keep: boolean;
  recent: RecentSearch[];
  onQuery: (t: string) => void;
  onPerson: (href: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  const off = keep ? null : (
    <p className={cn(T.meta, "text-text-tertiary")}>
      Search history is off in Settings, so new searches aren’t kept.
    </p>
  );
  if (!recent.length) {
    return (
      <div className="flex flex-col gap-2 px-8 py-4">
        <p className={T.body}>Search people, posts, projects, parts, the marketplace, blogs, settings and help.</p>
        {off}
      </div>
    );
  }
  return (
    <section className="flex flex-col gap-2 px-8 pb-8">
      <div className="flex items-center justify-between">
        <h2 className={T.section}>Recent searches</h2>
        <button type="button" onClick={onClear} className={cn(T.body, "-mr-2 min-h-[44px] rounded-md px-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus")}>
          Clear all
        </button>
      </div>
      {off}
      <ul className="flex flex-col">
        {recent.map((r) => {
          const key = recentKeyOf(r);
          return (
            <li key={key} className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => (r.kind === "query" ? onQuery(r.text) : onPerson(r.href))}
                className="flex min-h-[52px] min-w-0 flex-1 items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {r.kind === "query" ? (
                  <>
                    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
                      <Icon icon={Clock01Icon} size={20} />
                    </span>
                    <span className={cn(T.body, "truncate text-text-primary")}>{r.text}</span>
                  </>
                ) : (
                  <>
                    <PersonAvatar id={r.id} name={r.name} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn(T.bodyLg, "truncate")}>{r.name}</span>
                      <span className={cn(T.meta, "truncate")}>{r.subtitle}</span>
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label={`Remove ${r.kind === "query" ? r.text : r.name} from recent searches`}
                onClick={() => onRemove(key)}
                className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={20} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PersonAvatar({ id, name, size = "md" }: { id: string; name: string; size?: "sm" | "md" }) {
  const creator = CREATORS.find((c) => `feed:${c.id}` === id);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <Avatar size={size} initials={creator?.initials ?? initials} color={creator?.color} />;
}

function Marked({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, i) =>
        p.match ? (
          <span key={i} className="text-text-brand">
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}

function Suggestions({ entries, q, onOpen, onSearch }: { entries: readonly Entry[]; q: string; onOpen: (e: Entry) => void; onSearch: () => void }) {
  const groups = suggestionsOf(entries, q);
  return (
    <div className="flex flex-col gap-6 px-8 pb-8">
      {groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className={T.section}>{SUGGEST_LABEL[g.kind]}</h2>
          <ul className="flex flex-col">
            {g.entries.map((e) => {
              const sub = e.ref.type === "person" ? e.ref.subtitle : e.ref.type === "project" || e.ref.type === "blog" ? `by ${e.ref.by}` : null;
              return (
                <li key={`${e.kind}:${e.id}`}>
                  <button type="button" onClick={() => onOpen(e)} className="flex min-h-[48px] w-full items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
                    <Thumb item={e.ref} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn(e.ref.type === "person" ? T.bodyLg : T.body, "truncate text-text-primary")}>
                        <Marked text={e.title} q={q} />
                      </span>
                      {sub && (
                        <span className={cn(T.meta, "truncate")}>
                          <Marked text={sub} q={q} />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onSearch}>
        See all results for “{q.trim()}”
      </Button>
    </div>
  );
}

function Thumb({ item }: { item: SearchItem }) {
  if (item.type === "person") return <PersonAvatar id={item.person.id} name={item.person.name} size="sm" />;
  const src = item.type === "project" ? item.image : item.type === "post" || item.type === "market" ? item.clip.poster : null;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- the result's picture
    return <img src={src} alt="" className="size-[32px] shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
      <Icon icon={CpuIcon} size={16} />
    </span>
  );
}

function Results({
  entries,
  q,
  kind,
  onKind,
  onOpen,
}: {
  entries: readonly Entry[];
  q: string;
  kind: SearchKind | null;
  onKind: (k: SearchKind | null) => void;
  onOpen: (e: Entry) => void;
}) {
  const [category, setCategory] = React.useState<string | null>(null);
  const ofKind = kind ? (q ? searchEntries(entries, q, kind) : entries.filter((e) => e.kind === kind)) : [];
  // Search › Post narrows by the web's Innovations categories (the Feed itself stays one order).
  const categories = kind === "post" ? CATEGORIES.filter((c) => c.id !== "all" && ofKind.some((e) => e.ref.type === "post" && e.ref.clip.category === c.id)) : [];
  const one = kind === "post" && category ? ofKind.filter((e) => e.ref.type === "post" && e.ref.clip.category === category) : ofKind;
  const all = kind ? [] : groupResults(entries, q);
  const nothing = kind ? one.length === 0 : all.length === 0;
  return (
    <div className="flex flex-col gap-8 pb-8">
      <div role="group" aria-label="What to search" className="flex gap-4 overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SEARCH_KINDS.map((k) => (
          <Tag key={k.id} size="md" selected={kind === k.id} onClick={() => onKind(kind === k.id ? null : k.id)}>
            {k.label}
          </Tag>
        ))}
      </div>
      {categories.length > 1 && (
        <div role="group" aria-label="Category" className="-mt-4 flex gap-4 overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <Tag key={c.id} size="sm" selected={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
              {c.label}
            </Tag>
          ))}
        </div>
      )}
      {nothing ? (
        <div className="px-8">
          <EmptyState
            icon={Search01Icon}
            title={q ? `No results for “${q}”` : "Nothing here yet"}
            body={q ? "Check the spelling, or try another word or another chip." : "There is nothing of this kind to show yet."}
          />
        </div>
      ) : kind ? (
        <ResultList kind={kind} entries={one} q={q} onOpen={onOpen} />
      ) : (
        all.map((g) => (
          <section key={g.kind} className="flex flex-col gap-4">
            <h2 className={cn(T.section, "px-8")}>{SEARCH_KINDS.find((k) => k.id === g.kind)?.label}</h2>
            <ResultList kind={g.kind} entries={g.entries.slice(0, PREVIEW)} q={q} onOpen={onOpen} />
            {g.entries.length > PREVIEW && (
              <div className="px-8">
                <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => onKind(g.kind)}>
                  View all
                </Button>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function ResultList({ kind, entries, q, onOpen }: { kind: SearchKind; entries: readonly Entry[]; q: string; onOpen: (e: Entry) => void }) {
  if (kind === "settings" || kind === "help") {
    return (
      <div className="px-8">
        <ListCard label={kind === "settings" ? "Settings" : "Help & tutorials"}>
          {entries.map((e) =>
            e.ref.type === "settings" || e.ref.type === "help" ? (
              <ListRow
                key={e.id}
                icon={kind === "settings" ? Settings02Icon : HelpCircleIcon}
                title={<Marked text={e.title} q={q} />}
                meta={e.ref.where}
                onClick={() => onOpen(e)}
              />
            ) : null,
          )}
        </ListCard>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 px-8">
      {/* Money is a Testnet demo: said once over the Marketplace cards. */}
      {kind === "marketplace" && <TestnetDemoBadge className="self-start" />}
      <ul className={cn("flex flex-col", kind !== "people" && "gap-6")}>
        {entries.map((e) => (
          <li key={`${e.kind}:${e.id}`}>
            <ResultCard entry={e} q={q} onOpen={() => onOpen(e)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ entry, q, onOpen }: { entry: Entry; q: string; onOpen: () => void }) {
  const settings = useSettings();
  const it = entry.ref;
  switch (it.type) {
    case "person":
      return <PersonResult item={it} q={q} onOpen={onOpen} />;
    case "post":
      return <PostResult item={it} q={q} onOpen={onOpen} />;
    case "project":
      return (
        <button type="button" onClick={onOpen} className={cn(CARD, "outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- the project's picture
            <img src={it.image} alt="" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <span aria-hidden className="flex aspect-[16/9] w-full items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
              <Icon icon={CpuIcon} size={32} />
            </span>
          )}
          <span className="flex flex-col gap-1 p-6">
            <span className={T.section}>
              <Marked text={it.name} q={q} />
            </span>
            <span className={T.body}>{it.by}</span>
          </span>
        </button>
      );
    case "part":
      return <PartResult item={it} q={q} />;
    case "market":
      return <MarketResult item={it} q={q} onOpen={onOpen} />;
    case "blog":
      return (
        <button type="button" onClick={onOpen} className={cn(CARD, "flex-row items-center gap-6 p-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={T.meta}>{it.by}</span>
            <span className={T.section}>
              <Marked text={it.title} q={q} />
            </span>
            <span className={cn(T.meta, "text-text-tertiary")}>{formatDate(it.at, settings.language.dateLocale, { style: "medium" })}</span>
          </span>
          {it.cover && <CoverImage cover={it.cover} decorative className="size-[72px] shrink-0 rounded-md" />}
        </button>
      );
    default:
      return null;
  }
}

/** Figma 03 / 04: the post with its ⋯ (the clip's menu), "see more / see less", and its
 *  appreciations, comments and views as everyone sees them now. */
function PostResult({ item, q, onOpen }: { item: Extract<SearchItem, { type: "post" }>; q: string; onOpen: () => void }) {
  const settings = useSettings();
  const { reactions } = useReactions();
  const comments = useCommentCount(item.clip.postId, sampleSeedOf(item.clip.postId));
  const counts = countsOf(reactions, item.clip.postId, item.clip.base);
  const [more, setMore] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [used, setUsed] = React.useState(false);
  const clip = item.clip;
  const long = clip.description.length > 140;
  return (
    <div className={CARD}>
      <div className="flex items-center gap-6 p-6">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          <Avatar size="md" initials={clip.creator.initials} color={clip.creator.color} />
          <span className="flex min-w-0 flex-col">
            <span className={cn(T.bodyLg, "truncate")}>{clip.creator.name}</span>
            <span className={cn(T.meta, "flex items-center gap-2")}>
              {formatDate(clip.sharedAt, settings.language.dateLocale, { style: "medium" })}
              <span aria-hidden>•</span>
              <Icon icon={Globe02Icon} size={12} aria-label="Public" aria-hidden={false} />
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label={`More for ${clip.title}`}
          onClick={() => {
            setUsed(true);
            setMenu(true);
          }}
          className="-mr-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={MoreHorizontalIcon} size={20} />
        </button>
      </div>
      <button type="button" onClick={onOpen} className={cn(T.section, "px-6 pb-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
        <Marked text={clip.title} q={q} />
      </button>
      {clip.description && (
        <p className="px-6 pb-6">
          <span className={cn(T.body, !more && "line-clamp-3")}>{clip.description}</span>
          {long && (
            <button type="button" onClick={() => setMore((m) => !m)} className={cn(T.rowTitle, "min-h-[44px] text-text-brand outline-none hover:underline focus-visible:underline")}>
              {more ? "See less" : "See more"}
            </button>
          )}
        </p>
      )}
      {clip.poster && (
        <button type="button" onClick={onOpen} aria-label={`Open ${clip.title}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus">
          {/* eslint-disable-next-line @next/next/no-img-element -- the clip's picture */}
          <img src={clip.poster} alt="" className="aspect-[4/3] w-full object-cover" />
        </button>
      )}
      <span className={cn(T.body, "flex items-center gap-8 px-6 py-4")}>
        <span className="flex items-center gap-2" aria-label={`${counts.appreciations} appreciations`}>
          <Icon icon={FavouriteIcon} size={16} />
          {formatCount(counts.appreciations)}
        </span>
        <span className="flex items-center gap-2" aria-label={`${comments ?? 0} comments`}>
          <Icon icon={Comment01Icon} size={16} />
          {formatCount(comments ?? 0)}
        </span>
        <span className="flex items-center gap-2" aria-label={`${counts.views} views`}>
          <Icon icon={ViewIcon} size={16} />
          {formatCount(counts.views)}
        </span>
      </span>
      {/* Mounted once asked for (and kept, for the sheets it opens): not one menu per card. */}
      {used && <ClipMenu clip={clip} open={menu} onClose={() => setMenu(false)} height={null} guard={SIGNED_IN} />}
    </div>
  );
}

/** Figma 06: an item on sale. Buy now: the current price and Buy now; an auction: the bid, when it
 *  ends and View Auction. Both open the item's marketplace. */
function MarketResult({ item, q, onOpen }: { item: Extract<SearchItem, { type: "market" }>; q: string; onOpen: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const { reactions } = useReactions();
  const counts = countsOf(reactions, item.clip.postId, item.clip.base);
  const { clip, offer } = item;
  const auction = offer.kind === "main" ? offer.auction : undefined;
  return (
    <div className={CARD}>
      <button type="button" onClick={onOpen} className="relative block text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        {clip.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- the item's picture
          <img src={clip.poster} alt="" className="aspect-[16/10] w-full object-cover" />
        ) : (
          <span aria-hidden className="flex aspect-[16/10] w-full items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
            <Icon icon={CpuIcon} size={32} />
          </span>
        )}
        {clip.stage && <Tag size="md" className="absolute right-6 top-6">{clip.stage}</Tag>}
      </button>
      <div className="flex flex-col gap-4 p-6">
        <span className={T.section}>
          <Marked text={clip.title} q={q} />
        </span>
        <span className={cn(T.body, "flex items-center justify-between gap-4")}>
          <span className="truncate">{clip.creator.name}</span>
          <span className="flex shrink-0 items-center gap-4">
            <span className="flex items-center gap-2">
              <Icon icon={ViewIcon} size={16} />
              {formatCount(counts.views)}
            </span>
            <span className="flex items-center gap-2">
              <Icon icon={FavouriteIcon} size={16} />
              {formatCount(counts.appreciations)}
            </span>
          </span>
        </span>
        <span className="flex flex-wrap gap-2">
          {[...new Set(clip.offers.map((o) => o.kind))].map((k) => (
            <Badge key={k} tone="blue">
              {OFFER_NAME[k]}
            </Badge>
          ))}
        </span>
        <span className="flex flex-col gap-1 border-t-[length:var(--border-width-1)] border-solid border-border pt-4">
          <span className={T.body}>{auction ? auction.bidLabel : offer.kind === "main" ? "Current Price" : `${OFFER_NAME[offer.kind]} from`}</span>
          <span className={T.section}>{auction ? auction.bid : offer.price}</span>
          {auction?.endsAt && <span className={cn(T.meta, "text-text-warning")}>Ends {formatDateTime(auction.endsAt, settings.language.dateLocale, { style: "medium" })}</span>}
        </span>
        <Button size="xl" className="w-full" onClick={() => router.push(clipBuyHref(clip))}>
          {auction ? "View Auction" : "Buy now"}
        </Button>
      </div>
    </div>
  );
}

/** Figma 05: a part or an Agile Module. It has no phone page, so it opens its facts in a sheet. */
function PartResult({ item, q }: { item: Extract<SearchItem, { type: "part" }>; q: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={cn(CARD, "outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
        <span aria-hidden className="flex aspect-[16/9] w-full items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
          <Icon icon={CpuIcon} size={40} />
        </span>
        <span className="flex flex-col gap-2 p-6">
          <span className="flex items-start justify-between gap-4">
            <span className={T.section}>
              <Marked text={item.title} q={q} />
            </span>
            <Badge tone="neutral">{item.tag}</Badge>
          </span>
          <span className={T.body}>{item.meta}</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={item.title} description={item.tag}>
        <dl className="flex flex-col gap-4">
          {item.facts.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <dt className={T.meta}>{f.label}</dt>
              <dd className={cn(T.body, "text-text-primary")}>{f.value}</dd>
            </div>
          ))}
          {item.features.length > 0 && (
            <div className="flex flex-col gap-1">
              <dt className={T.meta}>Features</dt>
              <dd>
                <ul className="flex flex-col gap-1">
                  {item.features.map((x) => (
                    <li key={x} className={cn(T.body, "text-text-primary")}>
                      {x}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
        <p className={cn(T.meta, "text-text-tertiary")}>Add it to a product from the PCB editor on the web.</p>
      </Sheet>
    </>
  );
}

function PersonResult({ item, q, onOpen }: { item: Extract<SearchItem, { type: "person" }>; q: string; onOpen: () => void }) {
  const { reactions, setFollow, hydrated } = useReactions();
  const toast = useToast();
  // Your own choice only: a new account starts following no one.
  const on = item.followKey ? follows(reactions, item.followKey, false) : false;
  return (
    <div className="flex flex-col gap-4 border-b-[length:var(--border-width-1)] border-solid border-border py-6">
      <button type="button" onClick={onOpen} className="flex items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <PersonAvatar id={item.person.id} name={item.person.name} />
        <span className="flex min-w-0 flex-col">
          <span className={cn(T.bodyLg, "truncate")}>
            <Marked text={item.person.name} q={q} />
          </span>
          <span className={cn(T.meta, "line-clamp-2")}>{item.subtitle}</span>
        </span>
      </button>
      {item.followKey && (
        <Button
          hierarchy={on ? "secondary" : "primary"}
          size="lg"
          className="ml-[52px]"
          aria-pressed={on}
          disabled={!hydrated}
          onClick={() => {
            if (!setFollow(item.followKey as string, !on)) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
          }}
        >
          {on ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}
