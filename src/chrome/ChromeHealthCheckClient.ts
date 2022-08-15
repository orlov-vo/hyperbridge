// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "../base/types";
import { EventEmitter } from "../utils/EventEmitter";
import { has } from "../utils/has";
import { isObject } from "../utils/isObject";
import {
  HEALTH_CHECK_PING,
  HEALTH_CHECK_PONG,
  HEALTH_CHECK_STORAGE_KEY,
} from "./constants";
import { sendChromeMessage } from "./sendChromeMessage";
import { subscribeChromeEvent } from "./subscribeChromeEvent";
import type {
  HealthCheckServerId,
  HealthCheckPongMessage,
  HealthCheckStorageValue,
} from "./types";

type BrowserApi = {
  readonly runtime: Pick<
    typeof chrome.runtime,
    "sendMessage" | "onMessage" | "lastError"
  >;
  readonly storage: Pick<typeof chrome.storage, "onChanged">;
};

enum Event {
  UPDATE_BACKGROUND_ID = "update-background-id",
}

type Events = {
  [Event.UPDATE_BACKGROUND_ID]: [serverId: HealthCheckServerId];
};

const checkPongMessage = (value: unknown): value is HealthCheckPongMessage =>
  isObject(value) && has(value, "type") && value.type === HEALTH_CHECK_PONG;

export class ChromeHealthCheckClient {
  private readonly subscriptions: Set<UnsubscribeFn> = new Set();

  private emitter = new EventEmitter<Events>();

  constructor(
    private readonly browser: BrowserApi,
    private readonly clientId: string
  ) {
    this.init();
  }

  public init(): void {
    this.subscriptions.add(
      subscribeChromeEvent(
        this.browser.storage.onChanged,
        this.handleStorageChange.bind(this)
      )
    );
    this.subscriptions.add(
      subscribeChromeEvent(
        this.browser.runtime.onMessage,
        this.handleMessage.bind(this)
      )
    );
  }

  public dispose(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  public ping(): void {
    try {
      sendChromeMessage({ type: HEALTH_CHECK_PING, payload: this.clientId });
    } catch (error) {
      reportError(error);
    }
  }

  public onServerIdUpdated(
    handler: (serverId: HealthCheckServerId) => void
  ): UnsubscribeFn {
    return this.emitter.on(Event.UPDATE_BACKGROUND_ID, handler);
  }

  public onServerIdUpdatedOnce(
    handler: (serverId: HealthCheckServerId) => void
  ): UnsubscribeFn {
    return this.emitter.once(Event.UPDATE_BACKGROUND_ID, handler);
  }

  private handleMessage(msg: unknown): void {
    if (!checkPongMessage(msg)) return;

    const { serverId, forClientId } = msg.payload;
    if (forClientId && forClientId !== this.clientId) return;

    this.updateServerId(serverId);
  }

  private handleStorageChange(
    changes: Record<string, chrome.storage.StorageChange>,
    area: "sync" | "local" | "managed" | "session"
  ): void {
    if (area !== "local") return;

    const change = changes[HEALTH_CHECK_STORAGE_KEY];
    if (!change) return;

    const [serverId, , forClientId] =
      change.newValue as HealthCheckStorageValue;
    if (forClientId && forClientId !== this.clientId) return;

    this.updateServerId(serverId);
  }

  private updateServerId(serverId: HealthCheckServerId): void {
    this.emitter.emit(Event.UPDATE_BACKGROUND_ID, serverId);
  }
}
