// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { HyperBridgeClient } from "../base/HyperBridgeClient";
import { isMessage } from "../base/isMessage";
import type { AnyAction, AnyQuery, AnyStore } from "../base/types";
import {
  type ClientInfo,
  WORKER_CLIENT_INFO,
  clientInfoProvider,
} from "./constants";

type Options = {
  readonly worker: Worker;
};

export class WorkerHyperBridgeClient<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>
> extends HyperBridgeClient<Actions, Queries, Stores, ClientInfo> {
  constructor({ worker }: Options) {
    super({
      clientInfo: WORKER_CLIENT_INFO,
      clientInfoProvider,
      postMessage: (message): void => {
        worker.postMessage(message);
      },
    });

    worker.addEventListener("message", (event) => {
      if (!isMessage<ClientInfo>(event.data)) return;
      this.processMessage(event.data);
    });
  }
}
