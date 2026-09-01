/**
 * Mock IOC (Indicators of Compromise) Threat Intelligence Service
 *
 * NOTE / DISCLAIMER:
 * This contains clearly fabricated mock IOC data for demonstration and testing purposes.
 * It does not query external live threat feeds.
 */

const KNOWN_BAD_IOCS = {
  // Known malicious command & control / attack source IPs
  '198.51.100.45': {
    indicator: '198.51.100.45',
    type: 'ip',
    threat_actor: 'APT29 / Cozy Bear',
    category: 'C2_INFRASTRUCTURE',
    confidence: 'HIGH',
    description: 'Known CobaltStrike C2 team server active in targeted financial spearphishing campaigns.'
  },
  '203.0.113.88': {
    indicator: '203.0.113.88',
    type: 'ip',
    threat_actor: 'ALPHV / BlackCat',
    category: 'RANSOMWARE_INGRESS',
    confidence: 'CRITICAL',
    description: 'Known ransomware operator ingress proxy used for corporate VPN credential stuffing.'
  },
  '185.220.101.5': {
    indicator: '185.220.101.5',
    type: 'ip',
    threat_actor: 'Tor Exit / Cloud-Raider',
    category: 'ANONYMIZATION_PROXY',
    confidence: 'HIGH',
    description: 'High-volume Tor exit node associated with unauthorized cloud IAM credential exploitation.'
  },
  '192.0.2.142': {
    indicator: '192.0.2.142',
    type: 'ip',
    threat_actor: 'UNC2452 / Supply-Chain',
    category: 'BUILD_TAMPER',
    confidence: 'HIGH',
    description: 'Compromised runner host communicating with malicious software repository mirror.'
  },
  '198.51.100.99': {
    indicator: '198.51.100.99',
    type: 'ip',
    threat_actor: 'APT29 / Cozy Bear',
    category: 'EXFILTRATION_DROP',
    confidence: 'CRITICAL',
    description: 'Encrypted exfiltration drop receiver for stolen financial documents.'
  }
};

/**
 * Checks an alert against the mock IOC threat intelligence database.
 *
 * @param {Object} alert
 * @param {string} [alert.source_ip]
 * @param {string} [alert.destination_ip]
 * @returns {{ isMatch: boolean, indicator: string|null, metadata: Object|null }}
 */
function checkIOC(alert) {
  if (!alert) {
    return { isMatch: false, indicator: null, metadata: null };
  }

  const src = (alert.source_ip || '').trim();
  const dst = (alert.destination_ip || '').trim();

  // Check source IP
  if (src && KNOWN_BAD_IOCS[src]) {
    const match = KNOWN_BAD_IOCS[src];
    return {
      isMatch: true,
      indicator: match.indicator,
      metadata: match
    };
  }

  // Check destination IP
  if (dst && KNOWN_BAD_IOCS[dst]) {
    const match = KNOWN_BAD_IOCS[dst];
    return {
      isMatch: true,
      indicator: match.indicator,
      metadata: match
    };
  }

  return {
    isMatch: false,
    indicator: null,
    metadata: null
  };
}

module.exports = {
  KNOWN_BAD_IOCS,
  checkIOC
};

