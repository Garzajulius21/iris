import { openPdfReport } from '../lib/generateIrisPdf.js';

export default function ExportButton({ report, sources }) {
  function handleExport() {
    openPdfReport({ report, sources });
  }

  return (
    <button className="btn-export" onClick={handleExport}>
      <span>⬇</span>
      Export PDF Report
    </button>
  );
}
