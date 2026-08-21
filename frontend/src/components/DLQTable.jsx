import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function DLQTable({ jobs, onRefresh, apiBaseUrl }) {
  const [retryingJobId, setRetryingJobId] = useState(null);

  const dlqJobs = jobs.filter((job) => job.status === 'FAILED');

  const handleRetryDLQ = async (jobId) => {
    setRetryingJobId(jobId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/jobs/dlq/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('DLQ Retry Error:', err);
    } finally {
      setRetryingJobId(null);
    }
  };

  if (dlqJobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-slate-800 text-center py-8">
        <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-white">Dead-Letter Queue (DLQ) is Empty</h3>
        <p className="text-xs text-slate-400 mt-1">
          No permanently failed tasks currently requiring manual intervention.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-rose-500/30 bg-rose-950/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Dead-Letter Queue (DLQ) Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tasks that exceeded maximum exponential backoff retries (3/3). Manual re-queue available.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {dlqJobs.length} Failed Tasks
        </span>
      </div>

      <div className="space-y-3">
        {dlqJobs.map((job) => (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-rose-300">{job.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-rose-400 border border-rose-900">
                  {job.type}
                </span>
              </div>
              <p className="text-xs text-rose-200/90 font-medium">
                Last Error: {job.lastError || 'Task failure exceeded retry threshold'}
              </p>
            </div>

            <button
              onClick={() => handleRetryDLQ(job.id)}
              disabled={retryingJobId === job.id}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retryingJobId === job.id ? 'animate-spin' : ''}`} />
              {retryingJobId === job.id ? 'Re-queuing...' : 'Re-queue Task'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
