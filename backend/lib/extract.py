"""
IRIS extraction layer — Claude API calls.
One structured tool-use call per section, locally cached.
No raw PII (IPs, hashes, accounts) is sent for executive sections;
they stay in the appendix section only.
"""

import os
import anthropic
from . import cache

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    return _client


MODEL = os.getenv('IRIS_MODEL', 'claude-opus-4-6')

# Prepended to every section system prompt.
_WRITING_RULES = (
    'Writing rules that apply to every field you populate: '
    'Write in complete, professional sentences. '
    'Do not use dashes, hyphens, or double-hyphens (-- or —) as separators, connectors, or list markers. '
    'Do not use bullet points or numbered lists in any text field — write flowing prose instead. '
    'If you need to join two ideas, use a conjunction or start a new sentence. '
    'If a value is unknown or not available, omit the field rather than writing "Unknown", "N/A", or a dash. '
    'This report goes to a CISO and senior leadership — every sentence must read as polished, professional writing. '
)

# ── Section schemas ────────────────────────────────────────────────────────────

_SECTIONS = {

    'executive_summary': {
        'system': (
            'You are a senior incident response writer producing a CISO-facing executive brief. '
            'Use plain business English throughout — no IP addresses, no file hashes, no CVE numbers, '
            'no MITRE codes inline. Facts only; distinguish clearly between confirmed and suspected. '
            'Write in past tense where the incident is contained, present tense where ongoing. '
            'Keep each answer to 2–4 sentences maximum. '
            'The five_ws field must answer WHO (threat actor and who was affected), '
            'WHAT (what happened), WHERE (which systems/locations/departments), '
            'WHY (motive or likely motive), and HOW (attack method in plain English).'
        ),
        'prompt': (
            'From the raw incident investigation notes below, extract the executive summary. '
            'For the what_happened field, begin the first sentence with "On [date]" or "At [time] on [date]" '
            'to immediately anchor the reader in time — e.g. "On 14 April 2026, a ransomware attack..." '
            'Answer the five Ws (Who, What, Where, Why, How), the standard CISO questions, '
            'and derive the key metrics.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'headline':      {'type': 'string', 'description': 'One-sentence plain-English headline for the incident.'},
                'five_ws': {
                    'type': 'object',
                    'description': 'The five Ws — mandatory for every report.',
                    'properties': {
                        'who_attacked':    {'type': 'string', 'description': 'Who carried out the attack — threat actor group, insider, unknown. Plain English.'},
                        'who_affected':    {'type': 'string', 'description': 'Which users, teams, or departments were affected.'},
                        'what_happened':   {'type': 'string', 'description': 'What type of incident occurred — business language, no jargon.'},
                        'where':           {'type': 'string', 'description': 'Where the incident occurred — systems, locations, network areas, business units.'},
                        'why':             {'type': 'string', 'description': 'Motive or likely motive — financial gain, espionage, disruption, unknown.'},
                        'how':             {'type': 'string', 'description': 'How the attack was carried out — plain English, no technical codes.'},
                    },
                    'required': ['who_attacked', 'who_affected', 'what_happened', 'where', 'why', 'how'],
                },
                'what_happened':  {'type': 'string', 'description': 'Narrative: what occurred and its business impact. 2–4 sentences.'},
                'what_we_did':    {'type': 'string', 'description': 'Response actions taken — what the team did to detect, contain, and investigate.'},
                'what_it_means':  {'type': 'string', 'description': 'Business implications — risk to data, operations, reputation, regulatory standing.'},
                'whats_next':     {'type': 'string', 'description': 'Immediate next steps and longer-term remediation priorities.'},
                'detection_method':  {'type': 'string', 'description': 'How the incident was first identified — e.g. user report, EDR alert, external notification, threat intel.'},
                'containment_status': {'type': 'string', 'enum': ['Fully Contained', 'Partially Contained', 'Not Contained', 'Unknown'], 'description': 'Current containment state.'},
                'current_owner':  {'type': 'string', 'description': 'Who currently owns the incident response — team or individual. Includes handoff status if applicable.'},
                'key_metrics': {
                    'type': 'object',
                    'properties': {
                        'incident_name':       {'type': 'string'},
                        'severity':            {'type': 'string', 'enum': ['Critical', 'High', 'Medium', 'Low', 'Unknown']},
                        'breach_start':        {'type': 'string', 'description': 'ISO 8601 UTC or descriptive if unknown.'},
                        'detection_date':      {'type': 'string', 'description': 'ISO 8601 UTC or descriptive.'},
                        'dwell_time_hours':    {'type': 'number', 'description': 'Hours between breach start and detection. -1 if unknown.'},
                        'systems_affected':    {'type': 'integer'},
                        'records_at_risk':     {'type': 'integer', 'description': '-1 if unknown.'},
                        'estimated_cost_usd':  {'type': 'number', 'description': '-1 if unknown.'},
                    },
                    'required': ['incident_name', 'severity', 'dwell_time_hours', 'systems_affected'],
                },
            },
            'required': ['headline', 'five_ws', 'what_happened', 'what_we_did', 'what_it_means', 'whats_next', 'key_metrics'],
        },
    },

    'incident_snapshot': {
        'system': (
            'You are a senior incident response analyst populating a structured incident record. '
            'Extract structured fields from the notes. Use standard IR terminology. '
            'If a field is genuinely unknown, use "Unknown" or null. '
            'For detection_method, be specific — e.g. "User reported suspicious email to helpdesk", '
            '"EDR alert on LSASS access", "External threat intel notification". '
            'For containment_actions, list the specific steps taken — account disabled, network isolated, '
            'system taken offline, etc. '
            'For handoff_status, state who currently owns the incident and whether it has been handed off '
            'to another team, external party, or is still with the original responders.'
        ),
        'prompt': (
            'From the raw incident investigation notes below, populate the incident snapshot fields.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'incident_id':            {'type': 'string'},
                'incident_type':          {'type': 'string', 'description': 'e.g. Ransomware, Data Breach, BEC, Phishing, Insider Threat, APT, DDoS'},
                'severity':               {'type': 'string', 'enum': ['Critical', 'High', 'Medium', 'Low', 'Unknown']},
                'detection_date':         {'type': 'string'},
                'breach_start':           {'type': 'string', 'description': 'Estimated or confirmed start. Use "Unknown" if not determinable.'},
                'detection_method':       {'type': 'string', 'description': 'How was this incident first identified? Be specific.'},
                'containment_actions':    {'type': 'array', 'items': {'type': 'string'}, 'description': 'Specific containment steps taken.'},
                'current_status':         {'type': 'string', 'enum': ['Active', 'Contained', 'Eradicated', 'Recovered', 'Monitoring', 'Unknown']},
                'handoff_status':         {'type': 'string', 'description': 'Who currently owns the incident. Any handoffs that have occurred.'},
                'affected_units':         {'type': 'array', 'items': {'type': 'string'}},
                'data_classification':    {'type': 'string', 'description': 'e.g. Confidential, Restricted, PII, PHI, PCI'},
                'regulatory_obligations': {'type': 'array', 'items': {'type': 'string'}, 'description': 'e.g. GDPR, HIPAA, PCI-DSS, SOX'},
                'incident_commander':     {'type': 'string'},
                'lead_analyst':           {'type': 'string'},
                'key_decisions': {
                    'type': 'array',
                    'description': 'Significant decisions made during the incident response.',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'decision':  {'type': 'string', 'description': 'The decision made — one sentence.'},
                            'rationale': {'type': 'string', 'description': 'Why this decision was made.'},
                            'made_by':   {'type': 'string', 'description': 'Team or individual who made the decision.'},
                            'timestamp': {'type': 'string', 'description': 'When the decision was made, if known.'},
                        },
                        'required': ['decision'],
                    },
                },
            },
            'required': ['incident_type', 'severity', 'current_status'],
        },
    },

    'attack_timeline': {
        'system': (
            'You are a senior incident response analyst reconstructing an attack timeline. '
            'Your job is to extract EVERY timestamped or sequenced event from the notes into the events array. '
            'Do not return an empty events array — if the notes contain any dates, times, or sequence of actions, '
            'they must each become a separate event entry. '
            'Use UTC timestamps throughout. If a timestamp is approximate or relative, write it as given (e.g. "~09:12 UTC", "Day 1 morning"). '
            'List events in strict chronological order. '
            'Assign each event to the most appropriate IR phase: Initial Access, Execution, Persistence, '
            'Privilege Escalation, Defense Evasion, Credential Access, Discovery, '
            'Lateral Movement, Collection, Exfiltration, Command and Control, Impact, '
            'Detection, Containment, Eradication, or Recovery. '
            'Mark confirmed=true if explicitly evidenced, confirmed=false if inferred or suspected. '
            'Calculate dwell_time_hours as the gap in hours between the earliest attacker action and detection/containment.'
        ),
        'prompt': (
            'Extract a complete chronological timeline from the incident notes below. '
            'Every date, time, or sequenced action in the notes must appear as a separate event. '
            'Do not summarise or skip events — include all of them.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'events': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'timestamp_utc': {'type': 'string', 'description': 'ISO 8601 UTC or relative (e.g. "Day 0 ~14:00 UTC")'},
                            'event':         {'type': 'string', 'description': 'Plain-English description of what happened.'},
                            'phase':         {'type': 'string'},
                            'confirmed':     {'type': 'boolean'},
                        },
                        'required': ['timestamp_utc', 'event', 'phase', 'confirmed'],
                    },
                },
                'dwell_time_hours': {'type': 'number', 'description': '-1 if unknown.'},
                'key_milestones': {
                    'type': 'object',
                    'properties': {
                        'initial_access': {'type': 'string'},
                        'detection':      {'type': 'string'},
                        'containment':    {'type': 'string'},
                        'recovery':       {'type': 'string'},
                    },
                },
            },
            'required': ['events', 'dwell_time_hours'],
        },
    },

    'technical_analysis': {
        'system': (
            'You are a senior threat intelligence analyst. '
            'Map the attack to MITRE ATT&CK tactics and techniques. '
            'List IOCs (IPs, hashes, domains, accounts, file paths) accurately and completely — '
            'these go in the technical appendix, not the executive sections. '
            'Be precise: only list techniques with evidence from the notes.'
        ),
        'prompt': (
            'From the raw incident investigation notes below, produce the technical analysis.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'phases': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'phase':         {'type': 'string', 'description': 'Attack phase name'},
                            'mitre_tactic':  {'type': 'string', 'description': 'e.g. TA0001'},
                            'techniques': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'id':          {'type': 'string', 'description': 'e.g. T1566.001'},
                                        'name':        {'type': 'string'},
                                        'description': {'type': 'string', 'description': 'What was observed — 1–2 sentences.'},
                                    },
                                    'required': ['id', 'name', 'description'],
                                },
                            },
                            'narrative': {'type': 'string', 'description': 'Plain-English paragraph for this phase.'},
                        },
                        'required': ['phase', 'techniques', 'narrative'],
                    },
                },
                'ioc_summary': {
                    'type': 'object',
                    'properties': {
                        'ip_addresses': {'type': 'array', 'items': {'type': 'string'}},
                        'file_hashes':  {'type': 'array', 'items': {'type': 'string'}},
                        'domains':      {'type': 'array', 'items': {'type': 'string'}},
                        'accounts':     {'type': 'array', 'items': {'type': 'string'}},
                        'file_paths':   {'type': 'array', 'items': {'type': 'string'}},
                    },
                },
                'tools_used':        {'type': 'array', 'items': {'type': 'string'}},
                'affected_systems':  {'type': 'array', 'items': {'type': 'string'}},
                'threat_actor_assessment': {'type': 'string', 'description': 'Assessment of threat actor — nation-state / criminal / insider / unknown. Facts only.'},
            },
            'required': ['phases', 'ioc_summary'],
        },
    },

    'impact_assessment': {
        'system': (
            'You are a senior IR analyst producing a business-language impact assessment for a CISO. '
            'Translate technical findings into business consequences. '
            'Use ranges where exact figures are unknown (e.g. "500–1,000 records"). '
            'No IP addresses or technical IOC details in this section.'
        ),
        'prompt': (
            'From the raw incident investigation notes below, produce the impact assessment.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'records_exposed':         {'type': 'integer', 'description': '-1 if unknown.'},
                'records_exposed_note':    {'type': 'string', 'description': 'Qualifier or range if exact count unknown.'},
                'downtime_hours':          {'type': 'number', 'description': '-1 if unknown.'},
                'financial_cost_estimate': {'type': 'string', 'description': 'Plain-English range e.g. "$50,000–$200,000" or "Under investigation".'},
                'regulatory_obligations':  {'type': 'array', 'items': {'type': 'string'}},
                'notification_required':   {'type': 'boolean'},
                'notification_deadline':   {'type': 'string', 'description': 'e.g. "72 hours under GDPR Article 33" or null.'},
                'data_types_affected':     {'type': 'array', 'items': {'type': 'string'}},
                'affected_systems':        {'type': 'array', 'items': {'type': 'string'}},
                'business_impact_narrative': {'type': 'string', 'description': '2–4 sentence business-language summary of the impact.'},
                'reputational_risk':       {'type': 'string', 'enum': ['Critical', 'High', 'Medium', 'Low', 'Unknown']},
                'recovery_status':         {'type': 'string'},
            },
            'required': ['business_impact_narrative', 'reputational_risk'],
        },
    },

    'recommendations': {
        'system': (
            'You are a senior IR consultant producing a recommendations section for a report the CISO will read. '
            'The CISO reads this report to assign and track work — they are not an action owner. '
            'Never assign any action to the CISO. Every owner must be a functional team or role below the CISO: '
            'SOC Lead, IT Team, IT Security, Network Engineering, Legal, HR, Compliance Team, '
            'Identity and Access Team, Detection Engineering, or similar. '
            'Split into Immediate (0 to 30 days) and Strategic (30 to 90 days). '
            'Each recommendation must have a specific action, a clear functional team as owner, '
            'a realistic deadline, and the business risk if ignored. '
            'Prioritise ruthlessly — Critical means the organisation is exposed right now. '
            'Also populate lessons_learned with 3 to 5 concise actionable insights the organisation should take '
            'into future incidents — what was done well, what gaps were exposed, and what processes should change.'
        ),
        'prompt': (
            'Based on the raw incident investigation notes below, produce prioritised recommendations. '
            'Every action must be owned by a functional team, never by the CISO.\n\n'
            'Raw notes:\n{notes}'
        ),
        'schema': {
            'type': 'object',
            'properties': {
                'immediate': {
                    'type': 'array',
                    'description': 'Actions required within 0–30 days.',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'finding':   {'type': 'string', 'description': 'The identified gap or risk.'},
                            'risk':      {'type': 'string', 'description': 'Business risk if not addressed.'},
                            'action':    {'type': 'string', 'description': 'Specific action to take.'},
                            'owner':     {'type': 'string', 'description': 'Functional team or role below the CISO responsible for this action. e.g. "SOC Lead", "IT Team", "Network Engineering", "Legal", "HR", "Compliance". Never "CISO".'},
                            'deadline':  {'type': 'string', 'description': 'e.g. "Within 48 hours", "Within 2 weeks".'},
                            'priority':  {'type': 'string', 'enum': ['Critical', 'High', 'Medium', 'Low']},
                        },
                        'required': ['finding', 'risk', 'action', 'owner', 'deadline', 'priority'],
                    },
                },
                'strategic': {
                    'type': 'array',
                    'description': 'Actions required within 30–90 days.',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'finding':   {'type': 'string'},
                            'risk':      {'type': 'string'},
                            'action':    {'type': 'string'},
                            'owner':     {'type': 'string', 'description': 'Functional team or role below the CISO. e.g. "SOC Lead", "IT Team", "Network Engineering", "Legal", "HR", "Compliance". Never "CISO".'},
                            'deadline':  {'type': 'string'},
                            'priority':  {'type': 'string', 'enum': ['Critical', 'High', 'Medium', 'Low']},
                        },
                        'required': ['finding', 'risk', 'action', 'owner', 'deadline', 'priority'],
                    },
                },
                'lessons_learned': {
                    'type': 'array',
                    'description': 'Key lessons learned from this incident — what the organisation should do differently next time.',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'lesson':     {'type': 'string', 'description': 'The lesson — written as an actionable insight, not a problem statement.'},
                            'applies_to': {'type': 'string', 'description': 'The team, process, or capability this lesson applies to.'},
                        },
                        'required': ['lesson'],
                    },
                },
            },
            'required': ['immediate', 'strategic'],
        },
    },
}

# ── Public API ─────────────────────────────────────────────────────────────────

SECTION_NAMES = list(_SECTIONS.keys())


def extract_section(section: str, raw_notes: str) -> dict:
    """
    Extract a structured section from raw notes using Claude API.
    Returns cached result if available.

    Uses prompt caching: the raw_notes block is marked with cache_control
    so it is only charged at full price on the first of the 6 calls.
    Subsequent calls within the 5-minute cache TTL read it at ~10% of
    the normal input token cost.
    """
    if section not in _SECTIONS:
        raise ValueError(f'Unknown section: {section}')

    key = cache.cache_key(section, raw_notes)
    cached = cache.load(key)
    if cached:
        return cached

    cfg = _SECTIONS[section]
    system = _WRITING_RULES + cfg['system']

    # Split prompt into a static preamble and the cacheable notes block.
    # The notes are the expensive part (repeated across all 6 calls) so
    # we mark them with cache_control to get the prompt caching discount.
    preamble = cfg['prompt'].split('{notes}')[0]

    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        tools=[{
            'name': section,
            'description': f'Structured extraction for the {section.replace("_", " ")} section.',
            'input_schema': cfg['schema'],
        }],
        tool_choice={'type': 'tool', 'name': section},
        messages=[{
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': preamble,
                },
                {
                    'type': 'text',
                    'text': raw_notes,
                    'cache_control': {'type': 'ephemeral'},  # cached across the 6 calls
                },
            ],
        }],
    )

    result = response.content[0].input
    cache.save(key, result)
    return result


def extract_all_sections(raw_notes: str) -> dict:
    """
    Extract all sections sequentially. Returns dict keyed by section name.
    Yields (section_name, result) — use as a generator for progress reporting.
    """
    results = {}
    for section in SECTION_NAMES:
        results[section] = extract_section(section, raw_notes)
    return results
