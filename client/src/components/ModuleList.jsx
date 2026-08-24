import React, { useState } from 'react';

export default function ModuleList({ data }) {
  const [expandedModules, setExpandedModules] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  if (!data || !data.modules) return null;

  const toggleModule = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  // Filter modules/topics based on search query
  const filteredModules = data.modules.map(mod => {
    const matchingTopics = (mod.topics || []).filter(topic => 
      topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.subtopics?.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase())) ||
      topic.important_concepts?.some(concept => concept.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return {
      ...mod,
      topics: matchingTopics,
      isMatch: matchingTopics.length > 0 || mod.module_name.toLowerCase().includes(searchQuery.toLowerCase())
    };
  }).filter(mod => mod.isMatch);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem' }}>
          Curriculum Hub <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({data.modules.length} Modules)</span>
        </h2>
        
        {/* Search Input */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search syllabus..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', fontSize: '0.8rem' }}
          />
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--text-muted)" 
            strokeWidth="2" 
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* List Container */}
      <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredModules.length > 0 ? (
          filteredModules.map((mod) => {
            const isExpanded = expandedModules[mod.module_id] !== false; // Default expanded
            
            return (
              <div 
                key={mod.module_id} 
                className="glass-panel" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid var(--border-glass)',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {/* Module Header */}
                <div 
                  onClick={() => toggleModule(mod.module_id)}
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: isExpanded ? '1px solid var(--border-glass)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>{mod.module_id}</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{mod.module_name}</h3>
                  </div>
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="var(--text-secondary)" 
                    strokeWidth="2"
                    style={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Topics Container */}
                {isExpanded && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mod.topics && mod.topics.length > 0 ? (
                      mod.topics.map((topic) => (
                        <div 
                          key={topic.topic_id} 
                          style={{ 
                            padding: '14px', 
                            borderRadius: '10px', 
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255,255,255,0.04)' 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{topic.topic_id}</span>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '600' }}>{topic.topic_name}</h4>
                            </div>
                            
                            {/* Feature Badges */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {topic.is_programming && (
                                <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(6, 182, 212, 0.2)', fontSize: '0.65rem' }}>
                                  Programming
                                </span>
                              )}
                              {topic.is_mathematical && (
                                <span className="badge" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--color-secondary)', border: '1px solid rgba(236, 72, 153, 0.2)', fontSize: '0.65rem' }}>
                                  Math Formula
                                </span>
                              )}
                              {topic.is_practical && !topic.is_programming && (
                                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.65rem' }}>
                                  Practical
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subtopics */}
                          {topic.subtopics && topic.subtopics.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Subtopics:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {topic.subtopics.map((sub, i) => (
                                  <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Details line */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Est: <strong>{topic.estimated_learning_time}</strong></span>
                            <span>Depth: <strong>{topic.conceptual_depth}/10</strong></span>
                            <span>Importance: <strong>{topic.importance_score}%</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No topics match the search criteria.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No modules match your query. Try clearing search keywords.
          </div>
        )}
      </div>
    </div>
  );
}
