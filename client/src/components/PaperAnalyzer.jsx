import React, { useState } from 'react';
import MathText from './MathText';

export default function PaperAnalyzer({ syllabusData, apiKey, modelName, onForwardToLab, onForwardToFlashcards }) {
  const [paperText, setPaperText] = useState('');
  const [paperFile, setPaperFile] = useState(null);
  const [examName, setExamName] = useState('Mid-Term Examination');
  const [year, setYear] = useState('2024');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem('last_paper_analysis');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'frequency' | 'predictions' | 'blindspots'

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPaperFile(e.target.files[0]);
      setExamName(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAnalyzePaper = async () => {
    if (!paperFile && !paperText.trim()) {
      setError('Please upload a PDF or paste past year exam paper text.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('paperText', paperText);
      formData.append('syllabusContext', JSON.stringify(syllabusData));
      formData.append('examName', examName);
      formData.append('year', year);
      formData.append('modelName', modelName || 'gemini-3.6-flash');

      if (paperFile) {
        formData.append('paperFile', paperFile);
      }

      const headers = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch('/api/analyze-paper', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to analyze previous year paper');
      }

      const data = await response.json();
      setResult(data);
      localStorage.setItem('last_paper_analysis', JSON.stringify(data));

      // Track activity in platform analytics
      try {
        const stats = JSON.parse(localStorage.getItem('platform_usage_stats') || '{}');
        stats.papersAnalyzed = (stats.papersAnalyzed || 0) + 1;
        stats.lastActive = new Date().toISOString();
        localStorage.setItem('platform_usage_stats', JSON.stringify(stats));
      } catch (e) {}

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', height: '100%', minHeight: '0' }}>
      
      {/* Left Column: Upload & Configuration */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            🔄 Previous Year Paper Analyzer
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Upload past exam papers to extract question trends, compute topic weightage heatmaps, identify syllabus blindspots, and predict upcoming questions.
          </p>
        </div>

        <div>
          <label className="form-label">Exam Name / Subject Code</label>
          <input
            type="text"
            className="form-input"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="e.g. End Semester Exam 2024"
          />
        </div>

        <div>
          <label className="form-label">Year of Examination</label>
          <input
            type="text"
            className="form-input"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2024"
          />
        </div>

        {/* Upload Past Paper Dropzone */}
        <div>
          <label className="form-label">Upload Question Paper PDF</label>
          <div style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: '8px',
            padding: '20px 14px',
            textAlign: 'center',
            backgroundColor: paperFile ? 'rgba(212, 161, 92, 0.08)' : 'var(--bg-elevated)',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ fontSize: '0.8rem', width: '100%' }}
            />
            {paperFile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'block', marginTop: '6px', fontWeight: '600' }}>
                📄 {paperFile.name}
              </span>
            )}
          </div>
        </div>

        {/* Or Paste Raw Text */}
        <div>
          <label className="form-label">Or Paste Exam Text</label>
          <textarea
            className="form-input"
            rows={5}
            placeholder="Paste text of past questions here..."
            value={paperText}
            onChange={(e) => setPaperText(e.target.value)}
            style={{ fontSize: '0.82rem' }}
          />
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '0.78rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyzePaper}
          disabled={isLoading || (!paperFile && !paperText.trim())}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px' }}
        >
          {isLoading ? 'Extracting & Auditing Past Paper...' : '⚡ Audit & Analyze Paper'}
        </button>
      </div>

      {/* Right Column: Paper Audit Intelligence & Predictions */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {!result ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Past Examination Intelligence
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', lineHeight: 1.5 }}>
              Upload past semester papers on the left to map every historical question to syllabus topics, discover recurring high-yield themes, and calculate upcoming probability forecasts.
            </p>
          </div>
        ) : (
          <>
            {/* Header Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {result.paper_info?.title || examName}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {result.extracted_questions?.length || 0} Questions Extracted • {result.topic_frequency?.length || 0} Syllabus Topics Tested
                </span>
              </div>

              {/* Sub-Tabs Navigation */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`btn ${activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Questions ({result.extracted_questions?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('frequency')}
                  className={`btn ${activeTab === 'frequency' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Topic Frequency
                </button>
                <button
                  onClick={() => setActiveTab('predictions')}
                  className={`btn ${activeTab === 'predictions' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  🔮 AI Predictions
                </button>
                <button
                  onClick={() => setActiveTab('blindspots')}
                  className={`btn ${activeTab === 'blindspots' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  ⚠️ Blindspots
                </button>
              </div>
            </div>

            {/* TAB 1: Extracted Questions */}
            {activeTab === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.extracted_questions?.map((q, idx) => (
                  <div
                    key={idx}
                    className="glass-panel"
                    style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-cyan">{q.question_no || `Q${idx + 1}`}</span>
                        <span className="badge badge-emerald">{q.marks} Marks</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {q.matched_module} ➔ <strong>{q.matched_topic}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {onForwardToLab && (
                          <button
                            onClick={() => onForwardToLab(q.matched_topic)}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--color-primary)' }}
                          >
                            Draft In Lab
                          </button>
                        )}
                        {onForwardToFlashcards && (
                          <button
                            onClick={() => onForwardToFlashcards(q.matched_topic)}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          >
                            Flashcards
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      <MathText text={q.question_text} />
                    </div>

                    {q.conceptual_theme && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Theme: <em>{q.conceptual_theme}</em> • Bloom: {q.bloom_level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: Topic Frequency Heatmap */}
            {activeTab === 'frequency' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Breakdown of topics ordered by marks allocation and recurrence in historical exams:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {result.topic_frequency?.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{f.topic_name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>{f.module_name}</span>
                        </div>
                        <span className="badge badge-cyan">{f.tested_cadence}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', color: 'var(--text-muted)' }}>
                        <span>Questions: <strong style={{ color: 'var(--text-primary)' }}>{f.questions_count}</strong></span>
                        <span>Total Marks: <strong style={{ color: 'var(--color-primary)' }}>{f.total_marks}M</strong></span>
                        <span>Weight: <strong style={{ color: 'var(--color-success)' }}>{f.weight_percentage}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: High-Probability AI Predictions */}
            {activeTab === 'predictions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Forecasting models based on syllabus weightage and topic recurrence cadence:
                </p>
                {result.high_probability_predictions?.map((pred, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '16px',
                      background: 'linear-gradient(145deg, rgba(212, 161, 92, 0.08) 0%, rgba(26, 26, 29, 0.9) 100%)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-strong)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                        🔮 {pred.topic_name}
                      </strong>
                      <span className="badge badge-emerald">
                        {pred.prediction_confidence} Confidence
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      <strong>Why Likely:</strong> {pred.rationale}
                    </p>

                    {pred.predicted_question_prompt && (
                      <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        <strong>Predicted Question Archetype:</strong>
                        <div style={{ marginTop: '4px' }}>
                          <MathText text={pred.predicted_question_prompt} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: Untested Syllabus Blindspots */}
            {activeTab === 'blindspots' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Topics included in your syllabus that did not appear in this exam set (potential high surprise risk for future exams):
                </p>
                {result.untested_syllabus_blindspots?.map((blind, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      background: 'rgba(244, 63, 94, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--color-danger)' }}>
                        ⚠️ {blind.topic_name} ({blind.module_name})
                      </strong>
                      <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.2)', color: 'var(--color-danger)' }}>
                        {blind.risk_level} Surprise Risk
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {blind.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
