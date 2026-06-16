"use client";

// IDEEZA PCB Software — breadcrumb trail.
// Project Name → [Product Name] crumbs as IDEEZA DS Links (A03), a folder
// glyph, a page-switch caret and a refresh action. Replaces BREADCRUMB_HTML.

import { Link } from "@/components/ideeza";

const Caret = ({ color, size = 14 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={size > 13 ? 2 : 2.4}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function Breadcrumb() {
  return (
    <div
      style={{
        position: "absolute",
        top: 62,
        left: 0,
        right: 0,
        height: 42,
        background: "var(--color-bg-subtle)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-0) var(--spacing-10)",
        zIndex: 20,
      }}
    >
      <span style={{ width: 20, height: 20, color: "var(--color-violet-600)", marginRight: "var(--spacing-3)", display: "inline-flex" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </span>
      <Link color="neutral" size="md" className="no-underline">Project Name</Link>
      <Caret color="var(--color-text-disabled)" />
      <Link color="brand" size="md" className="font-[var(--font-weight-semibold)] no-underline" iconTrailing={<Caret color="var(--color-violet-600)" size={13} />}>
        [Product Name]
      </Link>
      <div
        className="ix-tool"
        style={{ width: 26, height: 26, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "var(--spacing-4)", cursor: "pointer" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
    </div>
  );
}
