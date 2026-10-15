// The demo conversations a first visit finds (owner, 2026-10-13: there is no
// real messaging data, so the Inbox starts with a few demo chats). Three are
// about Innovations posts, which every browser has: two you started (the newer
// one answered and unread; your last line reads the other) and a creator's
// first message waiting in Requests.
// With a project in this browser, Mira also asks about your listing. Seeded
// once: a browser that already holds any of them gets nothing more. Pure.

import { createDirect, send } from "./rules";
import { feedPersonId } from "./people";
import { ME, type ContextRef, type Folder, type MessagesData, type PersonId, type Subject } from "./types";

export const DEMO_PREFIX = "cnv_demo_";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type DemoPost = { slug: string; title: string; creator: { id: string; name: string } };

export type DemoSeedInput = {
  now: number;
  posts: readonly DemoPost[];
  /** The project Mira asks about, or null when this browser has none. */
  project: { id: string; name: string } | null;
  makerName: string;
  buyerName: (id: PersonId) => string;
};

type Line = { from: "me" | "them"; ago: number; text: string };

type DemoChat = {
  key: string;
  subject: Subject;
  them: { id: PersonId; name: string };
  context: ContextRef;
  /** Where the first message lands for its reader. */
  folder: Folder;
  lines: Line[];
};

function postChats(posts: readonly DemoPost[]): DemoChat[] {
  const bySlug = (slug: string) => posts.find((p) => p.slug === slug) ?? null;
  const chat = (key: string, slug: string, rest: Omit<DemoChat, "key" | "subject" | "them" | "context">): DemoChat[] => {
    const post = bySlug(slug);
    if (!post) return [];
    return [
      {
        key,
        subject: { kind: "post", slug: post.slug, title: post.title },
        them: { id: feedPersonId(post.creator.id), name: post.creator.name },
        context: { kind: "post" },
        ...rest,
      },
    ];
  };
  return [
    ...chat("sora", "ar-caption-glasses", {
      folder: "inbox",
      lines: [
        { from: "me", ago: 2 * DAY, text: "Hi! Loved the caption glasses. Which mics pick up speech in a noisy room?" },
        {
          from: "them",
          ago: 2 * DAY - 40 * MIN,
          text: "Thanks! Two MEMS mics with beamforming on an ESP32-S3, and the noise filter runs on the chip. Happy to share the board files if you want to try it.",
        },
        { from: "me", ago: DAY + 3 * HOUR, text: "Yes please, that would help a lot with my next build." },
      ],
    }),
    ...chat("diego", "desk-occupancy-tracker", {
      folder: "inbox",
      lines: [
        { from: "me", ago: DAY, text: "How long does the battery last with the radar on all day?" },
        {
          from: "them",
          ago: 3 * HOUR,
          text: "About 14 months on two AA cells. The radar wakes every 30 seconds and the board sleeps in between.",
        },
      ],
    }),
    ...chat("naim", "hexapod-walking-robot", {
      folder: "requests",
      lines: [
        {
          from: "them",
          ago: 5 * HOUR,
          text: "Hi! I'm looking for two makers to test the hexapod's new walking firmware before I release it. Would you like a kit?",
        },
      ],
    }),
  ];
}

function projectChats(project: DemoSeedInput["project"], buyerName: DemoSeedInput["buyerName"]): DemoChat[] {
  if (!project) return [];
  const id: PersonId = "buyer-mira";
  return [
    {
      key: "mira",
      subject: { kind: "project", projectId: project.id, name: project.name },
      them: { id, name: buyerName(id) },
      context: { kind: "listing" },
      folder: "inbox",
      lines: [{ from: "them", ago: HOUR, text: `Hi! Does ${project.name} work without Wi-Fi, or does it need the app every time?` }],
    },
  ];
}

/** The data with the demo conversations added, or null when this browser already has them. */
export function seedDemoMessages(data: MessagesData, input: DemoSeedInput): MessagesData | null {
  if (data.conversations.some((c) => c.id.startsWith(DEMO_PREFIX))) return null;
  const chats = [...postChats(input.posts), ...projectChats(input.project, input.buyerName)];
  if (!chats.length) return null;
  let next = data;
  for (const chat of chats) {
    const id = `${DEMO_PREFIX}${chat.key}`;
    const first = chat.lines[0];
    const opener = first.from === "me" ? { id: ME, name: input.makerName } : chat.them;
    const reader = first.from === "me" ? chat.them : { id: ME, name: input.makerName };
    const made = createDirect(next, {
      id,
      subject: chat.subject,
      from: opener,
      to: reader,
      folder: chat.folder,
      now: input.now - first.ago,
    });
    if (made.conversation.id !== id) continue;
    next = made.data;
    chat.lines.forEach((line, i) => {
      const sent = send(next, {
        conversationId: id,
        from: line.from === "me" ? ME : chat.them.id,
        draft: { text: line.text, files: [], cards: [] },
        context: i === 0 ? chat.context : null,
        now: input.now - line.ago,
        id: `msg_demo_${chat.key}_${i + 1}`,
        contextId: `ctx_demo_${chat.key}`,
      });
      if (sent.ok) next = sent.value.data;
    });
  }
  return next === data ? null : next;
}
