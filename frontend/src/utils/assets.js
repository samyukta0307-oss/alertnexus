/**
 * Asset Plain-Language Subtitle & Type Mapping
 *
 * Converts technical hostnames into immediate plain-language context
 * (e.g. PROD-DB-CUSTOMER-01 -> "Customer production database").
 */

export const ASSET_TRANSLATIONS = {
  'PROD-DB-CUSTOMER-01': 'Customer production database',
  'FIN-SERVER-03': 'Finance & payroll server',
  'DC-01': 'Primary Domain Controller',
  'VPN-GW-01': 'Corporate VPN Gateway',
  'AWS-S3-GATEWAY-01': 'Cloud storage & backup gateway',
  'PROD-API-CLUSTER-01': 'Production customer API cluster',
  'MAIL-GATEWAY-02': 'Inbound corporate mail gateway',
  'WKS-EXEC-002': 'Executive laptop (C-Suite)',
  'WKS-ENG-042': 'Engineering developer workstation',
  'DEV-BUILD-02': 'Internal CI/CD build worker',
  'AUTH-SRV-01': 'Single Sign-On Auth Server',
  'PAYMENT-GW-01': 'Card payment processing gateway'
};

/**
 * Returns a human-readable asset description or subtitle.
 * @param {string} asset
 * @returns {string}
 */
export function getAssetPlainSubtitle(asset) {
  if (!asset) return 'Enterprise asset';
  const clean = asset.trim();
  if (ASSET_TRANSLATIONS[clean]) {
    return ASSET_TRANSLATIONS[clean];
  }

  // Smart heuristic fallback for unknown hostnames
  const upper = clean.toUpperCase();
  if (upper.includes('DB')) return 'Database server';
  if (upper.includes('DC') || upper.includes('DOMAIN')) return 'Domain infrastructure';
  if (upper.includes('VPN') || upper.includes('GW') || upper.includes('GATEWAY')) return 'Network edge gateway';
  if (upper.includes('API')) return 'Core application API';
  if (upper.includes('WKS') || upper.includes('LAPTOP')) return 'Employee workstation';
  if (upper.includes('DEV') || upper.includes('BUILD')) return 'Development build server';
  if (upper.includes('MAIL')) return 'Mail exchange server';
  if (upper.includes('FIN')) return 'Financial systems server';
  if (upper.includes('PROD')) return 'Production server';

  return 'Internal enterprise host';
}

