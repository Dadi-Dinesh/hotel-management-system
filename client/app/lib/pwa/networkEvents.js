/**
 * A tiny framework-free pub/sub so plain modules (api.js, the offline queue)
 * can signal network problems without importing React. NetworkProvider
 * subscribes to this to drive the UI; nothing here touches the DOM.
 */
const listeners = new Set();

export function notifyNetworkError() {
  listeners.forEach((fn) => fn());
}

export function onNetworkError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
