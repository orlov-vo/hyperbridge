// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "../base/types";

type HandlerFn<
  Events extends Record<string, readonly unknown[]>,
  Key extends keyof Events
> = <Args extends Events[Key]>(...args: Args) => void;

/**
 * Implementation of event emitter
 * Used to react on updates
 * */
export class EventEmitter<Events extends Record<string, readonly unknown[]>> {
  private events = {} as {
    [Key in keyof Events]: Set<HandlerFn<Events, Key>>;
  };

  public on<Key extends keyof Events>(
    eventName: Key,
    fn: HandlerFn<Events, Key>
  ): UnsubscribeFn {
    this.getEventListByName(eventName).add(fn);

    return () => {
      this.getEventListByName(eventName).delete(fn);
    };
  }

  public once<Key extends keyof Events>(
    eventName: Key,
    fn: HandlerFn<Events, Key>
  ): UnsubscribeFn {
    const unsubscribe = this.on(eventName, onceFn);
    function onceFn<Args extends Events[Key]>(
      this: unknown,
      ...args: Args
    ): void {
      unsubscribe();
      fn.call(this, ...args);
    }

    return unsubscribe;
  }

  public emit<Args extends Events[Key], Key extends keyof Events>(
    eventName: Key,
    ...args: Args
  ): void {
    this.getEventListByName(eventName).forEach((fn) => {
      fn.call(this, ...args);
    });
  }

  private getEventListByName<Key extends keyof Events>(
    eventName: Key
  ): Set<(...args: Events[Key]) => void> {
    const existed: Set<(...args: Events[Key]) => void> | undefined =
      this.events[eventName];
    if (existed) return existed;

    const result = new Set<(...args: Events[Key]) => void>();
    this.events[eventName] = result;
    return result;
  }
}

export type ReadonlyEventEmitter<T extends EventEmitter<any>> = Omit<T, "emit">;
