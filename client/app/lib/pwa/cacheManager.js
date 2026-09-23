/**
 * CacheManager — read-only inspection and clearing of the Cache Storage API
 * caches the service worker maintains. Used by the PWA Settings page and the
 * Offline Test page; never called from the service worker itself (it manages
 * its own cache names directly).
 */

export function isCacheApiSupported() {
  return typeof window !== "undefined" && "caches" in window;
}

/** Lists every cache name this origin owns, with entry counts. */
export async function listCaches() {
  if (!isCacheApiSupported()) return [];
  const names = await caches.keys();
  return Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      return { name, entryCount: keys.length };
    })
  );
}

/** Best-effort total storage usage via the Storage API (bytes), where supported. */
export async function estimateStorageUsage() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage || 0, quota: quota || 0 };
  } catch {
    return null;
  }
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Deletes every cache this origin owns — used by "Clear Cache" in Settings. */
export async function clearAllCaches() {
  if (!isCacheApiSupported()) return 0;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
  return names.length;
}
