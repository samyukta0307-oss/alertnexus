import React from 'react';
import { Shield, AlertCircle, Cpu, Network, Database } from 'lucide-react';

export function getPriorityStyles(priority) {
  switch (priority) {
    case 'P1':
      return {
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
        border: 'border-rose-900/40 hover:border-rose-500/60',
        score: 'text-rose-400',
        dot: 'bg-rose-500',
        bg: 'bg-rose-950/10'
      };
    case 'P2':
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
        border: 'border-amber-900/40 hover:border-amber-500/60',
        score: 'text-amber-400',
        dot: 'bg-amber-500',
        bg: 'bg-amber-950/10'
      };
    case 'P3':
      return {
        badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
        border: 'border-yellow-900/30 hover:border-yellow-500/50',
        score: 'text-yellow-400',
        dot: 'bg-yellow-500',
        bg: 'bg-yellow-950/10'
      };
    case 'P4':
    default:
      return {
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        border: 'border-slate-800/80 hover:border-slate-700',
        score: 'text-slate-400',
        dot: 'bg-slate-500',
        bg: 'bg-slate-900/20'
      };
  }
}

export default function IncidentCard({ incident, isSelected, onClick }) {
  const pStyles = getPriorityStyles(incident.priority_bucket);
  const dominantAlert = incident.alerts?.[0] || {};
  const alertType = dominantAlert.alert_type || 'security_event';
  const targetAsset = dominantAlert.asset || 'host';

  // Check if any alert in chain has IOC match or MITRE
  const hasIocMatch = incident.alerts?.some(a => a.ioc_match);
  const mitreTechnique = incident.alerts?.find(a => a.mitre_technique)?.mitre_technique;
  const attackStage = dominantAlert.attack_stage || incident.distinct_stages > 0 ? `${incident.distinct_stages} Stages` : null;

  return (
    <div
      onClick={() => onClick && onClick(incident)}
      className={`relative p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-cyan-500/80 bg-slate-900 shadow-[0_0_16px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50'
          : `${pStyles.border} ${pStyles.bg} bg-[#11141a] hover:bg-[#151922]`
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${pStyles.badge}`}>
            {incident.priority_bucket} {incident.priority_bucket === 'P1' ? 'CRITICAL' : incident.priority_bucket === 'P2' ? 'HIGH' : incident.priority_bucket === 'P3' ? 'MEDIUM' : 'LOW'}
          </span>
          <span className="font-mono text-xs text-slate-400 font-semibold">
            {incident.incident_id}
          </span>
        </div>

        {/* Final Risk Score */}
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-mono text-slate-500">RISK</span>
          <span className={`text-base font-mono font-extrabold ${pStyles.score}`}>
            {incident.score}
          </span>
        </div>
      </div>

      {/* Dominant Alert Type & Target Asset */}
      <div className="mb-2">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wide truncate">
          {alertType.replace(/_/g, ' ')}
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
          <Database className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate">{targetAsset}</span>
        </div>
      </div>

      {/* Summary One-Liner (Phase 5) */}
      <div className="text-[11px] text-slate-300/90 leading-relaxed mb-3 line-clamp-2">
        {incident.summary || 'Correlated security event group.'}
      </div>

      {/* Footer Tags & Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
        {/* Correlated alerts count */}
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
          <Network className="w-2.5 h-2.5 text-cyan-400" />
          {incident.alert_count} {incident.alert_count === 1 ? 'alert' : 'correlated'}
        </span>

        {/* MITRE Technique Badge */}
        {mitreTechnique && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-800/50">
            {mitreTechnique}
          </span>
        )}

        {/* IOC Match Badge */}
        {hasIocMatch && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 font-bold">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            IOC MATCH
          </span>
        )}

        {/* Blast Radius Asset Count if > 1 */}
        {incident.blast_radius?.assets > 1 && (
          <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">
            {incident.blast_radius.assets} assets
          </span>
        )}
      </div>
    </div>
  );
}

