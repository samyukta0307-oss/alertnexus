/**
 * Containment Simulation Service
 * Non-destructively simulates isolating compromised hosts, disabling credentials,
 * and halting active attack progression.
 */

const {
  computeBaseScore,
  computePriorityBucket
} = require('./scoringEngine');

/**
 * Simulates incident containment in-memory without mutating database state.
 *
 * @param {Object} incident - Incident record
 * @param {Array<Object>} alerts - Alerts in the incident
 * @param {Object} currentScoreData - Existing score and priority before containment
 * @returns {Object} Before and after simulation comparison
 */
function simulateContainment(incident, alerts = [], currentScoreData = {}) {
  const beforeFinalScore = Number(currentScoreData.finalScore ?? incident.score ?? 100);
  const beforePriorityBucket = currentScoreData.priorityBucket ?? incident.priority_bucket ?? 'P1';
  const beforeBlastRadius = {
    assets: Number(incident.blast_radius_assets ?? 1),
    users: Number(incident.blast_radius_users ?? 0),
    total: Number(incident.blast_radius_assets ?? 1) + Number(incident.blast_radius_users ?? 0)
  };

  // 1. All assets in the incident are marked as "isolated"
  const isolatedAssets = Array.from(new Set(alerts.map(a => a.asset).filter(Boolean)));
  const isolatedUsers = Array.from(new Set(alerts.map(a => a.user_account).filter(Boolean)));

  // 2. Active blast radius is neutralized
  const afterBlastRadius = {
    assets: 0,
    users: 0,
    total: 0
  };

  // 3. Stage multiplier neutralized to 1.0 (active C2/exfiltration halted)
  // Base risk is recomputed on isolated baseline
  let maxContainedBaseScore = 0.0;
  for (const alert of alerts) {
    const { base } = computeBaseScore(alert);
    if (base > maxContainedBaseScore) {
      maxContainedBaseScore = base;
    }
  }

  // 4. Momentum and Correlation Boost neutralized under containment
  // Contained risk reflects residual forensic severity without active operational threat
  const rawAfterScore = maxContainedBaseScore * 1.0 * 100.0 * 0.5; // 50% residual forensic risk
  const afterFinalScore = Math.min(100.0, Math.max(0.0, Math.round(rawAfterScore * 100) / 100));
  const afterPriorityBucket = computePriorityBucket(afterFinalScore);

  const riskReductionPercent = Math.max(
    0,
    Math.round(((beforeFinalScore - afterFinalScore) / (beforeFinalScore || 1)) * 10000) / 100
  );

  return {
    incidentId: incident.incident_id || incident.id,
    simulationType: 'Host Isolation & Credential Revocation',
    before: {
      finalScore: beforeFinalScore,
      priorityBucket: beforePriorityBucket,
      blastRadius: beforeBlastRadius
    },
    after: {
      finalScore: afterFinalScore,
      priorityBucket: afterPriorityBucket,
      blastRadius: afterBlastRadius,
      riskReductionPercent
    },
    containedEntities: {
      isolatedAssets,
      disabledUsers: isolatedUsers
    },
    simulatedActions: [
      `Network quarantine applied to ${isolatedAssets.length} host(s): [${isolatedAssets.join(', ')}]`,
      `Active sessions and credentials revoked for ${isolatedUsers.length} user identity/identities`,
      'Active attack momentum reduced to 0.0 (progression halted)',
      'Active blast radius neutralized (0 uncontained endpoints)'
    ]
  };
}

module.exports = {
  simulateContainment
};

