// Copyright 2022 the HyperBridge authors. All rights reserved. MIT license.

export function callChrome<T>(
  executor: (resolve: (value: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    // this is needed to keep async stacktrace in case of lastError
    // because chrome callback creates new top-level stack frame
    // if you get stack pointed here - it means chrome.runtime.lastError occurs
    const errorForLastError = new Error();
    const callback = (result: T): void => {
      const { lastError } = chrome.runtime;
      if (lastError) {
        errorForLastError.message =
          lastError.message || "Chrome Error without message";
        reject(errorForLastError);
      } else {
        resolve(result);
      }
    };

    try {
      executor(callback);
    } catch (error) {
      reject(error);
    }
  });
}
