# CyberShield SOC — Demo Presentation Script (3–5 Minutes)

A timed, beat-by-beat live presentation script for **CyberShield SOC**, mapped directly to the active React dashboard, verified backend telemetry, and 3D visualizers.

---

## ⏱️ Timing Breakdown & Navigation Map

| Beat | Section | Target Route | Focus / Story Arc | Duration | Cumulative |
|---|---|---|---|---|---|
| **Beat 1** | **The Problem (Hook)** | `/` (Overview) | Alert fatigue & contextual blindspots | 0:20 | 0:20 |
| **Beat 2** | **Ingestion & Correlation** | `/` (Overview) | 120 raw alerts → 104 correlated incidents | 0:25 | 0:45 |
| **Beat 3** | **Prioritized Incident Queue** | `/` (Overview) | P1 Critical vs P4 Noise separation | 0:30 | 1:15 |
| **Beat 4** | **Root Cause & Explainability** | Side Panel | "Why is this #1?", Factor bars, ML signal | 0:50 | 2:05 |
| **Beat 5** | **3D Attack-Chain Trajectory** | `/attack-chains` | Chronological multi-stage graph & IOC halo | 0:40 | 2:45 |
| **Beat 6** | **3D Threat Map & Containment** | `/threat-map` | Crown jewel blast radius & live risk drop (-57%) | 0:45 | 3:30 |
| **Beat 7** | **What-If Sensitivity Simulator** | `/simulator` | Dynamic risk recalculation (P3 → P1 shift) | 0:35 | 4:05 |
| **Beat 8** | **Conclusion & Key Takeaways** | `/` (Overview) | Autonomous prioritization impact | 0:25 | **4:30** |

---

## 🎬 Beat-by-Beat Presentation Script

### BEAT 1: The Problem & Opening Hook (0:00 – 0:20)
**Action:** Stand in front of the screen showing the CyberShield Overview page (`/`).
> *"In a typical SOC shift, tier-1 analysts are drowned by hundreds of alerts every hour. Most systems prioritize based purely on raw vendor severity. But the loudest alert is rarely the most dangerous. A high-severity test ping on an intern laptop is noise, while a quiet credential anomaly on a production database is catastrophic. CyberShield transforms this alert chaos into actionable, mathematically prioritized incident intelligence."*

---

### BEAT 2: The Ingestion & Correlation Moment (0:20 – 0:45)
**Action:** Point out the top header metric: **"Live Ingested Alerts: 120"** and the KPI card: **"Active Incidents: 104"**.
> *"Right now, CyberShield is ingesting live enterprise telemetry from across the infrastructure. Across 120 raw security alerts, our 30-minute sliding-window correlation graph connects shared IP addresses, user identities, and infrastructure nodes. Instead of forcing analysts to triage 120 disjointed tickets, CyberShield collapses them into 104 contextual incident clusters in under a second."*

---

### BEAT 3: Contextual Prioritization Queue (0:45 – 1:15)
**Action:** Highlight the 4 priority columns: **P1 Critical**, **P2 High**, **P3 Medium**, **P4 Low**.
> *"Notice our 4-tier priority queue. In P1 Critical, we have our top incident: **INC-0057** with a maximum composite risk score of **100**. Meanwhile, 90+ background port scans and benign authorization failures are safely categorized down in P4 Low. The analyst immediately knows where to focus their first 60 seconds."*

---

### BEAT 4: Explainability & "Why is this #1?" (1:15 – 2:05)
**Action:** Click on **INC-0057** to open the slide-in Incident Investigation panel.
> *"When we inspect **INC-0057**, we don't get a black-box number. CyberShield provides full mathematical explainability.
> 
> Look at the decision log:
> 1. It targets a crown jewel asset: our Primary Domain Controller, **DC-01**, with a 98% criticality rating.
> 2. It involves highly sensitive customer data (98% rating).
> 3. It matched a verified threat intelligence IOC: IP `192.0.2.142`.
> 
> Look at the score progression:
> - Base Risk is **0.8489** computed across 6 normalized factors.
> - Layered with our MITRE ATT&CK Stage Multiplier (**1.8x** for Lateral Movement).
> - Plus a **+0.40** Correlation Boost across 4 distinct attack stages.
> - Reaching a calibrated Final Risk Score of **100**.
> 
> Furthermore, our pure JavaScript Isolation Forest anomaly detector boosted attack confidence from 90% to 100%, labeled honestly as an active prototype anomaly signal."*

---

### BEAT 5: 3D Attack-Chain Trajectory (2:05 – 2:45)
**Action:** Click the **"3D ATTACK CHAIN"** button inside the investigation panel to navigate to `/attack-chains?id=INC-0057`. Orbit the camera slightly using the mouse.
> *"Here in the 3D Attack-Chain Visualizer, we see the real chronological trajectory of the attack over time.
> 
> - **Step 1:** Initial Reconnaissance on `DEV-BUILD-02` (Blue).
> - **Step 2:** Initial Access execution on the build server (Cyan).
> - **Step 3:** Privilege Escalation onto the API cluster `PROD-API-CLUSTER-01` (Orange).
> - **Step 4:** Lateral Movement bridging directly into `DC-01` (Amber).
> - **Step 5:** Persistence established on `PROD-DB-CUSTOMER-01` (Purple).
> 
> Notice the glowing red halo rings on every node — indicating verified matches against threat intelligence indicators."*

---

### BEAT 6: 3D Threat Map & Live Containment Simulation (2:45 – 3:30)
**Action:** Click the **"3D Threat Map"** link in the sidebar or header (`/threat-map?id=INC-0057`). Point out the center node and outer nodes.
> *"Next, let's explore the blast radius on our 3D Infrastructure Threat Map.
> - At the center sits our crown jewel: **DC-01** (Criticality 98).
> - Radiating outward are the connected downstream assets: our Customer Database (95) and API Gateway (92), plus our user identity footprint.
> 
> Now, watch what happens when our analyst evaluates response options. I click **'SIMULATE CONTAINMENT'**."*
**Action:** Click the **"SIMULATE CONTAINMENT"** button. Watch the connection lines sever and the nodes grey out.
> *"Instantly, in-memory without touching production data, CyberShield isolates the compromised hosts:
> - Active blast radius drops from 4 assets to **0 uncontained assets**.
> - Final Risk Score drops from **100 (P1 Critical)** down to **42.79 (P3 Medium)**.
> - That represents a **57.21% risk reduction**."*

---

### BEAT 7: What-If Risk Sensitivity Simulator (3:30 – 4:05)
**Action:** Navigate to **What-If Simulator** (`/simulator`). Select mid-priority incident `INC-0103`. Click the preset **"Spec Example (P3→P1)"**. Click **"RECALCULATE SENSITIVITY"**.
> *"Security conditions change rapidly. With our What-If Sensitivity Simulator, analysts can test hypothetical scenarios.
> 
> Taking a mid-priority P3 incident, we simulate elevating asset criticality to 95, expanding affected users to 5,000, and boosting confidence to 90%.
> 
> Clicking Recalculate re-runs our entire 5-step scoring pipeline live:
> - Risk score jumps from **37.91** to **76.70**.
> - Priority shifts from **P3 Medium → P1 Critical**.
> This demonstrates the engine's dynamic responsiveness to escalating blast radius."*

---

### BEAT 8: Closing & Measurable Impact (4:05 – 4:30)
**Action:** Navigate back to the main Overview page (`/`).
> *"In summary: CyberShield ingested 120 raw alerts, correlated them into 104 contextual incidents, prioritized the top threat with 100% mathematical explainability, mapped its 3D attack trajectory, and simulated a 57% risk reduction through automated containment playbooks — all in under a second.
> 
> Thank you, and we're excited to answer your questions!"*

---

## 🛠️ Live Demo Fallback & Troubleshooting Plan

| Scenario | Immediate Action | Explanation / Recovery |
|---|---|---|
| **Need to reset demo state** | Run `npm run demo:reset` in the backend terminal. | Resets database, seeds 120 alerts, enriches IOCs, and rebuilds incidents in ~12 seconds. |
| **3D scene performance on low-end display** | Use the 2D chronological timeline strip below the canvas or the Incident Detail side panel. | Narrate directly from the 2D timeline and score breakdown without skipping a beat. |
| **ML toggle explanation question** | Toggle ML off/on via the top header button. | State: *"CyberShield includes an Isolation Forest prototype anomaly signal. If toggled off, the engine seamlessly falls back to raw database confidence with zero downtime."* |
| **Backend connection interrupted** | Run `node src/index.js` in `/backend`. | Express server boots on `http://localhost:5000` in <1 second with persistent MySQL pool. |

