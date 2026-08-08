/** Coordinates AI request generations to prevent duplicates and stale responses. */
export function createAiRequestCoordinator() {
  let generation = 0;
  let inFlight = false;

  return {
    begin(): number | null {
      if (inFlight) return null;
      inFlight = true;
      generation += 1;
      return generation;
    },
    isCurrent(requestGeneration: number): boolean {
      return requestGeneration === generation;
    },
    cancel(): void {
      generation += 1;
      inFlight = false;
    },
    complete(): void {
      inFlight = false;
    },
    get inFlight(): boolean {
      return inFlight;
    },
  };
}

export type AiRequestCoordinator = ReturnType<typeof createAiRequestCoordinator>;
