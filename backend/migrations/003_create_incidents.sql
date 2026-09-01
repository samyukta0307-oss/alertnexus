-- Migration: 003_create_incidents.sql
-- Description: Creates the incidents table for CyberShield SOC Correlation Engine.
-- Database: MySQL 8.0+

CREATE TABLE IF NOT EXISTS incidents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  incident_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'Human-readable identifier, e.g. INC-0001',
  alert_ids JSON NOT NULL COMMENT 'JSON array of alert_id strings belonging to this incident',
  blast_radius_assets INT NOT NULL DEFAULT 0,
  blast_radius_users INT NOT NULL DEFAULT 0,
  distinct_stages INT NOT NULL DEFAULT 0 COMMENT 'Count of distinct MITRE attack stages (excluding none)',
  last_alert_at DATETIME NOT NULL COMMENT 'Timestamp in UTC of the most recent alert in this incident',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time in UTC',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time in UTC'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

