// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "./types";

export type StoreCreator<T> = (set: (value: T) => void) => UnsubscribeFn;

export function declareStore<T = never>(fn: StoreCreator<T>): StoreCreator<T> {
  return fn;
}
