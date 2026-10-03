import { normaliseGuess } from "./text";

export const NEW_ROUND_EVENT = "requiz:new-round";

export type RoundStatus = "playing" | "won" | "lost" | "skipped";

export type RoundState = {
  lives: number;
  /** Already-tried guesses, each passed through `normaliseGuess`. */
  guesses: string[];
  revealedCount: number;
  totalChunks: number;
  status: RoundStatus;
};

export type GuessKind = "empty" | "duplicate" | "correct" | "miss" | "lost";

export type ApplyGuessResult = {
  kind: GuessKind;
  state: RoundState;
  message?: string;
};

export const DUPLICATE_GUESS_MESSAGE = "You already tried that word!";
export const EMPTY_GUESS_MESSAGE = "Enter a guess.";
export const STARTING_LIVES = 6;

export function initialRoundState(totalChunks: number): RoundState {
  return {
    lives: STARTING_LIVES,
    guesses: [],
    revealedCount: Math.min(1, Math.max(0, totalChunks)),
    totalChunks,
    status: "playing",
  };
}

/**
 * Apply one guess to a round. Does not mutate `state`.
 * Empty and duplicate guesses do not spend a life or change the reveal.
 */
export function applyGuess(
  state: RoundState,
  rawGuess: string,
  normalisedTerm: string,
): ApplyGuessResult {
  if (state.status !== "playing") {
    return {
      kind: state.status === "won" ? "correct" : "lost",
      state,
    };
  }

  const guess = normaliseGuess(rawGuess);
  if (!guess) {
    return { kind: "empty", state, message: EMPTY_GUESS_MESSAGE };
  }

  if (state.guesses.includes(guess)) {
    return {
      kind: "duplicate",
      state,
      message: DUPLICATE_GUESS_MESSAGE,
    };
  }

  const guesses = [...state.guesses, guess];

  if (guess === normalisedTerm) {
    return {
      kind: "correct",
      state: {
        ...state,
        guesses,
        revealedCount: state.totalChunks,
        status: "won",
      },
    };
  }

  const lives = state.lives - 1;
  if (lives <= 0) {
    return {
      kind: "lost",
      state: {
        ...state,
        lives: 0,
        guesses,
        revealedCount: state.totalChunks,
        status: "lost",
      },
    };
  }

  return {
    kind: "miss",
    state: {
      ...state,
      lives,
      guesses,
      revealedCount: Math.min(state.totalChunks, state.revealedCount + 1),
    },
  };
}

/** Reveal the term and full description without spending remaining lives. */
export function skipRound(state: RoundState): RoundState {
  if (state.status !== "playing") {
    return state;
  }
  return {
    ...state,
    revealedCount: state.totalChunks,
    status: "skipped",
  };
}

export function revealedDescription(
  chunks: string[],
  revealedCount: number,
): string {
  return chunks.slice(0, Math.max(0, revealedCount)).join(" ");
}
