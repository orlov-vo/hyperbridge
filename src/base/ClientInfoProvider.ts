// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { assert } from "../utils/assert";
import type { ClientId } from "./types";

export class ClientInfoProvider<T> {
  private currentClientInfo: T | null = null;

  constructor(private readonly transformFn: (clientInfo: T) => string) {}

  public getClientInfo(): T {
    assert(
      this.currentClientInfo,
      "You should call `getClientInfo()` method synchronously in gateway api"
    );
    return this.currentClientInfo;
  }

  public getClientId(clientInfo: T): ClientId {
    return this.transformFn(clientInfo) as ClientId;
  }

  public isSameClient(a: T, b: T): boolean {
    return this.transformFn(a) === this.transformFn(b);
  }

  public internal__setClientInfo(clientInfo: T | null): void {
    this.currentClientInfo = clientInfo;
  }
}
