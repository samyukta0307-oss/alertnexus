import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  GitMerge,
  Globe2,
  CheckCircle2,
  Sliders,
  Settings as SettingsIcon,
  Activity,
  Cpu,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { getAlerts, getMlStatus, setMlStatus, rebuildIncidents } from '../api/client';

export default function AppShell({ children, alertCount, onAlertsRefresh, onRebuildSuccess }) {
  const [mlEnabled, setMlEnabledState] = useState(true);
  const [mlLoading, setMlLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    getMlStatus()
      .then(res => setMlEnabledState(res.enabled))
      .catch(() => {});
  }, []);

  const handleToggleMl = async () => {
    try {
      setMlLoading(true);
      const newState = !mlEnabled;
      const res = await setMlStatus(newState);
      setMlEnabledState(res.enabled);
      if (onAlertsRefresh) onAlertsRefresh();
    } catch (err) {
      console.error('Failed to toggle ML status:', err);
    } finally {
      setMlLoading(false);
    }
  };

  const handleRebuild = async () => {
    try {
      setRebuilding(true);
      setRebuildStatus(null);
      const res = await rebuildIncidents(30);
      setRebuildStatus({ success: true, count: res.summary.totalIncidents });
      if (onRebuildSuccess) onRebuildSuccess();
      setTimeout(() => setRebuildStatus(null), 4000);
    } catch (err) {
      console.error('Failed to rebuild incidents:', err);
      setRebuildStatus({ success: false, message: err.message });
      setTimeout(() => setRebuildStatus(null), 5000);
    } finally {
      setRebuilding(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/incidents', label: 'Incidents Queue', icon: ShieldAlert },
    { to: '/attack-chains', label: 'Attack Chains', icon: GitMerge, badge: '3D' },
    { to: '/threat-map', label: 'Threat Map', icon: Globe2, badge: '3D' },
    { to: '/response', label: 'Response & Playbooks', icon: CheckCircle2 },
    { to: '/simulator', label: 'What-If Simulator', icon: Sliders },
    { to: '/settings', label: 'Scoring Weights', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0a0c10] text-slate-100 overflow-hidden select-none">
      {/* Left Sidebar */}
      <aside className="w-64 flex flex-col bg-[#0e1217] border-r border-slate-800/80 shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-mono font-bold tracking-wider text-sm text-white flex items-center gap-1.5">
              CYBERSHIELD <span className="text-cyan-400 text-xs px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">SOC</span>
            </div>
            <div className="text-[10px] tracking-widest text-slate-400 uppercase font-mono">
              Command Center
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0c0f14] space-y-2 text-xs">
          {/* Rebuild Incidents Action */}
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{rebuilding ? 'Rebuilding Graph...' : 'Rebuild Incidents'}</span>
          </button>

          {rebuildStatus && (
            <div className={`text-[11px] p-1.5 rounded font-mono text-center ${
              rebuildStatus.success
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
            }`}>
              {rebuildStatus.success ? `Rebuilt into ${rebuildStatus.count} incidents` : 'Rebuild failed'}
            </div>
          )}

          {/* Engine Status info */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>MySQL 8.0 Engine</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SYNCED
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c0e12]">
        {/* Top Operational Header */}
        <header className="h-14 px-6 bg-[#0e1217] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
              <span className="font-mono text-xs font-semibold tracking-wider text-slate-200">
                SYSTEM ONLINE
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="text-xs text-slate-400 font-mono">
              CyberShield Autonomous SOC Engine v2.0
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Telemetry KPI */}
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
              <span className="text-slate-400">Live Ingested Alerts:</span>
              <span className="text-cyan-400 font-bold">{alertCount !== undefined ? alertCount : '...'}</span>
            </div>

            {/* Runtime ML Anomaly Toggle */}
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">ML Anomaly Signal:</span>
              <button
                onClick={handleToggleMl}
                disabled={mlLoading}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition ${
                  mlEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {mlLoading ? 'UPDATING...' : mlEnabled ? '● ENABLED' : '○ DISABLED'}
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

