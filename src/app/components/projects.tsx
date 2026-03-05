type Repo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
};

const USERNAME = "terekj";
const PINNED: string[] = [
  "Wedding-Website",
  "Terracotta",
  "ML-Feature-Analysis",
  "sospizza.org",
];

async function getRepos(): Promise<Repo[]> {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`,
    { next: { revalidate: 60 * 60 } }
  );

  if (!res.ok) return [];
  return res.json();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default async function Projects() {
  const repos = await getRepos();

  const pinned = PINNED.map((name) => repos.find((r) => r.name === name)).filter(
    (r): r is Repo => Boolean(r)
  );

  // Fallback if GitHub rate-limits or repo names mismatch
  const list: Repo[] =
    pinned.length > 0
      ? pinned
      : PINNED.map((name, i) => ({
          id: i,
          name,
          html_url: `https://github.com/${USERNAME}/${name}`,
          description: null,
          language: null,
          stargazers_count: 0,
          forks_count: 0,
          pushed_at: new Date().toISOString(),
        }));

  return (
    <section
      id="projects"
      className="section-container min-h-screen flex flex-col justify-center items-center scroll-mt-28 px-6 sm:px-10 md:px-14"
    >
      <div className="text-center">
        <h2 className="text-[54px] text-[var(--orange)] font-bold tracking-tight sm:text-[72px]">
          pro<span className="align-[0.06em]">·</span>jects
        </h2>
        <p className="mt-3 text-lg text-zinc-800 sm:text-xl">
          An overview of my work
        </p>
      </div>

      <div className="mt-16 grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2">
        {list.map((repo) => (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl bg-[var(--paper)] p-7 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold text-zinc-900">
                {repo.name}
              </h3>
              <span className="text-zinc-500 transition group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                ↗
              </span>
            </div>

            <p className="mt-3 text-zinc-700">
              {repo.description ?? "View on GitHub."}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
              {repo.language && (
                <span className="rounded-full bg-black/5 px-3 py-1">
                  {repo.language}
                </span>
              )}
              <span className="rounded-full bg-black/5 px-3 py-1">
                ★ {repo.stargazers_count}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1">
                ⑂ {repo.forks_count}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1">
                Updated {fmtDate(repo.pushed_at)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}