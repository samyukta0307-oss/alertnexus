import React from 'react';
import { Globe2, Sparkles, ArrowRight, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ThreatMapPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_24px_rgba(6,182,212,0.2)]">
        <Globe2 className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-bold">
          PHASE 8C ARCHITECTURE HOOK
        </span>
        <h1 className="text-2xl font-mono font-bold text-white tracking-wider">
          3D INFRASTRUCTURE & THREAT MAP
        </h1>
        <p className="text-sm text-slate-400 font-sans max-w-xl mx-auto leading-relaxed">
          The interactive 3D enterprise topology and blast-radius globe will render in Phase 8c. Explore contextual asset criticalities and geographic threat origins.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-[#0e1218] border border-slate-800 text-left font-mono text-xs space-y-3 max-w-lg mx-auto">
        <div className="text-slate-500 font-bold uppercase tracking-wider">Integrated Asset Registry:</div>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>27 Distinct Enterprise Hostnames & Criticality Overrides</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>Blast Radius Radius & Vulnerable Downstream Nodes</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>Real-time Active C2 Egress IP Threat Feeds</span>
          </li>
        </ul>
      </div>

      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <span>Return to Overview Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

