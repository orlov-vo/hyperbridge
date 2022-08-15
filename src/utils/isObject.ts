// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}
