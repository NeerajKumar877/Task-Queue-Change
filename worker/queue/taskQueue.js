const processEmailTask = require('../handlers/emailHandler');
const processImageTask = require('../handlers/imageHandler');
const processReportTask = require('../handlers/reportHandler');
const RetryScheduler = require('./retryScheduler');

class TaskQueueConsumer {
  constructor(redisClient) {
    this.redis = redisClient;
    this.retryScheduler = new RetryScheduler(redisClient);
    this.isRunning = false;
  }

  /**
   * Start worker polling loop
   */
  async start() {
    this.isRunning = true;
    console.log('🚀 Worker Queue Consumer started. Ready to process jobs...');

    // Start background loop for retry scheduler polling (every 1 second)
    setInterval(() => {
      this.retryScheduler.pollAndRequeueDueJobs().catch((err) => {
        console.error('Retry Scheduler Poll Error:', err.message);
      });
    }, 1000);

    // Main queue consumer loop
    while (this.isRunning) {
      try {
        // Non-blocking atomic pop from queue:pending to queue:processing
        const jobId = await this.redis.rpoplpush('queue:pending', 'queue:processing');

        if (jobId) {
          await this.processJob(jobId);
        } else {
          // Poll interval when queue is empty
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (err) {
        console.error('Worker Queue Loop Error:', err.message);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process a single job by ID
   */
  async processJob(jobId) {
    console.log(`\n⚙️ Processing Job: ${jobId}`);

    const job = await this.redis.hgetall(jobId);
    if (!job || !job.id) {
      console.warn(`⚠️ Job ${jobId} metadata missing from Redis. Removing from processing queue.`);
      await this.redis.lrem('queue:processing', 0, jobId);
      return;
    }

    const payload = job.payload ? JSON.parse(job.payload) : {};
    const attempts = parseInt(job.attempts || '0', 10);
    const maxRetries = parseInt(job.maxRetries || '3', 10);
    const simulateFailure = job.simulateFailure === 'true';

    // Update job status to PROCESSING
    const now = new Date().toISOString();
    await this.redis.hmset(jobId, {
      status: 'PROCESSING',
      updatedAt: now,
    });

    try {
      let result = null;

      // Dispatch to handler based on job type
      switch (job.type) {
        case 'EMAIL':
          result = await processEmailTask(payload, simulateFailure);
          break;
        case 'IMAGE':
          result = await processImageTask(payload, simulateFailure);
          break;
        case 'REPORT':
          result = await processReportTask(payload, simulateFailure);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark Job as COMPLETED
      await this.redis.hmset(jobId, {
        status: 'COMPLETED',
        result: JSON.stringify(result),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Remove from processing queue
      await this.redis.lrem('queue:processing', 0, jobId);

      console.log(`✅ [SUCCESS] Job ${jobId} completed successfully.`);
    } catch (err) {
      console.error(`❌ [FAILURE] Job ${jobId} failed: ${err.message}`);

      const nextAttempts = attempts + 1;
      const errorLog = job.errorLog ? JSON.parse(job.errorLog) : [];
      errorLog.push({
        attempt: nextAttempts,
        error: err.message,
        timestamp: new Date().toISOString(),
      });

      // Update attempt count & error logs
      await this.redis.hmset(jobId, {
        attempts: nextAttempts.toString(),
        errorLog: JSON.stringify(errorLog),
        lastError: err.message,
        updatedAt: new Date().toISOString(),
      });

      // Remove from processing queue
      await this.redis.lrem('queue:processing', 0, jobId);

      // Check if retries available
      if (nextAttempts < maxRetries) {
        await this.retryScheduler.scheduleRetry(jobId, nextAttempts);
      } else {
        await this.retryScheduler.moveToDLQ(jobId, err.message);
      }
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = TaskQueueConsumer;
