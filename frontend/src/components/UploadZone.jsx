import { useState, useRef } from 'react';

const ACCEPTED = [
  '.txt', '.csv', '.eml', '.docx',
  '.pdf', '.pptx', '.xlsx',
  '.html', '.htm', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.zip',
];

export default function UploadZone({ onIngest, loading }) {
  const [paste, setPaste]     = useState('');
  const [files, setFiles]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    setFiles(prev => [...prev, ...dropped]);
  }

  function handleFileChange(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!paste.trim() && files.length === 0) return;
    const fd = new FormData();
    if (paste.trim()) fd.append('paste', paste.trim());
    files.forEach(f => fd.append('files[]', f));
    onIngest(fd);
  }

  const hasContent = paste.trim() || files.length > 0;

  return (
    <div>
      <div className="card">
        <div className="card-title">Paste Investigation Notes</div>
        <textarea
          style={{
            width: '100%',
            minHeight: 180,
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '10px 12px',
            color: 'var(--text)',
            background: '#fafafa',
            outline: 'none',
          }}
          placeholder={
            'Paste raw analyst notes, timeline entries, log excerpts, email content, or any combination…\n\n' +
            'Example:\n' +
            '2026-03-14 09:42 UTC — Phishing email received by finance@company.com from spoofed domain.\n' +
            '2026-03-14 09:51 UTC — User clicked link, credentials harvested.\n' +
            '2026-03-14 14:30 UTC — SOC alerted to anomalous login from 185.x.x.x...'
          }
          value={paste}
          onChange={e => setPaste(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="card">
        <div className="card-title">Upload Files <span style={{color:'#94a3b8',fontWeight:400,textTransform:'none',letterSpacing:0}}>— Any investigation file</span></div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInput.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 6,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#eff6ff' : '#fafafa',
            transition: 'all 0.15s',
            marginBottom: files.length ? 12 : 0,
          }}
        >
          <div style={{fontSize: 24, marginBottom: 8}}>📂</div>
          <div style={{fontSize: 13, color: 'var(--muted)'}}>
            Drag &amp; drop files here, or <span style={{color:'var(--accent)',fontWeight:600}}>click to browse</span>
          </div>
          <div style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>
            .txt · .csv · .eml · .docx · .pdf · .pptx · .xlsx · .json · .html · .zip
          </div>
          <div style={{fontSize: 11, color: '#94a3b8', marginTop: 2}}>
            Screenshots &amp; images: .png · .jpg · .webp · .gif (analyzed via Claude vision)
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPTED.join(',')}
            style={{display:'none'}}
            onChange={handleFileChange}
          />
        </div>

        {files.length > 0 && (
          <div style={{display:'flex', flexDirection:'column', gap: 6}}>
            {files.map((f, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding: '7px 10px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 5,
                fontSize: 12,
              }}>
                <span style={{color:'#0369a1', fontWeight:500}}>
                  {/\.(png|jpg|jpeg|gif|webp)$/i.test(f.name) ? '🖼️' : '📄'} {f.name}
                </span>
                <span style={{color:'#64748b', fontSize:11}}>
                  {(f.size / 1024).toFixed(1)} KB
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(i); }}
                    style={{marginLeft:10, background:'transparent', color:'#94a3b8', padding:'1px 5px', fontSize:13, fontWeight:700}}
                  >×</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:'flex', justifyContent:'flex-end', gap: 10}}>
        <button
          className="btn-primary"
          disabled={!hasContent || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Uploading…' : 'Process Incident →'}
        </button>
      </div>
    </div>
  );
}
