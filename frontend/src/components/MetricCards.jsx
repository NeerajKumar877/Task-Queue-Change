import React from 'react';
import { Clock, Cpu, CheckCircle2, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

export default function MetricCards({ metrics }) {
  const cards = [
    {
      title: 'Total Tasks',
      value: metrics?.total || 0,
      icon: Layers,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Pending Queue',
      value: metrics?.pending || 0,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Active Processing',
      value: metrics?.processing || 0,
      icon: Cpu,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      pulse: metrics?.processing > 0,
    },
    {
      title: 'Completed',
      value: metrics?.completed || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Retry Scheduled',
      value: metrics?.retryScheduled || 0,
      icon: RefreshCw,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Dead-Letter (DLQ)',
      value: metrics?.dlq || 0,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      alert: metrics?.dlq > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`glass-card glass-card-hover rounded-2xl p-4 flex flex-col justify-between border ${
              card.alert ? 'border-rose-500/40 bg-rose-950/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.bgColor}`}>
                <IconComponent className={`w-4 h-4 ${card.color} ${card.pulse ? 'animate-spin' : ''}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-white tracking-tight">
                {card.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
