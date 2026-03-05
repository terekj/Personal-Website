export default function Resume() {
  return (
    <section id="resume" className="section-container flex flex-col items-center">
      <div className="text-center">
        <h2 className="text-[54px] text-[var(--blue)] font-bold tracking-tight sm:text-[72px]">
          ré<span className="align-[0.06em]">·</span>su<span className="align-[0.06em]">·</span>mé
        </h2>
        <p className="mt-2 text-lg text-zinc-800 sm:text-xl">
          A snapshot of my experience.
        </p>
      </div>

      <a
        href="/resume.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-10 block w-full max-w-md sm:max-w-lg"
        aria-label="Open resume in new tab"
      >
        <div className="overflow-hidden rounded-2xl bg-[var(--paper)] shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg">
          <div className="h-[340px] sm:h-[400px] w-full">
            <iframe
              src="/resume.pdf#view=FitH&toolbar=0&navpanes=0&scrollbar=0"
              title="Resume preview"
              className="h-full w-full border-0 outline-none"
              style={{ border: 0 }}
            />
          </div>
        </div>
      </a>

      <a
        href="/resume.pdf"
        download
        title="Download resume"
        aria-label="Download resume"
        className="mt-8 inline-flex items-center gap-4 rounded-2xl bg-[var(--leafgreen)] px-8 py-4 text-white shadow-md transition hover:shadow-lg hover:-translate-y-[1px]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>

        <span className="text-xl font-medium">Download as PDF</span>
      </a>
    </section>
  );
}