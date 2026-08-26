import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPuzzles, getConfig, getPuzzleByDate } from "@/games/archived/puzzles.server";
import ArchivedGame from "@/games/archived/ArchivedGame";

// The "published up to today" gate in puzzles.server.ts reads the
// current date, so this route must be evaluated per-request rather
// than cached at build time — otherwise a puzzle dated today wouldn't
// appear until the next deploy.
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Params = { date: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { date } = await params;
  const puzzle = DATE_RE.test(date) ? getPuzzleByDate(date) : undefined;
  if (!puzzle) return { title: "archived" };
  return {
    title: `archived · ${puzzle.title}`,
    description: `A nested-bracket word puzzle for ${puzzle.date}.`,
  };
}

export default async function ArchivedPuzzlePage({ params }: { params: Promise<Params> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const puzzle = getPuzzleByDate(date);
  if (!puzzle) notFound();

  const archive = getAllPuzzles().map((p) => ({
    id: p.id,
    date: p.date,
    title: p.title,
    difficulty: p.difficulty,
  }));
  const config = getConfig();

  return <ArchivedGame key={puzzle.id} puzzle={puzzle} archive={archive} config={config} />;
}
