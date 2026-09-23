import api from "../../api";
import type { PrintAdapter, PrintJobInput, PrintResult } from "../types";
import { receiptDataToLegacyOrder } from "./escposAdapter";

/**
 * NetworkAdapter — IP-based (TCP port 9100, "raw"/JetDirect) printers.
 * Routed through the same printer-agent connection as ESCPOSAdapter (the
 * agent is what actually has LAN access to the printer), just with a
 * networkPrinter {ip, port} target instead of the local USB/serial port.
 */
class NetworkAdapter implements PrintAdapter {
  name = "NETWORK" as const;
  private ip: string | null = null;
  private port: number = 9100;

  configure(ip: string | null, port: number = 9100) {
    this.ip = ip;
    this.port = port;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.ip) return false;
    try {
      const res = await api.get("/printer/status");
      // The agent connection is what carries network jobs — it must be online.
      return !!res.data?.connected;
    } catch {
      return false;
    }
  }

  async testConnection(ip: string, port: number = 9100): Promise<PrintResult> {
    try {
      const res = await api.post("/printer/network/test", { ip, port });
      return { success: !!res.data?.success, adapter: this.name, error: res.data?.success ? undefined : res.data?.message };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.response?.data?.message || err.message };
    }
  }

  async print(job: PrintJobInput): Promise<PrintResult> {
    const ip = job.networkPrinter?.ip || this.ip;
    const port = job.networkPrinter?.port || this.port;
    if (!ip) {
      return { success: false, adapter: this.name, error: "No network printer IP configured." };
    }

    try {
      const endpoint = job.documentType === "BILL" ? "/printer/bill" : "/printer/kot";
      const order = receiptDataToLegacyOrder(job);
      const res = await api.post(endpoint, { order, paperWidth: job.paperWidth, networkPrinter: { ip, port } });
      if (res.data?.success) return { success: true, adapter: this.name };
      return { success: false, adapter: this.name, error: res.data?.message || "Network printer rejected the job." };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.response?.data?.message || err.message || "Network printer unreachable." };
    }
  }
}

export const networkAdapter = new NetworkAdapter();
