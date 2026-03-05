"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = {
  id: string;
  label: string;
  phonetic: string;
  color: string;
};

export default function Navbar() {
  const items: NavItem[] = useMemo(
    () => [
      { id: "home", label: "home", phonetic: "/hōm/", color: "var(--red)" },
      { id: "resume", label: "ré·su·mé", phonetic: "/ˈrezəˌmā/", color: "var(--blue)" },
      { id: "projects", label: "proj·ects", phonetic: "/ˈpräjek(t)s/", color: "var(--orange)" },
      { id: "connect", label: "con·nect", phonetic: "/kəˈnekt/", color: "var(--green)" },
    ],
    []
  );

  const [active, setActive] = useState("home");
  const [hovered, setHovered] = useState<string | null>(null);

  // ✅ stable dependency
  const idsKey = useMemo(() => items.map((i) => i.id).join("|"), [items]);

  useEffect(() => {
    const ids = idsKey.split("|");

    const observer = new IntersectionObserver(
      (entries) => {
        if (hovered) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (visible?.target?.id && ids.includes(visible.target.id)) {
          setActive(visible.target.id);
        }
      },
      { threshold: [0.3, 0.45, 0.6, 0.75] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [idsKey, hovered]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="fixed top-4 sm:top-6 left-0 right-0 z-50">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <nav className="rounded-full border border-zinc-200 bg-[var(--paper)]/85 backdrop-blur shadow-sm p-2">
          <ul className="grid grid-cols-4">
            {items.map((item) => {
              const isActive = active === item.id;
              const isHover = hovered === item.id;
              const color = item.color;

              const labelColor = isActive || isHover ? color : "var(--foreground)";
              const phoneticColor = isActive || isHover ? color : "#71717a";

              return (
                <li key={item.id} className="flex">
                  <button
                    onClick={() => scrollTo(item.id)}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(item.id)}
                    onBlur={() => setHovered(null)}
                    className={[
                      "w-full rounded-full py-3 flex items-center justify-center transition",
                      "hover:bg-white/70",
                      isActive ? "bg-white shadow-sm" : "",
                    ].join(" ")}
                  >
                    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                      <span
                        className="font-semibold text-sm sm:text-base"
                        style={{ color: labelColor }}
                      >
                        {item.label}
                      </span>

                      <span
                        className="hidden sm:inline text-xs"
                        style={{ color: phoneticColor }}
                      >
                        {item.phonetic}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}