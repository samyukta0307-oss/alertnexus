const http = require('http');

function postRebuild() {
  return new Promise((resolve, reject) => {
    const req = http.request('http://localhost:5000/api/incidents/rebuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ windowMinutes: 30 }));
    req.end();
  });
}

function getRanked() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/incidents/ranked', res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    }).on('error', reject);
  });
}

function getChain(id) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/incidents/' + id + '/chain', res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('=== PHASE 3 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // 1. Test POST /api/incidents/rebuild
  console.log('--- 1. Testing POST /api/incidents/rebuild ---');
  const rebuildRes = await postRebuild();
  console.log('Rebuild Status:', rebuildRes.status);
  console.log('Rebuild Summary:', rebuildRes.data.summary);

  // 2. Test GET /api/incidents/ranked
  console.log('\n--- 2. Testing GET /api/incidents/ranked ---');
  const rankedRes = await getRanked();
  console.log('Ranked Status:', rankedRes.status);
  console.log('Total Incidents Returned:', rankedRes.data.length);

  const top5 = rankedRes.data.slice(0, 5);
  console.log('\nTop 5 Ranked Incidents:');
  for (const inc of top5) {
    console.log(`Rank #${inc.rank} | Incident: ${inc.incident_id} | Score: ${inc.score} (${inc.priority_bucket}) | Alerts: ${inc.alert_count} [${inc.alert_ids.join(', ')}]`);
    console.log(`   Breakdown: MaxAdj=${inc.breakdown.maxStageAdjustedScore}, Stages=${inc.breakdown.distinctStages}, Boost=+${inc.breakdown.correlationBoost}, Momentum=+${inc.breakdown.momentum}, BlastRadius=(Assets:${inc.blast_radius.assets}, Users:${inc.blast_radius.users})`);
  }

  // 3. Verify Attack Chains vs Standalone Alerts
  console.log('\n--- 3. Verifying Attack Chains Grouping & Correlation Boost ---');
  const multiAlertIncidents = rankedRes.data.filter(i => i.alert_count > 1);
  for (const chain of multiAlertIncidents) {
    console.log(`Incident ${chain.incident_id}:`);
    console.log(`  - Alerts (${chain.alert_count}): ${chain.alert_ids.join(' -> ')}`);
    console.log(`  - Blast Radius: ${chain.blast_radius.assets} assets, ${chain.blast_radius.users} users`);
    console.log(`  - Distinct Stages: ${chain.distinct_stages}`);
    console.log(`  - Correlation Boost: +${chain.breakdown.correlationBoost} (Expected: ${Math.min(0.4, 0.08 * chain.distinct_stages).toFixed(2)})`);
    console.log(`  - Final Score: ${chain.score} | Rank: #${chain.rank} | Priority: ${chain.priority_bucket}`);
  }

  // 4. Verify Single Alert Standalone Incidents
  console.log('\n--- 4. Verifying Standalone Noise & Traps ---');
  const trapIncidents = rankedRes.data.filter(i => i.alert_ids.some(id => ['ALT-0021', 'ALT-0022', 'ALT-0023'].includes(id)));
  for (const t of trapIncidents) {
    console.log(`Trap Incident ${t.incident_id} (${t.alert_ids.join(',')}): Score=${t.score}, Rank=#${t.rank}, Priority=${t.priority_bucket}, Alerts=${t.alert_count}`);
  }

  // 5. Test GET /api/incidents/:id/chain for primary attack chain
  const primaryChain = multiAlertIncidents[0];
  console.log(`\n--- 5. Testing GET /api/incidents/${primaryChain.incident_id}/chain ---`);
  const chainRes = await getChain(primaryChain.incident_id);
  console.log('Chain Status:', chainRes.status);
  console.log(`Incident ID: ${chainRes.data.incident_id} | Alert Count: ${chainRes.data.alert_count} | Blast Radius:`, chainRes.data.blast_radius);
  console.log('Timeline Sequence:');
  for (const a of chainRes.data.chain) {
    console.log(`  [${a.timestamp}] ${a.alert_id} | Type: ${a.alert_type} | Stage: ${a.attack_stage} | Asset: ${a.asset} | IP: ${a.source_ip} | User: ${a.user_account}`);
  }

  // 6. Verify Chronological Order
  let ordered = true;
  for (let i = 1; i < chainRes.data.chain.length; i++) {
    if (new Date(chainRes.data.chain[i].timestamp) < new Date(chainRes.data.chain[i-1].timestamp)) {
      ordered = false;
    }
  }
  console.log('Chronological Order Valid?', ordered ? 'PASSED ✅' : 'FAILED ❌');
}

runVerification().catch(err => console.error(err));

