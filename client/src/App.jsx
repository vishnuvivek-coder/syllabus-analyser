import React, { useState, useEffect } from 'react';
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
import LoginPage, { DEMO_USERS } from './components/LoginPage';
import { analyzeSyllabus } from './utils/api';

export default function App() {
  // Authentication State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [initialLabTopic, setInitialLabTopic] = useState('');
  const [initialFlashcardTopic, setInitialFlashcardTopic] = useState('');
  
  // Persistent Question Storage
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [incomingLabQuestion, setIncomingLabQuestion] = useState(null);

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

  const handleLogin = (userObj) => {
    setUser(userObj);
    localStorage.setItem('syllabus_auth_user', JSON.stringify(userObj));
    if (userObj.role === 'faculty') {
      setActiveTab('blueprint');
    } else {
      setActiveTab('graph');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('syllabus_auth_user');
  };

  const handleSwitchRole = () => {
    const newRole = user?.role === 'faculty' ? 'student' : 'faculty';
    const newUser = DEMO_USERS[newRole];
    setUser(newUser);
    localStorage.setItem('syllabus_auth_user', JSON.stringify(newUser));
    if (newRole === 'faculty') {
      setActiveTab('blueprint');
    } else {
      setActiveTab('graph');
    }
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
      setActiveTab('graph');
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
    setActiveTab('graph');
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
    setActiveTab('lab');
  };

  const handleForwardToFlashcards = (topicName) => {
    setInitialFlashcardTopic(topicName);
    setActiveTab('flashcards');
  };

  const handleResetAnalysis = () => {
    setData(null);
    setError(null);
    setInitialLabTopic('');
    setInitialFlashcardTopic('');
    setSavedQuestions([]);
    setIncomingLabQuestion(null);
  };

  const handleSaveQuestionToBank = (questionObj) => {
    setSavedQuestions(prev => {
      // Prevent duplicates
      if (prev.some(q => q.question_text === questionObj.question_text)) {
        return prev;
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
    setActiveTab('lab');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Navigation Header */}
      <header style={{
        height: '65px',
        flexShrink: 0,
        padding: '0 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        zIndex: 10
      }}>
        {/* Left Side: Logo & Dedicated Top-Left History Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          
          {/* Top-Left History Button */}
          <button 
            type="button"
            onClick={() => setShowHistoryDrawer(true)} 
            className="btn btn-secondary" 
            style={{ 
              padding: '6px 14px', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderColor: historySessions.length > 0 ? 'var(--color-primary)' : 'var(--border-subtle)'
            }}
            title="Open Analysis History Sessions"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
            {historySessions.length > 0 && (
              <span className="badge badge-violet" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                {historySessions.length}
              </span>
            )}
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: user.role === 'faculty' ? 'var(--color-primary)' : '#7BAE7F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: user.role === 'faculty' ? '0 2px 14px rgba(212, 161, 92, 0.35)' : '0 2px 14px rgba(123, 174, 127, 0.35)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="2.4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-serif)', fontWeight: '700', lineHeight: 1.1 }}>
                  Syllabus Engine
                </h1>
                <span className={`badge ${user.role === 'faculty' ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {user.role === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.04em', fontWeight: '500' }}>
                {user.role === 'faculty' ? 'CURRICULUM ARCHITECTURE & EXAMINATION DESIGN' : 'LEARNING ROADMAPS & ACTIVE REVISION'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Active Subject & User Profile Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {data && (
            <>
              <div style={{
                padding: '5px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                fontWeight: '500'
              }}>
                Subject: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{data.subject_name}</span>
              </div>

              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="btn btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                {isSidebarOpen ? 'Hide Controls' : 'Show Controls'}
              </button>

              <button 
                onClick={handleResetAnalysis} 
                className="btn btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.78rem', color: 'var(--color-accent)' }}
              >
                New Analysis
              </button>
            </>
          )}

          <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)' }} />

          {/* User Profile Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: '20px',
            border: `1px solid ${user.role === 'faculty' ? 'rgba(212, 161, 92, 0.3)' : 'rgba(123, 174, 127, 0.3)'}`
          }}>
            <span style={{ fontSize: '1.05rem' }}>{user.avatar}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: user.role === 'faculty' ? 'var(--color-primary)' : '#7BAE7F', fontWeight: '600' }}>
                {user.badge}
              </span>
            </div>
          </div>

          {/* Switch Role Quick Button */}
          <button
            type="button"
            onClick={handleSwitchRole}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.74rem' }}
            title="Switch between Faculty and Student roles"
          >
            <span>🔄</span>
            <span>Switch to {user.role === 'faculty' ? 'Student' : 'Faculty'}</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.74rem', color: 'var(--color-danger)' }}
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
      {data ? (
        // Active Dashboard View
        <div 
          className="dashboard-grid" 
          style={{ 
            flex: '1', 
            gridTemplateColumns: isSidebarOpen ? '380px 1fr' : '1fr',
            transition: 'grid-template-columns 0.25s ease'
          }}
        >
          {/* Controls Sidebar */}
          {isSidebarOpen && (
            <aside style={{ height: '100%', minHeight: '0' }}>
              <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} progress={statusMessage} />
            </aside>
          )}

          {/* Navigation & Workspace Panels */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '0' }}>
            {/* Error Banner */}
            {error && (
              <div className="glass-panel" style={{ padding: '12px 18px', borderColor: 'var(--color-danger)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>{error}</span>
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            )}

            {/* Role Contextual Helper Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: user.role === 'faculty' ? 'rgba(212, 161, 92, 0.08)' : 'rgba(123, 174, 127, 0.08)',
              border: `1px solid ${user.role === 'faculty' ? 'rgba(212, 161, 92, 0.25)' : 'rgba(123, 174, 127, 0.25)'}`,
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{user.avatar}</span>
                <span style={{ fontWeight: '700', color: user.role === 'faculty' ? 'var(--color-primary)' : '#7BAE7F' }}>
                  {user.role === 'faculty' ? 'Faculty Mode Active:' : 'Student Mode Active:'}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {user.role === 'faculty'
                    ? 'Design Bloom-aligned exams, generate variant question sets (Sets A/B/C) to prevent copying, and curate course questions.'
                    : 'Explore prerequisite study pathways, practice with revision flashcards, and submit answers for instant AI grading.'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${user.role === 'faculty' ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.68rem' }}>
                  {user.badge}
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Tailored per role) */}
            <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {user.role === 'faculty' ? (
                <>
                  <button 
                    onClick={() => setActiveTab('blueprint')} 
                    className={`btn ${activeTab === 'blueprint' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Design official exam papers with Bloom taxonomy"
                  >
                    📐 Exam Designer
                  </button>
                  <button 
                    onClick={() => setActiveTab('variants')} 
                    className={`btn ${activeTab === 'variants' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Generate multi-set exam questions (Set A, B, C) to prevent cheating"
                  >
                    🔀 Question Variants
                  </button>
                  <button 
                    onClick={() => setActiveTab('lab')} 
                    className={`btn ${activeTab === 'lab' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Author and curate departmental question repository"
                  >
                    🧪 Question Lab
                  </button>
                  <button 
                    onClick={() => setActiveTab('pastpapers')} 
                    className={`btn ${activeTab === 'pastpapers' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Audit previous year papers for syllabus coverage gaps"
                  >
                    📑 Paper Auditor
                  </button>
                  <button 
                    onClick={() => setActiveTab('graph')} 
                    className={`btn ${activeTab === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="View syllabus prerequisite architecture"
                  >
                    🗺️ Knowledge Map
                  </button>
                  <button 
                    onClick={() => setActiveTab('concepts')} 
                    className={`btn ${activeTab === 'concepts' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Inspect concept dependency flows"
                  >
                    💡 Concepts
                  </button>
                  <button 
                    onClick={() => setActiveTab('modules')} 
                    className={`btn ${activeTab === 'modules' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Module structure and learning outcomes"
                  >
                    📚 Curriculum
                  </button>
                  <button 
                    onClick={() => setActiveTab('analytics')} 
                    className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Course cognitive depth and Bloom distribution"
                  >
                    📊 Analytics
                  </button>
                  <button 
                    onClick={() => setActiveTab('evaluator')} 
                    className={`btn ${activeTab === 'evaluator' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Grade and evaluate student answer submissions"
                  >
                    ✍️ Evaluator
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setActiveTab('graph')} 
                    className={`btn ${activeTab === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Interactive roadmap showing what to learn first"
                  >
                    🗺️ Learning Map
                  </button>
                  <button 
                    onClick={() => setActiveTab('concepts')} 
                    className={`btn ${activeTab === 'concepts' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Concept dependencies and prerequisite paths"
                  >
                    💡 Concept Flow
                  </button>
                  <button 
                    onClick={() => setActiveTab('flashcards')} 
                    className={`btn ${activeTab === 'flashcards' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Active recall flashcard decks for quick exam revision"
                  >
                    🗂️ AI Flashcards
                  </button>
                  <button 
                    onClick={() => setActiveTab('evaluator')} 
                    className={`btn ${activeTab === 'evaluator' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Test your answers and get instant private grading and feedback"
                  >
                    ✍️ AI Evaluator
                  </button>
                  <button 
                    onClick={() => setActiveTab('lab')} 
                    className={`btn ${activeTab === 'lab' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Practice solving questions by topic"
                  >
                    📝 Practice Lab
                  </button>
                  <button 
                    onClick={() => setActiveTab('modules')} 
                    className={`btn ${activeTab === 'modules' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Review course modules and key topics"
                  >
                    📚 Study Modules
                  </button>
                  <button 
                    onClick={() => setActiveTab('pastpapers')} 
                    className={`btn ${activeTab === 'pastpapers' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Explore recurring previous exam questions"
                  >
                    🔄 Past Papers
                  </button>
                  <button 
                    onClick={() => setActiveTab('analytics')} 
                    className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, minWidth: '95px' }}
                    title="Track syllabus coverage and difficulty distribution"
                  >
                    📊 Coverage
                  </button>
                </>
              )}
            </div>

            {/* Workspace Active Panels (Persistent display wrappers to prevent unmounting and state loss) */}
            <div style={{ flex: '1', minHeight: '0', position: 'relative' }}>
              <div style={{ display: activeTab === 'graph' ? 'block' : 'none', height: '100%' }}>
                <KnowledgeGraph 
                  data={data} 
                  onForwardToLab={handleForwardToLab} 
                  onForwardToFlashcards={handleForwardToFlashcards}
                />
              </div>
              <div style={{ display: activeTab === 'concepts' ? 'block' : 'none', height: '100%' }}>
                <ConceptGraph 
                  data={data} 
                  onForwardToLab={handleForwardToLab} 
                  onForwardToFlashcards={handleForwardToFlashcards}
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
            </div>
          </main>
        </div>
      ) : (
        // Clean Scrollable Centered Upload View (Fixed vertical clipping bug)
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
            {/* Centered Headline with Ambient Glow */}
            <div style={{ 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              position: 'relative',
              padding: '20px 0'
            }}>
              {/* Subtle Ambient Glow Behind Hero */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '450px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(212, 161, 92, 0.12) 0%, rgba(108, 100, 153, 0.08) 50%, transparent 80%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
                zIndex: 0
              }} />

              <span className={`badge ${user.role === 'faculty' ? 'badge-amber' : 'badge-emerald'}`} style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem', zIndex: 1 }}>
                {user.role === 'faculty' ? 'FACULTY & INSTRUCTOR PORTAL' : 'STUDENT & LEARNER STUDY PORTAL'}
              </span>

              <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', fontWeight: '700', lineHeight: '1.16', color: 'var(--text-primary)', margin: '4px 0', zIndex: 1 }}>
                {user.role === 'faculty' ? (
                  <>
                    Curriculum Intelligence & <span style={{ color: 'var(--color-primary)', fontStyle: 'italic', textShadow: '0 0 30px rgba(212, 161, 92, 0.3)' }}>Assessment Architecture</span>
                  </>
                ) : (
                  <>
                    Interactive Learning Roadmaps & <span style={{ color: '#7BAE7F', fontStyle: 'italic', textShadow: '0 0 30px rgba(123, 174, 127, 0.3)' }}>Exam Preparation</span>
                  </>
                )}
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: '1.65', maxWidth: '620px', fontWeight: '400', zIndex: 1 }}>
                {user.role === 'faculty' 
                  ? 'Upload an accredited course syllabus, paste textbook chapters, or attach past papers to generate Bloom-aligned exam blueprints, multi-set variants (Set A/B/C), and question banks.'
                  : 'Upload your syllabus or lecture notes to generate interactive prerequisite dependency graphs, active recall flashcards, and submit practice answers for instant AI grading.'}
              </p>
            </div>

            {/* Centered Parser Control Card */}
            <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} progress={statusMessage} />

            {/* Error Notice */}
            {error && (
              <div className="glass-panel" style={{ width: '100%', padding: '14px', border: '1px solid var(--color-danger)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
