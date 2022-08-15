// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type {
  ExtractActions,
  ExtractQueries,
  ExtractStores,
} from "../base/types";
import { WorkerHyperBridgeClient } from "./WorkerHyperBridgeClient";
import type { WorkerHyperBridgeServer } from "./WorkerHyperBridgeServer";

type Options = {
  readonly worker: Worker;
};

export function useWorkerHyperBridge<
  T extends WorkerHyperBridgeServer<any, any, any>
>(
  options: Options
): WorkerHyperBridgeClient<
  ExtractActions<T>,
  ExtractQueries<T>,
  ExtractStores<T>
> {
  return new WorkerHyperBridgeClient(options);
}
