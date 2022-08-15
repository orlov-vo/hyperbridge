// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { AnyAction, DeclareActions } from "./types";

export function declareActions<T extends Record<string, AnyAction>>(
  actions: T
): DeclareActions<T> {
  return actions as unknown as DeclareActions<T>;
}
