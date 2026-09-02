import React, { useState, useEffect } from 'react';
import MathText from './MathText';

export default function QuestionLab({ 
  syllabusData, 
  apiKey, 
  modelName, 
  initialTopic, 
  onClearInitialTopic,
  incomingQuestion,
  savedQuestions = [],
  onSaveToBank,
  onRemoveFromBank
}) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('evaluator'); // 'evaluator' | 'bank'
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Question Editing & AI Refinement States
  const [activeEditingId, setActiveEditingId] = useState(null); // ID or 'winner'
  const [editText, setEditText] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineResult, setRefineResult] = useState(null);
  const [refineError, setRefineError] = useState(null);

  // Collaborative Bank States (Feature 16)
  const [bankSearch, setBankSearch] = useState('');
  const [bankDiffFilter, setBankDiffFilter] = useState('ALL');
  const [bankBloomFilter, setBankBloomFilter] = useState('ALL');
  const [bankRatingFilter, setBankRatingFilter] = useState(0);
  const [bankTagFilter, setBankTagFilter] = useState('ALL');
  const [newTagInput, setNewTagInput] = useState('');
  const [taggingCardId, setTaggingCardId] = useState(null);

  const [questionTags, setQuestionTags] = useState(() => {
    try {
      const saved = localStorage.getItem('question_bank_tags');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [questionRatings, setQuestionRatings] = useState(() => {
    try {
      const saved = localStorage.getItem('question_bank_ratings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateRating = (qId, rating) => {
    setQuestionRatings(prev => {
      const updated = { ...prev, [qId]: rating };
      localStorage.setItem('question_bank_ratings', JSON.stringify(updated));
      return updated;
    });
  };

  const addTag = (qId, tag) => {
    if (!tag.trim()) return;
    setQuestionTags(prev => {
      const cur = prev[qId] || [];
      if (cur.includes(tag.trim())) return prev;
      const updated = { ...prev, [qId]: [...cur, tag.trim()] };
      localStorage.setItem('question_bank_tags', JSON.stringify(updated));
      return updated;
    });
    setNewTagInput('');
  };

  const removeTag = (qId, tagToRemove) => {
    setQuestionTags(prev => {
      const cur = prev[qId] || [];
      const updated = { ...prev, [qId]: cur.filter(t => t !== tagToRemove) };
      localStorage.setItem('question_bank_tags', JSON.stringify(updated));
      return updated;
    });
  };

  const handleExportBankJSON = () => {
    const exportPayload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      subject: syllabusData?.subject_name || 'Academic Course',
      questions: savedQuestions.map(q => ({
        ...q,
        tags: questionTags[q.id] || [],
        rating: questionRatings[q.id] || 0
      }))
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question_bank_${(syllabusData?.subject_name || 'course').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBankJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        if (!importedQuestions.length) {
          alert('No questions found in imported file.');
          return;
        }

        let addedCount = 0;
        importedQuestions.forEach(q => {
          if (q.question_text && onSaveToBank) {
            onSaveToBank(q);
            if (q.tags?.length) {
              setQuestionTags(prev => ({ ...prev, [q.id]: q.tags }));
            }
            if (q.rating) {
              setQuestionRatings(prev => ({ ...prev, [q.id]: q.rating }));
            }
            addedCount++;
          }
        });

        alert(`Successfully imported ${addedCount} questions into your Question Bank!`);
      } catch (err) {
        alert('Failed to parse Question Bank JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Flatten topics from all modules to populate selection options
  const allTopics = React.useMemo(() => {
    if (!syllabusData || !syllabusData.modules) return [];
    const list = [];
    syllabusData.modules.forEach(mod => {
      if (mod.topics) {
        mod.topics.forEach(t => {
          list.push({
            id: t.topic_id,
            name: t.topic_name,
            module: mod.module_name
          });
        });
      }
    });
    return list;
  }, [syllabusData]);

  // Handle initialization if a topic was forwarded from another tab
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
      setActiveSubTab('evaluator');
      handleGenerate(initialTopic);
      if (onClearInitialTopic) onClearInitialTopic();
    }
  }, [initialTopic]);

  // Handle incoming question forwarded from Exam Designer
  useEffect(() => {
    if (incomingQuestion) {
      if (incomingQuestion.topic) {
        setSelectedTopic(incomingQuestion.topic);
      }
      setActiveSubTab('bank');
    }
  }, [incomingQuestion]);

  // Set default selection if empty
  useEffect(() => {
    if (allTopics.length > 0 && !selectedTopic) {
      setSelectedTopic(allTopics[0].name);
    }
  }, [allTopics]);

  const handleGenerate = async (topicToUse) => {
    const target = topicToUse || selectedTopic;
    if (!target) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate-optimized-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          topic: target,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to conduct question analysis');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditing = (id, initialQText, initialAnsText) => {
    setActiveEditingId(id);
    setEditText(initialQText || '');
    setEditAnswer(initialAnsText || '');
    setAiInstruction('');
    setRefineResult(null);
    setRefineError(null);
  };

  const handleCancelEditing = () => {
    setActiveEditingId(null);
    setEditText('');
    setEditAnswer('');
    setAiInstruction('');
    setRefineResult(null);
    setRefineError(null);
  };

  const handleAIRefine = async (topicName) => {
    if (!aiInstruction.trim()) return;

    setIsRefining(true);
    setRefineError(null);
    setRefineResult(null);

    try {
      const response = await fetch('/api/refine-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          question: editText,
          answer: editAnswer,
          instructions: aiInstruction,
          topic: topicName,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to refine question');
      }

      const data = await response.json();
      setRefineResult(data);
    } catch (err) {
      console.error(err);
      setRefineError(err.message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleAcceptAIRefinement = (onSaveCallback) => {
    if (!refineResult) return;
    const updatedQ = refineResult.revised_question;
    const updatedAns = refineResult.revised_answer_outline;
    
    setEditText(updatedQ);
    setEditAnswer(updatedAns);
    setRefineResult(null);

    if (onSaveCallback) {
      onSaveCallback(updatedQ, updatedAns);
    }
  };

  const handleSaveWinningQuestion = () => {
    if (!result || !result.selected_question) return;
    const qObj = {
      id: 'q_lab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      topic: result.topic,
      question_text: editText || result.selected_question.question_text,
      expected_answer_outline: editAnswer || result.selected_question.expected_answer_outline,
      marks: 10,
      difficulty: 'Hard',
      bloom_level: 'Analyze',
      question_type: 'Conceptual Integration',
      explanation: result.selected_question.explanation,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (onSaveToBank) {
      onSaveToBank(qObj);
      alert('Winning Question saved to Question Bank!');
    }
  };

  const getMetricColor = (val) => {
    if (val >= 9.0) return 'var(--color-success)';
    if (val >= 7.5) return 'var(--color-primary)';
    if (val >= 5.0) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      
      {/* Top Sub-navigation Bar */}
      <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveSubTab('evaluator')}
            className={`btn ${activeSubTab === 'evaluator' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Candidate Evaluator
          </button>
          <button 
            onClick={() => setActiveSubTab('bank')}
            className={`btn ${activeSubTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', gap: '6px', alignItems: 'center' }}
          >
            <span>Saved Question Bank</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{savedQuestions.length}</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {activeSubTab === 'evaluator' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', flex: '1', minHeight: '0' }}>
          {/* Selection Column */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>
              Question Lab Settings
            </h3>
            
            <div>
              <label className="form-label">Select Target Topic</label>
              <select 
                className="form-input" 
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                style={{ background: 'var(--bg-secondary)', width: '100%' }}
              >
                {allTopics.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.id}: {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => handleGenerate()}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px' }}
              disabled={isLoading || !selectedTopic}
            >
              Evaluate & Select Question
            </button>

            {error && (
              <div style={{ fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.05)', padding: '8px', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Analysis Results Display */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(99,102,241,0.2)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>Evaluating Conceptual Ability...</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Drafting 5 candidate questions and running discriminatory grading score comparisons.</p>
                </div>
              </div>
            ) : result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top Title */}
                <div>
                  <span className="badge badge-violet" style={{ textTransform: 'uppercase' }}>Optimized Assessment</span>
                  <h2 style={{ fontSize: '1.3rem', marginTop: '4px' }}>Candidate Analysis: <span style={{ color: 'var(--color-primary)' }}>{result.topic}</span></h2>
                </div>

                {/* Candidate Questions Comparison Card Grid */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>5 Evaluated Candidates</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    {result.candidates.map((cand) => {
                      const rankIndex = result.rankings.indexOf(cand.candidate_id) + 1;
                      const isWinner = result.selected_question.candidate_id === cand.candidate_id;

                      return (
                        <div 
                          key={cand.candidate_id}
                          className="glass-panel"
                          style={{ 
                            padding: '16px', 
                            border: isWinner ? '2px solid var(--color-success)' : '1px solid var(--border-subtle)',
                            background: isWinner ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-elevated)',
                            display: 'flex',
                            flexDirection: 'column',
                            justify: 'space-between',
                            gap: '12px',
                            position: 'relative'
                          }}
                        >
                          {/* Floating Rank Badge */}
                          <span className="badge" style={{ 
                            position: 'absolute', 
                            top: '12px', 
                            right: '12px',
                            backgroundColor: isWinner ? 'var(--color-success)' : 'var(--bg-secondary)',
                            color: isWinner ? '#fff' : 'var(--text-secondary)'
                          }}>
                            {isWinner ? '★ WINNER (Rank 1)' : `Rank ${rankIndex}`}
                          </span>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CANDIDATE #{cand.candidate_id}</span>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              marginTop: '6px', 
                              lineHeight: '1.4',
                              height: '90px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: 'vertical'
                            }} title={cand.question_text}>
                              <MathText text={cand.question_text} />
                            </div>
                          </div>

                          {/* Mini Bar Metrics */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.7rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Reasoning Depth</span>
                              <strong style={{ color: getMetricColor(cand.metrics.reasoning_depth) }}>{cand.metrics.reasoning_depth}/10</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Originality</span>
                              <strong style={{ color: getMetricColor(cand.metrics.originality) }}>{cand.metrics.originality}/10</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Discrimination</span>
                              <strong style={{ color: getMetricColor(cand.metrics.discrimination_score) }}>{cand.metrics.discrimination_score}/10</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Champion Question Card */}
                <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--color-success)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <div>
                      <span className="badge" style={{ backgroundColor: 'var(--color-success)', color: '#fff', marginRight: '8px' }}>WINNING QUESTION</span>
                      <span className="badge badge-violet">Candidate #{result.selected_question.candidate_id}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => {
                        if (activeEditingId === 'winner') {
                          handleCancelEditing();
                        } else {
                          handleStartEditing('winner', result.selected_question.question_text, result.selected_question.expected_answer_outline);
                        }
                      }}
                    >
                      {activeEditingId === 'winner' ? 'Close Editor ✕' : 'Edit & Refine Question ✏️'}
                    </button>
                  </div>

                  {/* Inline Question Refine & Edit Box */}
                  {activeEditingId === 'winner' ? (
                    <div style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-focus)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        AI Question Refinement & Direct Editing
                      </h4>

                      {/* Section 1: Custom AI Instruction Refining */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label">Refine with Custom AI Instructions</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Make code-focused, increase difficulty, or add a case study..."
                            value={aiInstruction}
                            onChange={(e) => setAiInstruction(e.target.value)}
                            style={{ flex: '1' }}
                          />
                          <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={() => handleAIRefine(result.topic)}
                            disabled={isRefining || !aiInstruction.trim()}
                            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                          >
                            {isRefining ? 'Refining...' : 'Apply Revision 🪄'}
                          </button>
                        </div>

                        {/* Quick Preset Instruction Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                          {['+ Make Code-Focused', '+ Increase Difficulty', '+ Add Case Study', '+ Simplify Explanation'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setAiInstruction(chip.replace('+ ', ''))}
                              style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        {refineError && (
                          <div style={{ fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.08)', padding: '8px', borderRadius: '4px' }}>
                            {refineError}
                          </div>
                        )}

                        {/* AI Revision Preview */}
                        {refineResult && (
                          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid var(--color-primary)', borderRadius: '6px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span className="badge badge-violet" style={{ alignSelf: 'flex-start' }}>AI REVISION PROPOSAL</span>
                            <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>{refineResult.revised_question}</p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{refineResult.summary_of_changes}</span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={() => handleAcceptAIRefinement((newQ, newAns) => {
                                  result.selected_question.question_text = newQ;
                                  result.selected_question.expected_answer_outline = newAns;
                                })}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Accept Revision ✍️
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => setRefineResult(null)}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Discard
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Direct Text Editing */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                        <div>
                          <label className="form-label">Edit Question Text Directly</label>
                          <textarea 
                            className="form-input" 
                            rows={4} 
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label">Edit Solution Outline Directly</label>
                          <textarea 
                            className="form-input" 
                            rows={3} 
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={handleCancelEditing}
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={() => {
                              result.selected_question.question_text = editText;
                              result.selected_question.expected_answer_outline = editAnswer;
                              setActiveEditingId(null);
                              alert('Question updated successfully!');
                            }}
                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          >
                            Save Manual Edits 💾
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Question Text Display */}
                      <div>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Winning Question Text</h4>
                        <div style={{
                          padding: '14px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          <MathText text={result.selected_question.question_text} />
                        </div>
                      </div>

                      {/* Expected Outline Display */}
                      <div>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Model Solution & Criteria</h4>
                        <div style={{
                          padding: '14px',
                          background: 'rgba(123, 174, 127, 0.05)',
                          border: '1px solid rgba(123, 174, 127, 0.25)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          lineHeight: '1.6',
                          color: 'var(--text-primary)'
                        }}>
                          <MathText text={result.selected_question.expected_answer_outline} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Selection Justification */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Why this question is stronger than the alternatives:</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {result.selected_question.explanation}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleSaveWinningQuestion}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      Save to Question Bank
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        const content = `TOPIC: ${result.topic}\n\nWINNING QUESTION:\n${result.selected_question.question_text}\n\nEXPECTED SOLUTION:\n${result.selected_question.expected_answer_outline}\n\nRATIONALE:\n${result.selected_question.explanation}`;
                        navigator.clipboard.writeText(content);
                        alert('Full analysis copied to clipboard!');
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      Copy Analysis Combo
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '10px' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Optimized Question Lab Ready</h4>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Saved Question Bank Sub-tab (Feature 16: Collaborative Question Bank) */
        <div className="glass-panel" style={{ padding: '24px', flex: '1', minHeight: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header & Collaboration Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                🤝 Collaborative Question Bank ({savedQuestions.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Shared academic question repository with custom tagging, 5-star quality ratings, and JSON export/import for department collaboration.
              </p>
            </div>

            {/* Import / Export & Sharing Toolbar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}
                title="Import question bank JSON shared by another professor/colleague"
              >
                📤 Import JSON
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportBankJSON}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                onClick={handleExportBankJSON}
                disabled={!savedQuestions.length}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                title="Export complete question bank to shareable JSON"
              >
                📥 Export JSON
              </button>

              <button
                onClick={() => {
                  const summary = savedQuestions.map((q, idx) => `Q${idx + 1} [${q.topic} - ${q.marks}M - ${q.difficulty || 'Medium'}]:\n${q.question_text}\n\nSolution Outline:\n${q.expected_answer_outline}\n\n---\n`).join('\n');
                  navigator.clipboard.writeText(summary);
                  alert('Complete Question Bank copied to clipboard in Markdown format!');
                }}
                disabled={!savedQuestions.length}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                title="Copy all questions to clipboard as Markdown text"
              >
                📋 Copy All (MD)
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search questions, topics, solutions, tags..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              style={{ flex: '1', minWidth: '180px', padding: '6px 10px', fontSize: '0.8rem' }}
            />

            <select
              className="form-input"
              value={bankDiffFilter}
              onChange={(e) => setBankDiffFilter(e.target.value)}
              style={{ width: '130px', padding: '6px', fontSize: '0.75rem', background: 'var(--bg-elevated)' }}
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              className="form-input"
              value={bankBloomFilter}
              onChange={(e) => setBankBloomFilter(e.target.value)}
              style={{ width: '130px', padding: '6px', fontSize: '0.75rem', background: 'var(--bg-elevated)' }}
            >
              <option value="ALL">All Bloom Levels</option>
              <option value="Remember">Remember</option>
              <option value="Understand">Understand</option>
              <option value="Apply">Apply</option>
              <option value="Analyze">Analyze</option>
              <option value="Evaluate">Evaluate</option>
              <option value="Create">Create</option>
            </select>

            <select
              className="form-input"
              value={bankRatingFilter}
              onChange={(e) => setBankRatingFilter(parseInt(e.target.value))}
              style={{ width: '130px', padding: '6px', fontSize: '0.75rem', background: 'var(--bg-elevated)' }}
            >
              <option value={0}>All Ratings</option>
              <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value={4}>⭐⭐⭐⭐+ (4+ Stars)</option>
              <option value={3}>⭐⭐⭐+ (3+ Stars)</option>
            </select>
          </div>

          {/* Questions List */}
          {savedQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {savedQuestions
                .filter(q => {
                  if (bankSearch.trim()) {
                    const query = bankSearch.toLowerCase();
                    const textMatch = q.question_text?.toLowerCase().includes(query) ||
                                      q.topic?.toLowerCase().includes(query) ||
                                      q.expected_answer_outline?.toLowerCase().includes(query);
                    const tags = questionTags[q.id] || [];
                    const tagMatch = tags.some(t => t.toLowerCase().includes(query));
                    if (!textMatch && !tagMatch) return false;
                  }
                  if (bankDiffFilter !== 'ALL' && q.difficulty !== bankDiffFilter) return false;
                  if (bankBloomFilter !== 'ALL' && q.bloom_level !== bankBloomFilter) return false;
                  const r = questionRatings[q.id] || 0;
                  if (bankRatingFilter > 0 && r < bankRatingFilter) return false;
                  return true;
                })
                .map((q) => {
                  const isEditingThisCard = activeEditingId === q.id;
                  const currentRating = questionRatings[q.id] || 0;
                  const tags = questionTags[q.id] || [];

                  return (
                    <div 
                      key={q.id}
                      className="glass-panel"
                      style={{ 
                        padding: '20px', 
                        background: 'var(--bg-elevated)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '14px',
                        border: isEditingThisCard ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)'
                      }}
                    >
                      {/* Badges & Rating Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="badge badge-violet">{q.topic}</span>
                          {q.difficulty && <span className="badge badge-cyan">{q.difficulty}</span>}
                          {q.bloom_level && <span className="badge badge-pink">{q.bloom_level}</span>}
                          {q.marks && <span className="badge badge-emerald">{q.marks} Marks</span>}
                          {q.review_status && (
                            <span className="badge" style={{
                              backgroundColor: q.review_status === 'APPROVE' ? 'var(--color-success)' : 'var(--color-warning)',
                              color: '#fff'
                            }}>
                              Audit: {q.review_status}
                            </span>
                          )}

                          {/* 5-Star Rating Widget */}
                          <div style={{ display: 'flex', gap: '2px', marginLeft: '6px' }} title="Rate question quality">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => updateRating(q.id, star === currentRating ? 0 : star)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: star <= currentRating ? 'var(--color-primary)' : 'var(--text-muted)', padding: 0 }}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.timestamp || 'Saved'}</span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => {
                              if (isEditingThisCard) {
                                handleCancelEditing();
                              } else {
                                handleStartEditing(q.id, q.question_text, q.expected_answer_outline);
                              }
                            }}
                          >
                            {isEditingThisCard ? 'Close Editor ✕' : 'Edit & Refine ✏️'}
                          </button>
                        </div>
                      </div>

                      {/* Custom Tags Section */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>🏷️ Tags:</span>
                        {tags.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.7rem',
                              background: 'rgba(212, 161, 92, 0.1)',
                              color: 'var(--color-primary)',
                              border: '1px solid rgba(212, 161, 92, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {t}
                            <button
                              onClick={() => removeTag(q.id, t)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}

                        {taggingCardId === q.id ? (
                          <span style={{ display: 'inline-flex', gap: '4px' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Tag name..."
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTag(q.id, newTagInput);
                                  setTaggingCardId(null);
                                }
                              }}
                              style={{ width: '100px', padding: '2px 6px', fontSize: '0.7rem', height: '22px' }}
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                addTag(q.id, newTagInput);
                                setTaggingCardId(null);
                              }}
                              className="btn btn-primary"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px' }}
                            >
                              Add
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setTaggingCardId(q.id);
                              setNewTagInput('');
                            }}
                            style={{ background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.68rem', padding: '2px 6px', cursor: 'pointer' }}
                          >
                            + Add Tag
                          </button>
                        )}
                      </div>

                      {/* Editable / AI Refine Panel for Card */}
                      {isEditingThisCard ? (
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Refine Question with Custom AI Instructions
                          </h4>

                          {/* AI Instruction Input */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="e.g. Add code implementation, change to multiple choice, or increase difficulty..."
                                value={aiInstruction}
                                onChange={(e) => setAiInstruction(e.target.value)}
                                style={{ flex: '1' }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={() => handleAIRefine(q.topic)}
                                disabled={isRefining || !aiInstruction.trim()}
                                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                              >
                                {isRefining ? 'Refining...' : 'Apply Revision 🪄'}
                              </button>
                            </div>

                            {/* Quick Instruction Chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {['+ Make Code-Focused', '+ Increase Difficulty', '+ Add Case Study', '+ Simplify Explanation'].map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => setAiInstruction(chip.replace('+ ', ''))}
                                  style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            {refineError && (
                              <div style={{ fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.08)', padding: '8px', borderRadius: '4px' }}>
                                {refineError}
                              </div>
                            )}

                            {/* Proposal */}
                            {refineResult && (
                              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid var(--color-primary)', borderRadius: '6px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span className="badge badge-violet" style={{ alignSelf: 'flex-start' }}>AI REVISION PROPOSAL</span>
                                <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>{refineResult.revised_question}</p>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{refineResult.summary_of_changes}</span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={() => handleAcceptAIRefinement((newQ, newAns) => {
                                      q.question_text = newQ;
                                      q.expected_answer_outline = newAns;
                                      setActiveEditingId(null);
                                    })}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    Accept Revision ✍️
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setRefineResult(null)}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    Discard
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Direct Manual Text Edit */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                            <div>
                              <label className="form-label">Direct Question Text Edit</label>
                              <textarea 
                                className="form-input" 
                                rows={3} 
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <label className="form-label">Direct Solution Outline Edit</label>
                              <textarea 
                                className="form-input" 
                                rows={3} 
                                value={editAnswer}
                                onChange={(e) => setEditAnswer(e.target.value)}
                                style={{ fontSize: '0.8rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={handleCancelEditing}
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={() => {
                                  q.question_text = editText;
                                  q.expected_answer_outline = editAnswer;
                                  setActiveEditingId(null);
                                  alert('Saved Question updated!');
                                }}
                                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                              >
                                Save Manual Edits 💾
                              </button>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <>
                          {/* Static Question Prompt */}
                          <div>
                            <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Question Prompt</h4>
                            <div style={{
                              padding: '12px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              fontSize: '0.88rem',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap'
                            }}>
                              <MathText text={q.question_text} />
                            </div>
                          </div>

                          {/* Static Expected Solution */}
                          {q.expected_answer_outline && (
                            <div>
                              <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Expected Solution Outline</h4>
                              <div style={{
                                padding: '12px',
                                background: 'rgba(123, 174, 127, 0.04)',
                                border: '1px solid rgba(123, 174, 127, 0.2)',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap'
                              }}>
                                <MathText text={q.expected_answer_outline} />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Actions Bar */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setSelectedTopic(q.topic);
                            setActiveSubTab('evaluator');
                            handleGenerate(q.topic);
                          }}
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Run 5-Candidate Evaluation
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => {
                            const content = `TOPIC: ${q.topic}\n\nQUESTION:\n${q.question_text}\n\nANSWER:\n${q.expected_answer_outline}`;
                            navigator.clipboard.writeText(content);
                            alert('Q&A copied to clipboard!');
                          }}
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Copy Q&A
                        </button>
                        {onRemoveFromBank && (
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => onRemoveFromBank(q.id)}
                            style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--color-danger)' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No saved questions in the Question Bank yet. Generate and audit questions in Exam Designer or Question Lab and click "Save Question" or "Send to Question Lab".
            </div>
          )}
        </div>
      )}

    </div>
  );
}
