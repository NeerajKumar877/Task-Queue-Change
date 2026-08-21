const express = require('express');
const cors = require('cors');
require('dotenv').config();

const redis = require('./config/redis');
const TaskQueueConsumer = require('../worker/queue/taskQueue');

const jobRoutes = require('./routes/jobRoutes');
const metricRoutes = require('./routes/metricRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/metrics', metricRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Task Queue API Server', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Task Queue API Server running on port ${PORT}`);
  
  try {
    console.log(`⚡ Starting Worker Queue Consumer on Port ${PORT}...`);
    const consumer = new TaskQueueConsumer(redis);
    consumer.start();
  } catch (err) {
    console.error('Failed to start worker consumer:', err.message);
  }
});
