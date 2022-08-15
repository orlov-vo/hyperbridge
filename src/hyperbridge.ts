// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

// Exports all base functions, classes and types
export { declareActions } from "./base/declareActions";
export { declareApi } from "./base/declareApi";
export { declareStore } from "./base/declareStore";
export { ClientInfoProvider } from "./base/ClientInfoProvider";
export { HyperBridgeClient } from "./base/HyperBridgeClient";
export { HyperBridgeServer } from "./base/HyperBridgeServer";
export { packFunction } from "./base/packFunction";
export type {
  AnyAction,
  AnyQuery,
  AnyStore,
  ReadableStore,
  HyperBridgeApiDeclaration,
  HyperBridgeClientFromServer,
  DeclareActions,
} from "./base/types";

// Export all related functions for chrome
export { ChromeHealthCheckClient } from "./chrome/ChromeHealthCheckClient";
export { ChromeHealthCheckServer } from "./chrome/ChromeHealthCheckServer";
export { ChromeHyperBridgeClient } from "./chrome/ChromeHyperBridgeClient";
export { ChromeHyperBridgeServer } from "./chrome/ChromeHyperBridgeServer";
export { useChromeHyperBridge } from "./chrome/useChromeHyperBridge";
export { connectToBackgroundPort } from "./chrome/connectToBackgroundPort";

// Export all related functions and classes for web-worker
export { useWorkerHyperBridge } from "./worker/useWorkerHyperBridge";
export { WorkerHyperBridgeClient } from "./worker/WorkerHyperBridgeClient";
export { WorkerHyperBridgeServer } from "./worker/WorkerHyperBridgeServer";
