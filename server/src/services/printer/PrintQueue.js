const printerLogger = require("./printerLogger");

/**
 * PrintQueue - FIFO Queue Manager for Serial Thermal Printing Jobs
 * Tracks waiting jobs, active processing job, completed count, and failed count.
 */
class PrintQueue {
  constructor(serialPrinter) {
    this.serialPrinter = serialPrinter;
    this.queue = [];
    this.isProcessing = false;
    this.currentJob = null;
    this.completedJobsCount = 0;
    this.failedJobsCount = 0;
  }

  /**
   * Enqueue a new print job
   * @param {Buffer} buffer - ESC/POS binary command buffer
   * @param {string} type - Job type label ("BILL" | "KOT" | "TEST")
   */
  enqueue(buffer, type = "PRINT_JOB") {
    return new Promise((resolve, reject) => {
      const job = {
        id: `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type,
        buffer,
        resolve,
        reject,
        enqueuedAt: new Date().toISOString(),
      };

      this.queue.push(job);
      printerLogger.info(`📥 [PrintQueue] Job ${job.id} (${type}) enqueued. Waiting jobs: ${this.queue.length}`);

      this.processQueue();
    });
  }

  /**
   * Process queued jobs sequentially
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.currentJob = this.queue.shift();

    printerLogger.info(`🖨️ [PrintQueue] Processing job ${this.currentJob.id} (${this.currentJob.type})...`);

    try {
      await this.serialPrinter.write(this.currentJob.buffer);
      this.completedJobsCount++;

      this.currentJob.resolve({
        success: true,
        jobId: this.currentJob.id,
        type: this.currentJob.type,
      });
    } catch (err) {
      this.failedJobsCount++;
      printerLogger.error(`❌ [PrintQueue] Job ${this.currentJob.id} failed:`, { error: err.message });
      this.currentJob.reject(err);
    } finally {
      this.currentJob = null;
      this.isProcessing = false;

      // Continue processing remaining items in queue
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Get Queue metrics
   */
  getMetrics() {
    return {
      waitingJobs: this.queue.length,
      currentJobId: this.currentJob ? this.currentJob.id : null,
      currentJobType: this.currentJob ? this.currentJob.type : null,
      completedJobs: this.completedJobsCount,
      failedJobs: this.failedJobsCount,
    };
  }

  getQueueLength() {
    return this.queue.length;
  }
}

module.exports = PrintQueue;
