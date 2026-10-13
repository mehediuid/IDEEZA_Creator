"use client";

// The editor as a page: the shell plus what its send button does. Sending checks
// what the editor owns (a title, a body, no picture still uploading, the latest
// text saved), then opens the Send dialog for the rest — cover, category,
// topics, project, reuse.

import * as React from "react";
import { SendDialog } from "@/components/blog/send/send-dialog";
import { usePostToast } from "@/components/innovations/toast";
import { findArticle } from "@/lib/blog/article";
import { sameDoc } from "@/lib/blog/doc";
import { readBody, useBlog } from "@/lib/blog/store";
import type { BlogDoc } from "@/lib/blog/types";
import { EditorShell, type SendRequest } from "./editor-shell";
import { editProblems } from "./editor-logic";

export function BlogEditorRoute({ slug }: { slug: string | null }) {
  const toast = usePostToast();
  const { data } = useBlog();
  const [send, setSend] = React.useState<{ id: string; doc: BlogDoc } | null>(null);

  const requestSend = React.useCallback(
    (req: SendRequest) => {
      const problems = editProblems(req.meta, req.doc);
      if (problems.length) return req.showProblems(problems);
      if (req.uploading.length) return toast(`Wait for ${req.uploading[0]} to finish uploading.`);
      if (!req.article) return req.showProblems(["body"]);
      if (!sameDoc(readBody(req.article.id, "doc").doc, req.doc)) {
        return toast("Your latest changes aren't saved yet, so nothing was sent. Try again in a moment.");
      }
      setSend({ id: req.article.id, doc: req.doc });
    },
    [toast],
  );

  const article = send ? findArticle(data, send.id) : null;
  return (
    <>
      <EditorShell slug={slug} onRequestSend={requestSend} />
      {send && article && <SendDialog open article={article} doc={send.doc} onClose={() => setSend(null)} />}
    </>
  );
}
