const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
require('dotenv').config();

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
    console.log('✅ Connected to Redis Server');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis TCP Error:', err.message);
  });
} else {
  redis = new RedisMock();
}

console.log(`⚡ Redis Client Initialized (${redis instanceof RedisMock ? 'In-Memory Mock Engine' : 'Real Redis Server'})`);

module.exports = redis;

