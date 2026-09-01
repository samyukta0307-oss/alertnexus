import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import IncidentsPage from './pages/IncidentsPage';
import AttackChainsPage from './pages/AttackChainsPage';
import ThreatMapPage from './pages/ThreatMapPage';
import ResponsePage from './pages/ResponsePage';
import SimulatorPage from './pages/SimulatorPage';
import SettingsPage from './pages/SettingsPage';
import IncidentDetail from './components/IncidentDetail';
import { getRankedIncidents, getAlerts } from './api/client';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const fetchIncidentsAndAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ranked, alerts] = await Promise.all([
        getRankedIncidents(),
        getAlerts().catch(() => [])
      ]);
      setIncidents(ranked || []);
      setAlertCount(Array.isArray(alerts) ? alerts.length : 120);
    } catch (err) {
      console.error('Failed to fetch incidents or alerts:', err);
      setError(err.message || 'Unable to connect to CyberShield backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidentsAndAlerts();
  }, [fetchIncidentsAndAlerts]);

  // Find rank of selected incident
  const selectedRank = incidents.findIndex(i => i.incident_id === selectedIncidentId) + 1 || 1;

  return (
    <AppShell
      alertCount={alertCount}
      onAlertsRefresh={fetchIncidentsAndAlerts}
      onRebuildSuccess={fetchIncidentsAndAlerts}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              incidents={incidents}
              loading={loading}
              error={error}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              selectedIncidentId={selectedIncidentId}
              onRetry={fetchIncidentsAndAlerts}
            />
          }
        />
        <Route
          path="/incidents"
          element={
            <IncidentsPage
              incidents={incidents}
              loading={loading}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
            />
          }
        />
        <Route
          path="/attack-chains"
          element={
            <AttackChainsPage
              onSelectIncidentForDetail={(id) => setSelectedIncidentId(id)}
            />
          }
        />
        <Route
          path="/threat-map"
          element={
            <ThreatMapPage
              onSelectIncidentForDetail={(id) => setSelectedIncidentId(id)}
            />
          }
        />
        <Route
          path="/response"
          element={
            <ResponsePage
              onSelectIncident={(id) => setSelectedIncidentId(id)}
            />
          }
        />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route
          path="/settings"
          element={<SettingsPage onWeightsSaved={fetchIncidentsAndAlerts} />}
        />
      </Routes>

      {/* Global Incident Detail Side Panel */}
      {selectedIncidentId && (
        <IncidentDetail
          incidentId={selectedIncidentId}
          rank={selectedRank}
          onClose={() => setSelectedIncidentId(null)}
          onFeedbackSubmitted={fetchIncidentsAndAlerts}
        />
      )}
    </AppShell>
  );
}
