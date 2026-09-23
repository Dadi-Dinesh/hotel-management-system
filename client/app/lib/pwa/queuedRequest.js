import toast from "react-hot-toast";
import api from "../api";
import { enqueueAction } from "./offlineQueue";
import { requestBackgroundSync } from "./backgroundSync";

/**
 * requestOrQueue — the shared "try it live, queue it if we're offline"
 * pattern used by every write action that Phase 9 needs to survive a brief
 * disconnect (customer orders, feedback, bill requests, waiter status
 * updates). A queued action is never lost: it's persisted via OfflineQueue
 * and retried automatically the moment connectivity returns.
 *
 * Only a genuine network failure (the request never reached the server) is
 * queued — a real server-side rejection (validation error, 404, etc.) is
 * re-thrown so the caller's existing error handling still runs unchanged.
 */
export async function requestOrQueue({ type, method, url, body, offlineMessage, label }) {
  try {
    const res = await api.request({ method, url, data: body });
    return { success: true, queued: false, data: res.data };
  } catch (error) {
    if (!error.response) {
      enqueueAction({ type, method, url, body, label });
      requestBackgroundSync();
      toast(
        offlineMessage || "You're offline — this will be sent automatically once you're back online.",
        { icon: "🕒", duration: 5000 }
      );
      return { success: false, queued: true };
    }
    throw error;
  }
}
