import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
  Eye,
  Play,
  Zap
} from 'lucide-react';
import { getMlStatus, setMlStatus, rebuildIncidents } from '../api/client';
import { useViewMode } from '../context/ViewModeContext';
import InfoTooltip from './InfoTooltip';

export default function AppShell({
  children,
  alertCount,
  onAlertsRefresh,
  onRebuildSuccess,
  onOpenReplay,
  onInjectLiveAlert,
  injectingLiveAlert = false
}) {
  const { viewMode, setViewMode } = useViewMode();
  const [mlEnabled, setMlEnabledState] = useState(true);
  const [mlLoading, setMlLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState(null);

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
    <div className="flex h-screen w-full bg-[#1c1921] text-[#f0eae4] overflow-hidden select-none font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 flex flex-col bg-[#24202b] border-r border-white/10 shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0] shadow-[0_0_14px_rgba(94,200,192,0.2)]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-mono font-bold tracking-wider text-sm text-[#f0eae4] flex items-center gap-1.5">
              CYBERSHIELD <span className="text-[#5ec8c0] text-xs px-1.5 py-0.5 rounded bg-[#5ec8c0]/15 border border-[#5ec8c0]/40">SOC</span>
            </div>
            <div className="text-[10px] tracking-widest text-[#a69c93] uppercase font-mono">
              Command Center
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#5ec8c0]/15 text-[#5ec8c0] border border-[#5ec8c0]/40 shadow-[0_0_14px_rgba(94,200,192,0.18)] font-semibold'
                      : 'text-[#a69c93] hover:text-[#f0eae4] hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1e1a24] text-[#5ec8c0] border border-[#5ec8c0]/30 font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3.5 border-t border-white/10 bg-[#1e1a24] space-y-2.5 text-xs">
          {/* Rebuild Incidents Action */}
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2d2736] hover:bg-[#373042] active:bg-[#3f384c] disabled:opacity-50 text-[#f0eae4] text-xs font-mono font-medium border border-white/10 transition duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5ec8c0] ${rebuilding ? 'animate-spin' : ''}`} />
            <span>{rebuilding ? 'Rebuilding Graph...' : 'Re-correlate Graph'}</span>
          </button>

          {rebuildStatus && (
            <div className={`p-2 rounded text-[11px] font-mono text-center font-bold ${
              rebuildStatus.success
                ? 'bg-[#8fbf9f]/15 text-[#8fbf9f] border border-[#8fbf9f]/40'
                : 'bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40'
            }`}>
              {rebuildStatus.success ? `Rebuilt into ${rebuildStatus.count} incidents` : 'Rebuild failed'}
            </div>
          )}

          {/* Engine Status info */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-[#a69c93] font-mono">
            <span>MySQL 8.0 Engine</span>
            <span className="flex items-center gap-1.5 text-[#8fbf9f] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8fbf9f] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8fbf9f] shadow-[0_0_8px_#8fbf9f]"></span>
              </span>
              SYNCED
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#1c1921]">
        {/* Top Operational Header */}
        <header className="h-14 px-6 bg-[#24202b] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8fbf9f] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8fbf9f] shadow-[0_0_8px_#8fbf9f]"></span>
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-[#f0eae4]">
                SYSTEM ONLINE
              </span>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="text-xs text-[#a69c93] font-mono hidden sm:block">
              CyberShield Autonomous SOC Engine v2.0
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Demo Mode Actions: Run Live Demo & Inject Alert */}
            {onOpenReplay && (
              <button
                type="button"
                onClick={onOpenReplay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-[#e8a87c] to-[#5ec8c0] hover:brightness-110 text-[#1c1921] text-xs font-mono font-bold tracking-wider shadow-[0_0_14px_rgba(94,200,192,0.25)] transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Run Live Demo</span>
              </button>
            )}

            {onInjectLiveAlert && (
              <button
                type="button"
                onClick={onInjectLiveAlert}
                disabled={injectingLiveAlert}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#e8a87c]/15 hover:bg-[#e8a87c]/25 text-[#e8a87c] border border-[#e8a87c]/40 text-xs font-mono font-bold tracking-wider transition disabled:opacity-50"
                title="Simulate real-time telemetry arrival"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">{injectingLiveAlert ? 'Injecting...' : 'Inject Alert'}</span>
              </button>
            )}

            {/* Density Mode Switch (Simple View / Analyst View) */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#1e1a24] border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode('simple')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider transition-all duration-200 ${
                  viewMode === 'simple'
                    ? 'bg-[#5ec8c0]/20 text-[#5ec8c0] border border-[#5ec8c0]/40 shadow-[0_0_10px_rgba(94,200,192,0.2)]'
                    : 'text-[#a69c93] hover:text-[#f0eae4] border border-transparent'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-[#5ec8c0]" />
                <span>Simple View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('analyst')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider transition-all duration-200 ${
                  viewMode === 'analyst'
                    ? 'bg-[#5ec8c0]/20 text-[#5ec8c0] border border-[#5ec8c0]/40 shadow-[0_0_10px_rgba(94,200,192,0.2)]'
                    : 'text-[#a69c93] hover:text-[#f0eae4] border border-transparent'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-[#5ec8c0]" />
                <span>Analyst View</span>
              </button>
            </div>

            {/* Live Telemetry KPI */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2d2736] border border-white/10 font-mono text-xs">
              <span className="text-[#a69c93]">Alerts:</span>
              <span className="text-[#5ec8c0] font-bold">{alertCount !== undefined ? alertCount : '...'}</span>
              <InfoTooltip term="telemetry_alerts" />
            </div>

            {/* Runtime ML Anomaly Toggle */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2d2736] border border-white/10 font-mono text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#5ec8c0]" />
              <span className="text-[#a69c93] hidden md:inline">ML Signal:</span>
              <button
                onClick={handleToggleMl}
                disabled={mlLoading}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition duration-150 ${
                  mlEnabled
                    ? 'bg-[#5ec8c0]/20 text-[#5ec8c0] border border-[#5ec8c0]/40 hover:bg-[#5ec8c0]/30 shadow-[0_0_8px_rgba(94,200,192,0.2)]'
                    : 'bg-[#1e1a24] text-[#a69c93] border border-white/10 hover:bg-[#373042]'
                }`}
              >
                {mlLoading ? 'UPDATING...' : mlEnabled ? '● ENABLED' : '○ DISABLED'}
              </button>
              <InfoTooltip term="ml_signal" />
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#1c1921]">
          {children}
        </main>
      </div>
    </div>
  );
}
