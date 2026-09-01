import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Globe2,
  Play,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  getRankedIncidents,
  getIncidentChain,
  simulateContainment
} from '../api/client';
import ThreatMapScene from '../three/ThreatMapScene';
import { getPriorityStyles } from '../utils/theme';
import { getAssetPlainSubtitle } from '../utils/assets';
import { getContainmentStepsNarration } from '../utils/narration';
import InfoTooltip from '../components/InfoTooltip';

export default function ThreatMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(searchParams.get('id') || '');
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Containment Simulation state
  const [simulating, setSimulating] = useState(false);
  const [containmentResult, setContainmentResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [containmentStage, setContainmentStage] = useState(0); // 0: None, 1: Step 1, 2: Step 2, 3: Completed

  // Load ranked incidents list
  useEffect(() => {
    getRankedIncidents()
      .then(data => {
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          // Default to the top multi-asset attack chain incident (e.g. INC-0057)
          const chainInc = data.find(i => (i.blast_radius?.assets || 1) >= 2) || data[0];
          setSelectedIncidentId(chainInc.incident_id);
          setSearchParams({ id: chainInc.incident_id }, { replace: true });
        }
      })
      .catch(err => {
        console.error('Failed to load incidents for threat map page:', err);
      });
  }, []);

  // Sync from URL
  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId && urlId !== selectedIncidentId) {
      setSelectedIncidentId(urlId);
    }
  }, [searchParams]);

  // Fetch chain data when incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setContainmentResult(null);
    setSelectedEntity(null);
    setContainmentStage(0);

    getIncidentChain(selectedIncidentId)
      .then((chain) => {
        if (isMounted) {
          setChainData(chain);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load threat map telemetry:', err);
          setError(err.message || 'Unable to load incident infrastructure map.');
          setLoading(false);
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

  const handleSimulate = async () => {
    if (!selectedIncidentId) return;
    try {
      setSimulating(true);
      setContainmentStage(1);

      setTimeout(() => {
        setContainmentStage(2);
      }, 1600);

      const res = await simulateContainment(selectedIncidentId);

      setTimeout(() => {
        setContainmentResult(res);
        setContainmentStage(3);
        setSimulating(false);
      }, 3200);
    } catch (err) {
      console.error('Failed to simulate containment:', err);
      setSimulating(false);
      setContainmentStage(0);
    }
  };

  const handleReset = () => {
    setContainmentResult(null);
    setContainmentStage(0);
  };

  const currentIncidentMeta = useMemo(() => {
    return incidents.find(i => i.incident_id === selectedIncidentId);
  }, [incidents, selectedIncidentId]);

  // Parse distinct assets from chain
  const { primaryAsset, connectedAssets, totalAffectedUsers } = useMemo(() => {
    const alerts = chainData?.chain || [];
    if (alerts.length === 0) {
      return { primaryAsset: null, connectedAssets: [], totalAffectedUsers: 0 };
    }

    // Group alerts by asset
    const assetMap = new Map();
    let maxUsers = 0;

    alerts.forEach(a => {
      if (a.affected_users > maxUsers) maxUsers = a.affected_users;
      if (!a.asset) return;

      if (!assetMap.has(a.asset)) {
        assetMap.set(a.asset, {
          name: a.asset,
          type: a.asset_type || 'workstation',
          criticality: a.asset_criticality || a.effective_asset_criticality || 50,
          dominantStage: a.attack_stage || 'none',
          alertCount: 1,
          iocMatch: Boolean(a.ioc_match),
          userAccounts: [a.user_account].filter(Boolean)
        });
      } else {
        const item = assetMap.get(a.asset);
        item.alertCount += 1;
        if (a.ioc_match) item.iocMatch = true;
        if (a.user_account && !item.userAccounts.includes(a.user_account)) {
          item.userAccounts.push(a.user_account);
        }
      }
    });

    const assetList = Array.from(assetMap.values());
    assetList.sort((a, b) => b.criticality - a.criticality);

    const primary = assetList[0] || { name: 'HOST-01', criticality: 50, type: 'workstation' };
    const connected = assetList.slice(1);

    return {
      primaryAsset: primary,
      connectedAssets: connected,
      totalAffectedUsers: maxUsers || (currentIncidentMeta?.blast_radius?.users || 0)
    };
  }, [chainData, currentIncidentMeta]);

  const isContained = Boolean(containmentResult);

  // Generate dynamic containment narration steps
  const containmentSteps = useMemo(() => {
    const assetName = primaryAsset?.name || 'PROD-DB-CUSTOMER-01';
    const before = containmentResult?.before?.finalScore || currentIncidentMeta?.score || 98.5;
    const after = containmentResult?.after?.finalScore || 42.1;
    const red = containmentResult?.after?.riskReductionPercent || 57.2;
    return getContainmentStepsNarration(assetName, totalAffectedUsers, before, after, red);
  }, [primaryAsset, totalAffectedUsers, containmentResult, currentIncidentMeta]);

  return (
    <div className="h-full flex flex-col space-y-4 max-w-7xl mx-auto font-sans text-[#f0eae4]">
      {/* Top Header & Selector Bar */}
      <div className="p-4 rounded-xl bg-[#24202b] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-md">
        <div>
          <h1 className="font-mono text-base font-bold text-[#f0eae4] tracking-wider flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#5ec8c0] animate-pulse" />
            3D BLAST-RADIUS INFRASTRUCTURE THREAT MAP
          </h1>
          <p className="text-xs text-[#a69c93] font-sans mt-0.5">
            Radial infrastructure topology mapping affected crown jewels, reachable nodes, and active containment impact.
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
                {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — Blast: {inc.blast_radius?.assets || 1} asset(s)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident Metadata & Containment Bar */}
      {currentIncidentMeta && (
        <div className="p-3.5 rounded-xl bg-[#2d2736] border border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {(() => {
              const pStyles = getPriorityStyles(currentIncidentMeta.priority_bucket);
              return (
                <span className={`px-2.5 py-0.5 rounded-md font-bold border ${pStyles.badge}`}>
                  {currentIncidentMeta.priority_bucket}
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

          {/* Containment Trigger / Reset Button */}
          <div className="flex items-center gap-3">
            {!containmentResult ? (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-3.5 py-1.5 rounded-lg bg-[#5ec8c0] hover:bg-[#4eb8b0] active:bg-[#3ea8a0] disabled:opacity-50 text-[#1c1921] font-bold tracking-wider transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(94,200,192,0.25)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{simulating ? 'CONTAINING IN REAL TIME...' : 'SIMULATE CONTAINMENT'}</span>
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-lg bg-[#1e1a24] hover:bg-white/5 active:bg-white/10 text-[#f0eae4] font-bold tracking-wider transition flex items-center gap-1.5 border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET SIMULATION</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 3D Viewport & HUD Overlay Area */}
      <div className="flex-1 min-h-[440px] rounded-xl border border-white/10 overflow-hidden relative flex flex-col shadow-2xl">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#17141b] text-[#a69c93]">
            <div className="w-9 h-9 border-2 border-[#5ec8c0]/20 border-t-[#5ec8c0] rounded-full animate-spin"></div>
            <span className="text-xs font-mono">Loading 3D threat map topology...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#17141b] text-[#e88080] text-xs font-mono">
            {error}
          </div>
        ) : (
          <div className="flex-1 w-full h-full relative">
            {/* The 3D ThreatMapScene Canvas */}
            <ThreatMapScene
              primaryAsset={primaryAsset}
              connectedAssets={connectedAssets}
              affectedUsers={totalAffectedUsers}
              isContained={isContained}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
            />

            {/* Orbit Controls Guidance Hint */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#24202b]/80 border border-white/10 text-[10px] font-mono text-[#a69c93] pointer-events-none backdrop-blur-xs">
              🖱️ Drag to orbit • Scroll to zoom • Click node to inspect
            </div>

            {/* DYNAMIC SEQUENTIAL CONTAINMENT NARRATION HUD (Active during / after simulation) */}
            {containmentStage > 0 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-xl p-4 rounded-2xl bg-[#24202b]/95 border border-[#8fbf9f]/80 shadow-[0_0_30px_rgba(143,191,159,0.3)] backdrop-blur-md z-20 animate-fadeIn font-sans space-y-2.5 select-none ring-1 ring-[#8fbf9f]/40">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-[#8fbf9f] font-bold uppercase tracking-wider text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#8fbf9f] animate-pulse" />
                    <span>CONTAINMENT NARRATIVE PROGRESSION</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#8fbf9f]/15 text-[#8fbf9f] border border-[#8fbf9f]/35 text-[10px] font-mono font-bold">
                    STEP {containmentStage} OF 3
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {containmentSteps.map(st => {
                    const isPassed = containmentStage >= st.step;
                    const isCurrent = containmentStage === st.step;
                    return (
                      <div
                        key={st.step}
                        className={`p-2 rounded-lg flex items-start gap-2.5 transition-all duration-300 ${
                          isCurrent
                            ? 'bg-[#8fbf9f]/15 border border-[#8fbf9f]/50 text-[#8fbf9f] font-medium'
                            : isPassed
                            ? 'bg-[#1e1a24] border border-white/10 text-[#f0eae4]'
                            : 'opacity-40 text-[#7d736b]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          isCurrent ? 'bg-[#8fbf9f] animate-ping' : isPassed ? 'bg-[#8fbf9f]' : 'bg-[#7d736b]'
                        }`}></span>
                        <span className="leading-snug">{st.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HTML Legend Overlay */}
            <div className="absolute bottom-3 left-3 p-3 rounded-xl bg-[#24202b]/90 border border-white/10 backdrop-blur-md font-mono text-[10px] space-y-1.5 pointer-events-auto shadow-2xl">
              <div className="text-[#a69c93] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>TOPOLOGY ENTITY KEY</span>
                <InfoTooltip text="Entities representing critical infrastructure targets and affected user credentials." />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#e88080]"></span>
                  <span className="text-[#f0eae4] font-bold">Center Node: Crown Jewel Primary Asset</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5ec8c0]"></span>
                  <span className="text-[#a69c93]">Outer Nodes: Downstream Reachable Assets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#e8a87c] transform rotate-45"></span>
                  <span className="text-[#e8a87c]">Octahedron: User Accounts Footprint</span>
                </div>
                <div className="pt-1 border-t border-white/10 flex items-center gap-2 text-[#8fbf9f]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8fbf9f]"></span>
                  <span>Sage Green / Muted = Contained State</span>
                </div>
              </div>
            </div>

            {/* Selected Asset Inspector Popover */}
            {selectedEntity && (
              <div className="absolute top-3 right-3 w-76 p-4 rounded-xl bg-[#24202b]/95 border border-[#5ec8c0]/50 backdrop-blur-md shadow-2xl space-y-2.5 font-mono text-xs pointer-events-auto animate-fadeIn text-[#f0eae4]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <span className="font-bold text-[#f0eae4] truncate max-w-[180px] block">
                      {selectedEntity.name}
                    </span>
                    {selectedEntity.type !== 'user_group' && (
                      <span className="text-[10px] font-sans text-[#5ec8c0]/90 italic">
                        {getAssetPlainSubtitle(selectedEntity.name)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="text-[#a69c93] hover:text-[#f0eae4] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedEntity.type === 'user_group' ? (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">ENTITY:</span>
                      <span className="text-[#e8a87c] font-bold">User Identity Group</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">AFFECTED USERS:</span>
                      <span className="text-[#f0eae4] font-bold">{selectedEntity.affectedUsers?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">STATUS:</span>
                      <span className={isContained ? 'text-[#a69c93] line-through' : 'text-[#e88080] font-bold'}>
                        {isContained ? 'Credentials Revoked' : 'Active Sessions'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">ASSET TYPE:</span>
                      <span className="text-[#f0eae4] font-semibold">{selectedEntity.type || 'workstation'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">CRITICALITY:</span>
                      <span className="text-[#5ec8c0] font-bold">{selectedEntity.criticality} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">DOMINANT STAGE:</span>
                      <span className="text-[#efa95f] font-bold uppercase">{selectedEntity.dominantStage || 'touched'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a69c93]">CONTAINMENT:</span>
                      <span className={isContained ? 'text-[#8fbf9f] font-bold' : 'text-[#e88080] font-bold'}>
                        {isContained ? '● ISOLATED' : '○ ACTIVE ROUTING'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
