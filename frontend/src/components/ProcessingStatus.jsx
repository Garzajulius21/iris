const SECTION_LABELS = {
  executive_summary:  'Executive Summary',
  incident_snapshot:  'Incident Snapshot',
  attack_timeline:    'Attack Timeline',
  technical_analysis: 'Technical Analysis',
  impact_assessment:  'Impact Assessment',
  recommendations:    'Recommendations',
};

const SECTION_DESC = {
  executive_summary:  'Answering the 4 CISO questions',
  incident_snapshot:  'Populating structured incident fields',
  attack_timeline:    'Reconstructing the chronological timeline',
  technical_analysis: 'Mapping MITRE ATT&CK phases & IOCs',
  impact_assessment:  'Translating impact to business language',
  recommendations:    'Building the prioritised action table',
};

export default function ProcessingStatus({ sectionStatus, ingestData, onReset }) {
  const sections = Object.keys(SECTION_LABELS);
  const doneCount = Object.values(sectionStatus).filter(s => s === 'done').length;
  const total = sections.length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div>
      {ingestData && (
        <div className="card" style={{marginBottom: 16}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
            <span style={{fontWeight:600, fontSize:13}}>Input received</span>
            <button className="btn-secondary" style={{fontSize:11, padding:'4px 10px'}} onClick={onReset}>
              Start over
            </button>
          </div>
          <div style={{fontSize:12, color:'var(--muted)'}}>
            Sources: {ingestData.sources?.join(' · ')}
          </div>
          <div style={{fontSize:12, color:'var(--muted)', marginTop:2}}>
            {ingestData.word_count?.toLocaleString()} words ingested
          </div>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
          <div className="card-title" style={{margin:0}}>Extracting Report Sections</div>
          <span style={{fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums'}}>
            {doneCount}/{total} sections
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, background: '#e2e8f0', borderRadius: 2, marginBottom: 20, overflow:'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Section rows */}
        <div style={{display:'flex', flexDirection:'column', gap: 10}}>
          {sections.map(s => {
            const status = sectionStatus[s] || 'pending';
            return (
              <div key={s} style={{
                display:'flex', alignItems:'center', gap:12,
                padding: '10px 14px',
                borderRadius: 6,
                background: status === 'done' ? '#f0fdf4'
                  : status === 'started' ? '#eff6ff'
                  : '#fafafa',
                border: `1px solid ${
                  status === 'done' ? '#bbf7d0'
                  : status === 'started' ? '#bfdbfe'
                  : 'var(--border)'
                }`,
                transition: 'all 0.2s',
              }}>
                <span style={{fontSize:16, flexShrink:0}}>
                  {status === 'done'    ? '✓'
                  : status === 'cached' ? '⚡'
                  : status === 'started' ? <Spinner />
                  : status === 'error'  ? '✗'
                  : '○'}
                </span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: status === 'done' ? 'var(--success)'
                      : status === 'started' ? 'var(--accent)'
                      : status === 'error' ? 'var(--crit)'
                      : 'var(--muted)',
                  }}>
                    {SECTION_LABELS[s]}
                    {status === 'cached' && (
                      <span style={{marginLeft:6, fontSize:10, color:'#7c3aed', fontWeight:500}}>cached</span>
                    )}
                  </div>
                  <div style={{fontSize:11, color:'#94a3b8', marginTop:1}}>
                    {status === 'started' ? 'Calling Claude API…'
                     : status === 'error' ? 'Error — check API key'
                     : SECTION_DESC[s]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display:'inline-block',
      width:14, height:14,
      border:'2px solid #bfdbfe',
      borderTopColor:'var(--accent)',
      borderRadius:'50%',
      animation:'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </span>
  );
}
