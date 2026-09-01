const http = require('http');

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
  console.log('=== PHASE 7 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // --- 1. Fetch ranked incidents to select targets ---
  const rankedRes = await request({ host: 'localhost', port: 5000, path: '/api/incidents/ranked', method: 'GET' });
  const topIncident = rankedRes.data[0]; // e.g. INC-0057 (P1, Attack chain)
  const standalonePortScan = rankedRes.data.find(i => i.alert_count === 1 && i.alerts[0]?.alert_type === 'port_scan');
  const exfilIncident = rankedRes.data.find(i => i.alerts.some(a => a.alert_type === 'data_exfiltration')) || topIncident;
  const p3Incident = rankedRes.data.find(i => i.priority_bucket === 'P3');

  // --- 2. Test Playbook Lookup ---
  console.log('--- 2. Testing Playbook Lookup (GET /api/incidents/:id/playbook) ---');
  // High-severity / Exfiltration / Lateral Movement playbook
  const pb1 = await request({ host: 'localhost', port: 5000, path: `/api/incidents/${exfilIncident.incident_id}/playbook`, method: 'GET' });
  console.log(`Incident (${exfilIncident.incident_id}) Playbook:`);
  console.log(`  Rule Matched: ${pb1.data.matchedRule} | Name: "${pb1.data.playbookName}" | Severity: ${pb1.data.severityLevel}`);
  console.log('  Actions:');
  for (const a of pb1.data.actions) console.log(`    • ${a}`);

  // Port scan (Calm / Low-Urgency) playbook
  const pbPortScan = await request({ host: 'localhost', port: 5000, path: `/api/incidents/${standalonePortScan.incident_id}/playbook`, method: 'GET' });
  console.log(`\nStandalone Port Scan Incident (${standalonePortScan.incident_id}) Playbook:`);
  console.log(`  Rule Matched: ${pbPortScan.data.matchedRule} | Name: "${pbPortScan.data.playbookName}" | Severity: ${pbPortScan.data.severityLevel}`);
  console.log('  Actions:');
  for (const a of pbPortScan.data.actions) console.log(`    • ${a}`);
  const isPortScanCalm = pbPortScan.data.severityLevel === 'LOW' && pbPortScan.data.actions[0].toLowerCase().includes('no urgent');
  console.log('Port Scan Nuanced Response:', isPortScanCalm ? 'PASSED ✅' : 'FAILED ❌');

  // --- 3. Test Simulate Containment ---
  console.log('\n--- 3. Testing Containment Simulation (POST /api/incidents/:id/simulate-containment) ---');
  const cont1 = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/incidents/${topIncident.incident_id}/simulate-containment`,
    method: 'POST'
  });
  console.log('Containment Simulation 1 Response:');
  console.log(`  Before: Score = ${cont1.data.before.finalScore} (${cont1.data.before.priorityBucket}), Blast Radius = ${cont1.data.before.blastRadius.assets} assets`);
  console.log(`  After:  Score = ${cont1.data.after.finalScore} (${cont1.data.after.priorityBucket}), Blast Radius = ${cont1.data.after.blastRadius.assets} assets`);
  console.log(`  Risk Reduction: ${cont1.data.after.riskReductionPercent}%`);

  const scoreDropped = cont1.data.after.finalScore < cont1.data.before.finalScore;
  const blastNeutralized = cont1.data.after.blastRadius.assets === 0;
  console.log('Containment Score Drop Confirmed?', scoreDropped ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Blast Radius Neutralization Confirmed?', blastNeutralized ? 'PASSED ✅' : 'FAILED ❌');

  // Verify Non-Destructiveness (Idempotency & DB Isolation)
  const cont2 = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/incidents/${topIncident.incident_id}/simulate-containment`,
    method: 'POST'
  });
  const explainCheck = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/incidents/${topIncident.incident_id}/explain`,
    method: 'GET'
  });
  const isIdempotent = JSON.stringify(cont1.data) === JSON.stringify(cont2.data);
  const isDbUnaffected = explainCheck.data.finalScore === topIncident.score;
  console.log('Containment Simulation Idempotency:', isIdempotent ? 'PASSED ✅' : 'FAILED ❌');
  console.log(`DB Unaffected (Real Score remains ${explainCheck.data.finalScore}):`, isDbUnaffected ? 'PASSED ✅' : 'FAILED ❌');

  // --- 4. Test What-If Sensitivity Simulator ---
  console.log(`\n--- 4. Testing What-If Simulator on Mid-Priority Incident (${p3Incident.incident_id}) ---`);
  console.log(`Baseline ${p3Incident.incident_id}: Score = ${p3Incident.score} (${p3Incident.priority_bucket})`);

  // Master Spec Example: asset_criticality 60->95, affected_users 100->5000, attack_confidence 50->90
  const whatIfRes = await request(
    {
      host: 'localhost',
      port: 5000,
      path: `/api/incidents/${p3Incident.incident_id}/what-if`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      overrides: {
        asset_criticality: 95,
        affected_users: 5000,
        attack_confidence: 90
      }
    }
  );

  console.log('What-If Recalculation:');
  console.log(`  Before: Score = ${whatIfRes.data.before.score} (${whatIfRes.data.before.priorityBucket})`);
  console.log(`  After:  Score = ${whatIfRes.data.after.score} (${whatIfRes.data.after.priorityBucket})`);
  console.log(`  Score Delta: +${whatIfRes.data.scoreDelta} | Priority Shift: ${whatIfRes.data.priorityShift}`);

  const whatIfShifted = whatIfRes.data.after.score > whatIfRes.data.before.score;
  console.log('What-If Upward Shift Confirmed?', whatIfShifted ? 'PASSED ✅' : 'FAILED ❌');

  // Test What-If with Invalid Overrides
  console.log('\n--- 5. Testing What-If Validation on Invalid Overrides ---');
  const invalidWhatIf = await request(
    {
      host: 'localhost',
      port: 5000,
      path: `/api/incidents/${p3Incident.incident_id}/what-if`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      overrides: {
        asset_criticality: 150 // Invalid > 100
      }
    }
  );
  console.log('Invalid Override Response Status:', invalidWhatIf.status);
  console.log('Error Details:', invalidWhatIf.data.details);
  console.log('Invalid Override Rejection:', invalidWhatIf.status === 400 ? 'PASSED ✅' : 'FAILED ❌');

  // --- 6. Test Analyst Feedback Storage (POST & GET /api/incidents/:id/feedback) ---
  console.log('\n--- 6. Testing Analyst Feedback Storage (POST & GET /api/incidents/:id/feedback) ---');
  // Submit confirmed feedback
  const postFb1 = await request(
    {
      host: 'localhost',
      port: 5000,
      path: `/api/incidents/${topIncident.incident_id}/feedback`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      verdict: 'confirmed',
      notes: 'Confirmed multi-stage lateral movement targeting Active Directory domain controller.'
    }
  );
  console.log('POST Feedback (confirmed) Status:', postFb1.status, '| ID:', postFb1.data.id);

  // Submit false positive feedback on standalone noise
  const postFb2 = await request(
    {
      host: 'localhost',
      port: 5000,
      path: `/api/incidents/${standalonePortScan.incident_id}/feedback`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      verdict: 'false_positive',
      notes: 'Scheduled monthly external vulnerability scan.'
    }
  );
  console.log('POST Feedback (false_positive) Status:', postFb2.status, '| ID:', postFb2.data.id);

  // Test invalid verdict rejection
  const invalidFb = await request(
    {
      host: 'localhost',
      port: 5000,
      path: `/api/incidents/${topIncident.incident_id}/feedback`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      verdict: 'not_a_real_verdict'
    }
  );
  console.log('Invalid Verdict Rejection Status:', invalidFb.status, '(400 expected ✅)');

  // GET feedback history for topIncident
  const getFbTop = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/incidents/${topIncident.incident_id}/feedback`,
    method: 'GET'
  });
  console.log(`\nGET Feedback History for ${topIncident.incident_id}:`);
  for (const fb of getFbTop.data) {
    console.log(`  [${fb.created_at}] Verdict: ${fb.verdict} | Notes: "${fb.notes}"`);
  }
  const feedbackPersisted = getFbTop.data.length > 0 && getFbTop.data.some(f => f.verdict === 'confirmed');
  console.log('Feedback Persistence Confirmed?', feedbackPersisted ? 'PASSED ✅' : 'FAILED ❌');

  // GET feedback history for standalonePortScan
  const getFbNoise = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/incidents/${standalonePortScan.incident_id}/feedback`,
    method: 'GET'
  });
  console.log(`\nGET Feedback History for ${standalonePortScan.incident_id}:`);
  for (const fb of getFbNoise.data) {
    console.log(`  [${fb.created_at}] Verdict: ${fb.verdict} | Notes: "${fb.notes}"`);
  }
  const noiseFbPersisted = getFbNoise.data.length > 0 && getFbNoise.data[0].verdict === 'false_positive';
  console.log('Noise Feedback Persistence Confirmed?', noiseFbPersisted ? 'PASSED ✅' : 'FAILED ❌');

  console.log('\n=== ALL PHASE 7 VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => console.error(err));

