const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { computeIncidentScore } = require('../services/scoringEngine');
const { rebuildIncidents } = require('../services/rebuildIncidents');
const {
  buildIncidentExplanation,
  generateSummary
} = require('../services/explainabilityService');
const { extractAllFeatures } = require('../services/mlFeatures');
const { computeAnomalyScores } = require('../services/anomalyDetector');
const { applyMlAdjustment } = require('../services/mlAdjustment');
const { isMlEnabled } = require('../config/mlConfig');
const { getPlaybook } = require('../services/playbooks');
const { simulateContainment } = require('../services/containmentSimulator');
const { validateOverrides, simulateWhatIf } = require('../services/whatIfSimulator');

const router = express.Router();

function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Hydrates alert rows with authoritative asset overrides and ML anomaly scoring.
 */
function hydrateAndEnrichAlertsWithMl(rawAlertRows) {
  const alerts = rawAlertRows.map(r => ({
    ...r,
    severity: Number(r.severity),
    stored_asset_criticality: Number(r.asset_criticality),
    asset_criticality: Number(r.effective_asset_criticality ?? r.asset_criticality),
    criticality_override: r.criticality_override !== null && r.criticality_override !== undefined ? Number(r.criticality_override) : null,
    data_sensitivity: Number(r.data_sensitivity),
    stored_attack_confidence: Number(r.attack_confidence),
    attack_confidence: Number(r.attack_confidence),
    affected_users: Number(r.affected_users || 0),
    business_impact: Number(r.business_impact),
    ioc_match: Boolean(r.ioc_match),
    related_alert_ids: parseJsonArray(r.related_alert_ids)
  }));

  const featureVectors = extractAllFeatures(alerts);
  const anomalyScores = computeAnomalyScores(featureVectors);

  const alertMap = new Map();
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    const score = anomalyScores[i] || 0.0;
    const mlAdj = applyMlAdjustment(a, score);

    const hydrated = {
      ...a,
      anomaly_score: mlAdj.anomalyScore,
      adjusted_attack_confidence: mlAdj.adjustedConfidence,
      attack_confidence: isMlEnabled() ? mlAdj.adjustedConfidence : a.stored_attack_confidence,
      ml_adjustment: mlAdj
    };

    alertMap.set(a.alert_id, hydrated);
  }

  return alertMap;
}

/**
 * Helper to fetch a single incident and its hydrated alerts.
 */
async function fetchIncidentAndAlerts(idOrIncidentId) {
  const [incidentRows] = await pool.query(
    `SELECT * FROM incidents WHERE id = ? OR incident_id = ? LIMIT 1;`,
    [idOrIncidentId, idOrIncidentId]
  );

  if (incidentRows.length === 0) {
    return null;
  }

  const incident = incidentRows[0];
  const alertIds = parseJsonArray(incident.alert_ids);

  const [allAlertRows] = await pool.query(`
    SELECT
      a.id, a.alert_id, a.timestamp, a.alert_type, a.severity, a.asset,
      a.asset_criticality,
      ar.criticality_override,
      COALESCE(ar.criticality_override, a.asset_criticality) AS effective_asset_criticality,
      ar.asset_type,
      ar.description,
      a.data_sensitivity, a.attack_confidence,
      a.affected_users, a.business_impact, a.source_ip, a.destination_ip,
      a.user_account, a.attack_stage, a.mitre_technique, a.ioc_match, a.ioc_indicator,
      a.related_alert_ids, a.status, a.created_at
    FROM alerts a
    LEFT JOIN asset_registry ar ON a.asset = ar.asset;
  `);

  const alertMap = hydrateAndEnrichAlertsWithMl(allAlertRows);
  const alerts = alertIds.map(id => alertMap.get(id)).filter(Boolean);
  alerts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { incident, alerts };
}

/**
 * POST /api/incidents/rebuild
 */
router.post('/rebuild', async (req, res) => {
  try {
    const windowMinutes = req.body?.windowMinutes ? Number(req.body.windowMinutes) : 30;
    const result = await rebuildIncidents(windowMinutes);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error rebuilding incidents:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/ranked
 */
router.get('/ranked', async (req, res) => {
  try {
    const [incidentRows] = await pool.query(`
      SELECT
        id, incident_id, alert_ids, blast_radius_assets,
        blast_radius_users, distinct_stages, last_alert_at,
        created_at, updated_at
      FROM incidents;
    `);

    if (incidentRows.length === 0) {
      return res.status(200).json([]);
    }

    const [alertRows] = await pool.query(`
      SELECT
        a.id, a.alert_id, a.timestamp, a.alert_type, a.severity, a.asset,
        a.asset_criticality,
        ar.criticality_override,
        COALESCE(ar.criticality_override, a.asset_criticality) AS effective_asset_criticality,
        ar.asset_type,
        ar.description,
        a.data_sensitivity, a.attack_confidence,
        a.affected_users, a.business_impact, a.source_ip, a.destination_ip,
        a.user_account, a.attack_stage, a.mitre_technique, a.ioc_match, a.ioc_indicator,
        a.related_alert_ids, a.status, a.created_at
      FROM alerts a
      LEFT JOIN asset_registry ar ON a.asset = ar.asset;
    `);

    const alertMap = hydrateAndEnrichAlertsWithMl(alertRows);

    const maxAlertTimestamp = alertRows.reduce((max, r) => {
      const t = new Date(r.timestamp).getTime();
      return t > max ? t : max;
    }, 0);
    const referenceNow = new Date(maxAlertTimestamp || Date.now());

    const scoredIncidents = incidentRows.map(row => {
      const alertIds = parseJsonArray(row.alert_ids);
      const alertsInGroup = alertIds.map(id => alertMap.get(id)).filter(Boolean);

      const incidentData = {
        id: row.id,
        incident_id: row.incident_id,
        alert_ids: alertIds,
        blast_radius_assets: Number(row.blast_radius_assets),
        blast_radius_users: Number(row.blast_radius_users),
        distinct_stages: Number(row.distinct_stages),
        last_alert_at: row.last_alert_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      const { finalScore, priorityBucket, breakdown } = computeIncidentScore(
        incidentData,
        alertsInGroup,
        referenceNow
      );

      const maxAssetCriticality = alertsInGroup.reduce(
        (max, a) => Math.max(max, a.asset_criticality || 0),
        0
      );

      const distinctAttackStages = Array.from(
        new Set(alertsInGroup.map(a => a.attack_stage).filter(s => s && s !== 'none'))
      );

      const blastRadius = {
        assets: Number(row.blast_radius_assets),
        users: Number(row.blast_radius_users),
        total: Number(row.blast_radius_assets) + Number(row.blast_radius_users)
      };

      const topAlert = alertsInGroup.find(a => a.alert_id === breakdown.highestScoringAlertId) || alertsInGroup[0];

      const summary = generateSummary({
        incidentId: row.incident_id,
        finalScore,
        priorityBucket,
        topAlert,
        blastRadius,
        correlatedAlertsCount: alertsInGroup.length,
        distinctAttackStages,
        alerts: alertsInGroup
      });

      return {
        id: row.id,
        incident_id: row.incident_id,
        alert_ids: alertIds,
        alert_count: alertIds.length,
        score: finalScore,
        priority_bucket: priorityBucket,
        summary,
        blast_radius: blastRadius,
        distinct_stages: Number(row.distinct_stages),
        last_alert_at: row.last_alert_at,
        breakdown,
        max_asset_criticality: maxAssetCriticality,
        alerts: alertsInGroup
      };
    });

    scoredIncidents.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.max_asset_criticality !== a.max_asset_criticality) return b.max_asset_criticality - a.max_asset_criticality;
      return new Date(b.last_alert_at) - new Date(a.last_alert_at);
    });

    const rankedWithRank = scoredIncidents.map((item, idx) => ({
      rank: idx + 1,
      id: item.id,
      incident_id: item.incident_id,
      alert_ids: item.alert_ids,
      alert_count: item.alert_count,
      score: item.score,
      priority_bucket: item.priority_bucket,
      summary: item.summary,
      blast_radius: item.blast_radius,
      distinct_stages: item.distinct_stages,
      last_alert_at: item.last_alert_at,
      breakdown: item.breakdown,
      alerts: item.alerts
    }));

    return res.status(200).json(rankedWithRank);
  } catch (err) {
    console.error('Error fetching ranked incidents:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id
 * Fetches a single incident by ID or incident_id with computed score and summary.
 */
router.get('/:id', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const { incident, alerts } = data;
    const scoreData = computeIncidentScore(incident, alerts);
    const summary = generateSummary(incident, alerts, scoreData);

    return res.status(200).json({
      id: incident.id,
      incident_id: incident.incident_id,
      alert_ids: parseJsonArray(incident.alert_ids),
      alert_count: alerts.length,
      score: scoreData.finalScore,
      priority_bucket: scoreData.priorityBucket,
      summary,
      blast_radius: {
        assets: Number(incident.blast_radius_assets),
        users: Number(incident.blast_radius_users),
        total: Number(incident.blast_radius_assets) + Number(incident.blast_radius_users)
      },
      distinct_stages: Number(incident.distinct_stages),
      last_alert_at: incident.last_alert_at,
      breakdown: scoreData.breakdown,
      alerts
    });
  } catch (err) {
    console.error('Error fetching incident:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id/explain
 */
router.get('/:id/explain', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }
    const explanation = buildIncidentExplanation(data.incident, data.alerts);
    return res.status(200).json(explanation);
  } catch (err) {
    console.error('Error generating incident explanation:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id/playbook
 * Determines dominant incident category and returns curated response actions.
 */
router.get('/:id/playbook', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const { incident, alerts } = data;
    const scoreData = computeIncidentScore(incident, alerts);
    const topAlert = alerts.find(a => a.alert_id === scoreData.highestScoringAlertId) || alerts[0];

    const playbook = getPlaybook(topAlert?.alert_type, topAlert?.attack_stage);

    return res.status(200).json({
      incidentId: incident.incident_id,
      matchedRule: playbook.ruleKey,
      playbookName: playbook.playbookName,
      severityLevel: playbook.severityLevel,
      topAlert: topAlert ? {
        alert_id: topAlert.alert_id,
        alert_type: topAlert.alert_type,
        attack_stage: topAlert.attack_stage,
        asset: topAlert.asset
      } : null,
      actions: playbook.actions
    });
  } catch (err) {
    console.error('Error fetching incident playbook:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/incidents/:id/simulate-containment
 * Non-destructive simulation of isolating compromised hosts.
 */
router.post('/:id/simulate-containment', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const { incident, alerts } = data;
    const scoreData = computeIncidentScore(incident, alerts);

    const simulationResult = simulateContainment(incident, alerts, {
      finalScore: scoreData.finalScore,
      priorityBucket: scoreData.priorityBucket
    });

    return res.status(200).json(simulationResult);
  } catch (err) {
    console.error('Error simulating containment:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/incidents/:id/what-if
 * Non-destructive sensitivity simulation applying hypothetical overrides to top alert.
 */
router.post('/:id/what-if', async (req, res) => {
  try {
    const overrides = req.body?.overrides || req.body || {};
    const errors = validateOverrides(overrides);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'What-if overrides failed schema validation.',
        details: errors
      });
    }

    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const result = simulateWhatIf(data.incident, data.alerts, overrides);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error simulating what-if scenario:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/incidents/:id/feedback
 * Records analyst triage verdict ('confirmed' or 'false_positive').
 * NOTE: Data is stored for audit/future retraining; no live retraining loop is active in this build.
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { verdict, notes } = req.body || {};
    const incidentId = req.params.id;

    const validVerdicts = ['confirmed', 'false_positive'];
    if (!verdict || !validVerdicts.includes(verdict)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Field 'verdict' is required and must be one of: ${validVerdicts.join(', ')}.`
      });
    }

    if (notes && typeof notes !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: "Field 'notes' must be a string if provided."
      });
    }

    const id = uuidv4();
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await pool.query(
      `INSERT INTO analyst_feedback (id, incident_id, verdict, notes, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, incidentId, verdict, notes ? notes.substring(0, 500) : null, formattedDate]
    );

    return res.status(201).json({
      id,
      incident_id: incidentId,
      verdict,
      notes: notes || null,
      created_at: formattedDate,
      message: 'Analyst feedback recorded successfully for future model retraining.'
    });
  } catch (err) {
    console.error('Error recording analyst feedback:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id/feedback
 * Returns feedback history for the given incident.
 */
router.get('/:id/feedback', async (req, res) => {
  try {
    const incidentId = req.params.id;
    const [rows] = await pool.query(
      `SELECT id, incident_id, verdict, notes, created_at
       FROM analyst_feedback
       WHERE incident_id = ?
       ORDER BY created_at DESC;`,
      [incidentId]
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching analyst feedback:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id/chain
 */
router.get('/:id/chain', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const { incident, alerts } = data;
    return res.status(200).json({
      id: incident.id,
      incident_id: incident.incident_id,
      alert_count: alerts.length,
      blast_radius: {
        assets: Number(incident.blast_radius_assets),
        users: Number(incident.blast_radius_users),
        total: Number(incident.blast_radius_assets) + Number(incident.blast_radius_users)
      },
      distinct_stages: Number(incident.distinct_stages),
      last_alert_at: incident.last_alert_at,
      chain: alerts
    });
  } catch (err) {
    console.error('Error fetching incident chain:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/incidents/:id/report
 * Generates a comprehensive, structured incident investigation report assembling all telemetry.
 */
router.get('/:id/report', async (req, res) => {
  try {
    const data = await fetchIncidentAndAlerts(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Not Found', message: `Incident '${req.params.id}' not found.` });
    }

    const { incident, alerts } = data;
    const explanation = buildIncidentExplanation(incident, alerts);
    const scoreData = computeIncidentScore(incident, alerts);
    const topAlert = alerts.find(a => a.alert_id === scoreData.highestScoringAlertId) || alerts[0];
    const playbook = getPlaybook(topAlert?.alert_type, topAlert?.attack_stage);
    const containment = simulateContainment(incident, alerts, {
      finalScore: scoreData.finalScore,
      priorityBucket: scoreData.priorityBucket
    });

    const [feedbackRows] = await pool.query(
      `SELECT verdict, notes, created_at FROM analyst_feedback WHERE incident_id = ? ORDER BY created_at DESC;`,
      [incident.incident_id]
    );

    const report = {
      reportId: `RPT-${incident.incident_id}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      incidentId: incident.incident_id,
      classification: {
        score: explanation.finalScore,
        priorityBucket: explanation.priorityBucket,
        severityLevel: playbook.severityLevel,
        dominantThreat: topAlert?.alert_type,
        primaryAsset: topAlert?.asset
      },
      summary: explanation.summary,
      rootCauseReasons: explanation.reasons,
      scoreBreakdown: explanation.scoreBreakdown,
      mlAdjustment: explanation.mlAdjustment,
      blastRadius: {
        assets: Number(incident.blast_radius_assets),
        users: Number(incident.blast_radius_users),
        distinctStages: Number(incident.distinct_stages),
        impactedHostnames: Array.from(new Set(alerts.map(a => a.asset).filter(Boolean)))
      },
      playbookRecommendation: {
        name: playbook.playbookName,
        rule: playbook.ruleKey,
        actions: playbook.actions
      },
      containmentSimulation: {
        predictedScoreDrop: `${containment.before.finalScore} (${containment.before.priorityBucket}) -> ${containment.after.finalScore} (${containment.after.priorityBucket})`,
        riskReductionPercent: `${containment.after.riskReductionPercent}%`,
        simulatedActions: containment.simulatedActions
      },
      chronologicalAlertChain: alerts.map((a, idx) => ({
        step: idx + 1,
        alert_id: a.alert_id,
        timestamp: a.timestamp,
        stage: a.attack_stage,
        alert_type: a.alert_type,
        asset: a.asset,
        source_ip: a.source_ip,
        user_account: a.user_account,
        mitre_technique: a.mitre_technique,
        ioc_match: Boolean(a.ioc_match),
        ioc_indicator: a.ioc_indicator
      })),
      feedbackHistory: feedbackRows
    };

    return res.status(200).json(report);
  } catch (err) {
    console.error('Error generating incident report:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

module.exports = router;
