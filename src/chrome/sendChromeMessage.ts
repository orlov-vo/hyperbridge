// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

/**
 * A wrapper over chrome sendMessage in order to use it without waiting response
 * @param message - same as chrome.runtime.sendMessage payload
 */
export function sendChromeMessage(message: unknown): void {
  chrome.runtime.sendMessage(message);
}
