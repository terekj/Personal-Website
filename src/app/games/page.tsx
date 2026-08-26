import { redirect } from "next/navigation";

// Only one game exists today. Once there's a second, turn this into a
// real hub page listing both instead of redirecting past it.
export default function GamesIndexPage() {
  redirect("/games/archived");
}
