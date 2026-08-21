/**
 * Exponential Backoff Retry Scheduler
 * Handles delayed re-queueing of failed tasks using Redis Sorted Sets
 */
class RetryScheduler {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  /**
   * Schedule a job for retry after exponential backoff delay:
   * delay = (2 ^ attempts) * 1000ms
   */
  async scheduleRetry(jobId, currentAttempts) {
    const baseDelay = 1000; // 1 second
    const delayMs = Math.pow(2, currentAttempts) * baseDelay;
    const processAt = Date.now() + delayMs;

    console.log(`  ⏳ [Retry Scheduler] Scheduling ${jobId} for retry #${currentAttempts + 1} in ${delayMs / 1000}s`);

    // Add to Redis Sorted Set: Score = Timestamp when ready
    await this.redis.zadd('queue:retry', processAt, jobId);

    // Update status in metadata hash
    await this.redis.hmset(jobId, {
      status: 'RETRY_SCHEDULED',
      nextRetryAt: new Date(processAt).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Poll Redis Sorted Set 'queue:retry' and push due jobs back to 'queue:pending'
   */
  async pollAndRequeueDueJobs() {
    const now = Date.now();

    // Fetch jobs ready for retry (score <= current timestamp)
    const dueJobIds = await this.redis.zrangebyscore('queue:retry', 0, now);

    if (dueJobIds && dueJobIds.length > 0) {
      for (const jobId of dueJobIds) {
        console.log(`  🔄 [Retry Scheduler] Re-queueing due job ${jobId} to queue:pending`);

        // Atomic pipeline: Remove from ZSET and Push to pending list
        const pipeline = this.redis.pipeline();
        pipeline.zrem('queue:retry', jobId);
        pipeline.rpush('queue:pending', jobId);
        pipeline.hmset(jobId, {
          status: 'PENDING',
          updatedAt: new Date().toISOString(),
        });
        await pipeline.exec();
      }
    }
  }

  /**
   * Move permanently failed job (exceeded maxRetries) to Dead-Letter Queue (DLQ)
   */
  async moveToDLQ(jobId, finalErrorMessage) {
    console.error(`  ☠️ [DLQ] Job ${jobId} exceeded max retries. Moving to Dead-Letter Queue (queue:dlq)`);

    const now = new Date().toISOString();
    const pipeline = this.redis.pipeline();

    // Push to DLQ list
    pipeline.rpush('queue:dlq', jobId);

    // Update job status in Redis Hash
    pipeline.hmset(jobId, {
      status: 'FAILED',
      dlqAt: now,
      updatedAt: now,
    });

    await pipeline.exec();
  }
}

module.exports = RetryScheduler;
