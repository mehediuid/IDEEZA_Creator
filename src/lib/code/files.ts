// Code Development's file model (moved from components/code/dev-editor.tsx,
// which imports it back) and a built product's firmware as that model
// (P2-BUILDLOAD-4).
//
// Pure, relative imports only (node:test).

import { firmwareFor, type ArtifactSource } from "../create/build-artifacts";
import { mcuOf } from "../spec/format";

export type FileEntry = { name: string; language: string; content: string };

/** The sample Code Development opens on when a document has no files. */
export const DEFAULT_FILES: FileEntry[] = [
  {
    name: "bot.py",
    language: "python",
    content: `from discord.ext import commands

bot = commands.Bot(">")


@bot.command("ping")
async def ping(ctx: commands.Context):
    await ctx.send("pong")


bot.run("TOKEN")
`,
  },
  {
    name: ".env",
    language: "ini",
    content: `# Discord bot env
TOKEN=your_token_here
PREFIX=>
`,
  },
  {
    name: "README.md",
    language: "markdown",
    content: `# Discord Bot

Sample project — a tiny ping/pong command.
`,
  },
];

const LANG_BY_EXT: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "html", htm: "html", css: "css", scss: "scss", json: "json",
  md: "markdown", env: "ini", ini: "ini", yaml: "yaml", yml: "yaml",
  java: "java", c: "c", cpp: "cpp", h: "c", rs: "rust", go: "go",
  sh: "shell", txt: "plaintext",
  // An Arduino sketch is C++ — the build's firmware is one.
  ino: "cpp",
};

/** The editor language for a file, by its extension; unknown → plaintext. */
export function langForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return LANG_BY_EXT[ext || ""] || "plaintext";
}

/** The build's sketch as Code Development's one file, or null for a product
 *  with no microcontroller — nothing on it runs firmware (the review's own
 *  rule, deliverable-previews.tsx `coversFor`). */
export function firmwareFilesOf(src: ArtifactSource): FileEntry[] | null {
  if (!mcuOf(src.parts)) return null;
  const fw = firmwareFor(src);
  return [{ name: fw.filename, language: langForFile(fw.filename), content: fw.lines.join("\n") + "\n" }];
}

/** How many pins the sketch defines — one `#define …_PIN` per unit it drives. */
export function firmwarePinsOf(files: FileEntry[]): number {
  return files.reduce((n, f) => n + f.content.split("\n").filter((l) => /^#define \S+_PIN \d+$/.test(l)).length, 0);
}
