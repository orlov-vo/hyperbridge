// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { AbortError } from "./AbortError";

export class AbortablePromise<T> implements Promise<T> {
  public [Symbol.toStringTag] = "AbortablePromise";

  private readonly resultPromise: Promise<T>;

  private internalAbort: ((reason?: Error) => void) | null = null;

  constructor(
    fn: (promise: Promise<never>) => Promise<T>,
    private readonly abortFn?: () => void
  ) {
    const abortPromise = new Promise<never>((_resolve, reject) => {
      this.internalAbort = reject;
    });

    this.resultPromise = Promise.race([fn(abortPromise), abortPromise]);
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): AbortablePromise<TResult1 | TResult2> {
    return new AbortablePromise(
      () => this.resultPromise.then(onfulfilled, onrejected),
      this.abort.bind(this)
    );
  }

  public catch<TResult = never>(
    onrejected:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): Promise<T | TResult> {
    return new AbortablePromise(
      () => this.resultPromise.catch(onrejected),
      this.abort.bind(this)
    );
  }

  public finally(onfinally: (() => void) | undefined | null): Promise<T> {
    return new AbortablePromise(
      () => this.resultPromise.finally(onfinally),
      this.abort.bind(this)
    );
  }

  public abort(): void {
    if (this.internalAbort === null) return;

    this.internalAbort(new AbortError("The promise is aborted"));
    this.internalAbort = null;

    if (typeof this.abortFn !== "function") return;
    this.abortFn();
  }
}

/**
 * Check value is abortable promise or not
 */
export function isAbortablePromise<T>(
  promise: unknown
): promise is AbortablePromise<T> {
  return promise instanceof AbortablePromise;
}
