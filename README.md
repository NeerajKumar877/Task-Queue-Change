# ⚡ Distributed Task Queue & Worker Engine

> A high-performance, fault-tolerant asynchronous background task processing engine built with **Node.js, Express, Redis v7, and React 19**. Features atomic queue polling, exponential backoff retries, dead-letter queue (DLQ) isolation, and a real-time monitoring dashboard.

---

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React Frontend Dashboard] -->|POST /api/jobs | API[Express API Server]
    Client -->|GET /api/jobs & /metrics| API
    API -->|Atomic LPUSH| RedisPending[(Redis: queue:pending)]
    Worker[Worker Consumer Process] -->|Atomic RPOPLPUSH| RedisProcessing[(Redis: queue:processing)]
    Worker -->|Execute Task| Handlers[Worker Handlers: Email, Image, Report]
    Handlers -->|Success| Complete[Mark COMPLETED & LREM queue:processing]
    Handlers -->|Error & Attempts < 3| RetryQueue[Redis Sorted Set: queue:retry]
    Handlers -->|Error & Attempts >= 3| DLQQueue[Redis List: queue:dlq]
```

---

## ⚡ Core Engineering Features

- 🔐 **Atomic Queue Operations**: Uses Redis `RPOPLPUSH` to atomically move tasks from `queue:pending` to `queue:processing`. Prevents job loss if a worker crashes mid-execution.
- ⏳ **Exponential Backoff Retries**: Calculates delay $t = 2^{\text{attempts}} \times 1000\text{ms}$ and schedules retries in a Redis Sorted Set (`queue:retry`) using timestamp scores.
- ☠️ **Dead-Letter Queue (DLQ)**: Permanently failed tasks ($\ge 3$ attempts) are safely isolated in `queue:dlq` to prevent poison-pill jobs from blocking system execution.
- 🛠️ **3 Concrete Worker Handlers**:
  1. `EMAIL`: Transactional HTML email delivery simulation.
  2. `IMAGE`: CPU-bound image resizing and avatar thumbnail generation simulation.
  3. `REPORT`: Database query aggregation & PDF report generation simulation.
- 📊 **Real-time Monitoring Dashboard**: Live queue metrics, task execution inspector, expandable error logs, and one-click DLQ re-queue action.

---

## 🔌 API Endpoint Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/jobs` | Public | Enqueue a new async task with priority & payload |
| `GET` | `/api/jobs` | Public | Fetch all tasks with status, payload, and retry history |
| `POST` | `/api/jobs/dlq/retry` | Public | Move job from Dead-Letter Queue back to `queue:pending` |
| `POST` | `/api/jobs/clear` | Public | Purge completed tasks from Redis storage |
| `GET` | `/api/metrics` | Public | Fetch real-time queue depth & execution metrics |

---

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js v18+](https://nodejs.org/)
- [Redis v7+](https://redis.io/) (or Docker)
- [Docker & Docker Compose](https://www.docker.com/)

---

### Option A: Running with Docker Compose (Recommended)

```bash
# 1. Clone & Enter Directory
cd task-queue-engine

# 2. Spin up Redis, API, Worker, and Frontend stack
docker-compose up --build
```
- **Frontend Dashboard**: `http://localhost:3001`
- **Backend API**: `http://localhost:5001`

---

### Option B: Running Locally for Development

1. **Start Redis Server**:
   ```bash
   docker run -d --name task_queue_redis -p 6379:6379 redis:7-alpine
   ```

2. **Start Backend API**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start Worker Process**:
   ```bash
   cd worker
   npm install
   npm run dev
   ```

4. **Start Frontend Dashboard**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
