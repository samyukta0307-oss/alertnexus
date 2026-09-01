import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function OnboardingBanner({ alertCount = 120, incidentCount = 12 }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden p-4 rounded-xl bg-linear-to-r from-[#24202b] via-[#2d2736] to-[#362e40] border border-[#5ec8c0]/35 shadow-[0_0_24px_rgba(94,200,192,0.15)] flex items-center justify-between gap-4 animate-fadeIn transition-all font-sans">
      {/* Decorative ambient accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-[#e8a87c] to-[#5ec8c0]"></div>

      <div className="flex items-start sm:items-center gap-3.5 pl-2">
        <div className="w-9 h-9 rounded-xl bg-[#5ec8c0]/15 border border-[#5ec8c0]/40 flex items-center justify-center text-[#5ec8c0] shrink-0 mt-0.5 sm:mt-0 shadow-[0_0_12px_rgba(94,200,192,0.2)]">
          <Sparkles className="w-5 h-5 text-[#5ec8c0]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5ec8c0]">
              SOC INTEL BRIEFING
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#5ec8c0]/15 text-[#5ec8c0] border border-[#5ec8c0]/35 font-semibold">
              REAL-TIME TRIAGE
            </span>
          </div>
          <p className="text-sm font-sans font-medium text-[#f0eae4] leading-snug">
            This engine turned <span className="font-mono font-bold text-[#5ec8c0]">{alertCount} raw alerts</span> into <span className="font-mono font-bold text-[#e8a87c]">{incidentCount} real threats</span> — ranked by actual danger, not just how loud they are.
          </p>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        title="Dismiss briefing"
        aria-label="Dismiss briefing"
        className="p-1.5 rounded-lg text-[#a69c93] hover:text-[#f0eae4] hover:bg-white/5 transition shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
