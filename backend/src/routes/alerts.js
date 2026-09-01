const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { mapMitreTechnique } = require('../services/mitreMapping');
const { checkIOC } = require('../services/iocEnrichment');
const { enrichAllAlerts } = require('../services/enrichAlerts');

const router = express.Router();

const VALID_ATTACK_STAGES = [
  'reconnaissance',
  'initial_access',
  'privilege_escalation',
  'lateral_movement',
  'persistence',
  'exfiltration',
  'none'
];

const VALID_STATUSES = ['new', 'investigating', 'contained', 'closed'];

/**
 * Helper to parse related_alert_ids safely into an Array.
 */
function parseRelatedAlertIds(val) {
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
 * Format a DB alert row into a clean response object.
 */
function formatAlertRow(row) {
  return {
    id: row.id,
    alert_id: row.alert_id,
    timestamp: row.timestamp,
    alert_type: row.alert_type,
    severity: Number(row.severity),
    asset: row.asset,
    asset_type: row.asset_type || null,
    asset_criticality: Number(row.effective_asset_criticality ?? row.asset_criticality),
    stored_asset_criticality: Number(row.asset_criticality),
    criticality_override: row.criticality_override !== null && row.criticality_override !== undefined ? Number(row.criticality_override) : null,
    data_sensitivity: Number(row.data_sensitivity),
    attack_confidence: Number(row.attack_confidence),
    affected_users: Number(row.affected_users || 0),
    business_impact: Number(row.business_impact),
    source_ip: row.source_ip,
    destination_ip: row.destination_ip || null,
    user_account: row.user_account || null,
    attack_stage: row.attack_stage,
    mitre_technique: row.mitre_technique || null,
    ioc_match: Boolean(row.ioc_match),
    ioc_indicator: row.ioc_indicator || null,
    related_alert_ids: parseRelatedAlertIds(row.related_alert_ids),
    status: row.status,
    created_at: row.created_at
  };
}

/**
 * POST /api/alerts/enrich
 * On-demand endpoint to run full batch enrichment across all alerts.
 */
router.post('/enrich', async (req, res) => {
  try {
    const summary = await enrichAllAlerts();
    return res.status(200).json({
      status: 'ok',
      message: 'Alert enrichment completed successfully.',
      summary
    });
  } catch (err) {
    console.error('Error running enrichment job:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/alerts
 * Returns all alerts ordered newest first, joined with asset_registry for authoritative criticality.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id, a.alert_id, a.timestamp, a.alert_type, a.severity, a.asset,
        a.asset_criticality,
        ar.criticality_override,
        COALESCE(ar.criticality_override, a.asset_criticality) AS effective_asset_criticality,
        ar.asset_type,
        a.data_sensitivity, a.attack_confidence,
        a.affected_users, a.business_impact, a.source_ip, a.destination_ip,
        a.user_account, a.attack_stage, a.mitre_technique, a.ioc_match, a.ioc_indicator,
        a.related_alert_ids, a.status, a.created_at
      FROM alerts a
      LEFT JOIN asset_registry ar ON a.asset = ar.asset
      ORDER BY a.timestamp DESC;
    `);

    const alerts = rows.map(formatAlertRow);
    return res.status(200).json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/alerts
 * Ingestion endpoint with strict validation, automatic MITRE mapping, and IOC enrichment.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const errors = [];

    // 1. Required string fields
    if (!body.alert_id || typeof body.alert_id !== 'string' || body.alert_id.trim() === '') {
      errors.push('alert_id is required and must be a non-empty string');
    }
    if (!body.alert_type || typeof body.alert_type !== 'string' || body.alert_type.trim() === '') {
      errors.push('alert_type is required and must be a non-empty string');
    }
    if (!body.asset || typeof body.asset !== 'string' || body.asset.trim() === '') {
      errors.push('asset is required and must be a non-empty string');
    }
    if (!body.source_ip || typeof body.source_ip !== 'string' || body.source_ip.trim() === '') {
      errors.push('source_ip is required and must be a non-empty string');
    }

    // 2. Timestamp validation
    if (!body.timestamp) {
      errors.push('timestamp is required');
    } else {
      const dateVal = new Date(body.timestamp);
      if (isNaN(dateVal.getTime())) {
        errors.push('timestamp must be a valid ISO 8601 date string or datetime');
      }
    }

    // 3. Integer range validation [0, 100]
    const checkRange = (fieldName) => {
      const val = body[fieldName];
      if (val === undefined || val === null || val === '') {
        errors.push(`${fieldName} is required`);
      } else {
        const num = Number(val);
        if (!Number.isInteger(num) || num < 0 || num > 100) {
          errors.push(`${fieldName} must be an integer between 0 and 100 (received: ${val})`);
        }
      }
    };

    checkRange('severity');
    checkRange('asset_criticality');
    checkRange('data_sensitivity');
    checkRange('attack_confidence');
    checkRange('business_impact');

    // 4. affected_users validation (integer >= 0)
    let affectedUsers = 0;
    if (body.affected_users !== undefined && body.affected_users !== null) {
      const numUsers = Number(body.affected_users);
      if (!Number.isInteger(numUsers) || numUsers < 0) {
        errors.push('affected_users must be a non-negative integer');
      } else {
        affectedUsers = numUsers;
      }
    }

    // 5. attack_stage enum validation
    if (!body.attack_stage || !VALID_ATTACK_STAGES.includes(body.attack_stage)) {
      errors.push(
        `attack_stage is required and must be one of: ${VALID_ATTACK_STAGES.join(', ')}`
      );
    }

    // 6. status validation (optional, defaults to 'new')
    let status = 'new';
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
      } else {
        status = body.status;
      }
    }

    // 7. related_alert_ids validation (must be array or null)
    let relatedAlertIds = null;
    if (body.related_alert_ids !== undefined && body.related_alert_ids !== null) {
      if (!Array.isArray(body.related_alert_ids)) {
        errors.push('related_alert_ids must be an array of strings or null');
      } else {
        relatedAlertIds = body.related_alert_ids.map(id => String(id));
      }
    }

    // Return 400 Bad Request if any validations failed
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Alert payload failed schema validation.',
        details: errors
      });
    }

    // Apply automatic MITRE technique and IOC enrichment
    const mitreTechnique = body.mitre_technique || mapMitreTechnique(body);
    const iocResult = checkIOC(body);
    const iocMatch = body.ioc_match !== undefined ? Boolean(body.ioc_match) : iocResult.isMatch;
    const iocIndicator = body.ioc_indicator || iocResult.indicator;

    // Check asset registry for authoritative criticality override
    const [assetRows] = await pool.query(
      'SELECT asset_type, criticality_override FROM asset_registry WHERE asset = ? LIMIT 1;',
      [body.asset.trim()]
    );
    const assetRegistryEntry = assetRows[0] || null;
    const effectiveCriticality = assetRegistryEntry?.criticality_override ?? Number(body.asset_criticality);

    // Prepare insert data
    const id = body.id || uuidv4();
    const formattedTimestamp = new Date(body.timestamp).toISOString().replace('T', ' ').substring(0, 19);
    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const destinationIp = body.destination_ip ? String(body.destination_ip) : null;
    const userAccount = body.user_account ? String(body.user_account) : null;

    const insertSql = `
      INSERT INTO alerts (
        id, alert_id, timestamp, alert_type, severity, asset,
        asset_criticality, data_sensitivity, attack_confidence,
        affected_users, business_impact, source_ip, destination_ip,
        user_account, attack_stage, mitre_technique, ioc_match, ioc_indicator,
        related_alert_ids, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await pool.query(insertSql, [
      id,
      body.alert_id.trim(),
      formattedTimestamp,
      body.alert_type.trim(),
      Number(body.severity),
      body.asset.trim(),
      Number(body.asset_criticality),
      Number(body.data_sensitivity),
      Number(body.attack_confidence),
      affectedUsers,
      Number(body.business_impact),
      body.source_ip.trim(),
      destinationIp,
      userAccount,
      body.attack_stage,
      mitreTechnique,
      iocMatch ? 1 : 0,
      iocIndicator,
      relatedAlertIds ? JSON.stringify(relatedAlertIds) : null,
      status,
      createdAt
    ]);

    const createdAlert = {
      id,
      alert_id: body.alert_id.trim(),
      timestamp: formattedTimestamp,
      alert_type: body.alert_type.trim(),
      severity: Number(body.severity),
      asset: body.asset.trim(),
      asset_type: assetRegistryEntry?.asset_type || null,
      asset_criticality: effectiveCriticality,
      stored_asset_criticality: Number(body.asset_criticality),
      criticality_override: assetRegistryEntry?.criticality_override ?? null,
      data_sensitivity: Number(body.data_sensitivity),
      attack_confidence: Number(body.attack_confidence),
      affected_users: affectedUsers,
      business_impact: Number(body.business_impact),
      source_ip: body.source_ip.trim(),
      destination_ip: destinationIp,
      user_account: userAccount,
      attack_stage: body.attack_stage,
      mitre_technique: mitreTechnique,
      ioc_match: iocMatch,
      ioc_indicator: iocIndicator,
      related_alert_ids: relatedAlertIds || [],
      status,
      created_at: createdAt
    };

    return res.status(201).json(createdAlert);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate Alert ID',
        message: `An alert with alert_id '${req.body.alert_id}' already exists.`
      });
    }
    console.error('Error creating alert:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

module.exports = router;
