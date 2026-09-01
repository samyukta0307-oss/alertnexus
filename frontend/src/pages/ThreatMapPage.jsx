import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Globe2,
  Shield,
  Layers,
  Flame,
  Play,
  RotateCcw,
  AlertTriangle,
  Info,
  Server,
  Users,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  getRankedIncidents,
  getIncidentChain,
  getIncidentExplain,
  simulateContainment
} from '../api/client';
import ThreatMapScene from '../three/ThreatMapScene';
import { STAGE_COLORS } from '../three/AttackChainScene';
import { getPriorityStyles } from '../components/IncidentCard';

export default function ThreatMapPage({ onSelectIncidentForDetail }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(searchParams.get('id') || '');
  const [chainData, setChainData] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Containment Simulation state
  const [simulating, setSimulating] = useState(false);
  const [containmentResult, setContainmentResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

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

  // Fetch chain and explain data when incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setContainmentResult(null);
    setSelectedEntity(null);

    Promise.all([
      getIncidentChain(selectedIncidentId),
      getIncidentExplain(selectedIncidentId)
    ])
      .then(([chain, explain]) => {
        if (isMounted) {
          setChainData(chain);
          setExplainData(explain);
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
      const res = await simulateContainment(selectedIncidentId);
      setContainmentResult(res);
    } catch (err) {
      console.error('Failed to simulate containment:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = () => {
    setContainmentResult(null);
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
    // Sort by criticality descending so highest criticality is the primary center node
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

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header & Selector Bar */}
      <div className="p-4 rounded-xl bg-[#0e1218] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400 animate-pulse" />
            3D BLAST-RADIUS INFRASTRUCTURE THREAT MAP
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Radial infrastructure topology mapping affected crown jewels, reachable nodes, and active containment impact.
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
                {inc.incident_id} — {inc.priority_bucket} (Risk {inc.score}) — Blast: {inc.blast_radius?.assets || 1} asset(s)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident Metadata & Containment Bar */}
      {currentIncidentMeta && (
        <div className="p-3 rounded-lg bg-[#111620] border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shrink-0">
          <div className="flex items-center gap-3">
            {(() => {
              const pStyles = getPriorityStyles(currentIncidentMeta.priority_bucket);
              return (
                <span className={`px-2.5 py-0.5 rounded font-bold border ${pStyles.badge}`}>
                  {currentIncidentMeta.priority_bucket}
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

          {/* Containment Trigger / Reset Button */}
          <div className="flex items-center gap-3">
            {!containmentResult ? (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-bold tracking-wider transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{simulating ? 'SIMULATING...' : 'SIMULATE CONTAINMENT'}</span>
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-bold tracking-wider transition flex items-center gap-1.5 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET SIMULATION</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 3D Viewport & HUD Overlay Area */}
      <div className="flex-1 min-h-[440px] rounded-xl border border-slate-800 overflow-hidden relative flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07090e] text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
            <span className="text-xs font-mono">Loading 3D threat map topology...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#07090e] text-rose-300 text-xs font-mono">
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
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#0a0d12]/80 border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none backdrop-blur-xs">
              🖱️ Drag to orbit • Scroll to zoom • Click node to inspect
            </div>

            {/* HTML Legend Overlay */}
            <div className="absolute bottom-3 left-3 p-3 rounded-lg bg-[#0a0d12]/90 border border-slate-800/90 backdrop-blur-md font-mono text-[10px] space-y-1.5 pointer-events-auto shadow-2xl">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">
                TOPOLOGY ENTITY KEY
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-slate-200 font-bold">Center Node: Crown Jewel Primary Asset</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span className="text-slate-300">Outer Nodes: Downstream Reachable Assets (Size = Criticality)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-purple-400 transform rotate-45"></span>
                  <span className="text-purple-300">Octahedron: Total Affected User Accounts Footprint</span>
                </div>
                <div className="pt-1 border-t border-slate-800 flex items-center gap-2 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Green Emissive / Muted Gray = Contained State</span>
                </div>
              </div>
            </div>

            {/* Containment Impact Overlay Card (Triggered by Simulate Containment) */}
            {containmentResult && (
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-full max-w-lg p-4 rounded-xl bg-[#0e1218]/95 border border-emerald-500/80 backdrop-blur-md shadow-[0_0_24px_rgba(16,185,129,0.25)] space-y-3 font-mono text-xs pointer-events-auto animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>CONTAINMENT SIMULATION IMPACT</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    Risk Reduction: -{containmentResult.after.riskReductionPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">PRE-CONTAINMENT</div>
                    <div className="text-lg font-extrabold text-rose-400 mt-1">
                      {containmentResult.before.finalScore} <span className="text-xs font-bold">({containmentResult.before.priorityBucket})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Blast: {containmentResult.before.blastRadius.assets} assets • {containmentResult.before.blastRadius.users} users
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase">POST-CONTAINMENT</div>
                    <div className="text-lg font-extrabold text-emerald-400 mt-1">
                      {containmentResult.after.finalScore} <span className="text-xs font-bold">({containmentResult.after.priorityBucket})</span>
                    </div>
                    <div className="text-[10px] text-emerald-300/80 mt-0.5">
                      Blast: 0 uncontained assets (Neutralized)
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-sans leading-relaxed text-center">
                  * Live 3D nodes representing {containmentResult.containedEntities?.isolatedAssets?.length || 0} host(s) have been visually decoupled and isolated.
                </div>
              </div>
            )}

            {/* Selected Asset Inspector Popover */}
            {selectedEntity && (
              <div className="absolute top-3 right-3 w-72 p-4 rounded-xl bg-[#0e1218]/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl space-y-2.5 font-mono text-xs pointer-events-auto animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white truncate max-w-[180px]">
                    {selectedEntity.name}
                  </span>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="text-slate-500 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedEntity.type === 'user_group' ? (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ENTITY:</span>
                      <span className="text-purple-300 font-bold">User Identity Group</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">AFFECTED USERS:</span>
                      <span className="text-white font-bold">{selectedEntity.affectedUsers?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">STATUS:</span>
                      <span className={isContained ? 'text-slate-400 line-through' : 'text-rose-400'}>
                        {isContained ? 'Credentials Revoked' : 'Active Sessions'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ASSET TYPE:</span>
                      <span className="text-slate-200 font-semibold">{selectedEntity.type || 'workstation'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CRITICALITY:</span>
                      <span className="text-cyan-400 font-bold">{selectedEntity.criticality} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DOMINANT STAGE:</span>
                      <span className="text-amber-400 font-bold uppercase">{selectedEntity.dominantStage || 'touched'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CONTAINMENT:</span>
                      <span className={isContained ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
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

