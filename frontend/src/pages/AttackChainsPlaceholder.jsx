import React from 'react';
import { GitMerge, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AttackChainsPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-[0_0_24px_rgba(168,85,247,0.2)]">
        <GitMerge className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/50 font-bold">
          PHASE 8B ARCHITECTURE HOOK
        </span>
        <h1 className="text-2xl font-mono font-bold text-white tracking-wider">
          3D ATTACK-CHAIN GRAPH VISUALIZATION
        </h1>
        <p className="text-sm text-slate-400 font-sans max-w-xl mx-auto leading-relaxed">
          The interactive Three.js 3D multi-stage attack trajectory graph will render in Phase 8b. Select any incident from the queue to investigate its chronological attack progression.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-[#0e1218] border border-slate-800 text-left font-mono text-xs space-y-3 max-w-lg mx-auto">
        <div className="text-slate-500 font-bold uppercase tracking-wider">Prepared Data Pipeline:</div>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>Connected Components Graph (30-minute correlation window)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>MITRE ATT&CK Stage Multipliers (1.0x → 2.2x Exfiltration)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>Chronological Lateral Movement & Credential Hops</span>
          </li>
        </ul>
      </div>

      <div className="pt-2">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <span>View Active Incident Queue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

