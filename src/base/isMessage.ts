// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

import { isObject } from "../utils/isObject";
import { has } from "../utils/has";
import { MessageType } from "./protocol";
import type { Message } from "./protocol";

const MESSAGE_TYPES: readonly string[] = Object.values(MessageType);

export function isMessage<T>(value: unknown): value is Message<T> {
  return (
    isObject(value) &&
    has(value, "type") &&
    typeof value.type === "string" &&
    MESSAGE_TYPES.includes(value.type) &&
    has(value, "client")
  );
}
