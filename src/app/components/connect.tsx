import { Mail, Linkedin, Github } from "lucide-react";

export default function Connect() {
  return (
    <section
  id="connect"
  className="min-h-screen flex items-center justify-center scroll-mt-28 px-6 sm:px-10 md:px-14"
>
      <div className="mx-auto w-full max-w-5xl text-center">

        {/* title */}
        <h2 className="text-[54px] text-[var(--green)] font-bold tracking-tight sm:text-[72px]">
          con<span className="align-[0.06em]">·</span>nect
        </h2>

        <p className="mt-2 text-lg text-zinc-800 sm:text-xl">
          Let’s stay in touch.
        </p>

        {/* icons */}
        <div className="mt-12 flex justify-center gap-12">

          <a
            href="mailto:contact@terekj.me"
            className="group flex flex-col items-center gap-3 transition hover:-translate-y-[2px]"
          >
            <div className="flex h-16 w-16 items-center justify-center transition">
              <Mail size={28} />
            </div>
            <span className="text-sm font-medium text-zinc-700">Email</span>
          </a>

          <a
            href="https://linkedin.com/in/terekjohnson"
            target="_blank"
            className="group flex flex-col items-center gap-3 transition hover:-translate-y-[2px]"
          >
            <div className="flex h-16 w-16 items-center justify-center transition">
              <Linkedin size={28} />
            </div>
            <span className="text-sm font-medium text-zinc-700">LinkedIn</span>
          </a>

          <a
            href="https://github.com/terekj"
            target="_blank"
            className="group flex flex-col items-center gap-3 transition hover:-translate-y-[2px]"
          >
            <div className="flex h-16 w-16 items-center justify-center transition">
              <Github size={28} />
            </div>
            <span className="text-sm font-medium text-zinc-700">GitHub</span>
          </a>

        </div>

        <p className="mt-10 font-garamond text-sm italic text-zinc-600">
          <span className="text-[var(--leafgreen)] font-extrabold">© terekj.me</span> *all rights reserved* ;)
        </p>

      </div>
    </section>
  );
}
