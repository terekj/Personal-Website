import { redirect } from "next/navigation";
import { getLatestPuzzle } from "@/games/archived/puzzles.server";

// Puzzle publication depends on today's date (see puzzles.server.ts),
// so this redirect target must be computed per-request.
export const dynamic = "force-dynamic";

export default function ArchivedIndexPage() {
  const latest = getLatestPuzzle();
  if (!latest) {
    // No published puzzles yet — nothing to redirect to.
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "56px 26px" }}>
        <p>No puzzles are published yet. Check back soon.</p>
      </main>
    );
  }
  redirect(`/games/archived/${latest.date}`);
}
