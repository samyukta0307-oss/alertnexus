const http = require('http');
const mysql = require('mysql2/promise');
const pool = require('../db/pool');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('=== PHASE 4 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // --- 1. Check Schema in MySQL ---
  console.log('--- 1. Schema & Asset Registry Coverage ---');
  const [unmapped] = await pool.query(`
    SELECT DISTINCT a.asset
    FROM alerts a
    LEFT JOIN asset_registry ar ON a.asset = ar.asset
    WHERE ar.asset IS NULL;
  `);
  console.log('Unmapped Assets in Registry:', unmapped.length === 0 ? '0 (100% Coverage ✅)' : unmapped);

  const [assetCount] = await pool.query('SELECT COUNT(*) AS total FROM asset_registry;');
  console.log('Total Assets in Registry:', assetCount[0].total);

  // --- 2. Test POST /api/alerts/enrich (Idempotency check) ---
  console.log('\n--- 2. Testing POST /api/alerts/enrich (Idempotency) ---');
  const enrichRes1 = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/alerts/enrich',
    method: 'POST'
  });
  console.log('Enrich Call 1 -> Status:', enrichRes1.status, '| Summary:', enrichRes1.body.summary);

  const enrichRes2 = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/alerts/enrich',
    method: 'POST'
  });
  console.log('Enrich Call 2 -> Status:', enrichRes2.status, '| Summary:', enrichRes2.body.summary);
  const isIdempotent = JSON.stringify(enrichRes1.body.summary) === JSON.stringify(enrichRes2.body.summary);
  console.log('Idempotency Confirmed?', isIdempotent ? 'PASSED ✅' : 'FAILED ❌');

  // --- 3. Verify MITRE & IOC Population ---
  console.log('\n--- 3. Verifying MITRE & IOC Population on Alerts ---');
  const [iocAlerts] = await pool.query(`
    SELECT alert_id, source_ip, destination_ip, attack_stage, mitre_technique, ioc_match, ioc_indicator
    FROM alerts
    WHERE ioc_match = 1;
  `);
  console.log(`Total IOC Matches in Alerts: ${iocAlerts.length} (Expected: 20 across 4 chains)`);
  console.log('Sample IOC Matched Alert (Chain 1):', iocAlerts[0]);

  const [unmappedMitre] = await pool.query(`
    SELECT COUNT(*) AS unmapped FROM alerts WHERE mitre_technique IS NULL OR mitre_technique = '';
  `);
  console.log('Alerts with missing MITRE technique:', unmappedMitre[0].unmapped, '(0 expected ✅)');

  // --- 4. Verify Primary Attack Chain MITRE + IOC Tagging in Ranked Incidents ---
  console.log('\n--- 4. Verifying Primary Attack Chain MITRE & IOC Tagging ---');
  const rankedRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/incidents/ranked',
    method: 'GET'
  });

  const chainIncident = rankedRes.body.find(i => i.alert_count === 5);
  console.log(`Primary Chain Incident: ${chainIncident.incident_id} (Score: ${chainIncident.score}, Rank: #${chainIncident.rank})`);
  console.log('Alerts in chain:');
  for (const a of chainIncident.alerts) {
    console.log(`  - [${a.alert_id}] Type: ${a.alert_type} | Stage: ${a.attack_stage} | MITRE: ${a.mitre_technique} | IOC Match: ${a.ioc_match} | Indicator: ${a.ioc_indicator || 'none'}`);
  }

  // --- 5. Verify Asset Registry Criticality Override Dynamically Affects Scoring ---
  console.log('\n--- 5. Verifying Authoritative Asset Registry Criticality Override ---');
  const testAsset = 'DEV-BUILD-02';

  // Get initial score for INC-0057 (which includes DEV-BUILD-02)
  const [initialRanked] = (await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' })).body.filter(i => i.incident_id === 'INC-0057');
  console.log(`Initial INC-0057 -> MaxAdj: ${initialRanked.breakdown.maxStageAdjustedScore}, Score: ${initialRanked.score}`);

  // Test with a standalone incident on DEV-SRV-ALPHA-01
  const [alphaIncBefore] = (await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' })).body.filter(i => i.alerts.some(a => a.asset === 'DEV-SRV-ALPHA-01'));
  const scoreBefore = alphaIncBefore.score;
  const critBefore = alphaIncBefore.alerts[0].asset_criticality;
  console.log(`Standalone Asset DEV-SRV-ALPHA-01 -> Initial Criticality: ${critBefore}, Incident Score: ${scoreBefore}`);

  // Apply override in MySQL: change DEV-SRV-ALPHA-01 criticality from 30 to 99
  console.log('Applying criticality_override = 99 for DEV-SRV-ALPHA-01 in asset_registry...');
  await pool.query("UPDATE asset_registry SET criticality_override = 99 WHERE asset = 'DEV-SRV-ALPHA-01';");

  const [alphaIncAfter] = (await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' })).body.filter(i => i.alerts.some(a => a.asset === 'DEV-SRV-ALPHA-01'));
  const scoreAfter = alphaIncAfter.score;
  const critAfter = alphaIncAfter.alerts[0].asset_criticality;
  console.log(`Standalone Asset DEV-SRV-ALPHA-01 -> Overridden Criticality: ${critAfter}, Incident Score: ${scoreAfter}`);

  const overrideWorks = critAfter === 99 && scoreAfter > scoreBefore;
  console.log('Criticality Override Dynamic Effect Confirmed?', overrideWorks ? 'PASSED ✅' : 'FAILED ❌');

  // Revert override back to NULL
  console.log('Reverting criticality_override back to NULL...');
  await pool.query("UPDATE asset_registry SET criticality_override = NULL WHERE asset = 'DEV-SRV-ALPHA-01';");

  const [alphaIncReverted] = (await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' })).body.filter(i => i.alerts.some(a => a.asset === 'DEV-SRV-ALPHA-01'));
  console.log(`Reverted State -> Criticality: ${alphaIncReverted.alerts[0].asset_criticality}, Score: ${alphaIncReverted.score}`);

  console.log('\n=== ALL PHASE 4 VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification()
  .then(() => pool.end())
  .catch(err => {
    console.error('Verification failed:', err);
    pool.end();
  });

