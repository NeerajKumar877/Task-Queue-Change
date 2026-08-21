# ⚡ Distributed Task Queue & Worker Engine

> A high-performance, fault-tolerant asynchronous background task processing engine built with **Node.js, Express, Redis v7, and React 19**. Features atomic queue polling, exponential backoff retries, dead-letter queue (DLQ) isolation, cloud connection support (Upstash/Render/TLS), and a real-time monitoring dashboard.

---

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Render](https://img.shields.io/badge/Render-Cloud_Deploy-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React 19 Frontend Dashboard] -->|POST /api/jobs | API[Express API Server]
    Client -->|GET /api/jobs & /metrics| API
    API -->|Atomic LPUSH / RPUSH| RedisPending[(Redis: queue:pending)]
    Worker[Worker Consumer Process] -->|Atomic RPOPLPUSH| RedisProcessing[(Redis: queue:processing)]
    Worker -->|Dispatch Task| Handlers[Worker Handlers: Email, Image, Report]
    Handlers -->|Success| Complete[Mark COMPLETED & LREM queue:processing]
    Handlers -->|Error & Attempts < 3| RetryQueue[Redis Sorted Set: queue:retry]
    Handlers -->|Error & Attempts >= 3| DLQQueue[Redis List: queue:dlq]
    RetryScheduler[Exponential Retry Scheduler] -->|Poll ZRANGEBYSCORE| RedisPending
```

---

## ⚡ Core Engineering Features

- 🔐 **Atomic Queue Operations**: Uses Redis `RPOPLPUSH` to atomically pop tasks from `queue:pending` to `queue:processing`. Prevents job loss if a worker crashes mid-execution.
- ⏳ **Exponential Backoff Retries**: Calculates delay $t = 2^{\text{attempts}} \times 1000\text{ms}$ (1s, 2s, 4s...) and schedules retries in a Redis Sorted Set (`queue:retry`) using timestamp scores.
- ☠️ **Dead-Letter Queue (DLQ)**: Permanently failed tasks ($\ge 3$ attempts) are safely isolated into `queue:dlq` to prevent poison-pill jobs from blocking the system.
- 🛠️ **3 Concrete Worker Handlers**:
  1. `EMAIL`: Transactional HTML email delivery simulation with simulated SMTP network latency.
  2. `IMAGE`: CPU-bound image resizing, dimensions scaling, and thumbnail generation simulation.
  3. `REPORT`: Database query aggregation and PDF/CSV export report simulation.
- 📊 **Real-time Monitoring Dashboard**: Live queue depth metrics, task execution inspector, expandable error stack traces, and one-click DLQ re-queue.
- 🌐 **Cloud & Production Ready**: Native support for `REDIS_URL` with TLS (`rediss://`), Upstash Redis, Render Blueprint (`render.yaml`), graceful shutdown (`SIGTERM`/`SIGINT`), and dynamic frontend API configuration.

---

## 📂 Repository Structure

```
distributed-task-queue-engine/
├── backend/                  # Express REST API Server
│   ├── config/redis.js       # Redis client (ioredis + TLS + Upstash support)
│   ├── routes/jobRoutes.js   # Job management & DLQ endpoints
│   ├── routes/metricRoutes.js# Queue metrics endpoint
│   ├── server.js             # Express app entrypoint & CORS
│   └── package.json
├── worker/                   # Standalone Background Worker
│   ├── handlers/             # Email, Image, and Report task handlers
│   ├── queue/retryScheduler.js # Exponential backoff retry scheduler
│   ├── queue/taskQueue.js    # Task queue polling consumer
│   ├── worker.js             # Worker entrypoint with health server
│   └── package.json
├── frontend/                 # React 19 + Vite Dashboard
│   ├── src/                  # App components & live metrics UI
│   ├── nginx.conf            # Reverse proxy config for Docker
│   ├── vercel.json           # SPA routing config for Vercel
│   └── package.json
├── docker-compose.yml        # Multi-container local/VPS deployment
├── render.yaml               # Render 1-click cloud blueprint
└── DEPLOYMENT.md             # Comprehensive deployment guide
```

---

## 🔌 API Endpoint Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Health check status & server timestamp |
| `POST` | `/api/jobs` | Public | Enqueue a new async task with priority & payload |
| `GET` | `/api/jobs` | Public | Fetch all tasks with status, payload, and retry history |
| `POST` | `/api/jobs/dlq/retry` | Public | Move job from Dead-Letter Queue back to `queue:pending` |
| `POST` | `/api/jobs/clear` | Public | Purge completed tasks from Redis storage |
| `GET` | `/api/metrics` | Public | Fetch real-time queue depth & execution metrics |

### Example: Enqueue a Task
```bash
curl -X POST https://your-backend-url.onrender.com/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EMAIL",
    "priority": "HIGH",
    "simulateFailure": false,
    "payload": {
      "to": "user@example.com",
      "subject": "Welcome to Task Queue!"
    }
  }'
```

---

## 🚀 Production Cloud Deployment (Render 1-Click)

The repository includes a ready-to-deploy [`render.yaml`](./render.yaml) Blueprint:

1. **Push your code to GitHub**.
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** → **New +** → **Blueprint**.
3. Select your repository (`distributed-task-queue-engine`).
4. Paste your free **[Upstash Redis](https://upstash.com/)** connection URL (`rediss://default:...@...:6379`) into `REDIS_URL`.
5. Click **Apply** — Render automatically builds and deploys the Backend API, Worker, and Frontend!

*For detailed instructions on Railway, Vercel, and VPS setups, see [**DEPLOYMENT.md**](./DEPLOYMENT.md).*

---

## 🛠️ Local Installation & Development

### Prerequisites
- [Node.js v18+](https://nodejs.org/)
- [Redis v7+](https://redis.io/) (or Docker)

### Option A: Running with Docker Compose

```bash
# 1. Spin up Redis, API, Worker, and Frontend stack
docker compose up --build
```
- **Frontend Dashboard**: `http://localhost:3001`
- **Backend API**: `http://localhost:5001`

---

### Option B: Running Locally (3 Separate Terminals)

1. **Start Redis Server**:
   ```bash
   docker run -d --name task_queue_redis -p 6379:6379 redis:7-alpine
   ```

2. **Start Backend API (Terminal 1)**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start Worker Process (Terminal 2)**:
   ```bash
   cd worker
   npm install
   npm run dev
   ```

4. **Start Frontend Dashboard (Terminal 3)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:3001` in your browser.

