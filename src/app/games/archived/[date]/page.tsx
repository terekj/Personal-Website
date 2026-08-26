import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllPuzzles,
  getConfig,
  getPuzzleByDate,
  getPuzzleByDateForPreview,
  isValidPreviewToken,
} from "@/games/archived/puzzles.server";
import ArchivedGame from "@/games/archived/ArchivedGame";

// The "published up to today" gate in puzzles.server.ts reads the
// current date, so this route must be evaluated per-request rather
// than cached at build time — otherwise a puzzle dated today wouldn't
// appear until the next deploy.
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Params = { date: string };
type Search = { preview?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { date } = await params;
  const { preview } = await searchParams;
  if (!DATE_RE.test(date)) return { title: "archived" };
  const puzzle = isValidPreviewToken(preview)
    ? getPuzzleByDateForPreview(date)
    : getPuzzleByDate(date);
  if (!puzzle) return { title: "archived" };
  return {
    title: `archived · ${puzzle.title}`,
    description: `A nested-bracket word puzzle for ${puzzle.date}.`,
  };
}

export default async function ArchivedPuzzlePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { date } = await params;
  const { preview } = await searchParams;
  if (!DATE_RE.test(date)) notFound();

  // A valid ?preview=<PREVIEW_TOKEN> bypasses both the `published` flag
  // and the date gate, for checking a puzzle before it goes live. Anyone
  // without the token gets ordinary public behavior.
  const previewing = isValidPreviewToken(preview);
  const puzzle = previewing ? getPuzzleByDateForPreview(date) : getPuzzleByDate(date);
  if (!puzzle) notFound();

  const archive = getAllPuzzles().map((p) => ({
    id: p.id,
    date: p.date,
    title: p.title,
    difficulty: p.difficulty,
  }));
  const config = getConfig();

  return (
    <ArchivedGame
      key={puzzle.id}
      puzzle={puzzle}
      archive={archive}
      config={config}
      previewing={previewing}
    />
  );
}
