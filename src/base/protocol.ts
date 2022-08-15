// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UUID } from "./types";

export enum MessageType {
  CallAction = "CALL_ACTION",
  Query = "QUERY",
  QueryResolve = "QUERY_RESOLVE",
  QueryReject = "QUERY_REJECT",
  SubscribeStart = "SUBSCRIBE_START",
  SubscribeUpdate = "SUBSCRIBE_UPDATE",
  SubscribeEnd = "SUBSCRIBE_END",
  CallFn = "CALL_FN",
}

export type CallActionMessage<TClient> = {
  readonly type: MessageType.CallAction;
  readonly accessChain: readonly string[];
  readonly argumentList: readonly unknown[];
  readonly client: TClient;
};

export type QueryMessage<TClient> = {
  readonly type: MessageType.Query;
  readonly queryId: string;
  readonly accessChain: readonly string[];
  readonly argumentList: readonly unknown[];
  readonly client: TClient;
};

export type QueryResolveMessage<TClient> = {
  readonly type: MessageType.QueryResolve;
  readonly queryId: string;
  readonly value: unknown;
  readonly client: TClient;
};

export type QueryRejectMessage<TClient> = {
  readonly type: MessageType.QueryReject;
  readonly queryId: string;
  readonly error: unknown;
  readonly client: TClient;
};

export type SubscribeStartMessage<TClient> = {
  readonly type: MessageType.SubscribeStart;
  readonly name: string;
  readonly client: TClient;
};

export type SubscribeUpdateMessage<TClient> = {
  readonly type: MessageType.SubscribeUpdate;
  readonly name: string;
  readonly value: unknown;
  readonly client: TClient;
};

export type SubscribeEndMessage<TClient> = {
  readonly type: MessageType.SubscribeEnd;
  readonly name: string;
  readonly client: TClient;
};

export type CallFnMessage<TClient> = {
  readonly type: MessageType.CallFn;
  readonly id: UUID;
  readonly argumentList: readonly unknown[];
  readonly client: TClient;
};

export type Message<TClient> =
  | CallActionMessage<TClient>
  | QueryMessage<TClient>
  | QueryResolveMessage<TClient>
  | QueryRejectMessage<TClient>
  | SubscribeStartMessage<TClient>
  | SubscribeUpdateMessage<TClient>
  | SubscribeEndMessage<TClient>
  | CallFnMessage<TClient>;
