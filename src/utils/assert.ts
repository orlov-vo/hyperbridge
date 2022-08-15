// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

/**
 * Error for data that is required but not present
 * @see assert
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

/**
 * Verifying invariants
 * @param value - The input that is checked for being truthy
 * @param message - Message of error if assertion will be failed
 */
export function assert(
  value: unknown,
  message = "Assertion failed"
): asserts value {
  if (value) return;
  throw new AssertionError(message);
}
