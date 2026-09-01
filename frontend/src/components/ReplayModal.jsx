import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  GitMerge,
  ShieldAlert,
  Sparkles,
  Flame,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Lock,
  ArrowRight,
  Activity
} from 'lucide-react';

/**
 * 4 MAIN DEMO SECTIONS:
 * 1: ALERT INGESTION / ALERT CHAOS (0-2s baseline, 2-5s flood, 4-5s hold)
 * 2: CORRELATION + PRIORITIZATION (0-2s analyze, 2-4.5s connect, 4-5s hold)
 * 3: PRIORITY + WHY #1 (0-2.5s queue ranking, 4-5s hold, 0-3s why #1 factors, 4-5s hold)
 * 4: ATTACK CHAIN + BLAST + DEFENSE + CONTAINMENT (chain -> 4.5s hold -> blast -> 4s hold -> defense -> 4s hold -> contain -> 5s hold)
 */

export default function ReplayModal({
  isOpen = false,
  onClose,
  alerts = [],
  incidents = []
}) {
  // Section Navigation: 1 (Chaos), 2 (Correlation), 3 (Priority/Why #1), 4 (Chain/Containment)
  const [activeSection, setActiveSection] = useState(1);
  const [subStep, setSubStep] = useState(1); // Internal step within active section
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x or 2x
  const [showTeleprompter, setShowTeleprompter] = useState(true);

  // Section 1 State
  const [streamedAlertCount, setStreamedAlertCount] = useState(12);
  const [recentStreamedAlerts, setRecentStreamedAlerts] = useState([]);

  // Section 2 State
  const [analyzingStage, setAnalyzingStage] = useState('idle'); // 'analyzing' | 'connecting' | 'grouped'
  const [activeChainStepIndex, setActiveChainStepIndex] = useState(0);

  // Section 3 State
  const [rankedList, setRankedList] = useState([]);
  const [revealedFactorCount, setRevealedFactorCount] = useState(0);

  // Section 4 State
  const [chainRevealCount, setChainRevealCount] = useState(0);
  const [blastExpanded, setBlastExpanded] = useState(false);
  const [defenseActionsCount, setDefenseActionsCount] = useState(0);
  const [containmentState, setContainmentState] = useState('pre'); // 'pre' | 'animating' | 'contained'

  const timerRef = useRef(null);

  // Data sets
  const demoAlerts = useMemo(() => {
    return alerts.length > 0 ? alerts : generateFallbackAlerts();
  }, [alerts]);

  const demoIncidents = useMemo(() => {
    return incidents.length > 0 ? incidents : generateFallbackIncidents();
  }, [incidents]);

  // Reset entire presentation to beginning
  const handleReset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveSection(1);
    setSubStep(1);
    setIsPlaying(true);
    setStreamedAlertCount(12);
    setRecentStreamedAlerts(demoAlerts.slice(0, 4));
    setAnalyzingStage('idle');
    setActiveChainStepIndex(0);
    setRankedList([]);
    setRevealedFactorCount(0);
    setChainRevealCount(0);
    setBlastExpanded(false);
    setDefenseActionsCount(0);
    setContainmentState('pre');
  }, [demoAlerts]);

  useEffect(() => {
    if (isOpen) {
      handleReset();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [isOpen, handleReset]);

  // Master Deliberate Sequence Timing Engine
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const baseDelay = (ms) => Math.round(ms / speed);

    // ==========================================
    // SECTION 1: ALERT INGESTION / ALERT CHAOS
    // ==========================================
    if (activeSection === 1) {
      if (subStep === 1) {
        // 0-2 sec: Initial quiet SOC baseline
        setStreamedAlertCount(12);
        setRecentStreamedAlerts(demoAlerts.slice(0, 4));
        timerRef.current = setTimeout(() => {
          setSubStep(2);
        }, baseDelay(2000));
      } else if (subStep === 2) {
        // 2-5 sec: Visible flood of alerts filling (12 -> 37 -> 68 -> 100+)
        let count = 12;
        const floodInterval = setInterval(() => {
          count = Math.min(count + Math.floor(Math.random() * 8) + 4, 120);
          setStreamedAlertCount(count);
          setRecentStreamedAlerts(demoAlerts.slice(Math.max(0, count - 8), count));
          if (count >= 120) {
            clearInterval(floodInterval);
            setSubStep(3); // Enter Hold State
          }
        }, baseDelay(80));

        return () => clearInterval(floodInterval);
      } else if (subStep === 3) {
        // HOLD FOR 4.8 SECONDS: Judge visual absorption + Presenter speaks
        timerRef.current = setTimeout(() => {
          setActiveSection(2);
          setSubStep(1);
        }, baseDelay(4800));
      }
    }

    // ==========================================
    // SECTION 2: CORRELATION + PRIORITIZATION
    // ==========================================
    else if (activeSection === 2) {
      if (subStep === 1) {
        // Step 1: ANALYZING ALERTS... (2.0 sec)
        setAnalyzingStage('analyzing');
        timerRef.current = setTimeout(() => {
          setSubStep(2);
        }, baseDelay(2000));
      } else if (subStep === 2) {
        // Step 2: Correlation connections (2.5 sec progressive link reveal)
        setAnalyzingStage('connecting');
        let step = 0;
        const connInterval = setInterval(() => {
          step += 1;
          setActiveChainStepIndex(step);
          if (step >= 5) {
            clearInterval(connInterval);
            setSubStep(3);
          }
        }, baseDelay(500));

        return () => clearInterval(connInterval);
      } else if (subStep === 3) {
        // Step 3: Show 100+ ALERTS -> 12 CORRELATED INCIDENTS (HOLD FOR 4.8 SECONDS)
        setAnalyzingStage('grouped');
        timerRef.current = setTimeout(() => {
          setActiveSection(3);
          setSubStep(1);
        }, baseDelay(4800));
      }
    }

    // ==========================================
    // SECTION 3: PRIORITY + WHY #1
    // ==========================================
    else if (activeSection === 3) {
      if (subStep === 1) {
        // Step 1: Queue ranking animation (2.5 sec progressive reorder P4 -> P3 -> P2 -> P1)
        const sorted = [...demoIncidents].sort((a, b) => (a.score || 50) - (b.score || 50));
        setRankedList(sorted.slice(0, 5));

        const rankTimer = setTimeout(() => {
          // Re-sort with top incident taking position #1
          const finalSorted = [...demoIncidents].sort((a, b) => (b.score || 50) - (a.score || 50));
          setRankedList(finalSorted.slice(0, 5));
          setSubStep(2); // Move to Priority Queue Hold
        }, baseDelay(1500));

        return () => clearTimeout(rankTimer);
      } else if (subStep === 2) {
        // Step 2: Final Queue Hold (HOLD FOR 4.5 SECONDS)
        timerRef.current = setTimeout(() => {
          setSubStep(3); // Begin Why #1 progressive breakdown
        }, baseDelay(4500));
      } else if (subStep === 3) {
        // Step 3: Progressive Reveal of 8 Risk Contributors (3 sec)
        let factor = 0;
        const factorInterval = setInterval(() => {
          factor += 1;
          setRevealedFactorCount(factor);
          if (factor >= 8) {
            clearInterval(factorInterval);
            setSubStep(4); // Move to Why #1 Hold
          }
        }, baseDelay(380));

        return () => clearInterval(factorInterval);
      } else if (subStep === 4) {
        // HOLD FOR 5.0 SECONDS on Why #1 Breakdown
        timerRef.current = setTimeout(() => {
          setActiveSection(4);
          setSubStep(1);
        }, baseDelay(5000));
      }
    }

    // =======================================================
    // SECTION 4: ATTACK CHAIN + BLAST + DEFENSE + CONTAINMENT
    // =======================================================
    else if (activeSection === 4) {
      if (subStep === 1) {
        // Step 1: Reveal Attack Chain progressively (2.5 sec)
        let chainIndex = 0;
        const chainInterval = setInterval(() => {
          chainIndex += 1;
          setChainRevealCount(chainIndex);
          if (chainIndex >= 6) {
            clearInterval(chainInterval);
            setSubStep(2); // Hold on Attack Chain
          }
        }, baseDelay(450));

        return () => clearInterval(chainInterval);
      } else if (subStep === 2) {
        // HOLD FOR 4.5 SECONDS on Attack Chain
        timerRef.current = setTimeout(() => {
          setSubStep(3); // Expand Blast Radius
        }, baseDelay(4500));
      } else if (subStep === 3) {
        // Step 2: Blast Radius Expansion (1.5 sec)
        setBlastExpanded(true);
        timerRef.current = setTimeout(() => {
          setSubStep(4); // Hold on Blast Radius
        }, baseDelay(1500));
      } else if (subStep === 4) {
        // HOLD FOR 4.0 SECONDS on Blast Radius
        timerRef.current = setTimeout(() => {
          setSubStep(5); // Reveal Defensive Actions
        }, baseDelay(4000));
      } else if (subStep === 5) {
        // Step 3: Reveal Defensive Response Actions (1.8 sec)
        let act = 0;
        const actInterval = setInterval(() => {
          act += 1;
          setDefenseActionsCount(act);
          if (act >= 4) {
            clearInterval(actInterval);
            setSubStep(6); // Hold on Defensive Actions
          }
        }, baseDelay(450));

        return () => clearInterval(actInterval);
      } else if (subStep === 6) {
        // HOLD FOR 4.0 SECONDS on Defensive Actions
        timerRef.current = setTimeout(() => {
          setSubStep(7); // Trigger Containment Simulation
        }, baseDelay(4000));
      } else if (subStep === 7) {
        // Step 4: Simulate Containment Execution (2.2 sec)
        setContainmentState('animating');
        timerRef.current = setTimeout(() => {
          setContainmentState('contained');
          setSubStep(8); // Final 5s Hold
        }, baseDelay(2200));
      } else if (subStep === 8) {
        // FINAL HOLD FOR 5.5 SECONDS
        timerRef.current = setTimeout(() => {
          setIsPlaying(false); // Finished entire presentation!
        }, baseDelay(5500));
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeSection, subStep, isOpen, isPlaying, speed, demoAlerts, demoIncidents]);

  const handleNextStep = useCallback(() => {
    if (activeSection === 1) {
      if (subStep < 3) setSubStep(3);
      else { setActiveSection(2); setSubStep(1); }
    } else if (activeSection === 2) {
      if (subStep < 3) setSubStep(3);
      else { setActiveSection(3); setSubStep(1); }
    } else if (activeSection === 3) {
      if (subStep < 4) setSubStep(subStep === 1 ? 2 : 4);
      else { setActiveSection(4); setSubStep(1); }
    } else if (activeSection === 4) {
      if (subStep < 8) setSubStep(subStep >= 7 ? 8 : subStep + 2);
    }
  }, [activeSection, subStep]);

  const handlePrevStep = useCallback(() => {
    if (subStep > 1) {
      setSubStep(Math.max(1, subStep - 1));
    } else if (activeSection > 1) {
      setActiveSection(activeSection - 1);
      setSubStep(1);
    }
  }, [activeSection, subStep]);

  const handleJumpToSection = useCallback((secNum) => {
    setActiveSection(secNum);
    setSubStep(1);
    setIsPlaying(true);
    if (secNum === 1) {
      setStreamedAlertCount(12);
    } else if (secNum === 2) {
      setStreamedAlertCount(120);
      setAnalyzingStage('idle');
    } else if (secNum === 3) {
      setStreamedAlertCount(120);
      setRankedList(demoIncidents.slice(0, 5));
      setRevealedFactorCount(0);
    } else if (secNum === 4) {
      setChainRevealCount(0);
      setBlastExpanded(false);
      setDefenseActionsCount(0);
      setContainmentState('pre');
    }
  }, [demoIncidents]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key >= '1' && e.key <= '4') {
        handleJumpToSection(Number(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextStep, handlePrevStep, handleJumpToSection, onClose]);

  if (!isOpen) return null;

  // Teleprompter Speaking Line Selector
  const getPresenterScript = () => {
    if (activeSection === 1) {
      if (subStep === 3) {
        return {
          cue: "PRESENTER SCRIPT (Hold):",
          text: '"This is the problem a SOC analyst faces — hundreds of alerts arriving at the same time, burying critical breaches in noise."',
          holdSec: 5
        };
      }
      return {
        cue: "PRESENTER SCRIPT:",
        text: '"Watch our security sensor environment ingest raw telemetry across firewalls, endpoints, and identity gateways in real time..."',
        holdSec: 3
      };
    } else if (activeSection === 2) {
      if (subStep === 3) {
        return {
          cue: "PRESENTER SCRIPT (Hold):",
          text: '"Instead of treating every alert independently, CyberShield correlates related alerts and converts multiple alerts into meaningful incidents."',
          holdSec: 5
        };
      }
      return {
        cue: "PRESENTER SCRIPT:",
        text: '"The correlation engine analyzes temporal clustering, shared attacker IPs, and MITRE stage transitions to link multi-stage attacks..."',
        holdSec: 3
      };
    } else if (activeSection === 3) {
      if (subStep === 2) {
        return {
          cue: "PRESENTER SCRIPT (Queue Hold):",
          text: '"Now the system has converted the noise into a clear, explainable priority queue ranked by actual danger, not just loudness."',
          holdSec: 5
        };
      }
      if (subStep === 4) {
        return {
          cue: "PRESENTER SCRIPT (Why #1 Hold):",
          text: '"This incident is number one not simply because it has the highest severity. The system considers the critical asset, sensitive data, attack confidence, attack progression, correlation and anomaly signal."',
          holdSec: 5
        };
      }
      return {
        cue: "PRESENTER SCRIPT:",
        text: '"Let us look inside incident INC-0057 to understand why our engine ranked it #1 above all other alerts..."',
        holdSec: 3
      };
    } else if (activeSection === 4) {
      if (subStep === 2) {
        return {
          cue: "PRESENTER SCRIPT (Attack Chain Hold):",
          text: '"This is the attack story reconstructed from multiple related alerts spanning from initial phishing to database exfiltration."',
          holdSec: 5
        };
      }
      if (subStep === 4) {
        return {
          cue: "PRESENTER SCRIPT (Blast Radius Hold):",
          text: '"This also shows the potential blast radius if the incident is allowed to continue — 3 servers and 5,000 compromised customer records."',
          holdSec: 4
        };
      }
      if (subStep === 6) {
        return {
          cue: "PRESENTER SCRIPT (Defense Hold):",
          text: '"CyberShield does not stop at prioritization. It automatically recommends the next sequential defensive actions."',
          holdSec: 4
        };
      }
      if (subStep === 8) {
        return {
          cue: "PRESENTER SCRIPT (Final Climax):",
          text: '"So we do not just identify the most dangerous incident. We show what action can be taken and how that action reduces the risk."',
          holdSec: 5
        };
      }
      return {
        cue: "PRESENTER SCRIPT:",
        text: '"Simulating containment on this attack chain to validate defensive impact in memory before executing in production..."',
        holdSec: 3
      };
    }
    return { cue: "PRESENTER SCRIPT:", text: 'Follow the guided live demo sequence.', holdSec: 0 };
  };

  const script = getPresenterScript();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-3 sm:p-5 animate-fadeIn font-sans select-none text-[#f0eae4]">
      <div className="w-full max-w-6xl bg-[#24202b] border border-[#5ec8c0]/40 rounded-2xl shadow-[0_0_60px_rgba(94,200,192,0.25)] flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* TOP CINEMATIC HEADER BAR */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#2d2736] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-[#e8a87c] to-[#5ec8c0] flex items-center justify-center text-[#1c1921] font-bold shadow-[0_0_16px_rgba(94,200,192,0.3)]">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-bold text-[#f0eae4] tracking-wider uppercase">
                  CyberShield SOC — Live Presentation Theatre
                </h2>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-[#5ec8c0]/20 text-[#5ec8c0] border border-[#5ec8c0]/40">
                  DEMO PACING MODE
                </span>
              </div>
              <p className="text-[11px] text-[#a69c93] font-sans">
                4-Stage Cinematic Presentation with 4–5s Deliberate Holds for Judge Comprehension
              </p>
            </div>
          </div>

          {/* Master Playback & Pacing Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-[#1e1a24] p-1 rounded-xl border border-white/10 text-xs font-mono">
              <button
                onClick={handlePrevStep}
                title="Previous step (Left Arrow)"
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#a69c93] hover:text-[#f0eae4] transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(p => !p)}
                title={isPlaying ? 'Pause Pacing (Spacebar)' : 'Resume Pacing (Spacebar)'}
                className="px-2.5 py-1.5 rounded-lg bg-[#5ec8c0]/20 text-[#5ec8c0] hover:bg-[#5ec8c0]/30 font-bold transition flex items-center gap-1.5 border border-[#5ec8c0]/40"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={handleNextStep}
                title="Next step (Right Arrow)"
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#a69c93] hover:text-[#f0eae4] transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleReset}
                title="Restart Presentation from Beginning"
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#a69c93] hover:text-[#f0eae4] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSpeed(s => (s === 1 ? 2 : 1))}
                title="Toggle Normal 1x / Fast 2x Speed"
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#5ec8c0] hover:bg-white/5 transition"
              >
                {speed}x
              </button>
            </div>

            <button
              onClick={() => setShowTeleprompter(s => !s)}
              title="Toggle Presenter Speaking Script Prompter"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition hidden sm:flex items-center gap-1 ${
                showTeleprompter
                  ? 'bg-[#e8a87c]/15 text-[#e8a87c] border-[#e8a87c]/40'
                  : 'bg-[#1e1a24] text-[#a69c93] border-white/10'
              }`}
            >
              <span>Script Cue</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#a69c93] hover:text-[#f0eae4] hover:bg-white/5 transition"
              title="Exit to SOC Command Center (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4-SECTION PROGRESS STEPPER TABS */}
        <div className="grid grid-cols-4 border-b border-white/10 bg-[#1e1a24] text-xs font-mono">
          <button
            onClick={() => handleJumpToSection(1)}
            className={`p-3 text-left border-r border-white/10 transition-all flex flex-col gap-0.5 ${
              activeSection === 1
                ? 'bg-[#5ec8c0]/15 text-[#5ec8c0] border-b-2 border-b-[#5ec8c0] font-bold'
                : 'text-[#a69c93] hover:bg-white/5 hover:text-[#f0eae4]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>1. ALERT CHAOS</span>
              <span className="text-[10px] opacity-75">{streamedAlertCount} Alarms</span>
            </div>
            <div className="text-[10px] font-sans truncate text-[#a69c93]">
              Raw Ingestion Flood (4-5s Hold)
            </div>
          </button>

          <button
            onClick={() => handleJumpToSection(2)}
            className={`p-3 text-left border-r border-white/10 transition-all flex flex-col gap-0.5 ${
              activeSection === 2
                ? 'bg-[#e8a87c]/15 text-[#e8a87c] border-b-2 border-b-[#e8a87c] font-bold'
                : 'text-[#a69c93] hover:bg-white/5 hover:text-[#f0eae4]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>2. CORRELATION</span>
              <span className="text-[10px] opacity-75">120 → 12</span>
            </div>
            <div className="text-[10px] font-sans truncate text-[#a69c93]">
              Attack Graph Fusion (4-5s Hold)
            </div>
          </button>

          <button
            onClick={() => handleJumpToSection(3)}
            className={`p-3 text-left border-r border-white/10 transition-all flex flex-col gap-0.5 ${
              activeSection === 3
                ? 'bg-[#efa95f]/15 text-[#efa95f] border-b-2 border-b-[#efa95f] font-bold'
                : 'text-[#a69c93] hover:bg-white/5 hover:text-[#f0eae4]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>3. PRIORITY & WHY #1</span>
              <span className="text-[10px] opacity-75">Risk 98.5</span>
            </div>
            <div className="text-[10px] font-sans truncate text-[#a69c93]">
              Queue Ranking + 8 Factors
            </div>
          </button>

          <button
            onClick={() => handleJumpToSection(4)}
            className={`p-3 text-left transition-all flex flex-col gap-0.5 ${
              activeSection === 4
                ? 'bg-[#8fbf9f]/15 text-[#8fbf9f] border-b-2 border-b-[#8fbf9f] font-bold'
                : 'text-[#a69c93] hover:bg-white/5 hover:text-[#f0eae4]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>4. DEFENSE & CONTAINMENT</span>
              <span className="text-[10px] opacity-75">-57% Risk</span>
            </div>
            <div className="text-[10px] font-sans truncate text-[#a69c93]">
              Attack Path → Containment
            </div>
          </button>
        </div>

        {/* DYNAMIC PRESENTATION STAGE VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#1c1921]">
          
          {/* ======================================================== */}
          {/* SECTION 1 VIEW: ALERT CHAOS & PROGRESSIVE STREAM FLOOD */}
          {/* ======================================================== */}
          {activeSection === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Big Ingestion Counter Card */}
                <div className="p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-3 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#5ec8c0] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#5ec8c0]" />
                      <span>TELEMETRY INGESTION RATE</span>
                    </div>
                    <div className="text-5xl font-mono font-extrabold text-[#f0eae4] mt-3 flex items-baseline gap-2">
                      <span className="text-[#5ec8c0]">{streamedAlertCount}</span>
                      <span className="text-xs font-sans text-[#a69c93]">/ 120 sensor alarms</span>
                    </div>
                    <p className="text-xs text-[#a69c93] font-sans mt-2">
                      Raw security events streaming in from network firewalls, endpoint EDR, and identity access logs.
                    </p>
                  </div>

                  {subStep === 3 && (
                    <div className="p-3 rounded-xl bg-[#e88080]/15 border border-[#e88080]/40 text-[#e88080] text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>ALERT FLOOD COMPLETE: 120 ALARMS IN QUEUE (HOLDING)</span>
                    </div>
                  )}
                </div>

                {/* Live Ingestion Feed */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-mono">
                    <span className="text-[#f0eae4] font-bold">RAW INCOMING SENSOR ALARMS (LIVE STREAM)</span>
                    <span className="flex items-center gap-1.5 text-[#5ec8c0] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#5ec8c0] animate-ping"></span>
                      STREAMING
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-mono text-xs">
                    {recentStreamedAlerts.map((alt, idx) => (
                      <div
                        key={alt.id || alt.alert_id || idx}
                        className="p-2.5 rounded-xl bg-[#1e1a24] border border-white/5 flex items-center justify-between animate-fadeIn hover:border-white/15 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-2 h-2 rounded-full ${
                            alt.severity >= 80 ? 'bg-[#e88080]' : alt.severity >= 60 ? 'bg-[#efa95f]' : 'bg-[#5ec8c0]'
                          }`}></span>
                          <span className="font-bold text-[#f0eae4] uppercase truncate max-w-[170px]">
                            {alt.alert_type?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[#a69c93] truncate max-w-[150px]">
                            on {alt.asset}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#a69c93]">
                            Sev {alt.severity || 60}
                          </span>
                          <span className="text-[10px] font-bold text-[#5ec8c0] uppercase px-2 py-0.5 rounded bg-[#5ec8c0]/15 border border-[#5ec8c0]/30">
                            {alt.attack_stage || 'telemetry'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2 VIEW: CORRELATION & INCIDENT GROUPING */}
          {/* ======================================================== */}
          {activeSection === 2 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Step 1 & 2 Status Banner */}
              <div className="p-4 rounded-2xl bg-[#24202b] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e8a87c]/15 border border-[#e8a87c]/40 flex items-center justify-center text-[#e8a87c]">
                    <GitMerge className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-[#e8a87c] uppercase tracking-wider">
                      {analyzingStage === 'analyzing'
                        ? 'ANALYZING ALERTS & TEMPORAL PATTERNS...'
                        : analyzingStage === 'connecting'
                        ? 'CONNECTING MULTI-STAGE ATTACK CHAINS...'
                        : 'GRAPH CORRELATION COMPLETE: 12 ACTIONABLE THREATS'}
                    </div>
                    <p className="text-xs text-[#a69c93] font-sans mt-0.5">
                      Fusing alerts sharing source IP <code className="text-[#5ec8c0]">198.51.100.45</code> across 30-minute threat window.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-[#1e1a24] border border-white/10 text-center">
                    <span className="text-[10px] text-[#a69c93] block">RAW NOISE</span>
                    <strong className="text-[#f0eae4] text-sm">120 Alerts</strong>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5ec8c0]" />
                  <div className="p-2.5 rounded-xl bg-[#e8a87c]/15 border border-[#e8a87c]/40 text-center">
                    <span className="text-[10px] text-[#e8a87c] block font-bold">REAL THREATS</span>
                    <strong className="text-[#e8a87c] text-sm font-extrabold">12 Incidents</strong>
                  </div>
                </div>
              </div>

              {/* Visual Attack Chain Connection Progression */}
              <div className="p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-4 shadow-md">
                <div className="text-xs font-mono font-bold text-[#f0eae4] uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
                  <span>Attack Trajectory Correlation Chain (INC-0057)</span>
                  <span className="text-[#5ec8c0] text-[11px]">Same Attacker IP • 28 Min Span</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[
                    { stage: 'Reconnaissance', label: 'Port Scanning (T1046)', asset: 'MAIL-GW-02', color: '#8fbf9f' },
                    { stage: 'Initial Access', label: 'Phishing Foothold (T1566)', asset: 'WKS-EXEC-002', color: '#5ec8c0' },
                    { stage: 'Privilege Escalation', label: 'Root Exploit (T1068)', asset: 'DC-01', color: '#efa95f' },
                    { stage: 'Lateral Movement', label: 'SSH Pivot (T1021)', asset: 'FIN-SERVER-03', color: '#e8a87c' },
                    { stage: 'Exfiltration', label: 'C2 Data Theft (T1041)', asset: 'PROD-DB-CUSTOMER-01', color: '#e88080' }
                  ].map((st, i) => {
                    const isVisible = activeChainStepIndex >= i + 1 || analyzingStage === 'grouped';
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border transition-all duration-300 space-y-1.5 ${
                          isVisible
                            ? 'bg-[#1e1a24] border-[#5ec8c0]/50 shadow-md transform scale-100 opacity-100'
                            : 'bg-[#1e1a24]/30 border-white/5 opacity-30 transform scale-95'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className="text-[#a69c93]">STEP {i + 1}</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }}></span>
                        </div>
                        <div className="font-mono text-xs font-bold text-[#f0eae4] truncate">
                          {st.stage}
                        </div>
                        <div className="text-[10px] text-[#5ec8c0] truncate font-sans">
                          {st.label}
                        </div>
                        <div className="text-[10px] text-[#a69c93] truncate font-mono">
                          {st.asset}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3 VIEW: PRIORITY QUEUE RANKING & WHY #1 DEEP DIVE */}
          {/* ======================================================== */}
          {activeSection === 3 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Queue Reordering & Top Incident Hero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ranked Incident Queue Column */}
                <div className="p-4 rounded-2xl bg-[#24202b] border border-white/10 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 font-mono text-xs">
                    <span className="text-[#f0eae4] font-bold">PRIORITY QUEUE</span>
                    <span className="text-[#5ec8c0] font-bold">TOP 5 RANKED</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {rankedList.map((inc, i) => (
                      <div
                        key={inc.incident_id || i}
                        className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                          i === 0
                            ? 'bg-[#e88080]/15 border-[#e88080]/50 shadow-[0_0_14px_rgba(232,128,128,0.2)] font-bold'
                            : 'bg-[#1e1a24] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            inc.priority_bucket === 'P1' ? 'bg-[#e88080]/20 text-[#e88080]' : 'bg-[#efa95f]/20 text-[#efa95f]'
                          }`}>
                            {inc.priority_bucket}
                          </span>
                          <span className="text-[#f0eae4] font-bold">{inc.incident_id}</span>
                          <span className="text-[10px] text-[#a69c93] truncate max-w-[90px]">{inc.alerts?.[0]?.asset}</span>
                        </div>
                        <span className={`text-sm font-extrabold ${i === 0 ? 'text-[#e88080]' : 'text-[#f0eae4]'}`}>
                          {inc.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deep Dive Why #1 Panel */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5ec8c0]" />
                      <h3 className="font-mono text-xs font-bold text-[#f0eae4] uppercase tracking-wider">
                        EXPLAINABLE AI: WHY IS INC-0057 RANKED #1?
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#e88080]/15 text-[#e88080] border border-[#e88080]/40 text-[10px] font-mono font-bold">
                      SCORE: 98.5 / 100 (P1 CRITICAL)
                    </span>
                  </div>

                  {/* 8 Progressive Risk Contributors */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                    {[
                      { label: 'Severity', val: '98%', desc: 'Vendor CVSS', icon: ShieldAlert },
                      { label: 'Asset Criticality', val: '95 / 100', desc: 'Crown Jewel Database', icon: Lock },
                      { label: 'Data Sensitivity', val: '98 / 100', desc: 'Customer PII Records', icon: Layers },
                      { label: 'Attack Confidence', val: '96%', desc: 'Verified Threat Fidelity', icon: CheckCircle2 },
                      { label: 'Stage Multiplier', val: '2.2x', desc: 'Exfiltration Stage', icon: Flame },
                      { label: 'Correlation Boost', val: '+6.50', desc: '5 Multi-Stage Links', icon: GitMerge },
                      { label: 'Recency Momentum', val: '+5.00', desc: 'Active Rapid Bursts', icon: Activity },
                      { label: 'ML Anomaly Signal', val: 'CONFIRMED', desc: 'Isolation Forest Match', icon: Cpu }
                    ].map((factor, i) => {
                      const isRevealed = revealedFactorCount >= i + 1 || subStep >= 4;
                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border transition-all duration-300 space-y-1 ${
                            isRevealed
                              ? 'bg-[#1e1a24] border-[#5ec8c0]/40 shadow-xs opacity-100 transform scale-100'
                              : 'bg-[#1e1a24]/30 border-white/5 opacity-20 transform scale-95'
                          }`}
                        >
                          <div className="text-[10px] text-[#a69c93] uppercase font-bold truncate">
                            {factor.label}
                          </div>
                          <div className="text-sm font-extrabold text-[#5ec8c0]">
                            {factor.val}
                          </div>
                          <div className="text-[9px] text-[#a69c93] truncate font-sans">
                            {factor.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Math Score Build-Up Box */}
                  <div className="p-3 rounded-xl bg-[#1e1a24] border border-white/10 font-mono text-xs flex items-center justify-around text-center">
                    <div>
                      <span className="text-[10px] text-[#a69c93]">BASE RISK</span>
                      <div className="font-bold text-[#f0eae4] text-sm">55.4</div>
                    </div>
                    <div className="text-[#a69c93]">× 2.2 Stage</div>
                    <div>
                      <span className="text-[10px] text-[#5ec8c0]">STAGE ADJ</span>
                      <div className="font-bold text-[#5ec8c0] text-sm">121.8</div>
                    </div>
                    <div className="text-[#a69c93]">+ 6.5 Chain</div>
                    <div>
                      <span className="text-[10px] text-[#e88080] font-bold">FINAL SCORE</span>
                      <div className="font-extrabold text-[#e88080] text-sm">98.5</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4 VIEW: ATTACK CHAIN + BLAST + DEFENSE + CONTAIN */}
          {/* ======================================================== */}
          {activeSection === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Reconstructed Attack Story & Blast Radius */}
                <div className="p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 font-mono text-xs">
                    <span className="text-[#f0eae4] font-bold flex items-center gap-2">
                      <GitMerge className="w-4 h-4 text-[#e8a87c]" />
                      <span>RECONSTRUCTED ATTACK PATH (INC-0057)</span>
                    </span>
                    <span className="text-[#e8a87c] text-[10px] font-bold">MULTI-HOST SEQUENCE</span>
                  </div>

                  {/* Sequential Chain Reveal */}
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      { node: 'User Account (jsmith)', role: 'Identity Entrypoint', stage: 'Initial Access' },
                      { node: 'Workstation (WKS-EXEC-002)', role: 'Executive Laptop', stage: 'Foothold' },
                      { node: 'Primary Domain Controller (DC-01)', role: 'Privilege Escalation', stage: 'Root Admin' },
                      { node: 'Financial Server (FIN-SERVER-03)', role: 'Lateral Pivot', stage: 'Lateral Move' },
                      { node: 'Customer Database (PROD-DB-CUSTOMER-01)', role: 'Crown Jewel', stage: 'Exfiltration' },
                      { node: 'Command & Control (198.51.100.99)', role: 'Attacker Endpoint', stage: 'C2 Exfiltration' }
                    ].map((step, i) => {
                      const isRevealed = chainRevealCount >= i + 1 || subStep >= 2;
                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                            isRevealed
                              ? 'bg-[#1e1a24] border-[#e8a87c]/40 text-[#f0eae4] opacity-100'
                              : 'bg-[#1e1a24]/30 border-white/5 text-[#7d736b] opacity-20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#e8a87c]/20 text-[#e8a87c] font-bold text-[10px] flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-bold text-xs">{step.node}</div>
                              <div className="text-[10px] text-[#a69c93] font-sans">{step.role}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#e8a87c] uppercase px-2 py-0.5 rounded bg-white/5">
                            {step.stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Blast Radius Expansion Indicator */}
                  {blastExpanded && (
                    <div className="p-3.5 rounded-xl bg-[#e88080]/15 border border-[#e88080]/40 space-y-1.5 animate-fadeIn font-mono text-xs">
                      <div className="flex items-center justify-between text-[#e88080] font-bold">
                        <span>ESTIMATED BLAST RADIUS IMPACT</span>
                        <span className="text-xs">HIGH EXPOSURE</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-1">
                        <div className="p-1.5 rounded bg-[#24202b]"><span className="text-[#f0eae4] font-bold">1</span> Host</div>
                        <div className="p-1.5 rounded bg-[#24202b]"><span className="text-[#f0eae4] font-bold">3</span> Servers</div>
                        <div className="p-1.5 rounded bg-[#24202b]"><span className="text-[#f0eae4] font-bold">2</span> DBs</div>
                        <div className="p-1.5 rounded bg-[#24202b]"><span className="text-[#e88080] font-extrabold">5,000</span> Users</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Defensive Response & Live Containment Simulator */}
                <div className="p-5 rounded-2xl bg-[#24202b] border border-white/10 space-y-4 shadow-md flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 font-mono text-xs">
                      <span className="text-[#f0eae4] font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8fbf9f]" />
                        <span>AUTOMATED DEFENSIVE PLAYBOOK</span>
                      </span>
                      <span className="text-[#8fbf9f] text-[10px] font-bold">ORCHESTRATION</span>
                    </div>

                    {/* Sequential Defensive Steps */}
                    <div className="space-y-2 font-mono text-xs">
                      {[
                        'ISOLATE ENDPOINT (PROD-DB-CUSTOMER-01) FROM NETWORK',
                        'REVOKE COMPROMISED USER SESSIONS & RESET TOKENS',
                        'BLOCK DESTINATION C2 IP (198.51.100.99) AT FIREWALL',
                        'PRESERVE FORENSIC MEMORY DUMP & AUDIT SNAPSHOT'
                      ].map((action, i) => {
                        const isActionVisible = defenseActionsCount >= i + 1 || subStep >= 6;
                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2.5 ${
                              isActionVisible
                                ? 'bg-[#1e1a24] border-[#8fbf9f]/40 text-[#8fbf9f] font-semibold opacity-100'
                                : 'bg-[#1e1a24]/30 border-white/5 text-[#7d736b] opacity-20'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-[#8fbf9f]/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                            <span className="text-xs">{action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Containment Simulation Climax Box */}
                  <div className="p-4 rounded-2xl bg-[#1e1a24] border border-white/10 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-[#5ec8c0] font-bold">CONTAINMENT SIMULATION CLIMAX</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        containmentState === 'contained'
                          ? 'bg-[#8fbf9f]/20 text-[#8fbf9f] border border-[#8fbf9f]/40'
                          : 'bg-[#e88080]/20 text-[#e88080] border border-[#e88080]/40'
                      }`}>
                        {containmentState === 'contained' ? 'THREAT CONTAINED' : 'UNCONTAINED EXPOSURE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-[#24202b] border border-white/10">
                        <div className="text-[10px] text-[#a69c93]">BEFORE ISOLATION</div>
                        <div className="text-xl font-extrabold text-[#e88080] mt-1">98.5 (P1)</div>
                        <div className="text-[10px] text-[#e88080]">Active Exfiltration</div>
                      </div>

                      <div className={`p-3 rounded-xl border transition-all duration-500 ${
                        containmentState === 'contained'
                          ? 'bg-[#8fbf9f]/15 border-[#8fbf9f]/40 text-[#8fbf9f]'
                          : 'bg-[#24202b] border-white/10 text-[#7d736b]'
                      }`}>
                        <div className="text-[10px] font-bold">AFTER CONTAINMENT</div>
                        <div className="text-xl font-extrabold mt-1">
                          {containmentState === 'contained' ? '42.1 (P3)' : '...'}
                        </div>
                        <div className="text-[10px] font-bold">
                          {containmentState === 'contained' ? '-57.2% Danger Drop' : 'Pending Action'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM PRESENTER TELEPROMPTER & SCRIPT BAR */}
        {showTeleprompter && (
          <div className="p-4 border-t border-white/10 bg-[#2d2736] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e8a87c]/15 border border-[#e8a87c]/40 flex items-center justify-center text-[#e8a87c] shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold text-[#e8a87c] uppercase tracking-wider flex items-center gap-2">
                  <span>{script.cue}</span>
                  {script.holdSec > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-white/5 text-[#a69c93] border border-white/10 font-normal">
                      {script.holdSec}s Hold
                    </span>
                  )}
                </div>
                <p className="text-sm font-sans font-medium text-[#f0eae4] mt-0.5 leading-snug">
                  {script.text}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#5ec8c0] hover:bg-[#4eb8b0] text-[#1c1921] font-mono font-bold text-xs tracking-wider transition shrink-0 shadow-[0_0_14px_rgba(94,200,192,0.25)] flex items-center gap-1.5"
            >
              <span>EXPLORE LIVE IN SOC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function generateFallbackAlerts() {
  const assets = ['PROD-DB-CUSTOMER-01', 'FIN-SERVER-03', 'DC-01', 'VPN-GW-01', 'WKS-EXEC-002', 'MAIL-GW-02'];
  const alertTypes = ['Suspicious Login', 'Malware Dropper', 'Port Scan', 'Brute Force', 'Privilege Escalation', 'Data Exfiltration'];
  const stages = ['reconnaissance', 'initial_access', 'privilege_escalation', 'lateral_movement', 'exfiltration'];
  return Array.from({ length: 120 }, (_, i) => ({
    id: `ALT-${1000 + i}`,
    alert_type: alertTypes[i % alertTypes.length],
    asset: assets[i % assets.length],
    attack_stage: stages[i % stages.length],
    severity: 45 + (i % 55)
  }));
}

function generateFallbackIncidents() {
  return [
    { incident_id: 'INC-0057', priority_bucket: 'P1', score: 98.5, summary: 'Data exfiltration attack chain on Customer Database', alerts: [{ asset: 'PROD-DB-CUSTOMER-01' }] },
    { incident_id: 'INC-0082', priority_bucket: 'P1', score: 91.2, summary: 'Lateral movement and privilege escalation on Domain Controller', alerts: [{ asset: 'DC-01' }] },
    { incident_id: 'INC-0094', priority_bucket: 'P2', score: 79.4, summary: 'Brute force credential attack on Corporate VPN Gateway', alerts: [{ asset: 'VPN-GW-01' }] },
    { incident_id: 'INC-0104', priority_bucket: 'P3', score: 58.0, summary: 'Suspicious process execution on Developer Workstation', alerts: [{ asset: 'DEV-BUILD-02' }] },
    { incident_id: 'INC-0112', priority_bucket: 'P4', score: 32.0, summary: 'Routine port scan telemetry on External Gateway', alerts: [{ asset: 'EXT-GW-01' }] }
  ];
}
