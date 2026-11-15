"use client";

// Global Search (mobile Figma, Design - Light Mode › Global Search), laid out
// as a phone's search (2026 mobile UX pass):
// - the field focused with nothing typed: Recent searches (Clear all; ✕ on a
//   row), a query or a person you opened; then Browse, a row per kind that
//   lists all of it (what a chip with nothing typed does), and the Search
//   history row (On / Off → Settings › Data › Search history);
// - typing: "See all results for …" first (= Enter), then People, Projects and
//   Blogs that match, the match in the brand ink (a project also says who made
//   it, so a match on the maker reads why); a pick opens it;
// - Search (Enter): the chips All · People · Post · Projects · Parts & Agile
//   Module · Marketplace · Blog · Settings · Help & tutorials over every
//   kind's results (each heading with View all), or one kind's under its chip.
//   People are rows with Follow at the end; posts a two-column grid of covers
//   (counts on the picture, ⋯ the clip's menu; the description is on the clip);
//   projects, parts, blogs, settings and help rows; marketplace items product
//   rows with the price and Buy now / View Auction. The query and the chip live
//   in the address (a chip changes at once, with no trip to the server), so
//   Back returns to them.
// Recent searches and Settings › Search history keep a search only while
// "Keep my search history" is on (the web's rule, recordSearch). People are
// followed as on the web (Follow / Following; no Friends, D-1). A result opens
// the phone's screen for it; a part or module opens its facts in a sheet.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Clock01Icon,
  Comment01Icon,
  CpuIcon,
  FavouriteIcon,
  Globe02Icon,
  HelpCircleIcon,
  Layers01Icon,
  MoreHorizontalIcon,
  News01Icon,
  Search01Icon,
  Settings02Icon,
  Store01Icon,
  UserIcon,
  Video01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
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
import { LIST_CARD, ListCard, ListRow } from "../kit/list";
import { MEDIA_INK } from "../kit/media";
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

/** Each kind's picture, in Browse and nowhere else. */
const KIND_ICON: Record<SearchKind, IconValue> = {
  people: UserIcon,
  post: Video01Icon,
  projects: Layers01Icon,
  parts: CpuIcon,
  marketplace: Store01Icon,
  blog: News01Icon,
  settings: Settings02Icon,
  help: HelpCircleIcon,
};

/** How many of a kind the all-kinds results show before "View all" (posts: two rows of two). */
const previewOf = (kind: SearchKind) => (kind === "post" ? 4 : 3);

/** A row's pressed state (touch has no hover). */
const PRESS = "transition-colors duration-fast active:bg-bg-subtle";

/** A 36 px button's tap area grown to 44 (the kit's touch rule). */
const HIT44 = "relative after:absolute after:inset-x-0 after:-inset-y-[4px] after:content-['']";

/** Search is signed in (the gate sends everyone else to Welcome), so a clip's ⋯ runs at once. */
const SIGNED_IN: Guard = (_title, run) => run();

/** The address Settings › Data › Search history lives at. */
const HISTORY_HREF = "/m/settings/data/search-history";

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
        <Start
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
          onBrowse={(k) => go("", k)}
        />
      ) : typing ? (
        <Suggestions entries={entries} q={text} onOpen={open} onSearch={() => submit()} />
      ) : (
        <Results entries={entries} q={q} kind={kind} onKind={(k) => go(q, k)} onOpen={open} />
      )}
    </Screen>
  );
}

/** Nothing typed: what you searched lately, then every kind to browse, then the history switch's row. */
function Start({
  keep,
  recent,
  onQuery,
  onPerson,
  onRemove,
  onClear,
  onBrowse,
}: {
  keep: boolean;
  recent: RecentSearch[];
  onQuery: (t: string) => void;
  onPerson: (href: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onBrowse: (k: SearchKind) => void;
}) {
  return (
    <div className="flex flex-col gap-8 px-8 pb-10 pt-2">
      {recent.length > 0 && (
        <section aria-labelledby="search-recent" className="flex flex-col">
          <div className="flex items-center justify-between">
            <h2 id="search-recent" className={T.section}>
              Recent searches
            </h2>
            <Button hierarchy="ghost" size="md" className={cn(HIT44, "-mr-4")} onClick={onClear}>
              Clear all
            </Button>
          </div>
          <ul className="flex flex-col">
            {recent.map((r) => {
              const key = recentKeyOf(r);
              return (
                <li key={key} className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => (r.kind === "query" ? onQuery(r.text) : onPerson(r.href))}
                    className={cn(PRESS, "-ml-2 flex min-h-[52px] min-w-0 flex-1 items-center gap-6 rounded-md pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
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
                          <span className={cn(T.rowTitle, "truncate")}>{r.name}</span>
                          <span className={cn(T.meta, "truncate")}>{r.subtitle}</span>
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${r.kind === "query" ? r.text : r.name} from recent searches`}
                    onClick={() => onRemove(key)}
                    className="-mr-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Cancel01Icon} size={20} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section aria-labelledby="search-browse" className="flex flex-col gap-4">
        <h2 id="search-browse" className={T.section}>
          Browse
        </h2>
        <ListCard>
          {SEARCH_KINDS.map((k) => (
            <ListRow key={k.id} icon={KIND_ICON[k.id]} title={k.label} onClick={() => onBrowse(k.id)} />
          ))}
        </ListCard>
      </section>
      <ListCard label="Search history">
        <ListRow icon={Clock01Icon} title="Search history" meta={keep ? undefined : "New searches aren’t kept."} value={keep ? "On" : "Off"} href={HISTORY_HREF} />
      </ListCard>
    </div>
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
      {/* Enter, as a row: the first thing under the field. */}
      <button
        type="button"
        onClick={onSearch}
        className={cn(PRESS, "-mx-2 flex min-h-[48px] items-center gap-6 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
      >
        <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
          <Icon icon={Search01Icon} size={16} />
        </span>
        <span className={cn(T.rowTitle, "min-w-0 flex-1 truncate")}>See all results for “{q.trim()}”</span>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={ArrowRight01Icon} size={20} />
        </span>
      </button>
      {groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className={T.section}>{SUGGEST_LABEL[g.kind]}</h2>
          <ul className="flex flex-col">
            {g.entries.map((e) => {
              const sub = e.ref.type === "person" ? e.ref.subtitle : e.ref.type === "project" || e.ref.type === "blog" ? `by ${e.ref.by}` : null;
              return (
                <li key={`${e.kind}:${e.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(e)}
                    className={cn(PRESS, "-mx-2 flex min-h-[48px] w-[calc(100%_+_var(--spacing-4))] items-center gap-6 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
                  >
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
      <Icon icon={item.type === "blog" ? News01Icon : CpuIcon} size={16} />
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
    <div className="flex flex-col gap-8 pb-10">
      <div role="group" aria-label="What to search" className="flex gap-4 overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* All: every kind's results (tapping the chosen chip again does the same). */}
        <Tag size="md" selected={kind === null} onClick={() => onKind(null)}>
          All
        </Tag>
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
            action={q && kind ? { label: "Search all kinds", onClick: () => onKind(null) } : undefined}
          />
        </div>
      ) : kind ? (
        <ResultList kind={kind} entries={one} q={q} onOpen={onOpen} />
      ) : (
        all.map((g) => {
          const label = SEARCH_KINDS.find((k) => k.id === g.kind)?.label ?? "";
          const preview = previewOf(g.kind);
          return (
            <section key={g.kind} aria-label={label} className="flex flex-col gap-2">
              <div className="flex min-h-[44px] items-center justify-between gap-4 px-8">
                <h2 className={T.section}>{label}</h2>
                {g.entries.length > preview && (
                  <button
                    type="button"
                    onClick={() => onKind(g.kind)}
                    aria-label={`View all ${g.entries.length} in ${label}`}
                    className={cn(T.rowTitle, "-mr-2 inline-flex min-h-[44px] items-center gap-1 rounded-md pl-4 pr-2 text-text-brand outline-none active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                  >
                    View all
                    <Icon icon={ArrowRight01Icon} size={16} />
                  </button>
                )}
              </div>
              <ResultList kind={g.kind} entries={g.entries.slice(0, preview)} q={q} onOpen={onOpen} />
            </section>
          );
        })
      )}
    </div>
  );
}

function ResultList({ kind, entries, q, onOpen }: { kind: SearchKind; entries: readonly Entry[]; q: string; onOpen: (e: Entry) => void }) {
  const settings = useSettings();
  const locale = settings.language.dateLocale;
  switch (kind) {
    case "settings":
    case "help":
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
    case "projects":
      return (
        <div className="px-8">
          <ListCard label="Projects">
            {entries.map((e) =>
              e.ref.type === "project" ? (
                <ListRow
                  key={e.id}
                  leading={<RowPicture src={e.ref.image} icon={Layers01Icon} />}
                  title={<Marked text={e.ref.name} q={q} />}
                  meta={`by ${e.ref.by}`}
                  onClick={() => onOpen(e)}
                />
              ) : null,
            )}
          </ListCard>
        </div>
      );
    case "parts":
      return (
        <div className="px-8">
          <ListCard label="Parts & Agile Module">
            {entries.map((e) => (e.ref.type === "part" ? <PartRow key={e.id} item={e.ref} q={q} /> : null))}
          </ListCard>
        </div>
      );
    case "blog":
      return (
        <div className="px-8">
          <ListCard label="Blog">
            {entries.map((e) =>
              e.ref.type === "blog" ? (
                <ListRow
                  key={e.id}
                  leading={
                    e.ref.cover ? (
                      <CoverImage cover={e.ref.cover} decorative className="size-[48px] shrink-0 rounded-md" />
                    ) : (
                      <RowPicture src={null} icon={News01Icon} />
                    )
                  }
                  title={<Marked text={e.ref.title} q={q} />}
                  meta={`${e.ref.by} · ${formatDate(e.ref.at, locale, { style: "medium" })}`}
                  onClick={() => onOpen(e)}
                />
              ) : null,
            )}
          </ListCard>
        </div>
      );
    case "people":
      return (
        <ul aria-label="People" className="flex flex-col px-8">
          {entries.map((e) => (e.ref.type === "person" ? <PersonRow key={e.id} item={e.ref} q={q} onOpen={() => onOpen(e)} /> : null))}
        </ul>
      );
    case "post":
      return (
        <ul aria-label="Post" className="grid grid-cols-2 gap-x-4 gap-y-8 px-8">
          {entries.map((e) => (e.ref.type === "post" ? <PostTile key={`${e.kind}:${e.id}`} item={e.ref} q={q} onOpen={() => onOpen(e)} /> : null))}
        </ul>
      );
    case "marketplace":
      return (
        <div className="flex flex-col gap-4 px-8">
          {/* Money is a Testnet demo: said once over the Marketplace items. */}
          <TestnetDemoBadge className="self-start" />
          <ul aria-label="Marketplace" className="flex flex-col gap-4">
            {entries.map((e) => (e.ref.type === "market" ? <MarketRow key={`${e.kind}:${e.id}`} item={e.ref} q={q} onOpen={() => onOpen(e)} /> : null))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}

/** A row's 48 px picture, or the kind's icon on a tile when there is none. */
function RowPicture({ src, icon }: { src: string | null; icon: IconValue }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- the result's picture
    return <img src={src} alt="" className="size-[48px] shrink-0 rounded-md object-cover" />;
  }
  return (
    <span aria-hidden className="inline-flex size-[48px] shrink-0 items-center justify-center rounded-md bg-bg-subtle text-[color:var(--color-icon-secondary)]">
      <Icon icon={icon} size={24} />
    </span>
  );
}

/** Figma 03 / 04, as a phone's search shows videos: the cover with its appreciations, comments and
 *  views as everyone sees them now, the clip's ⋯, the title, the creator and the date (Public). */
function PostTile({ item, q, onOpen }: { item: Extract<SearchItem, { type: "post" }>; q: string; onOpen: () => void }) {
  const settings = useSettings();
  const { reactions } = useReactions();
  const comments = useCommentCount(item.clip.postId, sampleSeedOf(item.clip.postId));
  const counts = countsOf(reactions, item.clip.postId, item.clip.base);
  const [menu, setMenu] = React.useState(false);
  const [used, setUsed] = React.useState(false);
  const clip = item.clip;
  return (
    <li className="flex min-w-0 flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg bg-bg-subtle">
        <button type="button" onClick={onOpen} aria-label={`Open ${clip.title}`} className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus">
          {clip.poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- the clip's cover
            <img src={clip.poster} alt="" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <span aria-hidden className="flex aspect-[3/4] w-full items-center justify-center text-[color:var(--color-icon-secondary)]">
              <Icon icon={Video01Icon} size={32} />
            </span>
          )}
        </button>
        {/* White on a dark scrim (text on media). */}
        <span
          className={cn(
            T.meta,
            MEDIA_INK,
            "pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-1 bg-gradient-to-b from-transparent to-[color:color-mix(in_srgb,var(--color-black)_70%,transparent)] px-4 pb-3 pt-10",
          )}
        >
          <span className="flex items-center gap-1" aria-label={`${counts.appreciations} appreciations`}>
            <Icon icon={FavouriteIcon} size={14} />
            {formatCount(counts.appreciations)}
          </span>
          <span className="flex items-center gap-1" aria-label={`${comments ?? 0} comments`}>
            <Icon icon={Comment01Icon} size={14} />
            {formatCount(comments ?? 0)}
          </span>
          <span className="flex items-center gap-1" aria-label={`${counts.views} views`}>
            <Icon icon={ViewIcon} size={14} />
            {formatCount(counts.views)}
          </span>
        </span>
        <button
          type="button"
          aria-label={`More for ${clip.title}`}
          onClick={() => {
            setUsed(true);
            setMenu(true);
          }}
          className={cn(MEDIA_INK, "absolute right-0 top-0 inline-flex size-[44px] items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus")}
        >
          <span className="inline-flex size-[32px] items-center justify-center rounded-full bg-[var(--color-modal-scrim)]">
            <Icon icon={MoreHorizontalIcon} size={18} />
          </span>
        </button>
      </div>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <span className={cn(T.rowTitle, "line-clamp-2 break-words")}>
          <Marked text={clip.title} q={q} />
        </span>
        <span className={cn(T.meta, "flex min-w-0 items-center gap-2")}>
          <Avatar size="2xs" initials={clip.creator.initials} color={clip.creator.color} />
          <span className="truncate">{clip.creator.name}</span>
        </span>
        <span className={cn(T.meta, "flex items-center gap-2 text-text-tertiary")}>
          {formatDate(clip.sharedAt, settings.language.dateLocale, { style: "medium" })}
          <Icon icon={Globe02Icon} size={12} aria-label="Public" aria-hidden={false} />
        </span>
      </button>
      {/* Mounted once asked for (and kept, for the sheets it opens): not one menu per tile. */}
      {used && <ClipMenu clip={clip} open={menu} onClose={() => setMenu(false)} height={null} guard={SIGNED_IN} />}
    </li>
  );
}

/** Figma 06, as a product row: an item on sale. Buy now: the current price and Buy now; an auction:
 *  the bid, when it ends and View Auction. Both open the item's marketplace; the row opens the clip. */
function MarketRow({ item, q, onOpen }: { item: Extract<SearchItem, { type: "market" }>; q: string; onOpen: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const { reactions } = useReactions();
  const counts = countsOf(reactions, item.clip.postId, item.clip.base);
  const { clip, offer } = item;
  const auction = offer.kind === "main" ? offer.auction : undefined;
  return (
    <li className={cn(LIST_CARD, "flex-row gap-6 p-6")}>
      <button type="button" onClick={onOpen} aria-label={`Open ${clip.title}`} className="shrink-0 self-start overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        {clip.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- the item's picture
          <img src={clip.poster} alt="" className="size-[88px] object-cover" />
        ) : (
          <span aria-hidden className="flex size-[88px] items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
            <Icon icon={CpuIcon} size={32} />
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          <span className={cn(T.rowTitle, "line-clamp-2 break-words")}>
            <Marked text={clip.title} q={q} />
          </span>
          <span className={cn(T.meta, "flex min-w-0 items-center gap-3")}>
            <span className="truncate">{clip.creator.name}</span>
            <span className="flex shrink-0 items-center gap-1" aria-label={`${counts.views} views`}>
              <Icon icon={ViewIcon} size={14} />
              {formatCount(counts.views)}
            </span>
            <span className="flex shrink-0 items-center gap-1" aria-label={`${counts.appreciations} appreciations`}>
              <Icon icon={FavouriteIcon} size={14} />
              {formatCount(counts.appreciations)}
            </span>
          </span>
        </button>
        <span className="flex flex-wrap gap-2">
          {clip.stage && <Badge tone="neutral">{clip.stage}</Badge>}
          {[...new Set(clip.offers.map((o) => o.kind))].map((k) => (
            <Badge key={k} tone="blue">
              {OFFER_NAME[k]}
            </Badge>
          ))}
        </span>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <span className="flex min-w-0 flex-col">
            <span className={T.meta}>{auction ? auction.bidLabel : offer.kind === "main" ? "Current Price" : `${OFFER_NAME[offer.kind]} from`}</span>
            <span className={cn(T.section, "tabular-nums")}>{auction ? auction.bid : offer.price}</span>
            {auction?.endsAt && <span className={cn(T.meta, "text-text-warning")}>Ends {formatDateTime(auction.endsAt, settings.language.dateLocale, { style: "medium" })}</span>}
          </span>
          <Button hierarchy="secondary" size="md" className={HIT44} onClick={() => router.push(clipBuyHref(clip))}>
            {auction ? "View Auction" : "Buy now"}
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Figma 05: a part or an Agile Module. It has no phone page, so its row opens its facts in a sheet. */
function PartRow({ item, q }: { item: Extract<SearchItem, { type: "part" }>; q: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <ListRow
        leading={<RowPicture src={null} icon={CpuIcon} />}
        title={<Marked text={item.title} q={q} />}
        meta={item.meta}
        trailing={<Badge tone="neutral">{item.tag}</Badge>}
        onClick={() => setOpen(true)}
      />
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

/** A person: the row opens their profile; Follow / Following at its end (the web's follow). */
function PersonRow({ item, q, onOpen }: { item: Extract<SearchItem, { type: "person" }>; q: string; onOpen: () => void }) {
  const { reactions, setFollow, hydrated } = useReactions();
  const toast = useToast();
  // Your own choice only: a new account starts following no one.
  const on = item.followKey ? follows(reactions, item.followKey, false) : false;
  return (
    <li className="flex items-center gap-4 border-b-[length:var(--border-width-1)] border-solid border-border py-2 last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn(PRESS, "-ml-2 flex min-h-[60px] min-w-0 flex-1 items-center gap-6 rounded-md pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
      >
        <PersonAvatar id={item.person.id} name={item.person.name} />
        <span className="flex min-w-0 flex-col">
          <span className={cn(T.rowTitle, "truncate")}>
            <Marked text={item.person.name} q={q} />
          </span>
          <span className={cn(T.meta, "truncate")}>{item.subtitle}</span>
        </span>
      </button>
      {item.followKey && (
        <Button
          hierarchy={on ? "secondary" : "tonal"}
          size="md"
          className={cn(HIT44, "shrink-0")}
          aria-pressed={on}
          aria-label={`${on ? "Following" : "Follow"} ${item.person.name}`}
          disabled={!hydrated}
          onClick={() => {
            if (!setFollow(item.followKey as string, !on)) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
          }}
        >
          {on ? "Following" : "Follow"}
        </Button>
      )}
    </li>
  );
}
