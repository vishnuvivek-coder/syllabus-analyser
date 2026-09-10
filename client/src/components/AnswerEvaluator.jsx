import React, { useState, useMemo } from 'react';
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

  // Evaluation states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evalResult, setEvalResult] = useState(null);

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
    const effectiveModel = modelName || localStorage.getItem('model_name') || 'gemini-3.6-flash';

    if (!effectiveApiKey) {
      setError('Gemini API Key is missing. Click "Show Controls" in the top bar, open ⚙️ Settings, and paste your Gemini API key to proceed.');
      return;
    }

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

      const headers = {
        'x-api-key': effectiveApiKey
      };

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

        {/* Student Submission Type */}
        <div>
          <label className="form-label">Student Submission Mode</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setSubmissionType('text')}
              className={`btn ${submissionType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
            >
              Typed Answer
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType('file')}
              className={`btn ${submissionType === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
            >
              📷 Upload Image / PDF
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
            <div>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ fontSize: '0.8rem' }}
              />
              {filePreview && (
                <div style={{ marginTop: '10px', maxHeight: '180px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <img src={filePreview} alt="Student answer sheet" style={{ width: '100%', objectFit: 'contain' }} />
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
          {isLoading ? 'Examiner Grading in Progress...' : '⚡ Grade & Evaluate Answer'}
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
              Select a question on the left and submit a student answer to receive instant step-by-step grading, partial credit allocation, and rubric breakdown.
            </p>
          </div>
        ) : (
          <>
            {/* Scorecard Hero Banner */}
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(212, 161, 92, 0.12) 0%, rgba(108, 100, 153, 0.12) 100%)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Official Examiner Scorecard
                </span>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '4px 0' }}>
                  {evalResult.total_score} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ {evalResult.max_marks} Marks</span>
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Overall Percentage: <strong>{evalResult.percentage}%</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: evalResult.percentage >= 80 ? 'var(--color-success)' : (evalResult.percentage >= 50 ? 'var(--color-primary)' : 'var(--color-danger)'),
                  color: '#0D0D0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                }}>
                  {evalResult.overall_grade}
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--color-primary)', marginBottom: '6px' }}>
                Examiner Summary
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {evalResult.summary}
              </p>
            </div>

            {/* Step-by-Step Rubric Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Section-wise Marking Rubric
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evalResult.section_scores?.map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sec.criterion}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: '700' }}>
                        {sec.score} / {sec.max} M
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{ width: `${(sec.score / sec.max) * 100}%`, height: '100%', background: 'var(--color-primary)' }} />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                      <MathText text={sec.feedback} />
                    </p>
                  </div>
                ))}
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
          </>
        )}
      </div>
    </div>
  );
}
