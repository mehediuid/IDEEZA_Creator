"use client";

// Route focus and the document title for a page that finds its record in the
// browser (COR-7, COR-3). The project page and the product page use it.

import * as React from "react";

/**
 * When `key` changes, which means arriving and not switching tab:
 * - focus moves to the h1 (give it `ref={titleRef}`, `tabIndex={-1}` and
 *   `outline-none`);
 * - the polite region says `name`.
 *
 * The document title follows `title`, a rename included, and the previous
 * title comes back on the way out. `announce` is the page's one polite voice
 * for everything after (COR-101). It speaks on the next frame, so a call from
 * an effect never sets state inside it. The same sentence twice gets a
 * zero-width space, so the region still changes and is read.
 */
export function usePageArrival(key: string, name: string, title: string) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  const [live, setLive] = React.useState("");

  const announce = React.useCallback((message: string) => {
    window.requestAnimationFrame(() =>
      setLive((prev) => (prev === message ? `${message}​` : message)),
    );
  }, []);

  const arrive = React.useEffectEvent(() => {
    titleRef.current?.focus({ preventScroll: true });
    announce(name);
  });
  React.useEffect(() => {
    arrive();
  }, [key]);

  React.useEffect(() => {
    if (!title) return;
    const previous = document.title;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    // Next writes the layout's metadata <title> into <head> after the page's
    // own effects have run (seen on a hard load of the product page, Next
    // 16.2.9), which put "IDEEZA Creator Panel" back. So the title is applied
    // again whenever <head> changes; setting it changes <head> too, and the
    // equality check ends that loop at once.
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      watch.disconnect();
      document.title = previous;
    };
  }, [title]);

  return { titleRef, live, announce };
}

/** The page's one polite live region. It mounts empty, so whatever `announce`
 *  puts in it is a change, and gets read. */
export function LiveRegion({ text }: { text: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
