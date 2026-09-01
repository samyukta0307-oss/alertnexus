import React, { useState, useEffect } from 'react';
import { Sliders, Play, RotateCcw, AlertTriangle, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { whatIf, getRankedIncidents } from '../api/client';
import { getPriorityStyles } from './IncidentCard';

export default function WhatIfPanel({ targetIncidentId = null, onSimulationComplete }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(targetIncidentId || '');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Override inputs
  const [assetCriticality, setAssetCriticality] = useState(95);
  const [affectedUsers, setAffectedUsers] = useState(5000);
  const [attackConfidence, setAttackConfidence] = useState(90);
  const [severity, setSeverity] = useState(85);
  const [dataSensitivity, setDataSensitivity] = useState(90);
  const [businessImpact, setBusinessImpact] = useState(85);

  useEffect(() => {
    getRankedIncidents()
      .then(data => {
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          // Default to a mid-priority incident (P3) if available to demonstrate upward shift, else top
          const p3 = data.find(i => i.priority_bucket === 'P3') || data[0];
          setSelectedIncidentId(p3.incident_id);
        }
      })
      .catch(err => {
        console.error('Failed to load incidents list for simulator:', err);
      });
  }, []);

  useEffect(() => {
    if (targetIncidentId) {
      setSelectedIncidentId(targetIncidentId);
    }
  }, [targetIncidentId]);

  const handleRecalculate = async () => {
    if (!selectedIncidentId) return;

    try {
      setCalculating(true);
      setError(null);

      const overrides = {
        asset_criticality: Number(assetCriticality),
        affected_users: Number(affectedUsers),
        attack_confidence: Number(attackConfidence),
        severity: Number(severity),
        data_sensitivity: Number(dataSensitivity),
        business_impact: Number(businessImpact)
      };

      const res = await whatIf(selectedIncidentId, overrides);
      setResult(res);
      if (onSimulationComplete) onSimulationComplete(res);
    } catch (err) {
      console.error('What-if calculation failed:', err);
      setError(err.message || 'Simulation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleApplyPreset = (preset) => {
    if (preset === 'spec_example') {
      // Master spec example: asset_criticality 60->95, affected_users 100->5000, attack_confidence 50->90
      setAssetCriticality(95);
      setAffectedUsers(5000);
      setAttackConfidence(90);
      setSeverity(80);
      setDataSensitivity(90);
      setBusinessImpact(85);
    } else if (preset === 'low_noise') {
      setAssetCriticality(15);
      setAffectedUsers(1);
      setAttackConfidence(30);
      setSeverity(25);
      setDataSensitivity(10);
      setBusinessImpact(10);
    } else if (preset === 'catastrophic_exfil') {
      setAssetCriticality(98);
      setAffectedUsers(25000);
      setAttackConfidence(99);
      setSeverity(98);
      setDataSensitivity(99);
      setBusinessImpact(98);
    }
  };

  const selectedIncident = incidents.find(i => i.incident_id === selectedIncidentId);

  return (
    <div className="p-6 rounded-xl bg-[#0e1218] border border-slate-800 space-y-6 max-w-4xl mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
              WHAT-IF RISK SENSITIVITY SIMULATOR
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Simulate hypothetical asset criticality escalations and blast radius variations in memory.
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-500 mr-1">PRESETS:</span>
          <button
            onClick={() => handleApplyPreset('spec_example')}
            className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono transition"
          >
            Spec Example (P3→P1)
          </button>
          <button
            onClick={() => handleApplyPreset('catastrophic_exfil')}
            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-mono transition"
          >
            Catastrophic Breach
          </button>
        </div>
      </div>

      {/* Target Incident Selector */}
      <div className="space-y-2 font-mono text-xs">
        <label className="text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Target Incident for Sensitivity Testing:</span>
          {selectedIncident && (
            <span className="text-slate-500">
              Current Risk: <strong className="text-slate-300">{selectedIncident.score}</strong> ({selectedIncident.priority_bucket})
            </span>
          )}
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

      {/* Slider Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-[#111620] border border-slate-800 font-mono text-xs">
        {/* Asset Criticality */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Asset Criticality:</span>
            <span className="text-cyan-400 font-bold">{assetCriticality} / 100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={assetCriticality}
            onChange={(e) => setAssetCriticality(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Affected Users */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Affected Users (Log):</span>
            <span className="text-cyan-400 font-bold">{affectedUsers.toLocaleString()} users</span>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={affectedUsers}
            onChange={(e) => setAffectedUsers(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Attack Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Attack Confidence:</span>
            <span className="text-cyan-400 font-bold">{attackConfidence}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={attackConfidence}
            onChange={(e) => setAttackConfidence(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Telemetry Severity:</span>
            <span className="text-slate-200 font-bold">{severity} / 100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-slate-400 cursor-pointer"
          />
        </div>

        {/* Data Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Data Sensitivity:</span>
            <span className="text-slate-200 font-bold">{dataSensitivity} / 100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={dataSensitivity}
            onChange={(e) => setDataSensitivity(Number(e.target.value))}
            className="w-full accent-slate-400 cursor-pointer"
          />
        </div>

        {/* Business Impact */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Business Impact:</span>
            <span className="text-slate-200 font-bold">{businessImpact} / 100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={businessImpact}
            onChange={(e) => setBusinessImpact(Number(e.target.value))}
            className="w-full accent-slate-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleRecalculate}
        disabled={calculating || !selectedIncidentId}
        className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.3)]"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>{calculating ? 'RECALCULATING 5-STEP SCORING PIPELINE...' : 'RECALCULATE SENSITIVITY'}</span>
      </button>

      {error && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recalculation Results */}
      {result && (
        <div className="p-5 rounded-xl bg-[#0a0d12] border border-cyan-500/40 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
              SIMULATION RESULTS FOR {result.incidentId}
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Shift: {result.priorityShift}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            {(() => {
              const pBefore = getPriorityStyles(result.before.priorityBucket);
              return (
                <div className={`p-4 rounded-lg border ${pBefore.border} ${pBefore.bg} bg-[#11141a] text-center space-y-1`}>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">CURRENT BASELINE</div>
                  <div className={`text-3xl font-mono font-extrabold ${pBefore.score}`}>
                    {result.before.score}
                  </div>
                  <div className="text-xs font-mono text-slate-300 font-bold">
                    PRIORITY {result.before.priorityBucket}
                  </div>
                </div>
              );
            })()}

            {/* After */}
            {(() => {
              const pAfter = getPriorityStyles(result.after.priorityBucket);
              return (
                <div className={`p-4 rounded-lg border ${pAfter.border} ${pAfter.bg} bg-[#11141a] text-center space-y-1`}>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">SIMULATED SCENARIO</div>
                  <div className={`text-3xl font-mono font-extrabold ${pAfter.score}`}>
                    {result.after.score}
                  </div>
                  <div className="text-xs font-mono text-slate-300 font-bold">
                    PRIORITY {result.after.priorityBucket}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Score Impact:</span>
            <span className={`font-bold ${result.scoreDelta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {result.scoreDelta >= 0 ? `+${result.scoreDelta}` : result.scoreDelta} points shift
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

