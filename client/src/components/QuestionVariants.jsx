import React, { useState } from 'react';
import MathText from './MathText';

export default function QuestionVariants({ syllabusData, apiKey, modelName, savedQuestions = [], onSaveToBank }) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(savedQuestions[0]?.id || '');
  const [variantCount, setVariantCount] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Custom question fallback (defaults to true if bank is empty)
  const [useCustom, setUseCustom] = useState(savedQuestions.length === 0);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customAnswerText, setCustomAnswerText] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  // Auto-switch to Custom Question if bank has 0 items
  React.useEffect(() => {
    if (savedQuestions.length === 0) {
      setUseCustom(true);
    } else if (!selectedQuestionId && savedQuestions[0]?.id) {
      setSelectedQuestionId(savedQuestions[0].id);
    }
  }, [savedQuestions]);

  const handleFillSample = () => {
    setUseCustom(true);
    setCustomTopic('Machine Learning / Regularization');
    setCustomQuestionText('Explain the mathematical formulation of L1 (Lasso) and L2 (Ridge) penalties in linear regression. In what geometric scenario does Lasso yield sparse coefficients with exact zero values?');
    setCustomAnswerText('Lasso minimizes ||y - Xb||^2 + lambda*||b||_1. The diamond constraint of L1 norm has sharp vertices on the coordinate axes where the elliptical RSS contours often touch first, forcing coefficients to zero.');
    setError(null);
  };

  const activeQuestion = useCustom ? {
    question_text: customQuestionText,
    expected_answer_outline: customAnswerText,
    topic: customTopic || 'General',
    marks: 10,
    difficulty: 'Medium',
    bloom_level: 'Apply'
  } : savedQuestions.find(q => q.id === selectedQuestionId);

  const handleGenerateVariants = async () => {
    if (!activeQuestion || !activeQuestion.question_text || !activeQuestion.question_text.trim()) {
      setError('Please enter a question or click "Try Sample" above before generating.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          questionText: activeQuestion.question_text,
          expectedAnswer: activeQuestion.expected_answer_outline,
          topic: activeQuestion.topic,
          marks: activeQuestion.marks || 10,
          difficulty: activeQuestion.difficulty || 'Medium',
          bloomLevel: activeQuestion.bloom_level || 'Apply',
          variantCount,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate variants');
      }

      const data = await response.json();
      setResult(data);

      // Track activity in platform analytics
      try {
        const stats = JSON.parse(localStorage.getItem('platform_usage_stats') || '{}');
        stats.variantsGenerated = (stats.variantsGenerated || 0) + (data.variants?.length || 0);
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

  const handleSaveVariantToBank = (variant) => {
    if (!onSaveToBank) return;
    const qObj = {
      id: 'q_var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      topic: activeQuestion.topic,
      question_text: variant.question_text,
      expected_answer_outline: variant.expected_answer_outline,
      marks: activeQuestion.marks || 10,
      difficulty: variant.difficulty || activeQuestion.difficulty,
      bloom_level: variant.bloom_level || activeQuestion.bloom_level,
      question_type: variant.variation_type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onSaveToBank(qObj);
    alert('Variant saved to Question Bank!');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', height: '100%', minHeight: '0' }}>
      
      {/* Left Column: Source Selection */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            🔀 Question Variant Generator
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Generate multiple structurally distinct examination variants to prevent plagiarism and assess deep concept mastery from diverse angles.
          </p>
        </div>

        {/* Source Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setUseCustom(false)}
            className={`btn ${!useCustom ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}
          >
            From Bank ({savedQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setUseCustom(true)}
            className={`btn ${useCustom ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}
          >
            Custom Question
          </button>
        </div>

        {!useCustom ? (
          savedQuestions.length > 0 ? (
            <div>
              <label className="form-label">Select Base Question</label>
              <select
                className="form-input"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                style={{ background: 'var(--bg-secondary)', fontSize: '0.8rem' }}
              >
                {savedQuestions.map(q => (
                  <option key={q.id} value={q.id}>
                    [{q.topic}] {q.question_text.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No questions in bank. Switch to "Custom Question" to enter one manually.
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Topic</label>
              <button
                type="button"
                onClick={handleFillSample}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                💡 Fill Sample Question
              </button>
            </div>
            <div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ridge Regression"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Original Question</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Paste original question text (or click 'Fill Sample Question')..."
                value={customQuestionText}
                onChange={(e) => setCustomQuestionText(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Expected Solution (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Solution outline..."
                value={customAnswerText}
                onChange={(e) => setCustomAnswerText(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Original Question Card Preview */}
        {activeQuestion && activeQuestion.question_text && (
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
              Base Question Reference
            </span>
            <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
              <MathText text={activeQuestion.question_text} />
            </div>
          </div>
        )}

        {/* Variant Count Config */}
        <div>
          <label className="form-label">Number of Variants</label>
          <select
            className="form-input"
            value={variantCount}
            onChange={(e) => setVariantCount(parseInt(e.target.value))}
            style={{ background: 'var(--bg-secondary)' }}
          >
            <option value={2}>2 Variants (Set A & Set B)</option>
            <option value={3}>3 Variants (Set A, B, C)</option>
            <option value={4}>4 Distinct Archetypes (Recommended)</option>
            <option value={5}>5 Comprehensive Variations</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '0.78rem' }}>
            {error}
          </div>
        )}

        {!activeQuestion?.question_text?.trim() && (
          <div style={{ padding: '10px 12px', background: 'rgba(212, 161, 92, 0.12)', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✍️ Enter a question or test sample:</span>
            <button
              type="button"
              onClick={handleFillSample}
              style={{ background: 'var(--color-primary)', color: '#0D0D0F', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Fill Sample
            </button>
          </div>
        )}

        <button
          onClick={handleGenerateVariants}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
        >
          {isLoading ? 'Generating Diverse Variations...' : '⚡ Generate Question Variants'}
        </button>
      </div>

      {/* Right Column: Generated Variants List */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {!result ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔀</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Multi-Set Variant Generator
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', lineHeight: 1.5 }}>
              Select a question and click Generate to produce randomized numerical variants, inverse problems, real-world case studies, and boundary edge cases.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Generated Variants for {result.topic}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {result.variants?.length} structurally diverse exam sets created
                </span>
              </div>

              <button
                onClick={() => {
                  result.variants?.forEach(v => handleSaveVariantToBank(v));
                }}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--color-primary)' }}
              >
                📥 Save All to Question Bank
              </button>
            </div>

            {/* Variants Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {result.variants?.map((v, idx) => (
                <div
                  key={v.variant_id || idx}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-emerald" style={{ fontWeight: '700' }}>
                        Variant {idx + 1}
                      </span>
                      <span className="badge badge-violet">
                        {v.variation_type}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Difficulty: <strong>{v.difficulty}</strong> • {v.estimated_solving_time} mins
                      </span>
                    </div>

                    <button
                      onClick={() => handleSaveVariantToBank(v)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                    >
                      💾 Save to Bank
                    </button>
                  </div>

                  {/* Variation Strategy Description */}
                  {v.description && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', background: 'rgba(212, 161, 92, 0.08)', padding: '6px 12px', borderRadius: '4px' }}>
                      💡 <strong>Variation Angle:</strong> {v.description}
                    </div>
                  )}

                  {/* Question Text */}
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: '500' }}>
                    <MathText text={v.question_text} />
                  </div>

                  {/* Solution Outline */}
                  {v.expected_answer_outline && (
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Model Answer Outline:</strong>
                      <MathText text={v.expected_answer_outline} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
