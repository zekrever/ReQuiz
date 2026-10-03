"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  applyGuess,
  initialRoundState,
  NEW_ROUND_EVENT,
  revealedDescription,
  skipRound,
  STARTING_LIVES,
  type RoundState,
} from "@/lib/game";
import { chunkDescription, normaliseGuess } from "@/lib/text";
import { playSfx } from "@/lib/sound";

type Term = { id: string; word: string; description: string };

type LoadKind = "idle" | "loading" | "empty" | "error" | "ready";

export function Game() {
  const [load, setLoad] = useState<LoadKind>("loading");
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [round, setRound] = useState<RoundState | null>(null);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const lastFinishedId = useRef<string | undefined>(undefined);
  const currentId = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const startRound = useCallback(async (excludeId?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoad("loading");
    setError(null);
    setMessage(null);
    setGuess("");
    setTerm(null);
    setRound(null);

    try {
      const query = excludeId
        ? `?excludeId=${encodeURIComponent(excludeId)}`
        : "";
      const res = await fetch(`/api/terms/random${query}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.status === 404) {
        setLoad("empty");
        currentId.current = undefined;
        return;
      }

      if (!res.ok) {
        throw new Error("Could not load a term.");
      }

      const next = (await res.json()) as Term;
      const nextChunks = chunkDescription(next.description);
      currentId.current = next.id;
      setTerm(next);
      setChunks(nextChunks);
      setRound(initialRoundState(nextChunks.length));
      setLoad("ready");
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }
      setLoad("error");
      setError(cause instanceof Error ? cause.message : "Could not load a term.");
    }
  }, []);

  useEffect(() => {
    void startRound(lastFinishedId.current);
    return () => abortRef.current?.abort();
  }, [startRound]);

  useEffect(() => {
    function onNewRound() {
      const exclude = currentId.current ?? lastFinishedId.current;
      void startRound(exclude);
    }
    window.addEventListener(NEW_ROUND_EVENT, onNewRound);
    return () => window.removeEventListener(NEW_ROUND_EVENT, onNewRound);
  }, [startRound]);

  function finishAndLoadNext() {
    lastFinishedId.current = currentId.current;
    void startRound(lastFinishedId.current);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!term || !round || round.status !== "playing") {
      return;
    }

    const result = applyGuess(round, guess, normaliseGuess(term.word));
    if (result.kind === "miss" || result.kind === "correct" ||
      result.kind === "lost" || result.kind === "duplicate") {
      playSfx(result.kind);
      if (result.kind === "miss" || result.kind === "lost") {
  // Restart the animation if the previous shake hasn't finished.
  setShaking(false);
  requestAnimationFrame(() => setShaking(true));
}
    }

    setRound(result.state);
    setMessage(result.message ?? null);

    if (result.kind === "empty" || result.kind === "duplicate") {
      return;
    }

    setGuess("");
    if (result.state.status !== "playing") {
      lastFinishedId.current = term.id;
    }
  }

  function onSkip() {
    if (!round || round.status !== "playing") {
      return;
    }
    setRound(skipRound(round));
    setMessage(null);
    setGuess("");
    if (term) {
      lastFinishedId.current = term.id;
    }
  }

  if (load === "empty") {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Play</h1>
        <p className="mt-4 text-zinc-600">
          This library has no terms. Add one to start a round.
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

  if (load === "error") {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Play</h1>
        <p className="mt-4 text-red-700" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={() => void startRound(lastFinishedId.current)}
        >
          Try again
        </button>
      </section>
    );
  }

  if (load === "loading" || !term || !round) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Play</h1>
        <p className="mt-4 text-zinc-600">Loading a round…</p>
      </section>
    );
  }

  const over = round.status !== "playing";
  const shown = over
    ? revealedDescription(chunks, chunks.length)
    : revealedDescription(chunks, round.revealedCount);

  return (
    <section
      className={shaking ? "shake" : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          setShaking(false);
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Play</h1>
        <Lives count={round.lives} />
      </div>

      <div
        className="mt-4 min-h-32 rounded-lg border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-800"
        aria-live="polite"
      >
        {shown || "…"}
      </div>

      {over ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-zinc-600">
            {round.status === "won"
              ? "Correct."
              : round.status === "skipped"
                ? "Skipped."
                : "Out of lives."}
          </p>
          <p className="text-2xl font-semibold tracking-tight">{term.word}</p>
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={finishAndLoadNext}
          >
            Next
          </button>
        </div>
      ) : (
        <form className="mt-10 space-y-3" onSubmit={onSubmit}>
          {message ? (
            <p className="text-sm text-amber-800" role="status">
              {message}
            </p>
          ) : null}
          <label className="block text-sm font-medium text-zinc-700" htmlFor="guess">
            Your guess
          </label>
          <input
            id="guess"
            name="guess"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Guess
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Lives({ count }: { count: number }) {
  return (
    <p className="text-lg tracking-wide" aria-label={`Lives: ${count}`}>
      {Array.from({ length: STARTING_LIVES }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={index < count ? "text-red-600" : "text-zinc-300"}
        >
          ♥
        </span>
      ))}
    </p>
  );
}
