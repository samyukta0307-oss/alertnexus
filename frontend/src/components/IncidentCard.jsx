import React from 'react';
import {
  AlertCircle,
  Database,
  GitMerge,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useViewMode } from '../context/ViewModeContext';
import { formatMitreTechnique, getMitreDescription } from '../utils/mitre';
import { getAssetPlainSubtitle } from '../utils/assets';
import { getPriorityStyles } from '../utils/theme';
import InfoTooltip from './InfoTooltip';

export { getPriorityStyles };

export default function IncidentCard({ incident, isSelected, isTopRanked = false, onClick }) {
  const { viewMode } = useViewMode();
  const pStyles = getPriorityStyles(incident.priority_bucket);
  const dominantAlert = incident.alerts?.[0] || {};
  const alertType = dominantAlert.alert_type || 'security_event';
  const targetAsset = dominantAlert.asset || 'host';
  const assetSubtitle = getAssetPlainSubtitle(targetAsset);

  // Check if any alert in chain has IOC match or MITRE
  const hasIocMatch = incident.alerts?.some(a => a.ioc_match);
  const mitreTechnique = incident.alerts?.find(a => a.mitre_technique)?.mitre_technique;
  const isChain = (incident.alert_count || 1) >= 2 || (incident.distinct_stages || 1) >= 2;

  return (
    <div
      onClick={() => onClick && onClick(incident)}
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'border-[#5ec8c0] bg-[#342c3d] shadow-[0_0_20px_rgba(94,200,192,0.25)] ring-1 ring-[#5ec8c0]'
          : isTopRanked
          ? `${pStyles.border} ${pStyles.bg} bg-[#312533] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,128,128,0.18)] ring-1 ring-[#e88080]/30`
          : `${pStyles.border} ${pStyles.bg} bg-[#282330] hover:bg-[#322a3b] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(94,200,192,0.1)]`
      }`}
    >
      {/* Asymmetric #1 Spotlight Header (if top ranked incident) */}
      {isTopRanked && (
        <div className="mb-2.5 -mt-1 flex items-center justify-between pb-2 border-b border-[#e88080]/20 font-mono text-[10px]">
          <span className="flex items-center gap-1.5 text-[#e88080] font-extrabold tracking-wider">
            <Flame className="w-3.5 h-3.5 fill-[#e88080]/20" />
            #1 TOP THREAT IN QUEUE
          </span>
          <span className="text-[#a69c93]">HIGHEST URGENCY</span>
        </div>
      )}

      {/* Top Header Row: Priority Badge & Risk Score */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold tracking-wider border ${pStyles.badge}`}>
            {incident.priority_bucket} {pStyles.label}
          </span>
          <span className="font-mono text-xs text-[#a69c93] font-bold group-hover:text-[#5ec8c0] transition-colors">
            {incident.incident_id}
          </span>
        </div>

        {/* Final Risk Score - Dominant weight */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-mono text-[#7d736b] font-bold">RISK</span>
          <span className={`text-xl font-mono font-extrabold tracking-tight ${pStyles.score}`}>
            {incident.score}
          </span>
          <span className="text-[10px] font-mono text-[#7d736b]">/100</span>
        </div>
      </div>

      {/* Target Asset with Plain-Language Subtitle */}
      <div className="mb-2.5">
        <div className="text-xs font-bold text-[#f0eae4] uppercase tracking-wide truncate">
          {alertType.replace(/_/g, ' ')}
        </div>
        <div className="text-[11px] font-mono text-[#a69c93] flex items-center gap-1.5 mt-0.5 truncate">
          <Database className="w-3 h-3 text-[#5ec8c0] shrink-0" />
          <span className="font-semibold text-[#f0eae4] truncate">{targetAsset}</span>
        </div>
        {/* Plain-Language Subtitle */}
        <div className="text-[11px] font-sans text-[#5ec8c0]/90 mt-0.5 italic truncate">
          {assetSubtitle}
        </div>
      </div>

      {/* Summary One-Liner (Plain sentence) */}
      <div className="text-xs font-sans text-[#a69c93] leading-relaxed mb-3 line-clamp-2">
        {incident.summary || 'Correlated security threat group detected by risk engine.'}
      </div>

      {/* SIMPLE VIEW BADGES (Max 2 badges for clarity) */}
      {viewMode === 'simple' ? (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2.5 border-t border-white/10 text-[11px] font-mono">
          {/* Visual cue for connected attack vs isolated alert */}
          {isChain ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md bg-[#e8a87c]/15 text-[#e8a87c] border border-[#e8a87c]/30 font-semibold">
              <GitMerge className="w-3 h-3 text-[#e8a87c]" />
              <span>Linked attack ({incident.alert_count} steps)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#a69c93] border border-white/10 font-medium">
              <span>Isolated alert</span>
            </span>
          )}

          {hasIocMatch ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40 font-bold">
              <AlertCircle className="w-3 h-3 text-[#e88080]" />
              <span>Malicious IP hit</span>
              <InfoTooltip text="Matched a known-malicious IP address from threat intelligence feeds." />
            </span>
          ) : (
            <span className="text-[10px] text-[#7d736b] font-sans flex items-center gap-0.5">
              <span>Investigate</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      ) : (
        /* ANALYST VIEW BADGES (Full technical telemetry depth) */
        <div className="space-y-2 pt-2.5 border-t border-white/10 font-mono text-[11px]">
          {/* MITRE Technique with human-readable name */}
          {mitreTechnique && (
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[#7d736b] text-[10px] uppercase">TECHNIQUE:</span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-[#5ec8c0] border border-white/10 text-[10px] font-bold truncate max-w-[200px] flex items-center gap-1">
                <span>{formatMitreTechnique(mitreTechnique)}</span>
                <InfoTooltip text={getMitreDescription(mitreTechnique)} />
              </span>
            </div>
          )}

          {/* Technical badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {hasIocMatch && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40 font-bold">
                <AlertCircle className="w-3 h-3" />
                <span>IOC MATCH</span>
                <InfoTooltip term="ioc_match" />
              </span>
            )}

            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#a69c93] border border-white/10 flex items-center gap-1">
              <span>{incident.alert_count || 1} correlated</span>
              <InfoTooltip term="correlated_alerts" />
            </span>

            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#a69c93] border border-white/10 flex items-center gap-1">
              <span>{incident.blast_radius?.assets || 1} asset(s)</span>
              <InfoTooltip term="blast_radius" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
