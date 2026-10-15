// The Blog's one reading geometry (F07 — Page Layout, Form / Reading; spec
// docs/superpowers/specs/2026-10-16-page-frame-design.md), shared by the editor
// and the reader so Preview opens with nothing moving sideways: a top row (the
// editor's sticky bar, the reader's breadcrumb and buttons) over the narrow
// column on the page frame's left edge, and the reader's rail beside the column
// from a 1024 px page container. The editor leaves the rail's track empty, so its
// column — and every line's wrap — is the reader's. No hooks: the loading
// skeletons use it too.

import { NARROW_WITH_RAIL } from "@/components/ideeza/page";

/** The top row and what it heads: the column alone in one column; the column, the gutter
 *  and the rail beside it — so the row's buttons end where the rail does, not at the frame's
 *  far edge. */
export const READING_FRAME =
  "flex w-full min-w-0 flex-col max-w-[var(--layout-content-narrow)] [@container(min-width:1024px)]:max-w-[calc(var(--layout-content-narrow)+var(--layout-gutter)+var(--layout-rail))]";

/** The column and the rail under the top row. */
export const READING_GRID = NARROW_WITH_RAIL;
