import React, { useState, useEffect } from 'react';

export default function InputPanel({ onAnalyze, isLoading, progress }) {
  const [syllabusText, setSyllabusText] = useState('');
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [moduleList, setModuleList] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  
  // Settings states & migration logic
  let savedModel = localStorage.getItem('model_name') || 'gemini-3.6-flash';
  if (['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'].includes(savedModel)) {
    savedModel = 'gemini-3.6-flash';
    localStorage.setItem('model_name', 'gemini-3.6-flash');
  }

  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [modelName, setModelName] = useState(savedModel);
  
  const [geminiSelection, setGeminiSelection] = useState(
    ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'].includes(savedModel)
      ? savedModel
      : 'custom'
  );
  const [customModelInput, setCustomModelInput] = useState(
    ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'].includes(savedModel)
      ? ''
      : savedModel
  );

  const [showSettings, setShowSettings] = useState(false);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSyllabusFile(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        setSyllabusFile(file);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(file));
        setSyllabusText(''); // Clear text when screenshot is pasted
        e.preventDefault();
        break;
      }
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSyllabusFile(null);
    setPreviewUrl(null);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', apiKey);
    
    const finalModel = geminiSelection === 'custom' ? customModelInput : geminiSelection;
    localStorage.setItem('model_name', finalModel);
    setModelName(finalModel);
    setShowSettings(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze({
      syllabusText,
      syllabusFile,
      moduleList,
      learningOutcomes,
      apiKey,
      modelName
    });
  };

  return (
    <div 
      className="glass-panel" 
      onPaste={handlePaste}
      style={{ 
        padding: '28px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '100%',
        boxShadow: 'var(--shadow-lg)' 
      }}
    >
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Syllabus Input & Controls</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Upload document, paste text, or drag image screenshot</p>
        </div>
        <button 
          type="button"
          onClick={() => setShowSettings(!showSettings)} 
          className="btn btn-secondary" 
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          title="Configure API key and model"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </div>

      {showSettings && (
        <form onSubmit={handleSaveSettings} style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>Gemini Model Settings</h3>
          
          <div>
            <label className="form-label">Gemini API Key</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="AIzaSy..." 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Create API keys at aistudio.google.com
            </span>
          </div>
          
          <div>
            <label className="form-label">Model Selection</label>
            <select 
              className="form-input" 
              value={geminiSelection} 
              onChange={(e) => setGeminiSelection(e.target.value)}
              style={{ background: 'var(--bg-secondary)', marginBottom: geminiSelection === 'custom' ? '8px' : '0' }}
            >
              <option value="gemini-3.5-flash-lite">⚡ Gemini 3.5 Flash Lite (Fastest & Highly Available)</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Deep Reasoning & Balanced)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
              <option value="custom">-- Custom Model Name --</option>
            </select>
            {geminiSelection === 'custom' && (
              <input
                type="text"
                className="form-input"
                placeholder="Enter custom model (e.g. gemini-omni-flash-preview)"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
              />
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
            Save Configurations
          </button>
        </form>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Upload Dropzone */}
        <div>
          <label className="form-label">Upload Syllabus PDF / Screenshot</label>
          <div style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: '8px',
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: syllabusFile ? 'rgba(79, 70, 229, 0.04)' : 'var(--bg-elevated)',
            borderColor: syllabusFile ? 'var(--color-primary)' : 'var(--border-subtle)',
            transition: 'var(--transition-fast)',
            position: 'relative'
          }}>
            <input 
              type="file" 
              accept=".pdf, image/*" 
              onChange={handleFileChange} 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            {previewUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img 
                  src={previewUrl} 
                  alt="Syllabus Preview" 
                  style={{ 
                    maxHeight: '130px', 
                    maxWidth: '100%', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-subtle)',
                    objectFit: 'contain'
                  }} 
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Screenshot loaded</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.75">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p style={{ fontSize: '0.85rem', color: syllabusFile ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: '500' }}>
                  {syllabusFile ? syllabusFile.name : 'Drop PDF / screenshot or paste image (Ctrl+V)'}
                </p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supports up to 100MB documents</span>
              </div>
            )}
            
            {syllabusFile && (
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); handleRemoveFile(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-danger)',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  marginTop: '8px',
                  cursor: 'pointer',
                  zIndex: 2,
                  position: 'relative'
                }}
              >
                Remove File
              </button>
            )}
          </div>
        </div>

        {/* Textarea for Syllabus Text */}
        <div>
          <label className="form-label">Or Paste Syllabus Text</label>
          <textarea 
            className="form-input" 
            placeholder="Paste syllabus text, course outline, or module descriptions here..." 
            value={syllabusText} 
            onChange={(e) => setSyllabusText(e.target.value)}
            disabled={!!syllabusFile}
            style={{ 
              height: '130px', 
              resize: 'vertical', 
              opacity: syllabusFile ? 0.4 : 1
            }}
          />
        </div>

        {/* Optional Focus Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label">Module Filter (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Module 1, Unit 2"
              value={moduleList}
              onChange={(e) => setModuleList(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Target Outcomes (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. REST APIs, SQL"
              value={learningOutcomes}
              onChange={(e) => setLearningOutcomes(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button or Progress Loader */}
        {isLoading ? (
          <div style={{ 
            padding: '14px', 
            textAlign: 'center', 
            background: 'var(--bg-elevated)', 
            borderRadius: '8px',
            border: '1px solid var(--border-focus)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>Analyzing Syllabus...</span>
            </div>
            {progress && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{progress}</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span>⚡ Fast Analysis Engine (Instant Cache + Streamlined Tokens)</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Resilient Failover</span>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!syllabusFile && !syllabusText.trim()}
              style={{ padding: '12px', fontSize: '0.9rem', width: '100%' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Analyze Syllabus
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
