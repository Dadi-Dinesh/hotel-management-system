"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../api";

export type PrinterStatusState = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";
export type KitchenModeSetting = "LIVE" | "NORMAL";

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
  friendlyName?: string;
}

export interface PrintOrderData {
  id?: string;
  orderNumber?: number | string;
  tableCode?: string;
  tableNumber?: number;
  session?: {
    table?: {
      code?: string;
      number?: number;
    };
  };
  createdAt?: string | Date;
  items: Array<{
    id?: string;
    quantity: number;
    price: number;
    name?: string;
    menuItem?: {
      name?: string;
      category?: {
        name?: string;
      };
    };
    categoryName?: string;
  }>;
  notes?: string;
  specialInstructions?: string;
  paymentMethod?: string;
  discount?: number;
  tax?: number;
}

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatusState>("DISCONNECTED");
  const [port, setPort] = useState<string>("/dev/cu.usbserial-10");
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [kitchenMode, setKitchenMode] = useState<KitchenModeSetting>("LIVE");
  const [queueLength, setQueueLength] = useState<number>(0);
  const [queueMetrics, setQueueMetrics] = useState<any>({ waitingJobs: 0, completedJobs: 0, failedJobs: 0 });
  const [stats, setStats] = useState<any>({ totalPrinted: 0, failedPrinted: 0 });
  const [lastConnected, setLastConnected] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [detectedPorts, setDetectedPorts] = useState<SerialPortInfo[]>([]);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isLoadingPorts, setIsLoadingPorts] = useState<boolean>(false);

  /**
   * Fetch live hardware printer status & Kitchen Mode settings from backend Express service
   */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get("/printer/status");
      const data = res.data;
      if (data) {
        setStatus(data.status || (data.connected ? "CONNECTED" : "DISCONNECTED"));
        setPort(data.port || "/dev/cu.usbserial-10");
        setBaudRate(data.baudRate || 9600);

        // Retrieve Kitchen Mode setting from backend printer config
        if (data.kitchenMode) setKitchenMode(data.kitchenMode);

        setQueueLength(data.queueLength || 0);
        if (data.queue) setQueueMetrics(data.queue);
        if (data.stats) setStats(data.stats);
        setLastConnected(data.lastConnected || null);
        setLastError(data.lastError || null);
      }
    } catch (err: any) {
      setStatus("ERROR");
      setLastError("Backend API unreachable");
    }
  }, []);

  /**
   * Scan host system for physical USB/Serial ports via SerialPort.list()
   */
  const detectPorts = useCallback(async () => {
    setIsLoadingPorts(true);
    try {
      const res = await api.get("/printer/ports");
      const ports: SerialPortInfo[] = res.data.ports || [];
      setDetectedPorts(ports);
      if (ports.length > 0) {
        toast.success(`Discovered ${ports.length} serial hardware port(s)`);
      } else {
        toast("No active serial ports detected. Check USB cable.", { icon: "ℹ️" });
      }
      return ports;
    } catch (err: any) {
      toast.error("Failed to list serial ports");
      return [];
    } finally {
      setIsLoadingPorts(false);
    }
  }, []);

  /**
   * Save Printer Configuration (Port, Baud Rate & Kitchen Mode) dynamically without server restart
   */
  const updateConfig = useCallback(
    async (newPort: string, newBaudRate: number, newKitchenMode: KitchenModeSetting = "LIVE") => {
      try {
        const res = await api.post("/printer/config", {
          port: newPort,
          baudRate: newBaudRate,
          kitchenMode: newKitchenMode,
        });
        if (res.data.success) {
          toast.success(res.data.message || "Printer settings updated!");
          fetchStatus();
          return true;
        }
        toast.error(res.data.message || "Failed to update config");
        return false;
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to update printer config");
        return false;
      }
    },
    [fetchStatus]
  );

  /**
   * Force manual connection retry
   */
  const reconnectPrinter = useCallback(async () => {
    try {
      const res = await api.post("/printer/reconnect");
      if (res.data.success) {
        toast.success("Reconnecting to serial printer...");
        fetchStatus();
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error("Reconnection request failed");
      return false;
    }
  }, [fetchStatus]);

  // Poll status periodically on mount
  useEffect(() => {
    fetchStatus();
    detectPorts();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchStatus, detectPorts]);

  /**
   * Print 80mm ESC/POS Test Receipt via backend API
   */
  const printTest = useCallback(async () => {
    setIsPrinting(true);
    try {
      const res = await api.post("/printer/test");
      if (res.data.success) {
        toast.success("Test receipt sent to serial printer! 🖨️");
        fetchStatus();
        return true;
      }
      toast.error(res.data.message || "Test print failed");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to print test receipt");
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [fetchStatus]);

  /**
   * Print 80mm Customer Billing Receipt via backend API
   */
  const printBill = useCallback(
    async (order: PrintOrderData) => {
      setIsPrinting(true);
      try {
        const res = await api.post("/printer/bill", { order });
        if (res.data.success) {
          toast.success(`Bill #${order.orderNumber || order.id} sent to printer 🧾`);
          fetchStatus();
          return true;
        }
        toast.error(res.data.message || "Failed to print bill");
        return false;
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to print bill receipt");
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    [fetchStatus]
  );

  /**
   * Print 80mm Kitchen Order Ticket (KOT) via backend API (routed by Kitchen Mode)
   */
  const printKOT = useCallback(
    async (order: PrintOrderData) => {
      setIsPrinting(true);
      try {
        const res = await api.post("/printer/kot", { order });
        if (res.data.success) {
          toast.success(`KOT #${order.orderNumber || order.id} sent to kitchen printer 👨‍🍳`);
          fetchStatus();
          return true;
        }
        toast.error(res.data.message || "Failed to print KOT");
        return false;
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to print KOT receipt");
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    [fetchStatus]
  );

  return {
    status,
    isConnected: status === "CONNECTED",
    port,
    baudRate,
    kitchenMode,
    queueLength,
    queueMetrics,
    stats,
    lastConnected,
    lastError,
    detectedPorts,
    isLoadingPorts,
    isPrinting,
    fetchStatus,
    detectPorts,
    updateConfig,
    reconnectPrinter,
    printTest,
    printBill,
    printKOT,
    reprintBill: printBill,
  };
}
