import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getWeights, updateWeights } from '../api/client';
import InfoTooltip from '../components/InfoTooltip';

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
    { key: 'severity', label: 'Telemetry Severity Weight', desc: 'Raw vendor severity & CVSS exploit potential', term: 'severity' },
    { key: 'asset_criticality', label: 'Asset Criticality Weight', desc: 'Authoritative crown-jewel infrastructure rating', term: 'asset_criticality' },
    { key: 'data_sensitivity', label: 'Data Sensitivity Weight', desc: 'PII / Financial / Confidential database classification', term: 'data_sensitivity' },
    { key: 'attack_confidence', label: 'Attack Confidence Weight', desc: 'Threat fidelity + ML Isolation Forest anomaly signal', term: 'attack_confidence' },
    { key: 'affected_users', label: 'Affected Users Impact Weight', desc: 'Blast radius user footprint (log-scale normalized)', term: 'affected_users' },
    { key: 'business_impact', label: 'Business Impact Weight', desc: 'Revenue loss & operational disruption risk', term: 'business_impact' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans text-[#f0eae4]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#24202b] border border-white/10 shadow-md">
        <div>
          <h1 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#5ec8c0]" />
            PRIORITIZATION ENGINE WEIGHT CONFIGURATION
          </h1>
          <p className="text-xs text-[#a69c93] font-sans mt-0.5">
            Calibrate the 6 mathematical parameters governing base risk score calculations across all incidents.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1a24] hover:bg-[#373042] text-[#f0eae4] text-xs font-mono transition border border-white/10"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Weight Controls Form */}
      <div className="p-6 rounded-xl bg-[#24202b] border border-white/10 space-y-5 shadow-2xl">
        <div className="space-y-4">
          {factorConfig.map(f => {
            const currentVal = weights[f.key] ?? 0;
            return (
              <div key={f.key} className="p-3.5 rounded-xl bg-[#1e1a24] border border-white/5 space-y-2 hover:border-white/15 transition">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#f0eae4]">{f.label}</span>
                      <InfoTooltip term={f.term} />
                    </div>
                    <p className="text-[11px] text-[#a69c93] font-sans mt-0.5">{f.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5ec8c0] font-bold text-sm">
                      {currentVal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#7d736b] ml-1">
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
                    className="w-full accent-[#5ec8c0] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentVal}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-20 p-1.5 rounded bg-[#24202b] border border-white/10 text-xs font-mono text-center text-[#f0eae4]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Weight Sum Status Indicator */}
        <div className={`p-4 rounded-xl font-mono text-xs flex items-center justify-between border ${
          isSumValid
            ? 'bg-[#8fbf9f]/15 text-[#8fbf9f] border-[#8fbf9f]/40'
            : 'bg-[#efa95f]/15 text-[#efa95f] border-[#efa95f]/40'
        }`}>
          <div className="flex items-center gap-2">
            {isSumValid ? (
              <CheckCircle2 className="w-4 h-4 text-[#8fbf9f]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#efa95f]" />
            )}
            <div>
              <div className="font-bold">TOTAL SCORING WEIGHT: {roundedSum.toFixed(2)}</div>
              {!isSumValid && (
                <div className="text-[11px] text-[#efa95f] font-sans">
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
          className="w-full py-3 rounded-lg bg-[#5ec8c0] hover:bg-[#4eb8b0] active:bg-[#3ea8a0] disabled:opacity-50 text-[#1c1921] font-mono font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(94,200,192,0.25)]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'UPDATING SCORING WEIGHTS...' : 'SAVE & RE-RANK INCIDENT QUEUE'}</span>
        </button>

        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-mono text-center font-bold animate-fadeIn ${
            statusMessage.success
              ? 'bg-[#8fbf9f]/15 text-[#8fbf9f] border border-[#8fbf9f]/40'
              : 'bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40'
          }`}>
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
