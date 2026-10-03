"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TERM_LENGTH,
  validateNewTerm,
} from "@/lib/term";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; word: string };

export function SubmitForm() {
  const [word, setWord] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) {
      return;
    }

    const parsed = validateNewTerm({ word, description });
    if (!parsed.ok) {
      setStatus({ kind: "error", message: parsed.error });
      return;
    }

    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: parsed.word, description: parsed.description }),
      });

      if (res.status === 201) {
        const created = (await res.json()) as { word: string };
        setWord("");
        setDescription("");
        setStatus({ kind: "success", word: created.word });
        return;
      }

      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setStatus({
        kind: "error",
        message: body?.error ?? "Could not save the term. Try again.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  function clearStatus() {
    if (status.kind !== "idle") {
      setStatus({ kind: "idle" });
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Submit Word</h1>
      <p className="mt-2 text-zinc-600">
        Add a term and its description to this device&rsquo;s library.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label
            htmlFor="term"
            className="block text-sm font-medium text-zinc-700"
          >
            Term
          </label>
          <input
            id="term"
            name="term"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_TERM_LENGTH + 20}
            value={word}
            onChange={(event) => {
              setWord(event.target.value);
              clearStatus();
            }}
            aria-describedby="term-hint"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <p id="term-hint" className="mt-1 text-xs text-zinc-500">
            Letters and spaces only, up to {MAX_TERM_LENGTH} characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              clearStatus();
            }}
            aria-describedby="description-hint"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <p id="description-hint" className="mt-1 text-xs text-zinc-500">
            {description.length}/{MAX_DESCRIPTION_LENGTH}. Several sentences
            work best: the quiz reveals them a piece at a time.
          </p>
        </div>

        <div aria-live="polite" className="min-h-6">
          {status.kind === "error" ? (
            <p role="alert" className="text-sm text-red-700">
              {status.message}
            </p>
          ) : null}
          {status.kind === "success" ? (
            <p role="status" className="text-sm text-green-800">
              Added &ldquo;{status.word}&rdquo;. It&rsquo;s ready to play and
              in{" "}
              <Link href="/records" className="underline">
                Records
              </Link>
              .
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Submit"}
        </button>
      </form>
    </section>
  );
}
