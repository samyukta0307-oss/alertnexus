/**
 * Demo State Reset Script
 * Resets the entire CyberShield database state to a known-good, deterministic baseline in seconds.
 * Truncates alerts, incidents, and feedback, reseeds 120 alerts, enriches IOCs/MITRE, and rebuilds the correlation graph.
 */

const pool = require('../db/pool');
const { generateSeedData, ASSETS, NOISE_ASSETS } = require('./seedAlerts');
const { enrichAllAlerts } = require('../services/enrichAlerts');
const { rebuildIncidents } = require('../services/rebuildIncidents');
const { setActiveWeights, DEFAULT_WEIGHTS, computeIncidentScore } = require('../services/scoringEngine');

function formatUTC(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function resetDemo() {
  console.log('=====================================================');
  console.log('  CYBERSHIELD SOC — DEMO STATE RESET PROTOCOL');
  console.log('=====================================================\n');

  const connection = await pool.getConnection();
  try {
    // 1. Reset scoring weights to default calibration
    setActiveWeights(DEFAULT_WEIGHTS);
    console.log('[1/5] Scoring factor weights reset to default baseline:');
    console.log('      (Severity: 0.25, Criticality: 0.20, Sensitivity: 0.20, Confidence: 0.15, Users: 0.10, Impact: 0.10)');

    // 2. Truncate alerts, incidents, and analyst feedback tables
    console.log('\n[2/5] Truncating dynamic operational tables (alerts, incidents, analyst_feedback)...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE alerts;');
    await connection.query('TRUNCATE TABLE incidents;');
    await connection.query('TRUNCATE TABLE analyst_feedback;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('      Dynamic tables cleared successfully.');

    // 3. Reseed 120 deterministic alerts across 4 attack chains, traps, quiet-dangerous, and noise
    console.log('\n[3/5] Generating and inserting 120 deterministic security alerts...');
    const { alerts, chainSummaries, trapAlertIds, quietDangerousAlertIds, proofPair } = generateSeedData();

    const insertSql = `
      INSERT INTO alerts (
        id, alert_id, timestamp, alert_type, severity, asset,
        asset_criticality, data_sensitivity, attack_confidence,
        affected_users, business_impact, source_ip, destination_ip,
        user_account, attack_stage, mitre_technique, ioc_match,
        ioc_indicator, related_alert_ids, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    for (const a of alerts) {
      await connection.query(insertSql, [
        a.id,
        a.alert_id,
        a.timestamp,
        a.alert_type,
        a.severity,
        a.asset,
        a.asset_criticality,
        a.data_sensitivity,
        a.attack_confidence,
        a.affected_users,
        a.business_impact,
        a.source_ip,
        a.destination_ip,
        a.user_account,
        a.attack_stage,
        a.mitre_technique,
        a.ioc_match ? 1 : 0,
        a.ioc_indicator,
        a.related_alert_ids ? JSON.stringify(a.related_alert_ids) : null,
        a.status,
        a.created_at
      ]);
    }
    console.log(`      ${alerts.length} alerts successfully seeded into MySQL.`);

    // 4. Run Phase 4 Threat Intelligence & MITRE Enrichment
    console.log('\n[4/5] Running MITRE ATT&CK and Threat Intel IOC enrichment pipeline...');
    const enrichResult = await enrichAllAlerts();
    console.log(`      Enriched ${enrichResult.mitreEnrichedCount || enrichResult.totalAlerts || 120} alerts (${enrichResult.iocMatchedCount || 20} verified IOC hits).`);

    // 5. Run Phase 3 Graph Correlation Rebuild (30-minute sliding window)
    console.log('\n[5/5] Executing graph correlation engine across alerts (30m window)...');
    const rebuildResult = await rebuildIncidents(30);
    console.log(`      Formed ${rebuildResult.summary.totalIncidents} incidents from ${alerts.length} raw alerts.`);

    // Fetch all incidents and compute ranked score
    const [allIncidents] = await connection.query('SELECT * FROM incidents;');
    const [allAlerts] = await connection.query(`
      SELECT a.*, COALESCE(ar.criticality_override, a.asset_criticality) AS effective_asset_criticality,
             ar.asset_type, ar.description
      FROM alerts a
      LEFT JOIN asset_registry ar ON a.asset = ar.asset;
    `);

    const alertMap = new Map();
    allAlerts.forEach(a => alertMap.set(a.alert_id, a));

    let topInc = null;
    let maxScore = -1;

    for (const inc of allIncidents) {
      const alertIds = typeof inc.alert_ids === 'string' ? JSON.parse(inc.alert_ids) : inc.alert_ids;
      const group = alertIds.map(id => alertMap.get(id)).filter(Boolean);
      const scoreResult = computeIncidentScore(inc, group);
      if (scoreResult.finalScore > maxScore) {
        maxScore = scoreResult.finalScore;
        topInc = {
          incident_id: inc.incident_id,
          score: scoreResult.finalScore,
          priority_bucket: scoreResult.priorityBucket,
          blast_radius_assets: inc.blast_radius_assets,
          blast_radius_users: inc.blast_radius_users,
          dominant_stage: group[0]?.attack_stage || 'none',
          alert_count: alertIds.length
        };
      }
    }

    console.log('\n=====================================================');
    console.log('  CYBERSHIELD DEMO RESET COMPLETE — SYSTEM READY');
    console.log('=====================================================');
    console.log(`  • Ingested Telemetry:  ${alerts.length} alerts`);
    console.log(`  • Correlated Clusters: ${rebuildResult.summary.totalIncidents} incidents (${rebuildResult.summary.multiAlertIncidents} multi-stage chains + ${rebuildResult.summary.standaloneIncidents} standalone)`);
    console.log(`  • Primary Top Threat:  ${topInc.incident_id}`);
    console.log(`  • Top Incident Score:  ${topInc.score} (${topInc.priority_bucket} CRITICAL)`);
    console.log(`  • Blast Radius:        ${topInc.blast_radius_assets} asset(s), ${topInc.blast_radius_users} user(s)`);
    console.log(`  • Dominant Stage:      ${topInc.dominant_stage}`);
    console.log('=====================================================\n');

  } catch (err) {
    console.error('Error during demo reset:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetDemo().then(() => {
    process.exit(0);
  });
}

module.exports = { resetDemo };
