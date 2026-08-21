const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
require('dotenv').config();

const useMock = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_HOST;

let redis;

if (!useMock && process.env.USE_MOCK_REDIS === 'false') {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
  });

  redis.on('error', (err) => {
    console.error('Redis TCP Error:', err.message);
  });
} else {
  redis = new RedisMock();
}

console.log(`⚡ Redis Client Initialized (${redis instanceof RedisMock ? 'In-Memory Mock Engine' : 'Real Redis Server'})`);

module.exports = redis;
