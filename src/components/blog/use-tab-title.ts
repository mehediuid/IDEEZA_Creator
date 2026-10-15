"use client";

// Names the browser tab for a Blog page. On a full load Next writes the route's
// metadata <title> after the page's effects, so the name is applied again
// whenever <head> changes; leaving the page restores nothing (the next page
// names its own tab).

import * as React from "react";

export function useTabTitle(title: string | null): void {
  React.useEffect(() => {
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [title]);
}
