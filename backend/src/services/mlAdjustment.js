/**
 * ML Confidence Adjustment Service
 * Applies dynamic bonus to attack_confidence based on isolation forest anomaly score.
 * Formula: adjustedConfidence = min(100, originalConfidence + anomalyScore * 20)
 */

const { isMlEnabled, ML_PROTOTYPE_LABEL } = require('../config/mlConfig');

/**
 * Computes the ML confidence adjustment for a single alert.
 *
 * @param {Object} alert
 * @param {number} anomalyScore - Anomaly score in [0.0, 1.0]
 * @param {boolean} [mlEnabledOverride] - Optional manual override for testing
 * @returns {Object} { originalConfidence, adjustedConfidence, anomalyScore, adjustmentDelta, isAdjusted, label }
 */
function applyMlAdjustment(alert, anomalyScore = 0.0, mlEnabledOverride = null) {
  const enabled = mlEnabledOverride !== null ? Boolean(mlEnabledOverride) : isMlEnabled();
  const originalConfidence = Number(alert.attack_confidence ?? 0);

  if (!enabled || anomalyScore <= 0) {
    return {
      enabled: false,
      originalConfidence,
      adjustedConfidence: originalConfidence,
      anomalyScore: 0.0,
      adjustmentDelta: 0.0,
      isAdjusted: false,
      label: ML_PROTOTYPE_LABEL
    };
  }

  const rawDelta = Number(anomalyScore) * 20.0;
  const rawAdjusted = originalConfidence + rawDelta;
  const adjustedConfidence = Math.min(100.0, Math.round(rawAdjusted * 100) / 100);
  const adjustmentDelta = Math.round((adjustedConfidence - originalConfidence) * 100) / 100;

  return {
    enabled: true,
    originalConfidence,
    adjustedConfidence,
    anomalyScore: Math.round(anomalyScore * 10000) / 10000,
    adjustmentDelta,
    isAdjusted: adjustmentDelta > 0,
    label: ML_PROTOTYPE_LABEL
  };
}

module.exports = {
  applyMlAdjustment
};

