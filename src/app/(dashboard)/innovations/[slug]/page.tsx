import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export const metadata: Metadata = {
  title: "IDEEZA — Project",
  description: "Project detail.",
};

// Placeholder for the project detail view. The full view — visuals,
// description, tags, comments, follow + showcase/sell actions — is a separate
// build; the newsfeed links here so cards never dead-end. The ?focus=comments
// query (from a card's Comment action) is where comments will deep-link.
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ");

  // In a real app we'd fetch this from the backend.
  // For the mockup we can search the mock feed data.
  const { PROJECTS } = await import("@/lib/feed");
  const project = PROJECTS.find((p) => p.slug === slug);

  return (
    <div className="mx-auto w-full max-w-[760px] px-[24px] py-[40px]">
      <Link
        href="/innovations"
        className="inline-flex items-center gap-[6px] text-sm font-medium text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
        Back to Innovations
      </Link>

      <div className="mt-[24px] relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-bg-surface-raised">
        {project?.image ? (
          <img
            src={project.image}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : project?.gradient ? (
          <div
            className="absolute inset-0"
            style={{ background: project.gradient }}
          />
        ) : null}
      </div>

      <h1 className="mt-[24px] text-xl font-bold capitalize tracking-tight text-text-primary">
        {project ? project.title : title}
      </h1>
      <p className="mt-[8px] max-w-[560px] text-sm text-text-secondary">
        The full project view — visuals, description, tags, comments, follow,
        and showcase/sell actions — is coming next. This page exists so feed
        cards link somewhere real.
      </p>
    </div>
  );
}
