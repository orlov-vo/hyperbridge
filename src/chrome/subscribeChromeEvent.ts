// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import type { UnsubscribeFn } from "../base/types";

export function subscribeChromeEvent<T extends (...args: any[]) => any>(
  event: chrome.events.Event<T>,
  handler: T
): UnsubscribeFn {
  event.addListener(handler);
  return () => event.removeListener(handler);
}
