// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { ClientInfoProvider } from "../base/ClientInfoProvider";
import type {
  ExtractActions,
  ExtractClientInfo,
  ExtractQueries,
  ExtractStores,
} from "../base/types";
import { ChromeHyperBridgeClient } from "./ChromeHyperBridgeClient";
import type { ChromeHyperBridgeServer } from "./ChromeHyperBridgeServer";

type Options<ClientInfo> = {
  readonly port: chrome.runtime.Port | Promise<chrome.runtime.Port>;
  readonly clientInfo: ClientInfo | Promise<ClientInfo>;
  readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;
};

export function useChromeHyperBridge<
  T extends ChromeHyperBridgeServer<any, any, any, any>
>(
  options: Options<ExtractClientInfo<T>>
): ChromeHyperBridgeClient<
  ExtractActions<T>,
  ExtractQueries<T>,
  ExtractStores<T>,
  ExtractClientInfo<T>
> {
  return new ChromeHyperBridgeClient(options);
}
