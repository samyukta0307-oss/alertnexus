/**
 * Correlation Engine Service
 * Implements graph-based alert correlation with a sliding temporal window,
 * connected components discovery, blast radius computation, correlation boost,
 * and risk momentum decay.
 */

const MAX_MOMENTUM_BONUS = 0.15;
const MOMENTUM_DECAY_WINDOW_MINUTES = 60; // 1 hour decay window

/**
 * Builds an adjacency list graph where alerts are nodes and edges represent
 * correlation based on shared attributes (source_ip, user_account, or asset)
 * within a temporal sliding window.
 *
 * @param {Array<Object>} alerts - List of all alert objects
 * @param {number} windowMinutes - Sliding correlation window in minutes (default: 30)
 * @returns {Map<string, Set<string>>} Adjacency map of alert_id -> Set of connected alert_ids
 */
function buildCorrelationGraph(alerts, windowMinutes = 30) {
  const windowMs = windowMinutes * 60 * 1000;
  const graph = new Map();

  // Initialize nodes
  for (const a of alerts) {
    graph.set(a.alert_id, new Set());
  }

  // Sort alerts chronologically to optimize pairwise comparison within sliding window
  const sorted = [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (let i = 0; i < sorted.length; i++) {
    const a1 = sorted[i];
    const t1 = new Date(a1.timestamp).getTime();

    for (let j = i + 1; j < sorted.length; j++) {
      const a2 = sorted[j];
      const t2 = new Date(a2.timestamp).getTime();

      // Since array is sorted, if time difference exceeds window, stop checking further
      if (t2 - t1 > windowMs) {
        break;
      }

      // Check for explicit chaining link
      const isExplicitlyRelated =
        (Array.isArray(a2.related_alert_ids) && a2.related_alert_ids.includes(a1.alert_id)) ||
        (Array.isArray(a1.related_alert_ids) && a1.related_alert_ids.includes(a2.alert_id));

      // Check for shared source IP (non-empty)
      const sharesSourceIp = Boolean(a1.source_ip && a2.source_ip && a1.source_ip === a2.source_ip);

      // Check for shared user account (non-empty, exclude generic/null)
      const sharesUserAccount = Boolean(
        a1.user_account &&
        a2.user_account &&
        a1.user_account.trim() !== '' &&
        a1.user_account === a2.user_account
      );

      // Check for shared target asset
      const sharesAsset = Boolean(a1.asset && a2.asset && a1.asset === a2.asset);

      // Add edge if any correlation condition is satisfied within the time window
      if (isExplicitlyRelated || sharesSourceIp || sharesUserAccount || sharesAsset) {
        graph.get(a1.alert_id).add(a2.alert_id);
        graph.get(a2.alert_id).add(a1.alert_id);
      }
    }
  }

  return graph;
}

/**
 * Finds all connected components in the correlation graph using BFS.
 * Each component represents a correlated incident (single alert = chain of one).
 *
 * @param {Map<string, Set<string>>} graph - Graph adjacency map
 * @param {Array<Object>} alerts - List of all alert objects
 * @returns {Array<Array<Object>>} Array of alert groups
 */
function findConnectedComponents(graph, alerts) {
  const alertMap = new Map(alerts.map(a => [a.alert_id, a]));
  const visited = new Set();
  const components = [];

  for (const alert of alerts) {
    const alertId = alert.alert_id;
    if (visited.has(alertId)) continue;

    const componentAlerts = [];
    const queue = [alertId];
    visited.add(alertId);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentAlert = alertMap.get(currentId);
      if (currentAlert) {
        componentAlerts.push(currentAlert);
      }

      const neighbors = graph.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    // Sort alerts within the component chronologically
    componentAlerts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    components.push(componentAlerts);
  }

  return components;
}

/**
 * Computes blast radius: count of distinct assets and distinct user accounts
 * touched across the incident's alert chain.
 *
 * @param {Array<Object>} alertGroup - Alerts belonging to the incident
 * @returns {{ assets: number, users: number, total: number }}
 */
function computeBlastRadius(alertGroup) {
  const assets = new Set(alertGroup.map(a => a.asset).filter(Boolean)).size;
  const users = new Set(alertGroup.map(a => a.user_account).filter(Boolean)).size;
  return {
    assets,
    users,
    total: assets + users
  };
}

/**
 * Counts distinct MITRE attack stages across the alert group (excluding 'none').
 *
 * @param {Array<Object>} alertGroup - Alerts belonging to the incident
 * @returns {number} Count of distinct stages
 */
function computeDistinctStages(alertGroup) {
  const stages = new Set(
    alertGroup
      .map(a => a.attack_stage)
      .filter(stage => stage && stage !== 'none')
  );
  return stages.size;
}

/**
 * Computes correlation boost based on distinct attack stages in chain:
 * Boost = min(0.40, 0.08 * distinct_stages)
 *
 * @param {number} distinctStages - Number of distinct stages
 * @returns {number} Correlation boost value (0.0 to 0.40)
 */
function computeCorrelationBoost(distinctStages) {
  const rawBoost = 0.08 * Math.max(0, distinctStages);
  return Math.min(0.40, Math.round(rawBoost * 10000) / 10000);
}

/**
 * Computes risk momentum decay:
 * If an incident's last_alert_at is recent relative to referenceNow,
 * adds a bonus of up to +0.15 that decays linearly to 0.0 over a 60-minute window.
 *
 * Formula:
 * momentum = MAX_MOMENTUM_BONUS * max(0, 1 - (elapsedMinutes / 60))
 *
 * @param {Object|string|Date} lastAlertAt - Timestamp of the most recent alert
 * @param {Date|number} [referenceNow=new Date()] - Reference time for calculation
 * @returns {number} Momentum score (0.0 to 0.15)
 */
function computeRiskMomentum(lastAlertAt, referenceNow = new Date()) {
  if (!lastAlertAt) return 0.0;

  const lastAlertTime = new Date(lastAlertAt).getTime();
  const nowTime = new Date(referenceNow).getTime();

  if (isNaN(lastAlertTime) || isNaN(nowTime)) return 0.0;

  const elapsedMinutes = Math.max(0, (nowTime - lastAlertTime) / (60 * 1000));

  if (elapsedMinutes >= MOMENTUM_DECAY_WINDOW_MINUTES) {
    return 0.0;
  }

  const momentum = MAX_MOMENTUM_BONUS * (1.0 - elapsedMinutes / MOMENTUM_DECAY_WINDOW_MINUTES);
  return Math.round(momentum * 10000) / 10000;
}

module.exports = {
  MAX_MOMENTUM_BONUS,
  MOMENTUM_DECAY_WINDOW_MINUTES,
  buildCorrelationGraph,
  findConnectedComponents,
  computeBlastRadius,
  computeDistinctStages,
  computeCorrelationBoost,
  computeRiskMomentum
};

