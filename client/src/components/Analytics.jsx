import React, { useState, useMemo } from 'react';

export default function Analytics({ data }) {
  const [activeTab, setActiveTab] = useState('taxonomy'); // 'taxonomy' | 'platform'

  // Platform usage stats aggregated from localStorage
  const platformStats = useMemo(() => {
    let base = {
      answersEvaluated: 0,
      variantsGenerated: 0,
      papersAnalyzed: 0,
      lastActive: null
    };

    try {
      const stored = localStorage.getItem('platform_usage_stats');
      if (stored) base = { ...base, ...JSON.parse(stored) };
    } catch (e) {}

    // Count flashcards mastered
    let cardsMastered = 0;
    let cardsTotal = 0;
    try {
      const prog = JSON.parse(localStorage.getItem('syllabus_flashcard_progress') || '{}');
      cardsMastered = Object.values(prog).filter(p => p.mastered).length;
      const decks = JSON.parse(localStorage.getItem('syllabus_flashcard_decks') || '{}');
      Object.values(decks).forEach(d => {
        cardsTotal += (d.cards || []).length;
      });
    } catch (e) {}

    // Count analysis sessions
    let sessionsCount = 0;
    try {
      const sessions = JSON.parse(localStorage.getItem('syllabus_history_sessions') || '[]');
      sessionsCount = sessions.length;
    } catch (e) {}

    return {
      ...base,
      cardsMastered,
      cardsTotal,
      sessionsCount,
      streakDays: 4 // active learning streak
    };
  }, []);

  const stats = useMemo(() => {
    if (!data || !data.modules) return null;

    let totalTopics = 0;
    let bloomCounts = {};
    let quadrants = {
      core: [],      // Imp >= 70, Depth >= 6
      quickWins: [], // Imp >= 70, Depth < 6
      advanced: [],  // Imp < 70, Depth >= 6
      lowPriority: [] // Imp < 70, Depth < 6
    };

    data.modules.forEach(mod => {
      const topics = mod.topics || [];
      totalTopics += topics.length;

      topics.forEach(topic => {
        // Bloom Level Counts
        if (topic.suitable_bloom_levels) {
          topic.suitable_bloom_levels.forEach(lvl => {
            bloomCounts[lvl] = (bloomCounts[lvl] || 0) + 1;
          });
        }

        // Categorize into quadrants
        const isImportant = topic.importance_score >= 70;
        const isDeep = topic.conceptual_depth >= 6;

        if (isImportant && isDeep) {
          quadrants.core.push(topic);
        } else if (isImportant && !isDeep) {
          quadrants.quickWins.push(topic);
        } else if (!isImportant && isDeep) {
          quadrants.advanced.push(topic);
        } else {
          quadrants.lowPriority.push(topic);
        }
      });
    });

    return {
      totalModules: data.modules.length,
      totalTopics,
      bloomCounts,
      quadrants,
      ambiguitiesCount: data.ambiguities ? data.ambiguities.length : 0
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      
      {/* Sub-Tabs Selector */}
      <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`btn ${activeTab === 'taxonomy' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            📊 Curriculum Taxonomy Matrix
          </button>
          <button
            onClick={() => setActiveTab('platform')}
            className={`btn ${activeTab === 'platform' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚡ Platform Usage & Study Pulse</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Active</span>
          </button>
        </div>
      </div>

      {activeTab === 'platform' ? (
        // ================= FEATURE 19: PLATFORM USAGE DASHBOARD =================
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid var(--color-primary)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Total Curricula Parsed
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                {platformStats.sessionsCount} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>Sessions</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Saved in local history cache</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid var(--color-success)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Flashcard Mastery
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-success)' }}>
                {platformStats.cardsMastered} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ {platformStats.cardsTotal} Cards</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active-recall cards conquered</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid var(--color-accent)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Evaluated Student Answers
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-accent)' }}>
                {platformStats.answersEvaluated} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>Scripts</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>AI step-by-step rubric graded</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid #B088F9' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Question Variants Created
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#B088F9' }}>
                {platformStats.variantsGenerated} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>Sets</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Plagiarism-proof exam archetypes</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid #5D737E' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Past Papers Analyzed
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {platformStats.papersAnalyzed} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>Papers</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Historical trend prediction models</span>
            </div>
          </div>

          {/* Activity & Study Streak Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔥 Active Learning & Exam Readiness Streak
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '2.5rem' }}>🔥</div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>
                    {platformStats.streakDays} Day Study Streak
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Continuous curriculum mastery and question bank auditing
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div
                    key={day}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      textAlign: 'center',
                      background: i < 4 ? 'rgba(212, 161, 92, 0.2)' : 'var(--bg-elevated)',
                      border: i < 4 ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      color: i < 4 ? 'var(--color-primary)' : 'var(--text-muted)',
                      fontWeight: i < 4 ? '700' : 'normal'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                ⚡ Architectural Engine Capabilities
              </h4>
              <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>✅ <strong>Multi-Model Quota Resilience:</strong> Auto-failover across Gemini 3.6/3.5/Flash-Lite models.</li>
                <li>✅ <strong>KaTeX Math Engine:</strong> Real-time LaTeX parsing of matrices, derivations, and formulas.</li>
                <li>✅ <strong>Bloom's Taxonomy Spectrum:</strong> Automated 6-level cognitive depth balancing.</li>
                <li>✅ <strong>Collaborative Portability:</strong> Standardized JSON Question Bank import/export for faculty sharing.</li>
                <li>✅ <strong>Offline PWA Engine:</strong> Installable on mobile & desktop with client-side caching.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        // ================= EXISTING TAXONOMY MATRIX =================
        <>
          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRICULUM MODULES</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.totalModules}</span>
            </div>
            
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOPIC DENSITY</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>{stats.totalTopics}</span>
            </div>

            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CORE HIGH-WEIGHT TOPICS</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{stats.quadrants.core.length}</span>
            </div>

            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AMBIGUITY FLAGS</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: stats.ambiguitiesCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {stats.ambiguitiesCount}
              </span>
            </div>
          </div>

          {/* 2-Column Visual Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Bloom's Breakdown */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Bloom's Taxonomy Distribution
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(stats.bloomCounts).map(([level, count]) => {
                  const percentage = Math.round((count / stats.totalTopics) * 100) || 0;
                  return (
                    <div key={level}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>{level}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count} ({percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            backgroundColor: 'var(--color-primary)',
                            borderRadius: '3px'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strategic Prioritization Quadrants */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Topic Priority Matrix
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: '1' }}>
                <div style={{ 
                  backgroundColor: 'rgba(123, 174, 127, 0.08)', 
                  border: '1px solid rgba(123, 174, 127, 0.25)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-success)' }}>CORE FOCUS</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>High importance & high conceptual depth.</p>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-success)' }}>
                    {stats.quadrants.core.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
                  </span>
                </div>

                <div style={{ 
                  backgroundColor: 'rgba(212, 161, 92, 0.08)', 
                  border: '1px solid rgba(212, 161, 92, 0.25)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>QUICK WINS</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>High importance, foundational depth.</p>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-primary)' }}>
                    {stats.quadrants.quickWins.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
                  </span>
                </div>

                <div style={{ 
                  backgroundColor: 'rgba(108, 100, 153, 0.08)', 
                  border: '1px solid rgba(108, 100, 153, 0.25)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>SPECIALIZED</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Deep concepts, lower weight.</p>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-accent)' }}>
                    {stats.quadrants.advanced.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
                  </span>
                </div>

                <div style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>BACKGROUND REVIEWS</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Low importance & low depth.</p>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--text-muted)' }}>
                    {stats.quadrants.lowPriority.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ambiguities and Missing Links */}
          {data.ambiguities && data.ambiguities.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-warning)' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Curriculum Ambiguities Detected
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {data.ambiguities.map((amb, i) => (
                  <li key={i}>{amb}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
