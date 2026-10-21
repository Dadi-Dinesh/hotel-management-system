import toast from "react-hot-toast";
// Acknowledgement confirms server dispatch, not physical delivery by staff.
export async function sendTableRequest(socket, payload) {
  if (!socket?.connected) {
    toast.error(
      "Live connection is unavailable. Please ask staff directly or retry when connected.",
    );
    return false;
  }
  try {
    const response = await socket
      .timeout(8000)
      .emitWithAck("call-waiter", payload);
    if (!response?.success) {
      toast.error(
        response?.message ||
          "Request could not be dispatched. Please ask staff directly.",
      );
      return false;
    }
    toast.success(
      "Request sent to staff. Please ask them directly if it is not answered.",
    );
    return true;
  } catch {
    toast.error(
      "Request delivery could not be confirmed. Please ask staff directly.",
    );
    return false;
  }
}
