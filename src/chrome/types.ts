// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { HEALTH_CHECK_PING, HEALTH_CHECK_PONG } from "./constants";

export type HealthCheckServerId = string & { _brand: "health-check-server-id" };

export type HealthCheckStorageValue = readonly [
  serverId: HealthCheckServerId,
  timestamp: number,
  forClientId: string
];

export type HealthCheckPingMessage = {
  readonly type: typeof HEALTH_CHECK_PING;
  readonly payload: HealthCheckServerId;
};

export type HealthCheckPongMessage = {
  readonly type: typeof HEALTH_CHECK_PONG;
  readonly payload: {
    readonly serverId: HealthCheckServerId;
    readonly forClientId: string;
  };
};
