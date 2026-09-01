/**
 * What-If Sensitivity Simulator Service
 * Evaluates hypothetical threat attribute modifications on-the-fly without mutating database state.
 */

const {
  computeIncidentScore,
  computePriorityBucket,
  STAGE_MULTIPLIERS
} = require('./scoringEngine');

const VALID_ATTACK_STAGES = Object.keys(STAGE_MULTIPLIERS);

/**
 * Validates the overrides payload against allowed schemas and value ranges.
 *
 * @param {Object} overrides
 * @returns {Array<string>} Array of validation error strings, if any
 */
function validateOverrides(overrides) {
  const errors = [];
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return ['Overrides payload must be an object with key-value property overrides.'];
  }

  const checkBounded = (field) => {
    if (overrides[field] !== undefined && overrides[field] !== null) {
      const val = Number(overrides[field]);
      if (!Number.isFinite(val) || val < 0 || val > 100) {
        errors.push(`Field '${field}' must be a number between 0 and 100 (received: ${overrides[field]}).`);
      }
    }
  };

  checkBounded('severity');
  checkBounded('asset_criticality');
  checkBounded('data_sensitivity');
  checkBounded('attack_confidence');
  checkBounded('business_impact');

  if (overrides.affected_users !== undefined && overrides.affected_users !== null) {
    const val = Number(overrides.affected_users);
    if (!Number.isInteger(val) || val < 0) {
      errors.push(`Field 'affected_users' must be a non-negative integer (received: ${overrides.affected_users}).`);
    }
  }

  if (overrides.attack_stage !== undefined && overrides.attack_stage !== null) {
    const stage = String(overrides.attack_stage).trim().toLowerCase();
    if (!VALID_ATTACK_STAGES.includes(stage)) {
      errors.push(`Field 'attack_stage' must be one of: ${VALID_ATTACK_STAGES.join(', ')}.`);
    }
  }

  return errors;
}

/**
 * Runs a non-destructive what-if scenario by applying overrides to the incident's top alert.
 *
 * @param {Object} incident
 * @param {Array<Object>} alerts
 * @param {Object} overrides - Object containing fields to override
 * @returns {Object} Comparative before / after results
 */
function simulateWhatIf(incident, alerts = [], overrides = {}) {
  // 1. Compute baseline "before" score
  const beforeResult = computeIncidentScore(incident, alerts);

  // 2. Identify top alert
  const topAlertId = beforeResult.highestScoringAlertId || alerts[0]?.alert_id;
  const topAlertIndex = alerts.findIndex(a => a.alert_id === topAlertId);
  const targetAlert = topAlertIndex !== -1 ? alerts[topAlertIndex] : alerts[0];

  const originalValues = {
    severity: targetAlert?.severity,
    asset_criticality: targetAlert?.asset_criticality,
    data_sensitivity: targetAlert?.data_sensitivity,
    attack_confidence: targetAlert?.attack_confidence,
    affected_users: targetAlert?.affected_users,
    business_impact: targetAlert?.business_impact,
    attack_stage: targetAlert?.attack_stage
  };

  // 3. Clone alert array and apply overrides to top alert
  const modifiedAlerts = alerts.map((a, idx) => {
    if (idx === (topAlertIndex !== -1 ? topAlertIndex : 0)) {
      return {
        ...a,
        severity: overrides.severity !== undefined ? Number(overrides.severity) : a.severity,
        asset_criticality: overrides.asset_criticality !== undefined ? Number(overrides.asset_criticality) : a.asset_criticality,
        effective_asset_criticality: overrides.asset_criticality !== undefined ? Number(overrides.asset_criticality) : a.asset_criticality,
        data_sensitivity: overrides.data_sensitivity !== undefined ? Number(overrides.data_sensitivity) : a.data_sensitivity,
        attack_confidence: overrides.attack_confidence !== undefined ? Number(overrides.attack_confidence) : a.attack_confidence,
        adjusted_attack_confidence: overrides.attack_confidence !== undefined ? Number(overrides.attack_confidence) : a.adjusted_attack_confidence,
        affected_users: overrides.affected_users !== undefined ? Number(overrides.affected_users) : a.affected_users,
        business_impact: overrides.business_impact !== undefined ? Number(overrides.business_impact) : a.business_impact,
        attack_stage: overrides.attack_stage !== undefined ? String(overrides.attack_stage).trim().toLowerCase() : a.attack_stage
      };
    }
    return a;
  });

  // 4. Re-run scoring pipeline on modified alerts
  const afterResult = computeIncidentScore(incident, modifiedAlerts);

  const appliedOverrides = {};
  for (const k of Object.keys(overrides)) {
    appliedOverrides[k] = {
      from: originalValues[k],
      to: overrides[k]
    };
  }

  return {
    incidentId: incident.incident_id || incident.id,
    targetAlertId: targetAlert?.alert_id,
    appliedOverrides,
    before: {
      score: beforeResult.finalScore,
      priorityBucket: beforeResult.priorityBucket,
      breakdown: beforeResult.breakdown
    },
    after: {
      score: afterResult.finalScore,
      priorityBucket: afterResult.priorityBucket,
      breakdown: afterResult.breakdown
    },
    scoreDelta: Math.round((afterResult.finalScore - beforeResult.finalScore) * 100) / 100,
    priorityShift: `${beforeResult.priorityBucket} -> ${afterResult.priorityBucket}`
  };
}

module.exports = {
  validateOverrides,
  simulateWhatIf
};

