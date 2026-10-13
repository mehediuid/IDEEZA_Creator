"use client";

// The ladder's "Choose a license" fix (Build and Earn P1-4, L3). The same
// list and picker the Brief uses; Save writes the choice into the project's
// Brief draft (`saveDraftLicense`), where the mint flow reads it too.

import * as React from "react";
import { Button, ModalFrame, SelectMenu, type SelectOption } from "@/components/ideeza";
import { LICENSES, type License } from "@/lib/brief/types";
import { saveDraftLicense } from "@/lib/commerce/license";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const ERROR = "text-md text-[color:var(--color-input-error-text)]";

const LICENSE_OPTIONS: SelectOption<License>[] = LICENSES.map((l) => ({ value: l.value, label: l.label, info: l.info }));

type DialogProps = {
  open: boolean;
  projectId: string;
  current: License | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
};

export function LicenseDialog(props: DialogProps) {
  return props.open ? <LicenseForm {...props} /> : null;
}

function LicenseForm({ open, projectId, current, onClose, onSaved }: DialogProps) {
  const [value, setValue] = React.useState<License | null>(current);
  const [problem, setProblem] = React.useState<string | null>(null);

  const save = () => {
    if (!value) {
      setProblem("Choose a license.");
      return;
    }
    const r = saveDraftLicense(projectId, value);
    if (r === "unreadable") {
      setProblem("This project's Brief can't be read, so the license wasn't saved.");
      return;
    }
    if (r === "refused") {
      setProblem("This browser couldn't save it (storage is full or blocked). Nothing changed.");
      return;
    }
    onSaved?.(`License set: ${LICENSES.find((l) => l.value === value)?.label ?? value}.`);
    onClose();
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title="Choose a license"
      description="The terms your project is sold under."
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={save}>
            Save license
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <SelectMenu
          label="License"
          placeholder="Select a license"
          value={value}
          onChange={(v) => {
            setValue(v);
            setProblem(null);
          }}
          options={LICENSE_OPTIONS}
        />
        {problem && (
          <p role="alert" className={cn(ERROR, "m-0")}>
            {problem}
          </p>
        )}
      </div>
    </ModalFrame>
  );
}
