/**
 * Incident Response Playbook Service
 * Maps incident attack characteristics to curated, actionable mitigation procedures.
 */

const PLAYBOOK_RULES = [
  // 1. Data Exfiltration
  {
    key: 'data_exfiltration:exfiltration',
    name: 'Critical Data Exfiltration Containment',
    match: (type, stage) => type === 'data_exfiltration' || stage === 'exfiltration',
    severityLevel: 'CRITICAL',
    actions: [
      'Isolate endpoint from the internal network immediately to halt active data stream',
      'Disable compromised user account credentials and revoke active OAuth/session tokens',
      'Block destination IP and C2 domain across all perimeter firewalls and egress proxies',
      'Capture forensic memory snapshot and disk image for legal chain-of-custody evidence',
      'Notify Data Protection Officer (DPO) and affected business data owners for impact review'
    ]
  },

  // 2. Lateral Movement
  {
    key: 'lateral_movement:lateral_movement',
    name: 'Internal Lateral Movement Quarantine',
    match: (type, stage) => type === 'lateral_movement' || stage === 'lateral_movement',
    severityLevel: 'HIGH',
    actions: [
      'Segment and isolate affected network VLAN / subnets to contain lateral spread',
      'Force immediate password reset and session invalidation for involved user accounts',
      'Audit internal SMB (port 445), WinRM (5985/5986), and SSH (22) traffic logs between hosts',
      'Review and tighten firewall microsegmentation rules between workstations and core servers'
    ]
  },

  // 3. Privilege Escalation
  {
    key: 'privilege_escalation:privilege_escalation',
    name: 'Privilege Escalation & Identity Remediation',
    match: (type, stage) => type === 'privilege_escalation' || stage === 'privilege_escalation',
    severityLevel: 'HIGH',
    actions: [
      'Revoke recently granted elevated role, group memberships, and sudo/admin privileges',
      'Audit Active Directory / IAM logs for unauthorized permission changes in the last 24 hours',
      'Isolate the compromised host pending credential sweep and rootkit inspection',
      'Inspect scheduled tasks, cron jobs, and background daemon services for persistence hooks'
    ]
  },

  // 4. Malware Detection
  {
    key: 'malware_detection:any',
    name: 'Malware Isolation & EDR Eradication',
    match: (type) => type === 'malware_detection',
    severityLevel: 'HIGH',
    actions: [
      'Quarantine detected malicious file payload and terminate associated process hierarchy',
      'Isolate infected endpoint from the corporate network via EDR agent',
      'Execute full fleet EDR scan to identify any secondary dormant payloads',
      'Search enterprise SIEM for identical IOC file hashes and parent process execution patterns'
    ]
  },

  // 5. Brute Force & Credential Attacks
  {
    key: 'brute_force:initial_access',
    name: 'Brute Force & Credential Stuffing Defense',
    match: (type, stage) => (type === 'brute_force' || type === 'failed_login') && (stage === 'initial_access' || stage === 'reconnaissance'),
    severityLevel: 'MEDIUM',
    actions: [
      'Block attacking source IP at perimeter edge firewalls / cloud WAF',
      'Enforce mandatory step-up MFA challenge on targeted user account',
      'Trigger automated credential reset if repeated authentication failures were followed by success',
      'Monitor authentication telemetry for distributed retry attempts from related IP subnets'
    ]
  },

  // 6. Phishing & Suspicious Email
  {
    key: 'suspicious_email:initial_access',
    name: 'Email Security & Phishing Neutralization',
    match: (type) => type === 'suspicious_email',
    severityLevel: 'MEDIUM',
    actions: [
      'Purge and quarantine suspicious email message across all Microsoft 365 / Google Workspace mailboxes',
      'Block sender email address, envelope domain, and originating mail server IP',
      'Send automated advisory notification to affected recipients warning against link interaction',
      'Inspect proxy and web gateway logs for user clicks or credential entry on phishing landing pages'
    ]
  },

  // 7. Network Scanning & Port Probing (Calm / Low-Urgency)
  {
    key: 'port_scan:reconnaissance',
    name: 'Reconnaissance Monitoring & Perimeter Watch',
    match: (type) => type === 'port_scan',
    severityLevel: 'LOW',
    actions: [
      'No urgent containment required — low-impact external port reconnaissance detected',
      'Log source IP address and add to automated SOC 24-hour monitoring watchlist',
      'Monitor perimeter firewalls for follow-up exploitation or service targeting attempts',
      'Verify external-facing attack surface configurations and ensure unused ports remain closed'
    ]
  }
];

const DEFAULT_PLAYBOOK = {
  key: 'generic:investigation',
  name: 'Standard Tier-1 Triage & Investigation',
  severityLevel: 'MEDIUM',
  actions: [
    'Investigate affected asset and verify recent administrative configuration changes',
    'Review related alerts in the correlation cluster across the surrounding 60-minute window',
    'Verify if the activity corresponds to scheduled IT maintenance or legitimate administrative tools',
    'Escalate incident ticket to Tier-2 SOC security engineer if anomalous activity persists'
  ]
};

/**
 * Looks up the appropriate response playbook for an incident based on its dominant alert.
 *
 * @param {string} alertType - e.g. 'data_exfiltration', 'brute_force', 'port_scan'
 * @param {string} attackStage - e.g. 'exfiltration', 'lateral_movement', 'reconnaissance'
 * @returns {Object} { ruleKey, playbookName, severityLevel, actions }
 */
function getPlaybook(alertType = '', attackStage = '') {
  const normType = (alertType || '').trim().toLowerCase();
  const normStage = (attackStage || '').trim().toLowerCase();

  for (const rule of PLAYBOOK_RULES) {
    if (rule.match(normType, normStage)) {
      return {
        ruleKey: rule.key,
        playbookName: rule.name,
        severityLevel: rule.severityLevel,
        actions: rule.actions
      };
    }
  }

  return {
    ruleKey: DEFAULT_PLAYBOOK.key,
    playbookName: DEFAULT_PLAYBOOK.name,
    severityLevel: DEFAULT_PLAYBOOK.severityLevel,
    actions: DEFAULT_PLAYBOOK.actions
  };
}

module.exports = {
  PLAYBOOK_RULES,
  DEFAULT_PLAYBOOK,
  getPlaybook
};

