"use client";

// /tutorials — Tutorial Categories (Figma 38577:5712): the page header and one
// card per category in the page grid, three across on a wide page.

import * as React from "react";
import { PAGE_GRID, Page, PageHeader } from "@/components/ideeza";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";
import { useTutorialProgress } from "@/lib/tutorials/use-progress";
import { CategoryCard } from "./category-card";

export function TutorialList() {
  const progress = useTutorialProgress();
  return (
    <Page>
      <PageHeader
        title="Tutorial Categories"
        description="Let's learn about IDEEZA platform and how it will revolutionise hardware designing. Take a look at our all categories for more tutorials."
        descriptionClassName="max-w-[62ch] text-lg leading-lg text-text-secondary"
      />
      <ul role="list" className={`m-0 list-none p-0 ${PAGE_GRID}`}>
        {TUTORIAL_CATEGORIES.map((c) => (
          <li key={c.slug} className="flex min-w-0">
            <CategoryCard category={c} progress={progress} />
          </li>
        ))}
      </ul>
    </Page>
  );
}
