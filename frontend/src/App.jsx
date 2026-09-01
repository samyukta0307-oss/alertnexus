import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import IncidentsPage from './pages/IncidentsPage';
import AttackChainsPage from './pages/AttackChainsPage';
import ThreatMapPage from './pages/ThreatMapPage';
import ResponsePage from './pages/ResponsePage';
import SimulatorPage from './pages/SimulatorPage';
import SettingsPage from './pages/SettingsPage';
import IncidentDetail from './components/IncidentDetail';
import ReplayModal from './components/ReplayModal';
import LiveAlertToast from './components/LiveAlertToast';
import { ViewModeProvider } from './context/ViewModeContext';
import { getRankedIncidents, getAlerts, postAlert, rebuildIncidents } from './api/client';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [rawAlerts, setRawAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  // Demo Mode Replay & Live Alert state
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [liveAlertNotification, setLiveAlertNotification] = useState(null);
  const [injectingLiveAlert, setInjectingLiveAlert] = useState(false);

  const fetchIncidentsAndAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ranked, alerts] = await Promise.all([
        getRankedIncidents(),
        getAlerts().catch(() => [])
      ]);
      setIncidents(ranked || []);
      const alertsArr = Array.isArray(alerts) ? alerts : [];
      setRawAlerts(alertsArr);
      setAlertCount(alertsArr.length || 120);
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

  // Handle live alert injection demo moment
  const handleInjectLiveAlert = async () => {
    try {
      setInjectingLiveAlert(true);
      const liveAlertPayload = {
        alert_type: 'data_exfiltration',
        severity: 98,
        asset: 'PROD-DB-CUSTOMER-01',
        asset_criticality: 95,
        data_sensitivity: 98,
        attack_confidence: 96,
        affected_users: 5000,
        business_impact: 99,
        source_ip: '198.51.100.45',
        destination_ip: '198.51.100.99',
        user_account: 'svc_finance',
        attack_stage: 'exfiltration',
        mitre_technique: 'T1041',
        ioc_match: true,
        ioc_indicator: '198.51.100.99',
        status: 'new'
      };

      const prevIncident = incidents.find(i => i.alerts?.some(a => a.asset === 'PROD-DB-CUSTOMER-01')) || incidents[0];
      const beforeScore = prevIncident?.score || 78.4;
      const beforePriority = prevIncident?.priority_bucket || 'P2';

      await postAlert(liveAlertPayload);
      await rebuildIncidents(30);
      const [updatedIncidents, updatedAlerts] = await Promise.all([
        getRankedIncidents(),
        getAlerts().catch(() => [])
      ]);
      setIncidents(updatedIncidents || []);
      setRawAlerts(Array.isArray(updatedAlerts) ? updatedAlerts : []);
      setAlertCount(Array.isArray(updatedAlerts) ? updatedAlerts.length : 121);

      const updatedTarget = updatedIncidents?.find(i => i.alerts?.some(a => a.asset === 'PROD-DB-CUSTOMER-01')) || updatedIncidents?.[0];
      const afterScore = updatedTarget?.score || 98.5;
      const afterPriority = updatedTarget?.priority_bucket || 'P1';

      setLiveAlertNotification({
        alert: liveAlertPayload,
        incidentId: updatedTarget?.incident_id || 'INC-0057',
        beforeScore,
        afterScore,
        beforePriority,
        afterPriority,
        message: `New critical telemetry joined ${updatedTarget?.incident_id || 'INC-0057'} — priority escalated from ${beforeScore} (${beforePriority}) to ${afterScore} (${afterPriority}).`
      });
    } catch (err) {
      console.error('Failed to inject live alert:', err);
    } finally {
      setInjectingLiveAlert(false);
    }
  };

  // Find rank of selected incident
  const selectedRank = incidents.findIndex(i => i.incident_id === selectedIncidentId) + 1 || 1;

  return (
    <ViewModeProvider>
      <AppShell
        alertCount={alertCount}
        onAlertsRefresh={fetchIncidentsAndAlerts}
        onRebuildSuccess={fetchIncidentsAndAlerts}
        onOpenReplay={() => setIsReplayOpen(true)}
        onInjectLiveAlert={handleInjectLiveAlert}
        injectingLiveAlert={injectingLiveAlert}
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
                onOpenReplay={() => setIsReplayOpen(true)}
                onInjectLiveAlert={handleInjectLiveAlert}
                injectingLiveAlert={injectingLiveAlert}
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

        {/* "Watch It Think" Live Demo Replay Modal */}
        <ReplayModal
          isOpen={isReplayOpen}
          onClose={() => setIsReplayOpen(false)}
          alerts={rawAlerts}
          incidents={incidents}
        />

        {/* Live Injected Alert Notification Toast */}
        <LiveAlertToast
          notification={liveAlertNotification}
          onDismiss={() => setLiveAlertNotification(null)}
        />
      </AppShell>
    </ViewModeProvider>
  );
}
