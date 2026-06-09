declare module 'pokersolver' {
  export interface SolverCard {
    readonly value: string;
    readonly suit: string;
    readonly rank: number;
    readonly wildValue: string;
    toString(): string;
  }

  export interface SolverHand {
    readonly name: string;
    readonly descr: string;
    readonly rank: number;
    readonly cards: SolverCard[];
    readonly cardPool: SolverCard[];
    qualifiesHigh(): boolean;
  }

  export const Hand: {
    solve(cards: readonly string[], game?: string, canDisqualify?: boolean): SolverHand;
  };

  const pokersolver: {
    readonly Hand: typeof Hand;
  };

  export default pokersolver;
}
