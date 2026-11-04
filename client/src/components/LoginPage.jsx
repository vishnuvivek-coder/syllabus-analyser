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
      setError('Invalid ID or Password. Check the default credentials below.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--color-void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Linear Atmospheric Floor */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 20%, rgba(228, 242, 34, 0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        
        {/* Linear Precision Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-pills)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--color-graphite)',
            marginBottom: '4px'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-acid-lime)" strokeWidth="2.5">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '510',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-mist)'
            }}>
              Curriculum Precision System
            </span>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: '510',
            letterSpacing: '-0.022em',
            color: 'var(--color-paper)',
            lineHeight: 1.15
          }}>
            Syllabus Engine
          </h1>
          
          <p style={{
            color: 'var(--color-fog)',
            fontSize: '0.85rem',
            maxWidth: '400px',
            lineHeight: 1.5,
            letterSpacing: '-0.010em'
          }}>
            Midnight precision instrument for examination architecture, question curation, and student revision roadmaps.
          </p>
        </div>

        {/* Login Form Card (Carbon frame at 12px radius) */}
        <div className="glass-panel" style={{
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          backgroundColor: 'var(--color-carbon)',
          border: '1px solid var(--color-graphite)',
          borderRadius: 'var(--radius-cards)',
          boxShadow: 'var(--shadow-subtle), var(--shadow-sm)',
          width: '100%'
        }}>
            
          {/* Role Tab Switcher (Segmented Obsidian Bar) */}
          <div>
            <label className="form-label">Active Workspace Role</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              background: 'var(--color-obsidian)',
              padding: '3px',
              borderRadius: 'var(--radius-inputs)',
              border: '1px solid var(--color-graphite)'
            }}>
              <button
                type="button"
                onClick={() => handleRoleTabChange('faculty')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: selectedRole === 'faculty' ? 'var(--color-graphite)' : 'transparent',
                  color: selectedRole === 'faculty' ? 'var(--color-paper)' : 'var(--color-fog)',
                  fontWeight: selectedRole === 'faculty' ? '510' : '400',
                  fontSize: '0.82rem',
                  letterSpacing: '-0.010em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
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
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: selectedRole === 'student' ? 'var(--color-graphite)' : 'transparent',
                  color: selectedRole === 'student' ? 'var(--color-paper)' : 'var(--color-fog)',
                  fontWeight: selectedRole === 'student' ? '510' : '400',
                  fontSize: '0.82rem',
                  letterSpacing: '-0.010em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
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
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-graphite)',
            borderRadius: 'var(--radius-inputs)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '510', color: 'var(--color-mist)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                ⚡ Instant Access Demo
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-fog)' }}>1-Click Sign In</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('faculty')}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderColor: selectedRole === 'faculty' ? 'var(--color-smoke)' : 'var(--color-graphite)'
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
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderColor: selectedRole === 'student' ? 'var(--color-smoke)' : 'var(--color-graphite)'
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
              padding: '8px 12px',
              borderRadius: 'var(--radius-inputs)',
              background: 'rgba(235, 87, 87, 0.08)',
              border: '1px solid var(--color-coral-red)',
              color: '#fca5a5',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Standard Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    color: 'var(--color-mist)',
                    fontSize: '0.72rem',
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
              />
            </div>

            {/* Optional Gemini API Key configuration */}
            <div style={{ borderTop: '1px solid var(--color-graphite)', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowApiInput(!showApiInput)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-fog)',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔑</span>
                <span>{showApiInput ? 'Hide API Key' : 'Configure Gemini API Key (Optional)'}</span>
              </button>

              {showApiInput && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste Gemini API Key (starts with AQ... or AIza...)"
                    className="form-input"
                    style={{ fontSize: '0.78rem' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-ash)', marginTop: '4px', display: 'block' }}>
                    Stored locally in your browser localStorage.
                  </span>
                </div>
              )}
            </div>

            {/* Linear Acid Lime Primary CTA */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '0.88rem',
                marginTop: '4px'
              }}
            >
              Sign In to {selectedRole === 'faculty' ? 'Faculty Portal' : 'Student Portal'} →
            </button>
          </form>

          {/* Credentials Reference Box (Linear Precision) */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-obsidian)',
            borderRadius: 'var(--radius-inputs)',
            border: '1px solid var(--color-graphite)',
            fontSize: '0.74rem',
            color: 'var(--color-fog)'
          }}>
            <div style={{ fontWeight: '510', color: 'var(--color-mist)', marginBottom: '4px' }}>
              Default Accounts:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--color-paper)', fontWeight: '510' }}>Faculty:</span><br />
                ID: <code style={{ color: 'var(--color-acid-lime)', fontFamily: 'var(--font-mono)' }}>faculty</code><br />
                Pass: <code style={{ color: 'var(--color-mist)', fontFamily: 'var(--font-mono)' }}>faculty123</code>
              </div>
              <div>
                <span style={{ color: 'var(--color-paper)', fontWeight: '510' }}>Student:</span><br />
                ID: <code style={{ color: 'var(--color-pulse-green)', fontFamily: 'var(--font-mono)' }}>student</code><br />
                Pass: <code style={{ color: 'var(--color-mist)', fontFamily: 'var(--font-mono)' }}>student123</code>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
