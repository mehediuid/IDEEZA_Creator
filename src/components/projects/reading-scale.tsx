// The creator pages' type scale (tokens.css, "Reading scale"): under it, and in
// any dialog or menu opened while it is on screen, the 2xs / xs / sm sizes read
// one step up. Each creator route wraps its page in it — My projects, a
// project, a product, Earn, Explore marketplace — and the tools (the network
// map, the editors, the chat canvas) don't. `display: contents`, so it adds no
// box: the page's own container queries and heights are untouched.

import * as React from "react";

export function ReadingScale({ children }: { children: React.ReactNode }) {
  return (
    <div data-type-scale="reading" className="contents">
      {children}
    </div>
  );
}
