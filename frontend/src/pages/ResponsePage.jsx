import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Flame,
  Play,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import {
  getRankedIncidents,
  getIncidentPlaybook,
  simulateContainment
} from '../api/client';
import { getPriorityStyles } from '../utils/theme';
import InfoTooltip from '../components/InfoTooltip';

export default function ResponsePage({ onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [playbook, setPlaybook] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [containmentResult, setContainmentResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    getRankedIncidents()
      .then(data => {
        setIncidents(data);
        if (data.length > 0) {
          setSelectedIncidentId(data[0].incident_id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedIncidentId) return;

    setLoadingPlaybook(true);
    setContainmentResult(null);

    getIncidentPlaybook(selectedIncidentId)
      .then(res => {
        setPlaybook(res);
        setLoadingPlaybook(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingPlaybook(false);
      });
  }, [selectedIncidentId]);

  const handleSimulate = async () => {
    if (!selectedIncidentId) return;
    try {
      setSimulating(true);
      const res = await simulateContainment(selectedIncidentId);
      setContainmentResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const selectedIncident = incidents.find(i => i.incident_id === selectedIncidentId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[#f0eae4]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#24202b] border border-white/10 shadow-md">
        <div>
          <h1 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#8fbf9f]" />
            INCIDENT RESPONSE & PLAYBOOK ORCHESTRATION
          </h1>
          <p className="text-xs text-[#a69c93] font-sans mt-0.5">
            Automated mitigation recommendations matched against MITRE tactics and asset sensitivity.
          </p>
        </div>
      </div>

      {/* Incident Selector */}
      <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 space-y-2 font-mono text-xs shadow-sm">
        <label className="text-[#a69c93] font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Active Incident Under Response:</span>
          {selectedIncident && (
            <span className="text-[#a69c93]">
              Risk: <strong className="text-[#f0eae4]">{selectedIncident.score}</strong> ({selectedIncident.priority_bucket})
            </span>
          )}
        </label>
        <select
          value={selectedIncidentId}
          onChange={(e) => setSelectedIncidentId(e.target.value)}
          className="w-full p-2.5 rounded-lg bg-[#1e1a24] border border-white/10 text-[#f0eae4] focus:outline-hidden focus:border-[#5ec8c0]/60 transition"
        >
          {incidents.map(inc => (
            <option key={inc.incident_id} value={inc.incident_id}>
              {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — {inc.summary || inc.alerts?.[0]?.asset}
            </option>
          ))}
        </select>
      </div>

      {/* Playbook Content Card */}
      {selectedIncident && (
        <div className="p-6 rounded-xl bg-[#24202b] border border-white/10 space-y-6 shadow-2xl">
          {/* Top Playbook Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#a69c93]">RECOMMENDED PLAYBOOK:</span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#8fbf9f]/15 text-[#8fbf9f] border border-[#8fbf9f]/40">
                  {playbook?.playbookName || 'Standard Triage'}
                </span>
                <InfoTooltip term="playbook" />
              </div>
              <div className="text-[11px] font-mono text-[#a69c93] mt-1">
                Triggered Rule: <code className="text-[#5ec8c0]">{playbook?.matchedRule || 'default'}</code>
              </div>
            </div>

            <button
              onClick={() => onSelectIncident(selectedIncident.incident_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d2736] hover:bg-[#373042] text-[#f0eae4] text-xs font-mono font-semibold transition border border-white/10"
            >
              <span>Full Investigation</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5ec8c0]" />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[#a69c93] font-bold uppercase tracking-wider">
              Ordered Response Procedures:
            </div>

            {loadingPlaybook ? (
              <div className="py-6 text-center text-[#7d736b]">Loading playbook actions...</div>
            ) : (
              <ol className="space-y-2.5">
                {playbook?.actions?.map((act, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 flex items-start gap-3 text-[#f0eae4] font-sans text-xs hover:border-white/15 transition"
                  >
                    <span className="font-mono text-xs font-bold text-[#5ec8c0] px-2 py-0.5 rounded bg-[#5ec8c0]/15 border border-[#5ec8c0]/35 shrink-0">
                      STEP {idx + 1}
                    </span>
                    <span className="leading-relaxed mt-0.5">{act}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Containment Simulator Action Block */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#f0eae4]">
                <Flame className="w-4 h-4 text-[#efa95f]" />
                <span>ACTIVE CONTAINMENT VALIDATION</span>
                <InfoTooltip term="containment" />
              </div>
            </div>

            {!containmentResult ? (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-3 rounded-lg bg-[#5ec8c0] hover:bg-[#4eb8b0] active:bg-[#3ea8a0] disabled:opacity-50 text-[#1c1921] font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(94,200,192,0.25)]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{simulating ? 'Simulating Host Isolation...' : 'SIMULATE CONTAINMENT ON THIS INCIDENT'}</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-[#1e1a24] border border-[#8fbf9f]/40 space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[#8fbf9f] font-bold">CONTAINMENT IMPACT RESULTS</span>
                  <button
                    onClick={() => setContainmentResult(null)}
                    className="flex items-center gap-1 text-[10px] text-[#a69c93] hover:text-[#f0eae4] transition"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#24202b] border border-white/10">
                    <div className="text-[10px] text-[#a69c93]">BEFORE ISOLATION</div>
                    <div className="text-lg font-extrabold text-[#e88080] mt-1">
                      {containmentResult.before.finalScore} ({containmentResult.before.priorityBucket})
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#8fbf9f]/15 border border-[#8fbf9f]/40">
                    <div className="text-[10px] text-[#8fbf9f] font-bold">AFTER ISOLATION</div>
                    <div className="text-lg font-extrabold text-[#8fbf9f] mt-1">
                      {containmentResult.after.finalScore} ({containmentResult.after.priorityBucket})
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#5ec8c0]/15 text-center text-[#5ec8c0] font-bold border border-[#5ec8c0]/35">
                  Risk Reduction: {containmentResult.after.riskReductionPercent}% Drop
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
