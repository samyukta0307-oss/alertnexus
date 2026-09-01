/**
 * Narration & Dynamic Explanation Generator
 *
 * Produces plain-English, context-rich narratives dynamically computed
 * from real telemetry, scores, attack stages, and containment states.
 */

import { formatMitreTechnique, getMitreName } from './mitre';
import { getAssetPlainSubtitle } from './assets';

/**
 * Generates 5 dynamic plain-language narration captions for the score build-up progression.
 * @param {Object} explainData
 * @param {number} rank
 * @param {number} totalIncidents
 * @returns {Object} { base, stage, correlation, momentum, final }
 */
export function generateScoreNarration(explainData, rank = 1, totalIncidents = 12) {
  if (!explainData) return {};

  const top = explainData.topAlert || {};
  const breakdown = explainData.scoreBreakdown || {};
  const contribs = breakdown.contributions || {};

  // 1. Base Score Narration
  const baseVal = (breakdown.base || 0).toFixed(1);
  const sev = Math.round((top.severity || 50));
  const crit = Math.round((top.asset_criticality || top.effective_asset_criticality || 50));
  const sens = Math.round((top.data_sensitivity || 50));
  const baseCaption = `Started at ${baseVal} out of 100 based on alert severity (${sev}%), asset criticality (${crit}%), and data sensitivity (${sens}%).`;

  // 2. Stage Multiplier Narration
  const stage = (top.attack_stage || 'reconnaissance').toLowerCase();
  const mult = breakdown.stageMultiplier || 1.0;
  let stageContext = 'early stage activity was detected.';
  if (stage === 'exfiltration') {
    stageContext = 'critical database records or files may already be leaving the network.';
  } else if (stage === 'lateral_movement') {
    stageContext = 'the adversary is actively pivoting deeper across internal servers.';
  } else if (stage === 'privilege_escalation') {
    stageContext = 'the attacker has seized elevated administrative permissions.';
  } else if (stage === 'persistence') {
    stageContext = 'the intruder established startup hooks to maintain continuous access.';
  } else if (stage === 'initial_access') {
    stageContext = 'an external entry vector (e.g. phishing or exposed service) was breached.';
  } else if (stage === 'reconnaissance') {
    stageContext = 'pre-attack network probing was detected before deeper compromise.';
  }

  const stageNameCapitalized = stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const stageCaption = `Because this attack reached the ${stageNameCapitalized} stage, its risk was multiplied by ${mult}x — ${stageContext}`;

  // 3. Correlation Boost Narration
  const distinctStages = explainData.distinctAttackStages?.length || 1;
  const alertCount = explainData.alert_count || explainData.chain?.length || (distinctStages > 1 ? distinctStages : 1);
  const boostVal = (breakdown.correlationBoost || 0).toFixed(2);
  let correlationCaption = `This alert isn't isolated — it is part of an attack chain of ${alertCount} linked alerts spanning ${distinctStages} distinct attack stages (+${boostVal} priority boost).`;
  if (alertCount <= 1 && distinctStages <= 1) {
    correlationCaption = `This is currently a standalone security alert (+${boostVal} boost) with no linked secondary stages in this threat window.`;
  }

  // 4. Momentum Narration
  const momentumVal = breakdown.riskMomentum || 0;
  let momentumCaption = `No active momentum surge (+0) — telemetry rate is steady.`;
  if (momentumVal > 0) {
    momentumCaption = `Active attack momentum (+${momentumVal}) — related alerts are still actively arriving within the last 15 minutes.`;
  }

  // 5. Final Score Narration
  const finalScore = explainData.finalScore || 0;
  const priorityBucket = explainData.priorityBucket || 'P1';
  const finalCaption = `Combining all factors, the engine assigned a final risk score of ${finalScore}/100, ranking it #${rank} out of ${totalIncidents} active incidents (${priorityBucket} priority).`;

  return {
    base: baseCaption,
    stage: stageCaption,
    correlation: correlationCaption,
    momentum: momentumCaption,
    final: finalCaption
  };
}

/**
 * Generates dynamic narration for an attack chain step.
 * @param {Object} alert
 * @param {number} stepIndex (0-indexed)
 * @param {number} totalSteps
 * @returns {string}
 */
export function getAttackStepNarration(alert, stepIndex = 0, totalSteps = 1) {
  if (!alert) return '';

  const stepNum = stepIndex + 1;
  const stage = (alert.attack_stage || 'reconnaissance').toLowerCase();
  const alertType = (alert.alert_type || 'security_event').replace(/_/g, ' ');
  const asset = alert.asset || 'host';
  const assetSub = getAssetPlainSubtitle(asset);
  const mitre = alert.mitre_technique ? ` (${formatMitreTechnique(alert.mitre_technique)})` : '';
  const user = alert.user_account ? ` as user ${alert.user_account}` : '';

  let actionText = '';
  switch (stage) {
    case 'reconnaissance':
      actionText = `Attacker scanned network ports and services on ${asset} (${assetSub})`;
      break;
    case 'initial_access':
      actionText = `Attacker gained initial foothold via ${alertType} on ${asset}${user}`;
      break;
    case 'privilege_escalation':
      actionText = `Attacker exploited permissions to escalate to administrative privileges on ${asset}`;
      break;
    case 'lateral_movement':
      actionText = `Attacker pivoted laterally across internal network to ${asset} (${assetSub})`;
      break;
    case 'persistence':
      actionText = `Attacker established persistence mechanisms on ${asset} to survive reboots`;
      break;
    case 'exfiltration':
      actionText = `Attacker exfiltrated confidential data from ${asset} (${assetSub}) over command channel`;
      break;
    default:
      actionText = `Security event ${alertType} detected on ${asset}`;
  }

  const stageName = stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `Step ${stepNum} of ${totalSteps}: ${actionText}${mitre} [${stageName}]`;
}

/**
 * Generates narration explaining a correlation merge moment.
 * @param {Array} alerts
 * @returns {string}
 */
export function getCorrelationMergeNarration(alerts = []) {
  if (!alerts || alerts.length === 0) return 'Correlated security events into a single incident.';

  const count = alerts.length;
  const primaryIp = alerts.find(a => a.source_ip)?.source_ip || '198.51.100.45';
  const primaryAsset = alerts.find(a => a.asset)?.asset || 'PROD-DB-CUSTOMER-01';
  const stages = [...new Set(alerts.map(a => a.attack_stage).filter(Boolean))];

  return `Linked: ${count} alerts collapsed into 1 attack chain across ${stages.length} stages (${stages.join(' → ')}) on ${primaryAsset} (Attacker IP: ${primaryIp}).`;
}

/**
 * Generates the 3 sequential steps of containment narration.
 * @param {string} asset
 * @param {number} affectedUsers
 * @param {number} beforeScore
 * @param {number} afterScore
 * @param {number} reductionPercent
 * @returns {Array} Array of 3 step narration objects { step, title, text, durationMs }
 */
export function getContainmentStepsNarration(
  asset = 'PROD-DB-CUSTOMER-01',
  affectedUsers = 5000,
  beforeScore = 98.5,
  afterScore = 42.1,
  reductionPercent = 57.2
) {
  const assetSub = getAssetPlainSubtitle(asset);
  return [
    {
      step: 1,
      title: 'Isolating Endpoint',
      text: `Step 1: Decoupling and isolating compromised host ${asset} (${assetSub}) from production network...`,
      durationMs: 1200
    },
    {
      step: 2,
      title: 'Revoking Access & Cutting Routes',
      text: `Step 2: Revoking active sessions for ${affectedUsers.toLocaleString()} user accounts and severing lateral pivot routes...`,
      durationMs: 1200
    },
    {
      step: 3,
      title: 'Containment Validated',
      text: `Step 3: Blast radius neutralized. Risk dropped from ${beforeScore} (P1) to ${afterScore} (P3) — a ${reductionPercent}% danger reduction!`,
      durationMs: 2500
    }
  ];
}

