# IRIS — Incident Response Intelligence Summary

![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Python%20%2B%20React-blue?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Claude%20API-orange?style=for-the-badge)
![Input](https://img.shields.io/badge/Input-TXT%20%7C%20CSV%20%7C%20EML%20%7C%20DOCX-blueviolet?style=for-the-badge)
![Output](https://img.shields.io/badge/Output-7--Page%20CISO%20Brief-informational?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?style=for-the-badge)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)

---

## Overview

IRIS is a local AI-powered tool built for SOC analysts and IR teams. It ingests raw, unstructured incident data — analyst notes, endpoint alerts, escalation emails, draft reports — and produces a structured, professional PDF brief ready for a CISO or senior leadership audience.

Built following **CrowdStrike, Mandiant, and Unit 42** reporting standards. The report uses an inverted pyramid structure: leadership reads the executive sections up top, analysts reference the technical detail below.

> **No cloud storage. No SaaS. Runs entirely on your machine** — only the Claude API call leaves your environment.

---

## Report Structure

Each run produces a 7-section PDF brief:

| # | Section | Contents |
|---|---|---|
| 1 | **Executive Summary** | Narrative overview, attack vector, business impact |
| 2 | **Incident Snapshot** | Who/What/Where/Why/How grid, key metrics, detection & containment status |
| 3 | **Attack Timeline** | Chronological event table — confirmed ✓ vs. suspected ? |
| 4 | **Technical Analysis** | Phase-by-phase breakdown: Initial Access → Execution → Persistence → Lateral Movement → Exfiltration |
| 5 | **IOC Summary** | Dedicated tab — IPs, domains, hashes, accounts, file paths with one-click Copy All for blocklisting |
| 6 | **Impact Assessment** | Systems affected, data involved, business disruption, regulatory exposure |
| 7 | **Recommendations** | Immediate (0–30 day) and strategic (30–90 day) actions assigned to functional teams |

---

## Input Formats

Drop in any combination of these — IRIS handles multi-source ingestion automatically:

| Format | Use case |
|---|---|
| `.txt` | Analyst notes, runbooks, investigation logs |
| `.csv` | SIEM exports, endpoint alert logs |
| `.eml` | SOC escalation emails, notification threads |
| `.docx` | Draft reports, IR documentation |
| Pasted text | Anything typed or copied directly into the interface |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | Python 3 + Flask 3 |
| AI Extraction | Anthropic Claude API — 6 structured tool-use calls |
| PDF Generation | Pure HTML/CSS rendered via browser print |
| Caching | Local JSON cache at `~/.iris_cache/` |

---

## Prerequisites

Before you begin, make sure you have:

- **macOS** — Apple Silicon or Intel
- **Python 3.10+** → verify: `python3 --version`
- **Node.js 18+** → verify: `node --version`
- **Anthropic API key** → get one at [console.anthropic.com](https://console.anthropic.com)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Garzajulius21/iris.git
cd iris
```

### 2. Configure your API key

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and add your key:

```env
ANTHROPIC_API_KEY=sk-ant-...
FLASK_PORT=3002
IRIS_MODEL=claude-opus-4-6
```

> **Important:** Never commit your `.env` file. It is excluded by `.gitignore`.

### 3. Make the launcher executable

```bash
chmod +x start-iris.command
```

### 4. Clear macOS security quarantine (first time only)

macOS Gatekeeper will block the launcher and native binaries on first use. Run this once:

```bash
xattr -dr com.apple.quarantine /path/to/iris
```

> On a managed work Mac (MDM), launch directly from Terminal instead of double-clicking — this bypasses Gatekeeper entirely:
> ```bash
> bash start-iris.command
> ```

---

## Running IRIS

Double-click **`start-iris.command`** or launch from Terminal:

```bash
bash start-iris.command
```

The launcher handles everything automatically:

1. Creates a Python virtual environment *(first run only)*
2. Installs backend dependencies from `requirements.txt` *(first run only)*
3. Installs frontend dependencies via `npm install` *(first run only)*
4. Starts the backend at `http://localhost:3002`
5. Starts the frontend at `http://localhost:5175`
6. Opens your browser automatically

Press `Ctrl+C` to stop both servers cleanly.

---

## Usage

1. Open [http://localhost:5175](http://localhost:5175)
2. Drop files into the upload zone or paste raw notes directly
3. Click **Generate Report**
4. IRIS runs 6 extraction calls against Claude *(30–60 seconds)*
5. Review the report preview in the browser
6. Click **Export PDF** to download the finished brief

**Cost per run:** ~$0.10–0.15 on a fresh run. Repeat runs against the same input hit the local cache and cost nothing.

---

## Project Structure

```
iris/
├── start-iris.command              # One-click launcher (macOS)
├── backend/
│   ├── server.py                   # Flask API — port 3002
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # API key & config (not committed)
│   ├── .env.example                # Template for .env
│   └── lib/
│       ├── extract.py              # Claude API — 6 tool-use extraction calls
│       ├── ingest.py               # File parser (TXT, CSV, EML, DOCX)
│       └── cache.py                # Local JSON caching (~/.iris_cache/)
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.jsx                 # Main application shell
│       ├── components/
│       │   ├── UploadZone.jsx      # File drop + paste input
│       │   ├── ProcessingStatus.jsx # Live extraction progress
│       │   ├── ReportPreview.jsx   # In-browser report viewer
│       │   └── ExportButton.jsx    # PDF export trigger
│       └── lib/
│           └── generateIrisPdf.js  # Full 7-page PDF layout (HTML/CSS)
└── sample-incident/                # Synthetic test data
    ├── analyst-notes.txt
    ├── endpoint-alerts.csv
    ├── soc-escalation-email.eml
    └── draft-incident-report.docx
```

---

## Sample Incident

The `sample-incident/` folder contains a realistic synthetic incident for testing:

| File | Contents |
|---|---|
| `analyst-notes.txt` | Full investigation log from initial triage to containment |
| `endpoint-alerts.csv` | CrowdStrike-style endpoint detection export |
| `soc-escalation-email.eml` | SOC-to-IR escalation email thread |
| `draft-incident-report.docx` | Partially complete draft report |

Drop all four files into IRIS at once to test a full multi-source extraction run.

---

## Caching

IRIS caches each extraction result as a JSON file in `~/.iris_cache/`. Cache keys are derived from a hash of the input content — identical inputs reuse cached results and cost nothing.

Clear the cache after making changes to prompts in `extract.py`:

```bash
rm ~/.iris_cache/*.json
```

---

## Recommendations Design

Recommendations are always assigned to **functional teams below the CISO** — SOC Lead, IT Team, Network Engineering, Legal, HR, Compliance, etc.

The CISO reads this report to assign and track work. They are never listed as an action owner.

---

## Security & Privacy

| Concern | Detail |
|---|---|
| Data residency | All processing is local. Only the Claude API call leaves your machine. |
| Sensitive data | Do not input PII, classified data, or customer records without an appropriate DPA with Anthropic. |
| API key | Stored in `backend/.env`, excluded from git via `.gitignore`. Never committed. |
| Server state | The Flask backend is fully stateless — nothing is persisted server-side. |

---

## Troubleshooting

**`http proxy error: /api/health` on launch**
The backend failed to start. Check the terminal output. Most common cause: missing or invalid `ANTHROPIC_API_KEY` in `backend/.env`.

**`start-iris.command` blocked by macOS**
```bash
xattr -dr com.apple.quarantine /path/to/iris
```

**Port already in use**
```bash
lsof -ti:3002 | xargs kill -9
lsof -ti:5175 | xargs kill -9
```

**Slow or failed extraction**
Claude API calls can take 30–60 seconds on large inputs. Clear the cache and retry. Verify your API key has available credits.

---

## License

Private — not for redistribution.

---

*Built with the Claude API · Follows CrowdStrike, Mandiant, and Unit 42 reporting standards*
