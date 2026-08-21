const express = require('express');
const redis = require('../config/redis');

const router = express.Router();

/**
 * @route   GET /api/metrics
 * @desc    Fetch real-time queue depth metrics and state counters
 */
router.get('/', async (req, res) => {
  try {
    const [pendingCount, processingCount, dlqCount, retryCount, totalJobs] = await Promise.all([
      redis.llen('queue:pending'),
      redis.llen('queue:processing'),
      redis.llen('queue:dlq'),
      redis.zcard('queue:retry'),
      redis.scard('jobs:all'),
    ]);

    // Calculate completed vs failed from jobs:all
    const jobIds = await redis.smembers('jobs:all');
    let completedCount = 0;
    let failedCount = 0;

    if (jobIds.length > 0) {
      const pipeline = redis.pipeline();
      jobIds.forEach((id) => pipeline.hget(id, 'status'));
      const statuses = await pipeline.exec();
      statuses.forEach(([err, status]) => {
        if (status === 'COMPLETED') completedCount++;
        if (status === 'FAILED') failedCount++;
      });
    }

    res.json({
      metrics: {
        pending: pendingCount || 0,
        processing: processingCount || 0,
        completed: completedCount || 0,
        failed: failedCount || 0,
        dlq: dlqCount || 0,
        retryScheduled: retryCount || 0,
        total: totalJobs || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Metrics Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch queue metrics' });
  }
});

module.exports = router;
