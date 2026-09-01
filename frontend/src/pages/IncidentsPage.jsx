import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  ExternalLink,
  ChevronRight,
  GitMerge
} from 'lucide-react';
import { getPriorityStyles } from '../utils/theme';
import { getAssetPlainSubtitle } from '../utils/assets';
import { formatMitreTechnique, getMitreDescription } from '../utils/mitre';
import InfoTooltip from '../components/InfoTooltip';

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
    <div className="space-y-5 max-w-7xl mx-auto font-sans text-[#f0eae4]">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#24202b] border border-white/10 shadow-md">
        <div>
          <h1 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#5ec8c0]" />
            INCIDENTS TRIAGE & INVESTIGATION QUEUE
          </h1>
          <p className="text-xs text-[#a69c93] font-sans mt-0.5">
            Full contextual security event clusters prioritized by composite blast radius and attack stage.
          </p>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {['ALL', 'P1', 'P2', 'P3', 'P4'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg transition-all duration-150 font-bold ${
                filterPriority === p
                  ? 'bg-[#5ec8c0] text-[#1c1921] shadow-[0_0_12px_rgba(94,200,192,0.3)]'
                  : 'bg-[#1e1a24] text-[#a69c93] hover:text-[#f0eae4] hover:bg-[#373042]'
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
          <Search className="w-4 h-4 text-[#7d736b] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, asset hostname, user, or technique..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#24202b] border border-white/10 text-[#f0eae4] placeholder-[#7d736b] focus:outline-hidden focus:border-[#5ec8c0]/60 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#a69c93]">SORT BY:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-1.5 rounded-lg bg-[#24202b] border border-white/10 text-[#f0eae4] focus:outline-hidden focus:border-[#5ec8c0]/60"
          >
            <option value="score">Risk Score (Desc)</option>
            <option value="alerts">Correlated Alerts Count</option>
            <option value="recent">Most Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Incidents Table View */}
      <div className="rounded-xl border border-white/10 bg-[#24202b] overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#a69c93] font-mono text-xs">
            <div className="w-8 h-8 border-2 border-[#5ec8c0]/20 border-t-[#5ec8c0] rounded-full animate-spin"></div>
            <span>Fetching correlated incident catalog...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-[#7d736b] font-mono text-xs">
            No security incidents matched the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#1e1a24] text-[#a69c93] uppercase tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Primary Threat & Asset</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      <span>MITRE Technique</span>
                      <InfoTooltip term="mitre" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <span>Chain</span>
                      <InfoTooltip term="correlated_alerts" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <span>Blast</span>
                      <InfoTooltip term="blast_radius" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <span>Composite Risk</span>
                      <InfoTooltip term="base_risk" />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(inc => {
                  const pStyles = getPriorityStyles(inc.priority_bucket);
                  const dominantAlert = inc.alerts?.[0] || {};
                  const assetSubtitle = getAssetPlainSubtitle(dominantAlert.asset);
                  const isChain = (inc.alert_count || 1) >= 2;
                  const mitreTechnique = dominantAlert.mitre_technique;
                  return (
                    <tr
                      key={inc.incident_id}
                      onClick={() => onSelectIncident(inc.incident_id)}
                      className="hover:bg-[#2d2736] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${pStyles.badge}`}>
                          {inc.priority_bucket}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-[#f0eae4] group-hover:text-[#5ec8c0] transition-colors whitespace-nowrap">
                        {inc.incident_id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#f0eae4] uppercase truncate max-w-xs">
                          {dominantAlert.alert_type?.replace(/_/g, ' ') || 'Security Threat'}
                        </div>
                        <div className="text-[11px] text-[#a69c93] flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[#f0eae4]">{dominantAlert.asset || 'N/A'}</span>
                          <span className="text-[#7d736b]">•</span>
                          <span className="text-[#5ec8c0]/90 font-sans italic">{assetSubtitle}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#5ec8c0] font-semibold truncate max-w-[190px]">
                        {mitreTechnique ? (
                          <span title={getMitreDescription(mitreTechnique)}>
                            {formatMitreTechnique(mitreTechnique)}
                          </span>
                        ) : (
                          <span className="text-[#7d736b]">N/A</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isChain ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#e8a87c]/15 text-[#e8a87c] text-[10px] font-bold border border-[#e8a87c]/30">
                            <GitMerge className="w-3 h-3" />
                            <span>{inc.alert_count}</span>
                          </span>
                        ) : (
                          <span className="text-[#7d736b]">1</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap text-[#a69c93]">
                        {inc.blast_radius?.assets || 1} host(s)
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`text-sm font-extrabold ${pStyles.score}`}>
                          {inc.score}
                        </span>
                        <span className="text-[10px] text-[#7d736b] ml-1">/100</span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(inc.incident_id);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-[#a69c93] hover:text-[#5ec8c0] transition inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>Investigate</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
