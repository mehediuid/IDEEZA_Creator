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
  const intentLabelId = React.useId();

  const options: SelectOption[] = React.useMemo(
    () => [
      { value: "new", label: "+ Create new project" },
      ...projects.map((p) => ({
        value: p.id,
        label: `${p.name}${p.status === "draft" ? " · Draft" : ""}`,
        section: "EXISTING PROJECTS",
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
            What&rsquo;s your idea?
          </h1>
          <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>
            A name and one line. Quick — you can edit everything later.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

          {isNew ? (
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
              placeholder="Discord Bot"
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
                placeholder="A discord bot that pings on every command."
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
          placeholder="Modern Battle Tank"
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
