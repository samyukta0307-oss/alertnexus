-- Migration: 004_add_enrichment_fields.sql
-- Description: Adds ioc_indicator and ensures mitre_technique and ioc_match are present in alerts table.
-- Database: MySQL 8.0+

ALTER TABLE alerts
  ADD COLUMN ioc_indicator VARCHAR(255) NULL AFTER ioc_match;

