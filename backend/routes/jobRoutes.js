const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');

const router = express.Router();

// Supported job types
const VALID_JOB_TYPES = ['EMAIL', 'IMAGE', 'REPORT'];

/**
 * @route   POST /api/jobs
 * @desc    Enqueue a new task into the Redis pending queue
 */
router.post('/', async (req, res) => {
  try {
    const { type, payload, priority = 'NORMAL', simulateFailure = false } = req.body;

    if (!type || !VALID_JOB_TYPES.includes(type.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid job type. Must be one of: ${VALID_JOB_TYPES.join(', ')}`,
      });
    }

    const jobId = `job:${uuidv4()}`;
    const now = new Date().toISOString();

    const jobData = {
      id: jobId,
      type: type.toUpperCase(),
      payload: JSON.stringify(payload || {}),
      status: 'PENDING',
      attempts: '0',
      maxRetries: '3',
      priority,
      simulateFailure: simulateFailure ? 'true' : 'false',
      createdAt: now,
      updatedAt: now,
      errorLog: JSON.stringify([]),
    };

    // 1. Save job metadata in Redis Hash
    await redis.hmset(jobId, jobData);

    // 2. Add job ID to global index set for easy querying
    await redis.sadd('jobs:all', jobId);

    // 3. Push job ID into pending queue
    if (priority === 'HIGH') {
      await redis.rpush('queue:pending', jobId); // High priority near front
    } else {
      await redis.lpush('queue:pending', jobId);
    }

    res.status(201).json({
      message: 'Job enqueued successfully',
      job: { ...jobData, payload: payload || {} },
    });
  } catch (err) {
    console.error('Enqueue Error:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

/**
 * @route   GET /api/jobs
 * @desc    List all jobs stored in Redis with formatted metadata
 */
router.get('/', async (req, res) => {
  try {
    const jobIds = await redis.smembers('jobs:all');
    if (!jobIds || jobIds.length === 0) {
      return res.json({ jobs: [] });
    }

    const pipeline = redis.pipeline();
    jobIds.forEach((id) => pipeline.hgetall(id));
    const results = await pipeline.exec();

    const jobs = results
      .map(([err, job]) => {
        if (err || !job || !job.id) return null;
        return {
          ...job,
          payload: job.payload ? JSON.parse(job.payload) : {},
          attempts: parseInt(job.attempts || '0', 10),
          maxRetries: parseInt(job.maxRetries || '3', 10),
          simulateFailure: job.simulateFailure === 'true',
          errorLog: job.errorLog ? JSON.parse(job.errorLog) : [],
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ jobs });
  } catch (err) {
    console.error('Fetch Jobs Error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * @route   POST /api/jobs/dlq/retry
 * @desc    Re-queue a failed job from the Dead-Letter Queue (DLQ) back to pending
 */
router.post('/dlq/retry', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await redis.hgetall(jobId);
    if (!job || !job.id) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Remove from DLQ list
    await redis.lrem('queue:dlq', 0, jobId);

    // Reset status & attempts
    const now = new Date().toISOString();
    await redis.hmset(jobId, {
      status: 'PENDING',
      attempts: '0',
      simulateFailure: 'false', // reset failure simulation on manual retry
      updatedAt: now,
    });

    // Re-push to pending queue
    await redis.rpush('queue:pending', jobId);

    res.json({ message: `Job ${jobId} re-queued successfully from DLQ.` });
  } catch (err) {
    console.error('DLQ Retry Error:', err);
    res.status(500).json({ error: 'Failed to re-queue DLQ job' });
  }
});

/**
 * @route   POST /api/jobs/clear
 * @desc    Purge completed jobs or reset queues
 */
router.post('/clear', async (req, res) => {
  try {
    const jobIds = await redis.smembers('jobs:all');
    for (const id of jobIds) {
      const status = await redis.hget(id, 'status');
      if (status === 'COMPLETED') {
        await redis.del(id);
        await redis.srem('jobs:all', id);
      }
    }
    res.json({ message: 'Completed jobs purged successfully.' });
  } catch (err) {
    console.error('Clear Jobs Error:', err);
    res.status(500).json({ error: 'Failed to clear completed jobs' });
  }
});

module.exports = router;
