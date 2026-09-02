import React, { useState, useEffect, useRef } from 'react';
import MathText from './MathText';

const DEFAULT_BLUEPRINT_PRESETS = [
  {
    id: 'preset_split_10',
    name: '10 Questions (2 Sub-questions each = 20 Parts, 100 Marks)',
    totalMarks: 100,
    duration: 180,
    totalQuestionsCount: 10,
    subQuestionsCount: 2,
    marksPerQuestion: 10,
    diffEasy: 30,
    diffMed: 50,
    diffHard: 20,
    bloomRemember: 30,
    bloomApply: 50,
    bloomCreate: 20,
    questionTypes: ['Multiple Choice', 'Short Answer', 'Programming Problems', 'Case Study', 'Mathematical Proof']
  },
  {
    id: 'preset_split_5',
    name: '5 Questions (2 Sub-questions each = 10 Parts, 50 Marks)',
    totalMarks: 50,
    duration: 90,
    totalQuestionsCount: 5,
    subQuestionsCount: 2,
    marksPerQuestion: 10,
    diffEasy: 40,
    diffMed: 40,
    diffHard: 20,
    bloomRemember: 40,
    bloomApply: 40,
    bloomCreate: 20,
    questionTypes: ['Multiple Choice', 'Short Answer', 'Programming Problems']
  },
  {
    id: 'preset_split_8',
    name: '8 Questions (3 Sub-questions each = 24 Parts, 80 Marks)',
    totalMarks: 80,
    duration: 150,
    totalQuestionsCount: 8,
    subQuestionsCount: 3,
    marksPerQuestion: 10,
    diffEasy: 30,
    diffMed: 50,
    diffHard: 20,
    bloomRemember: 30,
    bloomApply: 50,
    bloomCreate: 20,
    questionTypes: ['Multiple Choice', 'Short Answer', 'Case Study']
  }
];

export default function BlueprintDesigner({ syllabusData, apiKey, modelName, onSendToLab, onSaveToBank }) {
  // Preset Storage & Selection
  const [savedPresets, setSavedPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('saved_blueprint_presets');
      return saved ? JSON.parse(saved) : DEFAULT_BLUEPRINT_PRESETS;
    } catch (e) {
      return DEFAULT_BLUEPRINT_PRESETS;
    }
  });

  const [selectedPresetId, setSelectedPresetId] = useState(() => {
    return savedPresets[0]?.id || 'preset_split_10';
  });

  const firstPreset = savedPresets[0] || DEFAULT_BLUEPRINT_PRESETS[0];

  const [totalMarks, setTotalMarks] = useState(firstPreset.totalMarks || 100);
  const [duration, setDuration] = useState(firstPreset.duration || 180);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(firstPreset.totalQuestionsCount || 10);
  const [subQuestionsCount, setSubQuestionsCount] = useState(firstPreset.subQuestionsCount || 2);
  const [marksPerQuestion, setMarksPerQuestion] = useState(firstPreset.marksPerQuestion || 10);
  
  // Difficulty Breakdown
  const [diffEasy, setDiffEasy] = useState(firstPreset.diffEasy);
  const [diffMed, setDiffMed] = useState(firstPreset.diffMed);
  const [diffHard, setDiffHard] = useState(firstPreset.diffHard);
  
  // Bloom Distribution
  const [bloomRemember, setBloomRemember] = useState(firstPreset.bloomRemember);
  const [bloomApply, setBloomApply] = useState(firstPreset.bloomApply);
  const [bloomCreate, setBloomCreate] = useState(firstPreset.bloomCreate);

  // Question Types selection
  const [questionTypes, setQuestionTypes] = useState(firstPreset.questionTypes || [
    'Multiple Choice',
    'Short Answer',
    'Programming Problems',
    'Case Study',
    'Mathematical Proof'
  ]);

  // Dynamic Module Weights based on Syllabus
  const [moduleWeights, setModuleWeights] = useState({});
  const [blueprintResult, setBlueprintResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Question Draft states
  const [selectedBlueprintRow, setSelectedBlueprintRow] = useState(null);
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [draftedMap, setDraftedMap] = useState({});

  // Question Review states
  const [reviewResult, setReviewResult] = useState(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Batch Drafting & Bulk Selection states
  const [isDraftingAll, setIsDraftingAll] = useState(false);
  const [draftingProgress, setDraftingProgress] = useState('');
  const [selectedQuestionNums, setSelectedQuestionNums] = useState([]);

  const questionRef = useRef(null);

  // Initialize module weights equally when syllabus data loads
  useEffect(() => {
    if (syllabusData && syllabusData.modules) {
      const equalWeight = Math.round(100 / syllabusData.modules.length);
      const initialWeights = {};
      syllabusData.modules.forEach(mod => {
        initialWeights[mod.module_id] = equalWeight;
      });
      setModuleWeights(initialWeights);
    }
  }, [syllabusData]);

  const handleModuleWeightChange = (modId, val) => {
    setModuleWeights(prev => ({
      ...prev,
      [modId]: parseInt(val) || 0
    }));
  };

  const handleToggleQuestionType = (type) => {
    setQuestionTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const applyPreset = (preset) => {
    if (!preset) return;
    setTotalMarks(preset.totalMarks);
    setDuration(preset.duration);
    setTotalQuestionsCount(preset.totalQuestionsCount || 10);
    setSubQuestionsCount(preset.subQuestionsCount || 2);
    setMarksPerQuestion(preset.marksPerQuestion || 10);
    setDiffEasy(preset.diffEasy);
    setDiffMed(preset.diffMed);
    setDiffHard(preset.diffHard);
    setBloomRemember(preset.bloomRemember);
    setBloomApply(preset.bloomApply);
    setBloomCreate(preset.bloomCreate);
    if (preset.questionTypes) {
      setQuestionTypes(preset.questionTypes);
    }
  };

  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const target = savedPresets.find(p => p.id === presetId);
    if (target) {
      applyPreset(target);
    }
  };

  const handleSaveCurrentPreset = () => {
    const name = window.prompt('Enter a name for this Blueprint Preset:', `Custom (${totalQuestionsCount} Qs × ${subQuestionsCount} Sub-parts, ${totalMarks} Marks)`);
    if (!name || !name.trim()) return;

    const newPreset = {
      id: 'preset_' + Date.now(),
      name: name.trim(),
      totalMarks: Number(totalMarks),
      duration: Number(duration),
      totalQuestionsCount: Number(totalQuestionsCount),
      subQuestionsCount: Number(subQuestionsCount),
      marksPerQuestion: Number(marksPerQuestion),
      diffEasy: Number(diffEasy),
      diffMed: Number(diffMed),
      diffHard: Number(diffHard),
      bloomRemember: Number(bloomRemember),
      bloomApply: Number(bloomApply),
      bloomCreate: Number(bloomCreate),
      questionTypes
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    setSelectedPresetId(newPreset.id);
    localStorage.setItem('saved_blueprint_presets', JSON.stringify(updated));
    alert(`Blueprint Preset "${newPreset.name}" saved! It is now set as your primary default preset.`);
  };

  const handleDeletePreset = (presetId) => {
    if (savedPresets.length <= 1) {
      alert('You must keep at least one saved blueprint preset.');
      return;
    }
    if (window.confirm('Delete this blueprint preset?')) {
      const updated = savedPresets.filter(p => p.id !== presetId);
      setSavedPresets(updated);
      localStorage.setItem('saved_blueprint_presets', JSON.stringify(updated));
      if (selectedPresetId === presetId) {
        const fallback = updated[0];
        setSelectedPresetId(fallback.id);
        applyPreset(fallback);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    const diffSum = Number(diffEasy) + Number(diffMed) + Number(diffHard);
    if (diffSum !== 100) {
      setError(`Difficulty distribution must sum to 100%. Current sum: ${diffSum}%`);
      return;
    }

    const bloomSum = Number(bloomRemember) + Number(bloomApply) + Number(bloomCreate);
    if (bloomSum !== 100) {
      setError(`Bloom distribution must sum to 100%. Current sum: ${bloomSum}%`);
      return;
    }

    const modSum = Object.values(moduleWeights).reduce((a, b) => a + b, 0);
    if (modSum !== 100) {
      setError(`Module weights must sum to 100%. Current sum: ${modSum}%`);
      return;
    }

    if (questionTypes.length === 0) {
      setError(`Please select at least one question type.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setBlueprintResult(null);
    setSelectedBlueprintRow(null);
    setGeneratedQuestion(null);

    try {
      const response = await fetch('/api/generate-exam-blueprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          subjectName: syllabusData.subject_name,
          syllabusData: syllabusData,
          totalMarks: parseInt(totalMarks),
          duration: parseInt(duration),
          totalQuestionsCount: parseInt(totalQuestionsCount),
          subQuestionsCount: parseInt(subQuestionsCount),
          marksPerQuestion: parseInt(marksPerQuestion),
          moduleWeights,
          difficultyDistribution: { Easy: `${diffEasy}%`, Medium: `${diffMed}%`, Hard: `${diffHard}%` },
          bloomDistribution: { "Remember/Understand": `${bloomRemember}%`, "Apply/Analyze": `${bloomApply}%`, "Evaluate/Create": `${bloomCreate}%` },
          questionTypes,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate blueprint');
      }

      const data = await response.json();
      setBlueprintResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestion = async (row) => {
    setSelectedBlueprintRow(row);
    setIsQuestionLoading(true);
    setQuestionError(null);
    setGeneratedQuestion(null);

    // Scroll to active loader/playground area
    setTimeout(() => {
      questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          questionBlueprint: row,
          syllabusContext: syllabusData,
          topic: row.topic_name,
          marks: row.marks,
          subQuestionsCount: parseInt(row.number_of_subquestions || subQuestionsCount),
          difficulty: row.difficulty,
          bloomLevel: row.bloom_level,
          reasoningType: 
            row.bloom_level === 'Remember' || row.bloom_level === 'Understand' ? 'Conceptual Explanation' :
            row.bloom_level === 'Apply' ? 'Procedural Application' :
            row.bloom_level === 'Analyze' ? 'Analytical & Deductive Reasoning' :
            row.bloom_level === 'Evaluate' ? 'Evaluative & Critical Comparison' :
            row.bloom_level === 'Create' ? 'Creative Synthesis & Design' : 'Deductive Reasoning',
          questionType: row.question_type,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate question');
      }

      const data = await response.json();
      setGeneratedQuestion(data);
      setDraftedMap(prev => ({ ...prev, [row.question_number]: { row, question: data } }));
    } catch (err) {
      console.error(err);
      setQuestionError(err.message);
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const handleReviewQuestion = async () => {
    if (!generatedQuestion) return;

    setIsReviewLoading(true);
    setReviewError(null);
    setReviewResult(null);

    try {
      const response = await fetch('/api/review-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          question: generatedQuestion.question_text,
          answer: generatedQuestion.expected_answer_outline,
          blueprint: selectedBlueprintRow,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to review question');
      }

      const data = await response.json();
      setReviewResult(data);
    } catch (err) {
      console.error(err);
      setReviewError(err.message);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleAcceptRewrite = () => {
    if (!reviewResult || !reviewResult.rewritten_question) return;
    const updated = {
      ...generatedQuestion,
      question_text: reviewResult.rewritten_question,
      expected_answer_outline: reviewResult.rewritten_answer_outline || generatedQuestion.expected_answer_outline
    };
    setGeneratedQuestion(updated);
    if (selectedBlueprintRow) {
      setDraftedMap(prev => ({ ...prev, [selectedBlueprintRow.question_number]: { row: selectedBlueprintRow, question: updated } }));
    }
    setReviewResult(null);
  };

  const buildCurrentQuestionObject = () => {
    if (!generatedQuestion || !selectedBlueprintRow) return null;
    return {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      topic: selectedBlueprintRow.topic_name,
      question_text: generatedQuestion.question_text,
      expected_answer_outline: generatedQuestion.expected_answer_outline,
      marks: selectedBlueprintRow.marks,
      difficulty: selectedBlueprintRow.difficulty,
      bloom_level: selectedBlueprintRow.bloom_level,
      question_type: selectedBlueprintRow.question_type,
      marks_allocation: generatedQuestion.marks_allocation || [],
      review_status: reviewResult?.status || null,
      review_scores: reviewResult?.scores || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleSaveCurrentQuestion = () => {
    const qObj = buildCurrentQuestionObject();
    if (qObj && onSaveToBank) {
      onSaveToBank(qObj);
      alert('Question saved to Question Bank!');
    }
  };

  const handleSendCurrentQuestionToLab = () => {
    const qObj = buildCurrentQuestionObject();
    if (qObj && onSendToLab) {
      onSendToLab(qObj);
    }
  };

  const handleDraftAllQuestions = async () => {
    if (!blueprintResult || !blueprintResult.questions) return;

    setIsDraftingAll(true);
    setError(null);
    const questionsList = blueprintResult.questions;
    const newDraftedMap = { ...draftedMap };

    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      setDraftingProgress(`Drafting Q${q.question_number}/${questionsList.length}: ${q.topic_name}...`);

      try {
        const response = await fetch('/api/generate-question', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {})
          },
          body: JSON.stringify({
            questionBlueprint: q,
            syllabusContext: syllabusData,
            topic: q.topic_name,
            marks: q.marks,
            subQuestionsCount: parseInt(q.number_of_subquestions || subQuestionsCount),
            difficulty: q.difficulty,
            bloomLevel: q.bloom_level,
            questionType: q.question_type,
            modelName
          })
        });

        if (response.ok) {
          const data = await response.json();
          newDraftedMap[q.question_number] = { row: q, question: data };
        }
      } catch (err) {
        console.error(`Error drafting Q${q.question_number}:`, err);
      }
    }

    setDraftedMap(newDraftedMap);
    setIsDraftingAll(false);
    setDraftingProgress('');

    // Auto-select all drafted questions for bulk sending
    const draftedNums = Object.keys(newDraftedMap).map(Number);
    setSelectedQuestionNums(draftedNums);
  };

  const toggleSelectQuestionNum = (qNum) => {
    setSelectedQuestionNums(prev => 
      prev.includes(qNum) ? prev.filter(n => n !== qNum) : [...prev, qNum]
    );
  };

  const toggleSelectAllDrafted = () => {
    const draftedNums = Object.keys(draftedMap).map(Number);
    if (selectedQuestionNums.length === draftedNums.length && draftedNums.length > 0) {
      setSelectedQuestionNums([]);
    } else {
      setSelectedQuestionNums(draftedNums);
    }
  };

  const handleSendSelectedToLab = () => {
    if (!selectedQuestionNums.length || !onSaveToBank || !onSendToLab) return;

    const selectedObjs = [];
    selectedQuestionNums.forEach(qNum => {
      const item = draftedMap[qNum];
      if (item && item.question) {
        selectedObjs.push({
          id: 'q_bulk_' + Date.now() + '_' + qNum,
          topic: item.row.topic_name,
          question_text: item.question.question_text,
          expected_answer_outline: item.question.expected_answer_outline,
          marks: item.row.marks,
          difficulty: item.row.difficulty,
          bloom_level: item.row.bloom_level,
          question_type: item.row.question_type,
          marks_allocation: item.question.marks_allocation || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    if (!selectedObjs.length) {
      alert('Please draft at least one question first before sending to Question Lab.');
      return;
    }

    selectedObjs.forEach(qObj => onSaveToBank(qObj));
    onSendToLab(selectedObjs[0]);
  };

  const allAvailableQuestionTypes = [
    'Multiple Choice',
    'Short Answer',
    'Essay Questions',
    'Programming Problems',
    'Case Study',
    'Mathematical Proof'
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', height: '100%' }}>
      {/* Constraints Input Column */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>
          Blueprint Constraints
        </h3>

        {/* Saved Blueprint Presets Toolbar */}
        <div style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Active Saved Preset</span>
            <button 
              type="button" 
              onClick={handleSaveCurrentPreset}
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--color-primary)' }}
              title="Save current parameters as a primary default preset"
            >
              + Save Preset
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <select 
              className="form-input"
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '6px 10px', flex: '1' }}
            >
              {savedPresets.map((preset, idx) => (
                <option key={preset.id} value={preset.id}>
                  {idx === 0 ? '★ Primary Default: ' : ''}{preset.name}
                </option>
              ))}
            </select>
            {savedPresets.length > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDeletePreset(selectedPresetId)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                title="Delete selected preset"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Marks & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Total Marks</label>
              <input 
                type="number" 
                className="form-input" 
                value={totalMarks} 
                onChange={(e) => setTotalMarks(e.target.value)} 
                min="10" 
                required 
              />
            </div>
            <div>
              <label className="form-label">Duration (Mins)</label>
              <input 
                type="number" 
                className="form-input" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
                min="10" 
                required 
              />
            </div>
          </div>

          {/* Exam Structure Constraints (No. of Questions & No. of Sub-Questions) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Exam Pattern Constraints</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label">No. of Questions</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={totalQuestionsCount} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setTotalQuestionsCount(val);
                    if (val > 0 && totalMarks > 0) {
                      setMarksPerQuestion(Math.round(totalMarks / val));
                    }
                  }} 
                  min="1" 
                  max="30"
                  required 
                  title="Total number of main questions in the exam paper"
                />
              </div>
              <div>
                <label className="form-label">Sub-Qs / Question</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={subQuestionsCount} 
                  onChange={(e) => setSubQuestionsCount(parseInt(e.target.value) || 1)} 
                  min="1" 
                  max="10"
                  required 
                  title="Number of sub-questions per main question (e.g. 2 for Part a and Part b)"
                />
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pattern: <strong>{totalQuestionsCount} Questions</strong> × <strong>{subQuestionsCount} Sub-parts</strong></span>
              <span><strong>{marksPerQuestion} Marks/Q</strong></span>
            </div>
          </div>

          {/* Difficulty Sliders */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Difficulty Breakdown (%)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Easy</span>
                <input type="number" className="form-input" value={diffEasy} onChange={(e) => setDiffEasy(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Medium</span>
                <input type="number" className="form-input" value={diffMed} onChange={(e) => setDiffMed(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Hard</span>
                <input type="number" className="form-input" value={diffHard} onChange={(e) => setDiffHard(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bloom levels Breakdown */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Bloom Distribution (%)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Rem/Und</span>
                <input type="number" className="form-input" value={bloomRemember} onChange={(e) => setBloomRemember(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>App/Ana</span>
                <input type="number" className="form-input" value={bloomApply} onChange={(e) => setBloomApply(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Eval/Cre</span>
                <input type="number" className="form-input" value={bloomCreate} onChange={(e) => setBloomCreate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Module Weighting */}
          {syllabusData && syllabusData.modules && (
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <label className="form-label" style={{ marginBottom: '6px' }}>Module Weights (%)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                {syllabusData.modules.map(mod => (
                  <div key={mod.module_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1 }} title={mod.module_name}>
                      {mod.module_id}: {mod.module_name}
                    </span>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '65px', padding: '6px' }}
                      value={moduleWeights[mod.module_id] || 0}
                      onChange={(e) => handleModuleWeightChange(mod.module_id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Types checkboxes */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Allowed Question Types</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allAvailableQuestionTypes.map(type => {
                const isActive = questionTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                    onClick={() => handleToggleQuestionType(type)}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.05)', padding: '8px', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary animate-pulse-soft"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Composing Blueprint...' : 'Generate Blueprint ⚡'}
          </button>
        </form>
      </div>

      {/* Output Details Box */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(139,92,246,0.2)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Structuring Blueprint Grid...</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Balancing weights, difficulty, Bloom levels, and estimated solving time.</p>
            </div>
          </div>
        ) : blueprintResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Cards Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL QUESTIONS</span>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)' }}>{blueprintResult.blueprint_summary.total_questions}</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TARGET MARKS</span>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-success)' }}>{blueprintResult.blueprint_summary.total_marks}</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>EST. SOLVING TIME</span>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-accent)' }}>{blueprintResult.blueprint_summary.estimated_total_solving_time_minutes} mins</span>
              </div>
            </div>

            {/* Questions Table & Batch Actions Toolbar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Structural Question Allocation</h3>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Draft All Button */}
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleDraftAllQuestions}
                    disabled={isDraftingAll}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isDraftingAll ? (
                      <>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid rgba(99,102,241,0.3)',
                          borderTopColor: 'var(--color-primary)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span>{draftingProgress || 'Drafting All...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Draft All Questions ⚡</span>
                      </>
                    )}
                  </button>

                  {/* Bulk Send Selected Button */}
                  {onSendToLab && (
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleSendSelectedToLab}
                      disabled={!selectedQuestionNums.length}
                      style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Send Selected to Question Lab ({selectedQuestionNums.length}) 🚀</span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.15)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                      <th style={{ padding: '10px 8px', width: '36px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedQuestionNums.length > 0 && selectedQuestionNums.length === Object.keys(draftedMap).length}
                          onChange={toggleSelectAllDrafted}
                          disabled={!Object.keys(draftedMap).length}
                          title="Select all drafted questions"
                        />
                      </th>
                      <th style={{ padding: '10px' }}>Q#</th>
                      <th style={{ padding: '10px' }}>Module</th>
                      <th style={{ padding: '10px' }}>Topic</th>
                      <th style={{ padding: '10px' }}>Format</th>
                      <th style={{ padding: '10px' }}>Bloom</th>
                      <th style={{ padding: '10px' }}>Diff</th>
                      <th style={{ padding: '10px' }}>Marks</th>
                      <th style={{ padding: '10px' }}>Est. Time</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Drafting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blueprintResult.questions.map((q) => {
                      const isDrafted = !!draftedMap[q.question_number];
                      const isChecked = selectedQuestionNums.includes(q.question_number);

                      return (
                        <tr key={q.question_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: selectedBlueprintRow?.question_number === q.question_number ? 'rgba(139,92,246,0.04)' : 'transparent' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              disabled={!isDrafted}
                              checked={isChecked}
                              onChange={() => toggleSelectQuestionNum(q.question_number)}
                            />
                          </td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>Q{q.question_number}</td>
                          <td style={{ padding: '10px' }}><span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>{q.module_id}</span></td>
                          <td style={{ padding: '10px' }} title={q.topic_name}>{q.topic_name.length > 25 ? q.topic_name.slice(0, 23) + '...' : q.topic_name}</td>
                          <td style={{ padding: '10px' }}>{q.question_type}</td>
                          <td style={{ padding: '10px' }}><span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{q.bloom_level}</span></td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              color: q.difficulty === 'Easy' ? 'var(--color-success)' : q.difficulty === 'Medium' ? 'var(--color-warning)' : 'var(--color-danger)',
                              fontWeight: '600'
                            }}>{q.difficulty}</span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{q.marks} pts</td>
                          <td style={{ padding: '10px' }}>{q.estimated_solving_time_minutes} mins</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => handleGenerateQuestion(q)}
                              >
                                {isDrafted ? 'Redraft ✍️' : 'Draft ✍️'}
                              </button>
                              {isDrafted && onSendToLab && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                  onClick={() => {
                                    const dItem = draftedMap[q.question_number];
                                    const qObj = {
                                      id: 'q_' + Date.now() + '_' + q.question_number,
                                      topic: q.topic_name,
                                      question_text: dItem.question.question_text,
                                      expected_answer_outline: dItem.question.expected_answer_outline,
                                      marks: q.marks,
                                      difficulty: q.difficulty,
                                      bloom_level: q.bloom_level,
                                      question_type: q.question_type,
                                      marks_allocation: dItem.question.marks_allocation || [],
                                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    };
                                    onSendToLab(qObj);
                                  }}
                                  title="Send question directly to Question Lab"
                                >
                                  Send to Lab 🚀
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bloom's Taxonomy Coverage & Cognitive Balance Report (Feature 12) */}
            <div style={{ padding: '18px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📊 Bloom's Taxonomy Coverage Report
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cognitive distribution analysis across {blueprintResult.questions?.length || 0} examination questions
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(() => {
                    const blooms = blueprintResult.questions?.map(q => q.bloom_level) || [];
                    const highOrder = blooms.filter(b => ['Apply', 'Analyze', 'Evaluate', 'Create'].includes(b)).length;
                    const ratio = blooms.length > 0 ? (highOrder / blooms.length) * 100 : 0;
                    return (
                      <span className="badge" style={{
                        background: ratio >= 60 ? 'rgba(123, 174, 127, 0.2)' : 'rgba(212, 161, 92, 0.2)',
                        color: ratio >= 60 ? 'var(--color-success)' : 'var(--color-primary)',
                        border: '1px solid currentColor'
                      }}>
                        {ratio >= 60 ? '⚡ Rigorous & Analytical (HOT)' : '📘 Foundational Balance'} ({Math.round(ratio)}% HOTS)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Stacked Multi-Color Progress Bar */}
              {(() => {
                const colors = {
                  Remember: '#6C6499',
                  Understand: '#5D737E',
                  Apply: '#7BAE7F',
                  Analyze: '#D4A15C',
                  Evaluate: '#E06A60',
                  Create: '#B088F9'
                };
                const total = blueprintResult.questions?.length || 1;
                const counts = {};
                blueprintResult.questions?.forEach(q => {
                  counts[q.bloom_level] = (counts[q.bloom_level] || 0) + 1;
                });

                return (
                  <div>
                    <div style={{ height: '14px', borderRadius: '7px', display: 'flex', overflow: 'hidden', width: '100%', marginBottom: '8px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                      {Object.keys(colors).map(lvl => {
                        const cnt = counts[lvl] || 0;
                        if (cnt === 0) return null;
                        const pct = (cnt / total) * 100;
                        return (
                          <div
                            key={lvl}
                            style={{
                              width: `${pct}%`,
                              background: colors[lvl],
                              height: '100%',
                              transition: 'width 0.3s ease'
                            }}
                            title={`${lvl}: ${cnt} Questions (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Legend Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {Object.entries(colors).map(([lvl, color]) => {
                        const cnt = counts[lvl] || 0;
                        const pct = Math.round((cnt / total) * 100);
                        return (
                          <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                            <span>{lvl}: <strong style={{ color: 'var(--text-primary)' }}>{cnt} ({pct}%)</strong></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Constraints Check Sub-Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div>
                  <h5 style={{ fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Difficulty Distribution</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                    {Object.entries(blueprintResult.blueprint_summary.difficulty_breakdown).map(([level, val]) => (
                      <div key={level} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{level}</span>
                        <strong style={{ color: 'var(--color-primary)' }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 style={{ fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cognitive Spectrum Targets</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                    {Object.entries(blueprintResult.blueprint_summary.bloom_breakdown).map(([level, val]) => (
                      <div key={level} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{level}</span>
                        <strong style={{ color: 'var(--color-accent)' }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Generation Playground */}
            <div ref={questionRef} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              {isQuestionLoading ? (
                <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', borderColor: 'var(--color-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(139,92,246,0.3)',
                      borderTopColor: 'var(--color-primary)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                      Drafting Question Q{selectedBlueprintRow?.question_number}...
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Aligning context with {selectedBlueprintRow?.topic_name} topic and {selectedBlueprintRow?.bloom_level} criteria.</p>
                </div>
              ) : questionError ? (
                <div className="glass-panel" style={{ padding: '16px', borderColor: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#fca5a5', fontSize: '0.8rem' }}>
                  Failed to draft question: {questionError}
                </div>
              ) : generatedQuestion ? (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                    <div>
                      <span className="badge badge-violet" style={{ marginRight: '8px' }}>Q{selectedBlueprintRow?.question_number} DRAFT PLAYGROUND</span>
                      <span className="badge badge-cyan">{selectedBlueprintRow?.question_type}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      {selectedBlueprintRow?.marks} Marks | Est. {generatedQuestion.estimated_solving_time_minutes} Mins
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Exam Question Prompt</h4>
                    <div style={{
                      padding: '16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      <MathText text={generatedQuestion.question_text} />
                    </div>
                  </div>

                  {/* Expected Answer Outline */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Expected Answer Outline</h4>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(123, 174, 127, 0.05)',
                      border: '1px solid rgba(123, 174, 127, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      lineHeight: '1.6',
                      color: 'var(--text-primary)'
                    }}>
                      <MathText text={generatedQuestion.expected_answer_outline} />
                    </div>
                  </div>

                  {/* Grading Rubric / Marks Allocation */}
                  {generatedQuestion.marks_allocation?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Grading Rubric Breakdown</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {generatedQuestion.marks_allocation.map((item, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              padding: '8px 12px', 
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '6px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <span>{item.criteria}</span>
                            <strong style={{ color: 'var(--color-success)', whiteSpace: 'nowrap' }}>+ {item.marks} marks</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta explanations */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Cognitive Rationale ({selectedBlueprintRow?.bloom_level})</strong>
                      {generatedQuestion.bloom_justification}
                    </div>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Difficulty Rationale ({selectedBlueprintRow?.difficulty})</strong>
                      {generatedQuestion.difficulty_justification}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                    {isReviewLoading ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid rgba(139,92,246,0.2)',
                          borderTopColor: 'var(--color-primary)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Auditing Question Parameters...
                      </span>
                    ) : (
                      <button 
                        className="btn btn-warning"
                        onClick={handleReviewQuestion}
                        style={{ padding: '8px 16px', fontSize: '0.8rem', marginRight: 'auto' }}
                      >
                        Submit for Critical Audit
                      </button>
                    )}
                    {onSaveToBank && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleSaveCurrentQuestion}
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        Save Question
                      </button>
                    )}
                    {onSendToLab && (
                      <button 
                        className="btn btn-primary" 
                        onClick={handleSendCurrentQuestionToLab}
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        Send to Question Lab
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        const content = `QUESTION:\n${generatedQuestion.question_text}\n\nANSWER OUTLINE:\n${generatedQuestion.expected_answer_outline}`;
                        navigator.clipboard.writeText(content);
                        alert('Question and Answer Outline copied!');
                      }}
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      Copy Q&A
                    </button>
                  </div>

                  {/* Review Report Error */}
                  {reviewError && (
                    <div style={{ fontSize: '0.8rem', color: '#f87171', backgroundColor: 'rgba(239,68,68,0.05)', padding: '10px', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', marginTop: '12px' }}>
                      {reviewError}
                    </div>
                  )}

                  {/* Review Report Card */}
                  {reviewResult && (
                    <div className="glass-panel animate-slide-up" style={{ 
                      padding: '20px', 
                      marginTop: '16px',
                      border: reviewResult.status === 'APPROVE' ? '2px solid var(--color-success)' :
                              reviewResult.status === 'REVISE' ? '2px solid var(--color-warning)' : '2px solid var(--color-danger)',
                      background: 'rgba(0,0,0,0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {/* Status Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold' }}>Rigorous Review Decision</h4>
                        <span className="badge" style={{ 
                          fontSize: '0.8rem', 
                          padding: '6px 12px',
                          color: '#fff',
                          backgroundColor: reviewResult.status === 'APPROVE' ? 'var(--color-success)' :
                                           reviewResult.status === 'REVISE' ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {reviewResult.status}
                        </span>
                      </div>

                      {/* Scores Grid */}
                      <div>
                        <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Audited Metrics Scorecard (0-100)</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.75rem' }}>
                          {Object.entries(reviewResult.scores).map(([metric, score]) => {
                            const formattedName = metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            const barColor = score >= 80 ? 'var(--color-success)' :
                                             score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
                            return (
                              <div key={metric} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                  <span>{formattedName}</span>
                                  <strong>{score}/100</strong>
                                </div>
                                <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${score}%`, height: '100%', backgroundColor: barColor, borderRadius: '2px' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Weaknesses List */}
                      {reviewResult.weaknesses?.length > 0 && (
                        <div>
                          <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Identified Weaknesses & Critique</h5>
                          <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {reviewResult.weaknesses.map((w, idx) => (
                              <li key={idx} style={{ listStyleType: 'disc' }}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Detailed Reasons */}
                      <div>
                        <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Review Summary Rationale</h5>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                          {reviewResult.detailed_reasons}
                        </p>
                      </div>

                      {/* Suggested Revision Block */}
                      {reviewResult.rewritten_question && (
                        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px', marginTop: '4px' }}>
                          <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Suggested Revised Question & Answer Outline</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{
                              padding: '12px',
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {reviewResult.rewritten_question}
                            </div>
                            
                            {reviewResult.rewritten_answer_outline && (
                              <div style={{
                                padding: '12px',
                                background: 'rgba(16, 185, 129, 0.02)',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.8)'
                              }}>
                                <strong>Updated Expected Answer Outline:</strong>
                                <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                  {reviewResult.rewritten_answer_outline}
                                </div>
                              </div>
                            )}

                            <button 
                              className="btn btn-success animate-pulse-soft"
                              onClick={handleAcceptRewrite}
                              style={{ padding: '8px 16px', fontSize: '0.8rem', alignSelf: 'flex-end', marginTop: '6px' }}
                            >
                              Accept Suggestion & Update Draft 🔄
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : null}
            </div>

          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Assessment Blueprint Empty</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
              Set examination parameters, adjust weights, and click "Generate Blueprint" to let AI draft a balanced question distribution grid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
