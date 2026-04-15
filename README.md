# IRIS — Incident Response Intelligence Summary

IRIS is a local tool that converts raw incident response notes into a professional, CISO-facing PDF brief. Drop in analyst notes, email threads, endpoint alerts, or any combination — IRIS extracts the facts using the Claude API and produces a structured 7-section report following CrowdStrike, Mandiant, and Unit 42 standards.

Built for SOC analysts and IR teams who need to brief senior leadership quickly without spending hours formatting documents.

---

## What it does

IRIS accepts raw, unstructured incident data in any format and produces a polished PDF brief suitable for a CISO or executive audience. The report follows an inverted pyramid structure — leadership reads the top half, analysts reference the bottom half.

**Input formats accepted:**
- `.txt` — analyst notes, runbooks, investigation logs
- `.csv` — SIEM exports, endpoint alert logs
- `.eml` — escalation emails, SOC notifications
- `.docx` — draft reports, IR documentation
- Pasted text — anything typed or copied directly into the interface

**PDF sections generated:**
1. **Executive Summary** — high-level narrative, attack vector, business impact
2. **Incident Snapshot** — Who/What/Where/Why/How grid, key metrics, detection and containment status
3. **Attack Timeline** — chronological event table with confirmed vs. suspected indicators
4. **Technical Analysis** — phase-by-phase breakdown (Initial Access → Execution → Persistence → Lateral Movement → Exfiltration)
5. **IOC Summary** — IPs, domains, hashes, usernames, file paths in structured tables
6. **Impact Assessment** — systems affected, data involved, business disruption, regulatory exposure
7. **Recommendations** — immediate (0–30 day) and strategic (30–90 day) actions assigned to functional teams

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | Python 3 + Flask |
| AI extraction | Anthropic Claude API (tool use, 6 structured calls) |
| PDF generation | Pure HTML/CSS rendered via browser print |
| Caching | Local JSON cache at `~/.iris_cache/` |

---

## Prerequisites

- **macOS** (tested on Apple Silicon and Intel)
- **Python 3.10+** — check with `python3 --version`
- **Node.js 18+** — check with `node --version`
- **Anthropic API key** — get one at console.anthropic.com

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/iris.git
cd iris
```

### 2. Set your API key

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and replace `your-key-here` with your real Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
FLASK_PORT=3002
IRIS_MODEL=claude-opus-4-6
```

> **Never commit your `.env` file.** It is listed in `.gitignore`.

### 3. Make the launcher executable (first time only)

```bash
chmod +x start-iris.command
```

### 4. macOS security — first launch

macOS will block the launcher and native binaries the first time. Fix this once:

```bash
xattr -dr com.apple.quarantine /path/to/iris
```

Then double-click `start-iris.command` to launch. On a work Mac with MDM, you can also always launch from Terminal:

```bash
bash start-iris.command
```

---

## Running IRIS

Double-click **`start-iris.command`** or run from Terminal:

```bash
bash start-iris.command
```

The launcher will:
1. Create a Python virtual environment (first run only)
2. Install backend dependencies from `requirements.txt`
3. Install frontend dependencies via `npm install` (first run only)
4. Start the backend on `http://localhost:3002`
5. Start the frontend on `http://localhost:5175`
6. Open your browser automatically

**To stop:** press `Ctrl+C` in the Terminal window. Both servers shut down cleanly.

---

## Usage

1. Open `http://localhost:5175` in your browser
2. Drop files into the upload zone (TXT, CSV, EML, DOCX) or paste raw notes directly
3. Click **Generate Report**
4. IRIS runs 6 extraction calls against Claude — takes 30–60 seconds
5. Review the report preview in the browser
6. Click **Export PDF** to download the final brief

**Cost per run:** approximately $0.10–0.15 on a fresh run. Repeat runs on the same incident are cheaper due to local caching.

---

## Project structure

```
iris/
├── start-iris.command          # One-click launcher (macOS)
├── backend/
│   ├── server.py               # Flask API server (port 3002)
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # API key and config (not committed)
│   ├── .env.example            # Template for .env
│   └── lib/
│       ├── extract.py          # Claude API extraction logic (6 tool-use calls)
│       ├── ingest.py           # File parsing (TXT, CSV, EML, DOCX)
│       └── cache.py            # Local JSON caching (~/.iris_cache/)
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx             # Main application
        ├── components/
        │   ├── UploadZone.jsx      # File drop and paste input
        │   ├── ProcessingStatus.jsx # Extraction progress display
        │   ├── ReportPreview.jsx   # In-browser report viewer
        │   └── ExportButton.jsx    # PDF export
        └── lib/
            └── generateIrisPdf.js  # Full PDF layout (7 pages, HTML/CSS)
```

---

## Sample incident

The `sample-incident/` folder contains a realistic synthetic incident you can use to test IRIS:

| File | Contents |
|---|---|
| `analyst-notes.txt` | Full investigation log from initial triage to containment |
| `endpoint-alerts.csv` | CrowdStrike-style endpoint detection export |
| `soc-escalation-email.eml` | SOC-to-IR escalation email thread |
| `draft-incident-report.docx` | Partially complete draft report |

Drop all four files into IRIS at once to see a full multi-source extraction.

---

## Caching

IRIS caches each extraction result as a JSON file in `~/.iris_cache/`. Cache keys are based on a hash of the input content, so identical inputs reuse the cached result and cost nothing.

**Clear the cache** after making prompt changes in `extract.py`:

```bash
rm ~/.iris_cache/*.json
```

---

## Recommendations design

Recommendations are always assigned to functional teams **below** the CISO — SOC Lead, IT Team, Network Engineering, Legal, HR, Compliance, etc. The CISO reads this report to assign and track work. They are never listed as an action owner.

---

## Security and privacy

- All processing is local except the Claude API call
- Raw notes are sent to Anthropic's API for extraction — do not include PII, classified data, or customer records unless your org has an appropriate data processing agreement
- The `.env` file containing your API key is excluded from git via `.gitignore`
- No data is stored server-side — the Flask backend is stateless

---

## Troubleshooting

**`http proxy error: /api/health` on launch**
The backend failed to start. Check the terminal for errors. Most common cause: missing or invalid `ANTHROPIC_API_KEY` in `backend/.env`.

**`start-iris.command` blocked by macOS**
Run `xattr -dr com.apple.quarantine /path/to/iris` or right-click → Open in Finder.

**Port already in use**
Another process is on port 3002 or 5175. Find and kill it:
```bash
lsof -ti:3002 | xargs kill -9
lsof -ti:5175 | xargs kill -9
```

**Slow or failed extraction**
Claude API calls can take 30–60 seconds on large inputs. If a call fails, clear the cache and retry. Check your API key has available credits.

---

## License

Private — not for redistribution.
