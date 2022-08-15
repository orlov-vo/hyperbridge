import { isPromise } from "../utils/isPromise";
// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { unboxPromise } from "../utils/unboxPromise";
import { reportError } from "../utils/reportError";
import { HyperBridgeClient } from "../base/HyperBridgeClient";
import { isMessage } from "../base/isMessage";
import type { AnyAction, AnyQuery, AnyStore } from "../base/types";
import type { ClientInfoProvider } from "../base/ClientInfoProvider";

type Options<ClientInfo> = {
  readonly port: chrome.runtime.Port | Promise<chrome.runtime.Port>;
  readonly clientInfo: ClientInfo | Promise<ClientInfo>;
  readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;
};

export class ChromeHyperBridgeClient<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> extends HyperBridgeClient<Actions, Queries, Stores, ClientInfo> {
  constructor({ port, clientInfo, clientInfoProvider }: Options<ClientInfo>) {
    super({
      clientInfo,
      clientInfoProvider,
      postMessage: (message): void => {
        if (isPromise(port)) {
          port
            .then((resolvedPort) => resolvedPort.postMessage(message))
            .catch(reportError);
        } else {
          port.postMessage(message);
        }
      },
    });

    unboxPromise(port, (resolvedPort) => {
      port = resolvedPort;
      resolvedPort.onMessage.addListener((message) => {
        if (!isMessage<ClientInfo>(message)) return;
        this.processMessage(message);
      });
      resolvedPort.onDisconnect.addListener(function onDisconnect(): void {
        resolvedPort.onDisconnect.removeListener(onDisconnect);
        globalThis.location.reload();
      });
    });
  }
}
