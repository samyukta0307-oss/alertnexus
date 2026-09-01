/**
 * MITRE ATT&CK Technique Mapping Service
 *
 * NOTE / DISCLAIMER:
 * This is a static reference mapping designed for demo realism and threat modeling context.
 * It maps alert_type and attack_stage combinations to standard MITRE ATT&CK technique IDs.
 * It is not an ML-derived or officially certified classifier.
 */

const MITRE_TECHNIQUES = {
  // Specific composite combinations (alert_type + attack_stage)
  'port_scan:reconnaissance': { id: 'T1046', name: 'Network Service Scanning' },
  'brute_force:reconnaissance': { id: 'T1110', name: 'Brute Force' },
  'brute_force:initial_access': { id: 'T1110', name: 'Brute Force' },
  'failed_login:initial_access': { id: 'T1078', name: 'Valid Accounts' },
  'suspicious_email:initial_access': { id: 'T1566', name: 'Phishing' },
  'malware_detection:initial_access': { id: 'T1204', name: 'User Execution' },
  'privilege_escalation:privilege_escalation': { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  'suspicious_process:privilege_escalation': { id: 'T1055', name: 'Process Injection' },
  'suspicious_process:persistence': { id: 'T1543', name: 'Create or Modify System Process' },
  'suspicious_process:reconnaissance': { id: 'T1087', name: 'Account Discovery' },
  'lateral_movement:lateral_movement': { id: 'T1021', name: 'Remote Services' },
  'data_exfiltration:exfiltration': { id: 'T1041', name: 'Exfiltration Over C2 Channel' },

  // Generic alert_type fallbacks
  'port_scan': { id: 'T1046', name: 'Network Service Scanning' },
  'brute_force': { id: 'T1110', name: 'Brute Force' },
  'failed_login': { id: 'T1078', name: 'Valid Accounts' },
  'suspicious_email': { id: 'T1566', name: 'Phishing' },
  'malware_detection': { id: 'T1204', name: 'User Execution' },
  'privilege_escalation': { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  'lateral_movement': { id: 'T1021', name: 'Remote Services' },
  'suspicious_process': { id: 'T1059', name: 'Command and Scripting Interpreter' },
  'data_exfiltration': { id: 'T1041', name: 'Exfiltration Over C2 Channel' },

  // Stage-based fallbacks
  'stage:reconnaissance': { id: 'T1595', name: 'Active Scanning' },
  'stage:initial_access': { id: 'T1190', name: 'Exploit Public-Facing Application' },
  'stage:privilege_escalation': { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  'stage:lateral_movement': { id: 'T1021', name: 'Remote Services' },
  'stage:persistence': { id: 'T1547', name: 'Boot or Logon Autostart Execution' },
  'stage:exfiltration': { id: 'T1048', name: 'Exfiltration Over Alternative Protocol' }
};

/**
 * Maps an alert's type and stage to a MITRE ATT&CK technique.
 *
 * @param {Object} alert
 * @param {string} alert.alert_type
 * @param {string} alert.attack_stage
 * @returns {string|null} MITRE Technique ID (e.g. "T1078") or null if unmapped
 */
function mapMitreTechnique(alert) {
  if (!alert) return null;

  // If alert already has an explicit valid MITRE technique, preserve it
  if (alert.mitre_technique && alert.mitre_technique.trim() !== '') {
    return alert.mitre_technique.trim();
  }

  const type = (alert.alert_type || '').trim().toLowerCase();
  const stage = (alert.attack_stage || '').trim().toLowerCase();

  // 1. Try exact (type:stage) composite match
  const compositeKey = `${type}:${stage}`;
  if (MITRE_TECHNIQUES[compositeKey]) {
    return MITRE_TECHNIQUES[compositeKey].id;
  }

  // 2. Try type match
  if (MITRE_TECHNIQUES[type]) {
    return MITRE_TECHNIQUES[type].id;
  }

  // 3. Try stage match
  const stageKey = `stage:${stage}`;
  if (MITRE_TECHNIQUES[stageKey]) {
    return MITRE_TECHNIQUES[stageKey].id;
  }

  return null;
}

module.exports = {
  MITRE_TECHNIQUES,
  mapMitreTechnique
};

