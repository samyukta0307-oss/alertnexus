import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  GitMerge,
  Layers,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Search,
  Filter
} from 'lucide-react';
import IncidentCard from '../components/IncidentCard';

export default function Dashboard({
  incidents = [],
  loading = false,
  error = null,
  onSelectIncident,
  selectedIncidentId,
  onRetry
}) {
  const [searchFilter, setSearchFilter] = useState('');

  // Filter incidents by search text if provided
  const filteredIncidents = incidents.filter(inc => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const dominantAlert = inc.alerts?.[0] || {};
    return (
      inc.incident_id?.toLowerCase().includes(q) ||
      dominantAlert.asset?.toLowerCase().includes(q) ||
      dominantAlert.alert_type?.toLowerCase().includes(q) ||
      inc.summary?.toLowerCase().includes(q)
    );
  });

  // Split into priority buckets
  const p1Incidents = filteredIncidents.filter(i => i.priority_bucket === 'P1');
  const p2Incidents = filteredIncidents.filter(i => i.priority_bucket === 'P2');
  const p3Incidents = filteredIncidents.filter(i => i.priority_bucket === 'P3');
  const p4Incidents = filteredIncidents.filter(i => i.priority_bucket === 'P4');

  // KPI Calculations from real backend data
  const totalAlertsCount = incidents.reduce((sum, i) => sum + (i.alert_count || 1), 0);
  const totalIncidentsCount = incidents.length;
  const criticalP1Count = incidents.filter(i => i.priority_bucket === 'P1').length;
  const attackChainsCount = incidents.filter(i => (i.alert_count || 1) >= 2 || i.distinct_stages >= 2).length;

  return (
    <div className="space-y-6">
      {/* Top Section / KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Ingested Alerts */}
        <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              CORRELATED TELEMETRY
            </div>
            <div className="text-2xl font-mono font-extrabold text-white mt-1">
              {loading ? '...' : totalAlertsCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Ingested Alerts in Graph
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Active Incidents */}
        <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              ACTIVE INCIDENTS
            </div>
            <div className="text-2xl font-mono font-extrabold text-white mt-1">
              {loading ? '...' : totalIncidentsCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Connected Threat Clusters
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Critical P1 */}
        <div className="p-4 rounded-xl bg-[#0e1218] border border-rose-950/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-rose-400 uppercase tracking-wider font-bold">
              CRITICAL P1 THREATS
            </div>
            <div className="text-2xl font-mono font-extrabold text-rose-400 mt-1">
              {loading ? '...' : criticalP1Count}
            </div>
            <div className="text-[10px] text-rose-300/70 font-mono mt-0.5">
              Immediate Triage Required
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Attack Chains */}
        <div className="p-4 rounded-xl bg-[#0e1218] border border-purple-950/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-purple-300 uppercase tracking-wider font-bold">
              MULTI-STAGE CHAINS
            </div>
            <div className="text-2xl font-mono font-extrabold text-purple-300 mt-1">
              {loading ? '...' : attackChainsCount}
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono mt-0.5">
              Correlated Attack Progressions
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <GitMerge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-[#0e1218] border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter incidents by asset, MITRE, or type..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#0a0c10] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500/60 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Prioritized by:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-bold">
            Composite Contextual Risk Engine
          </span>
        </div>
      </div>

      {/* Priority Columns Queue (P1 / P2 / P3 / P4) */}
      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Prioritizing incidents across threat graph...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold">Failed to load incident priority queue</div>
              <div className="mt-1 text-slate-400">{error}</div>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RETRY CONNECTION</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* COLUMN 1: P1 Critical */}
          <div className="space-y-3 p-3 rounded-xl bg-[#0e1218]/90 border border-rose-900/40">
            <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                <span className="font-mono text-xs font-extrabold tracking-wider text-rose-400">
                  P1 CRITICAL
                </span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 font-bold">
                {p1Incidents.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {p1Incidents.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  NO P1 INCIDENTS
                </div>
              ) : (
                p1Incidents.map(inc => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    isSelected={selectedIncidentId === inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: P2 High */}
          <div className="space-y-3 p-3 rounded-xl bg-[#0e1218]/90 border border-amber-900/40">
            <div className="flex items-center justify-between pb-2 border-b border-amber-900/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                <span className="font-mono text-xs font-extrabold tracking-wider text-amber-400">
                  P2 HIGH
                </span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 font-bold">
                {p2Incidents.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {p2Incidents.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  NO P2 INCIDENTS
                </div>
              ) : (
                p2Incidents.map(inc => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    isSelected={selectedIncidentId === inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: P3 Medium */}
          <div className="space-y-3 p-3 rounded-xl bg-[#0e1218]/90 border border-yellow-900/30">
            <div className="flex items-center justify-between pb-2 border-b border-yellow-900/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="font-mono text-xs font-extrabold tracking-wider text-yellow-400">
                  P3 MEDIUM
                </span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-yellow-950/50 text-yellow-300 border border-yellow-800/40 font-bold">
                {p3Incidents.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {p3Incidents.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  NO P3 INCIDENTS
                </div>
              ) : (
                p3Incidents.map(inc => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    isSelected={selectedIncidentId === inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 4: P4 Low */}
          <div className="space-y-3 p-3 rounded-xl bg-[#0e1218]/90 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span className="font-mono text-xs font-extrabold tracking-wider text-slate-400">
                  P4 LOW (NOISE)
                </span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                {p4Incidents.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {p4Incidents.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  NO P4 INCIDENTS
                </div>
              ) : (
                p4Incidents.map(inc => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    isSelected={selectedIncidentId === inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

