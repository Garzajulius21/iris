import { openPdfReport, openExecutivePdf } from '../lib/generateIrisPdf.js';

export default function ExportButton({ report, sources }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn-export"
        onClick={() => openExecutivePdf({ report })}
        title="3-page brief for CISO and senior leadership"
        style={{ background: '#0f2341' }}
      >
        <span>⬇</span>
        Executive Brief
      </button>
      <button
        className="btn-export"
        onClick={() => openPdfReport({ report, sources })}
        title="Full technical report with IOCs, MITRE ATT&CK, and timeline"
        style={{ background: '#1a56db' }}
      >
        <span>⬇</span>
        Technical Report
      </button>
    </div>
  );
}
