"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import api from "../api";
import { useSocket } from "../../components/SocketProvider";
import { getEffectiveRestaurantId } from "../auth";

const REFRESH_DEBOUNCE_MS = 4000;

/**
 * useAICopilot — fetches the AI Copilot's overview payload (daily insights,
 * menu intelligence, feedback insights, kitchen performance, table
 * utilization, recommendations, timeline) and keeps it live: reuses the
 * existing admin Socket.IO room (no new events, no polling) and refetches
 * on the same real business events the rest of the dashboard already
 * listens to, debounced so a burst of orders doesn't cause a request storm.
 */
export function useAICopilot() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get("/admin/insights/overview");
      setData(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load AI Copilot insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchOverview, REFRESH_DEBOUNCE_MS);
  }, [fetchOverview]);

  useEffect(() => {
    fetchOverview();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchOverview]);

  useEffect(() => {
    if (!socket) return undefined;

    const joinRoom = () => socket.emit("join-admin", { restaurantId: getEffectiveRestaurantId() });
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    // Every existing business event that could move today's numbers —
    // no new Socket.IO events are introduced for this feature.
    const events = ["new-order", "order-status-update", "item-served", "session-closed", "bill-requested", "kitchen-updated"];
    events.forEach((evt) => socket.on(evt, scheduleRefresh));

    return () => {
      socket.off("connect", joinRoom);
      events.forEach((evt) => socket.off(evt, scheduleRefresh));
    };
  }, [socket, scheduleRefresh]);

  return { data, loading, error, refresh: fetchOverview };
}

export async function fetchTrend(compare) {
  const res = await api.get(`/admin/insights/trends?compare=${compare}`);
  return res.data.data;
}

export async function askAI(question) {
  const res = await api.post("/admin/insights/ask", { question });
  return res.data.data;
}

export async function fetchReport(period) {
  const res = await api.get(`/admin/insights/report?period=${period}`);
  return res.data.data;
}
