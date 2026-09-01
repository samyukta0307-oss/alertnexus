import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Shield,
  AlertTriangle,
  Flame,
  Cpu,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  Activity,
  Send,
  GitMerge,
  Globe2,
  Download
} from 'lucide-react';
import {
  getIncidentExplain,
  getIncidentPlaybook,
  simulateContainment,
  submitFeedback,
  getFeedback,
  getIncidentReport
} from '../api/client';
import { getPriorityStyles } from './IncidentCard';

export default function IncidentDetail({ incidentId, rank = 1, onClose, onFeedbackSubmitted }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [explainData, setExplainData] = useState(null);
  const [playbookData, setPlaybookData] = useState(null);
  const [error, setError] = useState(null);

  // Containment Simulation state
  const [simulating, setSimulating] = useState(false);
  const [containmentResult, setContainmentResult] = useState(null);

  // Feedback state
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  useEffect(() => {
    if (!incidentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setContainmentResult(null);
    setFeedbackSuccess(null);

    Promise.all([
      getIncidentExplain(incidentId),
      getIncidentPlaybook(incidentId),
      getFeedback(incidentId).catch(() => [])
    ])
      .then(([explain, playbook, feedback]) => {
        if (isMounted) {
          setExplainData(explain);
          setPlaybookData(playbook);
          setFeedbackHistory(feedback || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load incident detail:', err);
          setError(err.message || 'Unable to load incident telemetry.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  const handleSimulateContainment = async () => {
    try {
      setSimulating(true);
      const res = await simulateContainment(incidentId);
      setContainmentResult(res);
    } catch (err) {
      console.error('Containment simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetContainment = () => {
    setContainmentResult(null);
  };

  const handleFeedback = async (verdict) => {
    try {
      setSubmittingFeedback(true);
      setFeedbackSuccess(null);
      const res = await submitFeedback(incidentId, verdict, feedbackNotes);
      setFeedbackSuccess({ verdict, message: 'Feedback submitted successfully.' });
      setFeedbackNotes('');
      // Refresh feedback history
      const history = await getFeedback(incidentId);
      setFeedbackHistory(history || []);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } catch (err) {
      console.error('Feedback submission failed:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const report = await getIncidentReport(incidentId);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CyberShield-Report-${incidentId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  if (!incidentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-all animate-fadeIn">
      {/* Side Slide Panel */}
      <div className="w-full max-w-2xl h-full bg-[#0e1218] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-slideInRight">
        {/* Panel Header */}
        <div className="p-5 border-b border-slate-800/80 bg-[#111620] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-bold text-white tracking-wider">
                  INCIDENT INVESTIGATION
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {incidentId}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Root Cause Analysis & Threat Breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              title="Download Incident Investigation Report"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-xs font-mono border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Investigation Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
              <span className="text-xs font-mono">Loading incident telemetry...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : explainData ? (
            <>
              {/* SECTION A — Top Hero Summary Card */}
              {(() => {
                const pStyles = getPriorityStyles(explainData.priorityBucket);
                const top = explainData.topAlert || {};
                return (
                  <div className={`p-4 rounded-lg border ${pStyles.border} ${pStyles.bg} bg-[#11151d] space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wider border ${pStyles.badge}`}>
                          {explainData.priorityBucket} {explainData.priorityBucket === 'P1' ? 'CRITICAL' : explainData.priorityBucket === 'P2' ? 'HIGH' : explainData.priorityBucket === 'P3' ? 'MEDIUM' : 'LOW'}
                        </span>
                        <span className="text-xs font-mono text-slate-400 uppercase">
                          {top.alert_type?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-mono text-slate-400">FINAL RISK:</span>
                        <span className={`text-2xl font-mono font-extrabold ${pStyles.score}`}>
                          {explainData.finalScore}
                        </span>
                        <span className="text-xs font-mono text-slate-500">/ 100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">TARGET ASSET</div>
                        <div className="text-slate-200 font-semibold truncate">{top.asset || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">ATTACK STAGE</div>
                        <div className="text-slate-200 uppercase truncate">{top.attack_stage || 'none'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">MITRE TECHNIQUE</div>
                        <div className="text-cyan-400 font-bold">{top.mitre_technique || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">BLAST RADIUS</div>
                        <div className="text-slate-200">{explainData.blastRadius?.assets || 1} asset(s)</div>
                      </div>
                    </div>

                    {/* Summary string */}
                    <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/60 leading-relaxed italic">
                      "{explainData.summary}"
                    </div>

                    {/* 3D Visualizations Navigation Strip */}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        Visualizations:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/attack-chains?id=${encodeURIComponent(incidentId)}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold transition shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                        >
                          <GitMerge className="w-3.5 h-3.5 text-purple-400" />
                          <span>3D ATTACK CHAIN</span>
                        </button>

                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/threat-map?id=${encodeURIComponent(incidentId)}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        >
                          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>3D THREAT MAP</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION B — "WHY IS THIS #N?" */}
              <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                      WHY IS THIS #{rank}?
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    EXPLAINABLE DECISION LOG
                  </span>
                </div>

                <ul className="space-y-2">
                  {explainData.reasons?.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SECTION C — SCORE BUILD-UP PROGRESSION */}
              <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  RISK SCORE BUILD-UP PROGRESSION
                </h3>

                <div className="grid grid-cols-5 gap-1.5 p-3 rounded-md bg-[#0a0d12] border border-slate-800 font-mono text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">BASE RISK</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">
                      {explainData.scoreBreakdown?.base?.toFixed(4)}
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-slate-600 font-bold text-xs">
                    × {explainData.scoreBreakdown?.stageMultiplier}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">STAGE ADJ</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">
                      {explainData.scoreBreakdown?.stageAdjustedScore?.toFixed(4)}
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-slate-600 font-bold text-xs">
                    + {explainData.scoreBreakdown?.correlationBoost?.toFixed(2)}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">FINAL SCORE</div>
                    <div className="text-sm font-extrabold text-rose-400 mt-0.5">
                      {explainData.finalScore}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                  <span>Distinct Stages in Chain: <strong className="text-slate-200">{explainData.distinctAttackStages?.length}</strong></span>
                  <span>Risk Recency Momentum: <strong className="text-slate-200">+{explainData.scoreBreakdown?.riskMomentum || 0}</strong></span>
                </div>
              </div>

              {/* SECTION D — SCORE COMPONENT FACTOR BARS */}
              <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  RAW FACTOR CONTRIBUTIONS
                </h3>

                <div className="space-y-2.5">
                  {(() => {
                    const contribs = explainData.scoreBreakdown?.contributions || {};
                    const factors = [
                      { label: 'Severity', key: 'severity', weight: '25%' },
                      { label: 'Asset Criticality', key: 'asset_criticality', weight: '20%' },
                      { label: 'Data Sensitivity', key: 'data_sensitivity', weight: '20%' },
                      { label: 'Attack Confidence', key: 'attack_confidence', weight: '15%' },
                      { label: 'Affected Users', key: 'affected_users', weight: '10%' },
                      { label: 'Business Impact', key: 'business_impact', weight: '10%' }
                    ];

                    return factors.map(f => {
                      const value = contribs[f.key] || 0;
                      // Maximum possible contribution is the weight itself
                      const weightNum = parseFloat(f.weight) / 100.0;
                      const percent = Math.min(100, Math.round((value / weightNum) * 100));

                      return (
                        <div key={f.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">{f.label} <span className="text-[10px] text-slate-600">({f.weight})</span></span>
                            <span className="text-slate-200 font-semibold">{value.toFixed(4)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* SECTION E — ML ANOMALY SIGNAL */}
              {(() => {
                const ml = explainData.mlAdjustment || explainData.topAlert?.mlAdjustment || {};
                return (
                  <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        <h3 className="font-bold text-slate-200 uppercase">
                          ML ANOMALY SIGNAL
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ml.enabled ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {ml.enabled ? '● ACTIVE ADJUSTMENT' : '○ DISABLED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#0a0d12] border border-slate-800 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500">ORIGINAL CONF</div>
                        <div className="text-sm font-bold text-slate-300">{ml.originalConfidence ?? 'N/A'}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">ANOMALY SCORE</div>
                        <div className="text-sm font-bold text-cyan-400">{ml.anomalyScore ?? '0.0'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">ADJUSTED CONF</div>
                        <div className="text-sm font-bold text-emerald-400">{ml.adjustedConfidence ?? 'N/A'}%</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 italic">
                      * Prototype anomaly signal — Isolation Forest confidence booster for active intrusion signatures.
                    </div>
                  </div>
                );
              })()}

              {/* SECTION F — RECOMMENDED PLAYBOOK */}
              {playbookData && (
                <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-slate-200 uppercase">
                        RECOMMENDED PLAYBOOK
                      </h3>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/40">
                      {playbookData.playbookName}
                    </span>
                  </div>

                  <ol className="space-y-2">
                    {playbookData.actions?.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-slate-300 font-sans text-xs">
                        <span className="font-mono text-[10px] text-cyan-400 font-bold px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="leading-relaxed">{act}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* SECTION G — SIMULATE CONTAINMENT */}
              <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-slate-200 uppercase">
                      SIMULATE CONTAINMENT (WHAT-IF CONTAINED)
                    </h3>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Test the risk reduction impact of isolating compromised endpoints and disabling active credentials in-memory without altering live database records.
                </p>

                {!containmentResult ? (
                  <button
                    onClick={handleSimulateContainment}
                    disabled={simulating}
                    className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{simulating ? 'Simulating Host Isolation...' : 'SIMULATE CONTAINMENT'}</span>
                  </button>
                ) : (
                  <div className="space-y-3 p-3 rounded-md bg-[#0a0d12] border border-cyan-500/40 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-cyan-400 font-bold">CONTAINMENT IMPACT SIMULATION</span>
                      <button
                        onClick={handleResetContainment}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500">BEFORE CONTAINMENT</div>
                        <div className="text-base font-extrabold text-rose-400 mt-1">
                          {containmentResult.before.finalScore} <span className="text-xs">({containmentResult.before.priorityBucket})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Blast: {containmentResult.before.blastRadius.assets} assets
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/40">
                        <div className="text-[10px] text-emerald-400 font-bold">AFTER CONTAINMENT</div>
                        <div className="text-base font-extrabold text-emerald-400 mt-1">
                          {containmentResult.after.finalScore} <span className="text-xs">({containmentResult.after.priorityBucket})</span>
                        </div>
                        <div className="text-[10px] text-emerald-300/80 mt-0.5">
                          Blast: {containmentResult.after.blastRadius.assets} assets (0 uncontained)
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/40 text-center text-cyan-300 font-bold">
                      Risk Reduction: {containmentResult.after.riskReductionPercent}% Drop
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION H — ANALYST VERDICT FEEDBACK */}
              <div className="p-4 rounded-lg bg-[#12161f] border border-slate-800/80 space-y-3 font-mono text-xs">
                <h3 className="font-bold text-slate-200 uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  ANALYST TRIAGE VERDICT
                </h3>

                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Record your investigation determination for model telemetry and compliance records.
                </p>

                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Optional analyst notes (e.g. verified C2 communication with threat intelligence feed)..."
                  rows={2}
                  className="w-full p-2.5 rounded bg-[#0a0d12] border border-slate-800 text-slate-200 text-xs font-sans placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500/60"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleFeedback('confirmed')}
                    disabled={submittingFeedback}
                    className="flex-1 py-2 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>CONFIRMED INCIDENT</span>
                  </button>

                  <button
                    onClick={() => handleFeedback('false_positive')}
                    disabled={submittingFeedback}
                    className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>FALSE POSITIVE</span>
                  </button>
                </div>

                {feedbackSuccess && (
                  <div className="p-2 rounded bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-[11px] text-center font-bold animate-fadeIn">
                    ✓ {feedbackSuccess.message}
                  </div>
                )}

                {/* Feedback History Log */}
                {feedbackHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Prior Verdicts:</div>
                    {feedbackHistory.slice(0, 3).map((fb, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                        <span className={`font-bold ${fb.verdict === 'confirmed' ? 'text-rose-400' : 'text-slate-400'}`}>
                          {fb.verdict === 'confirmed' ? '● Confirmed' : '○ False Positive'}
                        </span>
                        <span className="text-[10px] text-slate-500">{fb.created_at?.substring(0, 16)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

