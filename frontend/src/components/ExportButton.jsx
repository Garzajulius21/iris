import { openPdfReport } from '../lib/generateIrisPdf.js';

export default function ExportButton({ report, sources }) {
  return (
    <button
      className="btn-export"
      onClick={() => openPdfReport({ report, sources })}
      title="Export CISO-ready incident brief as PDF"
      style={{ background: '#0f2341' }}
    >
      <span>⬇</span>
      Export PDF Brief
    </button>
  );
}
