"use client";

// The project page under its products (owner decisions M2, M3, M5, M6; mobile
// UX pass 2026-11-15: a hub of rows, not tabs):
// · the hub — one card of rows that push a screen, each with its icon, its
//   live value and the chevron: Activity (the web's `view.current`, "Now: …"),
//   Media (the project video's state), Versions (the current version and when
//   it was saved, 05), Team and Network (`aboutRowsOf`, 06);
// · About: Created, Parts, Stored; on a project bought whole (CL-038, the
//   owner only) a Purchase row → a sheet with the web's Purchase facts (Bought
//   from → its listing, Price paid, Bought on, Your share, Token, Blockchain,
//   Transaction, Bought as with the Testnet demo badge);
// · Recent (20b): the web's rail log, once the project has gone out.

import * as React from "react";
import { Activity01Icon, GitBranchIcon, ShareKnowledgeIcon, ShoppingBag01Icon, UserGroupIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useSampleSales } from "../project-earn/buyer/sample-sales-store";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { can } from "@/lib/manual/permissions";
import { engineeringMetaOf, stageLineOf } from "@/lib/manual/project-header";
import { formatDate } from "@/lib/manual/project-summary";
import type { Token } from "@/lib/brief/types";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { SAMPLE_COLLECTION } from "@/lib/market/sample-market";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { labelOf } from "@/lib/manual/journey";
import { currentProductsOf } from "@/lib/manual/readiness";
import { aboutRowsOf } from "@/lib/manual/rail-copy";
import { LOG_SHOWN, logLinesOf } from "@/lib/manual/rail-rows";
import { phoneProjectHref, phoneProjectPath, phoneWords } from "@/lib/manual/phone-project";
import { PROTOCOLS } from "@/lib/network/catalog";
import { useProjectNetwork } from "@/lib/network/store";
import { productVideoStatus } from "@/lib/video/product-video";
import { projectVideoStatusOf } from "@/lib/video/project-video";
import { useProjectVideos } from "@/lib/video/store";
import { projectRowCopy, resolutionOf, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { ListCard as KitListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { useProject } from "./context";
import { InfoRow, LINK_MD, ListCard, SectionHeading } from "./parts";

const text = (parts: { kind: string; text?: string; time?: { text: string } }[]) =>
  parts.map((m) => (m.kind === "time" ? (m.time?.text ?? "") : (m.text ?? ""))).join("");

/** The rows About used to carry, in the phone's order, with the network's protocol named. */
function useAboutRows() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const { network } = useProjectNetwork(owner ? project.id : null);
  return React.useMemo(() => {
    const built = view.products.filter((p) => p.built && !p.dropped);
    const protocol = network ? (PROTOCOLS.find((x) => x.key === network.protocol) ?? null) : null;
    const rows = aboutRowsOf({
      createdAt: project.createdAt,
      parts: built.length ? built.reduce((n, p) => n + (p.built?.product.parts.length ?? 0), 0) : null,
      network: network ? { protocol: protocol?.radioLabel ?? protocol?.name ?? "Custom", links: network.links.length } : null,
      team: (project.contributors ?? []).length,
    });
    return Object.fromEntries(rows.map((r) => [r.key, { label: r.label, value: text(r.value) }])) as Record<string, { label: string; value: string } | undefined>;
  }, [project, view.products, network]);
}

/** The project video's state in a line: the take in use, else the web's row words. With one
 *  product, that product's video is the project's (owner, 2026-11-17). */
function useMediaLine(): string | null {
  const { project, view } = useProject();
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  if (currentProductsOf(view.products).length === 0) return null;
  const status = projectVideoStatusOf({ products: view.products, videos: record, jobs, now });
  const take = status.face;
  const single = status.state === "single";
  if (take && (single || status.state === "ready")) {
    return [single ? "Video" : "Project video", `Take ${take.n}`, resolutionOf(take.quality), take.clip ? `${Math.round(take.clip.durationMs / 1000)} s` : null]
      .filter(Boolean)
      .join(" · ");
  }
  // One product with no video in use yet: that product's own state is the project's.
  if (single) return statusCopy(productVideoStatus(record?.products[currentProductsOf(view.products)[0].id], jobs, now)).text;
  return projectRowCopy(status).text;
}

export function ProjectHub() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const about = useAboutRows();
  const mediaLine = useMediaLine();
  const now = view.current;
  // "v1 · Saved Nov 7, 2026[ · build not in this browser]": the header's old second line.
  const version = view.engineering.state === "empty" ? null : (stageLineOf(view.engineering, view.summary).split(" · ").pop() ?? null);
  const saved = text(engineeringMetaOf(view.summary, null));
  return (
    <KitListCard label="Project">
      <ListRow
        href={phoneProjectHref(project.id, "activity")}
        icon={Activity01Icon}
        title="Activity"
        meta={`Now: ${labelOf(now)} · ${formatDate(now.createdAt)}`}
      />
      <ListRow href={phoneProjectHref(project.id, "media")} icon={Video01Icon} title="Media" meta={mediaLine ?? undefined} />
      <ListRow
        href={phoneProjectPath(project.id, "versions")}
        icon={GitBranchIcon}
        title="Versions"
        meta={[version, saved].filter(Boolean).join(" · ")}
      />
      {about.team &&
        (owner ? (
          <ListRow href={phoneProjectPath(project.id, "team")} icon={UserGroupIcon} title="Team" value={about.team.value} />
        ) : (
          <ListRow icon={UserGroupIcon} title="Team" value={about.team.value} />
        ))}
      {about.network &&
        (owner ? (
          <ListRow href={phoneProjectPath(project.id, "network")} icon={ShareKnowledgeIcon} title="Network" value={about.network.value} />
        ) : (
          <ListRow icon={ShareKnowledgeIcon} title="Network" value={about.network.value} />
        ))}
    </KitListCard>
  );
}

export function ProjectAbout() {
  const { project, viewer } = useProject();
  const about = useAboutRows();
  const rows = (["created", "parts", "stored"] as const).map((k) => about[k]).filter((r): r is { label: string; value: string } => !!r);
  // A project bought whole: what was paid for it, the owner's only, never in a preview (CL-038).
  const bought = viewer.kind === "local-owner" ? (project.acquired ?? null) : null;
  const [purchase, setPurchase] = React.useState(false);
  return (
    <section aria-labelledby="ov-about" className="flex flex-col gap-4">
      <SectionHeading id="ov-about" title="About" />
      {bought && (
        <KitListCard label="Purchase">
          <ListRow icon={ShoppingBag01Icon} title="Purchase" meta={`Bought from ${bought.from}`} onClick={() => setPurchase(true)} />
        </KitListCard>
      )}
      <ListCard label="About">
        {rows.map((r) => (
          <InfoRow key={r.label} label={r.label} value={r.value} />
        ))}
      </ListCard>
      {bought && <PurchaseSheet open={purchase} onClose={() => setPurchase(false)} bought={bought} tokenId={project.mint?.tokenId ?? null} />}
    </section>
  );
}

/** The web's Purchase block (rail-purchase.tsx) as a sheet: the line, then its facts. */
function PurchaseSheet({
  open,
  onClose,
  bought,
  tokenId,
}: {
  open: boolean;
  onClose: () => void;
  bought: NonNullable<ReturnType<typeof useProject>["project"]["acquired"]>;
  tokenId: string | number | null;
}) {
  const sales = useSampleSales();
  const sale = sales.find((x) => x.id === bought.saleId) ?? null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Purchase"
      description="You bought the whole project, so it's one of yours: open it, edit it, build it and sell it again."
    >
      <div className="flex flex-col gap-4 pb-8">
        {sale && <TestnetDemoBadge className="self-start" />}
        <ListCard label="Purchase">
          <InfoRow label="Bought from" value={bought.from} href={phoneMarketHref(bought.feedId)} />
          <InfoRow label="Price paid" value={<span className="tabular-nums">{formatAmount(bought.price, bought.token as Token)}</span>} />
          <InfoRow label="Bought on" value={formatDate(bought.at)} />
          <InfoRow label="Your share" value="100% · Main NFT" />
          {tokenId !== null && <InfoRow label="Token" value={`#${tokenId} · ${SAMPLE_COLLECTION}`} />}
          {sale && <InfoRow label="Blockchain" value={networkLabelOf(sale.network)} />}
          {sale?.txHash && <InfoRow label="Transaction" value={<span title={sale.txHash}>{shortAddress(sale.txHash)}</span>} />}
          {sale && <InfoRow label="Bought as" value={buyerLabel(sale.buyerId)} />}
        </ListCard>
      </div>
    </Sheet>
  );
}

export function ProjectRecent() {
  const { view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const lines = React.useMemo(() => logLinesOf(view.log, { network: true, products: view.products }), [view.log, view.products]);
  const [all, setAll] = React.useState(false);
  if (!owner || view.summary.status === "draft" || lines.length === 0) return null;
  const shown = all ? lines : lines.slice(0, LOG_SHOWN);
  return (
    <section aria-labelledby="ov-recent" className="flex flex-col gap-4">
      <SectionHeading id="ov-recent" title="Recent" />
      <ul className="flex flex-col gap-6">
        {shown.map((l) => (
          <li key={l.key} className="flex flex-col gap-1">
            {/* The phone has no Innovations: the web's "Shared to Innovations" reads "Shared to Feed". */}
            <span className={T.rowTitle}>{phoneWords(l.title)}</span>
            {l.note && <span className={T.meta}>{phoneWords(l.note)}</span>}
            <span className={cn(T.meta, "text-text-tertiary")}>{l.when.map((m) => (m.kind === "time" ? m.time.text : m.text)).join("")}</span>
          </li>
        ))}
      </ul>
      {lines.length > LOG_SHOWN && (
        <div>
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className={cn(LINK_MD, "-my-6 inline-flex min-h-[44px] items-center")}
          >
            {all ? "Show less" : `Show all (${lines.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
