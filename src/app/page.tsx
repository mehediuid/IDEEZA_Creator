import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const SWATCHES = [
  { name: "violet-500", varName: "--color-violet-500" },
  { name: "violet-600", varName: "--color-violet-600" },
  { name: "blue-500", varName: "--color-blue-500" },
  { name: "green-500", varName: "--color-green-500" },
  { name: "yellow-500", varName: "--color-yellow-500" },
  { name: "red-500", varName: "--color-red-500" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-bg-brand text-button-primary-text">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">IDEEZA</p>
            <h1 className="text-lg font-semibold">Creator Panel</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">v0.1</Badge>
          <ThemeToggle />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Project scaffold ready</CardTitle>
          <CardDescription>
            Next.js + Tailwind + shadcn/ui wired to the IDEEZA design tokens.
            Switch the theme using the toggle above — tokens swap automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Danger</Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">
          Token swatches
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className="overflow-hidden rounded-md border border-border bg-bg-surface"
            >
              <div
                className="h-16 w-full"
                style={{ background: `var(${s.varName})` }}
              />
              <div className="px-2 py-1.5 text-xs">
                <p className="font-medium">{s.name}</p>
                <p className="text-text-tertiary">{s.varName}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-xs text-text-tertiary">
        Add your feature list and I will build it out.
      </footer>
    </main>
  );
}
