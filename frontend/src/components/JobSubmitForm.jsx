import React, { useState } from 'react';
import { Send, Mail, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';

export default function JobSubmitForm({ onJobSubmitted, apiBaseUrl }) {
  const [type, setType] = useState('EMAIL');
  const [priority, setPriority] = useState('NORMAL');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Payload state based on type
  const [emailTo, setEmailTo] = useState('user@company.com');
  const [emailSubject, setEmailSubject] = useState('Monthly Financial Statement');

  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde');
  const [imgWidth, setImgWidth] = useState(500);

  const [reportType, setReportType] = useState('TAX_AUDIT_EXPORTS');
  const [format, setFormat] = useState('PDF');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    let payload = {};
    if (type === 'EMAIL') {
      payload = { to: emailTo, subject: emailSubject };
    } else if (type === 'IMAGE') {
      payload = { imageUrl, width: parseInt(imgWidth, 10), height: parseInt(imgWidth, 10) };
    } else if (type === 'REPORT') {
      payload = { reportType, format };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${apiBaseUrl}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          type,
          priority,
          simulateFailure,
          payload,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Job ${data.job.id} enqueued successfully!` });
        if (onJobSubmitted) onJobSubmitted();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enqueue job' });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      setMessage({
        type: 'error',
        text: isTimeout
          ? 'Server request timed out. Please restart Terminal 1 (Backend API).'
          : 'Network error submitting job.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⚡</span> Dispatch New Worker Task
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit async tasks to the Redis Queue & test worker handlers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Type Buttons */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">Worker Task Type</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'EMAIL', label: 'Email Task', icon: Mail, color: 'text-amber-400' },
              { id: 'IMAGE', label: 'Image Process', icon: ImageIcon, color: 'text-cyan-400' },
              { id: 'REPORT', label: 'Report Gen', icon: FileText, color: 'text-emerald-400' },
            ].map((item) => {
              const Icon = item.icon;
              const active = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${
                    active
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${item.color}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Task Configuration Fields */}
        {type === 'EMAIL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Recipient Email</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Email Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>
        )}

        {type === 'IMAGE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Size (px)</label>
              <input
                type="number"
                value={imgWidth}
                onChange={(e) => setImgWidth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>
        )}

        {type === 'REPORT' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Report Category</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="TAX_AUDIT_EXPORTS">Tax & Audit Export</option>
                <option value="QUARTERLY_REVENUE">Quarterly Revenue</option>
                <option value="USER_ANALYTICS_CSV">User Analytics Digest</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Output Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="PDF">PDF Document</option>
                <option value="CSV">CSV Spreadsheet</option>
              </select>
            </div>
          </div>
        )}

        {/* Priority & Failure Simulation Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority (Push Front)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <input
                type="checkbox"
                id="simulateFailure"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-rose-500/20"
              />
              <label htmlFor="simulateFailure" className="text-xs font-medium text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Simulate Worker Error (Test Retries & DLQ)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Enqueuing...' : 'Enqueue Task'}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-medium ${
              message.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
