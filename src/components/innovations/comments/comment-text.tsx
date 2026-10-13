"use client";

// A comment's words as they read (plan §7): the "@Name" a nested reply answers
// in brand weight, any "@Full Name" of someone known on Innovations picked out
// the same way, and every http(s) address a link that opens in a new tab.
// Text only: nothing in a body is ever read as markup.

import * as React from "react";
import { personOf, SAMPLE_PEOPLE_IDS } from "@/lib/innovations/people";

type Part = { kind: "text" | "mention" | "url"; text: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Longest first, so "@Ana Lima" is never read as "@Ana". */
const NAMES = SAMPLE_PEOPLE_IDS.map((id) => personOf(id).name)
  .filter((n, i, all) => all.indexOf(n) === i)
  .sort((a, b) => b.length - a.length);

const NAME_ALT = NAMES.length ? NAMES.map(escape).join("|") : "(?!)";
const TOKEN = new RegExp(`(https?:\\/\\/[^\\s<>"…]+)|(@(?:${NAME_ALT}))(?![\\p{L}\\p{N}])`, "gu");
/** Sentence punctuation that ends an address rather than belonging to it. */
const TRAILING = /[).,!?;:'"\]]+$/;

export function partsOf(body: string): Part[] {
  const out: Part[] = [];
  let at = 0;
  for (const m of body.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    let text = m[0];
    let kind: Part["kind"] = m[1] ? "url" : "mention";
    if (kind === "url") {
      text = text.replace(TRAILING, "");
      if (!/^https?:\/\/[^/]/.test(text)) kind = "text";
    }
    if (start > at) out.push({ kind: "text", text: body.slice(at, start) });
    out.push({ kind, text });
    at = start + text.length;
  }
  if (at < body.length) out.push({ kind: "text", text: body.slice(at) });
  return out;
}

const MENTION = "font-semibold text-text-brand";

export function CommentText({ body, replyTo }: { body: string; replyTo: string | null }) {
  const parts = React.useMemo(() => partsOf(body), [body]);
  return (
    <>
      {replyTo ? <span className={MENTION}>@{personOf(replyTo).name} </span> : null}
      {parts.map((p, i) =>
        p.kind === "url" ? (
          <a
            key={i}
            href={p.text}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="break-all rounded-xs text-text-link underline underline-offset-2 outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {p.text}
          </a>
        ) : p.kind === "mention" ? (
          <span key={i} className={MENTION}>
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}
