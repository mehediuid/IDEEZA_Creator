"use client";

// The blog's body (spec § Screens 2, owner decision D7): TipTap v3, loaded only on
// the editor routes (no server render). It hands the page the body as BlogDoc v1
// — normalizeDoc on every change, so nothing the schema doesn't know is ever
// stored — and takes pictures in four ways: "+" › Image, the phone's Add,
// dropping files, and pasting image files; a dropped MP4, WebM or iPhone video
// goes in as a video. Every photo and video stands in its place while it is
// stored ("Adding …"), and a refused one says why there, with another try or
// Remove; the page counts them once in its save slot.
//
// Pasting: code (from VS Code, a code font, or indented lines) becomes one code
// block; Word's lists become lists; what a blog can't hold (tables, italics,
// pictures from another site) is said in a banner the page keeps until it is
// dismissed, with Undo paste. Pasted text keeps only the marks a blog has (bold,
// code, links), so a page's colours never come along. Inside columns, pictures
// land in the column; a video, a project card or images side by side can't
// stand in a column, so their tools are greyed there.
//
// On a phone the line being typed stays above the format bar and the keyboard:
// ProseMirror scrolls the caret clear of both, and the writing has room below it.

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { usePostToast } from "@/components/innovations/toast";
import { normalizeDoc } from "@/lib/blog/doc";
import { deleteBlogFiles } from "@/lib/blog/files";
import { storeImage, storeVideo } from "@/lib/blog/image";
import { IMAGE_ACCEPT, mediaKind, VIDEO_ACCEPT } from "@/lib/blog/media";
import type { BlogDoc } from "@/lib/blog/types";
import { asksFirst, BlockInserter, BlockSheet, runTool, useCaretAt, type ToolPick } from "./block-menu";
import { ProjectPicker } from "./project-picker";
import { editableDoc, pastedCode, pastedHeadings, pasteLosses, pasteLossLine, rowPick, tableLines, TOOLS, wordLists, type ToolId } from "./editor-logic";
import { blogExtensions, keyBus } from "./extensions";
import { FormatBubble } from "./format-bubble";
import { prepareLink } from "./format";
import { UploadsContext, type Upload, type UploadsApi } from "./image-view";
import { dropPos, insertBlock } from "./layout";
import { PhoneBar, useKeyboardInset } from "./phone-bar";
import { PROSE } from "./prose";

export type BodyApi = {
  focus: (at: "start" | "end") => void;
  /** Replaces the body without counting it as an edit (Load newer version). */
  setDoc: (doc: BlogDoc) => void;
  /** Names of photos still being added. */
  uploading: () => string[];
  /** The publish step's "Add descriptions": selects the first image without one and puts the
   *  caret in its Description. */
  focusMissingAlt: () => void;
  /** Undo paste. */
  undo: () => void;
  /** Where the caret is, and putting it back (coming back from Preview). */
  selection: () => { from: number; to: number };
  select: (from: number, to: number) => void;
};

export type BodyEditorProps = {
  initialDoc: BlogDoc;
  editable: boolean;
  /** Phone or touch screen: the format bar and the Add sheet instead of the bubble and "+". */
  touch: boolean;
  apiRef: React.RefObject<BodyApi | null>;
  /** The blog's id, creating the blog first when there is none yet (/blog/new). */
  ensureArticle: () => string | null;
  onChange: (doc: BlogDoc) => void;
  onBlur: () => void;
  /** ↑ on the first line. */
  onExitUp: () => void;
  /** The stored body has something this editor can't show: never save over it. */
  onContentError: () => void;
  /** What describes the body: the message under it, and how to add things. */
  describedBy?: string;
  /** The body is what stops Publish ("Write something first."). */
  invalid?: boolean;
  /** Photos and videos being added: how many of how many (both 0 when none). */
  onAdding: (p: { done: number; total: number }) => void;
  /** A photo or video just landed in its place: the page keeps it now. */
  onPlaced: () => void;
  /** A short sentence for screen readers ("Heading added"). */
  onAnnounce: (text: string) => void;
  /** A paste lost things a blog can't hold: the banner's sentence. */
  onPasteLoss: (line: string) => void;
  /** Escape outside a code block: the writing card takes focus, so Tab moves on. */
  onEscape: () => void;
};

const storageFull = (name: string) => `Couldn't save ${name}: this browser's storage is full.`;

/** Where the node waiting for `uploadId` stands (an image or a video). */
function waitingPos(editor: Editor, uploadId: string): number | null {
  let at: number | null = null;
  editor.state.doc.descendants((n, pos) => {
    if (at !== null) return false;
    if ((n.type.name === "image" || n.type.name === "video") && n.attrs.uploadId === uploadId) at = pos;
    return true;
  });
  return at;
}

/** Puts a stored file on the node that waited for it. False when the node is gone. */
function placeFile(editor: Editor, uploadId: string, attrs: Record<string, unknown>): boolean {
  const pos = waitingPos(editor, uploadId);
  if (pos === null) return false;
  return editor.commands.command(({ tr }) => {
    const node = tr.doc.nodeAt(pos);
    if (!node) return false;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs, uploadId: null });
    tr.setMeta("addToHistory", false);
    return true;
  });
}

const DONE: Partial<Record<ToolId, string>> = Object.fromEntries(TOOLS.filter((t) => t.done).map((t) => [t.id, t.done]));

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
  const rowRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLInputElement>(null);
  const [projectOpen, setProjectOpen] = React.useState(false);
  const openMenu = React.useRef<(() => void) | null>(null);
  const editorRef = React.useRef<Editor | null>(null);
  const [keys] = React.useState(keyBus);
  // How far the caret stays from the bottom edge: on a phone, clear of the bar and the keyboard.
  const bottomMargin = React.useRef(5);
  const [extensions] = React.useState(() => blogExtensions(keys));

  // ── photos and videos on their way, counted once ──

  const wave = React.useRef({ done: 0, total: 0, placed: 0 });
  const report = React.useCallback(() => {
    const w = wave.current;
    latest.current.onAdding({ done: w.done, total: w.total });
  }, []);
  const begin = React.useCallback(
    (n: number) => {
      wave.current.total += n;
      report();
    },
    [report],
  );
  const finish = React.useCallback(
    (placed: boolean) => {
      const w = wave.current;
      w.done += 1;
      if (placed) w.placed += 1;
      if (w.done >= w.total) {
        if (w.placed) latest.current.onAnnounce(w.placed === 1 ? "Image added, description needed" : `${w.placed} images added, descriptions needed`);
        wave.current = { done: 0, total: 0, placed: 0 };
      }
      report();
    },
    [report],
  );

  const upload = React.useCallback(
    async (uploadId: string, file: File, articleId: string) => {
      const res = await storeImage(file, articleId);
      if (!res.ok) {
        setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: res.error, kind: "image" } }));
        finish(false);
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
      if (placed) latest.current.onPlaced();
      finish(placed);
    },
    [finish],
  );

  const uploadVideo = React.useCallback(
    async (uploadId: string, file: File, articleId: string) => {
      const res = await storeVideo(file, articleId);
      if (!res.ok) {
        setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: res.error, kind: "video" } }));
        finish(false);
        return;
      }
      const ed = editorRef.current;
      const placed = !!ed && !ed.isDestroyed && placeFile(ed, uploadId, res.value);
      if (!placed) void deleteBlogFiles([res.value.fileKey]);
      setUploads((u) => {
        const next = { ...u };
        delete next[uploadId];
        return next;
      });
      if (placed) {
        latest.current.onPlaced();
        latest.current.onAnnounce(`${file.name} added`);
      }
      // A video is not an image: it needs no description, so it isn't counted as one.
      wave.current.done += 1;
      if (wave.current.done >= wave.current.total) wave.current = { done: 0, total: 0, placed: 0 };
      report();
    },
    [finish, report],
  );

  const insertFiles = React.useCallback(
    async (files: File[], at?: number) => {
      const ed = editorRef.current;
      if (!ed || ed.isDestroyed || !files.length) return;
      const articleId = latest.current.ensureArticle();
      const items = files.map((file) => ({ file, uploadId: crypto.randomUUID() }));
      setUploads((u) => {
        const next = { ...u };
        for (const i of items) next[i.uploadId] = { name: i.file.name, error: articleId ? null : storageFull(i.file.name), kind: "image" };
        return next;
      });
      const nodes = items.map((i) => ({ type: "image", attrs: { uploadId: i.uploadId } }));
      if (typeof at === "number") ed.chain().focus().insertContentAt(dropPos(ed.state, at), nodes).run();
      else insertBlock(ed, nodes, true);
      if (!articleId) return;
      begin(items.length);
      for (const i of items) await upload(i.uploadId, i.file, articleId);
    },
    [upload, begin],
  );

  /** Images side by side: 2 or 3 placeholders in one row, each filled as its file is stored. */
  const insertRow = React.useCallback(
    async (picked: File[]) => {
      const ed = editorRef.current;
      if (!ed || ed.isDestroyed) return;
      const { take, message } = rowPick(picked.length);
      if (message) toastRef.current(message);
      if (!take) return;
      const files = picked.slice(0, take);
      const articleId = latest.current.ensureArticle();
      const items = files.map((file) => ({ file, uploadId: crypto.randomUUID() }));
      setUploads((u) => {
        const next = { ...u };
        for (const i of items) next[i.uploadId] = { name: i.file.name, error: articleId ? null : storageFull(i.file.name), kind: "image" };
        return next;
      });
      insertBlock(ed, { type: "imageRow", content: items.map((i) => ({ type: "image", attrs: { uploadId: i.uploadId } })) }, false);
      if (!articleId) return;
      begin(items.length);
      for (const i of items) await upload(i.uploadId, i.file, articleId);
    },
    [upload, begin],
  );

  /** A video stands in its place while it is stored; a refusal says why there. */
  const insertVideo = React.useCallback(
    async (file: File | undefined, at?: number) => {
      const ed = editorRef.current;
      if (!file || !ed || ed.isDestroyed) return;
      const articleId = latest.current.ensureArticle();
      const uploadId = crypto.randomUUID();
      setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: articleId ? null : storageFull(file.name), kind: "video" } }));
      const node = { type: "video", attrs: { uploadId } };
      if (typeof at === "number") ed.chain().focus().insertContentAt(dropPos(ed.state, at), node).run();
      else insertBlock(ed, node, false);
      if (!articleId) return;
      begin(1);
      await uploadVideo(uploadId, file, articleId);
    },
    [uploadVideo, begin],
  );

  /** Dropped or pasted files: pictures in one go, videos one by one. */
  const insertMedia = React.useCallback(
    async (files: File[], at?: number) => {
      const videos = files.filter((f) => mediaKind(f) === "video");
      const rest = files.filter((f) => mediaKind(f) !== "video");
      if (rest.length) await insertFiles(rest, at);
      for (const v of videos) await insertVideo(v, rest.length ? undefined : at);
    },
    [insertFiles, insertVideo],
  );

  const uploadsApi = React.useMemo<UploadsApi>(
    () => ({
      uploads,
      replace: (uploadId, file) => {
        const kind = uploadsRef.current[uploadId]?.kind ?? "image";
        const articleId = latest.current.ensureArticle();
        setUploads((u) => ({ ...u, [uploadId]: { name: file.name, error: articleId ? null : storageFull(file.name), kind } }));
        if (!articleId) return;
        begin(1);
        if (kind === "video") void uploadVideo(uploadId, file, articleId);
        else void upload(uploadId, file, articleId);
      },
    }),
    [uploads, upload, uploadVideo, begin],
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
        attributes: { class: PROSE, role: "textbox", "aria-multiline": "true", "aria-label": "Blog" },
        // Read when ProseMirror scrolls the caret into view (getters, so a phone's bar and
        // keyboard are counted as they are at that moment).
        scrollMargin: {
          top: 5,
          left: 5,
          right: 5,
          get bottom() {
            return bottomMargin.current;
          },
        },
        scrollThreshold: {
          top: 0,
          left: 0,
          right: 0,
          get bottom() {
            return bottomMargin.current;
          },
        },
        transformPastedHTML: (html) => tableLines(wordLists(pastedHeadings(html))),
        handlePaste: (_view, event) => {
          const data = event.clipboardData;
          const ed = editorRef.current;
          if (!data || !ed) return false;
          const files = Array.from(data.files);
          const text = data.getData("text/plain");
          const html = data.getData("text/html");
          // Word and some apps add a snapshot picture of copied text: the words win.
          if (files.length && !text.trim()) {
            void insertMedia(files);
            return true;
          }
          // Code goes in as one code block, in one step Undo takes back.
          if (!ed.isActive("codeBlock")) {
            const code = pastedCode({ text, html, vscode: data.getData("vscode-editor-data") || null });
            if (code) {
              const body = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
              insertBlock(ed, { type: "codeBlock", attrs: { language: code.language || null }, content: [{ type: "text", text: body }] }, false);
              toastRef.current("Pasted as code", () => editorRef.current?.commands.undo());
              latest.current.onAnnounce("Pasted as a code block");
              return true;
            }
          }
          const line = html ? pasteLossLine(pasteLosses(html), latest.current.touch) : null;
          if (line) window.setTimeout(() => latest.current.onPasteLoss(line), 0);
          return false;
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.length) return false;
          event.preventDefault();
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          void insertMedia(files, at?.pos);
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
          const id = (n.type.name === "image" || n.type.name === "video") && !n.attrs.fileKey ? (n.attrs.uploadId as string | null) : null;
          const up = id ? uploadsRef.current[id] : undefined;
          if (up && up.error === null) names.push(up.name);
          return true;
        });
        return names;
      },
      focusMissingAlt: () => {
        let pos = -1;
        editor.state.doc.descendants((n, p) => {
          if (pos >= 0) return false;
          if (n.type.name === "image" && n.attrs.fileKey && !n.attrs.decorative && !String(n.attrs.alt ?? "").trim()) pos = p;
          return pos < 0;
        });
        if (pos < 0) return;
        editor.chain().focus().setNodeSelection(pos).scrollIntoView().run();
        // The details open once the image is drawn selected; then its Description takes the caret.
        let tries = 0;
        const find = () => {
          const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
          const field = dom?.querySelector<HTMLInputElement>("input[data-alt-field]");
          if (field) {
            field.focus();
            field.scrollIntoView({ block: "center" });
          } else if (tries++ < 10) window.requestAnimationFrame(find);
        };
        window.requestAnimationFrame(find);
      },
      undo: () => {
        editor.commands.undo();
      },
      selection: () => ({ from: editor.state.selection.from, to: editor.state.selection.to }),
      select: (from, to) => {
        const { doc } = editor.state;
        const size = doc.content.size;
        const sel = TextSelection.between(doc.resolve(Math.max(0, Math.min(from, size))), doc.resolve(Math.max(0, Math.min(to, size))));
        editor.view.dispatch(editor.state.tr.setSelection(sel));
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
      escape: () => latest.current.onEscape(),
      announce: (text) => latest.current.onAnnounce(text),
    });
  });

  // What the body is and how to add to it, said by its own attributes (the placeholder isn't
  // a paragraph of the blog).
  React.useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const sync = () => {
      if (props.describedBy) dom.setAttribute("aria-describedby", props.describedBy);
      else dom.removeAttribute("aria-describedby");
      if (props.invalid) dom.setAttribute("aria-invalid", "true");
      else dom.removeAttribute("aria-invalid");
      if (!props.touch && props.editable) dom.setAttribute("aria-keyshortcuts", "/");
      else dom.removeAttribute("aria-keyshortcuts");
      if (editor.isEmpty) dom.setAttribute("aria-placeholder", "Start your story here…");
      else dom.removeAttribute("aria-placeholder");
    };
    sync();
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor, props.describedBy, props.invalid, props.touch, props.editable]);

  // On a phone: the caret stays clear of the format bar and the keyboard, and the last line can
  // scroll up above both.
  const inset = useKeyboardInset();
  const [barHeight, setBarHeight] = React.useState(0);
  React.useEffect(() => {
    // 16 px (spacing-8) between the caret and the bar.
    const gap = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-8")) || 16;
    bottomMargin.current = props.touch && barHeight ? inset + barHeight + gap : 5;
  }, [props.touch, inset, barHeight]);

  const pick = (what: ToolPick) => {
    if (what === "image") fileRef.current?.click();
    else if (what === "row") rowRef.current?.click();
    else if (what === "video") videoRef.current?.click();
    else setProjectOpen(true);
  };
  const onTool = (id: ToolId) => {
    if (!editor) return;
    runTool(editor, id, pick);
    const done = DONE[id];
    if (done) latest.current.onAnnounce(done);
  };

  return (
    <UploadsContext.Provider value={uploadsApi}>
      <div
        className="relative"
        // Data, not a design value: the phone's bar and keyboard, so the last line can rise above them.
        style={props.touch && barHeight ? { paddingBottom: inset + barHeight } : undefined}
        // ⌘K is the link here: the app's search shortcut must not also open.
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") e.nativeEvent.stopImmediatePropagation();
        }}
      >
        <EditorContent editor={editor} />
        {editor && props.editable && !props.touch && (
          <>
            <BlockInserter editor={editor} onTool={onTool} openRef={openMenu} />
            <FormatBubble editor={editor} linkOpen={linkOpen} setLinkOpen={setLinkOpen} onAnnounce={(t) => latest.current.onAnnounce(t)} />
          </>
        )}
        {editor && props.editable && props.touch && (
          <>
            <PhoneBar editor={editor} inset={inset} onHeight={setBarHeight} linkOpen={linkOpen} setLinkOpen={setLinkOpen} onAdd={() => setSheetOpen(true)} />
            <PhoneSheet
              editor={editor}
              open={sheetOpen}
              onClose={() => {
                setSheetOpen(false);
                window.requestAnimationFrame(() => editor.commands.focus());
              }}
              onTool={(id) => {
                // A file picker must open inside the tap itself, or the phone refuses it.
                if (asksFirst(id)) pick(id);
                setSheetOpen(false);
                if (!asksFirst(id))
                  window.requestAnimationFrame(() => {
                    runTool(editor, id, pick);
                    const done = DONE[id];
                    if (done) latest.current.onAnnounce(done);
                  });
              }}
            />
          </>
        )}
        <input
          ref={rowRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void insertRow(files);
          }}
        />
        <input
          ref={videoRef}
          type="file"
          accept={VIDEO_ACCEPT}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void insertVideo(file);
          }}
        />
        {editor && (
          <ProjectPicker
            open={projectOpen}
            onClose={() => {
              setProjectOpen(false);
              window.requestAnimationFrame(() => editor.commands.focus());
            }}
            onPick={(projectId) => {
              setProjectOpen(false);
              insertBlock(editor, { type: "projectCard", attrs: { projectId } }, false);
              latest.current.onAnnounce("Project card added");
            }}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
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

/** The phone's Add sheet, told where the caret is (columns grey what they can't hold). */
function PhoneSheet({ editor, ...props }: { editor: Editor; open: boolean; onClose: () => void; onTool: (id: ToolId) => void }) {
  const at = useCaretAt(editor);
  return <BlockSheet {...props} at={at} />;
}
