import { useState } from 'react';

const TABS = [
  { key: 'executive_summary',  label: 'Executive Summary' },
  { key: 'incident_snapshot',  label: 'Snapshot' },
  { key: 'attack_timeline',    label: 'Timeline' },
  { key: 'technical_analysis', label: 'Technical' },
  { key: 'impact_assessment',  label: 'Impact' },
  { key: 'recommendations',    label: 'Recommendations' },
];

const SEV_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b', Unknown:'#94a3b8' };
const PRI_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b' };
const STATUS_COLOR = {
  Active:'#dc2626', Contained:'#d97706', Eradicated:'#2563eb', Recovered:'#16a34a', Monitoring:'#7c3aed', Unknown:'#94a3b8',
};
const PHASE_COLOR = {
  'Initial Access':'#dc2626', 'Execution':'#ea580c', 'Persistence':'#d97706',
  'Privilege Escalation':'#b45309', 'Defense Evasion':'#92400e', 'Credential Access':'#7c3aed',
  'Discovery':'#2563eb', 'Lateral Movement':'#0369a1', 'Collection':'#0891b2',
  'Exfiltration':'#0f766e', 'Command and Control':'#4b5563', 'Impact':'#991b1b',
  'Detection':'#16a34a', 'Containment':'#15803d', 'Eradication':'#166534', 'Recovery':'#14532d',
};

function Badge({ text, color }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700,
      background: color + '18', color, border:`1px solid ${color}44`,
    }}>{text}</span>
  );
}

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', paddingTop:1}}>{label}</span>
      <span style={{fontSize:13}}>{value}</span>
    </div>
  );
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function ExecutiveSummaryTab({ data }) {
  const m = data.key_metrics || {};
  const sev = m.severity || 'Unknown';
  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      {/* Headline */}
      <div style={{
        padding:'14px 18px', background:'#0f2341', borderRadius:6, color:'#fff',
        fontSize:15, fontWeight:600, lineHeight:1.4,
      }}>
        {data.headline || ''}
        <div style={{marginTop:8}}>
          <Badge text={sev} color={SEV_COLOR[sev] || '#94a3b8'} />
          {m.dwell_time_hours > 0 && (
            <span style={{marginLeft:10, fontSize:11, color:'#fca5a5', fontWeight:600}}>
              ⏱ Undetected for {formatHours(m.dwell_time_hours)}
            </span>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
        {[
          { label:'Systems Affected',       val: m.systems_affected >= 0 ? m.systems_affected : 'Not recorded' },
          { label:'Records at Risk',        val: m.records_at_risk > 0 ? m.records_at_risk.toLocaleString() : 'Not recorded' },
          { label:'Undetected For',         val: m.dwell_time_hours > 0 ? formatHours(m.dwell_time_hours) : '—', alert: m.dwell_time_hours > 72 },
          { label:'Est. Cost',              val: m.estimated_cost_usd > 0 ? `$${m.estimated_cost_usd.toLocaleString()}` : 'Not recorded' },
        ].map(({ label, val, alert }) => (
          <div key={label} style={{
            padding:'12px 14px', borderRadius:6,
            background: alert ? '#fef2f2' : '#f8fafc',
            border:`1px solid ${alert ? '#fecaca' : 'var(--border)'}`,
            borderLeft:`3px solid ${alert ? '#dc2626' : 'var(--accent)'}`,
          }}>
            <div style={{fontSize:20, fontWeight:700, color: alert ? '#dc2626' : 'var(--text)', lineHeight:1}}>{val}</div>
            <div style={{fontSize:10, color:'var(--muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Who What Where Why How */}
      {data.five_ws && (
        <div>
          <div style={{fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8}}>Who · What · Where · Why · How</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {[
              { q:'Who carried out the attack', a: data.five_ws.who_attacked },
              { q:'Who was affected',           a: data.five_ws.who_affected },
              { q:'What happened',              a: data.five_ws.what_happened },
              { q:'Where',                      a: data.five_ws.where },
              { q:'Why (motive)',               a: data.five_ws.why },
              { q:'How',                        a: data.five_ws.how },
            ].map(({ q, a }) => (
              <div key={q} style={{borderRadius:6, padding:'10px 12px', background:'#f8fafc', border:'1px solid var(--border)'}}>
                <div style={{fontSize:10, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4}}>{q}</div>
                <div style={{fontSize:12, lineHeight:1.6, color:'var(--text)'}}>{a || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detection · Containment · Handoff */}
      {(data.detection_method || data.containment_status || data.current_owner) && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
          {data.detection_method && (
            <div style={{borderRadius:6, padding:'10px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:10, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4}}>How Detected</div>
              <div style={{fontSize:12, lineHeight:1.5}}>{data.detection_method}</div>
            </div>
          )}
          {data.containment_status && (
            <div style={{borderRadius:6, padding:'10px 12px', background: data.containment_status === 'Fully Contained' ? '#f0fdf4' : data.containment_status === 'Not Contained' ? '#fef2f2' : '#fffbeb', border:`1px solid ${data.containment_status === 'Fully Contained' ? '#bbf7d0' : data.containment_status === 'Not Contained' ? '#fecaca' : '#fde68a'}`}}>
              <div style={{fontSize:10, fontWeight:700, color: data.containment_status === 'Fully Contained' ? '#15803d' : data.containment_status === 'Not Contained' ? '#dc2626' : '#92400e', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4}}>Containment</div>
              <div style={{fontSize:12, fontWeight:700}}>{data.containment_status}</div>
            </div>
          )}
          {data.current_owner && (
            <div style={{borderRadius:6, padding:'10px 12px', background:'#f0f7ff', border:'1px solid #bfdbfe'}}>
              <div style={{fontSize:10, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4}}>Current Owner / Handoff</div>
              <div style={{fontSize:12, lineHeight:1.5}}>{data.current_owner}</div>
            </div>
          )}
        </div>
      )}

      {/* CISO narrative */}
      {[
        { q:'What happened', a: data.what_happened },
        { q:'What we did', a: data.what_we_did },
        { q:'What it means', a: data.what_it_means },
        { q:"What's next", a: data.whats_next },
      ].map(({ q, a }) => (
        <div key={q} style={{borderRadius:6, padding:'14px 16px', background:'#f8fafc', border:'1px solid var(--border)'}}>
          <div style={{fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6}}>{q}</div>
          <div style={{fontSize:13, lineHeight:1.7, color:'var(--text)'}}>{a || ''}</div>
        </div>
      ))}
    </div>
  );
}

function SnapshotTab({ data }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:0}}>
      <Field label="Incident ID"            value={data.incident_id} />
      <Field label="Type"                   value={data.incident_type} />
      <Field label="Severity"               value={data.severity && <Badge text={data.severity} color={SEV_COLOR[data.severity] || '#94a3b8'} />} />
      <Field label="Status"                 value={data.current_status && <Badge text={data.current_status} color={STATUS_COLOR[data.current_status] || '#94a3b8'} />} />
      <Field label="Breach Start"           value={data.breach_start} />
      <Field label="Detection Date"         value={data.detection_date} />
      <Field label="How Detected"           value={data.detection_method} />
      <Field label="Handoff / Owner"        value={data.handoff_status} />
      <Field label="Affected Units"         value={data.affected_units?.join(', ')} />
      <Field label="Data Classification"    value={data.data_classification} />
      <Field label="Regulatory Obligations" value={data.regulatory_obligations?.join(', ')} />
      <Field label="Incident Commander"     value={data.incident_commander} />
      <Field label="Lead Analyst"           value={data.lead_analyst} />
      {data.containment_actions?.length > 0 && (
        <div style={{padding:'10px 0'}}>
          <div style={{fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8}}>Containment Actions</div>
          {data.containment_actions.map((a, i) => (
            <div key={i} style={{display:'flex', gap:8, padding:'5px 0', fontSize:12, borderBottom:'1px solid var(--border)'}}>
              <span style={{color:'#16a34a', fontWeight:700}}>✓</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineTab({ data }) {
  const events = data.events || [];
  if (!events.length) return <div style={{color:'var(--muted)', fontSize:13}}>No timeline events extracted.</div>;

  return (
    <div>
      {data.dwell_time_hours > 0 && (
        <div style={{
          padding:'10px 14px', borderRadius:6, background:'#fef2f2', border:'1px solid #fecaca',
          marginBottom:16, display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{fontSize:18}}>⏱</span>
          <div>
            <span style={{fontWeight:700, color:'#dc2626'}}>Undetected for: {formatHours(data.dwell_time_hours)}</span>
            <span style={{fontSize:11, color:'#ef4444', marginLeft:8}}>Breach to detection gap — key CISO metric</span>
          </div>
        </div>
      )}

      <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
        <thead>
          <tr style={{background:'#f8fafc', borderBottom:'2px solid var(--border)'}}>
            <th style={{padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:'var(--muted)', textTransform:'uppercase', width:160}}>Timestamp (UTC)</th>
            <th style={{padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:'var(--muted)', textTransform:'uppercase', width:130}}>Phase</th>
            <th style={{padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:'var(--muted)', textTransform:'uppercase'}}>Event</th>
            <th style={{padding:'8px 10px', textAlign:'center', fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:'var(--muted)', textTransform:'uppercase', width:70}}>Confirmed</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={i} style={{borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fafafa'}}>
              <td style={{padding:'8px 10px', fontFamily:'monospace', fontSize:11, color:'#64748b', whiteSpace:'nowrap'}}>{ev.timestamp_utc}</td>
              <td style={{padding:'8px 10px'}}>
                <span style={{
                  fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:3,
                  background:(PHASE_COLOR[ev.phase] || '#94a3b8') + '15',
                  color: PHASE_COLOR[ev.phase] || '#94a3b8',
                  border:`1px solid ${(PHASE_COLOR[ev.phase] || '#94a3b8')}30`,
                  whiteSpace:'nowrap',
                }}>{ev.phase}</span>
              </td>
              <td style={{padding:'8px 10px', lineHeight:1.5}}>{ev.event}</td>
              <td style={{padding:'8px 10px', textAlign:'center', fontSize:13}}>
                {ev.confirmed ? <span style={{color:'#16a34a'}}>✓</span> : <span style={{color:'#94a3b8'}}>?</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TechnicalTab({ data }) {
  const phases = data.phases || [];
  const ioc = data.ioc_summary || {};
  const hasIocs = Object.values(ioc).some(v => v?.length > 0);

  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      {data.threat_actor_assessment && (
        <div style={{padding:'10px 14px', borderRadius:6, background:'#faf5ff', border:'1px solid #e9d5ff'}}>
          <div style={{fontSize:11, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4}}>Threat Actor Assessment</div>
          <div style={{fontSize:13, lineHeight:1.6}}>{data.threat_actor_assessment}</div>
        </div>
      )}

      {phases.map((ph, i) => (
        <div key={i} style={{borderRadius:6, border:`1px solid ${(PHASE_COLOR[ph.phase] || '#e2e8f0')}40`, overflow:'hidden'}}>
          <div style={{
            padding:'10px 14px', display:'flex', alignItems:'center', gap:10,
            background:(PHASE_COLOR[ph.phase] || '#94a3b8') + '12',
            borderBottom:`1px solid ${(PHASE_COLOR[ph.phase] || '#e2e8f0')}40`,
          }}>
            <span style={{
              fontSize:11, fontWeight:700, color: PHASE_COLOR[ph.phase] || '#64748b',
              textTransform:'uppercase', letterSpacing:'0.07em',
            }}>{ph.phase}</span>
            {ph.mitre_tactic && <span style={{fontSize:10, fontFamily:'monospace', color:'#94a3b8'}}>{ph.mitre_tactic}</span>}
          </div>
          <div style={{padding:'12px 14px'}}>
            <p style={{fontSize:13, lineHeight:1.7, color:'var(--text)', marginBottom: ph.techniques?.length ? 10 : 0}}>
              {ph.narrative}
            </p>
            {ph.techniques?.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:4}}>
                {ph.techniques.map((t, j) => (
                  <div key={j} style={{display:'flex', gap:8, fontSize:12}}>
                    <span style={{fontFamily:'monospace', color:'var(--accent)', fontWeight:600, minWidth:70}}>{t.id}</span>
                    <span style={{fontWeight:600, minWidth:140}}>{t.name}</span>
                    <span style={{color:'var(--muted)', flex:1}}>{t.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {hasIocs && (
        <div style={{borderRadius:6, background:'#fafafa', border:'1px solid var(--border)', padding:'14px 16px'}}>
          <div style={{fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--muted)', marginBottom:10}}>IOC Summary</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {[
              ['IP Addresses', ioc.ip_addresses],
              ['File Hashes',  ioc.file_hashes],
              ['Domains',      ioc.domains],
              ['Accounts',     ioc.accounts],
              ['File Paths',   ioc.file_paths],
              ['Tools',        data.tools_used],
            ].map(([label, items]) => items?.length > 0 && (
              <div key={label}>
                <div style={{fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', marginBottom:4}}>{label}</div>
                {items.map((v, i) => (
                  <div key={i} style={{fontSize:11, fontFamily:'monospace', color:'#334155', padding:'1px 0'}}>{v}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImpactTab({ data }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
        {[
          { label:'Records Exposed', val: data.records_exposed > 0 ? data.records_exposed.toLocaleString() : (data.records_exposed_note || '—'), alert: data.records_exposed > 0 },
          { label:'Downtime',        val: data.downtime_hours > 0 ? formatHours(data.downtime_hours) : 'Not recorded' },
          { label:'Est. Cost',       val: data.financial_cost_estimate || '—' },
        ].map(({ label, val, alert }) => (
          <div key={label} style={{
            padding:'12px 14px', borderRadius:6,
            background: alert ? '#fef2f2' : '#f8fafc',
            border:`1px solid ${alert ? '#fecaca' : 'var(--border)'}`,
            borderLeft:`3px solid ${alert ? '#dc2626' : '#d97706'}`,
          }}>
            <div style={{fontSize:18, fontWeight:700, color: alert ? '#dc2626' : 'var(--text)', lineHeight:1.2}}>{val}</div>
            <div style={{fontSize:10, color:'var(--muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{borderRadius:6, padding:'14px 16px', background:'#fffbeb', border:'1px solid #fde68a'}}>
        <div style={{fontSize:11, fontWeight:700, color:'#92400e', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6}}>Business Impact</div>
        <div style={{fontSize:13, lineHeight:1.7}}>{data.business_impact_narrative || ''}</div>
      </div>

      <Field label="Reputational Risk"      value={data.reputational_risk && <Badge text={data.reputational_risk} color={SEV_COLOR[data.reputational_risk] || '#94a3b8'} />} />
      <Field label="Notification Required"  value={data.notification_required != null ? (data.notification_required ? 'Yes' : 'No') : null} />
      <Field label="Notification Deadline"  value={data.notification_deadline} />
      <Field label="Data Types Affected"    value={data.data_types_affected?.join(', ')} />
      <Field label="Regulatory Obligations" value={data.regulatory_obligations?.join(', ')} />
      <Field label="Recovery Status"        value={data.recovery_status} />
    </div>
  );
}

function RecCard({ r }) {
  const pc = PRI_COLOR[r.priority] || '#94a3b8';
  return (
    <div style={{
      borderLeft:`3px solid ${pc}`, borderRadius:6,
      border:`1px solid ${pc}22`, borderLeftWidth:3,
      padding:'10px 12px', background:'#fff',
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
        <Badge text={r.priority} color={pc} />
        <span style={{fontSize:11, color:'var(--muted)', fontWeight:600}}>{r.owner}</span>
      </div>
      <div style={{fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:5, lineHeight:1.4}}>{r.finding}</div>
      <div style={{fontSize:12, color:'#334155', lineHeight:1.6, marginBottom:8}}>{r.action}</div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:6, borderTop:`1px solid ${pc}20`}}>
        <span style={{fontSize:11, color:'var(--muted)'}}>Due: {r.deadline}</span>
        {r.risk && <span style={{fontSize:11, color:'#94a3b8', fontStyle:'italic', maxWidth:'55%', textAlign:'right'}}>Risk: {r.risk}</span>}
      </div>
    </div>
  );
}

function RecommendationsTab({ data }) {
  const sections = [
    { title: 'Immediate — 0 to 30 days', items: data.immediate || [], color: '#dc2626' },
    { title: 'Strategic — 30 to 90 days', items: data.strategic || [], color: '#2563eb' },
  ];
  const lessons = data.lessons_learned || [];

  return (
    <div style={{display:'flex', flexDirection:'column', gap:20}}>
      {sections.map(({ title, items, color }) => (
        <div key={title}>
          <div style={{
            fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
            color, marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${color}`,
          }}>{title}</div>
          {items.length === 0 ? (
            <div style={{color:'var(--muted)', fontSize:12}}>None identified.</div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              {items.map((r, i) => <RecCard key={i} r={r} />)}
            </div>
          )}
        </div>
      ))}

      {lessons.length > 0 && (
        <div>
          <div style={{
            fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
            color:'#0f2341', marginBottom:10, paddingBottom:6, borderBottom:'2px solid #0f2341',
          }}>Lessons Learned</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {lessons.map((l, i) => (
              <div key={i} style={{
                borderLeft:'3px solid #0f2341', padding:'8px 12px',
                background:'#f8fafc', borderRadius:'0 6px 6px 0',
              }}>
                <div style={{fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.5}}>{l.lesson}</div>
                {l.applies_to && (
                  <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3}}>{l.applies_to}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportPreview({ report }) {
  const [active, setActive] = useState('executive_summary');
  const tab = TABS.find(t => t.key === active);

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display:'flex', gap:2, marginBottom:16,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:8, padding:4, flexWrap:'wrap',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding:'6px 14px', fontSize:12, fontWeight:500, borderRadius:6,
              background: active === t.key ? 'var(--navy)' : 'transparent',
              color: active === t.key ? '#fff' : 'var(--muted)',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Panel */}
      <div className="card">
        {active === 'executive_summary'  && <ExecutiveSummaryTab data={report.executive_summary || {}} />}
        {active === 'incident_snapshot'  && <SnapshotTab         data={report.incident_snapshot || {}} />}
        {active === 'attack_timeline'    && <TimelineTab         data={report.attack_timeline || {}} />}
        {active === 'technical_analysis' && <TechnicalTab        data={report.technical_analysis || {}} />}
        {active === 'impact_assessment'  && <ImpactTab           data={report.impact_assessment || {}} />}
        {active === 'recommendations'    && <RecommendationsTab  data={report.recommendations || {}} />}
      </div>
    </div>
  );
}

function formatHours(h) {
  if (h < 1)   return '< 1 hour';
  if (h < 24)  return `${Math.round(h)} hour${Math.round(h) !== 1 ? 's' : ''}`;
  if (h < 168) return `${Math.round(h / 24)} day${Math.round(h / 24) !== 1 ? 's' : ''}`;
  return `${Math.round(h / 168)} week${Math.round(h / 168) !== 1 ? 's' : ''}`;
}
