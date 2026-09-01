import React, { useState, useEffect } from 'react';
import { Sliders, Play, AlertTriangle } from 'lucide-react';
import { whatIf, getRankedIncidents } from '../api/client';
import { getPriorityStyles } from '../utils/theme';
import InfoTooltip from './InfoTooltip';

export default function WhatIfPanel({ targetIncidentId = null, onSimulationComplete }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(targetIncidentId || '');
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
    <div className="p-6 rounded-xl bg-[#24202b] border border-white/10 space-y-6 max-w-4xl mx-auto shadow-2xl font-sans text-[#f0eae4]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0] shadow-[0_0_12px_rgba(94,200,192,0.2)]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
              WHAT-IF RISK SENSITIVITY SIMULATOR
            </h2>
            <p className="text-xs text-[#a69c93] font-sans mt-0.5">
              Simulate hypothetical asset criticality escalations and blast radius variations in memory.
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#a69c93] mr-1">PRESETS:</span>
          <button
            onClick={() => handleApplyPreset('spec_example')}
            className="px-2.5 py-1 rounded bg-[#1e1a24] hover:bg-[#373042] text-[#5ec8c0] text-[11px] font-mono border border-white/10 transition"
          >
            Crown Jewel Escalation
          </button>
          <button
            onClick={() => handleApplyPreset('catastrophic_exfil')}
            className="px-2.5 py-1 rounded bg-[#1e1a24] hover:bg-[#373042] text-[#e88080] text-[11px] font-mono border border-white/10 transition"
          >
            Massive Exfiltration
          </button>
          <button
            onClick={() => handleApplyPreset('low_noise')}
            className="px-2.5 py-1 rounded bg-[#1e1a24] hover:bg-[#373042] text-[#a69c93] text-[11px] font-mono border border-white/10 transition"
          >
            Low-Impact Noise
          </button>
        </div>
      </div>

      {/* Target Incident Selection */}
      <div className="p-4 rounded-xl bg-[#1e1a24] border border-white/10 space-y-2 font-mono text-xs">
        <label className="text-[#a69c93] font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Target Incident for What-If Analysis:</span>
          {selectedIncident && (
            <span className="text-[#a69c93]">
              Current: <strong className="text-[#f0eae4]">{selectedIncident.score}</strong> ({selectedIncident.priority_bucket})
            </span>
          )}
        </label>
        <select
          value={selectedIncidentId}
          onChange={(e) => {
            setSelectedIncidentId(e.target.value);
            setResult(null);
          }}
          className="w-full p-2.5 rounded-lg bg-[#24202b] border border-white/10 text-[#f0eae4] focus:outline-hidden focus:border-[#5ec8c0]/60 transition"
        >
          {incidents.map(inc => (
            <option key={inc.incident_id} value={inc.incident_id}>
              {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — {inc.summary || inc.alerts?.[0]?.asset}
            </option>
          ))}
        </select>
      </div>

      {/* Slider Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asset Criticality */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>ASSET CRITICALITY:</span>
              <InfoTooltip term="asset_criticality" />
            </span>
            <span className="text-[#5ec8c0] font-bold">{assetCriticality} / 100</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={assetCriticality}
            onChange={(e) => setAssetCriticality(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>

        {/* Affected Users */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>AFFECTED USERS BLAST:</span>
              <InfoTooltip term="affected_users" />
            </span>
            <span className="text-[#5ec8c0] font-bold">{Number(affectedUsers).toLocaleString()} users</span>
          </div>
          <input
            type="range"
            min="1"
            max="30000"
            step="100"
            value={affectedUsers}
            onChange={(e) => setAffectedUsers(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>

        {/* Attack Confidence */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>ATTACK CONFIDENCE:</span>
              <InfoTooltip term="attack_confidence" />
            </span>
            <span className="text-[#5ec8c0] font-bold">{attackConfidence} / 100</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={attackConfidence}
            onChange={(e) => setAttackConfidence(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>

        {/* Telemetry Severity */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>TELEMETRY SEVERITY:</span>
              <InfoTooltip text="Raw exploit score assigned by firewall or detection sensor." />
            </span>
            <span className="text-[#5ec8c0] font-bold">{severity} / 100</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>

        {/* Data Sensitivity */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>DATA SENSITIVITY:</span>
              <InfoTooltip term="data_sensitivity" />
            </span>
            <span className="text-[#5ec8c0] font-bold">{dataSensitivity} / 100</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={dataSensitivity}
            onChange={(e) => setDataSensitivity(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>

        {/* Business Impact */}
        <div className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-[#a69c93] font-bold flex items-center gap-1">
              <span>BUSINESS IMPACT:</span>
              <InfoTooltip term="business_impact" />
            </span>
            <span className="text-[#5ec8c0] font-bold">{businessImpact} / 100</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={businessImpact}
            onChange={(e) => setBusinessImpact(e.target.value)}
            className="w-full accent-[#5ec8c0] cursor-pointer"
          />
        </div>
      </div>

      {/* Recalculate Action Button */}
      <button
        onClick={handleRecalculate}
        disabled={calculating || !selectedIncidentId}
        className="w-full py-3 rounded-lg bg-[#5ec8c0] hover:bg-[#4eb8b0] active:bg-[#3ea8a0] disabled:opacity-50 text-[#1c1921] font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(94,200,192,0.25)]"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>{calculating ? 'RECALCULATING CONTEXTUAL SCORE...' : 'EXECUTE WHAT-IF SIMULATION'}</span>
      </button>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-[#e88080]/15 border border-[#e88080]/40 text-[#e88080] text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Results Diff Card */}
      {result && (
        <div className="p-5 rounded-xl bg-[#1e1a24] border border-white/10 space-y-4 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="font-bold text-[#5ec8c0] uppercase tracking-wider">
              SIMULATION OUTCOME COMPARISON
            </div>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
              result.diff?.isPriorityShift
                ? 'bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40 animate-pulse'
                : 'bg-white/5 text-[#a69c93]'
            }`}>
              {result.diff?.isPriorityShift ? 'PRIORITY SHIFT OCCURRED' : 'SCORE VARIATION (SAME BUCKET)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            {/* Original State */}
            <div className="p-3 rounded-lg bg-[#24202b] border border-white/10 space-y-1">
              <div className="text-[10px] text-[#a69c93] uppercase font-bold">ACTUAL BASELINE</div>
              <div className="text-xl font-extrabold text-[#f0eae4]">
                {result.original?.finalScore}
              </div>
              <div className="text-xs font-bold text-[#a69c93]">
                Priority: {result.original?.priorityBucket}
              </div>
            </div>

            {/* Simulated State */}
            <div className="p-3 rounded-lg bg-[#24202b] border border-[#5ec8c0]/40 space-y-1">
              <div className="text-[10px] text-[#5ec8c0] uppercase font-bold">SIMULATED SCENARIO</div>
              <div className="text-xl font-extrabold text-[#5ec8c0]">
                {result.simulated?.finalScore}
              </div>
              <div className="text-xs font-bold text-[#5ec8c0]">
                Priority: {result.simulated?.priorityBucket}
              </div>
            </div>
          </div>

          {/* Delta Statistics */}
          <div className="p-3 rounded-lg bg-[#24202b] border border-white/10 flex items-center justify-around text-center">
            <div>
              <div className="text-[10px] text-[#a69c93]">SCORE DELTA</div>
              <div className={`text-sm font-bold ${result.diff?.scoreDelta >= 0 ? 'text-[#5ec8c0]' : 'text-[#e88080]'}`}>
                {result.diff?.scoreDelta >= 0 ? `+${result.diff?.scoreDelta}` : result.diff?.scoreDelta}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#a69c93]">SIMULATED BASE RISK</div>
              <div className="text-sm font-bold text-[#f0eae4]">
                {result.simulated?.baseScore?.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#a69c93]">STAGE MULTIPLIER</div>
              <div className="text-sm font-bold text-[#e8a87c]">
                {result.simulated?.stageMultiplier}x
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
