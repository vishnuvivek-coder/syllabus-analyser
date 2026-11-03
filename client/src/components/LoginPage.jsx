import React, { useState } from 'react';

export const DEMO_USERS = {
  faculty: {
    id: 'faculty',
    email: 'faculty@university.edu',
    password: 'faculty123',
    role: 'faculty',
    name: 'Prof. Sarah Jenkins',
    title: 'Department of Computer Science & Engineering',
    avatar: '👨‍🏫',
    badge: 'Faculty / Instructor'
  },
  student: {
    id: 'student',
    email: 'student@university.edu',
    password: 'student123',
    role: 'student',
    name: 'Alex Rivera',
    title: 'Student ID: 2024-CS-042',
    avatar: '🎓',
    badge: 'Student / Learner'
  }
};

export default function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('faculty'); // 'faculty' | 'student'
  const [identifier, setIdentifier] = useState(DEMO_USERS.faculty.id);
  const [password, setPassword] = useState(DEMO_USERS.faculty.password);
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [error, setError] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  const handleRoleTabChange = (role) => {
    setSelectedRole(role);
    setIdentifier(DEMO_USERS[role].id);
    setPassword(DEMO_USERS[role].password);
    setError('');
  };

  const handleQuickLogin = (role) => {
    const user = DEMO_USERS[role];
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    }
    onLogin(user);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check against demo accounts
    let matchedUser = null;
    if (
      (cleanId === DEMO_USERS.faculty.id || cleanId === DEMO_USERS.faculty.email) &&
      cleanPass === DEMO_USERS.faculty.password
    ) {
      matchedUser = DEMO_USERS.faculty;
    } else if (
      (cleanId === DEMO_USERS.student.id || cleanId === DEMO_USERS.student.email) &&
      cleanPass === DEMO_USERS.student.password
    ) {
      matchedUser = DEMO_USERS.student;
    }

    if (matchedUser) {
      if (apiKey.trim()) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
      }
      onLogin(matchedUser);
    } else {
      setError('Invalid ID or Password. Please check the demo credentials below.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Ambient Glow Effects */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '25%',
        width: '500px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(212, 161, 92, 0.08) 0%, rgba(108, 100, 153, 0.05) 50%, transparent 80%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '25%',
        width: '450px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(108, 100, 153, 0.1) 0%, rgba(212, 161, 92, 0.04) 50%, transparent 80%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '1040px',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px'
      }}>
        
        {/* Academic Header Branding */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 16px',
            borderRadius: '24px',
            background: 'rgba(212, 161, 92, 0.08)',
            border: '1px solid rgba(212, 161, 92, 0.25)',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🏛️</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)'
            }}>
              Academic Portal Authentication
            </span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: '700',
            color: 'var(--text-primary)',
            lineHeight: 1.2
          }}>
            Syllabus Engine & Assessment Platform
          </h1>
          
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            maxWidth: '620px',
            lineHeight: 1.6
          }}>
            Select your role to access curriculum design tools, question generation, and personalized student study pathways.
          </p>
        </div>

        {/* Two-Column Grid: Left Login Box, Right Role Function Comparison */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 460px) minmax(320px, 1fr)',
          gap: '24px',
          width: '100%',
          alignItems: 'stretch'
        }}>
          
          {/* Left: Login Form Card */}
          <div className="glass-panel" style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            
            {/* Role Tab Switcher */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px' }}>Select Login Role</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'var(--bg-elevated)',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => handleRoleTabChange('faculty')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedRole === 'faculty' ? 'var(--color-primary)' : 'transparent',
                    color: selectedRole === 'faculty' ? '#0D0D0F' : 'var(--text-secondary)',
                    fontWeight: selectedRole === 'faculty' ? '700' : '500',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span>👨‍🏫</span>
                  <span>Faculty / Instructor</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleTabChange('student')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedRole === 'student' ? 'var(--color-primary)' : 'transparent',
                    color: selectedRole === 'student' ? '#0D0D0F' : 'var(--text-secondary)',
                    fontWeight: selectedRole === 'student' ? '700' : '500',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span>🎓</span>
                  <span>Student / Learner</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '14px',
              background: 'rgba(212, 161, 92, 0.05)',
              border: '1px dashed rgba(212, 161, 92, 0.3)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚡ Quick Demo Login
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1-Click Instant Access</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('faculty')}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderColor: selectedRole === 'faculty' ? 'var(--color-primary)' : 'var(--border-subtle)'
                  }}
                >
                  <span>👨‍🏫</span>
                  <span>Log in as Faculty</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('student')}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderColor: selectedRole === 'student' ? 'var(--color-primary)' : 'var(--border-subtle)'
                  }}
                >
                  <span>🎓</span>
                  <span>Log in as Student</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(224, 106, 96, 0.12)',
                border: '1px solid var(--color-danger)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">
                  {selectedRole === 'faculty' ? 'Faculty ID or Email' : 'Student ID or Email'}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={selectedRole === 'faculty' ? 'faculty or faculty@university.edu' : 'student or student@university.edu'}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {/* Optional Gemini API Key configuration */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowApiInput(!showApiInput)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🔑</span>
                  <span>{showApiInput ? 'Hide Gemini API Key' : 'Configure Gemini API Key (Optional)'}</span>
                </button>

                {showApiInput && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste Gemini API Key (starts with AIza...)"
                      className="form-input"
                      style={{ fontSize: '0.8rem' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Stored safely in your browser localStorage.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  marginTop: '4px'
                }}
              >
                Sign In to {selectedRole === 'faculty' ? 'Faculty Portal' : 'Student Portal'} →
              </button>
            </form>

            {/* Clear Credentials Notice Box */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                📋 Default Login Credentials:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Faculty:</span><br />
                  ID: <code style={{ color: 'var(--text-primary)' }}>faculty</code><br />
                  Pass: <code style={{ color: 'var(--text-primary)' }}>faculty123</code>
                </div>
                <div>
                  <span style={{ color: '#7BAE7F', fontWeight: '600' }}>Student:</span><br />
                  ID: <code style={{ color: 'var(--text-primary)' }}>student</code><br />
                  Pass: <code style={{ color: 'var(--text-primary)' }}>student123</code>
                </div>
              </div>
            </div>

          </div>

          {/* Right: Role Functions & Value Proposition Panel */}
          <div className="glass-panel" style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: selectedRole === 'faculty' ? 'rgba(212, 161, 92, 0.35)' : 'rgba(108, 100, 153, 0.45)'
          }}>
            <div>
              {/* Header Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>{DEMO_USERS[selectedRole].avatar}</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {selectedRole === 'faculty' ? 'Faculty & Instructor Workspace' : 'Student & Learner Workspace'}
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: selectedRole === 'faculty' ? 'var(--color-primary)' : '#7BAE7F', fontWeight: '600' }}>
                    {selectedRole === 'faculty' ? 'Tailored for Curriculum Design & Evaluation' : 'Tailored for Concept Mastery & Self-Assessment'}
                  </span>
                </div>
              </div>

              {/* Function Benefit List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
                {selectedRole === 'faculty' ? (
                  <>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(212, 161, 92, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        📐
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Exam Blueprint Designer
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Design official exam question papers, balance Bloom's taxonomy cognitive levels (Remember, Apply, Analyze), and specify marks weightage.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(212, 161, 92, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        🔀
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Question Variants Generator (Anti-Cheating)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Generate parallel Set A, B, and C exam versions with parameter shifts, inverse problems, and real-world scenarios to ensure test integrity.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(212, 161, 92, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        🧪
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Departmental Question Lab & Bank
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Author and curate an authoritative course question bank with verified marking schemes, difficulty ratings, and model answers.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(212, 161, 92, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        📑
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Past Paper Syllabus Gap Auditor
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Audit past examination papers against the accredited syllabus to discover untested blind spots and ensure even topic coverage.
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(123, 174, 127, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        🗺️
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Visual Knowledge Map & Prerequisite Flow
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          See exactly what concepts to learn first. Identifies dependencies so you never feel lost reading advanced textbook chapters.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(123, 174, 127, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        🗂️
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          AI Flashcard Deck & Spaced Repetition
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Master formulas, key definitions, and theorems with interactive flashcards designed for quick active recall before exams.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(123, 174, 127, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        ✍️
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          AI Answer Evaluator (Private Grading Assistant)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Type your answer or upload a photo of handwritten notes. Get instant rubric grading, missed marks analysis, and model solutions.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ padding: '8px', background: 'rgba(123, 174, 127, 0.1)', borderRadius: '8px', fontSize: '1.1rem' }}>
                        📝
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          Self-Paced Practice Lab
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Practice questions by topic, test yourself under exam time constraints, and build your confidence ahead of university exams.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Profile Preview Box */}
            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: selectedRole === 'faculty' ? 'rgba(212, 161, 92, 0.2)' : 'rgba(123, 174, 127, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {DEMO_USERS[selectedRole].avatar}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {DEMO_USERS[selectedRole].name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {DEMO_USERS[selectedRole].title}
                  </div>
                </div>
              </div>

              <span className={`badge ${selectedRole === 'faculty' ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.7rem' }}>
                {DEMO_USERS[selectedRole].badge}
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
