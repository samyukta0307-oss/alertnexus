import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  Flame,
  Cpu,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
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
import { getPriorityStyles } from '../utils/theme';
import { formatMitreTechnique, getMitreDescription } from '../utils/mitre';
import { getAssetPlainSubtitle } from '../utils/assets';
import { generateScoreNarration } from '../utils/narration';
import InfoTooltip from './InfoTooltip';

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
          console.error('Failed to load incident detail data:', err);
          setError(err.message || 'Unable to retrieve incident explanation.');
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
      console.error('Failed to simulate containment:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleFeedback = async (verdict) => {
    try {
      setSubmittingFeedback(true);
      await submitFeedback(incidentId, verdict, feedbackNotes);
      setFeedbackSuccess(`Feedback '${verdict.toUpperCase()}' registered. Model feedback loop updated.`);
      setFeedbackNotes('');
      const updated = await getFeedback(incidentId).catch(() => []);
      setFeedbackHistory(updated || []);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await getIncidentReport(incidentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${incidentId}-executive-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export incident JSON:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[580px] bg-[#24202b] border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300 animate-slideInRight font-sans select-none text-[#f0eae4]">
      {/* Side Panel Header Bar */}
      <div className="p-4 bg-[#2d2736] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#f0eae4]">
              <span>INCIDENT {incidentId}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#5ec8c0] border border-white/10">
                RANK #{rank}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#a69c93]">
              Explainable AI Contextual Risk Breakdown
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            title="Export JSON Report"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#a69c93] hover:text-[#f0eae4] transition border border-white/10"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#a69c93] hover:text-[#f0eae4] transition border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Panel Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#1c1921]">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#a69c93]">
            <div className="w-8 h-8 border-2 border-[#5ec8c0]/20 border-t-[#5ec8c0] rounded-full animate-spin"></div>
            <span className="font-mono text-xs">Deconstructing multi-stage incident telemetry...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[#2d2736] border border-[#e88080]/40 text-[#e88080] text-xs font-mono">
            {error}
          </div>
        ) : explainData ? (
          <div className="space-y-5">
            {/* SECTION A — HERO OVERVIEW CARD */}
            {(() => {
              const pStyles = getPriorityStyles(explainData.priorityBucket);
              const top = explainData.topAlert || {};
              const assetSubtitle = getAssetPlainSubtitle(top.asset);
              const mitreFormatted = top.mitre_technique ? formatMitreTechnique(top.mitre_technique) : 'N/A';
              return (
                <div className={`p-4 rounded-xl border ${pStyles.border} ${pStyles.bg} bg-[#2d2736] space-y-3 shadow-md`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-extrabold tracking-wider border ${pStyles.badge}`}>
                        {explainData.priorityBucket} {explainData.priorityBucket === 'P1' ? 'CRITICAL' : explainData.priorityBucket === 'P2' ? 'HIGH' : explainData.priorityBucket === 'P3' ? 'MEDIUM' : 'LOW'}
                      </span>
                      <span className="text-xs font-mono text-[#f0eae4] font-bold uppercase">
                        {top.alert_type?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-mono text-[#a69c93]">FINAL RISK:</span>
                      <span className={`text-2xl font-mono font-extrabold ${pStyles.score}`}>
                        {explainData.finalScore}
                      </span>
                      <span className="text-xs font-mono text-[#7d736b]">/ 100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 border-t border-white/10 font-mono text-xs">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[#a69c93] uppercase">
                        <span>TARGET ASSET</span>
                        <InfoTooltip text="The internal computer or database targeted by this security alarm." />
                      </div>
                      <div className="text-[#f0eae4] font-semibold truncate mt-0.5">{top.asset || 'N/A'}</div>
                      <div className="text-[10px] font-sans text-[#5ec8c0]/90 truncate italic">{assetSubtitle}</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[#a69c93] uppercase">
                        <span>ATTACK STAGE</span>
                        <InfoTooltip term="attack_stage" />
                      </div>
                      <div className="text-[#f0eae4] uppercase truncate mt-0.5">{top.attack_stage || 'none'}</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[#a69c93] uppercase">
                        <span>MITRE TECHNIQUE</span>
                        <InfoTooltip text={getMitreDescription(top.mitre_technique)} />
                      </div>
                      <div className="text-[#5ec8c0] font-bold truncate mt-0.5" title={mitreFormatted}>
                        {mitreFormatted}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[#a69c93] uppercase">
                        <span>BLAST RADIUS</span>
                        <InfoTooltip term="blast_radius" />
                      </div>
                      <div className="text-[#f0eae4] mt-0.5">{explainData.blastRadius?.assets || 1} asset(s)</div>
                    </div>
                  </div>

                  {/* Plain summary string */}
                  <div className="text-xs font-sans text-[#f0eae4] pt-2.5 border-t border-white/10 leading-relaxed italic">
                    "{explainData.summary}"
                  </div>

                  {/* 3D Visualizations Navigation Strip */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[#a69c93]">
                      Interactive Visualizers:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/attack-chains?id=${encodeURIComponent(incidentId)}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8a87c]/15 hover:bg-[#e8a87c]/25 border border-[#e8a87c]/40 text-[#e8a87c] text-[11px] font-mono font-bold transition shadow-xs"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-[#e8a87c]" />
                        <span>3D ATTACK CHAIN</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/threat-map?id=${encodeURIComponent(incidentId)}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5ec8c0]/15 hover:bg-[#5ec8c0]/25 border border-[#5ec8c0]/40 text-[#5ec8c0] text-[11px] font-mono font-bold transition shadow-xs"
                      >
                        <Globe2 className="w-3.5 h-3.5 text-[#5ec8c0]" />
                        <span>3D THREAT MAP</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SECTION B — "WHY IS THIS #N?" */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5ec8c0]" />
                  <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                    WHY IS THIS #{rank}?
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#a69c93] uppercase">
                  EXPLAINABLE DECISION LOG
                </span>
              </div>

              <ul className="space-y-2">
                {explainData.reasons?.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[#f0eae4] leading-relaxed font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5ec8c0] mt-1.5 shrink-0"></span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION C — SCORE BUILD-UP PROGRESSION */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#a69c93]" />
                  <span>RISK SCORE BUILD-UP PROGRESSION</span>
                </h3>
                <InfoTooltip text="How the raw factors are mathematically multiplied and boosted into a calibrated 0-100 score." />
              </div>

              <div className="grid grid-cols-5 gap-1.5 p-3 rounded-lg bg-[#1e1a24] border border-white/10 font-mono text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#a69c93]">
                    <span>BASE RISK</span>
                    <InfoTooltip term="base_risk" />
                  </div>
                  <div className="text-sm font-bold text-[#f0eae4] mt-0.5">
                    {explainData.scoreBreakdown?.base?.toFixed(4)}
                  </div>
                </div>
                <div className="flex items-center justify-center text-[#a69c93] font-bold text-xs">
                  × {explainData.scoreBreakdown?.stageMultiplier}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#a69c93]">
                    <span>STAGE ADJ</span>
                    <InfoTooltip term="stage_adjusted" />
                  </div>
                  <div className="text-sm font-bold text-[#5ec8c0] mt-0.5">
                    {explainData.scoreBreakdown?.stageAdjustedScore?.toFixed(4)}
                  </div>
                </div>
                <div className="flex items-center justify-center text-[#a69c93] font-bold text-xs">
                  + {explainData.scoreBreakdown?.correlationBoost?.toFixed(2)}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#e88080]">
                    <span>FINAL SCORE</span>
                  </div>
                  <div className="text-sm font-extrabold text-[#e88080] mt-0.5">
                    {explainData.finalScore}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#a69c93] flex items-center justify-between px-1 font-mono">
                <span className="flex items-center gap-1">
                  <span>Distinct Stages:</span>
                  <strong className="text-[#f0eae4]">{explainData.distinctAttackStages?.length}</strong>
                  <InfoTooltip term="multi_stage" />
                </span>
                <span className="flex items-center gap-1">
                  <span>Recency Momentum:</span>
                  <strong className="text-[#f0eae4]">+{explainData.scoreBreakdown?.riskMomentum || 0}</strong>
                  <InfoTooltip term="risk_momentum" />
                </span>
              </div>

              {/* Dynamic "Why Did It Move?" Plain-Language Step Narration */}
              {(() => {
                const narration = generateScoreNarration(explainData, rank);
                return (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-mono text-[#5ec8c0] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>WHY DID IT MOVE? — STEP-BY-STEP SCORING STORY</span>
                    </div>

                    <div className="space-y-1.5 text-xs font-sans text-[#f0eae4]">
                      <div className="p-2 rounded-lg bg-[#1e1a24] border border-white/10 flex items-start gap-2">
                        <span className="font-mono text-[10px] text-[#a69c93] font-bold px-1 py-0.5 rounded bg-white/5 shrink-0">
                          BASE
                        </span>
                        <span className="leading-snug text-[#f0eae4]">{narration.base}</span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#1e1a24] border border-white/10 flex items-start gap-2">
                        <span className="font-mono text-[10px] text-[#5ec8c0] font-bold px-1 py-0.5 rounded bg-[#5ec8c0]/15 border border-[#5ec8c0]/30 shrink-0">
                          STAGE ×
                        </span>
                        <span className="leading-snug text-[#f0eae4]">{narration.stage}</span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#1e1a24] border border-white/10 flex items-start gap-2">
                        <span className="font-mono text-[10px] text-[#e8a87c] font-bold px-1 py-0.5 rounded bg-[#e8a87c]/15 border border-[#e8a87c]/30 shrink-0">
                          CHAIN +
                        </span>
                        <span className="leading-snug text-[#f0eae4]">{narration.correlation}</span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#1e1a24] border border-white/10 flex items-start gap-2">
                        <span className="font-mono text-[10px] text-[#efa95f] font-bold px-1 py-0.5 rounded bg-[#efa95f]/15 border border-[#efa95f]/30 shrink-0">
                          RECENCY
                        </span>
                        <span className="leading-snug text-[#f0eae4]">{narration.momentum}</span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#5ec8c0]/10 border border-[#5ec8c0]/30 flex items-start gap-2 font-medium">
                        <span className="font-mono text-[10px] text-[#e88080] font-bold px-1 py-0.5 rounded bg-[#e88080]/15 border border-[#e88080]/30 shrink-0">
                          RANK #{rank}
                        </span>
                        <span className="leading-snug text-[#5ec8c0]">{narration.final}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION D — SCORE COMPONENT FACTOR BARS */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                  SCORE CONTRIBUTIONS BY FACTOR
                </h3>
                <span className="text-[10px] font-mono text-[#a69c93]">Factor Value × Weight</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {explainData.scoreBreakdown?.contributions && Object.entries(explainData.scoreBreakdown.contributions).map(([factor, data]) => {
                  const percent = Math.min(100, Math.round((data.value || 0)));
                  return (
                    <div key={factor} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#a69c93] flex items-center gap-1 uppercase">
                          <span>{factor.replace(/_/g, ' ')}</span>
                          <InfoTooltip term={factor} />
                        </span>
                        <span className="text-[#f0eae4]">
                          {data.value} <span className="text-[#7d736b]">× {data.weight} =</span> <strong className="text-[#5ec8c0]">{data.weightedContribution?.toFixed(2)}</strong>
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-[#1e1a24] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-[#5ec8c0] to-[#e8a87c] rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION E — ML SIGNAL CONTRIBUTION */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#5ec8c0]" />
                  <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                    ML ISOLATION FOREST SIGNAL
                  </h3>
                </div>
                <InfoTooltip term="ml_signal" />
              </div>

              <div className="p-3 rounded-lg bg-[#1e1a24] border border-white/10 flex items-center justify-between font-mono text-xs">
                <div>
                  <div className="text-[10px] text-[#a69c93]">ANOMALY CLUSTER FIDELITY</div>
                  <div className="text-xs font-bold text-[#f0eae4] mt-0.5">High Confidence Pattern</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#a69c93]">ADJUSTMENT</div>
                  <div className="text-xs font-bold text-[#5ec8c0]">Active in Confidence Factor</div>
                </div>
              </div>
            </div>

            {/* SECTION F — CONTAINMENT SIMULATION */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#efa95f]" />
                  <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                    CONTAINMENT SIMULATOR
                  </h3>
                </div>
                <InfoTooltip term="containment" />
              </div>

              {!containmentResult ? (
                <button
                  onClick={handleSimulateContainment}
                  disabled={simulating}
                  className="w-full py-2.5 rounded-lg bg-[#5ec8c0] hover:bg-[#4eb8b0] active:bg-[#3ea8a0] disabled:opacity-50 text-[#1c1921] font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(94,200,192,0.25)]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{simulating ? 'SIMULATING ISOLATION...' : 'SIMULATE CONTAINMENT ON THIS INCIDENT'}</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#1e1a24] border border-[#5ec8c0]/40 space-y-3 font-mono text-xs animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[#5ec8c0] font-bold">CONTAINMENT IMPACT RESULTS</span>
                    <button
                      onClick={() => setContainmentResult(null)}
                      className="flex items-center gap-1 text-[10px] text-[#a69c93] hover:text-[#f0eae4] transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 rounded bg-[#2d2736] border border-white/10">
                      <div className="text-[10px] text-[#a69c93]">BEFORE ISOLATION</div>
                      <div className="text-base font-extrabold text-[#e88080] mt-1">
                        {containmentResult.before.finalScore} ({containmentResult.before.priorityBucket})
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#8fbf9f]/15 border border-[#8fbf9f]/40">
                      <div className="text-[10px] text-[#8fbf9f] font-bold">AFTER ISOLATION</div>
                      <div className="text-base font-extrabold text-[#8fbf9f] mt-1">
                        {containmentResult.after.finalScore} ({containmentResult.after.priorityBucket})
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#5ec8c0]/15 text-center text-[#5ec8c0] font-bold border border-[#5ec8c0]/30">
                    Risk Reduction: {containmentResult.after.riskReductionPercent}% Drop
                  </div>
                </div>
              )}
            </div>

            {/* SECTION G — RECOMMENDED PLAYBOOK */}
            {playbookData && (
              <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8fbf9f]" />
                    <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                      RECOMMENDED RESPONSE PLAYBOOK
                    </h3>
                  </div>
                  <InfoTooltip term="playbook" />
                </div>

                <div className="p-3 rounded-lg bg-[#1e1a24] border border-white/10 space-y-2">
                  <div className="font-mono text-xs font-bold text-[#8fbf9f]">
                    {playbookData.playbookName}
                  </div>
                  <ol className="space-y-1.5 pl-4 list-decimal text-xs text-[#f0eae4] font-sans">
                    {playbookData.actions?.map((act, i) => (
                      <li key={i} className="leading-relaxed">{act}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* SECTION H — ANALYST FEEDBACK LOOP */}
            <div className="p-4 rounded-xl bg-[#2d2736] border border-white/10 space-y-3 shadow-md">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[#f0eae4] uppercase">
                ANALYST TRIAGE VERDICT
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback('confirmed_threat')}
                  disabled={submittingFeedback}
                  className="flex-1 py-2 rounded-lg bg-[#e88080]/15 hover:bg-[#e88080]/25 text-[#e88080] border border-[#e88080]/40 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>CONFIRM THREAT</span>
                </button>

                <button
                  onClick={() => handleFeedback('false_positive')}
                  disabled={submittingFeedback}
                  className="flex-1 py-2 rounded-lg bg-[#9aa5b1]/15 hover:bg-[#9aa5b1]/25 text-[#9aa5b1] border border-[#9aa5b1]/40 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>FALSE POSITIVE</span>
                </button>
              </div>

              {feedbackSuccess && (
                <div className="p-2 rounded text-[11px] font-mono text-center bg-[#8fbf9f]/15 text-[#8fbf9f] border border-[#8fbf9f]/40 font-bold">
                  {feedbackSuccess}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
