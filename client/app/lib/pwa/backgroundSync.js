/**
 * BackgroundSyncManager — thin wrapper around the Background Sync API.
 *
 * Real Background Sync (registration.sync.register) is only supported in
 * Chromium browsers; Safari/iOS has no SyncManager at all. Where it IS
 * supported, we use it purely as a reliable wake-up signal: the service
 * worker's `sync` event handler posts a message back to any open page,
 * which then drains OfflineQueue (the queue itself lives in the page's
 * localStorage, not IndexedDB, so the actual draining has to happen there).
 *
 * Where it's NOT supported, NetworkProvider's `online` listener + a periodic
 * interval already cover the same job — that's the "manual retry queue"
 * fallback the brief asks for, and it works identically everywhere.
 */
const SYNC_TAG = "servesync-offline-queue";

export function isBackgroundSyncSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window;
}

export async function requestBackgroundSync() {
  if (!isBackgroundSyncSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

export { SYNC_TAG };
