import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';
import { getWeights, updateWeights } from '../api/client';

const DEFAULT_WEIGHTS = {
  severity: 0.25,
  asset_criticality: 0.20,
  data_sensitivity: 0.20,
  attack_confidence: 0.15,
  affected_users: 0.10,
  business_impact: 0.10
};

export default function SettingsPage({ onWeightsSaved }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    getWeights()
      .then(res => {
        if (res.weights) {
          setWeights(res.weights);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load active scoring weights:', err);
        setLoading(false);
      });
  }, []);

  const totalSum = Object.values(weights).reduce((sum, v) => sum + Number(v || 0), 0);
  const roundedSum = Math.round(totalSum * 100) / 100;
  const isSumValid = Math.abs(roundedSum - 1.0) < 0.001;

  const handleChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: Number(val)
    }));
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await updateWeights(weights);
      setWeights(res.weights);
      setStatusMessage({ success: true, text: 'Scoring factor weights updated successfully. Incident queue re-ranked!' });
      if (onWeightsSaved) onWeightsSaved();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Failed to save weights:', err);
      setStatusMessage({ success: false, text: err.message || 'Failed to save weights.' });
    } finally {
      setSaving(false);
    }
  };

  const factorConfig = [
    { key: 'severity', label: 'Telemetry Severity Weight', desc: 'Raw vendor severity & CVSS exploit potential' },
    { key: 'asset_criticality', label: 'Asset Criticality Weight', desc: 'Authoritative crown-jewel infrastructure rating' },
    { key: 'data_sensitivity', label: 'Data Sensitivity Weight', desc: 'PII / Financial / Confidential database classification' },
    { key: 'attack_confidence', label: 'Attack Confidence Weight', desc: 'Threat fidelity + ML Isolation Forest anomaly signal' },
    { key: 'affected_users', label: 'Affected Users Impact Weight', desc: 'Blast radius user footprint (log-scale normalized)' },
    { key: 'business_impact', label: 'Business Impact Weight', desc: 'Revenue loss & operational disruption risk' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e1218] border border-slate-800">
        <div>
          <h1 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            PRIORITIZATION ENGINE WEIGHT CONFIGURATION
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Calibrate the 6 mathematical parameters governing base risk score calculations across all incidents.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Weight Controls Form */}
      <div className="p-6 rounded-xl bg-[#0e1218] border border-slate-800 space-y-5 shadow-2xl">
        <div className="space-y-4">
          {factorConfig.map(f => {
            const currentVal = weights[f.key] ?? 0;
            return (
              <div key={f.key} className="p-3.5 rounded-lg bg-[#111620] border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{f.label}</span>
                    <p className="text-[11px] text-slate-500 font-sans">{f.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-400 font-bold text-sm">
                      {currentVal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({Math.round(currentVal * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentVal}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentVal}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-20 p-1.5 rounded bg-[#0a0d12] border border-slate-800 text-xs font-mono text-center text-slate-200"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Weight Sum Status Indicator */}
        <div className={`p-4 rounded-lg font-mono text-xs flex items-center justify-between border ${
          isSumValid
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
            : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
        }`}>
          <div className="flex items-center gap-2">
            {isSumValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <div>
              <div className="font-bold">TOTAL SCORING WEIGHT: {roundedSum.toFixed(2)}</div>
              {!isSumValid && (
                <div className="text-[11px] text-amber-200 font-sans">
                  * Warning: Scoring weights should ideally sum to exactly 1.00 for calibrated 0-100 normalization.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.3)]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'UPDATING SCORING WEIGHTS...' : 'SAVE & RE-RANK INCIDENT QUEUE'}</span>
        </button>

        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-mono text-center font-bold animate-fadeIn ${
            statusMessage.success
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
          }`}>
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

