/**
 * IRIS PDF Report Generator
 * 7-page CISO-facing incident brief following CrowdStrike / Mandiant / Unit 42 standards.
 * Stephen Few design principles: information density without chartjunk.
 * Navy blue accent — professional, authoritative, IR-firm aesthetic.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const NAVY   = '#0f2341';
const ACCENT = '#1a56db';
const WHITE  = '#ffffff';

const SEV_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b', Unknown:'#94a3b8' };
const PRI_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#64748b' };

const PHASE_COLOR = {
  'Initial Access':'#dc2626',     'Execution':'#ea580c',
  'Persistence':'#d97706',        'Privilege Escalation':'#b45309',
  'Defense Evasion':'#92400e',    'Credential Access':'#7c3aed',
  'Discovery':'#2563eb',          'Lateral Movement':'#0369a1',
  'Collection':'#0891b2',         'Exfiltration':'#0f766e',
  'Command and Control':'#374151','Impact':'#991b1b',
  'Detection':'#16a34a',          'Containment':'#15803d',
  'Eradication':'#166534',        'Recovery':'#14532d',
};

const STATUS_COLOR = {
  Active:'#dc2626', Contained:'#d97706', Eradicated:'#2563eb',
  Recovered:'#16a34a', Monitoring:'#7c3aed', Unknown:'#94a3b8',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

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
  const col = alertColor || NAVY;
  const empty = !value || value === 'Not recorded';
  return `
    <div style="padding:11px 14px;border-left:3px solid ${empty ? '#e2e8f0' : col};border-bottom:1px solid #f1f5f9;">
      <div style="font-size:${empty ? '11px' : '24px'};font-weight:${empty ? '400' : '700'};color:${empty ? '#94a3b8' : col};line-height:1;font-variant-numeric:tabular-nums;font-style:${empty ? 'italic' : 'normal'};">${empty ? 'Not recorded' : value}</div>
      <div style="font-size:9px;color:#64748b;margin-top:3px;text-transform:uppercase;letter-spacing:0.07em;">${label}</div>
    </div>`;
}

function field(label, value) {
  if (!value) return '';
  return `
    <div style="display:grid;grid-template-columns:150px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding-top:1px;">${label}</span>
      <span style="font-size:11px;color:#0f172a;">${value}</span>
    </div>`;
}

function pageHeader(title, subtitle, date, pageNum, totalPages) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.14em;color:#94a3b8;text-transform:uppercase;">CONFIDENTIAL</div>
      <div style="font-size:8px;color:#cbd5e1;">Page ${pageNum} of ${totalPages}</div>
    </div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid ${NAVY};">
      <div>
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:${NAVY};line-height:1;">IRIS</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px;">${title}</div>
        ${subtitle ? `<div style="font-size:10px;color:#94a3b8;margin-top:1px;">${subtitle}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#334155;font-weight:500;">${date}</div>
      </div>
    </div>`;
}

function pageFooter(label, date, pageNum, totalPages) {
  return `
    <div style="font-size:9px;color:#aaa;text-align:center;margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;">
      IRIS — Incident Response Intelligence Summary &nbsp;·&nbsp; ${label} &nbsp;·&nbsp; ${date}
      &nbsp;·&nbsp; CONFIDENTIAL &nbsp;·&nbsp; Page ${pageNum} of ${totalPages}
    </div>`;
}

// ── Cover Page ────────────────────────────────────────────────────────────────

function page0(exec, snap, date) {
  const m   = exec.key_metrics || {};
  const sev = m.severity || 'Unknown';
  const sc  = SEV_COLOR[sev] || '#94a3b8';
  const status = snap.current_status || exec.containment_status || 'Unknown';
  const stc = STATUS_COLOR[status] || '#94a3b8';

  const metricItems = [
    [m.systems_affected >= 0 ? m.systems_affected : null, 'Systems Affected', null],
    [m.records_at_risk > 0 ? m.records_at_risk.toLocaleString() : null, 'Records at Risk', m.records_at_risk > 0 ? '#dc2626' : null],
    [m.dwell_time_hours > 0 ? formatHours(m.dwell_time_hours) : null, 'Undetected For', m.dwell_time_hours > 72 ? '#dc2626' : null],
    [m.estimated_cost_usd > 0 ? '$' + m.estimated_cost_usd.toLocaleString() : null, 'Est. Financial Cost', null],
  ];

  return `
  <div class="page" style="padding:0;display:flex;flex-direction:column;">
    <!-- Navy header band -->
    <div style="background:${NAVY};padding:18mm 18mm 16mm;display:flex;flex-direction:column;min-height:158mm;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;color:#4b6a9b;text-transform:uppercase;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #1e3a5f;">CONFIDENTIAL</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:20px 0;">
        <div style="font-size:44px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;margin-bottom:4px;">IRIS</div>
        <div style="font-size:11px;font-weight:400;color:#4b6a9b;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:28px;">Incident Response Intelligence Summary</div>
        <div style="font-size:20px;font-weight:700;color:#e2e8f0;line-height:1.4;margin-bottom:18px;max-width:480px;">${exec.headline || m.incident_name || 'Incident Brief'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.06em;background:${sc};color:#fff;">${sev.toUpperCase()} SEVERITY</span>
          <span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.06em;background:${stc};color:#fff;">${status.toUpperCase()}</span>
        </div>
      </div>
      <div>
        ${m.incident_name ? `<div style="font-size:10px;color:#4b6a9b;margin-bottom:4px;"><span style="color:#64748b;">Incident ID:</span> <span style="color:#94a3b8;font-weight:600;">${m.incident_name}</span></div>` : ''}
        <div style="font-size:10px;color:#4b6a9b;"><span style="color:#64748b;">Report Date:</span> <span style="color:#94a3b8;font-weight:600;">${date}</span></div>
      </div>
    </div>
    <!-- White lower band -->
    <div style="flex:1;padding:14mm 18mm 12mm;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        ${exec.what_happened ? `<p style="font-size:12px;line-height:1.8;color:#334155;margin-bottom:16px;border-left:2px solid #dbeafe;padding-left:10px;">${exec.what_happened}</p>` : ''}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;">
          ${metricItems.map(([val, label, col], i) => `
            <div style="padding:10px 12px;${i < 3 ? 'border-right:1px solid #e2e8f0;' : ''}border-top:2px solid ${col || (val != null ? NAVY : '#e2e8f0')};">
              <div style="font-size:${val != null ? '20px' : '11px'};font-weight:${val != null ? '700' : '400'};color:${val != null ? (col || NAVY) : '#94a3b8'};font-style:${val != null ? 'normal' : 'italic'};line-height:1;font-variant-numeric:tabular-nums;">${val != null ? val : 'Not recorded'}</div>
              <div style="font-size:8.5px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.07em;">${label}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:10px;font-weight:600;color:#334155;margin-bottom:2px;">IRIS · Powered by Claude AI</div>
          <div style="font-size:9px;color:#94a3b8;">AI-generated from analyst notes — human review required before external disclosure</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#94a3b8;text-transform:uppercase;">Confidential</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Page 1: Executive Summary ─────────────────────────────────────────────────

function page1(exec, date) {
  const m  = exec.key_metrics || {};
  const sev = m.severity || 'Unknown';
  const sc  = SEV_COLOR[sev] || '#94a3b8';

  const dwellAlert  = m.dwell_time_hours > 72;
  const dwellColor  = dwellAlert ? '#dc2626' : NAVY;
  const dwellVal    = m.dwell_time_hours > 0 ? formatHours(m.dwell_time_hours) : 'Not recorded';

  return `
  <div class="page">
    ${pageHeader('Executive Summary', `${m.incident_name ? m.incident_name + ' · ' : ''}For CISO / Executive Leadership`, date, 1, 7)}

    <!-- Severity + headline banner -->
    <div style="display:flex;align-items:stretch;gap:0;border-radius:6px;overflow:hidden;margin-bottom:14px;border:1px solid ${sc}33;">
      <div style="background:${sc};color:#fff;padding:14px 18px;display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:100px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;margin-bottom:4px;">Severity</div>
        <div style="font-size:22px;font-weight:800;line-height:1;">${sev.toUpperCase()}</div>
      </div>
      <div style="flex:1;padding:14px 18px;">
        <div style="font-size:14px;font-weight:700;color:${NAVY};line-height:1.4;margin-bottom:6px;">${exec.headline || 'Incident Brief'}</div>
        <div style="font-size:11px;color:#64748b;">
          ${m.breach_start ? `Breach start: <strong>${m.breach_start}</strong>` : ''}
          ${m.detection_date ? `&nbsp;·&nbsp; Detected: <strong>${m.detection_date}</strong>` : ''}
          ${m.dwell_time_hours > 0 ? `&nbsp;·&nbsp; <span style="color:${dwellColor};font-weight:700;">Undetected for: ${dwellVal}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Key metrics -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
      ${metric(m.systems_affected >= 0 ? m.systems_affected : 'Not recorded', 'Systems Affected')}
      ${metric(m.records_at_risk > 0 ? m.records_at_risk.toLocaleString() : 'Not recorded', 'Records at Risk', m.records_at_risk > 0 ? '#dc2626' : null)}
      ${metric(dwellVal, 'Undetected For', dwellAlert ? '#dc2626' : null)}
      ${metric(m.estimated_cost_usd > 0 ? '$' + m.estimated_cost_usd.toLocaleString() : 'Not recorded', 'Est. Cost')}
    </div>

    <!-- Who What Where Why How -->
    ${exec.five_ws ? `
    <h2>Who · What · Where · Why · How</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
      ${[
        { label:'Who carried out the attack', val: exec.five_ws.who_attacked },
        { label:'Who was affected',           val: exec.five_ws.who_affected },
        { label:'What happened',              val: exec.five_ws.what_happened },
        { label:'Where',                      val: exec.five_ws.where },
        { label:'Why (motive)',               val: exec.five_ws.why },
        { label:'How',                        val: exec.five_ws.how },
      ].map(({ label, val }) => `
        <div style="padding:8px 10px;border-left:2px solid ${ACCENT};border-bottom:1px solid #f1f5f9;">
          <div style="font-size:9px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">${label}</div>
          <div style="font-size:11px;line-height:1.6;color:#1e293b;">${val || ''}</div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Detection · Containment · Status -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
      ${exec.detection_method ? `
        <div style="padding:10px 12px;border-left:2px solid #64748b;">
          <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">How Detected</div>
          <div style="font-size:11px;line-height:1.5;color:#1e293b;">${exec.detection_method}</div>
        </div>` : ''}
      ${exec.containment_status ? (() => {
        const cc = exec.containment_status === 'Fully Contained' ? '#15803d' : exec.containment_status === 'Not Contained' ? '#dc2626' : '#92400e';
        return `
        <div style="padding:10px 12px;border-left:3px solid ${cc};">
          <div style="font-size:9px;font-weight:700;color:${cc};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Containment Status</div>
          <div style="font-size:12px;font-weight:800;color:${cc};">${exec.containment_status}</div>
        </div>`;
      })() : ''}
      ${exec.current_owner ? `
        <div style="padding:10px 12px;border-left:2px solid #64748b;">
          <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Current Owner / Handoff</div>
          <div style="font-size:11px;line-height:1.5;color:#1e293b;">${exec.current_owner}</div>
        </div>` : ''}
    </div>

    <!-- CISO Narrative -->
    <h2>Summary &amp; Status</h2>
    ${[
      { q:'What happened',    a: exec.what_happened },
      { q:'What we did',      a: exec.what_we_did },
      { q:'What it means',    a: exec.what_it_means },
      { q:"What's next",      a: exec.whats_next },
    ].map(({ q, a }) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">${q}</div>
        <div style="font-size:12px;line-height:1.7;color:#1e293b;padding-left:8px;border-left:1px solid #dbeafe;">${a || ''}</div>
      </div>`).join('')}

    ${pageFooter('Executive Summary', date, 1, 7)}
  </div>`;
}

// ── Page 2: Incident Snapshot ─────────────────────────────────────────────────

function page2(snap, exec, date) {
  const sev = snap.severity || exec?.key_metrics?.severity || 'Unknown';
  const sc  = SEV_COLOR[sev] || '#94a3b8';
  const stc = STATUS_COLOR[snap.current_status] || '#94a3b8';

  return `
  <div class="page">
    ${pageHeader('Incident Snapshot', `${snap.incident_id || exec?.key_metrics?.incident_name || 'Structured incident record'}`, date, 2, 7)}

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
        ${field('Breach Start',    snap.breach_start || exec?.key_metrics?.breach_start || 'Unknown')}
        ${field('Detection Date',  snap.detection_date || exec?.key_metrics?.detection_date || 'Unknown')}
        ${field('Undetected For',  exec?.key_metrics?.dwell_time_hours > 0 ? `<span style="color:#dc2626;font-weight:700;">${formatHours(exec.key_metrics.dwell_time_hours)} between breach and detection</span>` : '')}
      </div>
    </div>

    ${snap.detection_method ? `
      <h2>How It Was Detected</h2>
      <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;font-size:12px;line-height:1.6;">${snap.detection_method}</div>` : ''}

    ${snap.containment_actions?.length ? `
      <h2>Containment Actions Taken</h2>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${snap.containment_actions.map(a => `
          <div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px;">
            <span style="color:#15803d;font-weight:700;flex-shrink:0;">✓</span>
            <span>${a}</span>
          </div>`).join('')}
      </div>` : ''}

    ${snap.affected_units?.length ? `
      <h2>Affected Business Units</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
        ${snap.affected_units.map(u => `<span style="padding:3px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;font-size:11px;color:#0369a1;">${u}</span>`).join('')}
      </div>` : ''}

    ${snap.regulatory_obligations?.length ? `
      <h2>Regulatory Obligations</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
        ${snap.regulatory_obligations.map(r => `<span style="padding:3px 10px;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;font-size:11px;color:#92400e;font-weight:600;">${r}</span>`).join('')}
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
              <td style="font-family:monospace;font-size:9px;color:#64748b;vertical-align:top;">${d.timestamp || ''}</td>
              <td style="font-size:10px;font-weight:600;vertical-align:top;">${d.made_by || ''}</td>
              <td style="font-size:10px;vertical-align:top;">
                <div style="font-weight:600;margin-bottom:2px;">${d.decision}</div>
                ${d.rationale ? `<div style="color:#475569;">${d.rationale}</div>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

    ${pageFooter('Incident Snapshot', date, 2, 7)}
  </div>`;
}

// ── Page 3: Attack Timeline ───────────────────────────────────────────────────

function page3(timeline, date) {
  const events = timeline.events || [];

  const phaseOrder = [
    'Initial Access','Execution','Persistence','Privilege Escalation',
    'Defense Evasion','Credential Access','Discovery','Lateral Movement',
    'Collection','Exfiltration','Command and Control','Impact',
    'Detection','Containment','Eradication','Recovery',
  ];

  const seenPhases = [...new Set(events.map(e => e.phase).filter(Boolean))];
  const orderedPhases = phaseOrder.filter(p => seenPhases.includes(p));

  const rows = events.map(ev => {
    const pc = PHASE_COLOR[ev.phase] || '#64748b';
    return `
      <tr>
        <td style="font-family:monospace;font-size:9px;color:#64748b;white-space:nowrap;vertical-align:top;width:115px;">${ev.timestamp_utc}</td>
        <td style="vertical-align:top;width:100px;">
          <span style="display:inline-block;font-size:8px;font-weight:700;padding:1px 4px;border-radius:2px;background:${pc}15;color:${pc};border:1px solid ${pc}30;white-space:nowrap;">${ev.phase}</span>
        </td>
        <td style="line-height:1.45;font-size:10px;">${ev.event}</td>
        <td style="text-align:center;font-size:11px;color:${ev.confirmed ? '#16a34a' : '#94a3b8'};width:24px;">${ev.confirmed ? '✓' : '?'}</td>
      </tr>`;
  }).join('');

  return `
  <div class="page">
    ${pageHeader('Attack Timeline', 'All timestamps UTC · ✓ = confirmed · ? = suspected', date, 3, 7)}

    ${timeline.dwell_time_hours > 0 ? `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:5px;margin-bottom:8px;">
        <span style="font-size:14px;">⏱</span>
        <div>
          <span style="font-weight:700;color:#dc2626;font-size:11px;">Undetected for: ${formatHours(timeline.dwell_time_hours)}</span>
          <span style="font-size:10px;color:#ef4444;margin-left:8px;">Time between breach start and detection</span>
        </div>
      </div>` : ''}

    ${orderedPhases.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px;">
        ${orderedPhases.map(p => `<span style="font-size:8px;padding:1px 5px;border-radius:2px;background:${PHASE_COLOR[p] || '#64748b'}15;color:${PHASE_COLOR[p] || '#64748b'};border:1px solid ${PHASE_COLOR[p] || '#64748b'}30;font-weight:600;">${p}</span>`).join('')}
      </div>` : ''}

    ${events.length === 0 ? '<p style="color:#94a3b8;font-size:12px;">No timeline events extracted.</p>' : `
      <table>
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

// ── Pages 4–5: Technical Analysis ─────────────────────────────────────────────

function page4(tech, date) {
  const phases = tech.phases || [];

  const phaseBlocks = phases.map(ph => {
    const pc = PHASE_COLOR[ph.phase] || '#64748b';
    const techRows = (ph.techniques || []).map(t => `
      <tr>
        <td style="font-family:monospace;font-size:10px;color:${ACCENT};font-weight:600;white-space:nowrap;">${t.id}</td>
        <td style="font-weight:600;font-size:11px;">${t.name}</td>
        <td style="font-size:11px;color:#475569;">${t.description}</td>
      </tr>`).join('');

    return `
      <div style="border:1px solid ${pc}30;border-radius:6px;overflow:hidden;margin-bottom:12px;">
        <div style="padding:8px 12px;background:${pc}12;border-bottom:1px solid ${pc}20;display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;font-weight:700;color:${pc};text-transform:uppercase;letter-spacing:0.06em;">${ph.phase}</span>
          ${ph.mitre_tactic ? `<span style="font-size:10px;font-family:monospace;color:#94a3b8;">${ph.mitre_tactic}</span>` : ''}
        </div>
        <div style="padding:10px 12px;">
          <p style="font-size:11px;line-height:1.7;color:#1e293b;margin-bottom:${ph.techniques?.length ? '8px' : '0'};">${ph.narrative}</p>
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
      <div style="padding:10px 14px;border-left:3px solid #7c3aed;margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Threat Actor Assessment</div>
        <div style="font-size:12px;line-height:1.6;color:#1e293b;">${tech.threat_actor_assessment}</div>
      </div>` : ''}

    ${phases.length === 0 ? '<p style="color:#94a3b8;font-size:12px;">No attack phases extracted.</p>' : phaseBlocks}

    ${pageFooter('Technical Analysis', date, 4, 7)}
  </div>`;
}

function page5(tech, date) {
  const ioc = tech.ioc_summary || {};
  const tools = tech.tools_used || [];
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
    ${pageHeader('Technical Analysis — IOC Summary', 'Indicators of Compromise and affected assets', date, 5, 7)}

    ${iocSections.length === 0 && tools.length === 0 && systems.length === 0
      ? '<p style="color:#94a3b8;font-size:12px;">No IOCs extracted.</p>'
      : ''}

    ${iocSections.length > 0 ? `
      <h2>Indicators of Compromise</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
        ${iocSections.map(([label, items]) => `
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${label} (${items.length})</div>
            ${items.map(v => `<div style="font-family:monospace;font-size:10px;color:#334155;padding:2px 0;border-bottom:1px solid #f1f5f9;">${v}</div>`).join('')}
          </div>`).join('')}
      </div>` : ''}

    ${tools.length > 0 ? `
      <h2>Tools &amp; Malware Observed</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${tools.map(t => `<span style="padding:3px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;font-size:11px;color:#dc2626;font-weight:500;">${t}</span>`).join('')}
      </div>` : ''}

    ${systems.length > 0 ? `
      <h2>Affected Systems</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${systems.map(s => `<span style="padding:3px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;font-size:11px;color:#0369a1;">${s}</span>`).join('')}
      </div>` : ''}

    ${pageFooter('Technical Analysis — IOC Summary', date, 5, 7)}
  </div>`;
}

// ── Page 6: Impact Assessment ─────────────────────────────────────────────────

function page6(impact, date) {
  const rr  = impact.reputational_risk || 'Unknown';
  const rrc = SEV_COLOR[rr] || '#94a3b8';

  return `
  <div class="page">
    ${pageHeader('Impact Assessment', 'Business language only — for CISO and board reporting', date, 6, 7)}

    <!-- Metrics -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      ${metric(impact.records_exposed > 0 ? impact.records_exposed.toLocaleString() : (impact.records_exposed_note || 'Not recorded'), 'Records Exposed', impact.records_exposed > 0 ? '#dc2626' : null)}
      ${metric(impact.downtime_hours > 0 ? formatHours(impact.downtime_hours) : 'Not recorded', 'Downtime')}
      ${metric(impact.financial_cost_estimate || 'Not recorded', 'Financial Cost Est.')}
    </div>

    <!-- Business impact -->
    <div style="padding:10px 14px;border-left:3px solid #92400e;margin-bottom:16px;">
      <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px;">Business Impact</div>
      <div style="font-size:12px;line-height:1.8;color:#1e293b;">${impact.business_impact_narrative || ''}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <h2>Risk Profile</h2>
        ${field('Reputational Risk',     badge(rr, rrc))}
        ${field('Notification Required', impact.notification_required != null ? (impact.notification_required ? '⚠ Yes' : 'No') : null)}
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
    if (!items?.length) return '<p style="font-size:10px;color:#94a3b8;font-style:italic;">None identified.</p>';
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">` +
      items.map(r => {
        const pc = PRI_COLOR[r.priority] || '#64748b';
        return `
          <div style="border-left:3px solid ${pc};border-bottom:1px solid #f1f5f9;padding:8px 10px 8px 12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
              ${badge(r.priority, pc)}
              <span style="font-size:9px;color:#64748b;font-weight:600;">${r.owner}</span>
            </div>
            <div style="font-size:10px;font-weight:700;color:#0f172a;margin-bottom:4px;line-height:1.4;">${r.finding}</div>
            <div style="font-size:10px;color:#334155;line-height:1.5;margin-bottom:5px;">${r.action}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:5px;border-top:1px solid ${pc}20;">
              <span style="font-size:9px;color:#64748b;">Due: ${r.deadline}</span>
              ${r.risk ? `<span style="font-size:9px;color:#94a3b8;font-style:italic;max-width:55%;text-align:right;">Risk: ${r.risk}</span>` : ''}
            </div>
          </div>`;
      }).join('') +
    `</div>`;
  }

  return `
  <div class="page">
    ${pageHeader('Recommendations', 'Actions assigned to responsible teams — not directives to leadership', date, 7, 7)}

    <h2 style="color:#dc2626;border-bottom-color:#dc2626;">Immediate Actions — 0 to 30 Days</h2>
    ${recCards(recs.immediate)}

    <h2 style="margin-top:14px;color:${ACCENT};border-bottom-color:${ACCENT};">Strategic Actions — 30 to 90 Days</h2>
    ${recCards(recs.strategic)}

    ${recs.lessons_learned?.length ? `
      <h2 style="margin-top:16px;color:${NAVY};">Lessons Learned</h2>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${recs.lessons_learned.map(l => `
          <div style="border-left:2px solid ${NAVY};padding:6px 10px;">
            <div style="font-size:10px;font-weight:600;color:#0f172a;line-height:1.5;">${l.lesson}</div>
            ${l.applies_to ? `<div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${l.applies_to}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

    <!-- About appendix -->
    <div style="margin-top:20px;padding:12px 0;border-top:1px solid #e2e8f0;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;margin-bottom:6px;">About This Report</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;">
        <div style="font-size:10px;color:#475569;line-height:1.5;"><strong>What is IRIS?</strong> IRIS converts raw incident investigation notes into a professional, CISO-facing brief following CrowdStrike, Mandiant, and Unit 42 standards. All extraction is performed by Claude — a large language model.</div>
        <div style="font-size:10px;color:#475569;line-height:1.5;"><strong>Limitations:</strong> This report is generated from the notes provided. Claude may miss details that were not written down. Treat extracted IOCs as leads, not confirmed evidence. Human review of all sections is required before external disclosure.</div>
        <div style="font-size:10px;color:#475569;line-height:1.5;"><strong>Confirmed vs suspected:</strong> Timeline events marked ✓ are explicitly evidenced in the notes. Events marked ? are inferred or suspected — stated as such throughout this report.</div>
        <div style="font-size:10px;color:#475569;line-height:1.5;"><strong>Legal notice:</strong> This report may constitute a legal document. Preserve original notes and artefacts. Do not alter facts. Consult legal counsel before disclosing to regulators.</div>
      </div>
    </div>

    ${pageFooter('Recommendations', date, 7, 7)}
  </div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function css() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Inter',-apple-system,sans-serif; font-size:10.5px; color:#0f172a; background:#fff; line-height:1.45; }
    .page { width:210mm; min-height:297mm; padding:11mm 14mm 10mm; margin:0 auto; page-break-after:always; }
    .page:last-child { page-break-after:avoid; }
    h2 { font-size:9.5px; font-weight:700; color:#0f2341; border-bottom:2px solid #0f2341; padding-bottom:3px; margin:12px 0 8px; text-transform:uppercase; letter-spacing:0.08em; }
    table { width:100%; border-collapse:collapse; font-size:10px; }
    th { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:${ACCENT}; padding:4px 6px; border-bottom:2px solid #dbeafe; text-align:left; background:#f8fafc; }
    td { padding:4px 6px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
    tr:last-child td { border-bottom:none; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { margin:0; padding:10mm 13mm; }
      @page { size:A4; margin:0; }
    }
  `;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function openPdfReport({ report, sources }) {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

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
  <title>IRIS — ${exec.key_metrics?.incident_name || 'Incident Brief'} — ${date}</title>
  <style>${css()}</style>
</head>
<body>
  ${page0(exec, snap, date)}
  ${page1(exec, date)}
  ${page2(snap, exec, date)}
  ${page3(tl, date)}
  ${page4(tech, date)}
  ${page5(tech, date)}
  ${page6(impact, date)}
  ${page7(recs, date)}
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 800));
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Allow pop-ups to export the PDF.'); return; }
  win.document.write(html);
  win.document.close();
}
