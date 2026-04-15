import { useState, useEffect } from 'react';
import './App.css';
import UploadZone from './components/UploadZone.jsx';
import ProcessingStatus from './components/ProcessingStatus.jsx';
import ReportPreview from './components/ReportPreview.jsx';
import ExportButton from './components/ExportButton.jsx';

const SECTION_NAMES = [
  'executive_summary', 'incident_snapshot', 'attack_timeline',
  'technical_analysis', 'impact_assessment', 'recommendations',
];

// ── Logo ──────────────────────────────────────────────────────────────────────

function IrisLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      {/* Incident funnel / eye motif */}
      <ellipse cx="14" cy="14" rx="7" ry="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" fill="none"/>
      <circle cx="14" cy="14" r="2.5" fill="white" fillOpacity="0.9"/>
      <line x1="14" y1="5" x2="14" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="20" x2="14" y2="23" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ step }) {
  const steps = [
    { n: 1, label: 'Input' },
    { n: 2, label: 'Extract' },
    { n: 3, label: 'Review & Export' },
  ];
  return (
    <div className="steps-bar">
      {steps.map((s, i) => (
        <div key={s.n} style={{display:'flex', alignItems:'center'}}>
          <div className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
            <span className="step-num">{step > s.n ? '✓' : s.n}</span>
            {s.label}
          </div>
          {i < steps.length - 1 && <span className="step-arrow">›</span>}
        </div>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]                 = useState(1);
  const [ingestData, setIngestData]     = useState(null);
  const [sectionStatus, setSectionStatus] = useState({});
  const [report, setReport]             = useState(null);
  const [sources, setSources]           = useState([]);
  const [error, setError]               = useState(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/health').catch(() => {});
  }, []);

  // ── Step 1: Ingest ──────────────────────────────────────────────────────────
  async function handleIngest(formData) {
    setError(null);
    setIngestLoading(true);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingest failed');
      setIngestData(data);
      setSources(data.sources || []);
      setStep(2);
      startProcessing();
    } catch (err) {
      setError(err.message);
    } finally {
      setIngestLoading(false);
    }
  }

  // ── Step 2: Process (SSE) ───────────────────────────────────────────────────
  function startProcessing() {
    const initStatus = {};
    SECTION_NAMES.forEach(s => { initStatus[s] = 'pending'; });
    setSectionStatus(initStatus);
    setReport(null);
    setError(null);

    const es = new EventSource('/api/process');
    const sectionErrors = {};

    es.addEventListener('progress', e => {
      const { section, status } = JSON.parse(e.data);
      setSectionStatus(prev => ({ ...prev, [section]: status }));
    });

    es.addEventListener('error', e => {
      // Named SSE error event from the server (section-level failure)
      try {
        const { section, message } = JSON.parse(e.data);
        sectionErrors[section] = message;
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
      } catch {
        // not a named event — ignore, handled by complete
      }
    });

    es.addEventListener('complete', e => {
      const { report: r, errors } = JSON.parse(e.data);
      es.close();

      const allFailed = Object.keys(r).length === 0;
      if (allFailed) {
        // Surface the most informative error (first one)
        const firstError = Object.values(errors || sectionErrors)[0] || 'All sections failed.';
        if (firstError.includes('401') || firstError.includes('invalid x-api-key') || firstError.includes('authentication')) {
          setError('API key is invalid. Open backend/.env and replace the placeholder with your real Anthropic API key, then restart the server.');
        } else {
          setError(`Processing failed: ${firstError}`);
        }
        return;
      }

      setReport(r);
      if (Object.keys(errors || {}).length > 0) {
        setError(`${Object.keys(errors).length} section(s) could not be extracted and were skipped.`);
      }
      setStep(3);
    });

    es.onerror = () => {
      // Only fires if the connection itself drops (server not running, network error)
      // If we already have section errors, those are more useful
      const hasErrors = Object.keys(sectionErrors).length > 0;
      if (!hasErrors) {
        setError('Cannot reach the backend. Make sure the server is running on port 3002.');
      }
      es.close();
    };
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  async function handleReset() {
    await fetch('/api/reset', { method: 'POST' }).catch(() => {});
    setStep(1);
    setIngestData(null);
    setSectionStatus({});
    setReport(null);
    setError(null);
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <IrisLogo />
          <div>
            <div className="header-logo">IRIS</div>
            <div className="header-tagline">Incident Response Intelligence Summary</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          {step === 3 && report && (
            <ExportButton report={report} sources={sources} />
          )}
          {step > 1 && (
            <button className="btn-secondary" style={{fontSize:12}} onClick={handleReset}>
              New Incident
            </button>
          )}
          <span className="header-badge">LOCAL · PRIVATE</span>
        </div>
      </header>

      {/* Steps */}
      <Steps step={step} />

      {/* Main */}
      <main className="main">
        {error && <div className="error-banner">⚠ {error}</div>}

        {step === 1 && (
          <UploadZone onIngest={handleIngest} loading={ingestLoading} />
        )}

        {step === 2 && (
          <ProcessingStatus
            sectionStatus={sectionStatus}
            ingestData={ingestData}
            onReset={handleReset}
          />
        )}

        {step === 3 && report && (
          <div>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom: 16, padding:'10px 14px',
              background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8,
            }}>
              <div style={{fontSize:13, color:'#15803d', fontWeight:600}}>
                ✓ Report generated from {sources.join(', ')}
              </div>
              <ExportButton report={report} sources={sources} />
            </div>
            <ReportPreview report={report} />
          </div>
        )}
      </main>
    </div>
  );
}
