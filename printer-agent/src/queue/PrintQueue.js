const fs = require("fs");
const path = require("path");
const printerLogger = require("../utils/printerLogger");

/**
 * PrintQueue - Enterprise Persistent FIFO Queue Manager
 * Features atomic disk writes (to prevent JSON corruption on power loss),
 * concurrency lock protection, idempotency dedup, and multi-attempt retry logic.
 */
class PrintQueue {
  constructor(serialPrinter) {
    this.serialPrinter = serialPrinter;
    this.queue = [];
    this.isProcessing = false;
    this.currentJob = null;
    this.completedJobsCount = 0;
    this.failedJobsCount = 0;
    this.lastPrintedTimestamp = null;

    // Idempotency: Keep set of recently processed job IDs
    this.processedJobIds = new Set();
    this.maxProcessedIds = 1000;

    // Disk persistence file path
    this.storePath = path.join(__dirname, "../../../config/queue-store.json");
    this.tempStorePath = path.join(__dirname, "../../../config/queue-store.tmp");

    // Load persisted queue from disk if agent restarted unexpectedly
    this.loadQueueFromDisk();
  }

  /**
   * Load persisted queue from disk file safely with fallback
   */
  loadQueueFromDisk() {
    try {
      const targetFile = fs.existsSync(this.storePath)
        ? this.storePath
        : fs.existsSync(this.tempStorePath)
        ? this.tempStorePath
        : null;

      if (targetFile) {
        const raw = fs.readFileSync(targetFile, "utf8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.queue) && data.queue.length > 0) {
          this.queue = data.queue.map((j) => ({
            ...j,
            buffer: j.bufferBase64 ? Buffer.from(j.bufferBase64, "base64") : j.buffer,
          }));
          printerLogger.info(`💾 [PrintQueue] Safely restored ${this.queue.length} unprinted job(s) from disk store.`);
        }
        if (Array.isArray(data.processedJobIds)) {
          data.processedJobIds.forEach((id) => this.processedJobIds.add(id));
        }
      }
    } catch (err) {
      printerLogger.warn("⚠️ Could not parse queue-store.json, resetting disk store:", { error: err.message });
    }
  }

  /**
   * Atomic Disk Persistence: Writes to .tmp file first then renames atomically
   */
  saveQueueToDisk() {
    try {
      const serializableQueue = this.queue.map((j) => ({
        id: j.id,
        type: j.type,
        printerTarget: j.printerTarget,
        enqueuedAt: j.enqueuedAt,
        retryCount: j.retryCount || 0,
        bufferBase64: j.buffer ? Buffer.from(j.buffer).toString("base64") : null,
      }));

      const payload = {
        queue: serializableQueue,
        processedJobIds: Array.from(this.processedJobIds).slice(-this.maxProcessedIds),
        savedAt: new Date().toISOString(),
      };

      // Atomic write pattern: write to tmp file then rename atomically
      fs.writeFileSync(this.tempStorePath, JSON.stringify(payload, null, 2), "utf8");
      fs.renameSync(this.tempStorePath, this.storePath);
    } catch (err) {
      printerLogger.warn("Failed to write atomic queue to disk store:", { error: err.message });
    }
  }

  /**
   * Enqueue a new print job with Idempotency (Dedup) check
   */
  enqueue(jobParams) {
    const jobId = jobParams.id || `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Idempotency Check (Prevent duplicate prints)
    if (this.processedJobIds.has(jobId)) {
      printerLogger.warn(`⚠️ [PrintQueue] Duplicate job ${jobId} ignored (already processed).`);
      return Promise.resolve({
        success: true,
        duplicate: true,
        jobId,
        message: "Duplicate job ignored",
      });
    }

    return new Promise((resolve, reject) => {
      const job = {
        id: jobId,
        type: jobParams.type || "PRINT_JOB",
        buffer: jobParams.buffer,
        printerTarget: jobParams.printerTarget || "ALL",
        resolve,
        reject,
        retryCount: 0,
        maxRetries: 3,
        enqueuedAt: new Date().toISOString(),
      };

      this.queue.push(job);
      printerLogger.info(`📥 [PrintQueue] Job ${job.id} (${job.type}) enqueued. Waiting: ${this.queue.length}`);

      this.saveQueueToDisk();
      this.processQueue();
    });
  }

  /**
   * Process queued jobs sequentially with lock protection
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.currentJob = this.queue.shift();
    this.saveQueueToDisk();

    printerLogger.info(`🖨️ [PrintQueue] Processing job ${this.currentJob.id} (${this.currentJob.type})...`);

    try {
      await this.serialPrinter.write(this.currentJob.buffer);

      this.completedJobsCount++;
      this.lastPrintedTimestamp = new Date().toISOString();

      // Track processed job ID for dedup
      this.processedJobIds.add(this.currentJob.id);
      if (this.processedJobIds.size > this.maxProcessedIds) {
        const firstAdded = this.processedJobIds.values().next().value;
        this.processedJobIds.delete(firstAdded);
      }

      if (typeof this.currentJob.resolve === "function") {
        this.currentJob.resolve({
          success: true,
          jobId: this.currentJob.id,
          type: this.currentJob.type,
          printedAt: this.lastPrintedTimestamp,
        });
      }
    } catch (err) {
      printerLogger.error(`❌ [PrintQueue] Job ${this.currentJob.id} error: ${err.message}`);

      this.currentJob.retryCount = (this.currentJob.retryCount || 0) + 1;

      if (this.currentJob.retryCount <= this.currentJob.maxRetries) {
        printerLogger.warn(`🔄 [PrintQueue] Retrying job ${this.currentJob.id} (Attempt ${this.currentJob.retryCount}/${this.currentJob.maxRetries}) in 2s...`);

        // Re-insert at head of queue
        this.queue.unshift(this.currentJob);
        this.saveQueueToDisk();

        // Maintain processing lock during retry delay to prevent parallel worker loops
        await new Promise((res) => setTimeout(res, 2000));
      } else {
        this.failedJobsCount++;
        if (typeof this.currentJob.reject === "function") {
          this.currentJob.reject(err);
        }
      }
    } finally {
      this.currentJob = null;
      this.isProcessing = false;
      this.saveQueueToDisk();

      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  getMetrics() {
    return {
      waitingJobs: this.queue.length,
      currentJobId: this.currentJob ? this.currentJob.id : null,
      currentJobType: this.currentJob ? this.currentJob.type : null,
      completedJobs: this.completedJobsCount,
      failedJobs: this.failedJobsCount,
      lastPrinted: this.lastPrintedTimestamp,
    };
  }
}

module.exports = PrintQueue;
