// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { ClientInfoProvider } from "../base/ClientInfoProvider";

export const WORKER_CLIENT_INFO = "worker" as const;
export type ClientInfo = typeof WORKER_CLIENT_INFO;

export const clientInfoProvider = new ClientInfoProvider<ClientInfo>(
  (clientInfo) => clientInfo
);
