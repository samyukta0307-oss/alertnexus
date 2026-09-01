/**
 * ML Feature Extraction Service
 * Extracts numeric feature vectors for anomaly detection.
 *
 * Feature Rationale:
 * 1. timeOfDayBucket: Off-hours and boundary hours correlate with evasive attacker activity.
 * 2. sourceFrequency: High volume of alerts from a single source IP in a 60m window indicates automated scanning/brute-forcing.
 * 3. userFrequency: Rapid alert density for a specific user identity flags credential stuffing or lateral movement.
 * 4. assetSensitivityFlag: Critical assets (databases, domain controllers) are prime high-value targets.
 * 5. severityNormalized: Normalized magnitude of the raw telemetry severity.
 */

const HIGH_SENSITIVITY_ASSET_TYPES = new Set([
  'database',
  'domain_controller',
  'finance',
  'cloud_storage',
  'api_server'
]);

/**
 * Maps hour of day (UTC) to normalized bucket [0.0, 1.0].
 * 0-5 (Night) -> 0.0, 6-11 (Morning) -> 0.33, 12-17 (Afternoon) -> 0.66, 18-23 (Evening) -> 1.0
 */
function getTimeOfDayBucket(date) {
  const hour = new Date(date).getUTCHours();
  if (hour < 6) return 0.0;
  if (hour < 12) return 0.33;
  if (hour < 18) return 0.66;
  return 1.0;
}

/**
 * Extracts the 5-dimensional feature vector for a single alert in the context of all alerts.
 *
 * @param {Object} alert - The target alert
 * @param {Array<Object>} allAlerts - Complete dataset of alerts for temporal context
 * @returns {Array<number>} [timeOfDayBucket, sourceFrequency, userFrequency, assetSensitivityFlag, severityNormalized]
 */
function extractFeatures(alert, allAlerts = []) {
  const alertTime = new Date(alert.timestamp).getTime();
  const windowMs = 60 * 60 * 1000; // 60 minutes sliding window

  const srcIp = (alert.source_ip || '').trim();
  const userAcc = (alert.user_account || '').trim();

  let sourceFrequency = 1;
  let userFrequency = userAcc !== '' ? 1 : 0;

  // Compute temporal sliding window frequencies relative to alert.timestamp
  for (const other of allAlerts) {
    if (other.alert_id === alert.alert_id) continue;

    const otherTime = new Date(other.timestamp).getTime();
    // Check if other alert occurred within the 60 minutes preceding or contemporaneous with target alert
    if (otherTime >= alertTime - windowMs && otherTime <= alertTime + windowMs) {
      if (srcIp && (other.source_ip || '').trim() === srcIp) {
        sourceFrequency++;
      }
      if (userAcc && userAcc !== 'guest_user' && (other.user_account || '').trim() === userAcc) {
        userFrequency++;
      }
    }
  }

  // 1. Time of Day Bucket
  const timeOfDayBucket = getTimeOfDayBucket(alert.timestamp);

  // 2. Asset Sensitivity Flag
  const assetType = (alert.asset_type || '').toLowerCase();
  const criticality = Number(alert.asset_criticality || alert.effective_asset_criticality || 0);
  const assetSensitivityFlag = (HIGH_SENSITIVITY_ASSET_TYPES.has(assetType) || criticality >= 80) ? 1.0 : 0.0;

  // 3. Severity Normalized
  const severityNormalized = Math.min(1.0, Math.max(0.0, Number(alert.severity || 0) / 100.0));

  return [
    timeOfDayBucket,
    sourceFrequency,
    userFrequency,
    assetSensitivityFlag,
    severityNormalized
  ];
}

/**
 * Extracts feature vectors for all alerts in batch.
 *
 * @param {Array<Object>} alerts
 * @returns {Array<Array<number>>} Array of 5-element feature arrays aligned to input order
 */
function extractAllFeatures(alerts) {
  return alerts.map(alert => extractFeatures(alert, alerts));
}

module.exports = {
  extractFeatures,
  extractAllFeatures,
  getTimeOfDayBucket
};

