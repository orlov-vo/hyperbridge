// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

/**
 * Abortion error
 */
export class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbortError";
  }
}

/**
 * Check value is AbortError or not
 * @see AbortError
 */
export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError;
}
