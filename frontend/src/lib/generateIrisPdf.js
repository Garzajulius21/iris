/**
 * IRIS PDF Report Generator
 * Two modes: Executive Brief (3 pages) and Technical Report (7+ pages).
 * Typography system applied consistently throughout.
 */

// ── Colour palette ─────────────────────────────────────────────────────────────

const NAVY   = '#0f2341';
const ACCENT = '#1a56db';

const SEV_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b', Unknown:'#94a3b8' };
const PRI_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b' };

const PHASE_COLOR = {
  'Initial Access':'#dc2626',      'Execution':'#ea580c',
  'Persistence':'#d97706',         'Privilege Escalation':'#b45309',
  'Defense Evasion':'#92400e',     'Credential Access':'#7c3aed',
  'Discovery':'#2563eb',           'Lateral Movement':'#0369a1',
  'Collection':'#0891b2',          'Exfiltration':'#0f766e',
  'Command and Control':'#374151', 'Impact':'#991b1b',
  'Detection':'#16a34a',           'Containment':'#15803d',
  'Eradication':'#166534',         'Recovery':'#14532d',
};

const STATUS_COLOR = {
  Active:'#dc2626', Contained:'#d97706', Eradicated:'#2563eb',
  Recovered:'#16a34a', Monitoring:'#7c3aed', Unknown:'#94a3b8',
};

// ── Typography constants ───────────────────────────────────────────────────────
// All inline styles use these to stay in sync.

const TX  = '#1e293b';          // primary text
const TXM = '#64748b';          // muted / secondary text
const TXS = '#94a3b8';          // subtle / placeholder

// Reusable style strings
const S_BODY  = `font-size:11px;line-height:1.6;color:${TX};`;
const S_SMALL = `font-size:10px;line-height:1.5;color:${TX};`;
const S_LABEL = `font-size:9px;font-weight:700;color:${TXM};text-transform:uppercase;letter-spacing:0.07em;`;
const S_MONO  = `font-family:monospace;font-size:10px;color:#334155;`;
const S_MUTED = `font-size:10px;color:${TXM};`;

// ── Utilities ──────────────────────────────────────────────────────────────────

function trunc(str, n) {
  if (!str) return '';
  return str.length <= n ? str : str.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

function formatHours(h) {
  if (!h || h <= 0) return 'Unknown';
  if (h < 1)   return '< 1 hour';
  if (h < 24)  return `${Math.round(h)} hour${Math.round(h) !== 1 ? 's' : ''}`;
  if (h < 168) return `${Math.round(h / 24)} day${Math.round(h / 24) !== 1 ? 's' : ''}`;
  return `${Math.round(h / 168)} week${Math.round(h / 168) !== 1 ? 's' : ''}`;
}

function badge(text, color) {
  return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.04em;background:${color}18;color:${color};border:1px solid ${color}44;">${text}</span>`;
}

function metric(value, label, alertColor) {
  const col   = alertColor || NAVY;
  const empty = !value || value === 'Not recorded';
  return `
    <div style="padding:10px 12px;border-left:3px solid ${empty ? '#e2e8f0' : col};border-bottom:1px solid #f1f5f9;">
      <div style="font-size:22px;font-weight:700;color:${empty ? TXS : col};line-height:1;font-variant-numeric:tabular-nums;font-style:${empty ? 'italic' : 'normal'};${empty ? 'font-size:11px;' : ''}">${empty ? 'Not recorded' : value}</div>
      <div style="${S_LABEL}margin-top:3px;">${label}</div>
    </div>`;
}

function field(label, value) {
  if (!value) return '';
  return `
    <div style="display:grid;grid-template-columns:150px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;">
      <span style="${S_LABEL}padding-top:1px;">${label}</span>
      <span style="${S_SMALL}">${value}</span>
    </div>`;
}

function pageHeader(title, subtitle, date, pageNum, totalPages) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.14em;color:${TXS};text-transform:uppercase;">CONFIDENTIAL</div>
      <div style="font-size:8px;color:#cbd5e1;">Page ${pageNum} of ${totalPages}</div>
    </div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:3px solid ${NAVY};">
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px;color:${NAVY};line-height:1;">IRIS</div>
        <div style="${S_SMALL}color:${TXM};margin-top:2px;">${title}</div>
        ${subtitle ? `<div style="font-size:9px;color:${TXS};margin-top:1px;">${subtitle}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="${S_SMALL}font-weight:500;">${date}</div>
      </div>
    </div>`;
}

function pageFooter(label, date, pageNum, totalPages) {
  return `
    <div style="font-size:8px;color:${TXS};text-align:center;margin-top:14px;padding-top:6px;border-top:1px solid #e2e8f0;">
      IRIS — Incident Response Intelligence Summary &nbsp;·&nbsp; ${label} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; CONFIDENTIAL &nbsp;·&nbsp; Page ${pageNum} of ${totalPages}
    </div>`;
}

// ── Cover page (shared by both report modes) ───────────────────────────────────

function pageCover(exec, snap, date, mode) {
  const m      = exec.key_metrics || {};
  const sev    = m.severity || 'Unknown';
  const sc     = SEV_COLOR[sev] || '#94a3b8';
  const status = snap.current_status || exec.containment_status || 'Unknown';
  const stc    = STATUS_COLOR[status] || '#94a3b8';
  const isExec = mode === 'executive';

  const metricItems = [
    [m.systems_affected >= 0 ? m.systems_affected : null,                    'Systems Affected',  null],
    [m.records_at_risk  >  0 ? m.records_at_risk.toLocaleString() : null,   'Records at Risk',   m.records_at_risk > 0 ? '#dc2626' : null],
    [m.dwell_time_hours >  0 ? formatHours(m.dwell_time_hours) : null,      'Undetected For',    m.dwell_time_hours > 72 ? '#dc2626' : null],
    [m.estimated_cost_usd > 0 ? '$' + m.estimated_cost_usd.toLocaleString() : null, 'Est. Financial Cost', null],
  ];

  return `
  <div class="page-cover">
    <!-- Navy header band -->
    <div style="background:${NAVY};padding:18mm 18mm 14mm;display:flex;flex-direction:column;flex:1;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.15em;color:#4b6a9b;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1e3a5f;">
        CONFIDENTIAL${isExec ? ' — EXECUTIVE BRIEF' : ''}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:16px 0;">
        <div style="font-size:44px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;margin-bottom:3px;">IRIS</div>
        <div style="font-size:10px;font-weight:400;color:#4b6a9b;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:${isExec ? '4px' : '22px'};">Incident Response Intelligence Summary</div>
        ${isExec ? `<div style="font-size:10px;font-weight:700;color:#d97706;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">Executive Brief</div>` : ''}
        <div style="font-size:19px;font-weight:700;color:#e2e8f0;line-height:1.4;margin-bottom:16px;max-width:480px;">${exec.headline || m.incident_name || 'Incident Brief'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.06em;background:${sc};color:#fff;">${sev.toUpperCase()} SEVERITY</span>
          <span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.06em;background:${stc};color:#fff;">${status.toUpperCase()}</span>
        </div>
      </div>
      <div>
        ${m.incident_name ? `<div style="${S_MUTED}margin-bottom:3px;"><span style="color:#4b6a9b;">Incident ID:</span> <span style="color:#94a3b8;font-weight:600;">${m.incident_name}</span></div>` : ''}
        <div style="${S_MUTED}"><span style="color:#4b6a9b;">Report Date:</span> <span style="color:#94a3b8;font-weight:600;">${date}</span></div>
      </div>
    </div>
    <!-- White lower band -->
    <div style="padding:12mm 18mm 10mm;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        ${exec.what_happened ? `<p style="${S_BODY}margin-bottom:14px;border-left:2px solid #dbeafe;padding-left:10px;">${exec.what_happened}</p>` : ''}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;">
          ${metricItems.map(([val, label, col], i) => `
            <div style="padding:9px 11px;${i < 3 ? 'border-right:1px solid #e2e8f0;' : ''}border-top:2px solid ${col || (val != null ? NAVY : '#e2e8f0')};">
              <div style="font-size:${val != null ? '19px' : '10px'};font-weight:700;color:${val != null ? (col || NAVY) : TXS};font-style:${val != null ? 'normal' : 'italic'};line-height:1;font-variant-numeric:tabular-nums;">${val != null ? val : 'Not recorded'}</div>
              <div style="${S_LABEL}margin-top:3px;">${label}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="${S_SMALL}font-weight:600;margin-bottom:2px;">IRIS · ${isExec ? 'Executive Brief · ' : ''}Powered by Claude AI</div>
          <div style="font-size:9px;color:${TXS};">AI-generated from analyst notes — human review required before external disclosure</div>
        </div>
        <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:${TXS};text-transform:uppercase;">Confidential</div>
      </div>
    </div>
  </div>`;
}

// ── Page 1: Executive Summary (Technical Report) ───────────────────────────────

function page1(exec, date) {
  const m         = exec.key_metrics || {};
  const sev       = m.severity || 'Unknown';
  const sc        = SEV_COLOR[sev] || '#94a3b8';
  const dwellAlert = m.dwell_time_hours > 72;
  const dwellColor = dwellAlert ? '#dc2626' : NAVY;
  const dwellVal   = m.dwell_time_hours > 0 ? formatHours(m.dwell_time_hours) : 'Not recorded';

  return `
  <div class="page">
    ${pageHeader('Executive Summary', `${m.incident_name ? m.incident_name + ' · ' : ''}For CISO / Executive Leadership`, date, 1, 7)}

    <div style="display:flex;align-items:stretch;border-radius:5px;overflow:hidden;margin-bottom:12px;border:1px solid ${sc}33;">
      <div style="background:${sc};color:#fff;padding:12px 16px;display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:90px;">
        <div style="${S_LABEL}color:rgba(255,255,255,0.8);margin-bottom:3px;">Severity</div>
        <div style="font-size:20px;font-weight:800;line-height:1;">${sev.toUpperCase()}</div>
      </div>
      <div style="flex:1;padding:12px 16px;">
        <div style="font-size:13px;font-weight:700;color:${NAVY};line-height:1.4;margin-bottom:5px;">${exec.headline || 'Incident Brief'}</div>
        <div style="${S_MUTED}">
          ${m.breach_start   ? `Breach: <strong>${m.breach_start}</strong>` : ''}
          ${m.detection_date ? `&nbsp;·&nbsp; Detected: <strong>${m.detection_date}</strong>` : ''}
          ${m.dwell_time_hours > 0 ? `&nbsp;·&nbsp; <span style="color:${dwellColor};font-weight:700;">Undetected for: ${dwellVal}</span>` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">
      ${metric(m.systems_affected  >= 0 ? m.systems_affected : 'Not recorded', 'Systems Affected')}
      ${metric(m.records_at_risk   >  0 ? m.records_at_risk.toLocaleString() : 'Not recorded', 'Records at Risk', m.records_at_risk > 0 ? '#dc2626' : null)}
      ${metric(dwellVal, 'Undetected For', dwellAlert ? '#dc2626' : null)}
      ${metric(m.estimated_cost_usd > 0 ? '$' + m.estimated_cost_usd.toLocaleString() : 'Not recorded', 'Est. Cost')}
    </div>

    ${exec.five_ws ? `
    <h2>Who · What · Where · Why · How</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
      ${[
        { label:'Who carried out the attack', val: exec.five_ws.who_attacked },
        { label:'Who was affected',           val: exec.five_ws.who_affected },
        { label:'What happened',              val: exec.five_ws.what_happened },
        { label:'Where',                      val: exec.five_ws.where },
        { label:'Why (motive)',               val: exec.five_ws.why },
        { label:'How',                        val: exec.five_ws.how },
      ].map(({ label, val }) => `
        <div style="padding:7px 9px;border-left:2px solid ${ACCENT};border-bottom:1px solid #f1f5f9;">
          <div style="${S_LABEL}color:${ACCENT};margin-bottom:2px;">${label}</div>
          <div style="${S_SMALL}">${val || ''}</div>
        </div>`).join('')}
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
      ${exec.detection_method ? `
        <div style="padding:8px 10px;border-left:2px solid ${TXM};">
          <div style="${S_LABEL}margin-bottom:2px;">How Detected</div>
          <div style="${S_SMALL}">${exec.detection_method}</div>
        </div>` : ''}
      ${exec.containment_status ? (() => {
        const cc = exec.containment_status === 'Fully Contained' ? '#15803d' : exec.containment_status === 'Not Contained' ? '#dc2626' : '#92400e';
        return `
        <div style="padding:8px 10px;border-left:3px solid ${cc};">
          <div style="${S_LABEL}color:${cc};margin-bottom:2px;">Containment Status</div>
          <div style="font-size:11px;font-weight:800;color:${cc};">${exec.containment_status}</div>
        </div>`;
      })() : ''}
      ${exec.current_owner ? `
        <div style="padding:8px 10px;border-left:2px solid ${TXM};">
          <div style="${S_LABEL}margin-bottom:2px;">Current Owner / Handoff</div>
          <div style="${S_SMALL}">${exec.current_owner}</div>
        </div>` : ''}
    </div>

    <h2>Summary &amp; Status</h2>
    ${[
      { q:'What happened',  a: exec.what_happened },
      { q:'What we did',    a: exec.what_we_did },
      { q:'What it means',  a: exec.what_it_means },
      { q:"What's next",    a: exec.whats_next },
    ].map(({ q, a }) => `
      <div style="margin-bottom:8px;">
        <div style="${S_LABEL}color:${ACCENT};margin-bottom:3px;">${q}</div>
        <div style="${S_BODY}padding-left:8px;border-left:1px solid #dbeafe;">${a || ''}</div>
      </div>`).join('')}

    ${pageFooter('Executive Summary', date, 1, 7)}
  </div>`;
}

// ── Page 2: Incident Snapshot ──────────────────────────────────────────────────

function page2(snap, exec, date) {
  const sev = snap.severity || exec?.key_metrics?.severity || 'Unknown';
  const sc  = SEV_COLOR[sev] || '#94a3b8';
  const stc = STATUS_COLOR[snap.current_status] || '#94a3b8';

  return `
  <div class="page">
    ${pageHeader('Incident Snapshot', snap.incident_id || exec?.key_metrics?.incident_name || 'Structured incident record', date, 2, 7)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <h2>Identification</h2>
        ${field('Incident ID',         snap.incident_id || 'TBD')}
        ${field('Type',                snap.incident_type)}
        ${field('Severity',            badge(sev, sc))}
        ${field('Status',              snap.current_status ? badge(snap.current_status, stc) : '')}
        ${field('Data Classification', snap.data_classification)}
        ${field('Incident Commander',  snap.incident_commander)}
        ${field('Lead Analyst',        snap.lead_analyst)}
        ${field('Handoff / Owner',     snap.handoff_status)}
      </div>
      <div>
        <h2>Timeline Anchors</h2>
        ${field('Breach Start',   snap.breach_start || exec?.key_metrics?.breach_start || 'Unknown')}
        ${field('Detection Date', snap.detection_date || exec?.key_metrics?.detection_date || 'Unknown')}
        ${field('Undetected For', exec?.key_metrics?.dwell_time_hours > 0
          ? `<span style="color:#dc2626;font-weight:700;">${formatHours(exec.key_metrics.dwell_time_hours)} between breach and detection</span>`
          : '')}
      </div>
    </div>

    ${snap.detection_method ? `
      <h2>How It Was Detected</h2>
      <div style="padding:9px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;${S_BODY}">${snap.detection_method}</div>` : ''}

    ${snap.containment_actions?.length ? `
      <h2>Containment Actions Taken</h2>
      <div style="display:flex;flex-direction:column;gap:3px;">
        ${snap.containment_actions.map(a => `
          <div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#15803d;font-weight:700;flex-shrink:0;">✓</span>
            <span style="${S_SMALL}">${a}</span>
          </div>`).join('')}
      </div>` : ''}

    ${snap.affected_units?.length ? `
      <h2>Affected Business Units</h2>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;">
        ${snap.affected_units.map(u => `<span style="padding:2px 9px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;${S_SMALL}color:#0369a1;">${u}</span>`).join('')}
      </div>` : ''}

    ${snap.regulatory_obligations?.length ? `
      <h2>Regulatory Obligations</h2>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;">
        ${snap.regulatory_obligations.map(r => `<span style="padding:2px 9px;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;${S_SMALL}color:#92400e;font-weight:600;">${r}</span>`).join('')}
      </div>` : ''}

    ${snap.key_decisions?.length ? `
      <h2>Key Decisions Log</h2>
      <table>
        <thead><tr>
          <th style="width:120px;">Timestamp</th>
          <th style="width:150px;">Decided By</th>
          <th>Decision &amp; Rationale</th>
        </tr></thead>
        <tbody>
          ${snap.key_decisions.map(d => `
            <tr>
              <td style="${S_MONO}color:${TXM};">${d.timestamp || ''}</td>
              <td style="${S_SMALL}font-weight:600;">${d.made_by || ''}</td>
              <td style="${S_SMALL}">
                <div style="font-weight:600;margin-bottom:2px;">${d.decision}</div>
                ${d.rationale ? `<div style="color:${TXM};">${d.rationale}</div>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

    ${pageFooter('Incident Snapshot', date, 2, 7)}
  </div>`;
}

// ── Page 3: Attack Timeline ────────────────────────────────────────────────────

function page3(timeline, date) {
  const events = timeline.events || [];

  const phaseOrder = [
    'Initial Access','Execution','Persistence','Privilege Escalation',
    'Defense Evasion','Credential Access','Discovery','Lateral Movement',
    'Collection','Exfiltration','Command and Control','Impact',
    'Detection','Containment','Eradication','Recovery',
  ];

  const seenPhases    = [...new Set(events.map(e => e.phase).filter(Boolean))];
  const orderedPhases = phaseOrder.filter(p => seenPhases.includes(p));

  const rows = events.map(ev => {
    const pc = PHASE_COLOR[ev.phase] || '#64748b';
    return `
      <tr>
        <td style="${S_MONO}color:${TXM};white-space:nowrap;width:115px;">${ev.timestamp_utc}</td>
        <td style="width:105px;">
          <span style="display:inline-block;font-size:8px;font-weight:700;padding:1px 4px;border-radius:2px;background:${pc}15;color:${pc};border:1px solid ${pc}30;white-space:nowrap;">${ev.phase}</span>
        </td>
        <td style="${S_SMALL}line-height:1.5;">${ev.event}</td>
        <td style="text-align:center;font-size:11px;color:${ev.confirmed ? '#16a34a' : TXS};width:24px;">${ev.confirmed ? '✓' : '?'}</td>
      </tr>`;
  }).join('');

  return `
  <div class="page">
    ${pageHeader('Attack Timeline', 'All timestamps UTC · ✓ = confirmed · ? = suspected', date, 3, 7)}

    ${timeline.dwell_time_hours > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;margin-bottom:8px;">
        <span style="font-size:13px;">⏱</span>
        <div>
          <span style="font-weight:700;color:#dc2626;${S_SMALL}">Undetected for: ${formatHours(timeline.dwell_time_hours)}</span>
          <span style="font-size:9px;color:#ef4444;margin-left:6px;">Time between breach start and detection</span>
        </div>
      </div>` : ''}

    ${orderedPhases.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px;">
        ${orderedPhases.map(p => `<span style="font-size:8px;padding:1px 5px;border-radius:2px;background:${PHASE_COLOR[p] || '#64748b'}15;color:${PHASE_COLOR[p] || '#64748b'};border:1px solid ${PHASE_COLOR[p] || '#64748b'}30;font-weight:600;">${p}</span>`).join('')}
      </div>` : ''}

    ${events.length === 0
      ? `<p style="${S_BODY}color:${TXS};">No timeline events extracted.</p>`
      : `<table>
          <thead>
            <tr>
              <th style="width:130px;">Timestamp (UTC)</th>
              <th style="width:120px;">Phase</th>
              <th>Event</th>
              <th style="width:60px;text-align:center;">Confirmed</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`}

    ${pageFooter('Attack Timeline', date, 3, 7)}
  </div>`;
}

// ── Page 4: Technical Analysis — Attack Phases ────────────────────────────────

function page4(tech, date) {
  const phases = tech.phases || [];

  const phaseBlocks = phases.map(ph => {
    const pc       = PHASE_COLOR[ph.phase] || '#64748b';
    const techRows = (ph.techniques || []).map(t => `
      <tr>
        <td style="${S_MONO}color:${ACCENT};font-weight:600;white-space:nowrap;">${t.id}</td>
        <td style="${S_SMALL}font-weight:600;">${t.name}</td>
        <td style="${S_SMALL}color:${TXM};">${t.description}</td>
      </tr>`).join('');

    return `
      <div style="border:1px solid ${pc}30;border-radius:5px;overflow:hidden;margin-bottom:10px;">
        <div style="padding:7px 11px;background:${pc}12;border-bottom:1px solid ${pc}20;display:flex;align-items:center;gap:8px;">
          <span style="font-size:10px;font-weight:700;color:${pc};text-transform:uppercase;letter-spacing:0.06em;">${ph.phase}</span>
          ${ph.mitre_tactic ? `<span style="${S_MONO}color:${TXS};">${ph.mitre_tactic}</span>` : ''}
        </div>
        <div style="padding:9px 11px;">
          <p style="${S_BODY}margin-bottom:${ph.techniques?.length ? '7px' : '0'};">${ph.narrative}</p>
          ${ph.techniques?.length ? `
            <table style="margin-top:0;">
              <thead><tr>
                <th style="width:70px;">ID</th>
                <th style="width:140px;">Technique</th>
                <th>Observation</th>
              </tr></thead>
              <tbody>${techRows}</tbody>
            </table>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
  <div class="page">
    ${pageHeader('Technical Analysis', 'Attack phases mapped to MITRE ATT&CK', date, 4, 7)}

    ${tech.threat_actor_assessment ? `
      <div style="padding:9px 12px;border-left:3px solid #7c3aed;margin-bottom:12px;">
        <div style="${S_LABEL}color:#7c3aed;margin-bottom:3px;">Threat Actor Assessment</div>
        <div style="${S_BODY}">${tech.threat_actor_assessment}</div>
      </div>` : ''}

    ${phases.length === 0
      ? `<p style="${S_BODY}color:${TXS};">No attack phases extracted.</p>`
      : phaseBlocks}

    ${pageFooter('Technical Analysis', date, 4, 7)}
  </div>`;
}

// ── Page 5: IOC Summary ────────────────────────────────────────────────────────

function page5(tech, date) {
  const ioc     = tech.ioc_summary || {};
  const tools   = tech.tools_used || [];
  const systems = tech.affected_systems || [];

  const iocSections = [
    ['IP Addresses',  ioc.ip_addresses],
    ['File Hashes',   ioc.file_hashes],
    ['Domains',       ioc.domains],
    ['Account Names', ioc.accounts],
    ['File Paths',    ioc.file_paths],
  ].filter(([, items]) => items?.length > 0);

  return `
  <div class="page">
    ${pageHeader('IOC Summary', 'Indicators of Compromise and affected assets', date, 5, 7)}

    ${iocSections.length === 0 && tools.length === 0 && systems.length === 0
      ? `<p style="${S_BODY}color:${TXS};">No IOCs extracted.</p>`
      : ''}

    ${iocSections.length > 0 ? `
      <h2>Indicators of Compromise</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px;">
        ${iocSections.map(([label, items]) => `
          <div>
            <div style="${S_LABEL}margin-bottom:5px;">${label} (${items.length})</div>
            ${items.map(v => `<div style="${S_MONO}padding:2px 0;border-bottom:1px solid #f1f5f9;">${v}</div>`).join('')}
          </div>`).join('')}
      </div>` : ''}

    ${tools.length > 0 ? `
      <h2>Tools &amp; Malware Observed</h2>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">
        ${tools.map(t => `<span style="padding:2px 9px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;${S_SMALL}color:#dc2626;font-weight:500;">${t}</span>`).join('')}
      </div>` : ''}

    ${systems.length > 0 ? `
      <h2>Affected Systems</h2>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">
        ${systems.map(s => `<span style="padding:2px 9px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;${S_SMALL}color:#0369a1;">${s}</span>`).join('')}
      </div>` : ''}

    ${pageFooter('IOC Summary', date, 5, 7)}
  </div>`;
}

// ── Page 6: Impact Assessment ──────────────────────────────────────────────────

function page6(impact, date) {
  const rr  = impact.reputational_risk || 'Unknown';
  const rrc = SEV_COLOR[rr] || '#94a3b8';

  return `
  <div class="page">
    ${pageHeader('Impact Assessment', 'Business language only — for CISO and board reporting', date, 6, 7)}

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
      ${metric(impact.records_exposed > 0 ? impact.records_exposed.toLocaleString() : (impact.records_exposed_note || 'Not recorded'), 'Records Exposed', impact.records_exposed > 0 ? '#dc2626' : null)}
      ${metric(impact.downtime_hours > 0 ? formatHours(impact.downtime_hours) : 'Not recorded', 'Downtime')}
      ${metric(impact.financial_cost_estimate || 'Not recorded', 'Financial Cost Est.')}
    </div>

    <div style="padding:9px 12px;border-left:3px solid #92400e;margin-bottom:14px;">
      <div style="${S_LABEL}color:#92400e;margin-bottom:4px;">Business Impact</div>
      <div style="${S_BODY}">${impact.business_impact_narrative || ''}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <h2>Risk Profile</h2>
        ${field('Reputational Risk',     badge(rr, rrc))}
        ${field('Notification Required', impact.notification_required != null ? (impact.notification_required ? '⚠ Yes — action required' : 'No') : null)}
        ${field('Notification Deadline', impact.notification_deadline)}
        ${field('Recovery Status',       impact.recovery_status)}
      </div>
      <div>
        <h2>Data &amp; Compliance</h2>
        ${field('Data Types Affected',    impact.data_types_affected?.join(', '))}
        ${field('Regulatory Obligations', impact.regulatory_obligations?.join(', '))}
        ${field('Affected Systems',       impact.affected_systems?.join(', '))}
      </div>
    </div>

    ${pageFooter('Impact Assessment', date, 6, 7)}
  </div>`;
}

// ── Page 7: Recommendations ───────────────────────────────────────────────────

function page7(recs, date) {
  function recCards(items) {
    if (!items?.length) return `<p style="${S_BODY}color:${TXS};font-style:italic;">None identified.</p>`;
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">` +
      items.map(r => {
        const pc = PRI_COLOR[r.priority] || '#64748b';
        return `
          <div style="border-left:3px solid ${pc};border-radius:4px;border:1px solid ${pc}22;border-left-width:3px;padding:7px 10px 7px 11px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              ${badge(r.priority, pc)}
              <span style="font-size:9px;color:${TXM};font-weight:600;">${r.owner}</span>
            </div>
            <div style="${S_SMALL}font-weight:700;margin-bottom:3px;line-height:1.4;">${r.finding}</div>
            <div style="${S_SMALL}color:${TXM};line-height:1.5;margin-bottom:4px;">${r.action}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;border-top:1px solid ${pc}20;">
              <span style="font-size:9px;color:${TXM};">Due: ${r.deadline}</span>
              ${r.risk ? `<span style="font-size:9px;color:${TXS};font-style:italic;max-width:55%;text-align:right;">Risk: ${r.risk}</span>` : ''}
            </div>
          </div>`;
      }).join('') + `</div>`;
  }

  return `
  <div class="page">
    ${pageHeader('Recommendations', 'Actions assigned to responsible teams — not directives to leadership', date, 7, 7)}

    <h2 style="color:#dc2626;border-bottom-color:#dc2626;">Immediate Actions — 0 to 30 Days</h2>
    ${recCards(recs.immediate)}

    <h2 style="margin-top:12px;color:${ACCENT};border-bottom-color:${ACCENT};">Strategic Actions — 30 to 90 Days</h2>
    ${recCards(recs.strategic)}

    ${recs.lessons_learned?.length ? `
      <h2 style="margin-top:12px;color:${NAVY};">Lessons Learned</h2>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${recs.lessons_learned.map(l => `
          <div style="border-left:2px solid ${NAVY};padding:5px 9px;">
            <div style="${S_SMALL}font-weight:600;line-height:1.5;">${l.lesson}</div>
            ${l.applies_to ? `<div style="font-size:9px;color:${TXM};text-transform:uppercase;letter-spacing:0.05em;margin-top:1px;">${l.applies_to}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

    <div style="margin-top:16px;padding:10px 0;border-top:1px solid #e2e8f0;">
      <div style="${S_LABEL}margin-bottom:5px;">About This Report</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 22px;">
        <div style="${S_SMALL}color:${TXM};"><strong>What is IRIS?</strong> IRIS converts raw incident notes into a CISO-facing brief following CrowdStrike, Mandiant, and Unit 42 standards. All extraction is performed by Claude AI.</div>
        <div style="${S_SMALL}color:${TXM};"><strong>Limitations:</strong> Report is generated from notes provided. Claude may miss details not written down. Treat IOCs as leads. Human review required before external disclosure.</div>
        <div style="${S_SMALL}color:${TXM};"><strong>Confirmed vs suspected:</strong> Timeline events marked ✓ are explicitly evidenced. Events marked ? are inferred or suspected.</div>
        <div style="${S_SMALL}color:${TXM};"><strong>Legal notice:</strong> This report may constitute a legal document. Preserve original notes and artefacts. Consult legal counsel before disclosing to regulators.</div>
      </div>
    </div>

    ${pageFooter('Recommendations', date, 7, 7)}
  </div>`;
}

// ── Executive Brief — Page 2: Summary ─────────────────────────────────────────

function execPage2(exec, date) {
  const m         = exec.key_metrics || {};
  const sev       = m.severity || 'Unknown';
  const sc        = SEV_COLOR[sev] || '#94a3b8';
  const dwellAlert = m.dwell_time_hours > 72;
  const dwellColor = dwellAlert ? '#dc2626' : NAVY;
  const dwellVal   = m.dwell_time_hours > 0 ? formatHours(m.dwell_time_hours) : 'Not recorded';

  return `
  <div class="page">
    ${pageHeader('Executive Summary', `${m.incident_name ? m.incident_name + ' · ' : ''}Executive Brief — Page 2 of 3`, date, 2, 3)}

    <div style="display:flex;align-items:stretch;border-radius:5px;overflow:hidden;margin-bottom:10px;border:1px solid ${sc}33;">
      <div style="background:${sc};color:#fff;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:80px;">
        <div style="${S_LABEL}color:rgba(255,255,255,0.8);margin-bottom:2px;">Severity</div>
        <div style="font-size:18px;font-weight:800;line-height:1;">${sev.toUpperCase()}</div>
      </div>
      <div style="flex:1;padding:10px 14px;">
        <div style="font-size:13px;font-weight:700;color:${NAVY};line-height:1.4;margin-bottom:4px;">${exec.headline || 'Incident Brief'}</div>
        <div style="${S_MUTED}">
          ${m.breach_start   ? `Breach: <strong>${m.breach_start}</strong>` : ''}
          ${m.detection_date ? `&nbsp;·&nbsp; Detected: <strong>${m.detection_date}</strong>` : ''}
          ${m.dwell_time_hours > 0 ? `&nbsp;·&nbsp; <span style="color:${dwellColor};font-weight:700;">Undetected for: ${dwellVal}</span>` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px;">
      ${metric(m.systems_affected  >= 0 ? m.systems_affected : 'Not recorded', 'Systems Affected')}
      ${metric(m.records_at_risk   >  0 ? m.records_at_risk.toLocaleString() : 'Not recorded', 'Records at Risk', m.records_at_risk > 0 ? '#dc2626' : null)}
      ${metric(dwellVal, 'Undetected For', dwellAlert ? '#dc2626' : null)}
      ${metric(m.estimated_cost_usd > 0 ? '$' + m.estimated_cost_usd.toLocaleString() : 'Not recorded', 'Est. Cost')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
      ${exec.detection_method ? `
        <div style="padding:7px 9px;border-left:2px solid ${TXM};">
          <div style="${S_LABEL}margin-bottom:2px;">How Detected</div>
          <div style="${S_SMALL}">${exec.detection_method}</div>
        </div>` : ''}
      ${exec.containment_status ? (() => {
        const cc = exec.containment_status === 'Fully Contained' ? '#15803d' : exec.containment_status === 'Not Contained' ? '#dc2626' : '#92400e';
        return `
        <div style="padding:7px 9px;border-left:3px solid ${cc};">
          <div style="${S_LABEL}color:${cc};margin-bottom:2px;">Containment</div>
          <div style="font-size:11px;font-weight:800;color:${cc};">${exec.containment_status}</div>
        </div>`;
      })() : ''}
      ${exec.current_owner ? `
        <div style="padding:7px 9px;border-left:2px solid ${TXM};">
          <div style="${S_LABEL}margin-bottom:2px;">Current Owner</div>
          <div style="${S_SMALL}">${exec.current_owner}</div>
        </div>` : ''}
    </div>

    <h2>Summary &amp; Status</h2>
    ${[
      { q:'What happened',  a: trunc(exec.what_happened, 320) },
      { q:'What we did',    a: trunc(exec.what_we_did,   260) },
      { q:'What it means',  a: trunc(exec.what_it_means, 260) },
      { q:"What's next",    a: trunc(exec.whats_next,    220) },
    ].map(({ q, a }) => `
      <div style="margin-bottom:6px;">
        <div style="${S_LABEL}color:${ACCENT};margin-bottom:2px;">${q}</div>
        <div style="font-size:10px;line-height:1.5;color:${TX};padding-left:7px;border-left:1px solid #dbeafe;">${a || ''}</div>
      </div>`).join('')}

    ${pageFooter('Executive Summary', date, 2, 3)}
  </div>`;
}

// ── Executive Brief — Page 3: Impact & Priority Actions ───────────────────────

function execPage3(impact, recs, date) {
  const rr  = impact.reputational_risk || 'Unknown';
  const rrc = SEV_COLOR[rr] || '#94a3b8';

  const topRecs = [
    ...(recs.immediate || []).filter(r => r.priority === 'Critical' || r.priority === 'High'),
    ...(recs.strategic || []).filter(r => r.priority === 'Critical' || r.priority === 'High'),
  ].slice(0, 4);

  const totalRecs  = [...(recs.immediate || []), ...(recs.strategic || [])].length;
  const lowerCount = totalRecs - topRecs.length;

  return `
  <div class="page">
    ${pageHeader('Impact & Priority Actions', 'Executive Brief — Page 3 of 3', date, 3, 3)}

    <h2>Business Impact</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:10px;">
      ${metric(impact.records_exposed > 0 ? impact.records_exposed.toLocaleString() : (impact.records_exposed_note || 'Not recorded'), 'Records Exposed', impact.records_exposed > 0 ? '#dc2626' : null)}
      ${metric(impact.downtime_hours > 0 ? formatHours(impact.downtime_hours) : 'Not recorded', 'Downtime')}
      ${metric(impact.financial_cost_estimate || 'Not recorded', 'Financial Cost Est.')}
    </div>

    <div style="padding:8px 11px;border-left:3px solid #92400e;margin-bottom:10px;">
      <div style="${S_LABEL}color:#92400e;margin-bottom:3px;">Business Impact</div>
      <div style="font-size:10px;line-height:1.5;color:${TX};">${trunc(impact.business_impact_narrative, 380) || ''}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div>
        ${field('Reputational Risk',     badge(rr, rrc))}
        ${field('Notification Required', impact.notification_required != null ? (impact.notification_required ? '⚠ Yes — action required' : 'No') : null)}
        ${field('Notification Deadline', impact.notification_deadline)}
      </div>
      <div>
        ${field('Data Types Affected',    impact.data_types_affected?.join(', '))}
        ${field('Regulatory Obligations', impact.regulatory_obligations?.join(', '))}
        ${field('Recovery Status',        impact.recovery_status)}
      </div>
    </div>

    <h2 style="color:#dc2626;border-bottom-color:#dc2626;">Priority Actions — Critical &amp; High</h2>
    ${topRecs.length === 0
      ? `<p style="${S_BODY}color:${TXS};font-style:italic;">No Critical or High priority actions identified.</p>`
      : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
          ${topRecs.map(r => {
            const pc = PRI_COLOR[r.priority] || '#64748b';
            return `
              <div style="border-left:3px solid ${pc};border-radius:4px;border:1px solid ${pc}22;border-left-width:3px;padding:7px 10px 7px 11px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  ${badge(r.priority, pc)}
                  <span style="font-size:9px;color:${TXM};font-weight:600;">${r.owner}</span>
                </div>
                <div style="${S_SMALL}font-weight:700;margin-bottom:3px;line-height:1.4;">${trunc(r.finding, 80)}</div>
                <div style="${S_SMALL}color:${TXM};line-height:1.5;margin-bottom:4px;">${trunc(r.action, 140)}</div>
                <div style="font-size:9px;color:${TXM};padding-top:4px;border-top:1px solid ${pc}20;">Due: ${r.deadline}</div>
              </div>`;
          }).join('')}
        </div>`}

    ${lowerCount > 0 ? `
      <div style="margin-top:8px;padding:7px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;${S_SMALL}color:${TXM};">
        ${lowerCount} additional Medium/Low priority action${lowerCount !== 1 ? 's' : ''} in the full Technical Report.
      </div>` : ''}

    <div style="margin-top:14px;padding:8px 0;border-top:1px solid #e2e8f0;">
      <div style="font-size:9px;color:${TXS};line-height:1.6;">
        <strong style="color:${TXM};">About this brief:</strong> Generated by IRIS from analyst-provided notes using Claude AI.
        Human review required before external disclosure. Full technical detail, IOCs, and MITRE ATT&amp;CK mapping available in the Technical Report.
      </div>
    </div>

    ${pageFooter('Impact & Priority Actions', date, 3, 3)}
  </div>`;
}

// ── CSS ────────────────────────────────────────────────────────────────────────

function css() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Inter',-apple-system,sans-serif; font-size:11px; color:#1e293b; background:#fff; line-height:1.6; }
    .page { width:210mm; padding:11mm 14mm 10mm; margin:0 auto; page-break-after:always; }
    .page-cover { width:210mm; min-height:297mm; margin:0 auto; page-break-after:always; display:flex; flex-direction:column; }
    .page:last-child { page-break-after:avoid; }
    h2 { font-size:9px; font-weight:700; color:${NAVY}; border-bottom:2px solid ${NAVY}; padding-bottom:3px; margin:10px 0 7px; text-transform:uppercase; letter-spacing:0.08em; }
    table { width:100%; border-collapse:collapse; font-size:10px; }
    th { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:${ACCENT}; padding:4px 6px; border-bottom:2px solid #dbeafe; text-align:left; background:#f8fafc; }
    td { padding:4px 6px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
    tr:last-child td { border-bottom:none; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { margin:0; padding:10mm 13mm; }
      .page-cover { margin:0; }
      @page { size:A4; margin:0; }
    }
  `;
}

// ── Entry points ───────────────────────────────────────────────────────────────

export function openPdfReport({ report, sources }) {
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

  const exec   = report.executive_summary  || {};
  const snap   = report.incident_snapshot  || {};
  const tl     = report.attack_timeline    || {};
  const tech   = report.technical_analysis || {};
  const impact = report.impact_assessment  || {};
  const recs   = report.recommendations    || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>IRIS Technical Report — ${exec.key_metrics?.incident_name || 'Incident'} — ${date}</title>
  <style>${css()}</style>
</head>
<body>
  ${pageCover(exec, snap, date, 'technical')}
  ${page1(exec, date)}
  ${page2(snap, exec, date)}
  ${page3(tl, date)}
  ${page4(tech, date)}
  ${page5(tech, date)}
  ${page6(impact, date)}
  ${page7(recs, date)}
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 800));</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Allow pop-ups to export the PDF.'); return; }
  win.document.write(html);
  win.document.close();
}

export function openExecutivePdf({ report }) {
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

  const exec   = report.executive_summary  || {};
  const snap   = report.incident_snapshot  || {};
  const impact = report.impact_assessment  || {};
  const recs   = report.recommendations    || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>IRIS Executive Brief — ${exec.key_metrics?.incident_name || 'Incident'} — ${date}</title>
  <style>${css()}</style>
</head>
<body>
  ${pageCover(exec, snap, date, 'executive')}
  ${execPage2(exec, date)}
  ${execPage3(impact, recs, date)}
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 800));</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Allow pop-ups to export the PDF.'); return; }
  win.document.write(html);
  win.document.close();
}
