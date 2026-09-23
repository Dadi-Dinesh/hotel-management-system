/**
 * OfflineQueue — a localStorage-persisted FIFO queue for write actions that
 * couldn't reach the server (customer orders, reminders, feedback, bill
 * requests, waiter status updates). Survives a page reload; drained by
 * NetworkProvider whenever the browser reports it's back online, by a
 * Background Sync wake-up, or by the periodic fallback interval.
 *
 * Deliberately lives in localStorage (not IndexedDB) — the queue is small
 * (a handful of pending actions at most, for one device/session) and this
 * keeps it simple and synchronous to read/write.
 */
import api from "../api";
import toast from "react-hot-toast";

const STORAGE_KEY = "servesync-offline-queue";
let draining = false; // in-flight lock — prevents the interval and online-event drainers racing and double-sending the same action.

function readQueue() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full/unavailable — the action just won't survive a reload; it
    // still exists in memory for this session's own retry attempts.
  }
}

/**
 * @param {Object} action
 * @param {"ORDER"|"REMINDER"|"FEEDBACK"|"BILL_REQUEST"|"ITEM_STATUS"|"ORDER_STATUS"} action.type
 * @param {"post"|"patch"|"put"|"delete"} action.method
 * @param {string} action.url - relative to the API base, e.g. "/orders"
 * @param {Object} [action.body]
 * @param {string} [action.label] - human-readable description for the offline UI
 */
export function enqueueAction(action) {
  const queue = readQueue();
  const withId = {
    ...action,
    id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(withId);
  writeQueue(queue);
  return withId;
}

export function getQueue() {
  return readQueue();
}

export function getQueueLength() {
  return readQueue().length;
}

export function removeFromQueue(id) {
  const queue = readQueue().filter((a) => a.id !== id);
  writeQueue(queue);
}

export function clearQueue() {
  writeQueue([]);
}

/**
 * Attempts every queued action in order. Stops (and keeps the remainder
 * queued) the moment one fails due to still being offline, so ordering is
 * preserved and nothing is skipped. An action that fails with a real server
 * response (not a network error) is dropped — retrying it forever would
 * never succeed and would spam the server.
 */
export async function drainQueue() {
  if (draining) return { synced: 0, failed: 0, remaining: getQueueLength() };
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  draining = true;
  let synced = 0;
  let failed = 0;
  let stillOffline = false;
  const remaining = [];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    if (stillOffline) {
      remaining.push(action);
      continue;
    }
    try {
      await api.request({ method: action.method, url: action.url, data: action.body });
      synced++;
      toast.success(`Synced: ${action.label || action.type}`, { duration: 3000, icon: "✅" });
    } catch (err) {
      if (!err.response) {
        // Network error again — still offline, keep this and everything after it.
        stillOffline = true;
        remaining.push(action);
      } else {
        // The server actually answered (validation error, conflict, etc.) —
        // it will never succeed by blind retry, so drop it rather than loop
        // forever, but never drop it silently — surface it if the app is open.
        failed++;
        const message = err.response?.data?.message || "The server rejected it.";
        toast.error(`Couldn't sync "${action.label || action.type}": ${message}`, { duration: 6000 });
      }
    }
  }

  writeQueue(remaining);
  draining = false;
  return { synced, failed, remaining: remaining.length };
}
