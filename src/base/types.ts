// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { StoreCreator } from "./declareStore";
import type { HyperBridgeClient } from "./HyperBridgeClient";
import type { HyperBridgeServer } from "./HyperBridgeServer";
import type { PackedFunction } from "./packFunction";

export type UnsubscribeFn = () => void;
export type AnyFn = (...args: any[]) => any;

export type UUID = string & { readonly _brand: "uuid" };
export type ClientId = string & { readonly _brand: "client-id" };

export type ReadableStore<State> = {
  readonly subscribe: (callback: (value: State) => void) => UnsubscribeFn;
};

export type AnyAction = (...args: readonly any[]) => void;
export type AnyQuery = (...args: readonly any[]) => Promise<any> | any;
export type AnyStore<T = any> = StoreCreator<T> | ReadableStore<T>;

export type HyperBridgeApiDeclaration<
  Actions extends Record<string, AnyAction>,
  Queries extends Record<string, AnyQuery>,
  Stores extends Record<string, AnyStore>
> = {
  readonly actions: Actions;
  readonly queries: Queries;
  readonly stores: Stores;
};

type SimplifyFunction<T> = T extends (...args: infer A) => infer R
  ? R extends void
    ? T
    : (...args: A) => void
  : never;

type PromisifyFunction<Fn extends AnyFn> = (
  ...args: Parameters<Fn>
) => Promise<ReturnType<Fn>>;

type PackParameter<T> = T extends AnyFn ? PackedFunction<T> : T;

type PackParameters<A extends readonly [...any]> = A extends readonly [
  infer Head,
  ...infer Rest
]
  ? readonly [PackParameter<Head>, ...PackParameters<Rest>]
  : A;

type PackFunction<T> = T extends AnyFn
  ? (...args: PackParameters<Parameters<T>>) => ReturnType<T>
  : never;

type ConvertActions<T> = {
  readonly [Key in keyof T]: SimplifyFunction<
    Key extends `${string}Handler` ? PackFunction<T[Key]> : T[Key]
  >;
};

type ConvertQueries<T> = {
  readonly [Key in keyof T]: T[Key] extends AnyFn
    ? PackFunction<
        ReturnType<T[Key]> extends Promise<any>
          ? T[Key]
          : PromisifyFunction<T[Key]>
      >
    : never;
};

type ConvertStores<T> = {
  readonly [Key in keyof T]: T[Key] extends AnyStore<infer R>
    ? ReadableStore<R | null>
    : never;
};

export type ExtractActions<T> = T extends HyperBridgeServer<
  infer R,
  any,
  any,
  any
>
  ? ConvertActions<R>
  : never;
export type ExtractQueries<T> = T extends HyperBridgeServer<
  any,
  infer R,
  any,
  any
>
  ? ConvertQueries<R>
  : never;
export type ExtractStores<T> = T extends HyperBridgeServer<
  any,
  any,
  infer R,
  any
>
  ? ConvertStores<R>
  : never;
export type ExtractClientInfo<T> = T extends HyperBridgeServer<
  any,
  any,
  any,
  infer R
>
  ? R
  : never;

export type HyperBridgeClientFromServer<
  T extends HyperBridgeServer<any, any, any, any>
> = HyperBridgeClient<
  ExtractActions<T>,
  ExtractQueries<T>,
  ExtractStores<T>,
  ExtractClientInfo<T>
>;

export type DeclareActions<T extends Record<string, AnyAction>> = {
  readonly [Key in keyof T]: T[Key] extends AnyFn
    ? SimplifyFunction<T[Key]>
    : never;
};
