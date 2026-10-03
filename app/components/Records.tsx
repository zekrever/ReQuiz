"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Term = { id: string; word: string; description: string };

type LoadKind = "loading" | "error" | "ready";

export function Records() {
  const [load, setLoad] = useState<LoadKind>("loading");
  const [terms, setTerms] = useState<Term[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

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

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {terms.map((term) => {
          const isFlipped = flipped.has(term.id);
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
                <span
                  className={`flip-card ${isFlipped ? "is-flipped" : ""}`}
                >
                  <span
                    className="flip-face flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-4"
                    aria-hidden={isFlipped}
                  >
                    <span className="break-words text-center text-2xl font-semibold tracking-tight">
                      {term.word}
                    </span>
                  </span>
                  <span
                    className="flip-face flip-back overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-sm leading-relaxed text-zinc-800"
                    aria-hidden={!isFlipped}
                  >
                    {term.description}
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
