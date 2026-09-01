/**
 * MITRE ATT&CK Technique Mapping & Plain-Language Resolver
 *
 * Provides human-readable technique names and plain-English explanations
 * alongside standard MITRE IDs across the entire frontend.
 */

export const MITRE_DICTIONARY = {
  T1046: {
    id: 'T1046',
    name: 'Network Service Scanning',
    plainName: 'Network Scanning',
    description: 'Scanning internal networks to discover open ports, vulnerable listeners, and active hosts.'
  },
  T1110: {
    id: 'T1110',
    name: 'Brute Force',
    plainName: 'Password Guessing Attack',
    description: 'Systematically guessing passwords or cryptographic keys to gain unauthorized access.'
  },
  T1078: {
    id: 'T1078',
    name: 'Valid Accounts',
    plainName: 'Compromised Account Usage',
    description: 'Using stolen or compromised legitimate credentials to blend in with normal user activity.'
  },
  T1566: {
    id: 'T1566',
    name: 'Phishing',
    plainName: 'Phishing Email Attack',
    description: 'Deceptive emails sent to trick employees into running malicious payloads or revealing passwords.'
  },
  T1204: {
    id: 'T1204',
    name: 'User Execution',
    plainName: 'Malicious File Execution',
    description: 'Adversaries relying on human actions (like opening an attachment or clicking a link) to run code.'
  },
  T1068: {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    plainName: 'Privilege Escalation Exploit',
    description: 'Exploiting software flaws to gain elevated root or administrator permissions on the system.'
  },
  T1055: {
    id: 'T1055',
    name: 'Process Injection',
    plainName: 'Hidden Memory Injection',
    description: 'Injecting malicious code into benign system processes to hide from security scanners.'
  },
  T1543: {
    id: 'T1543',
    name: 'Create or Modify System Process',
    plainName: 'Persistence Service Modification',
    description: 'Configuring rogue system services or daemons to ensure malware survives computer reboots.'
  },
  T1087: {
    id: 'T1087',
    name: 'Account Discovery',
    plainName: 'User Account Reconnaissance',
    description: 'Listing active user accounts and permission groups to map out potential high-value targets.'
  },
  T1021: {
    id: 'T1021',
    name: 'Remote Services',
    plainName: 'Lateral Network Pivoting',
    description: 'Using remote desktop, SSH, or admin shares to jump from one machine to another across the network.'
  },
  T1041: {
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    plainName: 'Data Theft via Command Channel',
    description: 'Stealing sensitive database records or files by sending them out through an attacker-controlled connection.'
  },
  T1048: {
    id: 'T1048',
    name: 'Exfiltration Over Alternative Protocol',
    plainName: 'Covert Data Theft',
    description: 'Stealing corporate data over stealthy channels (like encrypted DNS or custom ports) to bypass firewalls.'
  },
  T1059: {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    plainName: 'Script / Shell Execution',
    description: 'Abusing command-line interpreters (PowerShell, bash, cmd) to execute malicious commands.'
  },
  T1595: {
    id: 'T1595',
    name: 'Active Scanning',
    plainName: 'External Attack Surface Scan',
    description: 'Probing internet-facing corporate IP addresses to discover vulnerabilities before breaching.'
  },
  T1190: {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    plainName: 'Public Web Application Exploit',
    description: 'Taking advantage of bugs in internet-facing web servers or APIs to gain an initial foothold.'
  },
  T1547: {
    id: 'T1547',
    name: 'Boot or Logon Autostart Execution',
    plainName: 'Startup Persistence Hook',
    description: 'Modifying operating system startup folders or registry keys to automatically execute when logging in.'
  }
};

/**
 * Returns the human-readable plain name for a MITRE technique code.
 * @param {string} code e.g. "T1046"
 * @returns {string} e.g. "Network Scanning"
 */
export function getMitreName(code) {
  if (!code) return '';
  const cleanCode = code.trim().toUpperCase();
  return MITRE_DICTIONARY[cleanCode]?.plainName || MITRE_DICTIONARY[cleanCode]?.name || 'Security Technique';
}

/**
 * Formats a MITRE technique as both code and name, e.g. "T1046 — Network Scanning"
 * @param {string} code e.g. "T1046"
 * @returns {string} e.g. "T1046 — Network Scanning"
 */
export function formatMitreTechnique(code) {
  if (!code) return '';
  const cleanCode = code.trim().toUpperCase();
  const name = getMitreName(cleanCode);
  return `${cleanCode} — ${name}`;
}

/**
 * Returns a 1-sentence plain-English explanation of the MITRE technique.
 * @param {string} code
 * @returns {string}
 */
export function getMitreDescription(code) {
  if (!code) return 'Standardized cybersecurity attack technique identifier.';
  const cleanCode = code.trim().toUpperCase();
  return MITRE_DICTIONARY[cleanCode]?.description || `Standardized MITRE ATT&CK technique ${cleanCode}.`;
}

