"use client";

// Help and Support (/m/help; mobile Figma "Faq and Contact Support" ›
// FAQs): search, the questions in the one FAQ accordion (lib/support/faq.ts —
// what the app really does, in the web's words), each answer with the screen
// that does it, and the ways on: Contact support (the top bar's button),
// Report a problem, Tutorials and the web Support menu's Tour guide (the
// phone tour again, from Home). `?q=`
// keeps the search in the address; a search that lands on one question opens
// it once, and it closes like any other.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight01Icon, BubbleChatQuestionIcon, Bug01Icon, Mortarboard02Icon, Navigation03Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SearchInput } from "@/components/ideeza/search-input";
import { updatePhone } from "@/lib/account/phone";
import { FAQS, searchFaqs } from "@/lib/support/faq";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../kit/list";
import { EmptyState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { FaqList } from "./faq-list";

export function FaqScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(() => params.get("q") ?? "");
  const [open, setOpen] = React.useState<string | null>(() => {
    const first = searchFaqs(FAQS, params.get("q") ?? "");
    return (params.get("q") ?? "").trim() && first.length === 1 ? first[0].id : null;
  });
  const shown = searchFaqs(FAQS, query);
  // The web Support menu's Tour guide: the phone tour plays again from Home (account/phone-tour.tsx).
  const retakeTour = () => {
    updatePhone({ tourPending: true });
    router.push("/m");
  };

  const type = (v: string) => {
    setQuery(v);
    const hits = searchFaqs(FAQS, v);
    setOpen(v.trim() && hits.length === 1 ? hits[0].id : null);
    // The address follows without a navigation (no fetch, no history entry).
    const q = new URLSearchParams(window.location.search);
    if (v.trim()) q.set("q", v);
    else q.delete("q");
    const search = q.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  };

  return (
    <Screen top={<TopBar back="/m/profile" title="FAQs" actions={[{ icon: BubbleChatQuestionIcon, label: "Contact support", onClick: () => router.push("/m/help/contact") }]} />} className="px-8 pb-12 pt-4">
      <div className="flex flex-col gap-8">
        <SearchInput size="xl" aria-label="Search the questions" placeholder="Enter a search term here" value={query} onValueChange={type} onClear={() => type("")} />
        {shown.length === 0 ? (
          <EmptyState
            icon={Search01Icon}
            title={`Nothing about “${query.trim()}”`}
            body="Try other words, or ask us: Contact support reaches the IDEEZA team."
            action={{ label: "Clear search", onClick: () => type("") }}
          />
        ) : (
          <FaqList
            label="Questions"
            items={shown}
            open={open}
            onToggle={(id) => setOpen(open === id ? null : id)}
            extra={(f) =>
              f.link ? (
                <Link href={f.link.href} className={cn(T.rowTitle, "inline-flex min-h-[44px] items-center gap-2 text-text-brand hover:underline")}>
                  {f.link.label}
                  <Icon icon={ArrowRight01Icon} size={16} />
                </Link>
              ) : null
            }
          />
        )}
        <section aria-labelledby="more-help" className="flex flex-col gap-4">
          <h2 id="more-help" className={T.section}>
            Still need help?
          </h2>
          <ListCard>
            <ListRow icon={BubbleChatQuestionIcon} title="Contact support" meta="Write to the IDEEZA team" href="/m/help/contact" />
            <ListRow icon={Bug01Icon} title="Report a problem" meta="Something broken, slow or confusing" href="/m/help/report?from=/m/help" />
            <ListRow icon={Mortarboard02Icon} title="Tutorials" meta="Learn IDEEZA step by step" href="/m/tutorials" />
            <ListRow icon={Navigation03Icon} title="Tour guide" meta="Take the tour again" onClick={retakeTour} />
          </ListCard>
        </section>
      </div>
    </Screen>
  );
}
