const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const {
  buildCorrelationGraph,
  findConnectedComponents,
  computeBlastRadius,
  computeDistinctStages
} = require('./correlationEngine');

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
 * Rebuilds the incidents table by executing graph correlation on all alerts.
 * Groups alerts into connected components and writes incidents to MySQL.
 *
 * @param {number} [windowMinutes=30] - Sliding correlation time window in minutes
 * @returns {Promise<Object>} Summary of the rebuilt incidents
 */
async function rebuildIncidents(windowMinutes = 30) {
  console.log(`--- Rebuilding Incidents with ${windowMinutes}-minute correlation window ---`);

  // 1. Fetch all alerts from database
  const [rows] = await pool.query(`
    SELECT
      id, alert_id, timestamp, alert_type, severity, asset,
      asset_criticality, data_sensitivity, attack_confidence,
      affected_users, business_impact, source_ip, destination_ip,
      user_account, attack_stage, mitre_technique, ioc_match,
      related_alert_ids, status, created_at
    FROM alerts
    ORDER BY timestamp ASC;
  `);

  const alerts = rows.map(r => ({
    ...r,
    severity: Number(r.severity),
    asset_criticality: Number(r.asset_criticality),
    data_sensitivity: Number(r.data_sensitivity),
    attack_confidence: Number(r.attack_confidence),
    affected_users: Number(r.affected_users || 0),
    business_impact: Number(r.business_impact),
    ioc_match: Boolean(r.ioc_match),
    related_alert_ids: parseRelatedAlertIds(r.related_alert_ids)
  }));

  console.log(`Fetched ${alerts.length} alerts for correlation analysis.`);

  // 2. Build graph and find connected components
  const graph = buildCorrelationGraph(alerts, windowMinutes);
  const components = findConnectedComponents(graph, alerts);

  console.log(`Correlation complete: Identified ${components.length} incident components.`);

  // 3. Clear existing incidents
  await pool.query('TRUNCATE TABLE incidents;');

  // 4. Insert each incident into MySQL
  const insertSql = `
    INSERT INTO incidents (
      id, incident_id, alert_ids, blast_radius_assets,
      blast_radius_users, distinct_stages, last_alert_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
  `;

  let multiAlertIncidents = 0;
  let standaloneIncidents = 0;
  const incidentRecords = [];

  for (let i = 0; i < components.length; i++) {
    const group = components[i];
    const incidentId = `INC-${String(i + 1).padStart(4, '0')}`;
    const alertIds = group.map(a => a.alert_id);
    const blast = computeBlastRadius(group);
    const distinctStages = computeDistinctStages(group);

    // Latest alert timestamp in group (since group is sorted chronologically)
    const lastAlertAt = group[group.length - 1].timestamp;

    if (group.length > 1) {
      multiAlertIncidents++;
    } else {
      standaloneIncidents++;
    }

    const id = uuidv4();
    await pool.query(insertSql, [
      id,
      incidentId,
      JSON.stringify(alertIds),
      blast.assets,
      blast.users,
      distinctStages,
      lastAlertAt
    ]);

    incidentRecords.push({
      id,
      incident_id: incidentId,
      alert_ids: alertIds,
      alert_count: alertIds.length,
      blast_radius_assets: blast.assets,
      blast_radius_users: blast.users,
      distinct_stages: distinctStages,
      last_alert_at: lastAlertAt
    });
  }

  const summary = {
    totalAlerts: alerts.length,
    totalIncidents: components.length,
    multiAlertIncidents,
    standaloneIncidents,
    windowMinutes
  };

  console.log('Rebuild Summary:', summary);
  return { summary, incidents: incidentRecords };
}

if (require.main === module) {
  rebuildIncidents()
    .then(res => {
      console.log('Incident rebuild completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Incident rebuild failed:', err);
      process.exit(1);
    });
}

module.exports = { rebuildIncidents };

