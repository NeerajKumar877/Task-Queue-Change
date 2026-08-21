const express = require('express');
const cors = require('cors');
require('dotenv').config();

const redis = require('./config/redis');
const jobRoutes = require('./routes/jobRoutes');
const metricRoutes = require('./routes/metricRoutes');

const app = express();

// CORS configuration (allow all by default or specific origins from CORS_ORIGIN)
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Distributed Task Queue API',
    endpoints: {
      health: '/health',
      jobs: '/api/jobs',
      metrics: '/api/metrics',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Task Queue API Server', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobRoutes);
app.use('/api/metrics', metricRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Task Queue API Server running on port ${PORT}`);

  // Start embedded worker ONLY if explicitly requested in local single-process dev
  if (process.env.START_EMBEDDED_WORKER === 'true') {
    try {
      const TaskQueueConsumer = require('../worker/queue/taskQueue');
      console.log('⚡ Starting Embedded Worker Queue Consumer...');
      const consumer = new TaskQueueConsumer(redis);
      consumer.start();
    } catch (err) {
      console.warn('⚠️ Embedded worker consumer not started:', err.message);
    }
  }
});

