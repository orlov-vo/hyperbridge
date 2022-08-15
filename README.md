# HyperBridge

A library for smooth communication between different javascript contexts

[API References](#api-references)

- **Fast**. It has many performance optimization to track changes only from needed instances.
- **Typed.** The library provide full coverage typings via TypeScript.
- **Small.** We try to minimize distributed size and use tiny dependencies.

[![Version](https://img.shields.io/npm/v/hyperbridge)](https://www.npmjs.com/package/hyperbridge)
[![Size on bundlephobia](https://img.shields.io/bundlephobia/minzip/hyperbridge)](https://bundlephobia.com/result?p=hyperbridge)
[![Openned issues](https://img.shields.io/github/issues-raw/orlov-vo/hyperbridge)](https://github.com/orlov-vo/hyperbridge/issues)
[![License MIT](https://img.shields.io/npm/l/hyperbridge)](https://github.com/orlov-vo/hyperbridge/blob/master/LICENSE.md)

## 🚀 Quick Start <a name="quick-start"></a>

### 1. Install the library from NPM

Execute this command in your project to install the library as new dependency:

```sh
npm install --save hyperbridge
```

Or if you using yarn:

```sh
yarn add hyperbridge
```

### 2. Define your API.

```ts
import { declareApi } from "hyperbridge";

export const api = declareApi({
  actions: {
    test1: () => console.log("test1"),
    test2: () => Promise.resolve().then(() => console.log("test2")),
  },
  queries: {
    load1: () => ({ value: "sync" }),
    load2: () => Promise.resolve().then(() => ({ value: "async" })),
  },
  stores: {
    timer: declareStore((set) => {
      let value = 0;
      const callUpdater = () => set(value);
      setInterval(callUpdater, 1000);
    }),
  },
});
```

### 3. Create client info provider

**Not required** for [Worker](#worker).

```ts
import { ClientInfoProvider } from "hyperbridge";

export type ClientInfo =
  | {
      readonly type: "my-client-one";
      readonly foo: "additional-value";
    }
  | { readonly type: "my-client-two" };

export const clientInfoProvider = new ClientInfoProvider<ClientInfo>((info) => {
  if (info.type === "my-client-one") {
    return `one_${info.value}`;
  }
  if (info.type === "my-client-two") {
    return `two`;
  }

  throw new Error(`Unknown client info: ${JSON.stringify(info)}`);
});
```

### 4. Create server

Use here [WorkerHyperBridgeServer](#worker-server) or [ChromeHyperBridgeServer](#chrome-server)
instead of abstract `HyperBridgeServer`

```ts
import { HyperBridgeServer } from "hyperbridge";
import { api } from "./api";
import { clientInfoProvider } from "./clientInfoProvider";

const server = new HyperBridgeServer({ api, clientInfoProvider, ... });
```

### 5. Use it on client-side

Use here [WorkerHyperBridgeClient](#worker-client) or [ChromeHyperBridgeClient](#chrome-client)
instead of abstract `HyperBridgeClient`

```ts
import { HyperBridgeClient } from "hyperbridge";
import { clientInfoProvider } from "./clientInfoProvider";

const client = new HyperBridgeClient({
  clientInfo: { type: "my-client-two" },
  clientInfoProvider,
  ...
});

// Actions are return nothing
client.actions.test1();
client.actions.test2();

// Queries always returns promise with response from server
client.queries.load1().then(console.log);
client.queries.load2().then(console.log);

// Stores have `null` state by default after creating.
// After receiving every update from server it will notify all subscribers
client.stores.timer.subscribe((fooValue) => console.log(fooValue));
```

## 🤖 Worker <a name="worker"></a>

TODO

### Server <a name="worker-server"></a>

```ts
import { WorkerHyperBridgeServer } from "hyperbridge";
import { api } from "./api";

const server = new WorkerHyperBridgeServer({ api });

export type Server = typeof server;
```

### Client <a name="worker-client"></a>

```ts
import { useWorkerHyperBridge } from "hyperbridge";
import type { Server } from "./server";

const worker = new Worker("./server.js");
const client = useWorkerHyperBridge<Server>({ worker });
```

## 💽 Chrome Extension <a name="chrome"></a>

TODO

### Server <a name="chrome-server"></a>

```ts
import { ChromeHyperBridgeServer, ChromeHealthCheckServer } from "hyperbridge";
import { api } from "./api";

// required only once for auto-reloading all connected clients
const healthCheck = new ChromeHealthCheckServer(chrome);

const ntpServer = new ChromeHyperBridgeServer({
  id: "ntp",
  clientInfoProvider,
  api,

  // Optional callbacks:
  onConnect: (port) =>
    console.log(`Client with name "${port.name}" has been connected`),
  onDisconnect: (port) =>
    console.log(`Client with name "${port.name}" has been disconnected`),
});

export type NtpServer = typeof ntpServer;
```

### Client <a name="chrome-client"></a>

```ts
import { useChromeHyperBridge, connectToBackgroundPort } from "hyperbridge";
import { clientInfoProvider } from "./clientInfoProvider";
import type { NtpServer } from "./server";

const client = useChromeHyperBridge<NtpServer>({
  port: connectToBackgroundPort(`ntp_${crypto.randomUUID()}`),
  clientInfo: { type: "my-client-two" },
  clientInfoProvider,
});
```

## ✨ API References <a name="api-references"></a>

TODO
