const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
require('dotenv').config();
const TaskQueueConsumer = require('./queue/taskQueue');

const useExplicitMock = process.env.USE_MOCK_REDIS === 'true';
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;

let redis;

if (!useExplicitMock && (redisUrl || redisHost)) {
  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };

  if (redisUrl) {
    if (redisUrl.startsWith('rediss://')) {
      options.tls = { rejectUnauthorized: false };
    }
    redis = new Redis(redisUrl, options);
  } else {
    if (process.env.REDIS_PASSWORD) {
      options.password = process.env.REDIS_PASSWORD;
    }
    if (process.env.REDIS_TLS === 'true') {
      options.tls = { rejectUnauthorized: false };
    }
    options.host = redisHost;
    options.port = parseInt(process.env.REDIS_PORT || '6379', 10);
    redis = new Redis(options);
  }

  redis.on('connect', () => {
    console.log('✅ Worker connected to Redis Server');
  });

  redis.on('error', (err) => {
    console.error('❌ Worker Redis TCP Error:', err.message);
  });
} else {
  redis = new RedisMock();
}

console.log(`⚡ Worker Client Initialized (${redis instanceof RedisMock ? 'In-Memory Mock Engine' : 'Real Redis Server'})`);

const consumer = new TaskQueueConsumer(redis);
consumer.start();

// Start lightweight health check HTTP server for cloud platforms (e.g. Render Web Service)
const http = require('http');
const PORT = process.env.PORT || 5002;

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'Task Queue Worker', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(PORT, () => {
  console.log(`⚡ Worker Health Server listening on port ${PORT}`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down worker gracefully...`);
  healthServer.close();
  consumer.stop();
  try {
    if (redis && typeof redis.quit === 'function') {
      await redis.quit();
    }
  } catch (err) {
    console.error('Error closing Redis connection:', err.message);
  }
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));


