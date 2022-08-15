// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "../base/types";
import { has } from "../utils/has";
import { isObject } from "../utils/isObject";
import { callChrome } from "./callChrome";
import {
  HEALTH_CHECK_PING,
  HEALTH_CHECK_PONG,
  HEALTH_CHECK_STORAGE_KEY,
} from "./constants";
import { sendChromeMessage } from "./sendChromeMessage";
import { subscribeChromeEvent } from "./subscribeChromeEvent";
import type { HealthCheckServerId, HealthCheckPingMessage } from "./types";

const checkPingMessage = (value: unknown): value is HealthCheckPingMessage =>
  isObject(value) && has(value, "type") && value.type === HEALTH_CHECK_PING;

type BrowserApi = {
  readonly runtime: Pick<
    typeof chrome.runtime,
    "sendMessage" | "onMessage" | "lastError"
  >;
  readonly storage: {
    readonly local: Pick<typeof chrome.storage.local, "set">;
  };
};

export class ChromeHealthCheckServer {
  private readonly id = Date.now().toString() as HealthCheckServerId;

  private readonly subscriptions: Set<UnsubscribeFn> = new Set();

  constructor(private readonly browser: BrowserApi) {
    this.init();
  }

  public init(): void {
    this.subscriptions.add(() =>
      subscribeChromeEvent(
        this.browser.runtime.onMessage,
        this.onMessage.bind(this)
      )
    );

    this.sendPongToAll();
    this.setValueToStorage();
  }

  public dispose(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  private sendPongToAll(): void {
    sendChromeMessage({ type: HEALTH_CHECK_PONG, payload: { bgId: this.id } });
  }

  private setValueToStorage(): void {
    callChrome<void>((resolve) =>
      this.browser.storage.local.set(
        { [HEALTH_CHECK_STORAGE_KEY]: [this.id, Date.now()] },
        resolve
      )
    ).catch(reportError);
  }

  private onMessage(msg: unknown): void {
    if (!checkPingMessage(msg)) return;

    sendChromeMessage({
      type: HEALTH_CHECK_PONG,
      payload: { bgId: this.id, forPageName: msg.payload },
    });
  }
}
