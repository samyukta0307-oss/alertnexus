/**
 * Simulate Live Alert Arrival Script
 * Simulates incoming real-time security telemetry arriving into the ingestion pipeline.
 * POSTs new alerts to the live backend and automatically rebuilds the correlation graph.
 */

const http = require('http');

function postAlert(alertData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(alertData);
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: '/api/alerts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function rebuildIncidents() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: '/api/incidents/rebuild',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify({ windowMinutes: 30 }));
    req.end();
  });
}

async function simulateLiveAlerts() {
  console.log('=== SIMULATING LIVE INGESTION OF NEW SECURITY TELEMETRY ===\n');

  const liveAlerts = [
    {
      alert_type: 'lateral_movement',
      severity: 88,
      asset: 'PROD-DB-CUSTOMER-01',
      asset_criticality: 95,
      data_sensitivity: 98,
      attack_confidence: 92,
      affected_users: 1,
      business_impact: 95,
      source_ip: '198.51.100.45',
      destination_ip: '10.0.3.5',
      user_account: 'svc_finance',
      attack_stage: 'lateral_movement',
      mitre_technique: 'T1021',
      ioc_match: true,
      ioc_indicator: '198.51.100.45',
      status: 'new'
    },
    {
      alert_type: 'data_exfiltration',
      severity: 96,
      asset: 'PROD-DB-CUSTOMER-01',
      asset_criticality: 95,
      data_sensitivity: 98,
      attack_confidence: 96,
      affected_users: 5000,
      business_impact: 99,
      source_ip: '198.51.100.45',
      destination_ip: '198.51.100.99',
      user_account: 'svc_finance',
      attack_stage: 'exfiltration',
      mitre_technique: 'T1041',
      ioc_match: true,
      ioc_indicator: '198.51.100.99',
      status: 'new'
    }
  ];

  for (let i = 0; i < liveAlerts.length; i++) {
    const alert = liveAlerts[i];
    console.log(`[Alert ${i + 1}/${liveAlerts.length}] Ingesting ${alert.alert_type} on ${alert.asset} (Stage: ${alert.attack_stage})...`);
    const res = await postAlert(alert);
    console.log(`  -> Ingested with ID: ${res.data?.alert_id || res.data?.id} (HTTP ${res.status})`);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nTriggering dynamic incident graph correlation...');
  const rebuild = await rebuildIncidents();
  console.log(`Graph correlation updated: ${rebuild.data?.summary?.totalIncidents} active incident clusters formed.`);
  console.log('Live alert simulation complete. Open or refresh Dashboard to view updated queue.');
}

if (require.main === module) {
  simulateLiveAlerts().catch(err => console.error(err));
}

module.exports = { simulateLiveAlerts };

