import { describe, expect, it } from "vitest";
import {
  applyGuess,
  DUPLICATE_GUESS_MESSAGE,
  initialRoundState,
  revealedDescription,
  skipRound,
  STARTING_LIVES,
} from "./game";
import { chunkDescription, normaliseGuess } from "./text";

const TERM = "software engineer";
const NORMALISED = normaliseGuess(TERM);

function playingState(overrides: Partial<Parameters<typeof applyGuess>[0]> = {}) {
  return {
    ...initialRoundState(6),
    ...overrides,
  };
}

describe("applyGuess", () => {
  it("does not spend a life or record an empty guess", () => {
    const state = playingState();
    const result = applyGuess(state, "   123 !!  ", NORMALISED);
    expect(result.kind).toBe("empty");
    expect(result.state).toBe(state);
    expect(result.state.lives).toBe(STARTING_LIVES);
    expect(result.state.guesses).toEqual([]);
    expect(result.state.revealedCount).toBe(1);
  });

  it("treats a correct multi-word term as a win and reveals every chunk", () => {
    const state = playingState({ revealedCount: 2, totalChunks: 6 });
    const result = applyGuess(state, "  Software   Engineer  ", NORMALISED);
    expect(result.kind).toBe("correct");
    expect(result.state.status).toBe("won");
    expect(result.state.lives).toBe(STARTING_LIVES);
    expect(result.state.revealedCount).toBe(6);
    expect(result.state.guesses).toEqual([NORMALISED]);
    expect(state.guesses).toEqual([]);
  });

  it("on a miss, spends one life and reveals the next chunk", () => {
    const state = playingState();
    const result = applyGuess(state, "database", NORMALISED);
    expect(result.kind).toBe("miss");
    expect(result.state.lives).toBe(5);
    expect(result.state.revealedCount).toBe(2);
    expect(result.state.status).toBe("playing");
    expect(result.state.guesses).toEqual(["database"]);
  });

  it("does not spend a life on a duplicate guess", () => {
    const afterFirst = applyGuess(playingState(), "algorithm", NORMALISED);
    const dup = applyGuess(afterFirst.state, "Algorithm!", NORMALISED);
    expect(dup.kind).toBe("duplicate");
    expect(dup.message).toBe(DUPLICATE_GUESS_MESSAGE);
    expect(dup.state).toBe(afterFirst.state);
    expect(dup.state.lives).toBe(5);
    expect(dup.state.revealedCount).toBe(2);
  });

  it("ends the round when lives reach zero and reveals the full description", () => {
    const state = playingState({
      lives: 1,
      revealedCount: 6,
      totalChunks: 6,
    });
    const result = applyGuess(state, "wrong", NORMALISED);
    expect(result.kind).toBe("lost");
    expect(result.state.lives).toBe(0);
    expect(result.state.status).toBe("lost");
    expect(result.state.revealedCount).toBe(6);
  });

  it("still spends a life on a miss when a one-word description has nothing new to reveal", () => {
    const chunks = chunkDescription("JSON");
    expect(chunks).toEqual(["JSON"]);
    const state = initialRoundState(chunks.length);
    const result = applyGuess(state, "xml", normaliseGuess("JSON"));
    expect(result.kind).toBe("miss");
    expect(result.state.lives).toBe(5);
    expect(result.state.revealedCount).toBe(1);
  });

  it("does not accept a new guess after the round is won", () => {
    const won = applyGuess(playingState(), TERM, NORMALISED);
    const again = applyGuess(won.state, "database", NORMALISED);
    expect(again.kind).toBe("correct");
    expect(again.state).toBe(won.state);
  });

  it("skip reveals every chunk without spending lives", () => {
    const state = playingState({ lives: 4, revealedCount: 2, totalChunks: 6 });
    const skipped = skipRound(state);
    expect(skipped.status).toBe("skipped");
    expect(skipped.lives).toBe(4);
    expect(skipped.revealedCount).toBe(6);
    expect(state.status).toBe("playing");
    const after = applyGuess(skipped, "anything", NORMALISED);
    expect(after.state).toBe(skipped);
  });

  it("joins revealed chunks with spaces", () => {
    expect(revealedDescription(["one.", "Two more."], 1)).toBe("one.");
    expect(revealedDescription(["one.", "Two more."], 2)).toBe("one. Two more.");
  });
});
