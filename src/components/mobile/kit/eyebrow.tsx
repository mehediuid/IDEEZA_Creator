// Label/SM in caps (T.overline): the small brand line over a card or a step
// ("CONCEPT", "BUILDING", "BUILD QUEUE", AI create 10706:1251 / 10706:4 /
// 10720:264) and a stat's caption ("REWARD", "STAKED", 10702:228508, in
// `tone="tertiary"`). Write the words in sentence case; the role sets the caps.
//
//   <Eyebrow>Concept</Eyebrow>
//   <Eyebrow tone="tertiary" as="span">Staked</Eyebrow>

import * as React from "react";
import { cn } from "@/lib/utils";
import { T } from "../type";

export function Eyebrow({
  children,
  tone = "brand",
  as: Tag = "p",
  id,
  className,
}: {
  children: React.ReactNode;
  tone?: "brand" | "tertiary";
  as?: "p" | "span" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} className={cn(T.overline, tone === "tertiary" && "text-text-tertiary", className)}>
      {children}
    </Tag>
  );
}
