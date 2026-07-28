const printerConfigManager = require("./printerConfigManager");
const printerLogger = require("./printerLogger");

/**
 * CloudPrinterGateway - Render Backend Relay Service for Local Printer Agent
 * Manages connected Printer Agent sockets, tracks live agent status/metrics, queues jobs during agent reconnects, and dispatches print jobs over Socket.IO.
 */
class CloudPrinterGateway {
  constructor() {
    const savedConfig = printerConfigManager.getConfig();

    this.agentSocket = null;
    this.agentStatus = {
      connected: false,
      online: false,
      status: "DISCONNECTED",
      port: savedConfig.port || process.env.PRINTER_PORT || "/dev/cu.usbserial-110",
      baudRate: savedConfig.baudRate || parseInt(process.env.PRINTER_BAUD_RATE || "9600", 10),
      kitchenMode: savedConfig.kitchenMode || process.env.KITCHEN_MODE || "LIVE",
      printerTarget: savedConfig.printerTarget || "ALL",
      lastConnected: null,
      lastError: "Printer Agent not connected to cloud backend",
      queueLength: 0,
      lastPrinted: null,
      queue: { waitingJobs: 0, completedJobs: 0, failedJobs: 0 },
      stats: { totalPrinted: 0, failedPrinted: 0 },
    };

    // Pending acknowledgements map: jobId -> { resolve, reject, timeout, createdAt }
    this.pendingAckMap = new Map();

    // Gateway-level job queue for dispatching while agent reconnects
    this.offlineJobQueue = [];
    this.maxOfflineQueue = 50;
    this.ackTimeoutMs = 30000; // 30 seconds timeout requirement

    // Garbage collection timer for pending acks memory leak protection
    this.startGarbageCollection();
  }

  /**
   * Periodic GC to purge stale un-cleared pending map entries (runs every 60s)
   */
  startGarbageCollection() {
    setInterval(() => {
      const now = Date.now();
      for (const [jobId, item] of this.pendingAckMap.entries()) {
        if (now - item.createdAt > 45000) {
          clearTimeout(item.timeout);
          this.pendingAckMap.delete(jobId);
          item.reject(new Error(`Garbage collected timed out print job ${jobId}`));
        }
      }
    }, 60000);
  }

  /**
   * Register connected Socket.IO Printer Agent instance
   * Synchronizes server's persisted kitchenMode to agent on initial registration
   */
  registerAgent(socket, initialPayload = {}) {
    printerLogger.info(`🔌 [CloudPrinterGateway] Printer Agent Registered (Socket ID: ${socket.id})`);
    this.agentSocket = socket;

    // Load server's canonical persisted configuration
    const savedConfig = printerConfigManager.getConfig();

    this.updateStatus({
      ...initialPayload,
      port: this.agentStatus.port || savedConfig.port,
      baudRate: this.agentStatus.baudRate || savedConfig.baudRate,
      kitchenMode: savedConfig.kitchenMode || this.agentStatus.kitchenMode,
      printerTarget: savedConfig.printerTarget || this.agentStatus.printerTarget,
      connected: true,
      online: true,
      lastConnected: new Date().toISOString(),
      lastError: initialPayload.lastError || null,
    });

    // Immediately sync server's configured kitchenMode, port, and baudRate back to agent
    if (this.agentSocket && this.agentSocket.connected) {
      this.agentSocket.emit("printer:update-config", {
        port: this.agentStatus.port,
        baudRate: this.agentStatus.baudRate,
        kitchenMode: this.agentStatus.kitchenMode,
        printerTarget: this.agentStatus.printerTarget,
      });
    }

    // Flush any pending jobs queued while agent was disconnected
    this.flushOfflineJobQueue();
  }

  /**
   * Unregister Agent on disconnect
   */
  unregisterAgent(socketId) {
    if (this.agentSocket && this.agentSocket.id === socketId) {
      printerLogger.warn(`⚠️ [CloudPrinterGateway] Printer Agent disconnected (Socket ID: ${socketId})`);
      this.agentSocket = null;
      this.updateStatus({
        connected: false,
        online: false,
        status: "DISCONNECTED",
        lastError: "Printer Agent disconnected from cloud backend",
      });
    }
  }

  /**
   * Update internal agent metrics and broadcast update to connected admin/captain clients
   */
  updateStatus(payload = {}) {
    this.agentStatus = {
      ...this.agentStatus,
      ...payload,
      queueLength: payload.queueLength !== undefined ? payload.queueLength : payload.queue?.waitingJobs || 0,
    };

    if (payload.lastPrinted) {
      this.agentStatus.lastPrinted = payload.lastPrinted;
    }

    // Broadcast status to admin & captain socket rooms
    try {
      const { getIO } = require("../../socket");
      const io = getIO();
      if (io) {
        io.to("admins").emit("printer:status:update", this.getStatus());
        io.to("captains").emit("printer:status:update", this.getStatus());
      }
    } catch (e) {
      // Quiet catch if Socket.IO server not initialized yet
    }
  }

  /**
   * Get comprehensive status structure expected by API controllers and frontend
   */
  getStatus() {
    return {
      success: true,
      connected: this.agentStatus.connected && this.agentStatus.online,
      status: this.agentStatus.online ? (this.agentStatus.status || "CONNECTED") : "DISCONNECTED",
      port: this.agentStatus.port,
      baudRate: this.agentStatus.baudRate,
      kitchenMode: this.agentStatus.kitchenMode,
      printerTarget: this.agentStatus.printerTarget,
      lastConnected: this.agentStatus.lastConnected,
      lastError: this.agentStatus.lastError,
      queueLength: this.agentStatus.queueLength,
      queue: this.agentStatus.queue || { waitingJobs: 0, completedJobs: 0, failedJobs: 0 },
      stats: this.agentStatus.stats || { totalPrinted: 0, failedPrinted: 0 },
      lastPrinted: this.agentStatus.lastPrinted,
    };
  }

  /**
   * Dispatch print job to Printer Agent over Socket.IO with 30-second timeout and offline queuing
   */
  async dispatchJob(type, order = {}, extraOptions = {}) {
    const jobId = `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const jobPayload = {
      jobId,
      type,
      order,
      printerTarget: extraOptions.printerTarget || "ALL",
      copyLabel: extraOptions.copyLabel,
      timestamp: new Date().toISOString(),
    };

    // If agent is offline, queue job temporarily in memory (survives transient disconnects)
    if (!this.agentSocket || !this.agentSocket.connected) {
      printerLogger.warn(`⚠️ [CloudPrinterGateway] Printer Agent offline. Queuing job ${jobId} until agent reconnects...`);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.removeOfflineJob(jobId);
          reject(new Error(`Timeout (30s) waiting for Printer Agent to connect and execute print job ${jobId}`));
        }, this.ackTimeoutMs);

        this.offlineJobQueue.push({
          jobPayload,
          resolve,
          reject,
          timeout,
        });

        if (this.offlineJobQueue.length > this.maxOfflineQueue) {
          const evicted = this.offlineJobQueue.shift();
          clearTimeout(evicted.timeout);
          evicted.reject(new Error("Offline job queue full. Print request rejected."));
        }
      });
    }

    return this.sendJobToAgent(jobPayload);
  }

  /**
   * Internal helper to transmit job payload over connected socket
   */
  sendJobToAgent(jobPayload) {
    const { jobId, type } = jobPayload;
    printerLogger.info(`📤 [CloudPrinterGateway] Transmitting ${type} job ${jobId} to agent...`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingAckMap.delete(jobId);
        reject(new Error(`Timeout (30s) waiting for print acknowledgement for job ${jobId}`));
      }, this.ackTimeoutMs);

      this.pendingAckMap.set(jobId, { resolve, reject, timeout, createdAt: Date.now() });

      this.agentSocket.emit("print:job", jobPayload, (ack) => {
        this.handleJobAck(ack);
      });
    });
  }

  /**
   * Flush queued offline jobs when agent reconnects
   */
  flushOfflineJobQueue() {
    if (this.offlineJobQueue.length === 0 || !this.agentSocket || !this.agentSocket.connected) return;

    printerLogger.info(`🔄 [CloudPrinterGateway] Flushing ${this.offlineJobQueue.length} queued offline job(s) to reconnected agent...`);

    const queueToFlush = [...this.offlineJobQueue];
    this.offlineJobQueue = [];

    queueToFlush.forEach(({ jobPayload, resolve, reject, timeout }) => {
      clearTimeout(timeout);
      this.sendJobToAgent(jobPayload).then(resolve).catch(reject);
    });
  }

  /**
   * Remove job from offline queue on timeout
   */
  removeOfflineJob(jobId) {
    const idx = this.offlineJobQueue.findIndex((j) => j.jobPayload.jobId === jobId);
    if (idx !== -1) {
      this.offlineJobQueue.splice(idx, 1);
    }
  }

  /**
   * Handle job acknowledgement from Agent
   */
  handleJobAck(ackPayload) {
    if (!ackPayload || !ackPayload.jobId) return;

    const pending = this.pendingAckMap.get(ackPayload.jobId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAckMap.delete(ackPayload.jobId);

      if (ackPayload.success) {
        if (ackPayload.timestamp) {
          this.agentStatus.lastPrinted = ackPayload.timestamp;
        }

        pending.resolve({
          success: true,
          jobId: ackPayload.jobId,
          timestamp: ackPayload.timestamp || new Date().toISOString(),
        });
      } else {
        pending.reject(new Error(ackPayload.error || "Print job execution failed on local printer agent."));
      }
    }
  }

  /**
   * Force manual connection retry command to agent
   */
  async reconnectAgent() {
    if (!this.agentSocket || !this.agentSocket.connected) {
      throw new Error("Printer Agent is offline. Cannot issue reconnect command.");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout (30s) waiting for agent reconnect response")), 30000);

      this.agentSocket.emit("printer:reconnect", {}, (res) => {
        clearTimeout(timeout);
        if (res && res.status) {
          this.updateStatus(res.status);
        }
        resolve(this.getStatus());
      });
    });
  }

  /**
   * Reconfigure printer settings dynamically on agent and persist on server
   */
  async updateAgentConfig(port, baudRate, kitchenMode, printerTarget = "ALL") {
    const targetKitchenMode =
      kitchenMode !== undefined
        ? kitchenMode === "NORMAL"
          ? "NORMAL"
          : "LIVE"
        : this.agentStatus.kitchenMode;

    const newPort = String(port || this.agentStatus.port).trim();
    const newBaudRate = parseInt(baudRate || this.agentStatus.baudRate, 10);

    // Save configuration persistently on server
    printerConfigManager.saveConfig(newPort, newBaudRate, targetKitchenMode, printerTarget);

    this.agentStatus.port = newPort;
    this.agentStatus.baudRate = newBaudRate;
    this.agentStatus.kitchenMode = targetKitchenMode;
    this.agentStatus.printerTarget = printerTarget || this.agentStatus.printerTarget;

    // Send updated configuration to agent over Socket.IO
    if (this.agentSocket && this.agentSocket.connected) {
      this.agentSocket.emit("printer:update-config", {
        port: this.agentStatus.port,
        baudRate: this.agentStatus.baudRate,
        kitchenMode: this.agentStatus.kitchenMode,
        printerTarget: this.agentStatus.printerTarget,
      });
    }

    return this.getStatus();
  }

  /**
   * List available serial ports on restaurant Mac mini via agent
   */
  async listAgentPorts() {
    if (!this.agentSocket || !this.agentSocket.connected) {
      printerLogger.warn("Printer Agent offline, returning cached default port");
      return [
        {
          path: this.agentStatus.port,
          manufacturer: "Agent Offline (Default Port)",
        },
      ];
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve([{ path: this.agentStatus.port }]), 30000);

      this.agentSocket.emit("printer:list-ports", {}, (res) => {
        clearTimeout(timeout);
        if (res && Array.isArray(res.ports)) {
          resolve(res.ports);
        } else {
          resolve([{ path: this.agentStatus.port }]);
        }
      });
    });
  }
}

const cloudPrinterGateway = new CloudPrinterGateway();
module.exports = cloudPrinterGateway;
