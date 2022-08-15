// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { AnyFn, UnsubscribeFn, UUID } from "./types";
import { isObject } from "../utils/isObject";
import { has } from "../utils/has";

export type PackedFunction<T extends AnyFn> = {
  readonly type: "packed-fn";
  readonly id: UUID;
  readonly fn: T;
  readonly dispose: UnsubscribeFn;
  readonly claim: (unsubscribe: UnsubscribeFn) => void;
  readonly unclaim: (unsubscribe: UnsubscribeFn) => void;
};

/**
 * Wrap function to internal structure for passing through hyper bridge
 *
 * LIMITATIONS:
 * - The result of call is not transferred back
 *
 * @param fn - Function for proxy through hyper bridge
 * @returns Object that contains packed function
 */
export function packFunction<T extends AnyFn>(
  fn: T
): PackedFunction<(...args: Parameters<T>) => void> {
  const subscribes = new Set<UnsubscribeFn>();

  return {
    type: "packed-fn",
    id: crypto.randomUUID() as UUID,
    fn,
    dispose: (): void => {
      subscribes.forEach((unsubscribe) => unsubscribe());
      subscribes.clear();
    },
    claim: (unsubscribe): void => {
      subscribes.add(unsubscribe);
    },
    unclaim: (unsubscribe): void => {
      subscribes.delete(unsubscribe);
    },
  };
}

export function isPackedFunction<T extends AnyFn>(
  value: unknown
): value is PackedFunction<T> {
  return isObject(value) && has(value, "type") && value.type === "proxy";
}
