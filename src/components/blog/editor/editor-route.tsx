"use client";

// The editor as a page: the shell plus what its send button does. Until the Send
// dialog arrives (it asks for the category, cover, topics), sending checks what
// the editor itself owns — a title and a body — and says what is missing next to
// the field. `requestSend` is the one place the dialog plugs in.

import * as React from "react";
import { EditorShell, type SendRequest } from "./editor-shell";
import { editProblems } from "./editor-logic";

export function requestSend(req: SendRequest): void {
  const problems = editProblems(req.meta, req.doc);
  if (problems.length) req.showProblems(problems);
}

export function BlogEditorRoute({ slug }: { slug: string | null }) {
  return <EditorShell slug={slug} onRequestSend={requestSend} />;
}
