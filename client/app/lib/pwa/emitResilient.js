import toast from "react-hot-toast";

/**
 * emitResilient — sends a Socket.IO event that should survive a brief
 * disconnect instead of being silently refused.
 *
 * socket.io-client already buffers `.emit()` calls made while a socket
 * object exists but is transiently disconnected, and flushes them in order
 * the moment it reconnects — so the right fix for "don't lose a waiter call
 * during a dropped connection" is simply to stop refusing to emit, not to
 * build a parallel queue for something the transport already handles.
 * This only returns false when there's no socket instance at all yet.
 */
export function emitResilient(socket, event, payload, { onlineMessage, offlineMessage, icon } = {}) {
  if (!socket) {
    toast.error("Not ready yet — please try again in a moment.");
    return false;
  }

  socket.emit(event, payload);

  if (socket.connected) {
    if (onlineMessage) toast.success(onlineMessage, { icon, duration: 4000 });
  } else if (offlineMessage) {
    toast(offlineMessage, { icon: "🕒", duration: 4000 });
  }

  return true;
}
