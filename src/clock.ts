/** A source of the current time in epoch milliseconds. Injectable for determinism. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
