import React, { useState } from 'react';

export default function RawJsonView({ data }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.subject_name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'syllabus'}_knowledge_map.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Parsed Schema Output</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleCopy} 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button 
            onClick={handleDownload} 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            Download JSON
          </button>
        </div>
      </div>
      <div style={{ flex: '1', overflow: 'auto', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)' }}>
        <pre style={{
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: '#38bdf8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {jsonString}
        </pre>
      </div>
    </div>
  );
}
