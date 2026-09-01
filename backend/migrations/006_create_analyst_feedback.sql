-- Migration: 006_create_analyst_feedback.sql
-- Description: Creates analyst_feedback table for tracking triage confirmation/false positive verdicts.
-- Database: MySQL 8.0+

CREATE TABLE IF NOT EXISTS analyst_feedback (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  incident_id VARCHAR(50) NOT NULL COMMENT 'Incident UUID or human-readable identifier (e.g. INC-0001)',
  verdict ENUM('confirmed', 'false_positive') NOT NULL COMMENT 'Analyst verdict on incident validity',
  notes VARCHAR(500) NULL COMMENT 'Optional triage rationale or investigation notes',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record timestamp in UTC',
  INDEX idx_feedback_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

