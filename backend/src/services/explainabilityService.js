/**
 * Explainability Service
 * Formats score breakdowns, generates conditional plain-language analyst reasons,
 * and creates natural-language one-line summaries for incidents.
 */

const {
  DEFAULT_WEIGHTS,
  STAGE_MULTIPLIERS,
  normalizeFactors,
  computeBaseScore,
  computeStageAdjustedScore
} = require('./scoringEngine');
const { KNOWN_BAD_IOCS } = require('./iocEnrichment');
const { isMlEnabled, ML_PROTOTYPE_LABEL } = require('../config/mlConfig');

/**
 * Builds the score breakdown and factor contributions for the incident.
 *
 * @param {Object} incident
 * @param {Array<Object>} alerts - All alerts in the incident
 * @param {Object} [weights=DEFAULT_WEIGHTS]
 * @returns {Object} { topAlert, scoreBreakdown, distinctAttackStages, mlAdjustment }
 */
function buildScoreBreakdown(incident, alerts, weights = DEFAULT_WEIGHTS) {
  if (!alerts || alerts.length === 0) {
    return {
      topAlert: null,
      scoreBreakdown: {
        base: 0,
        contributions: {
          severity: 0,
          asset_criticality: 0,
          data_sensitivity: 0,
          attack_confidence: 0,
          affected_users: 0,
          business_impact: 0
        },
        stageMultiplier: 1.0,
        stageAdjustedScore: 0,
        correlationBoost: 0,
        riskMomentum: 0,
        finalScore: 0
      },
      distinctAttackStages: [],
      mlAdjustment: {
        enabled: isMlEnabled(),
        anomalyScore: 0,
        originalConfidence: 0,
        adjustedConfidence: 0,
        adjustmentDelta: 0,
        label: ML_PROTOTYPE_LABEL
      }
    };
  }

  // Find the highest-scoring alert in the chain
  let topAlert = alerts[0];
  let maxStageAdjustedScore = 0;
  let topAlertBase = 0;
  let topNorm = null;
  let topMultiplier = 1.0;

  for (const alert of alerts) {
    const stage = alert.attack_stage || 'none';
    const multiplier = STAGE_MULTIPLIERS[stage] !== undefined ? STAGE_MULTIPLIERS[stage] : 1.0;
    const { base, normalizedFactors } = computeBaseScore(alert, weights);
    const stageAdjusted = base * multiplier;

    if (stageAdjusted > maxStageAdjustedScore) {
      maxStageAdjustedScore = stageAdjusted;
      topAlert = alert;
      topAlertBase = base;
      topNorm = normalizedFactors;
      topMultiplier = multiplier;
    }
  }

  if (!topNorm) {
    topNorm = normalizeFactors(topAlert);
  }

  // Contributions to the base score
  const wSev = weights.severity ?? 0.25;
  const wCrit = weights.asset_criticality ?? 0.20;
  const wSens = weights.data_sensitivity ?? 0.20;
  const wConf = weights.attack_confidence ?? 0.15;
  const wUsers = weights.affected_users ?? 0.10;
  const wImp = weights.business_impact ?? 0.10;

  const contributions = {
    severity: Math.round(wSev * topNorm.severity * 10000) / 10000,
    asset_criticality: Math.round(wCrit * topNorm.asset_criticality * 10000) / 10000,
    data_sensitivity: Math.round(wSens * topNorm.data_sensitivity * 10000) / 10000,
    attack_confidence: Math.round(wConf * topNorm.attack_confidence * 10000) / 10000,
    affected_users: Math.round(wUsers * topNorm.affected_users * 10000) / 10000,
    business_impact: Math.round(wImp * topNorm.business_impact * 10000) / 10000
  };

  // Distinct stages across the chain (excluding 'none')
  const distinctAttackStages = Array.from(
    new Set(alerts.map(a => a.attack_stage).filter(s => s && s !== 'none'))
  );

  const correlationBoost = Number(incident.breakdown?.correlationBoost ?? (Math.min(0.40, Math.round(0.08 * distinctAttackStages.length * 10000) / 10000)));
  const riskMomentum = Number(incident.breakdown?.momentum ?? 0);

  const combinedRaw = (maxStageAdjustedScore + correlationBoost + riskMomentum) * 100.0;
  const finalScore = Math.min(100.0, Math.round(combinedRaw * 100) / 100);

  const mlAdj = topAlert.ml_adjustment || {
    enabled: isMlEnabled(),
    originalConfidence: Number(topAlert.stored_attack_confidence ?? topAlert.attack_confidence ?? 0),
    adjustedConfidence: Number(topAlert.adjusted_attack_confidence ?? topAlert.attack_confidence ?? 0),
    anomalyScore: Number(topAlert.anomaly_score ?? 0),
    adjustmentDelta: Math.round((Number(topAlert.adjusted_attack_confidence ?? topAlert.attack_confidence ?? 0) - Number(topAlert.stored_attack_confidence ?? topAlert.attack_confidence ?? 0)) * 100) / 100,
    label: ML_PROTOTYPE_LABEL
  };

  return {
    topAlert: {
      alert_id: topAlert.alert_id,
      alert_type: topAlert.alert_type,
      asset: topAlert.asset,
      asset_type: topAlert.asset_type || null,
      asset_description: topAlert.description || null,
      asset_criticality: Number(topAlert.asset_criticality || 0),
      data_sensitivity: Number(topAlert.data_sensitivity || 0),
      attack_stage: topAlert.attack_stage,
      mitre_technique: topAlert.mitre_technique || null,
      ioc_match: Boolean(topAlert.ioc_match),
      ioc_indicator: topAlert.ioc_indicator || null,
      severity: Number(topAlert.severity || 0),
      source_ip: topAlert.source_ip,
      user_account: topAlert.user_account,
      mlAdjustment: mlAdj
    },
    scoreBreakdown: {
      base: Math.round(topAlertBase * 10000) / 10000,
      contributions,
      stageMultiplier: topMultiplier,
      stageAdjustedScore: Math.round(maxStageAdjustedScore * 10000) / 10000,
      correlationBoost,
      riskMomentum,
      finalScore
    },
    distinctAttackStages,
    mlAdjustment: mlAdj
  };
}

/**
 * Generates conditional, honest plain-language reason strings for an incident.
 */
function generateReasons({
  topAlert,
  scoreBreakdown,
  blastRadius,
  correlatedAlertsCount,
  distinctAttackStages,
  alerts = []
}) {
  const reasons = [];

  if (!topAlert) {
    return ['No alert telemetry available for this incident.'];
  }

  // 1. Critical Asset Check
  const maxCrit = Math.max(...alerts.map(a => Number(a.asset_criticality || 0)));
  const highestCritAlert = alerts.find(a => Number(a.asset_criticality || 0) === maxCrit) || topAlert;
  if (maxCrit >= 80) {
    const descSuffix = highestCritAlert.asset_description ? ` — ${highestCritAlert.asset_description}` : '';
    const typeStr = highestCritAlert.asset_type ? `, ${highestCritAlert.asset_type}` : '';
    reasons.push(`Targets a critical asset (${highestCritAlert.asset}${typeStr}${descSuffix})`);
  }

  // 2. High Data Sensitivity Check
  const maxSens = Math.max(...alerts.map(a => Number(a.data_sensitivity || 0)));
  if (maxSens >= 80) {
    reasons.push(`Involves highly sensitive data (${maxSens}% sensitivity rating)`);
  }

  // 3. IOC Match Check
  const iocAlert = alerts.find(a => a.ioc_match && a.ioc_indicator);
  if (iocAlert) {
    const iocMeta = KNOWN_BAD_IOCS[iocAlert.ioc_indicator];
    const actorDetail = iocMeta ? ` [${iocMeta.threat_actor} - ${iocMeta.category}]` : '';
    reasons.push(`Matched known-bad indicator: ${iocAlert.ioc_indicator}${actorDetail}`);
  }

  // 4. Attack Progression Evidence
  const progressionStages = ['privilege_escalation', 'lateral_movement', 'exfiltration', 'persistence'];
  const stagesInChain = Array.from(new Set(alerts.map(a => a.attack_stage).filter(s => progressionStages.includes(s))));
  if (stagesInChain.length > 0) {
    reasons.push(`Shows evidence of active attack progression (${stagesInChain.map(s => s.replace(/_/g, ' ')).join(', ')})`);
  }

  // 5. Multi-Alert Correlated Chain
  if (correlatedAlertsCount > 1) {
    reasons.push(`${correlatedAlertsCount} correlated alerts forming a single attack chain`);
  }

  // 6. Distinct Attack Stages
  if (distinctAttackStages.length >= 3) {
    reasons.push(
      `Attack has progressed through ${distinctAttackStages.length} distinct stages (${distinctAttackStages.join(' → ')}), indicating a real, developing threat rather than an isolated event`
    );
  }

  // 7. Large Potential Blast Radius
  const assetsTouched = blastRadius?.assets ?? 1;
  const usersTouched = blastRadius?.users ?? 0;
  if (assetsTouched > 2 || usersTouched > 100) {
    const userPart = usersTouched > 0 ? `, ${usersTouched.toLocaleString()} users affected` : '';
    reasons.push(`Large potential blast radius: ${assetsTouched} assets${userPart}`);
  }

  // 8. Risk Momentum / Recency
  if (scoreBreakdown.riskMomentum > 0) {
    reasons.push(`Still actively generating new related alerts (+${scoreBreakdown.riskMomentum} recency bonus)`);
  }

  // 9. Honest fallback for low-signal / P4 noise incidents
  if (reasons.length === 0) {
    if (topAlert.severity < 40 && correlatedAlertsCount === 1) {
      reasons.push('Isolated low-severity alert, no correlation or escalation detected');
    } else {
      reasons.push(`Standard ${topAlert.alert_type?.replace(/_/g, ' ') || 'security event'} detected on ${topAlert.asset || 'host'}`);
    }
  }

  return reasons;
}

/**
 * Generates a natural-language one-line summary string for an incident.
 */
function generateSummary({
  incidentId,
  finalScore,
  priorityBucket,
  topAlert,
  blastRadius,
  correlatedAlertsCount,
  distinctAttackStages,
  alerts = []
}) {
  const targetAsset = topAlert?.asset || 'asset';
  const iocAlert = alerts.find(a => a.ioc_match && a.ioc_indicator);
  const totalUsers = alerts.reduce((max, a) => Math.max(max, Number(a.affected_users || 0)), 0);

  // 1. Multi-alert attack chain summary (P1 / P2)
  if (correlatedAlertsCount > 1 && distinctAttackStages.length >= 2) {
    const firstStage = distinctAttackStages[0] || 'reconnaissance';
    const lastStage = distinctAttackStages[distinctAttackStages.length - 1] || 'exfiltration';
    const iocPart = iocAlert ? `, matched known-bad IOC (${iocAlert.ioc_indicator})` : '';
    const userPart = totalUsers > 0 ? `, affecting ~${totalUsers.toLocaleString()} users across ${blastRadius.assets} assets` : ` across ${blastRadius.assets} assets`;
    const prefix = priorityBucket === 'P1' ? 'Critical incident' : 'High-priority incident';

    return `${prefix} on ${targetAsset}: ${correlatedAlertsCount} correlated alerts showing progression from ${firstStage.replace(/_/g, ' ')} to ${lastStage.replace(/_/g, ' ')}${iocPart}${userPart}.`;
  }

  // 2. High severity / High criticality standalone incident (P1 / P2)
  if (priorityBucket === 'P1' || priorityBucket === 'P2') {
    const alertTypeLabel = topAlert.alert_type?.replace(/_/g, ' ') || 'security event';
    const iocPart = iocAlert ? ` with known-bad IOC (${iocAlert.ioc_indicator})` : '';
    const userPart = totalUsers > 10 ? `, affecting ~${totalUsers.toLocaleString()} users` : '';

    return `${priorityBucket === 'P1' ? 'Critical' : 'Elevated'} threat on ${targetAsset}: ${alertTypeLabel} with ${topAlert.severity}% severity and ${topAlert.asset_criticality}% asset criticality${iocPart}${userPart}.`;
  }

  // 3. Medium priority standalone incident (P3)
  if (priorityBucket === 'P3') {
    const alertTypeLabel = topAlert.alert_type?.replace(/_/g, ' ') || 'event';
    const stageLabel = topAlert.attack_stage && topAlert.attack_stage !== 'none' ? ` in ${topAlert.attack_stage.replace(/_/g, ' ')} stage` : '';

    return `Medium-priority alert on ${targetAsset}: ${alertTypeLabel}${stageLabel} with no active lateral movement detected.`;
  }

  // 4. Low priority noise incident (P4)
  const alertTypeLabel = topAlert?.alert_type?.replace(/_/g, ' ') || 'event';
  return `Low-severity isolated ${alertTypeLabel} on ${targetAsset}; no lateral movement or threat intelligence matches detected.`;
}

/**
 * Builds the complete explainability response object for an incident.
 */
function buildIncidentExplanation(incident, alerts) {
  const { topAlert, scoreBreakdown, distinctAttackStages, mlAdjustment } = buildScoreBreakdown(incident, alerts);

  const blastRadius = {
    assets: Number(incident.blast_radius_assets ?? blastRadiusFromAlerts(alerts).assets),
    users: Number(incident.blast_radius_users ?? blastRadiusFromAlerts(alerts).users)
  };

  const correlatedAlertsCount = alerts.length;
  const priorityBucket = incident.priority_bucket || computePriorityBucketFromScore(scoreBreakdown.finalScore);

  const reasons = generateReasons({
    topAlert,
    scoreBreakdown,
    blastRadius,
    correlatedAlertsCount,
    distinctAttackStages,
    alerts
  });

  const summary = generateSummary({
    incidentId: incident.incident_id,
    finalScore: scoreBreakdown.finalScore,
    priorityBucket,
    topAlert,
    blastRadius,
    correlatedAlertsCount,
    distinctAttackStages,
    alerts
  });

  return {
    incidentId: incident.incident_id,
    finalScore: scoreBreakdown.finalScore,
    priorityBucket,
    summary,
    topAlert: topAlert ? {
      alert_id: topAlert.alert_id,
      alert_type: topAlert.alert_type,
      asset: topAlert.asset,
      attack_stage: topAlert.attack_stage,
      mitre_technique: topAlert.mitre_technique,
      ioc_match: topAlert.ioc_match,
      ioc_indicator: topAlert.ioc_indicator,
      mlAdjustment
    } : null,
    scoreBreakdown,
    blastRadius,
    correlatedAlertsCount,
    distinctAttackStages,
    mlAdjustment,
    reasons
  };
}

function blastRadiusFromAlerts(alerts) {
  return {
    assets: new Set(alerts.map(a => a.asset).filter(Boolean)).size,
    users: new Set(alerts.map(a => a.user_account).filter(Boolean)).size
  };
}

function computePriorityBucketFromScore(score) {
  if (score >= 75) return 'P1';
  if (score >= 50) return 'P2';
  if (score >= 25) return 'P3';
  return 'P4';
}

module.exports = {
  buildScoreBreakdown,
  generateReasons,
  generateSummary,
  buildIncidentExplanation
};
