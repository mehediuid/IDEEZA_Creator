"use client";

import { use } from "react";
import { AiChat } from "@/components/mobile/ai/chat";

// AI Product Generate (Figma "AI create · 2026 update" 10706:2, Full AI flow 05–18): one chat, idea to saved project.
export default function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  return <AiChat chatId={chatId} />;
}
