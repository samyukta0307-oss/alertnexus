/**
 * Scoring Engine Service
 * Implements normalization, base risk scoring, MITRE attack-stage multipliers,
 * correlation boost, risk momentum, incident-level composite scoring,
 * priority bucket assignment, and explainability breakdowns.
 */

const {
  computeCorrelationBoost,
  computeRiskMomentum,
  computeBlastRadius,
  computeDistinctStages
} = require('./correlationEngine');

const STAGE_MULTIPLIERS = {
  reconnaissance: 1.0,
  initial_access: 1.3,
  privilege_escalation: 1.6,
  lateral_movement: 1.8,
  exfiltration: 2.2,
  persistence: 1.5,
  none: 1.0
};

const DEFAULT_WEIGHTS = {
  severity: 0.25,
  asset_criticality: 0.20,
  data_sensitivity: 0.20,
  attack_confidence: 0.15,
  affected_users: 0.10,
  business_impact: 0.10
};

let activeWeights = { ...DEFAULT_WEIGHTS };

function getActiveWeights() {
  return { ...activeWeights };
}

function setActiveWeights(newWeights) {
  if (newWeights && typeof newWeights === 'object') {
    activeWeights = {
      severity: Number(newWeights.severity ?? activeWeights.severity),
      asset_criticality: Number(newWeights.asset_criticality ?? activeWeights.asset_criticality),
      data_sensitivity: Number(newWeights.data_sensitivity ?? activeWeights.data_sensitivity),
      attack_confidence: Number(newWeights.attack_confidence ?? activeWeights.attack_confidence),
      affected_users: Number(newWeights.affected_users ?? activeWeights.affected_users),
      business_impact: Number(newWeights.business_impact ?? activeWeights.business_impact)
    };
  }
  return { ...activeWeights };
}

/**
 * Step 1: Normalize every factor to 0.0 - 1.0.
 * Uses min-max for bounded 0-100 fields and log-scale normalization for affected_users.
 * Uses adjusted_attack_confidence if computed by Phase 6 anomaly detector.
 */
function normalizeFactors(alert) {
  const normUsers = Math.min(
    1.0,
    Math.log10(Math.max(0, Number(alert.affected_users || 0)) + 1) / 4.0
  );

  const confidenceVal = Number(alert.adjusted_attack_confidence ?? alert.attack_confidence ?? 0);
  const criticalityVal = Number(alert.effective_asset_criticality ?? alert.asset_criticality ?? 0);

  return {
    severity: Math.min(100, Math.max(0, Number(alert.severity || 0))) / 100.0,
    asset_criticality: Math.min(100, Math.max(0, criticalityVal)) / 100.0,
    data_sensitivity: Math.min(100, Math.max(0, Number(alert.data_sensitivity || 0))) / 100.0,
    attack_confidence: Math.min(100, Math.max(0, confidenceVal)) / 100.0,
    affected_users: normUsers,
    business_impact: Math.min(100, Math.max(0, Number(alert.business_impact || 0))) / 100.0
  };
}

/**
 * Step 2: Compute Base Score (0.0 - 1.0) using configured or default weights.
 */
function computeBaseScore(alert, weights = null) {
  const effectiveWeights = weights || getActiveWeights();
  const norm = normalizeFactors(alert);

  const base =
    (effectiveWeights.severity ?? 0.25) * norm.severity +
    (effectiveWeights.asset_criticality ?? 0.20) * norm.asset_criticality +
    (effectiveWeights.data_sensitivity ?? 0.20) * norm.data_sensitivity +
    (effectiveWeights.attack_confidence ?? 0.15) * norm.attack_confidence +
    (effectiveWeights.affected_users ?? 0.10) * norm.affected_users +
    (effectiveWeights.business_impact ?? 0.10) * norm.business_impact;

  return {
    base,
    normalizedFactors: norm
  };
}

/**
 * Assign priority bucket based on 0-100 scale score.
 * P1 (>= 75), P2 (>= 50), P3 (>= 25), P4 (< 25)
 */
function computePriorityBucket(score) {
  if (score >= 75.0) return 'P1';
  if (score >= 50.0) return 'P2';
  if (score >= 25.0) return 'P3';
  return 'P4';
}

/**
 * Step 3: Layer Attack-Stage Multiplier onto Base Score for a single alert.
 * Computes StageAdjustedScore = Base * Multiplier
 * FinalScore is scaled to 0-100 and clamped per-item to 100.0 max.
 */
function computeStageAdjustedScore(alert, weights = null) {
  const effectiveWeights = weights || getActiveWeights();
  const { base, normalizedFactors } = computeBaseScore(alert, effectiveWeights);

  const stage = alert.attack_stage || 'none';
  const stageMultiplier = STAGE_MULTIPLIERS[stage] !== undefined ? STAGE_MULTIPLIERS[stage] : 1.0;

  const stageAdjustedScore = base * stageMultiplier;
  const rawFinalScore = stageAdjustedScore * 100.0;
  const finalScore = Math.min(100.0, Math.round(rawFinalScore * 100) / 100);

  const priorityBucket = computePriorityBucket(finalScore);

  return {
    finalScore,
    priorityBucket,
    breakdown: {
      normalizedFactors: {
        severity: Math.round(normalizedFactors.severity * 10000) / 10000,
        asset_criticality: Math.round(normalizedFactors.asset_criticality * 10000) / 10000,
        data_sensitivity: Math.round(normalizedFactors.data_sensitivity * 10000) / 10000,
        attack_confidence: Math.round(normalizedFactors.attack_confidence * 10000) / 10000,
        affected_users: Math.round(normalizedFactors.affected_users * 10000) / 10000,
        business_impact: Math.round(normalizedFactors.business_impact * 10000) / 10000
      },
      base: Math.round(base * 10000) / 10000,
      stage,
      stageMultiplier,
      stageAdjustedScore: Math.round(stageAdjustedScore * 10000) / 10000,
      finalScore
    }
  };
}

/**
 * Step 4 & 5: Compute Incident-Level Composite Risk Score.
 *
 * Formula:
 * FinalScore = (MaxStageAdjustedScore + CorrelationBoost + RiskMomentum) * 100, clamped to 100.0.
 */
function computeIncidentScore(incident, alertGroup, referenceNow = new Date(), weights = null) {
  const effectiveWeights = weights || getActiveWeights();
  if (!alertGroup || alertGroup.length === 0) {
    return {
      finalScore: 0.0,
      priorityBucket: 'P4',
      breakdown: {
        maxStageAdjustedScore: 0,
        correlationBoost: 0,
        momentum: 0,
        finalScore: 0
      }
    };
  }

  // 1. Compute individual stage-adjusted scores for all alerts in group
  let maxStageAdjustedScore = 0.0;
  let highestScoringAlert = alertGroup[0];

  for (const alert of alertGroup) {
    const scored = computeStageAdjustedScore(alert, effectiveWeights);
    const adjScore = scored.breakdown.stageAdjustedScore;
    if (adjScore > maxStageAdjustedScore) {
      maxStageAdjustedScore = adjScore;
      highestScoringAlert = alert;
    }
  }

  // 2. Compute correlation boost based on distinct attack stages in chain
  const distinctStages = incident.distinct_stages !== undefined
    ? Number(incident.distinct_stages)
    : computeDistinctStages(alertGroup);
  const correlationBoost = computeCorrelationBoost(distinctStages);

  // 3. Compute risk momentum decay
  const lastAlertAt = incident.last_alert_at || alertGroup[alertGroup.length - 1]?.timestamp;
  const momentum = computeRiskMomentum(lastAlertAt, referenceNow);

  // 4. Combine and scale/clamp to 0-100
  const combinedRaw = (maxStageAdjustedScore + correlationBoost + momentum) * 100.0;
  const finalScore = Math.min(100.0, Math.round(combinedRaw * 100) / 100);

  const priorityBucket = computePriorityBucket(finalScore);

  const blastRadius = {
    assets: incident.blast_radius_assets !== undefined ? Number(incident.blast_radius_assets) : computeBlastRadius(alertGroup).assets,
    users: incident.blast_radius_users !== undefined ? Number(incident.blast_radius_users) : computeBlastRadius(alertGroup).users
  };

  return {
    finalScore,
    priorityBucket,
    highestScoringAlertId: highestScoringAlert.alert_id,
    breakdown: {
      maxStageAdjustedScore: Math.round(maxStageAdjustedScore * 10000) / 10000,
      highestScoringAlertId: highestScoringAlert.alert_id,
      distinctStages,
      correlationBoost,
      momentum,
      blastRadius,
      combinedRaw: Math.round(combinedRaw * 100) / 100,
      finalScore
    }
  };
}

module.exports = {
  STAGE_MULTIPLIERS,
  DEFAULT_WEIGHTS,
  getActiveWeights,
  setActiveWeights,
  normalizeFactors,
  computeBaseScore,
  computePriorityBucket,
  computeStageAdjustedScore,
  computeIncidentScore
};
