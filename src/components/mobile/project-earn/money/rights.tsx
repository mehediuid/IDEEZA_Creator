"use client";

// Earn › Money › Rights on the phone (Figma 17, 17b, 17d, 17h, 17i; the
// web's EarnRights and rail-legal.tsx, `checkRight` and its words): each
// Patent, Copyright or Trademark as a row (the kind, its number or words),
// "As stated by you — not verified.", Add a right (or the 20-rights line);
// then the License row. A right's sheet: Type (A06 as a pick-one sheet; the
// web's segmented control), the kind's own field, Attorney name (optional)
// for a trademark, Link (optional), checked on Save; editing adds Remove,
// which asks first. The License row opens the Choose a license sheet (the
// web's dialog, `LicenseSheet`). Sold in full, the rights read only.

import * as React from "react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { legalRows } from "@/components/projects/details/rail-legal";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { LICENSES } from "@/lib/brief/types";
import { checkRight, rightFromInput, rightsOf, RIGHT_FIELD, RIGHT_KINDS, RIGHT_LABEL, RIGHTS_MAX, withoutRight, withRight, type LegalRight, type LegalRightKind, type RightInput } from "@/lib/manual/legal";
import type { ProjectLegal } from "@/lib/manual/p2-types";
import { can } from "@/lib/manual/permissions";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Sheet } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useToast } from "../../kit/toast";
import { Chevron, ListCard } from "../../kit/list";
import { useEarn } from "../context";
import { EARN_CARD, EARN_LEAD, EARN_NOTE, LicenseSheet } from "../parts";
import { MoneySection, ROW_BUTTON } from "./parts";
import { T } from "../../type";

const FOOTNOTE = "As stated by you — not verified.";
const KIND_OPTIONS = RIGHT_KINDS.map((k) => ({ value: k, label: RIGHT_LABEL[k] }));

/** What is open; an edited right is kept as it was opened, so its sheet outlives a remove. */
type Open = { kind: "new" } | { kind: "edit"; right: LegalRight } | { kind: "license" } | null;

export function Rights() {
  const { project, view, viewer, brief, announce } = useEarn();
  const toast = useToast();
  const editable = can(viewer, "legal.edit", view.canCtx);
  const rows = legalRows(project.legal);
  const rights = rightsOf(project.legal);
  const full = rights.length >= RIGHTS_MAX;
  const [open, setOpen] = React.useState<Open>(null);
  const licenseId = brief?.state.license ?? null;
  const license = LICENSES.find((l) => l.value === licenseId) ?? null;
  const showLicense = license !== null || view.summary.status !== "draft";
  const said = (m: string) => {
    toast({ title: m });
    announce(m);
  };

  return (
    <MoneySection
      id="rights"
      title="Rights"
      lead="The patents, copyrights and trademarks anyone buying it should know about, as you state them. Add as many as you have."
    >
      {rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <ListCard label="Rights">
            {rows.map((row) => {
              const body = (
                <>
                  <span className={cn(T.body, "shrink-0")}>{row.label}</span>
                  <span className="flex min-w-0 flex-1 flex-col items-end text-right">
                    {row.lines.map((line, i) => (
                      <span key={i} className={cn("max-w-full truncate", i === 0 ? cn(T.body, "text-text-primary") : T.meta)}>
                        {line}
                      </span>
                    ))}
                  </span>
                </>
              );
              return (
                <li key={row.id}>
                  {editable ? (
                    <button
                      type="button"
                      aria-label={`Edit ${row.label.toLowerCase()} ${row.lines[0] ?? ""}`.trim()}
                      aria-haspopup="dialog"
                      className={ROW_BUTTON}
                      onClick={() => {
                        const right = rights.find((r) => r.id === row.id);
                        if (right) setOpen({ kind: "edit", right });
                      }}
                    >
                      {body}
                      <Chevron />
                    </button>
                  ) : (
                    <div className={cn(ROW_BUTTON, "hover:bg-transparent")}>{body}</div>
                  )}
                </li>
              );
            })}
          </ListCard>
          <p className={cn(T.meta, "text-text-tertiary")}>{FOOTNOTE}</p>
        </div>
      )}
      {!editable && rows.length === 0 && !license && <p className={EARN_LEAD}>No rights were added before it sold in full.</p>}
      {editable &&
        (full ? (
          <p className={EARN_LEAD}>{`That's ${RIGHTS_MAX} rights, the most a project holds. Edit or remove one to add another.`}</p>
        ) : rows.length === 0 ? (
          // Empty, in a card like Splits and Sales (Figma 17).
          <div className={EARN_CARD}>
            <p className={EARN_LEAD}>No rights added yet.</p>
            <Button hierarchy="secondary" size="xl" className="self-start" iconLeading={<Icon icon={PlusSignIcon} size={20} />} onClick={() => setOpen({ kind: "new" })}>
              Add a right
            </Button>
          </div>
        ) : (
          <Button hierarchy="secondary" size="xl" className="self-start" iconLeading={<Icon icon={PlusSignIcon} size={20} />} onClick={() => setOpen({ kind: "new" })}>
            Add a right
          </Button>
        ))}
      {showLicense && (
        <div className="flex flex-col gap-2">
          <ListCard label="License">
            <li>
              {editable ? (
                <button type="button" aria-haspopup="dialog" className={ROW_BUTTON} onClick={() => setOpen({ kind: "license" })}>
                  <span className={cn(T.body, "shrink-0")}>License</span>
                  <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{license?.label ?? "Choose a license"}</span>
                  <Chevron />
                </button>
              ) : (
                <div className={cn(ROW_BUTTON, "hover:bg-transparent")}>
                  <span className={cn(T.body, "shrink-0")}>License</span>
                  <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{license?.label ?? "—"}</span>
                </div>
              )}
            </li>
          </ListCard>
          {license && <p className={EARN_NOTE}>{license.info}</p>}
        </div>
      )}

      {open?.kind === "new" && <RightSheet key="new" right={null} onClose={() => setOpen(null)} onDone={said} />}
      {open?.kind === "edit" && <RightSheet key={open.right.id} right={open.right} onClose={() => setOpen(null)} onDone={said} />}
      <LicenseSheet open={open?.kind === "license"} projectId={project.id} current={licenseId} onClose={() => setOpen(null)} onSaved={said} />
    </MoneySection>
  );
}

function bareLegal(l: ProjectLegal | undefined): string {
  return l ? JSON.stringify(l.rights) : "";
}

function newRightId(): string {
  return `right_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Add a right (17d) / Edit right (17h): the web's form as a sheet. */
function RightSheet({ right, onClose, onDone }: { right: LegalRight | null; onClose: () => void; onDone: (message: string) => void }) {
  const { project } = useEarn();
  const { setLegal } = useManualProjects();
  const [id] = React.useState(() => right?.id ?? newRightId());
  const [input, setInput] = React.useState<RightInput>({
    kind: right?.kind ?? "patent",
    text: right?.text ?? "",
    url: right?.url ?? "",
    attorney: right?.attorney ?? "",
  });
  const [tried, setTried] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [pending, setPending] = React.useState<{ snapshot: string; message: string } | null>(null);
  const ids = useFieldIds(["kind", "text", "attorney", "url"] as const);
  const check = checkRight(input);
  const write = useStoreWrite(pending !== null && bareLegal(project.legal) === pending.snapshot, () => {
    if (pending) onDone(pending.message);
    onClose();
  });
  const field = RIGHT_FIELD[input.kind];
  const set = (key: keyof Omit<RightInput, "kind">) => (value: string) => setInput((s) => ({ ...s, [key]: value }));

  const commit = (next: ProjectLegal | undefined, message: string) => {
    const snapshot = bareLegal(next);
    if (snapshot === bareLegal(project.legal)) return onClose();
    setPending({ snapshot, message });
    write.start();
    setLegal(project.id, next ?? null);
  };
  const save = () => {
    if (write.saving) return;
    if (!check.ok) return setTried(true);
    commit(withRight(project.legal, rightFromInput(id, input), Date.now()), right ? "Right saved" : "Right added");
  };
  const remove = () => {
    if (write.saving || !right) return;
    commit(withoutRight(project.legal, right.id, Date.now()), "Right removed");
  };
  const errors = tried ? check : { text: null, url: null, attorney: null };

  return (
    <>
      <Sheet
        open={!removing}
        onClose={() => {
          if (!write.saving) onClose();
        }}
        title={right ? "Edit right" : "Add a right"}
        actions={
          <>
            <Button size="xl" className="w-full" loading={write.saving} onClick={save}>
              {write.saving ? "Saving…" : "Save"}
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" disabled={write.saving} onClick={onClose}>
              Cancel
            </Button>
            {write.failed && <p className={cn(T.meta, "text-text-error")}>{WRITE_FAILED}</p>}
          </>
        }
      >
        <Field label="Type" htmlFor={ids.kind.id}>
          <SheetSelect
            id={ids.kind.id}
            title="Type"
            value={input.kind}
            options={KIND_OPTIONS}
            onChange={(kind) => setInput((s) => ({ ...s, kind: kind as LegalRightKind }))}
          />
        </Field>
        <Field label={field.label} htmlFor={ids.text.id} error={errors.text} errorId={ids.text.errorId}>
          <TextInput id={ids.text.id} size="xl" value={input.text} placeholder={field.example} onValueChange={set("text")} {...errorProps(errors.text, ids.text.errorId)} />
        </Field>
        {input.kind === "trademark" && (
          <Field label="Attorney name (optional)" htmlFor={ids.attorney.id} error={errors.attorney} errorId={ids.attorney.errorId}>
            <TextInput id={ids.attorney.id} size="xl" value={input.attorney} onValueChange={set("attorney")} {...errorProps(errors.attorney, ids.attorney.errorId)} />
          </Field>
        )}
        <Field label="Link (optional)" htmlFor={ids.url.id} error={errors.url} errorId={ids.url.errorId}>
          <TextInput
            id={ids.url.id}
            size="xl"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            value={input.url}
            placeholder="https://"
            onValueChange={set("url")}
            {...errorProps(errors.url, ids.url.errorId)}
          />
        </Field>
        <p className={cn(T.meta, "text-text-tertiary")}>{FOOTNOTE}</p>
        {right && (
          <Button hierarchy="danger" size="xl" className="w-full" disabled={write.saving} onClick={() => setRemoving(true)}>
            Remove
          </Button>
        )}
      </Sheet>
      {right && (
        <ConfirmSheet
          open={removing}
          onClose={() => setRemoving(false)}
          title={`Remove this ${RIGHT_LABEL[right.kind].toLowerCase()}?`}
          body="Buyers won't see it any more."
          verb="Remove"
          destructive
          cancelLabel="Keep it"
          onConfirm={remove}
        />
      )}
    </>
  );
}
