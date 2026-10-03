"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Term = { id: string; word: string; description: string };

type LoadKind = "loading" | "error" | "ready";

type CardTheme = "gold" | "classic";

const cardStyles = {
  gold: {
    front:
      "border-[#d4af37]/40 bg-black bg-[linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url('/card-bg.png')] bg-cover bg-center",
    back: "border-[#d4af37]/40 bg-black bg-[linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),url('/card-bg.png')] bg-cover bg-center",
    word: "gold-shine",
    description: "gold-shine",
  },
  classic: {
    front: "border-zinc-200 bg-white",
    back: "border-zinc-200 bg-zinc-100",
    word: "text-zinc-900",
    description: "text-zinc-800",
  },
} as const;

const themes = ["gold", "classic"] as const;
const fade = "transition-opacity duration-500 motion-reduce:transition-none";
const show = (on: boolean) => (on ? "opacity-100" : "opacity-0");

export function Records() {
  const [load, setLoad] = useState<LoadKind>("loading");
  const [terms, setTerms] = useState<Term[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<CardTheme>("gold");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/terms", { cache: "no-store", signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error("load failed");
        }
        return res.json() as Promise<Term[]>;
      })
      .then((data) => {
        setTerms(data);
        setLoad("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoad("error");
        }
      });
    return () => controller.abort();
  }, [attempt]);

  function toggle(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function remove(term: Term) {
    if (!window.confirm(`Delete "${term.word}"? This can't be undone.`)) {
      return;
    }
    setNotice(null);
    try {
      const res = await fetch(`/api/terms/${term.id}`, { method: "DELETE" });
      // 404 means it is already gone; drop it from the list either way.
      if (res.status !== 204 && res.status !== 404) {
        throw new Error("delete failed");
      }
      setTerms((prev) => prev.filter((t) => t.id !== term.id));
    } catch {
      setNotice(`Could not delete "${term.word}". Try again.`);
    }
  }

  if (load === "loading") {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
        <p className="mt-4 text-zinc-600">Loading your library…</p>
      </section>
    );
  }

  if (load === "error") {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
        <p role="alert" className="mt-4 text-red-700">
          Could not load your library.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoad("loading");
            setAttempt((n) => n + 1);
          }}
          className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
      </section>
    );
  }

  if (terms.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
        <p className="mt-4 text-zinc-600">
          This library has no terms yet.
        </p>
        <p className="mt-4">
          <Link
            href="/submit"
            className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Submit Word
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
      <p className="mt-2 text-zinc-600">
        {terms.length} {terms.length === 1 ? "term" : "terms"}. Click a card
        (or press Enter) to flip it.
      </p>
      {notice ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      <div
        role="group"
        aria-label="Card style"
        className="mt-4 inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-xs font-medium"
      >
        {(["gold", "classic"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={theme === option}
            onClick={() => setTheme(option)}
            className={`rounded px-3 py-1.5 ${
              theme === option
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {option === "gold" ? "Black & gold" : "Classic"}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {terms.map((term) => {
          const isFlipped = flipped.has(term.id);
          const styles = cardStyles[theme];
          return (
            <li key={term.id} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => toggle(term.id)}
                aria-pressed={isFlipped}
                aria-label={
                  isFlipped
                    ? `${term.word}: description. Press to show term.`
                    : `${term.word}. Press to show description.`
                }
                className="flip-scene h-48 w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <span className={`flip-card ${isFlipped ? "is-flipped" : ""}`}>
  {/* FRONT */}
                <span className="flip-face" aria-hidden={isFlipped}>
                  <span
                    className={`absolute inset-0 rounded-lg border ${cardStyles.classic.front}`}
                  />
                  <span
                    className={`absolute inset-0 rounded-lg border ${fade} ${cardStyles.gold.front} ${show(theme === "gold")}`}
                  />
                  <span className="relative flex h-full items-center justify-center p-4">
                    <span className="grid text-center">
                      {themes.map((t) => (
                        <span
                          key={t}
                          className={`col-start-1 row-start-1 break-words text-2xl font-semibold tracking-tight ${fade} ${cardStyles[t].word} ${show(theme === t)}`}
                        >
                          {term.word}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>

                {/* BACK */}
                <span className="flip-face flip-back" aria-hidden={!isFlipped}>
                  <span
                    className={`absolute inset-0 rounded-lg border ${cardStyles.classic.back}`}
                  />
                  <span
                    className={`absolute inset-0 rounded-lg border ${fade} ${cardStyles.gold.back} ${show(theme === "gold")}`}
                  />
                  <span className="relative block h-full overflow-y-auto p-4 text-sm leading-relaxed">
                    <span className="grid">
                      {themes.map((t) => (
                        <span
                          key={t}
                          className={`col-start-1 row-start-1 ${fade} ${cardStyles[t].description} ${show(theme === t)}`}
                        >
                          {term.description}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
              </button>
              <button
                type="button"
                onClick={() => void remove(term)}
                aria-label={`Delete ${term.word}`}
                className="self-end rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
