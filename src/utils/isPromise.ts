// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

/**
 * Checks whether the subject is promise
 * @returns Subject is Promise
 */
export function isPromise<R = unknown>(
  subject: unknown
): subject is Promise<R> {
  // @ts-expect-error access to "then" field in unknown subject
  return Boolean(subject) && typeof subject.then === "function";
}
