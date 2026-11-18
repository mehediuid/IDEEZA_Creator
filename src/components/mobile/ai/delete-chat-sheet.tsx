"use client";

// Delete a chat (History's delete, history-page.tsx): its prompts and concept
// images leave this browser with the builds started from it, except a build a
// project holds; nothing goes while one of its builds is waiting or building.
// The kit's destructive confirm, in the web's words.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { useCreateHistory, type ChatSession } from "@/lib/create/history";
import { chatDeletePlan, projectBuildIds } from "@/lib/create/history-delete";
import { useManualProjects } from "@/lib/manual/projects";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";

export function DeleteChatSheet({ chat, onClose, onDeleted }: { chat: ChatSession | null; onClose: () => void; onDeleted?: () => void }) {
  const { builds, deleteChat } = useCreateHistory();
  const { projects } = useManualProjects();
  const toast = useToast();
  const plan = chat ? chatDeletePlan(chat.id, builds, projectBuildIds(projects)) : null;
  if (!chat || !plan) return null;
  if (plan.busy) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Can't delete this chat yet"
        description="A build from this chat is still waiting or building. You can delete the chat once it finishes."
        actions={
          <Button size="xl" className="w-full" onClick={onClose}>
            OK
          </Button>
        }
      />
    );
  }
  const n = plan.drop.length;
  const kept = plan.kept;
  return (
    <ConfirmSheet
      open
      onClose={onClose}
      destructive
      title={`Delete “${chat.title}”?`}
      verb="Delete chat"
      body={
        <>
          Its prompts and concept images are removed from this browser
          {n ? `, and so ${n === 1 ? "is the build" : `are the ${n} builds`} started from it` : ""}.
          {kept ? ` ${kept === 1 ? "The build a project holds stays" : `The ${kept} builds projects hold stay`} with ${kept === 1 ? "that project" : "those projects"}.` : ""}
          {" "}IDEEZA&apos;s server keeps a copy of each concept image with its prompt, and there&apos;s no way to delete those yet.
        </>
      }
      onConfirm={() => {
        deleteChat(chat.id, plan.drop);
        toast({ title: "Chat deleted", lead: "success" });
        onDeleted?.();
      }}
    />
  );
}
