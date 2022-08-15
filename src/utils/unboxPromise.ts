// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { isPromise } from "./isPromise";
import { reportError } from "./reportError";

/**
 * Calls onUnbox function on resolving promise
 */
export function unboxPromise<T>(
  currentValue: Promise<T> | T,
  onUnbox: (nextValue: T) => void
): void {
  if (!isPromise(currentValue)) return;
  currentValue.then(onUnbox).catch(reportError);
}
