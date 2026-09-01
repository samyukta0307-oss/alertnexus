import React, { useEffect } from 'react';
import { Zap, X, GitMerge } from 'lucide-react';
import { getAssetPlainSubtitle } from '../utils/assets';

export default function LiveAlertToast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const {
    alert = {},
    incidentId = 'INC-0057',
    beforeScore = 78.4,
    afterScore = 98.5,
    beforePriority = 'P2',
    afterPriority = 'P1',
    message
  } = notification;

  const assetSub = getAssetPlainSubtitle(alert.asset);

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl bg-[#24202b]/95 border border-[#e8a87c]/50 shadow-[0_0_30px_rgba(232,168,124,0.25)] backdrop-blur-md animate-slideInRight font-sans select-none ring-1 ring-[#e8a87c]/30 text-[#f0eae4]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e8a87c]/15 border border-[#e8a87c]/40 flex items-center justify-center text-[#e8a87c] shrink-0 shadow-[0_0_12px_rgba(232,168,124,0.25)] mt-0.5">
            <Zap className="w-5 h-5 animate-pulse text-[#e8a87c]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#e8a87c]/15 text-[#e8a87c] border border-[#e8a87c]/35">
                LIVE TELEMETRY INJECTED
              </span>
              <span className="text-xs font-mono font-bold text-[#f0eae4]">
                {incidentId}
              </span>
            </div>

            <div className="text-xs font-mono font-bold text-[#f0eae4] uppercase">
              {alert.alert_type?.replace(/_/g, ' ')} on {alert.asset}
            </div>

            <div className="text-[11px] font-sans text-[#5ec8c0]/90 italic">
              {assetSub}
            </div>

            {/* Narration of the score change */}
            <div className="pt-1.5 border-t border-white/10 text-xs font-sans text-[#f0eae4] space-y-1">
              <div className="flex items-center gap-1.5 text-[#e88080] font-bold">
                <GitMerge className="w-3.5 h-3.5 text-[#5ec8c0] shrink-0" />
                <span>New alert joined active attack chain!</span>
              </div>
              <p className="text-[11px] text-[#a69c93] leading-snug">
                {message || `Risk escalated from ${beforeScore} (${beforePriority}) to ${afterScore} (${afterPriority}) — incident promoted to top triage priority.`}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-[#a69c93] hover:text-[#f0eae4] hover:bg-white/5 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
