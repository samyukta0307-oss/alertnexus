const pool = require('../db/pool');
const { mapMitreTechnique } = require('./mitreMapping');
const { checkIOC } = require('./iocEnrichment');

/**
 * Iterates all alerts in the database, applies MITRE technique mapping and IOC matching,
 * and updates each alert record in MySQL.
 *
 * @returns {Promise<Object>} Summary of enrichment results
 */
async function enrichAllAlerts() {
  console.log('--- Starting Alert Enrichment Job (MITRE + Mock IOC) ---');

  const [alerts] = await pool.query(`
    SELECT id, alert_id, alert_type, attack_stage, source_ip, destination_ip, mitre_technique, ioc_match, ioc_indicator
    FROM alerts;
  `);

  console.log(`Enriching ${alerts.length} alerts...`);

  let mitreEnrichedCount = 0;
  let iocMatchedCount = 0;

  const updateSql = `
    UPDATE alerts
    SET
      mitre_technique = ?,
      ioc_match = ?,
      ioc_indicator = ?
    WHERE id = ?;
  `;

  for (const alert of alerts) {
    // 1. Determine MITRE technique
    const mitreTech = mapMitreTechnique(alert);
    if (mitreTech) {
      mitreEnrichedCount++;
    }

    // 2. Check for IOC matches
    const iocResult = checkIOC(alert);
    if (iocResult.isMatch) {
      iocMatchedCount++;
    }

    await pool.query(updateSql, [
      mitreTech,
      iocResult.isMatch ? 1 : 0,
      iocResult.indicator,
      alert.id
    ]);
  }

  const summary = {
    totalAlerts: alerts.length,
    mitreEnrichedCount,
    iocMatchedCount
  };

  console.log('Enrichment Complete. Summary:', summary);
  return summary;
}

if (require.main === module) {
  enrichAllAlerts()
    .then(summary => {
      console.log('Alert enrichment completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Alert enrichment failed:', err);
      process.exit(1);
    });
}

module.exports = { enrichAllAlerts };

