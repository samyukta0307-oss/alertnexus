const express = require('express');
const { isMlEnabled, setMlEnabled, ML_PROTOTYPE_LABEL } = require('../config/mlConfig');
const { getActiveWeights, setActiveWeights } = require('../services/scoringEngine');

const router = express.Router();

/**
 * GET /api/config/ml-status
 * Returns the current runtime ML anomaly detection status and prototype label.
 */
router.get('/ml-status', (req, res) => {
  return res.status(200).json({
    enabled: isMlEnabled(),
    label: ML_PROTOTYPE_LABEL,
    description: 'Isolation forest prototype anomaly detection for attack_confidence adjustment.'
  });
});

/**
 * POST /api/config/ml-status
 * Allows toggling ML anomaly detection at runtime without restarting the server.
 * Payload: { enabled: boolean }
 */
router.post('/ml-status', (req, res) => {
  if (req.body?.enabled === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Request body must contain boolean field 'enabled'."
    });
  }

  const newState = setMlEnabled(req.body.enabled);
  return res.status(200).json({
    status: 'ok',
    enabled: newState,
    label: ML_PROTOTYPE_LABEL,
    message: `ML anomaly detection successfully ${newState ? 'enabled' : 'disabled'}.`
  });
});

/**
 * GET /api/config/weights
 * Returns the current active scoring factor weights.
 */
router.get('/weights', (req, res) => {
  return res.status(200).json({
    weights: getActiveWeights()
  });
});

/**
 * POST /api/config/weights
 * Updates the active scoring factor weights at runtime.
 * Payload: { weights: { severity, asset_criticality, data_sensitivity, attack_confidence, affected_users, business_impact } }
 */
router.post('/weights', (req, res) => {
  const incomingWeights = req.body?.weights || req.body;

  if (!incomingWeights || typeof incomingWeights !== 'object') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body must contain a weights object.'
    });
  }

  const updated = setActiveWeights(incomingWeights);
  return res.status(200).json({
    status: 'ok',
    message: 'Scoring weights updated successfully.',
    weights: updated
  });
});

module.exports = router;
