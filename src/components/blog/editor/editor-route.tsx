"use client";

// The editor as a page: the shell plus what its Publish (or Update) button does.
// It checks what the page owns (a category, a title, a body — each said next to
// its field — no photo still being added, the latest text saved), then opens the
// publish step for the rest: the thumbnail, the tags, reuse. The publish step's
// "Add descriptions" comes back here, to the first image without one.

import * as React from "react";
import { SendDialog } from "@/components/blog/send/send-dialog";
import { usePostToast } from "@/components/innovations/toast";
import { findArticle } from "@/lib/blog/article";
import { sameDoc } from "@/lib/blog/doc";
import { readBody, useBlog } from "@/lib/blog/store";
import type { BlogDoc } from "@/lib/blog/types";
import { EditorShell, type SendRequest } from "./editor-shell";
import { editProblems, waitForAdding } from "./editor-logic";

export function BlogEditorRoute({ slug }: { slug: string | null }) {
  const toast = usePostToast();
  const { data } = useBlog();
  const [send, setSend] = React.useState<{ id: string; doc: BlogDoc; addDescriptions: () => void } | null>(null);

  const requestSend = React.useCallback(
    (req: SendRequest) => {
      const problems = editProblems(req.meta, req.doc);
      if (problems.length) return req.showProblems(problems);
      if (req.uploading.length) return toast(waitForAdding(req.uploading.length));
      if (!req.article) return req.showProblems(["body"]);
      // The same rule autosave uses (doc.ts docKey): a saved blog is never refused.
      if (!sameDoc(readBody(req.article.id, "doc").doc, req.doc)) return req.showSaveProblem();
      setSend({ id: req.article.id, doc: req.doc, addDescriptions: req.addDescriptions });
    },
    [toast],
  );

  const article = send ? findArticle(data, send.id) : null;
  return (
    <>
      <EditorShell slug={slug} onRequestSend={requestSend} />
      {send && article && (
        <SendDialog
          open
          article={article}
          doc={send.doc}
          onClose={() => setSend(null)}
          onAddDescriptions={() => {
            const go = send.addDescriptions;
            setSend(null);
            go();
          }}
        />
      )}
    </>
  );
}
