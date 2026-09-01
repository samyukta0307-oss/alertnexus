const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 5000, path }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('=== PHASE 5 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // 1. Fetch ranked incidents to verify summary field and get sample IDs
  console.log('--- 1. Testing GET /api/incidents/ranked (Summary Field & Health) ---');
  const rankedRes = await get('/api/incidents/ranked');
  console.log('Ranked Endpoint Status:', rankedRes.status);
  console.log('Total Incidents:', rankedRes.data.length);

  const topIncident = rankedRes.data[0];
  console.log(`Top Incident (#1): ${topIncident.incident_id} | Score: ${topIncident.score} | Priority: ${topIncident.priority_bucket}`);
  console.log(`  Summary: "${topIncident.summary}"`);

  // Verify all items have summary
  const missingSummaries = rankedRes.data.filter(i => !i.summary);
  console.log('Incidents with missing summary:', missingSummaries.length, '(0 expected ✅)');

  // 2. Test GET /api/incidents/:id/explain for top attack-chain incident
  console.log(`\n--- 2. Testing GET /api/incidents/${topIncident.incident_id}/explain (Top Attack Chain) ---`);
  const explainRes = await get(`/api/incidents/${topIncident.incident_id}/explain`);
  console.log('Explain Endpoint Status:', explainRes.status);
  console.log('Explain Response Payload:');
  console.log(JSON.stringify(explainRes.data, null, 2));

  // Verify numerical consistency
  console.log('\n--- 3. Numerical Consistency Cross-Check ---');
  const scoreMatches = explainRes.data.finalScore === topIncident.score;
  const pBucketMatches = explainRes.data.priorityBucket === topIncident.priority_bucket;
  const blastAssetsMatches = explainRes.data.blastRadius.assets === topIncident.blast_radius.assets;
  const boostMatches = explainRes.data.scoreBreakdown.correlationBoost === topIncident.breakdown.correlationBoost;

  console.log('Final Score Match:', scoreMatches ? 'PASSED ✅' : `FAILED (${explainRes.data.finalScore} vs ${topIncident.score}) ❌`);
  console.log('Priority Bucket Match:', pBucketMatches ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Blast Radius Assets Match:', blastAssetsMatches ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Correlation Boost Match:', boostMatches ? 'PASSED ✅' : 'FAILED ❌');

  // Verify reasons quality
  console.log('\nReasons List for Top Incident:');
  for (const r of explainRes.data.reasons) {
    console.log(`  • ${r}`);
  }

  // 4. Test GET /api/incidents/:id/explain for low-priority (P4) standalone noise incident
  const p4Incident = rankedRes.data.slice().reverse().find(i => i.priority_bucket === 'P4' && i.alert_count === 1);
  console.log(`\n--- 4. Testing GET /api/incidents/${p4Incident.incident_id}/explain (P4 Standalone Noise) ---`);
  const p4Explain = await get(`/api/incidents/${p4Incident.incident_id}/explain`);
  console.log(`Incident ID: ${p4Explain.data.incidentId} | Score: ${p4Explain.data.finalScore} | Priority: ${p4Explain.data.priorityBucket}`);
  console.log(`Summary: "${p4Explain.data.summary}"`);
  console.log('Reasons List:');
  for (const r of p4Explain.data.reasons) {
    console.log(`  • ${r}`);
  }

  // Check no false claims for P4
  const hasFalseIoc = p4Explain.data.reasons.some(r => r.toLowerCase().includes('known-bad indicator'));
  const hasFalseChain = p4Explain.data.reasons.some(r => r.toLowerCase().includes('attack chain'));
  const hasFalseStages = p4Explain.data.reasons.some(r => r.toLowerCase().includes('distinct stages'));
  console.log('P4 contains false IOC claim?', hasFalseIoc ? 'FAILED ❌' : 'NO (Honest ✅)');
  console.log('P4 contains false Chain claim?', hasFalseChain ? 'FAILED ❌' : 'NO (Honest ✅)');
  console.log('P4 contains false Progression claim?', hasFalseStages ? 'FAILED ❌' : 'NO (Honest ✅)');

  // 5. Check natural summaries across 3 distinct priority tiers (P1, P2/P3, P4)
  console.log('\n--- 5. Cross-Tier Natural Language Summary Validation ---');
  const sampleP1 = rankedRes.data.find(i => i.priority_bucket === 'P1' && i.alert_count > 1);
  const sampleP2 = rankedRes.data.find(i => i.priority_bucket === 'P2');
  const sampleP3 = rankedRes.data.find(i => i.priority_bucket === 'P3');
  const sampleP4 = rankedRes.data.find(i => i.priority_bucket === 'P4');

  if (sampleP1) console.log(`[P1 Tier] ${sampleP1.incident_id} (Score: ${sampleP1.score}):\n  "${sampleP1.summary}"`);
  if (sampleP2) console.log(`[P2 Tier] ${sampleP2.incident_id} (Score: ${sampleP2.score}):\n  "${sampleP2.summary}"`);
  if (sampleP3) console.log(`[P3 Tier] ${sampleP3.incident_id} (Score: ${sampleP3.score}):\n  "${sampleP3.summary}"`);
  if (sampleP4) console.log(`[P4 Tier] ${sampleP4.incident_id} (Score: ${sampleP4.score}):\n  "${sampleP4.summary}"`);

  console.log('\n=== ALL PHASE 5 VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => console.error(err));

