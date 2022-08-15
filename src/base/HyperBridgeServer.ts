// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { AnyFn, ClientId, UnsubscribeFn, UUID } from "./types";
import { assert } from "../utils/assert";
import { getFromMap } from "../utils/getFromMap";
import { has } from "../utils/has";
import { isObject } from "../utils/isObject";
import { isPromise } from "../utils/isPromise";
import { unboxPromise } from "../utils/unboxPromise";
import { MessageType } from "./protocol";
import { isPackedFunction } from "./packFunction";
import type { Message } from "./protocol";
import type { PackedFunction } from "./packFunction";
import type {
  AnyAction,
  AnyQuery,
  AnyStore,
  HyperBridgeApiDeclaration,
} from "./types";
import type { ClientInfoProvider } from "./ClientInfoProvider";

const get = (value: unknown, path: readonly string[]): unknown =>
  path.reduce((acc, name) => {
    assert(isObject(acc) && has(acc, name));
    return acc[name];
  }, value);

type PostMessage<ClientInfo> = (message: Message<ClientInfo>) => void;

type Options<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> = {
  readonly api:
    | HyperBridgeApiDeclaration<Actions, Queries, Stores>
    | Promise<HyperBridgeApiDeclaration<Actions, Queries, Stores>>;
  readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;
  readonly postMessage: PostMessage<ClientInfo>;
};

export class HyperBridgeServer<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> {
  private api:
    | HyperBridgeApiDeclaration<Actions, Queries, Stores>
    | Promise<HyperBridgeApiDeclaration<Actions, Queries, Stores>>;

  protected readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;

  private readonly postMessage: PostMessage<ClientInfo>;

  private readonly storeSubscriptions: Map<
    ClientId,
    Map<string, UnsubscribeFn>
  > = new Map();

  private readonly storeValues: Map<ClientId, Map<string, unknown>> = new Map();

  private readonly queueForProcess: Set<Message<ClientInfo>> = new Set();

  private readonly packedFnById: Map<UUID, PackedFunction<AnyFn>> = new Map();

  constructor({
    api,
    clientInfoProvider,
    postMessage,
  }: Options<Actions, Queries, Stores, ClientInfo>) {
    this.api = api;
    this.clientInfoProvider = clientInfoProvider;
    this.postMessage = postMessage;

    unboxPromise(this.api, (resolvedApi) => {
      this.api = resolvedApi;
      this.queueForProcess.forEach((message) => this.processMessage(message));
      this.queueForProcess.clear();
    });
  }

  public processMessage(message: Message<ClientInfo>): void {
    // If API is not ready to work yet we should store messages in queue and process them later
    if (isPromise(this.api)) {
      this.queueForProcess.add(message);
      return;
    }

    this.clientInfoProvider.internal__setClientInfo(message.client);

    if (message.type === MessageType.CallAction) {
      const action = get(this.api.actions, message.accessChain) as AnyAction;
      action(
        ...this.deserializeArguments(message.argumentList, message.client)
      );
    } else if (message.type === MessageType.Query) {
      const query = get(this.api.queries, message.accessChain) as AnyQuery;

      Promise.resolve(
        query(
          ...this.deserializeArguments(message.argumentList, message.client)
        )
      ).then(
        (value: unknown) => {
          this.postMessage({
            type: MessageType.QueryResolve,
            queryId: message.queryId,
            value,
            client: message.client,
          });
        },
        (error: unknown) => {
          this.postMessage({
            type: MessageType.QueryReject,
            queryId: message.queryId,
            error,
            client: message.client,
          });
        }
      );
    } else if (message.type === MessageType.SubscribeStart) {
      const storeName = message.name;
      const store = this.api.stores[storeName];
      const clientId = this.clientInfoProvider.getClientId(message.client);
      assert(
        store,
        `Client tried to subscribe non-existed store "${storeName}"`
      );

      const subscriptions = getFromMap(
        this.storeSubscriptions,
        clientId,
        new Map()
      );
      const storeValues = getFromMap(this.storeValues, clientId, new Map());
      assert(
        !subscriptions.has(storeName),
        `Client ${clientId} already subscribed to store "${storeName}"`
      );

      const set = (value: unknown): void => {
        const nextValue: unknown =
          typeof value === "function"
            ? value(storeValues.get(storeName))
            : value;

        this.postMessage({
          type: MessageType.SubscribeUpdate,
          name: storeName,
          value: nextValue,
          client: message.client,
        });
      };
      const unsubscribe =
        typeof store === "function" ? store(set) : store.subscribe(set);

      subscriptions.set(storeName, unsubscribe);
    } else if (message.type === MessageType.SubscribeEnd) {
      const storeName = message.name;
      const clientId = this.clientInfoProvider.getClientId(message.client);
      const subscriptions = getFromMap<ClientId, Map<string, UnsubscribeFn>>(
        this.storeSubscriptions,
        clientId,
        new Map()
      );
      const storeValues = getFromMap(this.storeValues, clientId, new Map());

      const unsubscribe = subscriptions.get(storeName);
      assert(
        unsubscribe,
        `Client already unsubscribed from store "${storeName}"`
      );

      unsubscribe();
      subscriptions.delete(storeName);
      storeValues.delete(storeName);
    } else if (message.type === MessageType.CallFn) {
      const proxy = this.packedFnById.get(message.id);
      assert(proxy, `Client tried call unknown proxy with id: "${message.id}"`);

      proxy.fn(
        ...this.deserializeArguments(message.argumentList, message.client)
      );
    }

    this.clientInfoProvider.internal__setClientInfo(null);
  }

  public clearByClientId(clientId: ClientId): void {
    const subscriptions = getFromMap<ClientId, Map<string, UnsubscribeFn>>(
      this.storeSubscriptions,
      clientId,
      new Map()
    );
    const storeValues = getFromMap(this.storeValues, clientId, new Map());

    subscriptions.forEach((unsubscribe) => unsubscribe());
    subscriptions.clear();
    storeValues.clear();
  }

  private serializeArguments(
    argumentList: readonly unknown[]
  ): readonly unknown[] {
    return argumentList.map((arg) => {
      if (isPackedFunction(arg)) {
        this.packedFnById.set(arg.id, arg);
        arg.claim(() => this.packedFnById.delete(arg.id));
        return { type: "proxy", id: arg.id };
      }

      return arg;
    });
  }

  private deserializeArguments(
    argumentList: readonly unknown[],
    client: ClientInfo
  ): readonly unknown[] {
    return argumentList.map((arg) => {
      if (isPackedFunction(arg)) {
        return (...args: readonly unknown[]): void => {
          this.postMessage({
            type: MessageType.CallFn,
            id: arg.id,
            argumentList: this.serializeArguments(args),
            client,
          });
        };
      }

      return arg;
    });
  }
}
