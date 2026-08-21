import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertOctagon, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

export default function JobList({ jobs, onRefresh, apiBaseUrl }) {
  const [filter, setFilter] = useState('ALL');
  const [expandedJobId, setExpandedJobId] = useState(null);

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'ALL') return true;
    return job.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            <Cpu className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'RETRY_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" /> Retry Scheduled
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" /> Failed (DLQ)
          </span>
        );
      default:
        return null;
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/jobs/clear`, { method: 'POST' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to clear completed jobs:', err);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📋</span> Active Queue & Task Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor real-time task lifecycle, payload contents, attempts & error logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearCompleted}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
          >
            Clear Completed
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-slate-800/60">
        {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'RETRY_SCHEDULED', 'FAILED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              filter === tab
                ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          No tasks found matching filter: <span className="font-semibold text-slate-400">{filter}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            return (
              <div
                key={job.id}
                className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 transition hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-300">{job.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-indigo-400 border border-slate-800">
                      {job.type}
                    </span>
                    {job.priority === 'HIGH' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        HIGH PRIORITY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Attempts: <strong className="text-slate-200">{job.attempts}/{job.maxRetries}</strong>
                    </span>
                    {getStatusBadge(job.status)}
                    <button
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-900 text-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Payload Data:</span>
                        <pre className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                          {JSON.stringify(job.payload, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Execution Status / Result:</span>
                        <div className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] font-mono text-emerald-300 border border-slate-800">
                          {job.result ? (
                            <pre className="text-emerald-300">{JSON.stringify(JSON.parse(job.result), null, 2)}</pre>
                          ) : job.lastError ? (
                            <span className="text-rose-400">{job.lastError}</span>
                          ) : (
                            <span className="text-slate-500">Waiting for worker process execution...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Error Logs History if any */}
                    {job.errorLog && job.errorLog.length > 0 && (
                      <div>
                        <span className="text-rose-400 font-semibold block mb-1">
                          Retry & Error History Log:
                        </span>
                        <div className="space-y-1">
                          {job.errorLog.map((err, i) => (
                            <div key={i} className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between">
                              <span>
                                <strong>Attempt #{err.attempt}:</strong> {err.error}
                              </span>
                              <span className="text-[10px] text-rose-400/70">{new Date(err.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
