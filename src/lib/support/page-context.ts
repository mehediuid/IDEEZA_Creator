// Where a report came from, in the maker's words. Pure, relative imports
// only (node:test).
//
// Not `document.title`: today's titles don't agree with each other ("IDEEZA —
// PCB Software" beside "Messages · IDEEZA"), and a title names a person in
// Messages. The labels here are the words already on screen: the sidebar's,
// the editors' step names (STEP_LABELS), the project page's tabs.
//
// The pathname gives the page and which record to name; the names come from
// the stores at open time (`namesFor`). Messages never names anyone, and a
// query value is read only when it picks a tab: never `q`, `to` or `as`.

const STEP_PAGE: Record<string, string> = {
  pcb: "PCB Design",
  code: "Code",
  "3d": "3D Module",
  three: "3D Module",
  assembly: "Assembly",
  wiring: "Peripheral Wiring",
  preview: "Product Preview",
  brief: "Mint",
};

const PROJECT_TAB: Record<string, string> = {
  media: "Media",
  network: "Network",
  team: "Team",
  contributors: "Team",
};

const EARN_SECTION: Record<string, string> = {
  sell: "Sell",
  plan: "Business plan",
  money: "Money",
};

export type PageRef = {
  page: string;
  /** The pattern, ids replaced, e.g. "/projects/[id]/products/[productId]". */
  route: string;
  /** Which project to name: an id or a slug, or the active one on the
   *  legacy flat editor routes. */
  project?: { key: string } | { active: true };
  productId?: string;
};

export function pageRefFor(pathname: string, search = ""): PageRef {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean).map(safeDecode);
  const q = new URLSearchParams(search);
  const [a, b, c, d, e] = parts;

  if (parts.length === 0) return { page: "Home", route: "/" };

  switch (a) {
    case "history":
      return { page: q.get("tab") === "builds" ? "History · Builds" : "History", route: "/history" };
    case "chat":
      return { page: "AI chat", route: "/chat/[chatId]" };
    case "build":
      return c === "brief"
        ? { page: "Mint", route: "/build/[jobId]/brief" }
        : { page: "Build", route: "/build/[jobId]" };
    case "projects": {
      if (!b) return { page: "My projects", route: "/projects" };
      const project = { key: b };
      if (c === "products" && d) {
        return { page: "Product page", route: "/projects/[id]/products/[productId]", project, productId: d };
      }
      if (c === "earn") {
        if (!d) return { page: "Earn", route: "/projects/[id]/earn", project };
        if (d === "mint") return { page: "Mint", route: "/projects/[id]/earn/mint", project };
        const section = EARN_SECTION[d];
        return { page: section ? `Earn › ${section}` : "Earn", route: "/projects/[id]/earn/[section]", project };
      }
      if (c === "business-plan") return { page: "Earn › Business plan", route: "/projects/[id]/business-plan", project };
      if (c === "network") return { page: "Connection map", route: "/projects/[id]/network", project };
      const tab = PROJECT_TAB[q.get("tab") ?? ""];
      return { page: tab ? `Project page › ${tab}` : "Project page", route: "/projects/[id]", project };
    }
    case "project": {
      if (!b) break;
      const project = { key: b };
      if (c === "products" && d && e) {
        const step = STEP_PAGE[e];
        if (step) return { page: step, route: "/project/[projectSlug]/products/[productId]/[step]", project, productId: d };
      }
      if (c && !d) {
        const step = STEP_PAGE[c];
        if (step) return { page: step, route: "/project/[projectSlug]/[step]", project };
      }
      break;
    }
    case "pcb":
    case "code":
    case "3d":
    case "wiring":
    case "preview":
    case "brief":
      if (!b) return { page: STEP_PAGE[a], route: `/${a}`, project: { active: true } };
      break;
    case "marketplace": {
      if (!b) {
        const tab = q.get("tab");
        return {
          page: tab === "sold" ? "Explore marketplace › Sold" : tab === "purchased" ? "Explore marketplace › Bought" : "Explore marketplace",
          route: "/marketplace",
        };
      }
      const project = { key: b };
      if (c === "products" && d) {
        return { page: "Marketplace listing › Product", route: "/marketplace/[id]/products/[productId]", project, productId: d };
      }
      return { page: "Marketplace listing", route: "/marketplace/[id]", project };
    }
    case "innovations":
      if (!b) return { page: "Innovations", route: "/innovations" };
      return c === "products"
        ? { page: "Innovations post › Product", route: "/innovations/[slug]/products/[productId]" }
        : { page: "Innovations post", route: "/innovations/[slug]" };
    case "messages":
      return { page: "Messages", route: b ? (b === "new" ? "/messages/new" : "/messages/[conversationId]") : "/messages" };
    case "blog":
      if (!b) return { page: "Blog", route: "/blog" };
      if (b === "new") return { page: "Blog › Create new blog", route: "/blog/new" };
      if (c === "edit") return { page: "Blog › Edit blog", route: "/blog/[slug]/edit" };
      if (c === "preview") return { page: "Blog › Blog preview", route: "/blog/[slug]/preview" };
      if (c === "read") return { page: "Blog › Reader view", route: "/blog/[slug]/read" };
      return { page: "Blog › Blog details", route: "/blog/[slug]" };
    case "parts":
      if (!b) return { page: "Parts & agile module", route: "/parts" };
      return b === "new"
        ? { page: "Parts › New package", route: "/parts/new" }
        : { page: "Parts › Part details", route: "/parts/[id]" };
    default:
      break;
  }
  return { page: "Page not found", route: "(unknown)" };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type ProjectLike = {
  id: string;
  slug: string;
  name: string;
  productName: string;
  products?: readonly { id: string; name: string }[];
};

/** The project and product the page is about, by name. A project that isn't
 *  in this browser (a marketplace listing of someone else's) gets no name
 *  rather than its id. */
export function namesFor(
  ref: PageRef,
  projects: readonly ProjectLike[],
  activeProjectId: string | null,
): { project?: string; product?: string } {
  if (!ref.project) return {};
  const p =
    "active" in ref.project
      ? projects.find((x) => x.id === activeProjectId)
      : (projects.find((x) => x.id === (ref.project as { key: string }).key) ??
        projects.find((x) => x.slug === (ref.project as { key: string }).key));
  if (!p) return {};
  const out: { project?: string; product?: string } = { project: p.name || undefined };
  if (ref.productId) {
    const row = p.products?.find((x) => x.id === ref.productId);
    const name = row?.name || (ref.productId === "p1" ? p.productName : "");
    if (name) out.product = name;
  }
  return out;
}

/** "Chrome 141" and "macOS" from a user-agent string. Major version only and
 *  no OS version, which user-agent strings freeze anyway. Only this result is
 *  kept, never the raw string. */
export function deviceOf(ua: string, touchPoints = 0): { browser: string; os: string } {
  const v = (re: RegExp) => re.exec(ua)?.[1];
  let browser = "Other browser";
  const edge = v(/Edg(?:A|iOS)?\/(\d+)/);
  const opera = v(/OPR\/(\d+)/);
  const firefox = v(/(?:Firefox|FxiOS)\/(\d+)/);
  const chrome = v(/(?:Chrome|CriOS)\/(\d+)/);
  const safari = /Safari\//.test(ua) ? v(/Version\/(\d+)/) : undefined;
  if (edge) browser = `Edge ${edge}`;
  else if (opera) browser = `Opera ${opera}`;
  else if (firefox) browser = `Firefox ${firefox}`;
  else if (chrome) browser = `Chrome ${chrome}`;
  else if (safari) browser = `Safari ${safari}`;

  let os = "Other";
  if (/iPhone|iPod/.test(ua)) os = "iOS";
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) os = "iPadOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
}

/** "PCB Design · Smart Lamp › Main board": the place, as the dialog shows it. */
export function placeLine(ctx: { page: string; project?: string; product?: string }): string {
  const where = [ctx.project, ctx.product].filter(Boolean).join(" › ");
  return where ? `${ctx.page} · ${where}` : ctx.page;
}
