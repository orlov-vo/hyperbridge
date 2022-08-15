// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { assert } from "../utils/assert";
import { getFromMap } from "../utils/getFromMap";
import { isPromise } from "../utils/isPromise";
import { unboxPromise } from "../utils/unboxPromise";
import { reportError } from "../utils/reportError";
import { noop } from "../utils/noop";
import { MessageType } from "./protocol";
import { isPackedFunction } from "./packFunction";
import type {
  AnyAction,
  AnyFn,
  AnyQuery,
  AnyStore,
  UnsubscribeFn,
  UUID,
} from "./types";
import type { Message, QueryMessage } from "./protocol";
import type { PackedFunction } from "./packFunction";
import type { ClientInfoProvider } from "./ClientInfoProvider";

export type ReadableStore<State> = {
  readonly subscribe: (callback: (value: State) => void) => UnsubscribeFn;
};

type PostMessage<ClientInfo> = (message: Message<ClientInfo>) => void;

type Options<ClientInfo> = {
  readonly clientInfo: ClientInfo | Promise<ClientInfo>;
  readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;
  readonly postMessage: PostMessage<ClientInfo>;
};

type ResponseHandle<ClientInfo> = {
  readonly message: QueryMessage<ClientInfo>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
};

const createSpyForActions = (
  onApply: (
    accessChain: readonly string[],
    argumentList: readonly unknown[]
  ) => unknown,
  accessChain: readonly string[] = []
): ProxyHandler<any> =>
  new Proxy(Object.freeze(noop), {
    get: (_target: unknown, name: string): ProxyHandler<any> =>
      createSpyForActions(onApply, [...accessChain, name]),
    apply: (
      _target: unknown,
      _thisArg: unknown,
      argumentList: readonly unknown[]
    ): void => {
      onApply(accessChain, argumentList);
    },
  });

const createSpyForQueries = (
  onApply: (
    accessChain: readonly string[],
    argumentList: readonly unknown[]
  ) => Promise<unknown>,
  accessChain: readonly string[] = []
): ProxyHandler<any> =>
  new Proxy(Object.freeze(noop), {
    get: (_target: unknown, name: string): ProxyHandler<any> =>
      createSpyForQueries(onApply, [...accessChain, name]),
    apply: (
      _target: unknown,
      _thisArg: unknown,
      argumentList: readonly unknown[]
    ): Promise<unknown> => onApply(accessChain, argumentList),
  });

const createSpyForStores = (
  onGet: (name: string) => ReadableStore<unknown>
): ProxyHandler<any> =>
  new Proxy(Object.freeze(noop), {
    get: (_target: unknown, name: string): ReadableStore<unknown> =>
      onGet(name),
  });

export class HyperBridgeClient<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>,
  ClientInfo
> {
  public actions: Actions = createSpyForActions(
    async (accessChain, argumentList) => {
      const client = isPromise(this.clientInfo)
        ? await this.clientInfo
        : this.clientInfo;
      this.postMessage({
        type: MessageType.CallAction,
        accessChain,
        argumentList: this.serializeArguments(argumentList),
        client,
      });
    }
  ) as Actions;

  public queries: Queries = createSpyForQueries(
    async (accessChain, argumentList) => {
      const client = isPromise(this.clientInfo)
        ? await this.clientInfo
        : this.clientInfo;

      const queryId = crypto.randomUUID();
      const message: QueryMessage<ClientInfo> = {
        type: MessageType.Query,
        queryId,
        accessChain,
        argumentList: this.serializeArguments(argumentList),
        client,
      };
      this.postMessage(message);

      return new Promise((resolve, reject) => {
        this.queryResponseHandles.set(queryId, { message, resolve, reject });
      });
    }
  ) as Queries;

  public stores: Stores = createSpyForStores((name) => ({
    subscribe: (callback): (() => void) => {
      const subscriptions = getFromMap(
        this.storeSubscriptions,
        name,
        new Set()
      );

      if (subscriptions.size === 0) {
        if (isPromise(this.clientInfo)) {
          this.clientInfo
            .then((client) =>
              this.postMessage({
                type: MessageType.SubscribeStart,
                name,
                client,
              })
            )
            .catch(reportError);
        } else {
          this.postMessage({
            type: MessageType.SubscribeStart,
            name,
            client: this.clientInfo,
          });
        }
      }

      callback(this.storeValues.get(name) ?? null);
      subscriptions.add(callback);

      return () => {
        subscriptions.delete(callback);

        if (subscriptions.size === 0) {
          if (isPromise(this.clientInfo)) {
            this.clientInfo
              .then((client) =>
                this.postMessage({
                  type: MessageType.SubscribeEnd,
                  name,
                  client,
                })
              )
              .catch(reportError);
          } else {
            this.postMessage({
              type: MessageType.SubscribeEnd,
              name,
              client: this.clientInfo,
            });
          }
        }
      };
    },
  })) as Stores;

  private clientInfo: ClientInfo | Promise<ClientInfo>;

  private readonly clientInfoProvider: ClientInfoProvider<ClientInfo>;

  private readonly postMessage: PostMessage<ClientInfo>;

  private readonly queryResponseHandles: Map<
    string,
    ResponseHandle<ClientInfo>
  > = new Map();

  private readonly queueForProcess: Set<Message<ClientInfo>> = new Set();

  private readonly storeValues: Map<string, unknown> = new Map();

  private readonly storeSubscriptions: Map<
    string,
    Set<(value: unknown) => void>
  > = new Map();

  private readonly packedFnById: Map<UUID, PackedFunction<AnyFn>> = new Map();

  constructor({
    clientInfo,
    clientInfoProvider,
    postMessage,
  }: Options<ClientInfo>) {
    this.clientInfo = clientInfo;
    this.clientInfoProvider = clientInfoProvider;
    this.postMessage = postMessage;

    // Unbox value from clientInfo promise to not wait micro-tasks
    unboxPromise(this.clientInfo, (resolvedClientInfo) => {
      this.clientInfo = resolvedClientInfo;
      this.queueForProcess.forEach((message) => this.processMessage(message));
      this.queueForProcess.clear();
    });
  }

  public processMessage(message: Message<ClientInfo>): void {
    // If this.clientInfo is not ready to work yet we should store messages in queue and process them later
    if (isPromise(this.clientInfo)) {
      this.queueForProcess.add(message);
      return;
    }

    // Skip all non-related messages
    if (!this.clientInfoProvider.isSameClient(message.client, this.clientInfo))
      return;

    if (message.type === MessageType.SubscribeUpdate) {
      this.storeValues.set(message.name, message.value);
      const subscriptions = this.storeSubscriptions.get(message.name);
      if (!subscriptions) return;
      subscriptions.forEach((fn) => fn(message.value));
    } else if (message.type === MessageType.QueryResolve) {
      const response = this.queryResponseHandles.get(message.queryId);
      if (!response) return;
      this.queryResponseHandles.delete(message.queryId);
      response.resolve(message.value);
    } else if (message.type === MessageType.QueryReject) {
      const response = this.queryResponseHandles.get(message.queryId);
      if (!response) return;
      this.queryResponseHandles.delete(message.queryId);
      response.reject(message.error);
    } else if (message.type === MessageType.CallFn) {
      const proxy = this.packedFnById.get(message.id);
      assert(proxy, `Client tried call unknown proxy with id: "${message.id}"`);
      proxy.fn(
        ...this.deserializeArguments(message.argumentList, message.client)
      );
    }
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
            argumentList: args,
            client,
          });
        };
      }

      return arg;
    });
  }
}
