import React, { useMemo } from 'react';

export default function Analytics({ data }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL MODULES</span>
          <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)' }}>{stats.totalModules}</span>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL TOPICS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-accent)' }}>{stats.totalTopics}</span>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>AMBIGUITIES FLAG</span>
          <span style={{ 
            fontSize: '1.8rem', 
            fontWeight: '800', 
            color: stats.ambiguitiesCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'
          }}>
            {stats.ambiguitiesCount}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Bloom's Level Distribution */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Bloom's Taxonomy Spectrum</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(lvl => {
              const count = stats.bloomCounts[lvl] || 0;
              const percent = stats.totalTopics ? (count / stats.totalTopics) * 100 : 0;
              
              let barColor = 'var(--text-muted)';
              if (lvl === 'Remember') barColor = '#6b7280';
              if (lvl === 'Understand') barColor = '#3b82f6';
              if (lvl === 'Apply') barColor = 'var(--color-accent)';
              if (lvl === 'Analyze') barColor = 'var(--color-primary)';
              if (lvl === 'Evaluate') barColor = 'var(--color-secondary)';
              if (lvl === 'Create') barColor = '#f59e0b';

              return (
                <div key={lvl}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>{lvl}</span>
                    <span style={{ fontWeight: '600' }}>{count} ({Math.round(percent)}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Matrix */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Study Priority Matrix</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gridTemplateRows: '1fr 1fr', 
            gap: '12px',
            flex: '1' 
          }}>
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.05)', 
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '8px', 
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>CORE DIRECTIVE</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>High depth & high importance topics.</p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-primary)' }}>
                {stats.quadrants.core.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
              </span>
            </div>

            <div style={{ 
              background: 'rgba(6, 182, 212, 0.05)', 
              border: '1px solid rgba(6, 182, 212, 0.15)',
              borderRadius: '8px', 
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>QUICK MEMORIES</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>High importance & low depth.</p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-accent)' }}>
                {stats.quadrants.quickWins.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
              </span>
            </div>

            <div style={{ 
              background: 'rgba(236, 72, 153, 0.05)', 
              border: '1px solid rgba(236, 72, 153, 0.15)',
              borderRadius: '8px', 
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>ADVANCED EXPLORER</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Low importance & high depth.</p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', alignSelf: 'flex-end', color: 'var(--color-secondary)' }}>
                {stats.quadrants.advanced.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>topics</span>
              </span>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-glass)',
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
    </div>
  );
}
