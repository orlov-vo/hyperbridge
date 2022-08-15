// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { HyperBridgeServer } from "../base/HyperBridgeServer";
import { isMessage } from "../base/isMessage";
import type {
  AnyAction,
  AnyQuery,
  AnyStore,
  HyperBridgeApiDeclaration,
} from "../base/types";
import { type ClientInfo, clientInfoProvider } from "./constants";

type Options<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>
> = {
  readonly api:
    | HyperBridgeApiDeclaration<Actions, Queries, Stores>
    | Promise<HyperBridgeApiDeclaration<Actions, Queries, Stores>>;
};

export class WorkerHyperBridgeServer<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>
> extends HyperBridgeServer<Actions, Queries, Stores, ClientInfo> {
  constructor(options: Options<Actions, Queries, Stores>) {
    super({
      ...options,
      clientInfoProvider,
      postMessage: (message): void => {
        globalThis.postMessage(message);
      },
    });

    globalThis.addEventListener("message", (event) => {
      if (!isMessage<ClientInfo>(event.data)) return;
      this.processMessage(event.data);
    });
  }
}
