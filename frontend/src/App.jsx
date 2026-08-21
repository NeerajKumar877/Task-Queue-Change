import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Activity, Server, Database, Play, CheckCircle2, ShieldCheck, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import MetricCards from './components/MetricCards';
import JobSubmitForm from './components/JobSubmitForm';
import JobList from './components/JobList';
import DLQTable from './components/DLQTable';

const rawApiUrl = import.meta.env.VITE_API_URL;
const defaultApiUrl = rawApiUrl
  ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') ? rawApiUrl : `https://${rawApiUrl}`)
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : '');

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('TASK_QUEUE_API_URL') || defaultApiUrl;
    }
    return defaultApiUrl;
  });

  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiBaseUrl);
  const [isServerWaking, setIsServerWaking] = useState(false);

  const handleSaveApiUrl = (e) => {
    e?.preventDefault();
    let cleaned = tempUrl.trim();
    if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    localStorage.setItem('TASK_QUEUE_API_URL', cleaned);
    setApiBaseUrl(cleaned);
    setShowConfig(false);
    setLoading(true);
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl || ''}/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setIsServerWaking(false);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      if (!metrics) {
        setIsServerWaking(true);
      }
    }
  }, [apiBaseUrl, metrics]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl || ''}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMetrics(), fetchJobs()]);
  }, [fetchMetrics, fetchJobs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll, apiBaseUrl]);

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

          <div className="flex items-center gap-3">
            {/* API Connection Indicator & Config Button */}
            <button
              onClick={() => {
                setTempUrl(apiBaseUrl);
                setShowConfig(true);
              }}
              title="Click to view or change Backend API URL"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                metrics
                  ? 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-indigo-500/50'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${metrics ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">
                {apiBaseUrl ? apiBaseUrl.replace(/^https?:\/\//, '') : 'Configure API URL'}
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Polling Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Live Polling ON' : 'PAUSED'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Backend Connecting / Cold Start Notification Banner */}
      {!metrics && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>
                <strong>Connecting to Backend:</strong> If your Render service was sleeping, it takes ~30-40s to wake up.
              </span>
            </div>
            <button
              onClick={() => {
                setTempUrl(apiBaseUrl);
                setShowConfig(true);
              }}
              className="underline font-bold text-amber-300 hover:text-white"
            >
              Change / Verify Backend API URL
            </button>
          </div>
        </div>
      )}

      {/* API Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Backend API Connection URL
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Enter your deployed Render backend URL (e.g. <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">https://task-queue-backend-xxxx.onrender.com</code>):
            </p>
            <form onSubmit={handleSaveApiUrl} className="space-y-4">
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://task-queue-backend.onrender.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Metric Cards Header */}
        <MetricCards metrics={metrics} />

        {/* Form and DLQ Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-8">
            <JobSubmitForm onJobSubmitted={refreshAll} apiBaseUrl={apiBaseUrl} />
          </div>

          <div className="lg:col-span-6 space-y-8">
            <DLQTable jobs={jobs} onRefresh={refreshAll} apiBaseUrl={apiBaseUrl} />

            {/* Architecture Explainer Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Technical Depth & Architecture Key Points
              </h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Atomic Queuing</strong>: Uses Redis <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">RPOPLPUSH</code> to atomically pop tasks from pending to processing.</span>
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
        <JobList jobs={jobs} onRefresh={refreshAll} apiBaseUrl={apiBaseUrl} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Distributed Task Queue & Worker Engine • Built with Node.js, Express, Redis & React
      </footer>
    </div>
  );
}

