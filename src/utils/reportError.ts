// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "../base/types";

type ErrorHandler = (error: unknown) => void;

const errorHandlers = new Set<ErrorHandler>();

/**
 * Reports error to registered handlers or `console.log` if nobody register handler
 */
export function reportError(error: unknown): void {
  if (!errorHandlers.size) {
    return console.error(error);
  }
  errorHandlers.forEach((handler) => handler(error));
}

/**
 * Register error handler
 * @param handler - Error handler
 * @returns Function to remove registration of error handler
 */
export function onError(handler: ErrorHandler): UnsubscribeFn {
  errorHandlers.add(handler);
  return () => {
    errorHandlers.delete(handler);
  };
}
