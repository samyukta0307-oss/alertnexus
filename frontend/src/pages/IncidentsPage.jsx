import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowUpDown,
  Network,
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getPriorityStyles } from '../components/IncidentCard';

export default function IncidentsPage({ incidents = [], loading = false, onSelectIncident }) {
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'alerts' | 'recent'

  const filtered = incidents.filter(inc => {
    if (filterPriority !== 'ALL' && inc.priority_bucket !== filterPriority) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const dominantAlert = inc.alerts?.[0] || {};
    return (
      inc.incident_id?.toLowerCase().includes(q) ||
      dominantAlert.asset?.toLowerCase().includes(q) ||
      dominantAlert.alert_type?.toLowerCase().includes(q) ||
      dominantAlert.user_account?.toLowerCase().includes(q) ||
      inc.summary?.toLowerCase().includes(q)
    );
  });

  filtered.sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'alerts') return b.alert_count - a.alert_count;
    if (sortBy === 'recent') return new Date(b.last_alert_at) - new Date(a.last_alert_at);
    return 0;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0e1218] border border-slate-800">
        <div>
          <h1 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            INCIDENTS TRIAGE & INVESTIGATION QUEUE
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Full contextual security event clusters prioritized by composite blast radius and attack stage.
          </p>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {['ALL', 'P1', 'P2', 'P3', 'P4'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-md transition font-bold ${
                filterPriority === p
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Sort Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, asset hostname, user, or MITRE..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0e1218] border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">SORT BY:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-1.5 rounded bg-[#0e1218] border border-slate-800 text-slate-300 focus:outline-hidden focus:border-cyan-500/60"
          >
            <option value="score">Risk Score (Desc)</option>
            <option value="alerts">Correlated Alerts Count</option>
            <option value="recent">Most Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="rounded-xl bg-[#0e1218] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#111620] border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Dominant Threat</th>
                <th className="py-3 px-4">Primary Asset</th>
                <th className="py-3 px-4">Chain Depth</th>
                <th className="py-3 px-4">Blast Radius</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    Loading incident queue...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    No incidents matched the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(inc => {
                  const pStyles = getPriorityStyles(inc.priority_bucket);
                  const top = inc.alerts?.[0] || {};
                  return (
                    <tr
                      key={inc.incident_id}
                      onClick={() => onSelectIncident(inc.incident_id)}
                      className="hover:bg-[#151a24] cursor-pointer transition select-none group"
                    >
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pStyles.badge}`}>
                          {inc.priority_bucket}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white group-hover:text-cyan-400 transition">
                        {inc.incident_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-extrabold ${pStyles.score}`}>
                          {inc.score}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-200">
                        {top.alert_type?.replace(/_/g, ' ') || 'security_alert'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{top.asset || 'host'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                          <Network className="w-2.5 h-2.5 text-cyan-400" />
                          {inc.alert_count} alert(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {inc.blast_radius?.assets || 1} asset(s)
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold">
                          Investigate <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

