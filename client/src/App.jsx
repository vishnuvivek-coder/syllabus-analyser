import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InputPanel from './components/InputPanel';
import KnowledgeGraph from './components/KnowledgeGraph';
import ConceptGraph from './components/ConceptGraph';
import BlueprintDesigner from './components/BlueprintDesigner';
import QuestionLab from './components/QuestionLab';
import FlashcardDeck from './components/FlashcardDeck';
import AnswerEvaluator from './components/AnswerEvaluator';
import QuestionVariants from './components/QuestionVariants';
import PaperAnalyzer from './components/PaperAnalyzer';
import ModuleList from './components/ModuleList';
import Analytics from './components/Analytics';
import FacultyChatbot from './components/FacultyChatbot';
import LoginPage, { DEMO_USERS } from './components/LoginPage';
import { analyzeSyllabus } from './utils/api';
import { SAMPLE_ML_CURRICULUM } from './utils/sampleCurriculum';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Persistent Active Curriculum Data (with multi-layer fallback to prevent reload data loss)
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_active_data');
      if (saved) return JSON.parse(saved);

      // Multi-layer fallback: check history sessions
      const historyRaw = localStorage.getItem('syllabus_history_sessions');
      if (historyRaw) {
        const historyList = JSON.parse(historyRaw);
        if (Array.isArray(historyList) && historyList.length > 0 && historyList[0].parsedData) {
          return historyList[0].parsedData;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  // Restore active syllabus from server on initial mount / reload
  useEffect(() => {
    async function restoreServerSyllabus() {
      try {
        const res = await fetch('/api/syllabus/active');
        if (res.ok) {
          const result = await res.json();
          if (result && result.data && result.data.modules && result.data.modules.length > 0) {
            setData(prev => prev && prev.modules ? prev : result.data);
            try {
              localStorage.setItem('syllabus_active_data', JSON.stringify(result.data));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Could not sync active syllabus from server storage:', err);
      }
    }
    restoreServerSyllabus();
  }, []);

  // Synchronize Active Curriculum Data with localStorage & Server Disk Storage
  useEffect(() => {
    try {
      if (data) {
        localStorage.setItem('syllabus_active_data', JSON.stringify(data));
        fetch('/api/syllabus/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data })
        }).catch(() => {});
      } else {
        localStorage.removeItem('syllabus_active_data');
      }
    } catch (e) {
      console.error('Failed to sync active syllabus data', e);
    }
  }, [data]);

  // Route-derived active tab
  const pathClean = location.pathname.replace(/^\//, '').toLowerCase();
  const VALID_TABS = [
    'blueprint', 'variants', 'lab', 'pastpapers', 'graph', 
    'concepts', 'modules', 'analytics', 'evaluator', 'flashcards', 'upload', 'copilot'
  ];
  const activeTab = VALID_TABS.includes(pathClean)
    ? (user?.role === 'student' && pathClean === 'copilot' ? 'graph' : pathClean)
    : (user?.role === 'faculty' ? 'blueprint' : 'graph');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [initialLabTopic, setInitialLabTopic] = useState('');
  const [initialFlashcardTopic, setInitialFlashcardTopic] = useState('');
  
  // Persistent Question Storage
  const [savedQuestions, setSavedQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_question_bank');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [incomingLabQuestion, setIncomingLabQuestion] = useState(null);

  // Synchronize Question Bank with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('syllabus_question_bank', JSON.stringify(savedQuestions));
    } catch (e) {
      console.error('Failed to sync question bank to localStorage', e);
    }
  }, [savedQuestions]);

  // Analysis History Storage & Drawer State
  const [historySessions, setHistorySessions] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_history_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Handle route redirect if user accesses root or login
  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    } else if (user && (location.pathname === '/login' || location.pathname === '/')) {
      const target = data ? (user.role === 'faculty' ? '/blueprint' : '/graph') : '/upload';
      navigate(target, { replace: true });
    } else if (user?.role === 'student' && location.pathname === '/copilot') {
      navigate('/graph', { replace: true });
    }
  }, [user, location.pathname, navigate, data]);

  const handleLogin = (userObj) => {
    setUser(userObj);
    localStorage.setItem('syllabus_auth_user', JSON.stringify(userObj));
    const target = data ? (userObj.role === 'faculty' ? '/blueprint' : '/graph') : '/upload';
    navigate(target);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('syllabus_auth_user');
    navigate('/login');
  };

  const handleAnalyze = async (inputs) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage('Reading study materials...');
    
    try {
      setTimeout(() => setStatusMessage('Structuring curriculum modules...'), 1500);
      setTimeout(() => setStatusMessage('Mapping prerequisite relations and Bloom levels...'), 3500);
      
      const parsedData = await analyzeSyllabus(inputs);
      setData(parsedData);
      localStorage.setItem('syllabus_active_data', JSON.stringify(parsedData));
      navigate(user?.role === 'faculty' ? '/blueprint' : '/graph');
      setIsSidebarOpen(false); // Collapsed by default after parse success

      // Save to persistent Analysis History
      const newSession = {
        id: 'session_' + Date.now(),
        timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject_name: parsedData.subject_name || 'Curriculum Analysis',
        modules_count: parsedData.modules ? parsedData.modules.length : 0,
        topics_count: parsedData.modules ? parsedData.modules.reduce((acc, m) => acc + (m.topics ? m.topics.length : 0), 0) : 0,
        parsedData,
        sourceSummary: inputs.syllabusFile?.name 
          ? `PDF: ${inputs.syllabusFile.name}` 
          : (inputs.classNotes ? 'Class Notes & Textbook' : (inputs.videoLinks ? 'Video Links & URLs' : 'Syllabus Text'))
      };

      setHistorySessions(prev => {
        const updated = [newSession, ...prev.filter(s => s.subject_name !== newSession.subject_name)].slice(0, 20);
        localStorage.setItem('syllabus_history_sessions', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during study material processing.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleLoadHistorySession = (session) => {
    setData(session.parsedData);
    localStorage.setItem('syllabus_active_data', JSON.stringify(session.parsedData));
    navigate(user?.role === 'faculty' ? '/blueprint' : '/graph');
    setIsSidebarOpen(false);
    setShowHistoryDrawer(false);
  };

  const handleDeleteHistorySession = (sessionId, e) => {
    e.stopPropagation();
    setHistorySessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('syllabus_history_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all analysis history?')) {
      setHistorySessions([]);
      localStorage.removeItem('syllabus_history_sessions');
    }
  };

  const handleForwardToLab = (topicName) => {
    setInitialLabTopic(topicName);
    navigate('/lab');
  };

  const handleForwardToFlashcards = (topicName) => {
    setInitialFlashcardTopic(topicName);
    navigate('/flashcards');
  };

  const handleLoadSampleCurriculum = () => {
    setData(SAMPLE_ML_CURRICULUM);
    try {
      localStorage.setItem('syllabus_active_data', JSON.stringify(SAMPLE_ML_CURRICULUM));
      fetch('/api/syllabus/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: SAMPLE_ML_CURRICULUM })
      }).catch(() => {});
    } catch (e) {}

    const newSession = {
      id: 'session_sample_ml',
      timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject_name: 'Machine Learning (R24 Scheme)',
      modules_count: SAMPLE_ML_CURRICULUM.modules.length,
      topics_count: SAMPLE_ML_CURRICULUM.modules.reduce((acc, m) => acc + (m.topics ? m.topics.length : 0), 0),
      parsedData: SAMPLE_ML_CURRICULUM,
      sourceSummary: 'Autonomous R24 Engineering Framework'
    };

    setHistorySessions(prev => {
      const updated = [newSession, ...prev.filter(s => s.subject_name !== newSession.subject_name)].slice(0, 20);
      try {
        localStorage.setItem('syllabus_history_sessions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    navigate('/graph');
  };

  const handleResetAnalysis = () => {
    setData(null);
    localStorage.removeItem('syllabus_active_data');
    fetch('/api/syllabus/active', { method: 'DELETE' }).catch(() => {});
    setError(null);
    setInitialLabTopic('');
    setInitialFlashcardTopic('');
    setIncomingLabQuestion(null);
    navigate('/upload');
  };

  const handleSaveQuestionToBank = (questionObj) => {
    if (!questionObj || !questionObj.question_text) return;
    setSavedQuestions(prev => {
      if (questionObj.id) {
        const idIdx = prev.findIndex(q => q.id === questionObj.id);
        if (idIdx !== -1) {
          const updated = [...prev];
          updated[idIdx] = { ...updated[idIdx], ...questionObj };
          return updated;
        }
      }
      const textIdx = prev.findIndex(q => q.question_text?.trim() === questionObj.question_text?.trim());
      if (textIdx !== -1) {
        const updated = [...prev];
        updated[textIdx] = { ...updated[textIdx], ...questionObj };
        return updated;
      }
      return [questionObj, ...prev];
    });
  };

  const handleRemoveQuestionFromBank = (questionId) => {
    setSavedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleSendQuestionToLab = (questionObj) => {
    handleSaveQuestionToBank(questionObj);
    setIncomingLabQuestion(questionObj);
    navigate('/lab');
  };

  if (!user || location.pathname === '/login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Navigation Header */}
      <header style={{
        height: '56px',
        flexShrink: 0,
        padding: '0 20px',
        borderBottom: '1px solid var(--color-graphite)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: 'var(--color-carbon)',
        zIndex: 10
      }}>
        {/* Left Side: Logo & Dedicated Top-Left History Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Top-Left History Button */}
          <button 
            type="button"
            onClick={() => setShowHistoryDrawer(true)} 
            className="btn btn-secondary" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderRadius: '6px'
            }}
            title="Open Analysis History Sessions"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
            {historySessions.length > 0 && (
              <span className="badge badge-violet" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                {historySessions.length}
              </span>
            )}
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--color-graphite)' }} />

          <div 
            onClick={() => navigate(user.role === 'faculty' ? '/blueprint' : '/graph')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            title="Syllabus Engine Dashboard"
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--color-obsidian)',
              border: '1px solid var(--color-smoke)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-sans)', fontWeight: '510', letterSpacing: '-0.015em', color: 'var(--color-paper)', lineHeight: 1.1, margin: 0 }}>
                  Syllabus Engine
                </h1>
                <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 6px', color: 'var(--color-mist)', borderColor: 'var(--color-graphite)' }}>
                  {user.role === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
                </span>
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--color-fog)', letterSpacing: '0.02em', fontWeight: '400', fontFamily: 'var(--font-mono)' }}>
                {user.role === 'faculty' ? 'CURRICULUM ARCHITECTURE & ASSESSMENT' : 'LEARNING ROADMAPS & ACTIVE REVISION'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Active Subject & User Profile Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {data ? (
            <>
              <div style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'var(--color-obsidian)',
                border: '1px solid var(--color-graphite)',
                fontSize: '0.76rem',
                fontWeight: '400',
                color: 'var(--color-fog)'
              }}>
                Subject: <span style={{ color: 'var(--color-paper)', fontWeight: '510' }}>{data.subject_name}</span>
              </div>

              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="btn btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              >
                {isSidebarOpen ? 'Hide Controls' : 'Show Controls'}
              </button>

              <button 
                onClick={() => navigate('/upload')} 
                className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                title="Upload or import new syllabus"
              >
                + New / Import
              </button>

              <button 
                onClick={handleResetAnalysis} 
                className="btn btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.76rem', color: 'var(--color-mist)' }}
              >
                Reset
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate('/upload')} 
              className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              title="Upload syllabus"
            >
              📤 Upload Syllabus
            </button>
          )}

          <div style={{ width: '1px', height: '20px', background: 'var(--color-graphite)' }} />

          {/* User Profile Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '3px 10px',
            background: 'var(--color-obsidian)',
            borderRadius: '9999px',
            border: '1px solid var(--color-graphite)'
          }}>
            <span style={{ fontSize: '0.95rem' }}>{user.avatar}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: '510', color: 'var(--color-paper)', lineHeight: 1.1 }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.64rem', color: 'var(--color-fog)', fontWeight: '400' }}>
                {user.badge}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.74rem', color: 'var(--color-coral-red)', borderColor: 'rgba(235, 87, 87, 0.25)' }}
            title="Log out of current account"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Slide-out Top-Left Analysis History Drawer */}
      {showHistoryDrawer && (
        <div 
          onClick={() => setShowHistoryDrawer(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            justify: 'flex-start'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-slide-right"
            style={{
              width: '400px',
              height: '100%',
              borderRadius: '0',
              borderRight: '1px solid var(--border-strong)',
              borderLeft: 'none',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: 'var(--bg-secondary)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* History Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Analysis History</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {historySessions.length} saved curriculum session{historySessions.length === 1 ? '' : 's'}
                </p>
              </div>
              <button 
                onClick={() => setShowHistoryDrawer(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>

            {/* History Sessions List */}
            <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historySessions.length > 0 ? (
                historySessions.map((session) => (
                  <div 
                    key={session.id}
                    onClick={() => handleLoadHistorySession(session)}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>
                        {session.sourceSummary || 'Analyzed Session'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{session.timestamp}</span>
                    </div>

                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {session.subject_name}
                    </h3>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Modules: <strong>{session.modules_count}</strong></span>
                      <span>Topics: <strong>{session.topics_count}</strong></span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                        Load Session 🚀
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistorySession(session.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No saved history sessions yet. Each time you click "Analyze Study Material", the parsed session is automatically saved here!
                </div>
              )}
            </div>

            {historySessions.length > 0 && (
              <button 
                onClick={handleClearAllHistory}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--color-danger)' }}
              >
                Clear All History
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      {activeTab === 'upload' ? (
        // Dedicated Clean Scrollable Centered Upload View
        <div style={{
          flex: '1',
          minHeight: '0',
          overflowY: 'auto',
          padding: '36px 20px 60px',
          width: '100%'
        }}>
          <div style={{
            maxWidth: '740px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            {/* Centered Headline - Linear Midnight Precision Style */}
            <div style={{ 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '14px',
              padding: '24px 0 12px'
            }}>
              <span className="badge" style={{ 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                fontSize: '0.68rem', 
                padding: '3px 10px',
                borderColor: 'var(--color-graphite)',
                color: 'var(--color-fog)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}>
                {user.role === 'faculty' ? 'Faculty & Instructor Workspace' : 'Student & Learner Workspace'}
              </span>

              <h1 style={{ 
                fontSize: '2.5rem', 
                fontFamily: 'var(--font-sans)', 
                fontWeight: '510', 
                lineHeight: '1.15', 
                letterSpacing: '-0.022em',
                color: 'var(--color-paper)', 
                margin: '4px 0',
                maxWidth: '680px'
              }}>
                {user.role === 'faculty' 
                  ? 'Curriculum Intelligence & Assessment Architecture' 
                  : 'Interactive Learning Roadmaps & Exam Preparation'}
              </h1>

              <p style={{ color: 'var(--color-fog)', fontSize: '0.92rem', lineHeight: '1.6', maxWidth: '620px', fontWeight: '400', letterSpacing: '-0.010em' }}>
                {user.role === 'faculty' 
                  ? 'Upload an accredited course syllabus, paste textbook chapters, or attach past papers to generate Bloom-aligned exam blueprints, multi-set variants (Set A/B/C), and question banks.'
                  : 'Upload your syllabus or lecture notes to generate interactive prerequisite dependency graphs, active recall flashcards, and submit practice answers for instant AI grading.'}
              </p>
            </div>

            {/* Centered Parser Control Card */}
            <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} progress={statusMessage} activeData={data} onLoadSample={handleLoadSampleCurriculum} />

            {/* Error Notice */}
            {error && (
              <div className="glass-panel" style={{ width: '100%', padding: '14px', border: '1px solid var(--color-danger)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Active Dashboard View
        <div 
          className="dashboard-grid" 
          style={{ 
            flex: '1', 
            gridTemplateColumns: (isSidebarOpen && data) ? '380px 1fr' : '1fr',
            transition: 'grid-template-columns 0.25s ease'
          }}
        >
          {/* Controls Sidebar */}
          {isSidebarOpen && data && (
            <aside style={{ height: '100%', minHeight: '0' }}>
              <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} progress={statusMessage} activeData={data} onLoadSample={handleLoadSampleCurriculum} />
            </aside>
          )}

          {/* Navigation & Workspace Panels */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: '0', overflow: 'hidden' }}>
            {/* Error Banner */}
            {error && (
              <div className="glass-panel" style={{ padding: '12px 18px', borderColor: 'var(--color-danger)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>{error}</span>
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            )}

            {/* Navigation Tabs (Tailored per role) - Linear Precision Segmented Control with Dedicated URLs */}
            <nav 
              className="no-scrollbar"
              aria-label="Role Navigation Tabs"
              style={{ 
                background: 'var(--color-carbon)', 
                border: '1px solid var(--color-graphite)', 
                borderRadius: '12px', 
                padding: '4px', 
                display: 'flex', 
                gap: '4px', 
                alignItems: 'center',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                flexWrap: 'nowrap',
                maxWidth: '100%'
              }}
            >
              {user.role === 'faculty' ? (
                <>
                  <button 
                    onClick={() => navigate('/blueprint')} 
                    className={`tab-btn ${activeTab === 'blueprint' ? 'active' : ''}`}
                    title="Design official exam papers with Bloom taxonomy (/blueprint)"
                  >
                    📐 Exam Designer
                  </button>
                  <button 
                    onClick={() => navigate('/variants')} 
                    className={`tab-btn ${activeTab === 'variants' ? 'active' : ''}`}
                    title="Generate multi-set exam questions (Set A, B, C) to prevent cheating (/variants)"
                  >
                    🔀 Question Variants
                  </button>
                  <button 
                    onClick={() => navigate('/lab')} 
                    className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
                    title="Author and curate departmental question repository (/lab)"
                  >
                    🧪 Question Lab
                  </button>
                  <button 
                    onClick={() => navigate('/pastpapers')} 
                    className={`tab-btn ${activeTab === 'pastpapers' ? 'active' : ''}`}
                    title="Audit previous year papers for syllabus coverage gaps (/pastpapers)"
                  >
                    📑 Paper Auditor
                  </button>
                  <button 
                    onClick={() => navigate('/graph')} 
                    className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
                    title="View syllabus prerequisite architecture (/graph)"
                  >
                    🗺️ Knowledge Map
                  </button>
                  <button 
                    onClick={() => navigate('/concepts')} 
                    className={`tab-btn ${activeTab === 'concepts' ? 'active' : ''}`}
                    title="Inspect concept dependency flows (/concepts)"
                  >
                    💡 Concepts
                  </button>
                  <button 
                    onClick={() => navigate('/modules')} 
                    className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
                    title="Module structure and learning outcomes (/modules)"
                  >
                    📚 Curriculum
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')} 
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    title="Course cognitive depth and Bloom distribution (/analytics)"
                  >
                    📊 Analytics
                  </button>
                  <button 
                    onClick={() => navigate('/evaluator')} 
                    className={`tab-btn ${activeTab === 'evaluator' ? 'active' : ''}`}
                    title="Grade and evaluate student answer submissions (/evaluator)"
                  >
                    ✍️ Evaluator
                  </button>
                  <button 
                    onClick={() => navigate('/copilot')} 
                    className={`tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
                    style={{ color: 'var(--color-acid-lime)', borderColor: activeTab === 'copilot' ? 'var(--color-acid-lime)' : undefined }}
                    title="Faculty Academic Copilot: R24 regulations, marks allotment, timetable & teaching advisor (/copilot)"
                  >
                    🤖 Academic Copilot
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/graph')} 
                    className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
                    title="Interactive roadmap showing what to learn first (/graph)"
                  >
                    🗺️ Learning Map
                  </button>
                  <button 
                    onClick={() => navigate('/concepts')} 
                    className={`tab-btn ${activeTab === 'concepts' ? 'active' : ''}`}
                    title="Concept dependencies and prerequisite paths (/concepts)"
                  >
                    💡 Concept Flow
                  </button>
                  <button 
                    onClick={() => navigate('/flashcards')} 
                    className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
                    title="Active recall flashcard decks for quick exam revision (/flashcards)"
                  >
                    🗂️ AI Flashcards
                  </button>
                  <button 
                    onClick={() => navigate('/evaluator')} 
                    className={`tab-btn ${activeTab === 'evaluator' ? 'active' : ''}`}
                    title="Test your answers and get instant private grading and feedback (/evaluator)"
                  >
                    ✍️ AI Evaluator
                  </button>
                  <button 
                    onClick={() => navigate('/lab')} 
                    className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
                    title="Practice solving questions by topic (/lab)"
                  >
                    📝 Practice Lab
                  </button>
                  <button 
                    onClick={() => navigate('/modules')} 
                    className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
                    title="Review course modules and key topics (/modules)"
                  >
                    📚 Study Modules
                  </button>
                  <button 
                    onClick={() => navigate('/pastpapers')} 
                    className={`tab-btn ${activeTab === 'pastpapers' ? 'active' : ''}`}
                    title="Explore recurring previous exam questions (/pastpapers)"
                  >
                    🔄 Past Papers
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')} 
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    title="Track syllabus coverage and difficulty distribution (/analytics)"
                  >
                    📊 Coverage
                  </button>
                </>
              )}
            </nav>

            {/* Workspace Active Panels (Persistent display wrappers to prevent unmounting and state loss) */}
            <div style={{ flex: '1', minHeight: '0', position: 'relative', overflow: 'hidden' }}>
              
              {/* Fallback prompt for tabs requiring syllabus data when no syllabus has been parsed yet */}
              {!data && !['lab', 'evaluator', 'copilot'].includes(activeTab) ? (
                <div className="glass-panel" style={{ 
                  padding: '60px 24px', 
                  textAlign: 'center', 
                  maxWidth: '560px', 
                  margin: '40px auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ fontSize: '2.5rem' }}>📄</div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-paper)', fontWeight: '510', margin: 0 }}>
                    No Syllabus Loaded Yet
                  </h3>
                  <p style={{ color: 'var(--color-fog)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                    Please upload an academic syllabus or select a previously analyzed course from History in the top-left to unlock this page.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                      onClick={() => navigate('/upload')} 
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                    >
                      📤 Upload Syllabus
                    </button>
                    <button 
                      onClick={handleLoadSampleCurriculum} 
                      className="btn btn-secondary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem', color: 'var(--color-acid-lime)', borderColor: 'rgba(228, 242, 34, 0.4)' }}
                    >
                      ⚡ Load Sample ML (R24)
                    </button>
                    {historySessions.length > 0 && (
                      <button 
                        onClick={() => setShowHistoryDrawer(true)} 
                        className="btn btn-secondary"
                        style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                      >
                        Browse History ({historySessions.length})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: activeTab === 'graph' ? 'block' : 'none', height: '100%' }}>
                    <KnowledgeGraph 
                      data={data} 
                      onForwardToLab={handleForwardToLab} 
                      onForwardToFlashcards={handleForwardToFlashcards}
                      onLoadSample={handleLoadSampleCurriculum}
                    />
                  </div>
                  <div style={{ display: activeTab === 'concepts' ? 'block' : 'none', height: '100%' }}>
                    <ConceptGraph 
                      data={data} 
                      onForwardToLab={handleForwardToLab} 
                      onForwardToFlashcards={handleForwardToFlashcards}
                      onLoadSample={handleLoadSampleCurriculum}
                    />
                  </div>
                  <div style={{ display: activeTab === 'blueprint' ? 'block' : 'none', height: '100%' }}>
                    <BlueprintDesigner 
                      syllabusData={data} 
                      apiKey={localStorage.getItem('gemini_api_key')} 
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'} 
                      onSendToLab={handleSendQuestionToLab}
                      onSaveToBank={handleSaveQuestionToBank}
                    />
                  </div>
                  <div style={{ display: activeTab === 'lab' ? 'block' : 'none', height: '100%' }}>
                    <QuestionLab 
                      syllabusData={data} 
                      apiKey={localStorage.getItem('gemini_api_key')} 
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'} 
                      initialTopic={initialLabTopic} 
                      onClearInitialTopic={() => setInitialLabTopic('')}
                      incomingQuestion={incomingLabQuestion}
                      savedQuestions={savedQuestions}
                      onSaveToBank={handleSaveQuestionToBank}
                      onRemoveFromBank={handleRemoveQuestionFromBank}
                    />
                  </div>
                  <div style={{ display: activeTab === 'variants' ? 'block' : 'none', height: '100%' }}>
                    <QuestionVariants 
                      syllabusData={data}
                      apiKey={localStorage.getItem('gemini_api_key')}
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'}
                      savedQuestions={savedQuestions}
                      onSaveToBank={handleSaveQuestionToBank}
                    />
                  </div>
                  <div style={{ display: activeTab === 'evaluator' ? 'block' : 'none', height: '100%' }}>
                    <AnswerEvaluator 
                      syllabusData={data}
                      apiKey={localStorage.getItem('gemini_api_key')}
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'}
                      savedQuestions={savedQuestions}
                      onNavigate={(tab) => navigate('/' + tab)}
                    />
                  </div>
                  <div style={{ display: activeTab === 'pastpapers' ? 'block' : 'none', height: '100%' }}>
                    <PaperAnalyzer 
                      syllabusData={data}
                      apiKey={localStorage.getItem('gemini_api_key')}
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'}
                      onForwardToLab={handleForwardToLab}
                      onForwardToFlashcards={handleForwardToFlashcards}
                    />
                  </div>
                  <div style={{ display: activeTab === 'flashcards' ? 'block' : 'none', height: '100%' }}>
                    <FlashcardDeck 
                      syllabusData={data} 
                      apiKey={localStorage.getItem('gemini_api_key')} 
                      modelName={localStorage.getItem('model_name') || 'gemini-3.6-flash'} 
                      initialTopic={initialFlashcardTopic}
                      onClearInitialTopic={() => setInitialFlashcardTopic('')}
                    />
                  </div>
                  <div style={{ display: activeTab === 'modules' ? 'block' : 'none', height: '100%' }}>
                    <ModuleList 
                      data={data} 
                      onForwardToFlashcards={handleForwardToFlashcards}
                    />
                  </div>
                  <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
                    <Analytics data={data} />
                  </div>
                  {user.role === 'faculty' && (
                    <div style={{ 
                      display: activeTab === 'copilot' ? 'flex' : 'none', 
                      flexDirection: 'column', 
                      minHeight: '0', 
                      height: '100%', 
                      width: '100%', 
                      overflow: 'hidden' 
                    }}>
                      <FacultyChatbot 
                        syllabusData={data} 
                        apiKey={localStorage.getItem('gemini_api_key')} 
                        modelName={localStorage.getItem('model_name') || 'gemini-2.5-flash'} 
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Floating Quick-Access Copilot Button for Faculty (Visible across other pages) */}
      {user.role === 'faculty' && activeTab !== 'copilot' && (
        <button
          type="button"
          onClick={() => navigate('/copilot')}
          className="btn btn-primary"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 35,
            padding: '10px 18px',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 14px rgba(228, 242, 34, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            fontWeight: '510',
            letterSpacing: '-0.01em'
          }}
          title="Open Faculty Academic Copilot AI"
        >
          <span>🤖</span>
          <span>Academic Copilot</span>
        </button>
      )}

    </div>
  );
}
