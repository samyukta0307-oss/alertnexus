import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export const JARGON_EXPLANATIONS = {
  ioc_match: 'Matched a known-malicious IP address from verified threat intelligence feeds.',
  mitre: 'Standardized cybersecurity framework cataloging adversary tactics and attack techniques.',
  blast_radius: 'The total number of interconnected servers, databases, and users exposed to this attack.',
  risk_engine: 'Alerts are ranked by actual danger, not just loudness — a quiet alert on a critical system can outrank a loud one on a test machine.',
  correlated_alerts: 'Multiple security alerts across time linked together into a single unified attack sequence.',
  attack_stage: "The current step in the attacker's progression, from initial scanning to data theft.",
  base_risk: 'Weighted combination of alert severity, asset criticality, data sensitivity, and threat confidence.',
  stage_multiplier: 'High-impact phases like data exfiltration multiply risk higher than early reconnaissance.',
  stage_adjusted: 'Base risk multiplied by the danger level of the highest attack stage reached.',
  correlation_boost: 'Attack chains spanning multiple distinct stages receive a priority boost over isolated alerts.',
  risk_momentum: 'A recency bonus reflecting how rapidly new alerts are arriving within this incident.',
  ml_signal: 'Isolation Forest machine learning model boosting confidence when telemetry matches intrusion anomalies.',
  asset_criticality: 'Business importance of the target machine (e.g., customer database vs. developer test sandbox).',
  data_sensitivity: 'Confidentiality rating of stored records (e.g., customer PII, financial ledgers, credentials).',
  attack_confidence: 'How certain our detection sensors and threat intelligence are that this is a real breach.',
  affected_users: 'The total number of employee or customer identity accounts compromised in this incident.',
  business_impact: 'Estimated financial, regulatory, or operational disruption if the attack succeeds.',
  containment: 'Non-destructive simulation of isolating infected hosts and revoking credentials to measure risk reduction.',
  playbook: "Step-by-step mitigation actions matched specifically to the attacker's observed techniques.",
  priority_bucket: 'P1 requires immediate emergency triage, while P4 is low-priority background noise.',
  multi_stage: 'An attack that successfully progressed across multiple phases (e.g., from phishing to exfiltration).',
  telemetry_alerts: 'Raw security events ingested from network firewalls, EDR agents, and identity logs.'
};

/**
 * Reusable InfoTooltip Component
 *
 * Shows a subtle (i) icon or wraps children, providing a one-sentence
 * plain-English explanation on hover, tap, or focus.
 */
export default function InfoTooltip({
  term,
  text,
  children,
  position = 'top',
  className = '',
  iconClassName = 'w-3 h-3 text-[#5ec8c0]/90 hover:text-[#5ec8c0]'
}) {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const explanation = text || (term ? JARGON_EXPLANATIONS[term] : '') || 'Contextual security explanation.';

  // Close on outside click for mobile / tap interactions
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setVisible(false);
      }
    }
    if (visible) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [visible]);

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      {children}

      <button
        ref={triggerRef}
        type="button"
        aria-label="Plain English explanation"
        onClick={(e) => {
          e.stopPropagation();
          setVisible(v => !v);
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex items-center justify-center p-0.5 rounded hover:bg-[#5ec8c0]/15 focus:outline-hidden focus:ring-1 focus:ring-[#5ec8c0] cursor-help transition-colors"
      >
        <Info className={iconClassName} />
      </button>

      {visible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`absolute ${positionClasses} z-50 w-64 p-2.5 rounded-xl bg-[#24202b] text-[#f0eae4] text-[11px] font-sans font-normal leading-relaxed shadow-xl border border-[#5ec8c0]/40 backdrop-blur-md pointer-events-none transition-all animate-fadeIn`}
        >
          <span className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5ec8c0] mt-1.5 shrink-0"></span>
            <span>{explanation}</span>
          </span>
        </span>
      )}
    </span>
  );
}
