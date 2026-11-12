"use client";

// What you can do with someone else's profile from its ⋯ (PR-12, the Shared
// kit's KIT-RB-01 / RB-10…22): Share profile (the one public link, the web's
// `/creators/<handle>`, as Settings › Account copies it), Report profile (the kit's
// Report sheet with the web's profile reasons, saved where the web saves them,
// `ideeza:people:reports`), and Block (the kit's destructive confirm, writing
// the Messages blocked list, as the web does; Undo in the toast). Share
// profile hands the address to the phone's share sheet, else copies it.

import * as React from "react";
import { AlertCircleIcon, Share08Icon, UserBlock01Icon, UserCheck01Icon } from "@hugeicons/core-free-icons";
import { parseStored, readStoredKey, writeStoredKey } from "@/lib/key-store";
import { blockPerson, unblockPerson } from "@/lib/messages/actions";
import { startHref, type StartParams } from "@/lib/messages/links";
import { ME, profileHref, type Person } from "@/lib/people/ids";
import { curly, firstNameOf } from "@/lib/people/phone-profile";
import { REPORTS_KEY, REPORT_REASONS, normalizeReports, withReport, type ProfileReportReason } from "@/lib/people/reports";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ReportSheet } from "../kit/report-sheet";
import { ActionSheet } from "../kit/sheet";
import { useToast } from "../kit/toast";

/** Where Message goes on the phone: the web's start address (`/messages/new?to=…`) under /m,
 *  which finds or starts the conversation about the subject you share. */
export const messageHrefOf = (start: StartParams) => `/m${startHref(start)}`;

/** Share profile (PR-07): the phone's share sheet when it has one, else the link is copied. */
export function useShareProfile(): (person: Pick<Person, "handle" | "name">) => void {
  const toast = useToast();
  return React.useCallback(
    (person) => {
      const url = new URL(profileHref(person), window.location.origin).toString();
      const copy = () => {
        if (!navigator.clipboard) return toast({ title: "Couldn’t copy the link", lead: "error" });
        navigator.clipboard.writeText(url).then(
          () => toast({ title: "Link copied" }),
          () => toast({ title: "Couldn’t copy the link", lead: "error" }),
        );
      };
      if (typeof navigator.share !== "function") return copy();
      navigator.share({ title: `${person.name} on IDEEZA`, url }).catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) copy();
      });
    },
    [toast],
  );
}

function saveProfileReport(who: string, reason: ProfileReportReason, note: string): boolean {
  const list = normalizeReports(parseStored(readStoredKey(REPORTS_KEY)).value);
  const id = `prep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return writeStoredKey(REPORTS_KEY, withReport(list, { id, by: ME, who, reason, note, at: Date.now() })).ok;
}

const WRITE_FAILED = "This phone couldn’t save that. Nothing changed.";

/** The web's reasons, in the phone's typography (’, not '). */
const PHONE_REASONS = REPORT_REASONS.map((r) => ({ ...r, label: curly(r.label) }));

/** The viewer's ⋯ and the sheets it opens. */
export function PersonMenu({
  person,
  open,
  onClose,
  blocked,
}: {
  person: Person;
  open: boolean;
  onClose: () => void;
  blocked: boolean;
}) {
  const toast = useToast();
  const share = useShareProfile();
  const [sheet, setSheet] = React.useState<"report" | "block" | null>(null);
  // "Also block" is offered when the report opens on someone not blocked yet, and stays put while
  // the sheet says "You blocked … too".
  const [offerBlock, setOfferBlock] = React.useState(true);
  const first = firstNameOf(person.name);

  const unblock = () => {
    if (!unblockPerson(ME, person.id).ok) return toast({ title: WRITE_FAILED, lead: "error" });
    toast({ title: `You unblocked ${first}` });
  };

  return (
    <>
      <ActionSheet
        open={open}
        onClose={onClose}
        title={person.name}
        items={[
          { label: "Share profile", icon: Share08Icon, onSelect: () => share(person) },
          {
            label: "Report profile",
            icon: AlertCircleIcon,
            onSelect: () => {
              setOfferBlock(!blocked);
              setSheet("report");
            },
          },
          blocked
            ? { label: `Unblock ${first}`, icon: UserCheck01Icon, onSelect: unblock }
            : { label: `Block ${first}`, icon: UserBlock01Icon, destructive: true, onSelect: () => setSheet("block") },
        ]}
      />
      <ReportSheet
        open={sheet === "report"}
        onClose={() => setSheet(null)}
        title={`Report ${first}’s profile`}
        description={`${first} won’t know who reported.`}
        reasons={PHONE_REASONS}
        blockName={offerBlock ? first : undefined}
        onSend={async ({ reason, note, alsoBlock }) => {
          if (!saveProfileReport(person.id, reason as ProfileReportReason, note)) throw new Error("storage");
          if (alsoBlock && !blockPerson(ME, person.id).ok) throw new Error("storage");
        }}
      />
      <ConfirmSheet
        open={sheet === "block"}
        onClose={() => setSheet(null)}
        title={`Block ${first}?`}
        body={`${first} won’t be able to message you, and their comments on your shared projects are held. They won’t be told. You can unblock them here or in Settings › Privacy & safety.`}
        verb="Block"
        destructive
        onConfirm={() => {
          if (!blockPerson(ME, person.id).ok) return toast({ title: WRITE_FAILED, lead: "error" });
          toast({ title: `You blocked ${first}`, action: { label: "Undo", onClick: unblock } });
        }}
      />
    </>
  );
}
