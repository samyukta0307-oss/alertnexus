-- Migration: 005_create_asset_registry.sql
-- Description: Creates and seeds the authoritative asset_registry table.
-- Database: MySQL 8.0+

CREATE TABLE IF NOT EXISTS asset_registry (
  asset VARCHAR(255) PRIMARY KEY COMMENT 'Matches asset name hostname',
  asset_type VARCHAR(50) NOT NULL COMMENT 'e.g. database, domain_controller, workstation, mail_gateway, file_server, build_server, api_server, cloud_storage, network_gateway, sandbox, staging, kiosk',
  criticality_override INT NULL COMMENT 'Authoritative criticality override (0-100) if set',
  description VARCHAR(255) NULL COMMENT 'Human-readable description of role and sensitivity',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_registry_criticality CHECK (criticality_override IS NULL OR (criticality_override BETWEEN 0 AND 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data for all known enterprise assets
INSERT INTO asset_registry (asset, asset_type, criticality_override, description) VALUES
  ('PROD-DB-CUSTOMER-01', 'database', 95, 'Production customer relational database - contains PII/Financials'),
  ('FIN-SERVER-03', 'finance', 90, 'Core financial ledger and payroll processing server'),
  ('DC-01', 'domain_controller', 98, 'Primary Active Directory Domain Controller - Kerberos/LDAP'),
  ('MAIL-GATEWAY-02', 'mail_gateway', 70, 'Inbound/outbound SMTP mail exchange gateway'),
  ('HR-PORTAL-01', 'web_app', 65, 'Internal HR management system and employee directory'),
  ('AWS-S3-GATEWAY-01', 'cloud_storage', 88, 'Cloud object storage gateway and data pipeline connector'),
  ('PROD-API-CLUSTER-01', 'api_server', 92, 'Public facing API gateway and microservices cluster'),
  ('VPN-GW-01', 'network_gateway', 80, 'Remote access enterprise VPN gateway'),
  ('DEV-BUILD-02', 'build_server', 45, 'GitLab CI/CD automated build runner'),
  ('WKS-INTERN-014', 'workstation', 15, 'Intern temporary development workstation'),
  ('WKS-EXEC-002', 'workstation', 75, 'Executive laptop - Chief Financial Officer'),
  ('WKS-ENG-042', 'workstation', 40, 'Core backend engineering workstation'),
  ('DEV-SANDBOX-09', 'sandbox', 10, 'Isolated development test sandbox'),
  ('TEST-STAGING-04', 'staging', 20, 'Pre-production staging verification environment'),
  ('KIOSK-LOBBY-01', 'kiosk', 10, 'Building lobby visitor check-in tablet'),
  ('WKS-QA-001', 'workstation', 40, 'QA testing desktop workstation 01'),
  ('WKS-QA-002', 'workstation', 40, 'QA testing desktop workstation 02'),
  ('DEV-SRV-ALPHA-01', 'build_server', 30, 'Development alpha testing node 01'),
  ('DEV-SRV-BETA-02', 'build_server', 35, 'Development beta testing node 02'),
  ('TEST-NODE-01', 'staging', 20, 'Integration test compute node 01'),
  ('TEST-NODE-02', 'staging', 25, 'Integration test compute node 02'),
  ('WKS-TEMP-101', 'workstation', 15, 'Temporary contractor workstation 101'),
  ('WKS-TEMP-102', 'workstation', 15, 'Temporary contractor workstation 102'),
  ('PRINTER-FLOOR-2', 'workstation', 10, 'Shared floor 2 network multifunction printer'),
  ('BACKUP-NODE-04', 'file_server', 40, 'Secondary snapshot storage backup node'),
  ('LOG-FORWARDER-01', 'file_server', 35, 'Syslog ingestion and forwarder node'),
  ('MONITOR-AGENT-09', 'workstation', 25, 'Network monitoring SNMP telemetry agent')
ON DUPLICATE KEY UPDATE
  asset_type = VALUES(asset_type),
  description = VALUES(description);

