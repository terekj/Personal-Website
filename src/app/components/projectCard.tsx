export type Project = {
  title: string;
  subtitle: string;
  desc: string;
  tags: string[];
  links?: { label: string; href: string }[];
};

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="rounded-[28px] border border-zinc-200 bg-white/55 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur transition hover:-translate-y-[1px] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-zinc-900">{project.title}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-700">{project.subtitle}</p>
        </div>
        <div className="hidden h-10 w-10 rounded-2xl border border-zinc-200 bg-white sm:block" />
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-800">{project.desc}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800"
          >
            {t}
          </span>
        ))}
      </div>

      {project.links?.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {project.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="rounded-2xl border border-zinc-900 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:-translate-y-[1px] hover:bg-zinc-50"
            >
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}