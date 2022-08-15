// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { AbortablePromise } from "../utils/AbortablePromise";
import { ChromeHealthCheckClient } from "./ChromeHealthCheckClient";

type BrowserApi = {
  readonly runtime: Pick<
    typeof chrome.runtime,
    "connect" | "sendMessage" | "onMessage" | "lastError"
  >;
  readonly storage: Pick<typeof chrome.storage, "onChanged">;
};

type Options = {
  readonly id: string;
};

export function connectToBackgroundPort(
  browser: BrowserApi,
  { id }: Options
): AbortablePromise<chrome.runtime.Port> {
  const clientId = `${id}_${crypto.randomUUID()}`;
  const client = new ChromeHealthCheckClient(browser, clientId);
  const resultPromise = new Promise(client.onServerIdUpdatedOnce);
  const dispose = () => client.dispose();

  client.ping();

  return new AbortablePromise(async () => {
    try {
      await resultPromise;
      return browser.runtime.connect({ name: clientId });
    } finally {
      dispose();
    }
  }, dispose);
}
