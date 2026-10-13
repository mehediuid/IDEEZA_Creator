"use client";

// The article body (spec § Screens 2, owner decision D7): TipTap v3, loaded only on
// the editor routes (next/dynamic, no server render). It hands the page the body as
// BlogDoc v1 — normalizeDoc on every change, so nothing the schema doesn't know is
// ever stored — and takes pictures in four ways: "+" › Image, the phone's Add,
// dropping files, and pasting image files. Pictures that come with pasted HTML
// (Google Docs, a web page) live on another site and can't be copied: they are
// left out and counted in a toast. Pasted text keeps only the marks an article
// has (bold, code, links), so a page's colours never come along.

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Selection } from "@tiptap/pm/state";
import { usePostToast } from "@/components/innovations/toast";
import { normalizeDoc } from "@/lib/blog/doc";
import { deleteBlogFiles } from "@/lib/blog/files";
import { storeImage, type StoredImage } from "@/lib/blog/image";
import { IMAGE_TYPES } from "@/lib/blog/media";
import type { BlogDoc } from "@/lib/blog/types";
import { BlockInserter, BlockSheet, runBlock } from "./block-menu";
import { editableDoc, pastedHeadings, pastedImageCount, pastedImagesNote, type BlockId } from "./editor-logic";
import { blogExtensions, keyBus } from "./extensions";
import { FormatBubble } from "./format-bubble";
import { prepareLink } from "./format";
import { UploadsContext, type Upload, type UploadsApi } from "./image-view";
import { PhoneBar } from "./phone-bar";
import { PROSE } from "./prose";

export type BodyApi = {
  focus: (at: "start" | "end") => void;
  /** Replaces the body without counting it as an edit (Load newer version). */
  setDoc: (doc: BlogDoc) => void;
  /** Names of pictures still being stored. */
  uploading: () => string[];
};

export type BodyEditorProps = {
  initialDoc: BlogDoc;
  editable: boolean;
  /** Phone or touch screen: the format bar and the Add sheet instead of the bubble and "+". */
  touch: boolean;
  apiRef: React.RefObject<BodyApi | null>;
  /** The article's id, creating the article first when there is none yet (/blog/new). */
  ensureArticle: () => string | null;
  onChange: (doc: BlogDoc) => void;
  onBlur: () => void;
  /** ↑ on the first line. */
  onExitUp: () => void;
  /** The stored body has something this editor can't show: never save over it. */
  onContentError: () => void;
  /** The message under the body, when it says what's missing. */
  describedBy?: string;
};

const storageFull = (name: string) => `Couldn't save ${name}: this browser's storage is full.`;

function imagePos(editor: Editor, uploadId: string): number | null {
  let at: number | null = null;
  editor.state.doc.descendants((n, pos) => {
    if (at !== null) return false;
    if (n.type.name === "image" && n.attrs.uploadId === uploadId) at = pos;
    return true;
  });
  return at;
}

/** Puts a stored file on the image that waited for it. False when the image is gone. */
function placeFile(editor: Editor, uploadId: string, file: StoredImage): boolean {
  const pos = imagePos(editor, uploadId);
  if (pos === null) return false;
  return editor.commands.command(({ tr }) => {
    const node = tr.doc.nodeAt(pos);
    if (!node) return false;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, fileKey: file.fileKey, width: file.width, height: file.height, uploadId: null });
    tr.setMeta("addToHistory", false);
    return true;
  });
}

/** Where dropped files go: in place of an empty line, else after the block under the pointer. */
function dropPos(editor: Editor, pos: number): number {
  const $p = editor.state.doc.resolve(pos);
  if ($p.depth === 0) return pos;
  if ($p.parent.isTextblock && $p.parent.content.size === 0 && $p.depth === 1) return pos;
  return $p.after(1);
}

export default function BodyEditor(props: BodyEditorProps) {
  const latest = React.useRef(props);
  React.useLayoutEffect(() => {
    latest.current = props;
  });
  const toast = usePostToast();
  const toastRef = React.useRef(toast);
  React.useLayoutEffect(() => {
    toastRef.current = toast;
  });

  const [uploads, setUploads] = React.useState<Record<string, Upload>>({});
  const uploadsRef = React.useRef(uploads);
  React.useLayoutEffect(() => {
    uploadsRef.current = uploads;
  });
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const openMenu = React.useRef<(() => void) | null>(null);
  const editorRef = React.useRef<Editor | null>(null);
  const [keys] = React.useState(keyBus);
  const [extensions] = React.useState(() => blogExtensions(keys));

  const upload = React.useCallback(async (uploadId: string, file: File, articleId: string) => {
    const res = await storeImage(file, articleId);
    if (!res.ok) {
      setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: res.error } }));
      return;
    }
    const ed = editorRef.current;
    const placed = !!ed && !ed.isDestroyed && placeFile(ed, uploadId, res.value);
    // Removed while it was being stored: the file has no article to belong to.
    if (!placed) void deleteBlogFiles([res.value.fileKey]);
    setUploads((u) => {
      const next = { ...u };
      delete next[uploadId];
      return next;
    });
  }, []);

  const insertFiles = React.useCallback(
    async (files: File[], at?: number) => {
      const ed = editorRef.current;
      if (!ed || ed.isDestroyed || !files.length) return;
      const articleId = latest.current.ensureArticle();
      const items = files.map((file) => ({ file, uploadId: crypto.randomUUID() }));
      setUploads((u) => {
        const next = { ...u };
        for (const i of items) next[i.uploadId] = { name: i.file.name, error: articleId ? null : storageFull(i.file.name) };
        return next;
      });
      const nodes = items.map((i) => ({ type: "image", attrs: { uploadId: i.uploadId } }));
      const c = ed.chain().focus();
      (typeof at === "number" ? c.insertContentAt(dropPos(ed, at), nodes) : c.insertContent(nodes)).run();
      if (!articleId) return;
      for (const i of items) await upload(i.uploadId, i.file, articleId);
    },
    [upload],
  );

  const uploadsApi = React.useMemo<UploadsApi>(
    () => ({
      uploads,
      replace: (uploadId, file) => {
        const articleId = latest.current.ensureArticle();
        setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: articleId ? null : storageFull(file.name) } }));
        if (articleId) void upload(uploadId, file, articleId);
      },
    }),
    [uploads, upload],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editable: props.editable,
      enableContentCheck: true,
      extensions,
      content: editableDoc(props.initialDoc),
      onContentError: () => latest.current.onContentError(),
      onUpdate: ({ editor: ed }) => latest.current.onChange(normalizeDoc(ed.getJSON())),
      onBlur: () => latest.current.onBlur(),
      editorProps: {
        attributes: { class: PROSE, role: "textbox", "aria-multiline": "true", "aria-label": "Article" },
        transformPastedHTML: pastedHeadings,
        handlePaste: (_view, event) => {
          const data = event.clipboardData;
          if (!data) return false;
          const files = Array.from(data.files);
          // Word and some apps add a snapshot picture of copied text: the words win.
          if (files.length && !data.getData("text/plain").trim()) {
            void insertFiles(files);
            return true;
          }
          const lost = pastedImageCount(data.getData("text/html"));
          if (lost) toastRef.current(pastedImagesNote(lost));
          return false;
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.length) return false;
          event.preventDefault();
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          void insertFiles(files, at?.pos);
          return true;
        },
      },
    },
    [],
  );

  React.useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
    const api = latest.current.apiRef;
    api.current = {
      // At once, not on the next frame (TipTap's focus waits for one): the key that moved
      // here is followed by typing that must land here too.
      focus: (at) => {
        const { state, view } = editor;
        view.dispatch(state.tr.setSelection(at === "start" ? Selection.atStart(state.doc) : Selection.atEnd(state.doc)).scrollIntoView());
        view.focus();
      },
      setDoc: (doc) => {
        editor.commands.setContent(editableDoc(doc), { emitUpdate: false });
      },
      uploading: () => {
        const names: string[] = [];
        editor.state.doc.descendants((n) => {
          const id = n.type.name === "image" && !n.attrs.fileKey ? (n.attrs.uploadId as string | null) : null;
          const up = id ? uploadsRef.current[id] : undefined;
          if (up && up.error === null) names.push(up.name);
          return true;
        });
        return names;
      },
    };
    const closeLink = () => setLinkOpen(false);
    editor.on("focus", closeLink);
    return () => {
      editor.off("focus", closeLink);
      api.current = null;
    };
  }, [editor]);

  React.useLayoutEffect(() => {
    keys.set({
      link: () => {
        const ed = editorRef.current;
        if (!ed || !ed.isEditable) return;
        prepareLink(ed);
        setLinkOpen(true);
      },
      slash: () => {
        if (latest.current.touch) {
          setSheetOpen(true);
          return true;
        }
        if (!openMenu.current) return false;
        openMenu.current();
        return true;
      },
      exitUp: () => latest.current.onExitUp(),
    });
  });

  React.useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    if (props.describedBy) {
      dom.setAttribute("aria-describedby", props.describedBy);
      dom.setAttribute("aria-invalid", "true");
    } else {
      dom.removeAttribute("aria-describedby");
      dom.removeAttribute("aria-invalid");
    }
  }, [editor, props.describedBy]);

  const pickImage = () => fileRef.current?.click();
  const onBlock = (id: BlockId) => {
    if (editor) runBlock(editor, id, pickImage);
  };

  return (
    <UploadsContext.Provider value={uploadsApi}>
      <div
        className="relative"
        // ⌘K is the link here: the app's search shortcut must not also open.
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") e.nativeEvent.stopImmediatePropagation();
        }}
      >
        <EditorContent editor={editor} />
        {editor && props.editable && !props.touch && (
          <>
            <BlockInserter editor={editor} onBlock={onBlock} openRef={openMenu} />
            <FormatBubble editor={editor} linkOpen={linkOpen} setLinkOpen={setLinkOpen} />
          </>
        )}
        {editor && props.editable && props.touch && (
          <>
            <PhoneBar editor={editor} linkOpen={linkOpen} setLinkOpen={setLinkOpen} onAdd={() => setSheetOpen(true)} />
            <BlockSheet
              open={sheetOpen}
              onClose={() => {
                setSheetOpen(false);
                window.requestAnimationFrame(() => editor.commands.focus());
              }}
              onBlock={(id) => {
                if (id === "image") pickImage();
                setSheetOpen(false);
                if (id !== "image") window.requestAnimationFrame(() => runBlock(editor, id, pickImage));
              }}
            />
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void insertFiles(files);
          }}
        />
      </div>
    </UploadsContext.Provider>
  );
}
