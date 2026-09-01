/**
 * CyberShield SOC Frontend API Client Layer
 * Connects directly to backend REST endpoints.
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';

async function handleResponse(response) {
  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    const errorMessage = errorData.message || errorData.error || `HTTP Error ${response.status}: ${response.statusText}`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.details = errorData.details || null;
    throw err;
  }
  return response.json();
}

export async function getRankedIncidents() {
  const res = await fetch(`${BASE_URL}/api/incidents/ranked`);
  return handleResponse(res);
}

export async function getIncident(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function getIncidentExplain(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/explain`);
  return handleResponse(res);
}

export async function getIncidentChain(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/chain`);
  return handleResponse(res);
}

export async function getIncidentPlaybook(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/playbook`);
  return handleResponse(res);
}

export async function simulateContainment(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/simulate-containment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(res);
}

export async function whatIf(id, overrides) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides })
  });
  return handleResponse(res);
}

export async function submitFeedback(id, verdict, notes = '') {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verdict, notes })
  });
  return handleResponse(res);
}

export async function getFeedback(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/feedback`);
  return handleResponse(res);
}

export async function getWeights() {
  const res = await fetch(`${BASE_URL}/api/config/weights`);
  return handleResponse(res);
}

export async function updateWeights(weights) {
  const res = await fetch(`${BASE_URL}/api/config/weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weights })
  });
  return handleResponse(res);
}

export async function getMlStatus() {
  const res = await fetch(`${BASE_URL}/api/config/ml-status`);
  return handleResponse(res);
}

export async function setMlStatus(enabled) {
  const res = await fetch(`${BASE_URL}/api/config/ml-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  return handleResponse(res);
}

export async function rebuildIncidents(windowMinutes = 30) {
  const res = await fetch(`${BASE_URL}/api/incidents/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ windowMinutes })
  });
  return handleResponse(res);
}

export async function getAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts`);
  return handleResponse(res);
}

export async function getIncidentReport(id) {
  const res = await fetch(`${BASE_URL}/api/incidents/${encodeURIComponent(id)}/report`);
  return handleResponse(res);
}

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return handleResponse(res);
}

export async function postAlert(alertData) {
  const res = await fetch(`${BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData)
  });
  return handleResponse(res);
}

