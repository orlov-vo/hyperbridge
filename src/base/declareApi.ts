// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type {
  AnyAction,
  AnyQuery,
  AnyStore,
  HyperBridgeApiDeclaration,
} from "./types";

export function declareApi<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>
>(declaration: {
  readonly actions: Actions;
  readonly queries: Queries;
  readonly stores: Stores;
}): HyperBridgeApiDeclaration<Actions, Queries, Stores> {
  return declaration;
}
