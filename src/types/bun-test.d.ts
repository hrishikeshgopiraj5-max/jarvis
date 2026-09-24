/**
 * Minimal ambient declaration for `bun:test`.
 * Tests run under `bun test`; this only satisfies `tsc --noEmit`.
 */
declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeGreaterThan(expected: number | bigint): void;
    toBeGreaterThanOrEqual(expected: number | bigint): void;
    toBeLessThan(expected: number | bigint): void;
    toBeLessThanOrEqual(expected: number | bigint): void;
    toContain(expected: unknown): void;
    toMatch(expected: RegExp | string): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toHaveLength(n: number): void;
    toThrow(expected?: string | RegExp): void;
    resolves: ReturnType<typeof expect>;
    rejects: ReturnType<typeof expect>;
    not: ReturnType<typeof expect>;
  };
  export function beforeAll(fn: () => void): void;
  export function afterAll(fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
}
