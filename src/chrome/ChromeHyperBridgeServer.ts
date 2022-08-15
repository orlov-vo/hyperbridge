// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { HyperBridgeServer } from "../base/HyperBridgeServer";
import { isMessage } from "../base/isMessage";
import type { ClientId } from "../base/types";
import type { Message } from "../base/protocol";
import type {
  AnyAction,
  AnyQuery,
  AnyStore,
  HyperBridgeApiDeclaration,
} from "../base/types";
import type { ClientInfoProvider } from "../base/ClientInfoProvider";
import { subscribeChromeEvent } from "./subscribeChromeEvent";

type Options<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> = {
  readonly id: string;
  readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;
  readonly api:
    | HyperBridgeApiDeclaration<Actions, Queries, Stores>
    | Promise<HyperBridgeApiDeclaration<Actions, Queries, Stores>>;
  readonly onConnect?: (port: chrome.runtime.Port) => void;
  readonly onDisconnect?: (port: chrome.runtime.Port) => void;
};

export class ChromeHyperBridgeServer<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> extends HyperBridgeServer<Actions, Queries, Stores, ClientInfo> {
  public id: string;

  private ports: Map<chrome.runtime.Port, ClientId | null> = new Map();

  private onConnect?: (port: chrome.runtime.Port) => void;
  private onDisconnect?: (port: chrome.runtime.Port) => void;

  constructor(options: Options<Actions, Queries, Stores, ClientInfo>) {
    super({
      ...options,
      postMessage: (message) => this.handlePostMessage(message),
    });
    this.id = options.id;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;

    subscribeChromeEvent(
      chrome.runtime.onConnect,
      this.handleConnect.bind(this)
    );

    globalThis.addEventListener("unload", () => this.closeAllPorts(), {
      once: true,
    });
  }

  private handleConnect(port: chrome.runtime.Port): void {
    if (!port.name.startsWith(this.id)) return;

    this.onConnect?.(port);
    this.ports.set(port, null);

    const subscriptions = new Set([
      subscribeChromeEvent(port.onMessage, (message) => {
        if (!isMessage<ClientInfo>(message)) return;
        const clientId = this.clientInfoProvider.getClientId(message.client);
        const lastClientId = this.ports.get(port);
        if (
          lastClientId !== null &&
          lastClientId !== undefined &&
          clientId !== lastClientId
        ) {
          reportError(new Error("Impossible case with changing client ID"));
          this.clearByClientId(lastClientId);
        }
        this.ports.set(port, clientId);

        this.processMessage(message);
      }),
      subscribeChromeEvent(port.onDisconnect, () => {
        this.onDisconnect?.(port);
        this.removePort(port);
        unsubscribeAll();
      }),
    ]);

    const unsubscribeAll = () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    };
  }

  private handlePostMessage(message: Message<ClientInfo>): void {
    Array.from(this.ports.entries()).forEach(([port, clientId]) => {
      try {
        port.postMessage(message);
      } catch (error) {
        const receiverName = clientId || port.name;
        reportError(
          new Error(
            `Problem with sending message to ${receiverName}: ${String(error)}`
          )
        );
        if (!(error instanceof Error)) return;

        // It is impossible because it should be handled in onDisconnect
        // but if it occurs we should remove disconnected port
        if (
          !error.message.includes(
            "Attempting to use a disconnected port object"
          )
        )
          return;
        this.removePort(port);
      }
    });
  }

  private removePort(port: chrome.runtime.Port): void {
    const lastClientId = this.ports.get(port);
    this.ports.delete(port);
    if (lastClientId) this.clearByClientId(lastClientId);
  }

  private closeAllPorts(): void {
    Array.from(this.ports.keys()).forEach((port) => port.disconnect());
  }
}
