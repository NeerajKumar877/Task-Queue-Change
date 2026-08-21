import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Activity, Server, Database, Play, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import MetricCards from './components/MetricCards';
import JobSubmitForm from './components/JobSubmitForm';
import JobList from './components/JobList';
import DLQTable from './components/DLQTable';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : '');

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMetrics(), fetchJobs()]);
  }, [fetchMetrics, fetchJobs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Real-time polling loop (runs only when active and tab is visible)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshAll();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Distributed Task Queue Engine
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Redis v7 + Node.js
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Atomic Polling • Exponential Backoff Retries • Dead-Letter Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live Polling ON (2s)' : 'Live Polling PAUSED'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Metric Cards Header */}
        <MetricCards metrics={metrics} />

        {/* Form and DLQ Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-8">
            <JobSubmitForm onJobSubmitted={refreshAll} apiBaseUrl={API_BASE_URL} />
          </div>

          <div className="lg:col-span-6 space-y-8">
            <DLQTable jobs={jobs} onRefresh={refreshAll} apiBaseUrl={API_BASE_URL} />

            {/* Architecture Explainer Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Technical Depth & Architecture Key Points
              </h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Atomic Queuing</strong>: Uses Redis <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">BLMOVE</code> to atomically pop tasks from pending to processing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Exponential Backoff</strong>: Failed tasks trigger delay schedule (t = 2ⁿ × 1000 ms) in Redis Sorted Sets (<code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">queue:retry</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Dead-Letter Queue</strong>: Permanent failures (&ge; 3 attempts) isolate to <code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">queue:dlq</code> for safety.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Queue & Task Inspector */}
        <JobList jobs={jobs} onRefresh={refreshAll} apiBaseUrl={API_BASE_URL} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Distributed Task Queue & Worker Engine • Built with Node.js, Express, Redis & React
      </footer>
    </div>
  );
}
