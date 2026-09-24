"use client";

// Step 1 — "What's your idea?"
// Choose Project (an existing one, or a new one authored right here) + the two
// product fields + 3 intent cards, inside the shared BriefCard frame.

import * as React from "react";
import { SelectMenu, type SelectOption } from "@/components/ideeza";
import type { ManualProject } from "@/lib/manual/projects";
import { C } from "@/lib/pcb/colors";
import { BRIEF_DESC_MAX as MAX_DESC } from "@/lib/brief/types";
import { BriefCard, type Intent } from "./brief-app";

const INTENTS: {
  id: Intent;
  label: string;
  sub: string;
  requirement: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "sell",
    label: "Sell Your Idea",
    sub: "Mint as NFT and list",
    requirement: "Wallet + identity check",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
      </svg>
    ),
  },
  {
    id: "give",
    label: "Give to Community",
    sub: "Free distribute / drop",
    requirement: "Wallet needed · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.4" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M14 20c0-2.5 1.6-4.5 3-4.5s3 2 3 4.5" />
      </svg>
    ),
  },
  {
    id: "save",
    label: "Save as Private",
    sub: "Keep in your library",
    requirement: "No wallet · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M12 11v5 M10 13l2-2 2 2" />
      </svg>
    ),
  },
];

export type Step1Patch = {
  projectChoice?: string;
  newProjectName?: string;
  newProjectDescription?: string;
  productName?: string;
  productDescription?: string;
  otherProducts?: { name: string; description: string }[];
  intent?: Intent;
};

export function Step1Idea({
  projects,
  projectChoice,
  newProjectName,
  newProjectDescription,
  productCount,
  productName,
  productDescription,
  otherProducts,
  projectDecided,
  fromBuild,
  intent,
  busy,
  onChange,
  onBack,
  onContinue,
}: {
  projects: ManualProject[];
  projectChoice: string;
  newProjectName: string;
  newProjectDescription: string;
  /** Products already inside a project — the project's own + its builds. */
  productCount: (projectId: string) => number;
  productName: string;
  productDescription: string;
  /** The other products this build made — a system goes into one project
   *  (§4.4.8), so a drone's remote and its charger are saved alongside it.
   *  Named and described by the model; empty on a single-product build and
   *  on every hand-made project. */
  otherProducts?: { name: string; description: string }[];
  /** The project was already answered at the setup question, before any
   *  concept was drawn — so this step reads it back rather than asking it
   *  again. False on a hand-made project and on an older build that carries
   *  no such answer, where the chooser IS the question. */
  projectDecided?: boolean;
  /** Opened from a finished AI build: the idea has been built already, so the
   *  step is not asking for one — it checks what the brief will say. */
  fromBuild?: boolean;
  intent: Intent | null;
  /** Continue has been answered and the hand-off is in flight. */
  busy?: boolean;
  onChange: (patch: Step1Patch) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isNew = projectChoice === "new";
  const chosen = isNew ? null : projects.find((p) => p.id === projectChoice) ?? null;
  const reasonId = React.useId();
  // An answer already given is read back, not asked again — the same shape
  // the setup card in the chat uses. Pressing Change opens the real controls,
  // because an answer you cannot revise is a trap rather than an answer.
  const [editingProject, setEditingProject] = React.useState(false);
  const readBack = !!projectDecided && !editingProject && !!projectChoice;
  // §4.4.8 — a system's products live in ONE project, so a build carrying
  // more than one was never offered an existing project to join: the setup
  // question asked only for a name. Offering "Change" here would offer to
  // move it somewhere the flow does not allow, so a multi-product build can
  // rename its project and nothing else, and the chooser never appears.
  const system = (otherProducts?.length ?? 0) > 0;
  const intentLabelId = React.useId();

  const options: SelectOption[] = React.useMemo(
    () => [
      { value: "new", label: "+ Create new project" },
      ...projects.map((p) => ({
        value: p.id,
        label: `${p.name}${p.status === "draft" ? " · Draft" : ""}`,
        section: "Existing projects",
      })),
    ],
    [projects],
  );

  // The first thing still missing, top-down through the form — it is both what
  // disables Continue and what its tooltip says.
  const missing =
    // A build's brief starts with the chooser unanswered — it is the question
    // this step exists to ask, so it is also the first thing Continue waits on.
    !projectChoice
      ? "Choose a project for this build, or start a new one."
      : isNew && !newProjectName.trim()
        ? "Name the new project to continue."
        : // A stored choice can outlive the project it names (deleted, or a
          // browser that no longer holds it) — say so rather than letting
          // Continue do nothing.
          !isNew && !chosen
          ? "That project isn't available any more — choose another."
          : !productName.trim()
            ? "Add a product name to continue."
            : !productDescription.trim()
              ? "Add the one-line description to continue."
              : !intent
                ? "Pick how you want to share it."
                : null;
  const canContinue = !missing && !busy;

  return (
    <BriefCard onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.2 }}>
            {fromBuild ? "Add a brief" : "What\u2019s your idea?"}
          </h1>
          <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>
            {fromBuild
              ? "Check the names and one-liners the build wrote, then choose how it goes out."
              : "A name and one line. Quick — you can edit everything later."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {readBack ? (
            <DecidedProject
              name={isNew ? newProjectName.trim() : (chosen?.name ?? "")}
              detail={
                isNew
                  ? system
                    ? `New project · all ${(otherProducts?.length ?? 0) + 1} products go in it`
                    : "New project · created when you continue"
                  : `Existing project · already has ${productCount(
                      chosen?.id ?? "",
                    )} ${
                      productCount(chosen?.id ?? "") === 1
                        ? "product"
                        : "products"
                    }`
              }
              actionLabel={system && isNew ? "Rename" : "Change"}
              onChange={() => setEditingProject(true)}
            />
          ) : system ? null : (
            <SelectMenu
              label="Choose Project"
              placeholder="Choose Project"
              value={projectChoice || null}
              onChange={(v) => onChange({ projectChoice: v })}
              options={options}
              hint={
                chosen
                  ? `This build will be added to ${chosen.name}.`
                  : "Attach this build to an existing project, or start a new one."
              }
            />
          )}

          {readBack ? null : isNew ? (
            <NewProjectPanel
              name={newProjectName}
              description={newProjectDescription}
              onChange={onChange}
            />
          ) : chosen ? (
            <Callout
              title={`Adding to ${chosen.name}`}
              body={`That project already has ${productCount(chosen.id)} ${
                productCount(chosen.id) === 1 ? "product" : "products"
              }. Its name and description stay as they are.`}
            />
          ) : null}

          <FieldLabel label="Product name">
            <input
              className="ix-brief-field"
              value={productName}
              onChange={(e) => onChange({ productName: e.target.value })}
              placeholder="Smart plant waterer"
              autoFocus
              style={inputStyle}
            />
          </FieldLabel>

          <FieldLabel label="One line · what does it do?">
            <>
              <textarea
                className="ix-brief-field"
                value={productDescription}
                onChange={(e) =>
                  onChange({ productDescription: e.target.value.slice(0, MAX_DESC) })
                }
                placeholder="Waters a houseplant when its soil runs dry."
                rows={3}
                style={{
                  ...inputStyle,
                  height: 76,
                  resize: "vertical",
                  paddingTop: 12,
                  paddingBottom: 12,
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: 12, color: C.body, fontVariantNumeric: "tabular-nums" }}>
                {productDescription.length}/{MAX_DESC}
              </span>
            </>
          </FieldLabel>

          {/* A system is one project holding several products, so the rest of
              them are part of what is being saved — and the maker should see
              what that is before they save it. The fields above are the
              headline product; these came back named and described from the
              concept work, and are stored on the project with it. */}
          {otherProducts && otherProducts.length > 0 ? (
            <OtherProducts
              products={otherProducts}
              onSave={(i, next) =>
                onChange({
                  otherProducts: otherProducts.map((x, n) => (n === i ? next : x)),
                })
              }
            />
          ) : null}
        </div>

        <div
          style={{
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
            paddingTop: 18,
          }}
        >
          <div
            id={intentLabelId}
            style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}
          >
            How do you want to share it?
          </div>
          <div
            role="group"
            aria-labelledby={intentLabelId}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
          >
            {INTENTS.map((i) => {
              const sel = intent === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => onChange({ intent: i.id })}
                  aria-pressed={sel}
                  style={{
                    padding: "14px 12px",
                    background: sel ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                    border: `var(--border-width-1) solid ${sel ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 8,
                    textAlign: "left",
                    transition: "background .14s, border-color .14s",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-lg)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: sel ? "var(--color-bg-brand)" : "var(--color-bg-subtle)",
                      color: sel ? "var(--color-text-on-brand)" : "var(--color-text-secondary)",
                    }}
                  >
                    {i.icon}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{i.label}</span>
                  <span style={{ fontSize: 12, color: C.body }}>{i.sub}</span>
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-bg-info-subtle)",
                      color: "var(--color-text-blue)",
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i.requirement}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* The reason Continue is off is text on the page, not a tooltip —
              so a screen reader reaches it through aria-describedby. */}
          {missing ? (
            <span id={reasonId} style={{ fontSize: 12, color: C.body, textAlign: "right" }}>
              {missing}
            </span>
          ) : null}
          <span title={missing ?? undefined} style={{ display: "inline-flex" }}>
            <button
              onClick={onContinue}
              disabled={!canContinue}
              title={missing ?? undefined}
              aria-describedby={missing ? reasonId : undefined}
              style={{
                padding: "11px 22px",
                background: canContinue ? C.primary : "var(--color-bg-subtle)",
                color: canContinue ? "var(--color-text-on-brand)" : "var(--color-text-disabled)",
                border: "none",
                borderRadius: "var(--radius-lg)",
                fontSize: 14,
                fontWeight: 600,
                cursor: canContinue ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background .14s",
              }}
            >
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </span>
        </div>
      </div>
    </BriefCard>
  );
}

// The new project is authored in place: an inset panel under the chooser, so
// the two fields read as belonging to the "+ Create new project" row above.
function NewProjectPanel({
  name,
  description,
  onChange,
}: {
  name: string;
  description: string;
  onChange: (patch: Step1Patch) => void;
}) {
  return (
    <div
      style={{
        background: "var(--color-bg-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--color-text-brand)",
        }}
      >
        NEW PROJECT DETAILS
      </div>

      <FieldLabel label="Project name" hint="Products live inside a project. You can rename it later.">
        <input
          className="ix-brief-field"
          value={name}
          onChange={(e) => onChange({ newProjectName: e.target.value })}
          placeholder="Garden sensors"
          style={inputStyle}
        />
      </FieldLabel>

      <FieldLabel label="Project description" hint="Optional.">
        <textarea
          className="ix-brief-field"
          value={description}
          onChange={(e) => onChange({ newProjectDescription: e.target.value })}
          placeholder="Write description"
          rows={3}
          style={{
            ...inputStyle,
            height: 72,
            resize: "vertical",
            paddingTop: 12,
            paddingBottom: 12,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
      </FieldLabel>
    </div>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        background: "var(--color-bg-info-subtle)",
        border: "var(--border-width-1) solid var(--color-border-blue)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-blue)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5 M12 7.6v.4" />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{body}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 42,
  width: "100%",
  padding: "0 12px",
  background: "var(--color-input-bg)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "inherit",
};

function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-input-label)" }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 12, color: "var(--color-input-helper)" }}>{hint}</span> : null}
    </label>
  );
}

/** The products saved alongside the headline one — each editable in place.
 *  They were named by the model from concepts the maker approved, which makes
 *  them a good first draft and nothing more: a name read back wrong is one
 *  the maker should be able to fix here, beside the one they are already
 *  editing, rather than after the project exists. */
function OtherProducts({
  products,
  onSave,
}: {
  products: { name: string; description: string }[];
  onSave: (index: number, next: { name: string; description: string }) => void;
}) {
  const [editing, setEditing] = React.useState<number | null>(null);
  return (
    <div>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 8px",
        }}
      >
        Also in this project
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          border: "var(--border-width-1) solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--color-border)",
        }}
      >
        {products.map((x, i) => (
          <li
            key={`${i}-${x.name}`}
            style={{ padding: "10px 14px", background: "var(--color-bg-surface)" }}
          >
            {editing === i ? (
              <ProductEditor
                value={x}
                onCancel={() => setEditing(null)}
                onSave={(next) => {
                  onSave(i, next);
                  setEditing(null);
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text }}
                  >
                    {x.name}
                  </span>
                  {x.description ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: C.body,
                      }}
                    >
                      {x.description}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  aria-label={`Edit ${x.name}`}
                  style={{
                    flexShrink: 0,
                    height: 30,
                    padding: "0 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-brand)",
                    background: "transparent",
                    border: "var(--border-width-1) solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 12, color: C.body, marginTop: 8 }}>
        Saved with the project.
      </p>
    </div>
  );
}

/** One product's two fields, open in place. Save writes to the draft, so it
 *  survives a reload and a step back; Cancel leaves the row as it was. */
function ProductEditor({
  value,
  onSave,
  onCancel,
}: {
  value: { name: string; description: string };
  onSave: (next: { name: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(value.name);
  const [description, setDescription] = React.useState(value.description);
  const clean = name.trim();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="ix-brief-field"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Product name"
        aria-label="Product name"
        style={inputStyle}
      />
      <textarea
        className="ix-brief-field"
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
        placeholder="One line \u00b7 what does it do?"
        aria-label="One line description"
        rows={2}
        style={{
          ...inputStyle,
          height: 60,
          resize: "vertical",
          paddingTop: 10,
          paddingBottom: 10,
          lineHeight: 1.5,
          fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          disabled={!clean}
          title={clean ? undefined : "A product needs a name."}
          onClick={() => onSave({ name: clean, description: description.trim() })}
          style={{
            height: 30,
            padding: "0 14px",
            fontSize: 13,
            fontWeight: 600,
            color: clean ? "var(--color-text-on-brand)" : "var(--color-text-disabled)",
            background: clean ? "var(--color-bg-brand)" : "var(--color-bg-subtle)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: clean ? "pointer" : "not-allowed",
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 30,
            padding: "0 12px",
            fontSize: 13,
            fontWeight: 600,
            color: C.body,
            background: "transparent",
            border: "var(--border-width-1) solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** The project, already answered. It was decided at the setup question before
 *  a single concept was drawn, so presenting a chooser and a name field here
 *  asks the maker the same thing a second time — which is what they saw: the
 *  project named twice on one screen, once as a dropdown and once as a form.
 *  This states it and offers the way back to the controls. */
function DecidedProject({
  name,
  detail,
  actionLabel,
  onChange,
}: {
  name: string;
  detail: string;
  /** "Change" where another project is a real option, "Rename" where the
   *  project is fixed by the shape of the build and only its name is the
   *  maker's to edit. */
  actionLabel: string;
  onChange: () => void;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 8px",
        }}
      >
        Project
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          border: "var(--border-width-1) solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-bg-surface)",
        }}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          <span style={{ display: "block", marginTop: 2, fontSize: 12, color: C.body }}>
            {detail}
          </span>
        </span>
        <button
          type="button"
          onClick={onChange}
          className="ix-brief-change"
          style={{
            flexShrink: 0,
            height: 32,
            padding: "0 12px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-brand)",
            background: "transparent",
            border: "var(--border-width-1) solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
