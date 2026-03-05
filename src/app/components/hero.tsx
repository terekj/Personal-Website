"use client";

import { useEffect, useState } from "react";

export default function Hero() {
  const [hideArrow, setHideArrow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 12) setHideArrow(true);
      else setHideArrow(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollNext = () => {
    const next =
      document.getElementById("resume") ||
      document.getElementById("projects") ||
      document.getElementById("connect");

    if (!next) return;

    next.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen scroll-mt-28 px-6 pt-28 sm:px-10 md:px-14"
    >
      {/* center content */}
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-3xl text-center">
          <h1 className="text-[44px] font-extrabold tracking-tight text-zinc-900 sm:text-[64px] md:text-[72px]">
            Terek Johnson
          </h1>

          <div className="mt-2 text-[var(--yellow)] text-[18px] font-semibold sm:text-[22px] md:text-[26px]">
            /ˈtɛr.ɪk ˈdʒɑn.sən/
          </div>

          <div className="mt-10 mx-auto max-w-2xl rounded-[28px] border border-zinc-200 bg-white/55 p-7 text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur sm:p-8">
            <div className="text-sm font-semibold tracking-wide text-zinc-700">
              proper noun
            </div>

            <ol className="mt-3 space-y-2 text-[15px] leading-7 text-zinc-800 sm:text-[16px]">
              <li>
                <span className="mr-2 font-semibold">1.</span>
                Computer Science, B.S. student at University of California, Riverside
              </li>
              <li>
                <span className="mr-2 font-semibold">2.</span>
                based in Los Angeles County
              </li>
              <li>
                <span className="mr-2 font-semibold">3.</span>
                blending creativity with software to create experiences that genuinely resonate with people
              </li>
            </ol>

            <div className="mt-8 text-sm font-garamond italic text-zinc-700">
              similar: chef, creative, movie enthusiast, music lover
            </div>
          </div>
        </div>
      </div>

      {/* subtle scroll indicator */}
      <button
        onClick={scrollNext}
        aria-label="Scroll down"
        className={[
          "absolute bottom-8 left-1/2 -translate-x-1/2",
          "transition",
          hideArrow ? "opacity-0 pointer-events-none" : "opacity-80",
          "animate-bounce",
        ].join(" ")}
      >
        <span className="text-zinc-400 text-xl">↓</span>
      </button>
    </section>
  );
}