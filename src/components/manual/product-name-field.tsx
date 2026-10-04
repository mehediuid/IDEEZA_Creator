"use client";

// ProductNameField — the editor chrome's inline name for the PRODUCT the
// editor holds (P2-EDITOR-6). "Not named yet" (muted) until named; click to
// edit, Enter/blur to save, Esc to cancel. It renames the current row
// through `renameProduct` — the virtual "p1" writes productName, and the
// first row carries the headline while the two agree (COR-95) — so every
// surface that shows the product (the project page's Products card, the
// switcher) updates at once. An empty name is refused and the row keeps its
// name.
//
// A rename changes what buyers see, so it goes through the edit gate
// (P2-LISTING-13): on a live Buy now listing it asks to pause the listing
// first; during an auction it's refused, with the reason on the control.

import * as React from "react";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import { useManualProjects } from "@/lib/manual/projects";
import { productRowsOf } from "@/lib/manual/project-read";

export const UNNAMED_PRODUCT = "Not named yet";

export function ProductNameField({
  fontSize = 15,
  fontWeight = 700,
  maxWidth = "100%",
}: {
  fontSize?: number | string;
  fontWeight?: number;
  maxWidth?: number | string;
}) {
  const { activeProject, activeProductId, renameProduct } = useManualProjects();
  const gate = useProjectEditGate(activeProject?.id ?? null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reasonId = React.useId();

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const row =
    activeProject && activeProductId
      ? productRowsOf(activeProject).find((r) => r.id === activeProductId)
      : undefined;
  if (!activeProject || !row) return null;

  const name = row.name.trim();
  const refused = gate.reasonOf("editProduct");

  const startEdit = () => {
    if (refused) return;
    setDraft(name);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === name) return;
    const projectId = activeProject.id;
    const rowId = row.id;
    gate.guard("editProduct", () => {
      renameProduct(projectId, rowId, next);
    });
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
        placeholder={UNNAMED_PRODUCT}
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
    <>
      <button
        type="button"
        onClick={startEdit}
        title={refused ?? "Rename product"}
        aria-label={`Rename product: ${name || UNNAMED_PRODUCT}`}
        aria-disabled={refused ? true : undefined}
        aria-describedby={refused ? reasonId : undefined}
        className="ix-product-name"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: refused ? "default" : "text",
          fontSize,
          fontWeight,
          letterSpacing: -0.1,
          color: name ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
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
          {name || UNNAMED_PRODUCT}
        </span>
        {!refused && (
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
        )}
      </button>
      {refused && (
        <span id={reasonId} className="sr-only">
          {refused}
        </span>
      )}
      {gate.dialog}
    </>
  );
}
