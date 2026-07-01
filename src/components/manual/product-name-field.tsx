"use client";

// ProductNameField — inline-editable product name for the active project.
// Shows "Untitled product" (muted) until named; click to edit, Enter/blur to
// save, Esc to cancel. Writes through to the manual-projects store so every
// surface that reads productName (TopBar, PCB header, breadcrumb) updates at
// once. Used across all editor steps so the product name stays consistent.

import * as React from "react";
import { useManualProjects, productLabel } from "@/lib/manual/projects";

export function ProductNameField({
  fontSize = 15,
  fontWeight = 700,
  maxWidth = "100%",
}: {
  fontSize?: number | string;
  fontWeight?: number;
  maxWidth?: number | string;
}) {
  const { activeProject, updateProject } = useManualProjects();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!activeProject) return null;

  const hasName = !!activeProject.productName?.trim();
  const display = productLabel(activeProject);

  const startEdit = () => {
    setDraft(activeProject.productName ?? "");
    setEditing(true);
  };
  const commit = () => {
    updateProject(activeProject.id, { productName: draft.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Untitled product"
        aria-label="Product name"
        style={{
          fontSize,
          fontWeight,
          color: "var(--color-text-primary)",
          background: "var(--color-bg-surface-raised)",
          border: "var(--border-width-1) solid var(--color-border-brand)",
          borderRadius: "var(--radius-sm)",
          padding: "1px 6px",
          outline: "none",
          width: "100%",
          maxWidth,
          minWidth: 0,
          fontFamily: "inherit",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Rename product"
      className="ix-product-name"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "text",
        fontSize,
        fontWeight,
        letterSpacing: -0.1,
        color: hasName
          ? "var(--color-text-primary)"
          : "var(--color-text-tertiary)",
        maxWidth,
        minWidth: 0,
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {display}
      </span>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.45, flex: "0 0 auto" }}
        aria-hidden
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    </button>
  );
}
