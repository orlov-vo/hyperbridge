// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

/**
 * Extracts value from map
 *
 * @param map - Map for extracting
 * @param key - Key that will be used for extracting
 * @param defaultValue - If value not exists returns defaultValue
 * @returns extracted value or default value
 *
 * @example
 * ```ts
 * const a = new Map()
 * a.set('abc', 333)
 * a.set('f', function() { return 565 })
 *
 * getFromMap(a, 'abc', 21) // => 333
 * getFromMap(a, 'f', () => 42) // => [Function]
 * getFromMap(a, 'no-param', () => 42) // => 42
 * ```
 */
export function getFromMap<K, N, T extends Map<K, N> = Map<K, N>>(
  map: T,
  key: K,
  defaultValue: N | (() => N)
): N {
  if (!map.has(key)) {
    const value =
      typeof defaultValue === "function"
        ? (defaultValue as () => N)()
        : defaultValue;
    map.set(key, value);
    return value;
  }
  return map.get(key) as N;
}
