import React, { useState, useMemo, useRef } from 'react';
import MathText from './MathText';

export default function AnswerEvaluator({ syllabusData, apiKey, modelName, savedQuestions = [] }) {
  const [questionSource, setQuestionSource] = useState('bank'); // 'bank' | 'custom'
  const [selectedQuestionId, setSelectedQuestionId] = useState(savedQuestions[0]?.id || '');
  
  // Custom question inputs
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [customMarks, setCustomMarks] = useState(10);

  // Student submission inputs
  const [submissionType, setSubmissionType] = useState('text'); // 'text' | 'file'
  const [studentText, setStudentText] = useState('');
  const [answerFile, setAnswerFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Evaluation states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [resultTab, setResultTab] = useState('scorecard'); // 'scorecard' | 'handwriting'
  const [copiedTranscription, setCopiedTranscription] = useState(false);

  const handleCopyTranscription = () => {
    if (evalResult?.handwriting_analysis?.transcribed_text) {
      navigator.clipboard.writeText(evalResult.handwriting_analysis.transcribed_text);
      setCopiedTranscription(true);
      setTimeout(() => setCopiedTranscription(false), 2000);
    }
  };

  // Derive active question and answer
  const activeQuestionData = useMemo(() => {
    if (questionSource === 'bank') {
      const q = savedQuestions.find(item => item.id === selectedQuestionId);
      return {
        question: q?.question_text || '',
        answer: q?.expected_answer_outline || '',
        marks: q?.marks || 10,
        topic: q?.topic || 'General'
      };
    }
    return {
      question: customQuestion,
      answer: customAnswer,
      marks: customMarks,
      topic: 'Custom Question'
    };
  }, [questionSource, selectedQuestionId, savedQuestions, customQuestion, customAnswer, customMarks]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAnswerFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setAnswerFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEvaluate = async () => {
    if (!activeQuestionData.question.trim()) {
      setError('Please provide or select a question to evaluate.');
      return;
    }
    if (submissionType === 'text' && !studentText.trim()) {
      setError('Please enter the student answer text.');
      return;
    }
    if (submissionType === 'file' && !answerFile) {
      setError('Please upload the student answer sheet (image or PDF).');
      return;
    }

    const effectiveApiKey = apiKey || localStorage.getItem('gemini_api_key') || '';
    const effectiveModel = modelName || localStorage.getItem('model_name') || 'gemini-2.5-flash';

    setIsLoading(true);
    setError(null);
    setEvalResult(null);

    try {
      const formData = new FormData();
      formData.append('questionText', activeQuestionData.question);
      formData.append('modelAnswer', activeQuestionData.answer);
      formData.append('totalMarks', activeQuestionData.marks);
      formData.append('modelName', effectiveModel);

      if (submissionType === 'text') {
        formData.append('answerText', studentText);
      } else if (answerFile) {
        formData.append('answerFile', answerFile);
      }

      const headers = {};
      if (effectiveApiKey) {
        headers['x-api-key'] = effectiveApiKey;
      }

      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to evaluate answer');
      }

      const data = await response.json();
      setEvalResult(data);
      if (submissionType === 'file' && data.handwriting_analysis) {
        setResultTab('handwriting');
      } else {
        setResultTab('scorecard');
      }

      // Track activity in platform analytics
      try {
        const stats = JSON.parse(localStorage.getItem('platform_usage_stats') || '{}');
        stats.answersEvaluated = (stats.answersEvaluated || 0) + 1;
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
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '16px', height: '100%', minHeight: '0' }}>
      
      {/* Left Column: Question & Submission Inputs */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            ✍️ AI Answer Evaluator
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Upload handwritten or typed student answers for step-by-step rubric grading with KaTeX mathematical error analysis.
          </p>
        </div>

        {/* Question Source Toggle */}
        <div>
          <label className="form-label">Select Target Question</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setQuestionSource('bank')}
              className={`btn ${questionSource === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
            >
              From Question Bank ({savedQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setQuestionSource('custom')}
              className={`btn ${questionSource === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
            >
              Custom Question
            </button>
          </div>

          {questionSource === 'bank' ? (
            savedQuestions.length > 0 ? (
              <select
                className="form-input"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                style={{ background: 'var(--bg-secondary)', fontSize: '0.8rem' }}
              >
                {savedQuestions.map(q => (
                  <option key={q.id} value={q.id}>
                    [{q.topic}] {q.question_text.substring(0, 60)}... ({q.marks}M)
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No questions in Bank yet. Save questions from Exam Designer or use "Custom Question".
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Enter exam question text (supports LaTeX $...$)..."
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
              />
              <textarea
                className="form-input"
                rows={3}
                placeholder="Enter model solution outline / key steps (optional)..."
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Max Marks:</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '80px' }}
                  value={customMarks}
                  onChange={(e) => setCustomMarks(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Target Question Preview Card */}
        {activeQuestionData.question && (
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="badge badge-cyan">{activeQuestionData.topic}</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>{activeQuestionData.marks} Marks</span>
            </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '500', lineHeight: 1.4 }}>
              <MathText text={activeQuestionData.question} />
            </div>
          </div>
        )}

        {/* Student Submission Type - Linear Segmented Control */}
        <div>
          <label className="form-label">Student Submission Mode</label>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            marginBottom: '10px',
            background: 'var(--color-obsidian)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--color-graphite)'
          }}>
            <button
              type="button"
              onClick={() => setSubmissionType('text')}
              className={`tab-btn ${submissionType === 'text' ? 'active' : ''}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
            >
              Typed Answer
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType('file')}
              className={`tab-btn ${submissionType === 'file' ? 'active' : ''}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
            >
              📷 Handwritten Paper (Neural Vision)
            </button>
          </div>

          {submissionType === 'text' ? (
            <textarea
              className="form-input"
              rows={8}
              placeholder="Paste student's written response here..."
              value={studentText}
              onChange={(e) => setStudentText(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{ fontSize: '0.8rem', flex: 1, minWidth: '180px' }}
                />
                {answerFile && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      borderColor: 'rgba(235, 87, 87, 0.3)',
                      color: 'var(--color-coral-red)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Remove selected file"
                  >
                    <span>🗑️</span>
                    <span>Remove File</span>
                  </button>
                )}
              </div>

              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-graphite)',
                fontSize: '0.74rem',
                color: 'var(--color-fog)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.1rem' }}>🧠</span>
                <span>
                  <strong style={{ color: 'var(--color-mist)' }}>Neural Vision Transformer:</strong> Deciphers messy/cursive handwriting, LaTeX math symbols ($ \int, \sum $), and hand-drawn diagrams.
                </span>
              </div>

              {filePreview && (
                <div style={{
                  position: 'relative',
                  marginTop: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Floating Action Button directly on top of the image */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.74rem',
                        fontWeight: '600',
                        backgroundColor: 'rgba(224, 76, 76, 0.92)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        transition: 'var(--transition-fast)'
                      }}
                      title="Remove this uploaded image"
                    >
                      <span style={{ fontWeight: 'bold' }}>✕</span>
                      <span>Remove Image</span>
                    </button>
                  </div>

                  <img
                    src={filePreview}
                    alt="Student handwritten answer sheet"
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', display: 'block', background: '#0D0D0F' }}
                  />

                  {/* Caption footer bar with quick delete */}
                  <div style={{
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.74rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                      📷 <strong>{answerFile?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fca5a5',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontWeight: '500'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {!filePreview && answerFile && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📄</span>
                    <span>{answerFile.name}</span>
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>PDF Document</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="btn btn-secondary"
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: '#fca5a5',
                      borderColor: 'rgba(244, 63, 94, 0.4)'
                    }}
                  >
                    ✕ Remove File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '0.78rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleEvaluate}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
        >
          {isLoading
            ? '🧠 Neural Network Analyzing Handwriting & Grading...' 
            : (submissionType === 'file' ? '⚡ Run Neural Handwriting Analysis & Grade' : '⚡ Grade & Evaluate Answer')}
        </button>
      </div>

      {/* Right Column: Evaluation Scorecard & Annotated Feedback */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
        {!evalResult ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Examiner Assessment Workspace
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', lineHeight: 1.5 }}>
              Select a question on the left and submit a student answer (typed or handwritten image) to receive instant step-by-step neural handwriting transcription, legibility scoring, and rubric breakdown.
            </p>
          </div>
        ) : (
          <>
            {/* View Switcher: Scorecard vs Neural Handwriting Analysis - Linear Precision Segmented Control */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px',
              background: 'var(--color-obsidian)',
              borderRadius: '8px',
              border: '1px solid var(--color-graphite)'
            }}>
              <button
                type="button"
                onClick={() => setResultTab('scorecard')}
                className={`tab-btn ${resultTab === 'scorecard' ? 'active' : ''}`}
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.8rem' }}
              >
                <span>📊</span>
                <span>Examiner Scorecard & Rubric</span>
              </button>

              <button
                type="button"
                onClick={() => setResultTab('handwriting')}
                className={`tab-btn ${resultTab === 'handwriting' ? 'active' : ''}`}
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.8rem' }}
              >
                <span>🧠</span>
                <span>Neural Handwriting Analysis</span>
                {evalResult.handwriting_analysis?.legibility_score !== undefined && (
                  <span className="badge" style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderColor: 'var(--color-smoke)',
                    color: 'var(--color-paper)'
                  }}>
                    {evalResult.handwriting_analysis.legibility_score}% Legible
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Examiner Scorecard & Rubric */}
            {resultTab === 'scorecard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Scorecard Hero Banner - Precision Frame */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'var(--color-obsidian)',
                  border: '1px solid var(--color-graphite)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '510' }}>
                      Official Examiner Scorecard
                    </span>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--color-paper)', fontWeight: '510', letterSpacing: '-0.022em', margin: '4px 0' }}>
                      {evalResult.total_score} <span style={{ fontSize: '1.1rem', color: 'var(--color-fog)' }}>/ {evalResult.max_marks} Marks</span>
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-mist)' }}>
                      Overall Percentage: <strong>{evalResult.percentage}%</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      background: evalResult.percentage >= 80 ? 'var(--color-pulse-green)' : (evalResult.percentage >= 50 ? 'var(--color-acid-lime)' : 'var(--color-coral-red)'),
                      color: '#08090a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontWeight: '590',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      {evalResult.overall_grade}
                    </div>
                  </div>
                </div>

                {/* Prominent Official Reason for Marks Awarded */}
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-smoke)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎯</span>
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--color-paper)', fontWeight: '510', margin: 0 }}>
                      Official Reason for Marks Awarded:
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-mist)', lineHeight: 1.6, margin: 0 }}>
                    <MathText text={evalResult.marks_awarded_summary || evalResult.summary} />
                  </p>
                </div>

                {/* Detailed Marks Breakdown: Points Awarded vs Deductions */}
                {evalResult.marks_breakdown && (evalResult.marks_breakdown.points_awarded?.length > 0 || evalResult.marks_breakdown.deductions?.length > 0) && (
                  <div>
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚖️</span>
                      <span>Marks Allocation Justification</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {/* Points Awarded Column */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(123, 174, 127, 0.06)',
                        border: '1px solid rgba(123, 174, 127, 0.25)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-success)', textTransform: 'uppercase' }}>
                            🟢 Points Earned
                          </span>
                          <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                            {evalResult.marks_breakdown.points_awarded?.length || 0} Steps
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {evalResult.marks_breakdown.points_awarded?.map((item, idx) => (
                            <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid rgba(123, 174, 127, 0.15)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{item.item}</strong>
                                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-success)', background: 'rgba(123, 174, 127, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {item.marks}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                <MathText text={item.reason} />
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(244, 63, 94, 0.06)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-danger)', textTransform: 'uppercase' }}>
                            🔴 Point Deductions
                          </span>
                          <span className="badge badge-pink" style={{ fontSize: '0.68rem' }}>
                            {evalResult.marks_breakdown.deductions?.length || 0} Penalties
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {evalResult.marks_breakdown.deductions?.length > 0 ? (
                            evalResult.marks_breakdown.deductions.map((item, idx) => (
                              <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{item.item}</strong>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-danger)', background: 'rgba(244, 63, 94, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {item.marks}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                  <MathText text={item.reason} />
                                </p>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
                              No mark deductions. Full credit awarded!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step-by-Step Rubric Breakdown with Explicit Reason for Marks */}
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Section-wise Marking Rubric & Scoring Rationale
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evalResult.section_scores?.map((sec, idx) => {
                      const isFull = sec.score === sec.max;
                      const isZero = sec.score === 0;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '14px 16px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{sec.criterion}</strong>
                              <span className={`badge ${isFull ? 'badge-emerald' : (isZero ? 'badge-pink' : 'badge-amber')}`} style={{ fontSize: '0.65rem' }}>
                                {sec.status || (isFull ? 'Full Marks' : (isZero ? 'No Marks' : 'Partial Credit'))}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.88rem', color: 'var(--color-primary)', fontWeight: '700' }}>
                              {sec.score} / {sec.max} Marks
                            </span>
                          </div>

                          <div style={{ width: '100%', height: '5px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${(sec.score / sec.max) * 100}%`,
                              height: '100%',
                              background: isFull ? 'var(--color-success)' : (isZero ? 'var(--color-danger)' : 'var(--color-primary)')
                            }} />
                          </div>

                          <div style={{
                            padding: '8px 10px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            borderLeft: `3px solid ${isFull ? 'var(--color-success)' : (isZero ? 'var(--color-danger)' : 'var(--color-primary)')}`
                          }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Reason for Marks:
                            </div>
                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              <MathText text={sec.reason_for_marks || sec.feedback} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths & Weaknesses 2-Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ padding: '14px', background: 'rgba(123, 174, 127, 0.08)', borderRadius: '8px', border: '1px solid rgba(123, 174, 127, 0.2)' }}>
                    <h5 style={{ fontSize: '0.82rem', color: 'var(--color-success)', marginBottom: '8px' }}>
                      ✅ Key Strengths
                    </h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {evalResult.strengths?.map((s, i) => (
                        <li key={i}><MathText text={s} /></li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <h5 style={{ fontSize: '0.82rem', color: 'var(--color-danger)', marginBottom: '8px' }}>
                      ⚠️ Weaknesses & Errors
                    </h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {evalResult.weaknesses?.map((w, i) => (
                        <li key={i}><MathText text={w} /></li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Improvement Recommendations */}
                {evalResult.improvement_tips?.length > 0 && (
                  <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '0.82rem', color: 'var(--color-primary)', marginBottom: '6px' }}>
                      💡 Actionable Study Suggestions
                    </h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {evalResult.improvement_tips.map((tip, i) => (
                        <li key={i}><MathText text={tip} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Examiner Commentary */}
                {evalResult.detailed_annotated_feedback && (
                  <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Line-by-Line Examiner Commentary
                    </h5>
                    <MathText text={evalResult.detailed_annotated_feedback} />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Neural Handwriting Analysis & Transcription */}
            {resultTab === 'handwriting' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Neural Handwriting Metrics Card - Linear Precision Frame */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'var(--color-obsidian)',
                  border: '1px solid var(--color-graphite)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-violet" style={{ fontSize: '0.68rem' }}>
                        🧠 Multimodal Vision Transformer
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                        HTR (Handwritten Text Recognition)
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--color-paper)', fontWeight: '510', letterSpacing: '-0.022em', margin: '4px 0' }}>
                      Handwriting Legibility Score: {evalResult.handwriting_analysis?.legibility_score || 85}/100
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-mist)' }}>
                      Legibility Rating: <strong style={{ color: (evalResult.handwriting_analysis?.legibility_score || 85) >= 75 ? 'var(--color-pulse-green)' : 'var(--color-acid-lime)' }}>
                        {evalResult.handwriting_analysis?.legibility_grade || 'Good Script'}
                      </strong>
                    </div>
                  </div>

                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    background: 'var(--color-carbon)',
                    border: '1px solid var(--color-smoke)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '590', color: 'var(--color-paper)' }}>
                      {evalResult.handwriting_analysis?.legibility_score || 85}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      OCR Confidence
                    </div>
                  </div>
                </div>

                {/* Stroke & Presentation Assessment */}
                {evalResult.handwriting_analysis?.stroke_clarity_assessment && (
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✍️</span>
                      <span>Stroke Clarity & Line Formation</span>
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {evalResult.handwriting_analysis.stroke_clarity_assessment}
                    </p>
                  </div>
                )}

                {/* Full Word-for-Word Neural Transcription Box */}
                <div style={{
                  padding: '18px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>📝</span>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>
                        Neural Network Transcription (Deciphered Handwriting)
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyTranscription}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                    >
                      {copiedTranscription ? '✓ Copied!' : '📋 Copy Transcription'}
                    </button>
                  </div>

                  <div style={{
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    {evalResult.handwriting_analysis?.transcribed_text || 'No handwriting text detected in the document.'}
                  </div>
                </div>

                {/* Detected Equations Grid */}
                {evalResult.handwriting_analysis?.detected_equations?.length > 0 && (
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📐</span>
                      <span>Detected Handwritten Mathematical Equations</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {evalResult.handwriting_analysis.detected_equations.map((eq, i) => (
                        <div key={i} style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                              <MathText text={`$${eq.latex || eq.raw_visual}$`} />
                            </div>
                            {eq.note && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {eq.note}
                              </span>
                            )}
                          </div>
                          <span className={`badge ${eq.is_correctly_written ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                            {eq.is_correctly_written ? 'Valid Syntax' : 'Check Notation'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Diagrams / Sketches */}
                {evalResult.handwriting_analysis?.detected_diagrams?.length > 0 && (
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📊</span>
                      <span>Detected Hand-Drawn Diagrams & Schematics</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {evalResult.handwriting_analysis.detected_diagrams.map((diag, i) => (
                        <div key={i} style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{diag.label}</strong>
                            <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{diag.quality || 'Detected'}</span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                            {diag.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Presentation & Legibility Advice */}
                {evalResult.handwriting_analysis?.presentation_tips && (
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--color-graphite)' }}>
                    <h5 style={{ fontSize: '0.82rem', color: 'var(--color-mist)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span>
                      <span>Exam Handwriting Presentation Advice</span>
                    </h5>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-fog)', lineHeight: 1.5, margin: 0 }}>
                      {evalResult.handwriting_analysis.presentation_tips}
                    </p>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
