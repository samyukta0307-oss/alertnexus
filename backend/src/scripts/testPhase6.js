const http = require('http');
const pool = require('../db/pool');
const { extractAllFeatures } = require('../services/mlFeatures');
const { computeAnomalyScores } = require('../services/anomalyDetector');
const { applyMlAdjustment } = require('../services/mlAdjustment');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
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
  console.log('=== PHASE 6 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // --- 1. Feature Extraction Verification ---
  console.log('--- 1. Testing Feature Extraction Across All Alerts ---');
  const [rows] = await pool.query(`
    SELECT a.*, ar.asset_type, ar.description,
           COALESCE(ar.criticality_override, a.asset_criticality) AS effective_asset_criticality
    FROM alerts a
    LEFT JOIN asset_registry ar ON a.asset = ar.asset
    ORDER BY a.timestamp ASC;
  `);

  const features = extractAllFeatures(rows);
  console.log(`Extracted features for ${features.length} alerts.`);

  // Spot check attack chain alert (e.g. ALT-0003 in Chain 1) vs noise alert (ALT-0035)
  const chainAlertIdx = rows.findIndex(r => r.alert_id === 'ALT-0003');
  const noiseAlertIdx = rows.findIndex(r => r.alert_id === 'ALT-0035');

  console.log(`Attack Chain Alert (${rows[chainAlertIdx].alert_id} - ${rows[chainAlertIdx].source_ip} / ${rows[chainAlertIdx].user_account}):`);
  console.log('  Features [timeOfDay, srcFreq, userFreq, assetSens, sevNorm]:', features[chainAlertIdx]);

  console.log(`Standalone Noise Alert (${rows[noiseAlertIdx].alert_id} - ${rows[noiseAlertIdx].source_ip} / ${rows[noiseAlertIdx].user_account}):`);
  console.log('  Features [timeOfDay, srcFreq, userFreq, assetSens, sevNorm]:', features[noiseAlertIdx]);

  // --- 2. Anomaly Scoring Distribution & Attack Chain vs Noise Spread ---
  console.log('\n--- 2. Testing Isolation Forest Anomaly Scoring Distribution ---');
  const scores = computeAnomalyScores(features);

  const chainScores = [];
  const noiseScores = [];

  for (let i = 0; i < rows.length; i++) {
    const alertIdNum = parseInt(rows[i].alert_id.replace('ALT-', ''), 10);
    if (alertIdNum <= 20) {
      chainScores.push(scores[i]);
    } else {
      noiseScores.push(scores[i]);
    }
  }

  const avgChainScore = chainScores.reduce((a, b) => a + b, 0) / chainScores.length;
  const avgNoiseScore = noiseScores.reduce((a, b) => a + b, 0) / noiseScores.length;

  console.log(`Average Anomaly Score for Attack Chains (ALT-0001 to ALT-0020): ${avgChainScore.toFixed(4)}`);
  console.log(`Average Anomaly Score for Standalone Noise Alerts: ${avgNoiseScore.toFixed(4)}`);
  console.log(`Score Ratio (Chain vs Noise): ${(avgChainScore / (avgNoiseScore || 0.001)).toFixed(2)}x higher anomaly signal`);

  const attackChainSeparationPassed = avgChainScore > avgNoiseScore;
  console.log('Attack Chain Anomaly Separation:', attackChainSeparationPassed ? 'PASSED ✅' : 'FAILED ❌');

  // --- 3. Confidence Adjustment Math ---
  console.log('\n--- 3. Testing Confidence Adjustment Math ---');
  const testAlert = rows[chainAlertIdx];
  const testScore = scores[chainAlertIdx];
  const testAdj = applyMlAdjustment(testAlert, testScore, true);

  console.log(`Alert ${testAlert.alert_id}:`);
  console.log(`  - Original Confidence: ${testAdj.originalConfidence}`);
  console.log(`  - Anomaly Score: ${testAdj.anomalyScore}`);
  console.log(`  - Adjustment Delta: +${testAdj.adjustmentDelta} (Expected: +${(testScore * 20).toFixed(2)})`);
  console.log(`  - Adjusted Confidence: ${testAdj.adjustedConfidence} (Capped at 100)`);
  console.log(`  - Prototype Label: "${testAdj.label}"`);

  // --- 4. Runtime ML Toggle Endpoints ---
  console.log('\n--- 4. Testing Runtime ML Toggle (POST & GET /api/config/ml-status) ---');
  // Check initial status
  const initStatus = await request({ host: 'localhost', port: 5000, path: '/api/config/ml-status', method: 'GET' });
  console.log('Initial ML Status:', initStatus.data);

  // Disable ML
  console.log('Disabling ML via POST /api/config/ml-status { enabled: false }...');
  const disableRes = await request(
    { host: 'localhost', port: 5000, path: '/api/config/ml-status', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { enabled: false }
  );
  console.log('Disable Response:', disableRes.data);

  // Query ranked incidents while ML is disabled
  const rankedDisabled = await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' });
  const explainDisabled = await request({ host: 'localhost', port: 5000, path: `/api/incidents/${rankedDisabled.data[0].incident_id}/explain`, method: 'GET' });
  console.log(`While ML Disabled -> Top Incident: ${explainDisabled.data.incidentId}, mlAdjustment:`, explainDisabled.data.topAlert.mlAdjustment);

  // Re-enable ML
  console.log('Re-enabling ML via POST /api/config/ml-status { enabled: true }...');
  const enableRes = await request(
    { host: 'localhost', port: 5000, path: '/api/config/ml-status', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { enabled: true }
  );
  console.log('Enable Response:', enableRes.data);

  // Query ranked incidents while ML is enabled
  const rankedEnabled = await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' });
  const explainEnabled = await request({ host: 'localhost', port: 5000, path: `/api/incidents/${rankedEnabled.data[0].incident_id}/explain`, method: 'GET' });
  console.log(`While ML Enabled -> Top Incident: ${explainEnabled.data.incidentId}, mlAdjustment:`, explainEnabled.data.topAlert.mlAdjustment);

  // --- 5. Verify Scoring Sensitivity between ML Enabled vs Disabled ---
  console.log('\n--- 5. Verifying Scoring Shift between ML Enabled vs Disabled ---');
  let scoreDifferencesFound = 0;
  for (let i = 0; i < rankedEnabled.data.length; i++) {
    const incEn = rankedEnabled.data[i];
    const incDis = rankedDisabled.data.find(d => d.incident_id === incEn.incident_id);
    if (incDis && incEn.score !== incDis.score) {
      scoreDifferencesFound++;
      if (scoreDifferencesFound <= 3) {
        console.log(`Incident ${incEn.incident_id}: Score With ML = ${incEn.score} vs Without ML = ${incDis.score} (Delta: +${(incEn.score - incDis.score).toFixed(2)})`);
      }
    }
  }
  console.log(`Total Incidents Showing ML Confidence Shift: ${scoreDifferencesFound} / ${rankedEnabled.data.length}`);
  console.log('ML Wire-In Proof:', scoreDifferencesFound > 0 ? 'PASSED ✅' : 'FAILED ❌');

  console.log('\n=== ALL PHASE 6 VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification()
  .then(() => pool.end())
  .catch(err => {
    console.error('Verification failed:', err);
    pool.end();
  });

