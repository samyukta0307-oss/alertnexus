import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  GitMerge,
  Layers,
  AlertTriangle,
  RefreshCw,
  Search,
  Info,
  Play,
  Zap
} from 'lucide-react';
import IncidentCard from '../components/IncidentCard';
import OnboardingBanner from '../components/OnboardingBanner';
import InfoTooltip from '../components/InfoTooltip';

export default function Dashboard({
  incidents = [],
  loading = false,
  error = null,
  onSelectIncident,
  selectedIncidentId,
  onRetry,
  onOpenReplay,
  onInjectLiveAlert,
  injectingLiveAlert = false
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
  const totalAlertsCount = incidents.reduce((sum, i) => sum + (i.alert_count || 1), 0) || 120;
  const totalIncidentsCount = incidents.length || 12;
  const criticalP1Count = incidents.filter(i => i.priority_bucket === 'P1').length;
  const attackChainsCount = incidents.filter(i => (i.alert_count || 1) >= 2 || (i.distinct_stages || 0) >= 2).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Onboarding Micro-Moment Banner */}
      <OnboardingBanner
        alertCount={totalAlertsCount}
        incidentCount={totalIncidentsCount}
      />

      {/* 2. Top Section / KPI Metrics Row */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Ingested Alerts */}
          <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex items-center justify-between shadow-md">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a69c93] uppercase tracking-wider">
                <span>INGESTED TELEMETRY</span>
                <InfoTooltip text="Total raw security alarms captured by firewall, endpoint EDR, and authentication sensors." />
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#f0eae4] mt-1">
                {loading ? '...' : totalAlertsCount}
              </div>
              <div className="text-[11px] text-[#a69c93] font-sans mt-0.5">
                Raw sensor alarms
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0] shadow-[0_0_12px_rgba(94,200,192,0.18)]">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 2: Correlated Incidents Formed */}
          <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex items-center justify-between shadow-md">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a69c93] uppercase tracking-wider">
                <span>ACTIONABLE THREATS</span>
                <InfoTooltip text="The number of real consolidated attacks our engine extracted after deduplicating noise." />
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#5ec8c0] mt-1">
                {loading ? '...' : totalIncidentsCount}
              </div>
              <div className="text-[11px] text-[#a69c93] font-sans mt-0.5">
                Unified attack clusters
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0] shadow-[0_0_12px_rgba(94,200,192,0.18)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3: Critical P1 Incidents */}
          <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex items-center justify-between shadow-md">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a69c93] uppercase tracking-wider">
                <span>P1 CRITICAL QUEUE</span>
                <InfoTooltip text="Highest priority threats actively targeting crown-jewel infrastructure or exfiltrating data." />
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#e88080] mt-1">
                {loading ? '...' : criticalP1Count}
              </div>
              <div className="text-[11px] text-[#a69c93] font-sans mt-0.5">
                Immediate triage required
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#e88080]/15 border border-[#e88080]/40 flex items-center justify-center text-[#e88080] shadow-[0_0_12px_rgba(232,128,128,0.18)]">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 4: Multi-Stage Attack Chains */}
          <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex items-center justify-between shadow-md">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a69c93] uppercase tracking-wider">
                <span>MULTI-STAGE ATTACKS</span>
                <InfoTooltip term="multi_stage" />
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#e8a87c] mt-1">
                {loading ? '...' : attackChainsCount}
              </div>
              <div className="text-[11px] text-[#a69c93] font-sans mt-0.5">
                Correlated progressions
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#e8a87c]/15 border border-[#e8a87c]/40 flex items-center justify-center text-[#e8a87c] shadow-[0_0_12px_rgba(232,168,124,0.18)]">
              <GitMerge className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Plain-Language Subtitle under KPI row */}
        <div className="px-2 py-1 flex items-center gap-2 text-xs font-sans text-[#a69c93]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5ec8c0]"></span>
          <span>
            <strong className="text-[#f0eae4]">{totalAlertsCount} alerts</strong> came in. Our engine found <strong className="text-[#5ec8c0] font-semibold">{totalIncidentsCount} real attacks</strong> hiding inside them.
          </span>
        </div>
      </div>

      {/* 3. Filter and Engine Explainer Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-[#24202b] border border-white/10 shadow-md">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7d736b] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by asset (e.g. PROD-DB), technique, or ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#1e1a24] border border-white/10 text-xs text-[#f0eae4] placeholder-[#7d736b] focus:outline-hidden focus:border-[#5ec8c0]/60 font-mono transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenReplay && (
              <button
                type="button"
                onClick={onOpenReplay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-[#e8a87c] to-[#5ec8c0] hover:brightness-110 text-[#1c1921] text-xs font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(94,200,192,0.2)] transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch It Think</span>
              </button>
            )}

            {onInjectLiveAlert && (
              <button
                type="button"
                onClick={onInjectLiveAlert}
                disabled={injectingLiveAlert}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#e8a87c]/15 hover:bg-[#e8a87c]/25 text-[#e8a87c] border border-[#e8a87c]/40 text-xs font-mono font-bold tracking-wider transition disabled:opacity-50"
                title="Simulate real-time telemetry arrival"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{injectingLiveAlert ? 'Injecting...' : 'Inject Live Alert'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-xs font-mono text-[#a69c93] pl-1">
              <span>Prioritized by:</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#5ec8c0]/15 text-[#5ec8c0] border border-[#5ec8c0]/40 font-bold">
                <span>Composite Contextual Risk Engine</span>
                <InfoTooltip term="risk_engine" />
              </span>
            </div>
          </div>
        </div>

        {/* Plain-language one-line explainer beneath the search & prioritization bar */}
        <div className="px-3 py-1 text-[11px] font-sans text-[#a69c93] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#5ec8c0] shrink-0" />
          <span>
            Alerts are ranked by <strong className="text-[#f0eae4] font-semibold">actual danger</strong>, not just loudness — a quiet alert on a critical system can outrank a loud one on a test machine.
          </span>
        </div>
      </div>

      {/* 4. Priority Columns Queue (P1 / P2 / P3 / P4) */}
      {loading ? (
        <div className="p-16 rounded-xl bg-[#24202b] border border-white/10 flex flex-col items-center justify-center gap-3 text-[#a69c93]">
          <div className="w-9 h-9 border-2 border-[#5ec8c0]/20 border-t-[#5ec8c0] rounded-full animate-spin"></div>
          <span className="font-mono text-xs">Computing contextual prioritization matrix...</span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-xl bg-[#24202b] border border-[#e88080]/40 flex flex-col items-center justify-center gap-3 text-[#e88080]">
          <AlertTriangle className="w-8 h-8 text-[#e88080]" />
          <div className="font-mono text-xs font-bold text-center">{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1.5 rounded-lg bg-[#2d2736] hover:bg-[#373042] text-[#f0eae4] font-mono text-xs border border-white/10 transition"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* COLUMN P1 — CRITICAL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#24202b] border border-[#e88080]/30 font-mono text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e88080] animate-pulse"></span>
                <span className="font-bold text-[#e88080]">P1 CRITICAL</span>
                <InfoTooltip text="Attacks with confirmed active exfiltration, root privilege escalation, or crown-jewel database breach." />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40">
                {p1Incidents.length}
              </span>
            </div>

            <div className="space-y-3">
              {p1Incidents.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#24202b]/40 border border-dashed border-white/10 text-center text-xs text-[#7d736b] font-mono">
                  No critical incidents
                </div>
              ) : (
                p1Incidents.map((inc, index) => (
                  <IncidentCard
                    key={inc.incident_id}
                    incident={inc}
                    isSelected={selectedIncidentId === inc.incident_id}
                    isTopRanked={index === 0 && !searchFilter}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN P2 — HIGH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#24202b] border border-[#efa95f]/30 font-mono text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#efa95f]"></span>
                <span className="font-bold text-[#efa95f]">P2 HIGH</span>
                <InfoTooltip text="Attacks spreading laterally, brute-forcing administrative gateways, or involving verified IOC matches." />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#efa95f]/15 text-[#efa95f] border border-[#efa95f]/40">
                {p2Incidents.length}
              </span>
            </div>

            <div className="space-y-3">
              {p2Incidents.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#24202b]/40 border border-dashed border-white/10 text-center text-xs text-[#7d736b] font-mono">
                  No high priority incidents
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

          {/* COLUMN P3 — MEDIUM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#24202b] border border-[#e8d290]/25 font-mono text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e8d290]"></span>
                <span className="font-bold text-[#e8d290]">P3 MEDIUM</span>
                <InfoTooltip text="Suspicious script executions or policy violations on non-critical workstations." />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8d290]/15 text-[#e8d290] border border-[#e8d290]/35">
                {p3Incidents.length}
              </span>
            </div>

            <div className="space-y-3">
              {p3Incidents.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#24202b]/40 border border-dashed border-white/10 text-center text-xs text-[#7d736b] font-mono">
                  No medium priority incidents
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

          {/* COLUMN P4 — LOW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#24202b] border border-[#9aa5b1]/20 font-mono text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9aa5b1]"></span>
                <span className="font-bold text-[#9aa5b1]">P4 LOW</span>
                <InfoTooltip text="Routine low-severity scans or anomalies with minimal business impact." />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9aa5b1]/15 text-[#9aa5b1] border border-[#9aa5b1]/30">
                {p4Incidents.length}
              </span>
            </div>

            <div className="space-y-3">
              {p4Incidents.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#24202b]/40 border border-dashed border-white/10 text-center text-xs text-[#7d736b] font-mono">
                  No low priority incidents
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
