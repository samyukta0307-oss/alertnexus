import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Shield,
  Flame,
  Play,
  RotateCcw,
  AlertTriangle,
  Server,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  getRankedIncidents,
  getIncidentPlaybook,
  simulateContainment
} from '../api/client';
import { getPriorityStyles } from '../components/IncidentCard';

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e1218] border border-slate-800">
        <div>
          <h1 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            INCIDENT RESPONSE & PLAYBOOK ORCHESTRATION
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Automated mitigation recommendations matched against MITRE tactics and asset sensitivity.
          </p>
        </div>
      </div>

      {/* Incident Selector */}
      <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800 space-y-2 font-mono text-xs">
        <label className="text-slate-400 font-bold uppercase tracking-wider">
          Active Incident Under Response:
        </label>
        <select
          value={selectedIncidentId}
          onChange={(e) => setSelectedIncidentId(e.target.value)}
          className="w-full p-2.5 rounded-lg bg-[#0a0d12] border border-slate-800 text-slate-200 focus:outline-hidden focus:border-cyan-500/60"
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
        <div className="p-6 rounded-xl bg-[#0e1218] border border-slate-800 space-y-6 shadow-2xl">
          {/* Top Playbook Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">RECOMMENDED PLAYBOOK:</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                  {playbook?.playbookName || 'Standard Triage'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                Triggered Rule: <code className="text-cyan-400">{playbook?.matchedRule || 'default'}</code>
              </div>
            </div>

            <button
              onClick={() => onSelectIncident(selectedIncident.incident_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition"
            >
              <span>Full Investigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider">
              Ordered Response Procedures:
            </div>

            {loadingPlaybook ? (
              <div className="py-6 text-center text-slate-500">Loading playbook actions...</div>
            ) : (
              <ol className="space-y-2.5">
                {playbook?.actions?.map((act, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-lg bg-[#111620] border border-slate-800/80 flex items-start gap-3 text-slate-200 font-sans text-xs hover:border-slate-700 transition"
                  >
                    <span className="font-mono text-xs font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 shrink-0">
                      STEP {idx + 1}
                    </span>
                    <span className="leading-relaxed mt-0.5">{act}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Containment Simulator Action Block */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>ACTIVE CONTAINMENT VALIDATION</span>
              </div>
            </div>

            {!containmentResult ? (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{simulating ? 'Simulating Host Isolation...' : 'SIMULATE CONTAINMENT ON THIS INCIDENT'}</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-[#0a0d12] border border-cyan-500/40 space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-cyan-400 font-bold">CONTAINMENT IMPACT RESULTS</span>
                  <button
                    onClick={() => setContainmentResult(null)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">BEFORE ISOLATION</div>
                    <div className="text-lg font-extrabold text-rose-400 mt-1">
                      {containmentResult.before.finalScore} ({containmentResult.before.priorityBucket})
                    </div>
                  </div>

                  <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/40">
                    <div className="text-[10px] text-emerald-400 font-bold">AFTER ISOLATION</div>
                    <div className="text-lg font-extrabold text-emerald-400 mt-1">
                      {containmentResult.after.finalScore} ({containmentResult.after.priorityBucket})
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-cyan-950/40 text-center text-cyan-300 font-bold border border-cyan-800/40">
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

