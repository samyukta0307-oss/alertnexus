import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitMerge,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Play,
  Info,
  X
} from 'lucide-react';
import { getRankedIncidents, getIncidentChain } from '../api/client';
import AttackChainScene, { STAGE_COLORS } from '../three/AttackChainScene';
import { getPriorityStyles } from '../utils/theme';
import { formatMitreTechnique, getMitreDescription } from '../utils/mitre';
import { getAssetPlainSubtitle } from '../utils/assets';
import { getAttackStepNarration } from '../utils/narration';
import InfoTooltip from '../components/InfoTooltip';

export default function AttackChainsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(searchParams.get('id') || '');
  const [chainData, setChainData] = useState(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState(null);

  // Inspector state
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Sequential Walkthrough State
  const [isWalkthrough, setIsWalkthrough] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Load ranked incidents list
  useEffect(() => {
    getRankedIncidents()
      .then(data => {
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          // Default to the top multi-stage attack chain incident (e.g. INC-0057)
          const chainInc = data.find(i => (i.alert_count || 1) >= 3) || data[0];
          setSelectedIncidentId(chainInc.incident_id);
          setSearchParams({ id: chainInc.incident_id }, { replace: true });
        }
      })
      .catch(err => {
        console.error('Failed to load incidents for attack chains page:', err);
      });
  }, []);

  // Update selected incident from URL query if changed
  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId && urlId !== selectedIncidentId) {
      setSelectedIncidentId(urlId);
    }
  }, [searchParams]);

  // Fetch chain telemetry when selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;

    let isMounted = true;
    setLoadingChain(true);
    setError(null);
    setSelectedAlert(null);
    setIsWalkthrough(false);
    setActiveStepIndex(0);
    setIsAutoPlaying(false);

    getIncidentChain(selectedIncidentId)
      .then(data => {
        if (isMounted) {
          setChainData(data);
          if (data.chain && data.chain.length > 0) {
            setSelectedAlert(data.chain[0]);
          }
          setLoadingChain(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load incident chain:', err);
          setError(err.message || 'Unable to load attack chain data.');
          setLoadingChain(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId]);

  const handleSelectIncident = (id) => {
    setSelectedIncidentId(id);
    setSearchParams({ id });
  };

  const currentIncidentMeta = useMemo(() => {
    return incidents.find(i => i.incident_id === selectedIncidentId);
  }, [incidents, selectedIncidentId]);

  const alerts = chainData?.chain || [];
  const isSingleAlert = alerts.length === 1;

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [alerts]);

  // Handle step selection in walkthrough
  const handleSelectStep = useCallback((index) => {
    if (index >= 0 && index < sortedAlerts.length) {
      setActiveStepIndex(index);
      setSelectedAlert(sortedAlerts[index]);
    }
  }, [sortedAlerts]);

  // Keyboard navigation for walkthrough (ArrowLeft, ArrowRight, Spacebar, Escape)
  useEffect(() => {
    if (!isWalkthrough || sortedAlerts.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (activeStepIndex < sortedAlerts.length - 1) {
          handleSelectStep(activeStepIndex + 1);
        } else {
          setIsAutoPlaying(false);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeStepIndex > 0) {
          handleSelectStep(activeStepIndex - 1);
        }
      } else if (e.key === 'Escape') {
        setIsWalkthrough(false);
        setIsAutoPlaying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkthrough, activeStepIndex, sortedAlerts.length, handleSelectStep]);

  // Auto-play timer for walkthrough
  useEffect(() => {
    if (!isWalkthrough || !isAutoPlaying || sortedAlerts.length === 0) return;

    const timer = setInterval(() => {
      setActiveStepIndex(curr => {
        if (curr < sortedAlerts.length - 1) {
          const next = curr + 1;
          setSelectedAlert(sortedAlerts[next]);
          return next;
        } else {
          setIsAutoPlaying(false);
          return curr;
        }
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [isWalkthrough, isAutoPlaying, sortedAlerts]);

  const startWalkthrough = () => {
    setIsWalkthrough(true);
    setActiveStepIndex(0);
    if (sortedAlerts.length > 0) {
      setSelectedAlert(sortedAlerts[0]);
    }
  };

  const currentStepAlert = sortedAlerts[activeStepIndex] || selectedAlert || sortedAlerts[0];
  const stepNarrationText = currentStepAlert
    ? getAttackStepNarration(currentStepAlert, activeStepIndex, sortedAlerts.length)
    : '';

  return (
    <div className="h-full flex flex-col space-y-4 max-w-7xl mx-auto font-sans text-[#f0eae4]">
      {/* Top Header & Selector Bar */}
      <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-md">
        <div>
          <h1 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-[#e8a87c]" />
            3D ATTACK-CHAIN TRAJECTORY VISUALIZATION
          </h1>
          <p className="text-xs text-[#a69c93] font-sans mt-0.5">
            Chronological multi-stage attack progression graph correlated over the 30-minute threat window.
          </p>
        </div>

        {/* Incident Selector Dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[#a69c93] font-bold uppercase">Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => handleSelectIncident(e.target.value)}
            className="p-2 rounded-lg bg-[#1e1a24] border border-white/10 text-[#f0eae4] focus:outline-hidden focus:border-[#5ec8c0]/60 transition"
          >
            {incidents.map(inc => (
              <option key={inc.incident_id} value={inc.incident_id}>
                {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — {inc.alert_count} alert(s)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident Metadata & Walkthrough Control Bar */}
      {currentIncidentMeta && (
        <div className="p-3.5 rounded-xl bg-[#2d2736] border border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {(() => {
              const pStyles = getPriorityStyles(currentIncidentMeta.priority_bucket);
              return (
                <span className={`px-2.5 py-0.5 rounded-md font-bold border ${pStyles.badge}`}>
                  {currentIncidentMeta.priority_bucket} CRITICAL
                </span>
              );
            })()}
            <span className="font-bold text-[#f0eae4] text-sm">
              {currentIncidentMeta.incident_id}
            </span>
            <span className="text-[#a69c93] uppercase font-semibold">
              {currentIncidentMeta.alerts?.[0]?.alert_type?.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Play Attack Timeline Button */}
            {!isWalkthrough ? (
              <button
                onClick={startWalkthrough}
                disabled={sortedAlerts.length <= 1}
                className="px-3.5 py-1.5 rounded-lg bg-linear-to-r from-[#e8a87c] to-[#5ec8c0] hover:brightness-110 disabled:opacity-50 text-[#1c1921] font-bold tracking-wider transition flex items-center gap-1.5 shadow-[0_0_14px_rgba(94,200,192,0.2)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY ATTACK TIMELINE</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-[#1e1a24] p-1 rounded-lg border border-[#e8a87c]/40">
                <button
                  onClick={() => handleSelectStep(Math.max(0, activeStepIndex - 1))}
                  disabled={activeStepIndex === 0}
                  className="p-1 rounded hover:bg-white/5 disabled:opacity-40 text-[#f0eae4]"
                  title="Previous step (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[#e8a87c] px-2">
                  Step {activeStepIndex + 1} of {sortedAlerts.length}
                </span>

                <button
                  onClick={() => handleSelectStep(Math.min(sortedAlerts.length - 1, activeStepIndex + 1))}
                  disabled={activeStepIndex === sortedAlerts.length - 1}
                  className="p-1 rounded hover:bg-white/5 disabled:opacity-40 text-[#f0eae4]"
                  title="Next step (Right Arrow or Space)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsAutoPlaying(p => !p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    isAutoPlaying ? 'bg-[#5ec8c0]/20 text-[#5ec8c0]' : 'bg-white/5 text-[#a69c93]'
                  }`}
                  title="Auto-play progression"
                >
                  {isAutoPlaying ? 'Pause' : 'Auto'}
                </button>

                <button
                  onClick={() => {
                    setIsWalkthrough(false);
                    setIsAutoPlaying(false);
                  }}
                  className="p-1 rounded hover:bg-white/5 text-[#a69c93] hover:text-[#f0eae4]"
                  title="Exit Walkthrough"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-3 text-[#a69c93]">
              <div className="flex items-center gap-1">
                <span>Chain:</span>
                <strong className="text-[#5ec8c0]">{alerts.length} alerts</strong>
              </div>
              <div className="flex items-center gap-1">
                <span>Blast:</span>
                <strong className="text-[#e8a87c]">{currentIncidentMeta.blast_radius?.assets || 1} asset(s)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Viewport & Alert Inspector Area */}
      <div className="flex-1 min-h-[420px] rounded-xl border border-white/10 overflow-hidden relative flex flex-col shadow-2xl">
        {loadingChain ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#17141b] text-[#a69c93]">
            <div className="w-9 h-9 border-2 border-[#5ec8c0]/20 border-t-[#5ec8c0] rounded-full animate-spin"></div>
            <span className="text-xs font-mono">Loading 3D attack chain geometry...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#17141b] text-[#e88080] text-xs font-mono">
            {error}
          </div>
        ) : isSingleAlert ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#17141b] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#24202b] border border-white/10 flex items-center justify-center text-[#a69c93]">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-mono font-bold text-[#f0eae4]">
              STANDALONE SECURITY ALERT
            </h3>
            <p className="text-xs text-[#a69c93] max-w-md font-sans">
              This incident contains an isolated alert with no correlated lateral movements or sequential attack stages within the 30-minute correlation window.
            </p>
            <div className="w-full max-w-md h-64 mt-2">
              <AttackChainScene
                alerts={alerts}
                selectedAlert={selectedAlert}
                onSelectAlert={setSelectedAlert}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full h-full relative">
            {/* The 3D React Three Fiber Canvas */}
            <AttackChainScene
              alerts={alerts}
              selectedAlert={selectedAlert}
              onSelectAlert={(alt) => {
                setSelectedAlert(alt);
                const idx = sortedAlerts.findIndex(a => a.alert_id === alt.alert_id);
                if (idx >= 0) setActiveStepIndex(idx);
              }}
            />

            {/* DYNAMIC PRESENTER WALKTHROUGH HUD (When Walkthrough is Active) */}
            {isWalkthrough && currentStepAlert && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl p-4 rounded-2xl bg-[#24202b]/95 border border-[#e8a87c]/80 shadow-[0_0_30px_rgba(232,168,124,0.25)] backdrop-blur-md z-20 animate-fadeIn font-sans space-y-2 select-none ring-1 ring-[#e8a87c]/40">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#e8a87c]/15 text-[#e8a87c] border border-[#e8a87c]/40 font-mono font-bold text-xs">
                      STEP {activeStepIndex + 1} OF {sortedAlerts.length}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#f0eae4] uppercase">
                      {currentStepAlert.attack_stage || 'event'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#a69c93]">
                    Use <strong className="text-[#f0eae4]">Space / Arrow keys</strong> to advance
                  </div>
                </div>

                <p className="text-sm font-medium text-[#f0eae4] leading-snug">
                  {stepNarrationText}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#a69c93]">
                  <span>Target: <strong className="text-[#5ec8c0]">{currentStepAlert.asset}</strong></span>
                  <span>Confidence: <strong className="text-[#8fbf9f]">{currentStepAlert.attack_confidence}%</strong></span>
                  {currentStepAlert.mitre_technique && (
                    <span>MITRE: <strong className="text-[#e8a87c]">{currentStepAlert.mitre_technique}</strong></span>
                  )}
                </div>
              </div>
            )}

            {/* Stage Colors HTML Legend Overlay */}
            <div className="absolute bottom-3 left-3 p-3 rounded-xl bg-[#24202b]/90 border border-white/10 backdrop-blur-md font-mono text-[10px] space-y-1.5 pointer-events-auto shadow-2xl">
              <div className="text-[#a69c93] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>ATTACK STAGE COLOR MAP</span>
                <InfoTooltip term="attack_stage" />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.reconnaissance }}></span>
                  <span className="text-[#f0eae4]">Reconnaissance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.initial_access }}></span>
                  <span className="text-[#f0eae4]">Initial Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.privilege_escalation }}></span>
                  <span className="text-[#f0eae4]">Privilege Escalation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.lateral_movement }}></span>
                  <span className="text-[#f0eae4]">Lateral Movement</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.exfiltration }}></span>
                  <span className="text-[#f0eae4]">Exfiltration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.persistence }}></span>
                  <span className="text-[#f0eae4]">Persistence</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center gap-2 text-[#e88080]">
                <span className="w-2.5 h-2.5 rounded-full border border-[#e88080] bg-[#e88080]/20"></span>
                <span>Glow Halo = Threat Intel IOC Hit</span>
                <InfoTooltip term="ioc_match" />
              </div>
            </div>

            {/* Orbit Controls Guidance Hint */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#24202b]/80 border border-white/10 text-[10px] font-mono text-[#a69c93] pointer-events-none backdrop-blur-xs">
              🖱️ Drag to rotate • Scroll to zoom • Click node to inspect
            </div>

            {/* Selected Alert Inspector Card */}
            {selectedAlert && !isWalkthrough && (
              <div className="absolute top-3 right-3 w-84 p-4 rounded-xl bg-[#24202b]/95 border border-[#5ec8c0]/50 backdrop-blur-md shadow-2xl space-y-3 font-mono text-xs pointer-events-auto animate-fadeIn text-[#f0eae4]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#5ec8c0]/15 text-[#5ec8c0] border border-[#5ec8c0]/35 font-bold text-[10px]">
                      {selectedAlert.alert_id}
                    </span>
                    <span className="font-bold text-[#f0eae4] truncate max-w-[160px]">
                      {selectedAlert.alert_type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-[#a69c93] hover:text-[#f0eae4] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#a69c93] flex items-center gap-1">
                      <span>ATTACK STAGE:</span>
                      <InfoTooltip term="attack_stage" />
                    </span>
                    <span className="text-[#5ec8c0] font-bold uppercase">{selectedAlert.attack_stage || 'none'}</span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a69c93]">TARGET ASSET:</span>
                      <span className="text-[#f0eae4] font-semibold truncate max-w-[150px]">{selectedAlert.asset}</span>
                    </div>
                    <div className="text-[10px] font-sans text-[#5ec8c0]/90 italic text-right truncate">
                      {getAssetPlainSubtitle(selectedAlert.asset)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#a69c93]">SOURCE IP:</span>
                    <span className="text-[#f0eae4] font-semibold">{selectedAlert.source_ip || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#a69c93]">USER ACCOUNT:</span>
                    <span className="text-[#f0eae4] truncate max-w-[150px]">{selectedAlert.user_account || 'N/A'}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#a69c93] flex items-center gap-1">
                        <span>MITRE TECHNIQUE:</span>
                        <InfoTooltip text={getMitreDescription(selectedAlert.mitre_technique)} />
                      </span>
                    </div>
                    <div className="text-[#5ec8c0] font-bold bg-[#1e1a24] px-2 py-1 rounded border border-white/10 text-[10px] truncate">
                      {formatMitreTechnique(selectedAlert.mitre_technique) || 'N/A'}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#a69c93] flex items-center gap-1">
                      <span>CONFIDENCE:</span>
                      <InfoTooltip term="attack_confidence" />
                    </span>
                    <span className="text-[#8fbf9f] font-bold">{selectedAlert.attack_confidence}%</span>
                  </div>
                </div>

                {selectedAlert.ioc_match && (
                  <div className="p-2.5 rounded-lg bg-[#e88080]/15 border border-[#e88080]/40 text-[#e88080] text-[10px] space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-[#e88080]" />
                      <span>THREAT INTEL IOC MATCH</span>
                      <InfoTooltip term="ioc_match" />
                    </div>
                    <div className="text-[#f0eae4] font-sans">
                      Matched Indicator: <code className="font-mono text-[#e88080]">{selectedAlert.ioc_indicator || selectedAlert.source_ip}</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: 2D Chronological Horizontal Timeline Strip */}
      <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 space-y-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-[#f0eae4] font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-[#5ec8c0]" />
            <span>2D CHRONOLOGICAL PROGRESSION TIMELINE</span>
          </div>
          <span className="text-[11px] text-[#a69c93] font-sans">
            Click any step to inspect or jump in the 3D trajectory
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1">
          {sortedAlerts.map((alt, idx) => {
            const isSel = (isWalkthrough && activeStepIndex === idx) || (!isWalkthrough && selectedAlert?.alert_id === alt.alert_id);
            const stageColor = STAGE_COLORS[alt.attack_stage] || STAGE_COLORS.none;
            const assetSub = getAssetPlainSubtitle(alt.asset);
            return (
              <React.Fragment key={alt.alert_id || idx}>
                <div
                  onClick={() => {
                    handleSelectStep(idx);
                  }}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none shrink-0 w-52 space-y-1.5 ${
                    isSel
                      ? 'bg-[#373042] border-[#5ec8c0] shadow-[0_0_16px_rgba(94,200,192,0.25)] ring-1 ring-[#5ec8c0]'
                      : 'bg-[#2d2736] border-white/10 hover:border-white/20 hover:bg-[#342c3d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#a69c93] font-bold">
                      STEP {idx + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stageColor }}
                    ></span>
                  </div>

                  <div className="font-mono text-xs font-bold text-[#f0eae4] uppercase truncate">
                    {alt.attack_stage || 'event'}
                  </div>

                  <div className="text-[10px] font-mono text-[#a69c93] font-semibold truncate">
                    {alt.asset}
                  </div>

                  <div className="text-[9px] font-sans text-[#5ec8c0]/90 italic truncate">
                    {assetSub}
                  </div>

                  <div className="text-[9px] font-mono text-[#7d736b] truncate pt-0.5">
                    {alt.timestamp ? new Date(alt.timestamp).toLocaleTimeString() : 'T0'}
                  </div>

                  {alt.ioc_match && (
                    <span className="inline-block text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/35">
                      IOC MATCH
                    </span>
                  )}
                </div>

                {idx < sortedAlerts.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-[#7d736b] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
