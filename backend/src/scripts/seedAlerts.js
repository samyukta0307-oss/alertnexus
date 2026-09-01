const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { mapMitreTechnique } = require('../services/mitreMapping');
const { checkIOC } = require('../services/iocEnrichment');
const { enrichAllAlerts } = require('../services/enrichAlerts');
const { rebuildIncidents } = require('../services/rebuildIncidents');

// Asset pool with diverse criticality and sensitivity profiles
const ASSETS = [
  { name: 'PROD-DB-CUSTOMER-01', criticality: 95, sensitivity: 98, type: 'database', desc: 'Production customer relational database - contains PII/Financials' },
  { name: 'FIN-SERVER-03', criticality: 90, sensitivity: 92, type: 'finance', desc: 'Core financial ledger and payroll processing server' },
  { name: 'DC-01', criticality: 98, sensitivity: 88, type: 'domain_controller', desc: 'Primary Active Directory Domain Controller - Kerberos/LDAP' },
  { name: 'MAIL-GATEWAY-02', criticality: 70, sensitivity: 65, type: 'mail_gateway', desc: 'Inbound/outbound SMTP mail exchange gateway' },
  { name: 'HR-PORTAL-01', criticality: 65, sensitivity: 85, type: 'web_app', desc: 'Internal HR management system and employee directory' },
  { name: 'AWS-S3-GATEWAY-01', criticality: 88, sensitivity: 90, type: 'cloud_storage', desc: 'Cloud object storage gateway and data pipeline connector' },
  { name: 'PROD-API-CLUSTER-01', criticality: 92, sensitivity: 75, type: 'api_server', desc: 'Public facing API gateway and microservices cluster' },
  { name: 'VPN-GW-01', criticality: 80, sensitivity: 60, type: 'network_gateway', desc: 'Remote access enterprise VPN gateway' },
  { name: 'DEV-BUILD-02', criticality: 45, sensitivity: 30, type: 'build_server', desc: 'GitLab CI/CD automated build runner' },
  { name: 'WKS-INTERN-014', criticality: 15, sensitivity: 10, type: 'workstation', desc: 'Intern temporary development workstation' },
  { name: 'WKS-EXEC-002', criticality: 75, sensitivity: 80, type: 'workstation', desc: 'Executive laptop - Chief Financial Officer' },
  { name: 'WKS-ENG-042', criticality: 40, sensitivity: 35, type: 'workstation', desc: 'Core backend engineering workstation' },
  { name: 'DEV-SANDBOX-09', criticality: 10, sensitivity: 5, type: 'sandbox', desc: 'Isolated development test sandbox' },
  { name: 'TEST-STAGING-04', criticality: 20, sensitivity: 15, type: 'staging', desc: 'Pre-production staging verification environment' },
  { name: 'KIOSK-LOBBY-01', criticality: 10, sensitivity: 5, type: 'kiosk', desc: 'Building lobby visitor check-in tablet' },
  { name: 'WKS-QA-001', criticality: 40, sensitivity: 35, type: 'workstation', desc: 'QA testing desktop workstation 01' },
  { name: 'WKS-QA-002', criticality: 40, sensitivity: 35, type: 'workstation', desc: 'QA testing desktop workstation 02' }
];

const NOISE_ASSETS = [
  { name: 'DEV-SRV-ALPHA-01', criticality: 30, sensitivity: 20, type: 'build_server', desc: 'Development alpha testing node 01' },
  { name: 'DEV-SRV-BETA-02', criticality: 35, sensitivity: 25, type: 'build_server', desc: 'Development beta testing node 02' },
  { name: 'TEST-NODE-01', criticality: 20, sensitivity: 15, type: 'staging', desc: 'Integration test compute node 01' },
  { name: 'TEST-NODE-02', criticality: 25, sensitivity: 15, type: 'staging', desc: 'Integration test compute node 02' },
  { name: 'WKS-TEMP-101', criticality: 15, sensitivity: 10, type: 'workstation', desc: 'Temporary contractor workstation 101' },
  { name: 'WKS-TEMP-102', criticality: 15, sensitivity: 10, type: 'workstation', desc: 'Temporary contractor workstation 102' },
  { name: 'PRINTER-FLOOR-2', criticality: 10, sensitivity: 5, type: 'workstation', desc: 'Shared floor 2 network multifunction printer' },
  { name: 'BACKUP-NODE-04', criticality: 40, sensitivity: 30, type: 'file_server', desc: 'Secondary snapshot storage backup node' },
  { name: 'LOG-FORWARDER-01', criticality: 35, sensitivity: 20, type: 'file_server', desc: 'Syslog ingestion and forwarder node' },
  { name: 'MONITOR-AGENT-09', criticality: 25, sensitivity: 15, type: 'workstation', desc: 'Network monitoring SNMP telemetry agent' }
];

function formatUTC(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function generateSeedData() {
  const alerts = [];
  let alertCounter = 1;
  const baseTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  function nextAlertId() {
    const idStr = String(alertCounter++).padStart(4, '0');
    return `ALT-${idStr}`;
  }

  // --- ATTACK CHAINS (4 chains, 5 alerts each = 20 alerts: ALT-0001 to ALT-0020) ---
  const chainSummaries = [];

  // Chain 1: Targeted Spearphishing & Financial Data Exfiltration (IOC: 198.51.100.45 / 198.51.100.99)
  {
    const chainId = 'Chain 1 (Financial Exfiltration)';
    const user = 'svc_finance';
    const sourceIp = '198.51.100.45'; // MOCK IOC MATCH
    const chainAlertIds = [];
    const chainStartTime = new Date(baseTime.getTime() + 1 * 60 * 60 * 1000);

    const steps = [
      { type: 'port_scan', stage: 'reconnaissance', asset: 'MAIL-GATEWAY-02', crit: 70, sens: 65, sev: 45, conf: 75, impact: 30, users: 1, mitre: 'T1046', delayMin: 0 },
      { type: 'suspicious_email', stage: 'initial_access', asset: 'WKS-EXEC-002', crit: 75, sens: 80, sev: 70, conf: 85, impact: 60, users: 2, mitre: 'T1566', delayMin: 8 },
      { type: 'privilege_escalation', stage: 'privilege_escalation', asset: 'DC-01', crit: 98, sens: 88, sev: 85, conf: 90, impact: 85, users: 5, mitre: 'T1068', delayMin: 15 },
      { type: 'lateral_movement', stage: 'lateral_movement', asset: 'FIN-SERVER-03', crit: 90, sens: 92, sev: 88, conf: 92, impact: 90, users: 10, mitre: 'T1021', delayMin: 22 },
      { type: 'data_exfiltration', stage: 'exfiltration', asset: 'FIN-SERVER-03', crit: 90, sens: 92, sev: 95, conf: 98, impact: 95, users: 150, mitre: 'T1048', delayMin: 28 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const alertId = nextAlertId();
      chainAlertIds.push(alertId);
      const timestamp = new Date(chainStartTime.getTime() + s.delayMin * 60 * 1000);
      const related = chainAlertIds.slice(0, i);

      const rawAlert = {
        alert_type: s.type,
        attack_stage: s.stage,
        source_ip: sourceIp,
        destination_ip: '198.51.100.99'
      };
      const iocRes = checkIOC(rawAlert);

      alerts.push({
        id: uuidv4(),
        alert_id: alertId,
        timestamp: formatUTC(timestamp),
        alert_type: s.type,
        severity: s.sev,
        asset: s.asset,
        asset_criticality: s.crit,
        data_sensitivity: s.sens,
        attack_confidence: s.conf,
        affected_users: s.users,
        business_impact: s.impact,
        source_ip: sourceIp,
        destination_ip: '198.51.100.99',
        user_account: user,
        attack_stage: s.stage,
        mitre_technique: s.mitre || mapMitreTechnique(rawAlert),
        ioc_match: iocRes.isMatch,
        ioc_indicator: iocRes.indicator,
        related_alert_ids: related.length > 0 ? related : null,
        status: 'new',
        created_at: formatUTC(timestamp)
      });
    }
    chainSummaries.push({ name: chainId, user, sourceIp, alertIds: chainAlertIds, ioc: true });
  }

  // Chain 2: VPN Credential Abuse & Customer DB Breach (IOC: 203.0.113.88)
  {
    const chainId = 'Chain 2 (Customer DB Intrusion)';
    const user = 'j.smith';
    const sourceIp = '203.0.113.88'; // MOCK IOC MATCH
    const chainAlertIds = [];
    const chainStartTime = new Date(baseTime.getTime() + 4 * 60 * 60 * 1000);

    const steps = [
      { type: 'brute_force', stage: 'reconnaissance', asset: 'VPN-GW-01', crit: 80, sens: 60, sev: 55, conf: 80, impact: 40, users: 1, mitre: 'T1110', delayMin: 0 },
      { type: 'failed_login', stage: 'initial_access', asset: 'WKS-ENG-042', crit: 40, sens: 35, sev: 60, conf: 75, impact: 45, users: 1, mitre: 'T1078', delayMin: 5 },
      { type: 'privilege_escalation', stage: 'privilege_escalation', asset: 'DEV-BUILD-02', crit: 45, sens: 30, sev: 75, conf: 85, impact: 65, users: 3, mitre: 'T1055', delayMin: 12 },
      { type: 'lateral_movement', stage: 'lateral_movement', asset: 'PROD-API-CLUSTER-01', crit: 92, sens: 75, sev: 85, conf: 90, impact: 85, users: 20, mitre: 'T1021', delayMin: 18 },
      { type: 'data_exfiltration', stage: 'exfiltration', asset: 'PROD-DB-CUSTOMER-01', crit: 95, sens: 98, sev: 98, conf: 96, impact: 98, users: 12000, mitre: 'T1041', delayMin: 25 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const alertId = nextAlertId();
      chainAlertIds.push(alertId);
      const timestamp = new Date(chainStartTime.getTime() + s.delayMin * 60 * 1000);
      const related = chainAlertIds.slice(0, i);

      const rawAlert = {
        alert_type: s.type,
        attack_stage: s.stage,
        source_ip: sourceIp,
        destination_ip: '203.0.113.200'
      };
      const iocRes = checkIOC(rawAlert);

      alerts.push({
        id: uuidv4(),
        alert_id: alertId,
        timestamp: formatUTC(timestamp),
        alert_type: s.type,
        severity: s.sev,
        asset: s.asset,
        asset_criticality: s.crit,
        data_sensitivity: s.sens,
        attack_confidence: s.conf,
        affected_users: s.users,
        business_impact: s.impact,
        source_ip: sourceIp,
        destination_ip: '203.0.113.200',
        user_account: user,
        attack_stage: s.stage,
        mitre_technique: s.mitre || mapMitreTechnique(rawAlert),
        ioc_match: iocRes.isMatch,
        ioc_indicator: iocRes.indicator,
        related_alert_ids: related.length > 0 ? related : null,
        status: 'new',
        created_at: formatUTC(timestamp)
      });
    }
    chainSummaries.push({ name: chainId, user, sourceIp, alertIds: chainAlertIds, ioc: true });
  }

  // Chain 3: Cloud Credential Compromise & S3 Bucket Dumping (IOC: 185.220.101.5)
  {
    const chainId = 'Chain 3 (Cloud Storage Exfiltration)';
    const user = 'cloud_admin_dev';
    const sourceIp = '185.220.101.5'; // MOCK IOC MATCH
    const chainAlertIds = [];
    const chainStartTime = new Date(baseTime.getTime() + 8 * 60 * 60 * 1000);

    const steps = [
      { type: 'port_scan', stage: 'reconnaissance', asset: 'AWS-S3-GATEWAY-01', crit: 88, sens: 90, sev: 40, conf: 70, impact: 35, users: 1, mitre: 'T1046', delayMin: 0 },
      { type: 'failed_login', stage: 'initial_access', asset: 'AWS-S3-GATEWAY-01', crit: 88, sens: 90, sev: 65, conf: 80, impact: 55, users: 1, mitre: 'T1078', delayMin: 6 },
      { type: 'privilege_escalation', stage: 'privilege_escalation', asset: 'PROD-API-CLUSTER-01', crit: 92, sens: 75, sev: 80, conf: 88, impact: 75, users: 5, mitre: 'T1078', delayMin: 14 },
      { type: 'suspicious_process', stage: 'persistence', asset: 'PROD-DB-CUSTOMER-01', crit: 95, sens: 98, sev: 82, conf: 85, impact: 80, users: 15, mitre: 'T1543', delayMin: 20 },
      { type: 'data_exfiltration', stage: 'exfiltration', asset: 'AWS-S3-GATEWAY-01', crit: 88, sens: 90, sev: 92, conf: 95, impact: 90, users: 8500, mitre: 'T1048', delayMin: 27 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const alertId = nextAlertId();
      chainAlertIds.push(alertId);
      const timestamp = new Date(chainStartTime.getTime() + s.delayMin * 60 * 1000);
      const related = chainAlertIds.slice(0, i);

      const rawAlert = {
        alert_type: s.type,
        attack_stage: s.stage,
        source_ip: sourceIp,
        destination_ip: '185.220.101.250'
      };
      const iocRes = checkIOC(rawAlert);

      alerts.push({
        id: uuidv4(),
        alert_id: alertId,
        timestamp: formatUTC(timestamp),
        alert_type: s.type,
        severity: s.sev,
        asset: s.asset,
        asset_criticality: s.crit,
        data_sensitivity: s.sens,
        attack_confidence: s.conf,
        affected_users: s.users,
        business_impact: s.impact,
        source_ip: sourceIp,
        destination_ip: '185.220.101.250',
        user_account: user,
        attack_stage: s.stage,
        mitre_technique: s.mitre || mapMitreTechnique(rawAlert),
        ioc_match: iocRes.isMatch,
        ioc_indicator: iocRes.indicator,
        related_alert_ids: related.length > 0 ? related : null,
        status: 'new',
        created_at: formatUTC(timestamp)
      });
    }
    chainSummaries.push({ name: chainId, user, sourceIp, alertIds: chainAlertIds, ioc: true });
  }

  // Chain 4: Build Server CI/CD Pipeline Hijack & Persistence (IOC: 192.0.2.142)
  {
    const chainId = 'Chain 4 (CI/CD Supply Chain Tamper)';
    const user = 'gitlab_runner_prod';
    const sourceIp = '192.0.2.142'; // MOCK IOC MATCH
    const chainAlertIds = [];
    const chainStartTime = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000);

    const steps = [
      { type: 'port_scan', stage: 'reconnaissance', asset: 'DEV-BUILD-02', crit: 45, sens: 30, sev: 38, conf: 68, impact: 25, users: 1, mitre: 'T1046', delayMin: 0 },
      { type: 'malware_detection', stage: 'initial_access', asset: 'DEV-BUILD-02', crit: 45, sens: 30, sev: 72, conf: 82, impact: 60, users: 2, mitre: 'T1204', delayMin: 7 },
      { type: 'privilege_escalation', stage: 'privilege_escalation', asset: 'PROD-API-CLUSTER-01', crit: 92, sens: 75, sev: 78, conf: 86, impact: 70, users: 4, mitre: 'T1068', delayMin: 15 },
      { type: 'lateral_movement', stage: 'lateral_movement', asset: 'DC-01', crit: 98, sens: 88, sev: 86, conf: 90, impact: 88, users: 8, mitre: 'T1021', delayMin: 21 },
      { type: 'suspicious_process', stage: 'persistence', asset: 'PROD-DB-CUSTOMER-01', crit: 95, sens: 98, sev: 84, conf: 88, impact: 82, users: 12, mitre: 'T1543', delayMin: 29 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const alertId = nextAlertId();
      chainAlertIds.push(alertId);
      const timestamp = new Date(chainStartTime.getTime() + s.delayMin * 60 * 1000);
      const related = chainAlertIds.slice(0, i);

      const rawAlert = {
        alert_type: s.type,
        attack_stage: s.stage,
        source_ip: sourceIp,
        destination_ip: '192.0.2.222'
      };
      const iocRes = checkIOC(rawAlert);

      alerts.push({
        id: uuidv4(),
        alert_id: alertId,
        timestamp: formatUTC(timestamp),
        alert_type: s.type,
        severity: s.sev,
        asset: s.asset,
        asset_criticality: s.crit,
        data_sensitivity: s.sens,
        attack_confidence: s.conf,
        affected_users: s.users,
        business_impact: s.impact,
        source_ip: sourceIp,
        destination_ip: '192.0.2.222',
        user_account: user,
        attack_stage: s.stage,
        mitre_technique: s.mitre || mapMitreTechnique(rawAlert),
        ioc_match: iocRes.isMatch,
        ioc_indicator: iocRes.indicator,
        related_alert_ids: related.length > 0 ? related : null,
        status: 'new',
        created_at: formatUTC(timestamp)
      });
    }
    chainSummaries.push({ name: chainId, user, sourceIp, alertIds: chainAlertIds, ioc: true });
  }

  // --- TRAP ALERTS (3 alerts: ALT-0021, ALT-0022, ALT-0023) ---
  const trapAlerts = [
    { type: 'brute_force', stage: 'initial_access', asset: 'WKS-INTERN-014', crit: 15, sens: 10, sev: 94, conf: 92, impact: 12, users: 1, sourceIp: '198.51.100.12', destIp: '10.0.4.14', user: 'intern_temp', mitre: 'T1110', offsetHours: 2 },
    { type: 'malware_detection', stage: 'initial_access', asset: 'DEV-SANDBOX-09', crit: 10, sens: 5, sev: 90, conf: 88, impact: 10, users: 0, sourceIp: '198.51.100.33', destIp: '10.0.9.99', user: 'tester01', mitre: 'T1204', offsetHours: 6 },
    { type: 'suspicious_process', stage: 'privilege_escalation', asset: 'KIOSK-LOBBY-01', crit: 10, sens: 5, sev: 96, conf: 95, impact: 15, users: 0, sourceIp: '198.51.100.77', destIp: '10.0.1.5', user: 'kiosk_guest', mitre: 'T1059', offsetHours: 10 }
  ];

  const trapAlertIds = [];
  for (const t of trapAlerts) {
    const alertId = nextAlertId();
    trapAlertIds.push(alertId);
    const timestamp = new Date(baseTime.getTime() + t.offsetHours * 60 * 60 * 1000);

    const rawAlert = { alert_type: t.type, attack_stage: t.stage, source_ip: t.sourceIp, destination_ip: t.destIp };
    const iocRes = checkIOC(rawAlert);

    alerts.push({
      id: uuidv4(),
      alert_id: alertId,
      timestamp: formatUTC(timestamp),
      alert_type: t.type,
      severity: t.sev,
      asset: t.asset,
      asset_criticality: t.crit,
      data_sensitivity: t.sens,
      attack_confidence: t.conf,
      affected_users: t.users,
      business_impact: t.impact,
      source_ip: t.sourceIp,
      destination_ip: t.destIp,
      user_account: t.user,
      attack_stage: t.stage,
      mitre_technique: t.mitre || mapMitreTechnique(rawAlert),
      ioc_match: iocRes.isMatch,
      ioc_indicator: iocRes.indicator,
      related_alert_ids: null,
      status: 'new',
      created_at: formatUTC(timestamp)
    });
  }

  // --- QUIET BUT DANGEROUS ALERTS (3 alerts: ALT-0024, ALT-0025, ALT-0026) ---
  const quietDangerousAlerts = [
    { type: 'suspicious_process', stage: 'reconnaissance', asset: 'PROD-DB-CUSTOMER-01', crit: 95, sens: 98, sev: 42, conf: 82, impact: 88, users: 450, sourceIp: '10.200.1.15', destIp: '10.200.1.10', user: 'svc_analytics', mitre: 'T1087', offsetHours: 3 },
    { type: 'failed_login', stage: 'initial_access', asset: 'DC-01', crit: 98, sens: 88, sev: 48, conf: 85, impact: 90, users: 15, sourceIp: '10.200.2.40', destIp: '10.200.0.1', user: 'backup_admin', mitre: 'T1078', offsetHours: 7 },
    { type: 'privilege_escalation', stage: 'privilege_escalation', asset: 'FIN-SERVER-03', crit: 90, sens: 92, sev: 45, conf: 80, impact: 84, users: 50, sourceIp: '10.200.3.12', destIp: '10.200.3.3', user: 'payroll_sync', mitre: 'T1068', offsetHours: 11 }
  ];

  const quietDangerousAlertIds = [];
  for (const q of quietDangerousAlerts) {
    const alertId = nextAlertId();
    quietDangerousAlertIds.push(alertId);
    const timestamp = new Date(baseTime.getTime() + q.offsetHours * 60 * 60 * 1000);

    const rawAlert = { alert_type: q.type, attack_stage: q.stage, source_ip: q.sourceIp, destination_ip: q.destIp };
    const iocRes = checkIOC(rawAlert);

    alerts.push({
      id: uuidv4(),
      alert_id: alertId,
      timestamp: formatUTC(timestamp),
      alert_type: q.type,
      severity: q.sev,
      asset: q.asset,
      asset_criticality: q.crit,
      data_sensitivity: q.sens,
      attack_confidence: q.conf,
      affected_users: q.users,
      business_impact: q.impact,
      source_ip: q.sourceIp,
      destination_ip: q.destIp,
      user_account: q.user,
      attack_stage: q.stage,
      mitre_technique: q.mitre || mapMitreTechnique(rawAlert),
      ioc_match: iocRes.isMatch,
      ioc_indicator: iocRes.indicator,
      related_alert_ids: null,
      status: 'new',
      created_at: formatUTC(timestamp)
    });
  }

  // --- BENCHMARK PROOF PAIR: RECON (HIGH SEV) vs EXFIL (MED SEV) ---
  const reconProofId = nextAlertId(); // ALT-0027
  const reconTime = new Date(baseTime.getTime() + 15 * 60 * 60 * 1000);
  const reconRaw = { alert_type: 'port_scan', attack_stage: 'reconnaissance', source_ip: '192.168.10.55', destination_ip: '10.0.3.42' };
  const reconIoc = checkIOC(reconRaw);
  alerts.push({
    id: uuidv4(),
    alert_id: reconProofId,
    timestamp: formatUTC(reconTime),
    alert_type: 'port_scan',
    severity: 90,
    asset: 'WKS-QA-001',
    asset_criticality: 40,
    data_sensitivity: 35,
    attack_confidence: 60,
    affected_users: 0,
    business_impact: 30,
    source_ip: '192.168.10.55',
    destination_ip: '10.0.3.42',
    user_account: 'qa_user_01',
    attack_stage: 'reconnaissance',
    mitre_technique: mapMitreTechnique(reconRaw),
    ioc_match: reconIoc.isMatch,
    ioc_indicator: reconIoc.indicator,
    related_alert_ids: null,
    status: 'new',
    created_at: formatUTC(reconTime)
  });

  const exfilProofId = nextAlertId(); // ALT-0028
  const exfilTime = new Date(baseTime.getTime() + 17 * 60 * 60 * 1000);
  const exfilRaw = { alert_type: 'data_exfiltration', attack_stage: 'exfiltration', source_ip: '192.168.10.77', destination_ip: '203.0.113.99' };
  const exfilIoc = checkIOC(exfilRaw);
  alerts.push({
    id: uuidv4(),
    alert_id: exfilProofId,
    timestamp: formatUTC(exfilTime),
    alert_type: 'data_exfiltration',
    severity: 45,
    asset: 'WKS-QA-002',
    asset_criticality: 40,
    data_sensitivity: 35,
    attack_confidence: 60,
    affected_users: 0,
    business_impact: 30,
    source_ip: '192.168.10.77',
    destination_ip: '203.0.113.99',
    user_account: 'qa_user_02',
    attack_stage: 'exfiltration',
    mitre_technique: mapMitreTechnique(exfilRaw),
    ioc_match: exfilIoc.isMatch,
    ioc_indicator: exfilIoc.indicator,
    related_alert_ids: null,
    status: 'new',
    created_at: formatUTC(exfilTime)
  });

  // --- STANDALONE NOISE ALERTS (92 alerts) ---
  const noiseTypes = [
    { type: 'failed_login', stage: 'initial_access', sevRange: [10, 35], impactRange: [5, 25], confRange: [30, 60] },
    { type: 'port_scan', stage: 'reconnaissance', sevRange: [15, 30], impactRange: [5, 20], confRange: [40, 65] },
    { type: 'suspicious_email', stage: 'initial_access', sevRange: [20, 40], impactRange: [10, 30], confRange: [45, 70] },
    { type: 'suspicious_process', stage: 'none', sevRange: [10, 30], impactRange: [5, 20], confRange: [30, 55] },
    { type: 'brute_force', stage: 'initial_access', sevRange: [25, 45], impactRange: [10, 30], confRange: [50, 70] },
    { type: 'malware_detection', stage: 'initial_access', sevRange: [20, 40], impactRange: [10, 25], confRange: [40, 65] }
  ];

  const noiseCount = 120 - alerts.length; // exactly 92

  for (let i = 0; i < noiseCount; i++) {
    const alertId = nextAlertId();
    const config = noiseTypes[i % noiseTypes.length];
    const assetObj = NOISE_ASSETS[i % NOISE_ASSETS.length];

    const sev = Math.floor(Math.random() * (config.sevRange[1] - config.sevRange[0] + 1)) + config.sevRange[0];
    const impact = Math.floor(Math.random() * (config.impactRange[1] - config.impactRange[0] + 1)) + config.impactRange[0];
    const conf = Math.floor(Math.random() * (config.confRange[1] - config.confRange[0] + 1)) + config.confRange[0];
    const sourceIp = `10.80.${Math.floor(i / 250) + 1}.${(i % 250) + 1}`;
    const destIp = `10.90.0.${(i % 50) + 1}`;
    const user = `noise_usr_${i + 1}`;

    const offsetMinutes = Math.floor((i / noiseCount) * 23.5 * 60) + 5;
    const timestamp = new Date(baseTime.getTime() + offsetMinutes * 60 * 1000);

    const rawAlert = { alert_type: config.type, attack_stage: config.stage, source_ip: sourceIp, destination_ip: destIp };
    const iocRes = checkIOC(rawAlert);

    alerts.push({
      id: uuidv4(),
      alert_id: alertId,
      timestamp: formatUTC(timestamp),
      alert_type: config.type,
      severity: sev,
      asset: assetObj.name,
      asset_criticality: assetObj.criticality,
      data_sensitivity: assetObj.sensitivity,
      attack_confidence: conf,
      affected_users: Math.floor(Math.random() * 2),
      business_impact: impact,
      source_ip: sourceIp,
      destination_ip: destIp,
      user_account: user,
      attack_stage: config.stage,
      mitre_technique: mapMitreTechnique(rawAlert),
      ioc_match: iocRes.isMatch,
      ioc_indicator: iocRes.indicator,
      related_alert_ids: null,
      status: 'new',
      created_at: formatUTC(timestamp)
    });
  }

  return {
    alerts,
    chainSummaries,
    trapAlertIds,
    quietDangerousAlertIds,
    proofPair: { reconId: reconProofId, exfilId: exfilProofId }
  };
}

async function seedAlerts() {
  console.log('--- Starting Alerts & Asset Registry Seed Generator ---');
  console.log('Strategy: Safe Re-run (TRUNCATE alerts before inserting)...');

  const connection = await pool.getConnection();

  try {
    // 1. Seed / Update Asset Registry
    const allAssets = [...ASSETS, ...NOISE_ASSETS];
    const assetInsertSql = `
      INSERT INTO asset_registry (asset, asset_type, criticality_override, description)
      VALUES (?, ?, NULL, ?)
      ON DUPLICATE KEY UPDATE
        asset_type = VALUES(asset_type),
        description = VALUES(description);
    `;

    for (const a of allAssets) {
      await connection.query(assetInsertSql, [a.name, a.type, a.desc]);
    }
    console.log(`Asset registry synchronized with ${allAssets.length} enterprise assets.`);

    // 2. Truncate and re-seed alerts
    await connection.query('TRUNCATE TABLE alerts;');
    console.log('Table `alerts` truncated successfully.');

    const { alerts, chainSummaries, trapAlertIds, quietDangerousAlertIds, proofPair } = generateSeedData();
    console.log(`Generated ${alerts.length} alerts with initial MITRE & IOC tagging.`);

    const insertSql = `
      INSERT INTO alerts (
        id, alert_id, timestamp, alert_type, severity, asset,
        asset_criticality, data_sensitivity, attack_confidence,
        affected_users, business_impact, source_ip, destination_ip,
        user_account, attack_stage, mitre_technique, ioc_match, ioc_indicator,
        related_alert_ids, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    for (const a of alerts) {
      await connection.query(insertSql, [
        a.id,
        a.alert_id,
        a.timestamp,
        a.alert_type,
        a.severity,
        a.asset,
        a.asset_criticality,
        a.data_sensitivity,
        a.attack_confidence,
        a.affected_users,
        a.business_impact,
        a.source_ip,
        a.destination_ip,
        a.user_account,
        a.attack_stage,
        a.mitre_technique,
        a.ioc_match ? 1 : 0,
        a.ioc_indicator,
        a.related_alert_ids ? JSON.stringify(a.related_alert_ids) : null,
        a.status,
        a.created_at
      ]);
    }

    const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM alerts;');
    const totalInDb = countRows[0].total;

    console.log('\n================ SEED SUMMARY ================');
    console.log(`Total Alerts Inserted: ${totalInDb} (Expected: 120)`);
    console.log(`Attack Chains (${chainSummaries.length} chains, ${chainSummaries.length * 5} alerts total):`);
    for (const c of chainSummaries) {
      console.log(`  - ${c.name}: [${c.alertIds.join(' -> ')}] (User: ${c.user}, IP: ${c.sourceIp}, IOC: ${c.ioc ? 'MATCH' : 'none'})`);
    }
    console.log(`Trap Alerts (${trapAlertIds.length} alerts - High Severity, Low Asset/Impact):`);
    console.log(`  - IDs: ${trapAlertIds.join(', ')}`);
    console.log(`Quiet-but-Dangerous Alerts (${quietDangerousAlertIds.length} alerts - Moderate Severity, High Asset/Data):`);
    console.log(`  - IDs: ${quietDangerousAlertIds.join(', ')}`);
    console.log(`Phase 2 Recon-vs-Exfil Proof Pair:`);
    console.log(`  - Recon Alert (${proofPair.reconId}): Severity 90, Stage reconnaissance (1.0x)`);
    console.log(`  - Exfil Alert (${proofPair.exfilId}): Severity 45, Stage exfiltration (2.2x)`);
    console.log(`Standalone Noise Alerts: ${totalInDb - (chainSummaries.length * 5) - trapAlertIds.length - quietDangerousAlertIds.length - 2} alerts`);
    console.log('==============================================\n');

    // 3. Run full enrichment job
    await enrichAllAlerts();

    // 4. Automatically rebuild incidents from the freshly seeded & enriched alerts
    await rebuildIncidents(30);

  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedAlerts().then(() => {
    console.log('Seeding, enrichment, and incident rebuild completed successfully.');
    process.exit(0);
  });
}

module.exports = { seedAlerts, generateSeedData, ASSETS, NOISE_ASSETS };
