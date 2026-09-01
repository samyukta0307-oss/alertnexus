import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitMerge,
  Shield,
  Layers,
  AlertCircle,
  Clock,
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Cpu,
  Info,
  Maximize2,
  X
} from 'lucide-react';
import { getRankedIncidents, getIncidentChain } from '../api/client';
import AttackChainScene, { STAGE_COLORS } from '../three/AttackChainScene';
import { getPriorityStyles } from '../components/IncidentCard';

export default function AttackChainsPage({ onSelectIncidentForDetail }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(searchParams.get('id') || '');
  const [chainData, setChainData] = useState(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState(null);

  // Inspector state
  const [selectedAlert, setSelectedAlert] = useState(null);

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

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header & Selector Bar */}
      <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-purple-400" />
            3D ATTACK-CHAIN TRAJECTORY VISUALIZATION
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Chronological multi-stage attack progression graph correlated over the 30-minute threat window.
          </p>
        </div>

        {/* Incident Selector Dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500 font-bold uppercase">Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => handleSelectIncident(e.target.value)}
            className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 text-slate-200 focus:outline-hidden focus:border-cyan-500/60"
          >
            {incidents.map(inc => (
              <option key={inc.incident_id} value={inc.incident_id}>
                {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — {inc.alert_count} alert(s)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident Metadata Strip */}
      {currentIncidentMeta && (
        <div className="p-3 rounded-lg bg-[#111620] border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shrink-0">
          <div className="flex items-center gap-3">
            {(() => {
              const pStyles = getPriorityStyles(currentIncidentMeta.priority_bucket);
              return (
                <span className={`px-2.5 py-0.5 rounded font-bold border ${pStyles.badge}`}>
                  {currentIncidentMeta.priority_bucket} CRITICAL
                </span>
              );
            })()}
            <span className="font-bold text-white text-sm">
              {currentIncidentMeta.incident_id}
            </span>
            <span className="text-slate-400 uppercase">
              {currentIncidentMeta.alerts?.[0]?.alert_type?.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <div>
              Chain Length: <strong className="text-cyan-400">{alerts.length} alerts</strong>
            </div>
            <div>
              Blast Radius: <strong className="text-purple-300">{currentIncidentMeta.blast_radius?.assets || 1} asset(s)</strong>
            </div>
            <div>
              Distinct Stages: <strong className="text-amber-400">{currentIncidentMeta.distinct_stages || 1}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Viewport & Alert Inspector Area */}
      <div className="flex-1 min-h-[420px] rounded-xl border border-slate-800 overflow-hidden relative flex flex-col">
        {loadingChain ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07090e] text-slate-400">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin"></div>
            <span className="text-xs font-mono">Loading 3D attack chain geometry...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#07090e] text-rose-300 text-xs font-mono">
            {error}
          </div>
        ) : isSingleAlert ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07090e] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-mono font-bold text-slate-200">
              STANDALONE SECURITY ALERT
            </h3>
            <p className="text-xs text-slate-400 max-w-md font-sans">
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
              onSelectAlert={setSelectedAlert}
            />

            {/* Stage Colors HTML Legend Overlay */}
            <div className="absolute bottom-3 left-3 p-3 rounded-lg bg-[#0a0d12]/90 border border-slate-800/90 backdrop-blur-md font-mono text-[10px] space-y-1.5 pointer-events-auto shadow-2xl">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">
                ATTACK STAGE COLOR MAP
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.reconnaissance }}></span>
                  <span className="text-slate-300">Reconnaissance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.initial_access }}></span>
                  <span className="text-slate-300">Initial Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.privilege_escalation }}></span>
                  <span className="text-slate-300">Privilege Escalation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.lateral_movement }}></span>
                  <span className="text-slate-300">Lateral Movement</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.exfiltration }}></span>
                  <span className="text-slate-300">Exfiltration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.persistence }}></span>
                  <span className="text-slate-300">Persistence</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex items-center gap-2 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full border border-rose-500 bg-rose-950"></span>
                <span>Glow Halo = IOC Threat Intel Match</span>
              </div>
            </div>

            {/* Orbit Controls Guidance Hint */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#0a0d12]/80 border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none backdrop-blur-xs">
              🖱️ Drag to rotate • Scroll to zoom • Click node to inspect
            </div>

            {/* Selected Alert Inspector Card */}
            {selectedAlert && (
              <div className="absolute top-3 right-3 w-80 p-4 rounded-xl bg-[#0e1218]/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl space-y-3 font-mono text-xs pointer-events-auto animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-[10px]">
                      {selectedAlert.alert_id}
                    </span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {selectedAlert.alert_type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-slate-500 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ATTACK STAGE:</span>
                    <span className="text-cyan-400 font-bold uppercase">{selectedAlert.attack_stage || 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TARGET ASSET:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[150px]">{selectedAlert.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SOURCE IP:</span>
                    <span className="text-slate-200 font-semibold">{selectedAlert.source_ip || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">USER ACCOUNT:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{selectedAlert.user_account || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MITRE TECHNIQUE:</span>
                    <span className="text-blue-400 font-bold">{selectedAlert.mitre_technique || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CONFIDENCE:</span>
                    <span className="text-emerald-400 font-bold">{selectedAlert.attack_confidence}%</span>
                  </div>
                </div>

                {selectedAlert.ioc_match && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px] space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>THREAT INTEL IOC MATCH</span>
                    </div>
                    <div className="text-slate-300 font-sans">
                      Indicator: <code className="font-mono text-rose-300">{selectedAlert.ioc_indicator || selectedAlert.source_ip}</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: 2D Chronological Horizontal Timeline Strip */}
      <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>2D CHRONOLOGICAL PROGRESSION TIMELINE</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Ordered sequence over time
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
          {sortedAlerts.map((alt, idx) => {
            const isSel = selectedAlert?.alert_id === alt.alert_id;
            const stageColor = STAGE_COLORS[alt.attack_stage] || STAGE_COLORS.none;
            return (
              <React.Fragment key={alt.alert_id || idx}>
                <div
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer select-none shrink-0 w-48 space-y-1.5 ${
                    isSel
                      ? 'bg-slate-900 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50'
                      : 'bg-[#111620] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">
                      STEP {idx + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stageColor }}
                    ></span>
                  </div>

                  <div className="font-mono text-xs font-bold text-white uppercase truncate">
                    {alt.attack_stage || 'event'}
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {alt.asset}
                  </div>

                  <div className="text-[9px] font-mono text-slate-500 truncate">
                    {alt.timestamp ? new Date(alt.timestamp).toLocaleTimeString() : 'T0'}
                  </div>

                  {alt.ioc_match && (
                    <span className="inline-block text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      IOC MATCH
                    </span>
                  )}
                </div>

                {idx < sortedAlerts.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

