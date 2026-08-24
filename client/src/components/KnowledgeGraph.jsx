import React, { useState, useMemo } from 'react';

export default function KnowledgeGraph({ data, onForwardToLab }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Zoom and Pan States
  const [scale, setScale] = useState(0.85);
  const [translate, setTranslate] = useState({ x: 30, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layout parameters
  const colWidth = 240;
  const rowHeight = 65;
  const paddingLeft = 60;
  const paddingTop = 40;

  // Compute layout coordinates dynamically
  const layout = useMemo(() => {
    if (!data || !data.modules) return null;

    const nodes = [];
    const connections = [];
    const prerequisiteLinks = [];

    // Main Subject Node
    const subjectNode = {
      id: 'subject',
      label: data.subject_name || 'Curriculum',
      x: paddingLeft,
      y: 0,
      type: 'subject',
      data: {
        subject_name: data.subject_name || 'Curriculum',
        modules_count: data.modules.length,
        learning_outcomes: data.learning_outcomes || [],
        ambiguities: data.ambiguities || []
      }
    };
    nodes.push(subjectNode);

    let topicCounter = 0;
    const moduleNodes = [];

    // Pre-calculate heights
    data.modules.forEach((mod) => {
      const modTopicsCount = mod.topics ? mod.topics.length : 0;
      const modNode = {
        id: mod.module_id,
        label: mod.module_name,
        type: 'module',
        x: paddingLeft + colWidth,
        topicsCount: modTopicsCount,
        startIndex: topicCounter,
        data: mod
      };
      
      topicCounter += Math.max(modTopicsCount, 1);
      moduleNodes.push(modNode);
    });

    const totalRows = topicCounter;
    const totalHeight = totalRows * rowHeight + paddingTop * 2;
    
    // Set Subject Node Y to center
    subjectNode.y = totalHeight / 2;

    // Calculate module and topic positions
    let currentTopicIndex = 0;
    const topicCoordinates = {}; // lookup for prerequisite drawing

    data.modules.forEach((mod, modIdx) => {
      const modNode = moduleNodes[modIdx];
      const topics = mod.topics || [];
      
      // Module Y is the center of its topics
      const startY = paddingTop + currentTopicIndex * rowHeight;
      const endY = paddingTop + (currentTopicIndex + Math.max(topics.length - 1, 0)) * rowHeight;
      modNode.y = (startY + endY) / 2;
      nodes.push(modNode);

      // Connection from Subject to Module
      connections.push({
        from: subjectNode,
        to: modNode,
        color: 'var(--color-primary)'
      });

      topics.forEach((topic, topicIdx) => {
        const topicY = paddingTop + (currentTopicIndex + topicIdx) * rowHeight;
        const topicNode = {
          id: topic.topic_id,
          label: topic.topic_name,
          type: 'topic',
          x: paddingLeft + colWidth * 2.2,
          y: topicY,
          data: topic,
          moduleName: mod.module_name
        };
        nodes.push(topicNode);
        topicCoordinates[topic.topic_id] = { x: topicNode.x, y: topicNode.y };

        // Connection from Module to Topic
        connections.push({
          from: modNode,
          to: topicNode,
          color: 'var(--border-subtle)'
        });
      });

      currentTopicIndex += Math.max(topics.length, 1);
    });

    // Create prerequisite connection list
    data.modules.forEach((mod) => {
      const topics = mod.topics || [];
      topics.forEach((topic) => {
        if (topic.prerequisite_topics && Array.isArray(topic.prerequisite_topics)) {
          topic.prerequisite_topics.forEach((prereqId) => {
            if (topicCoordinates[prereqId] && topicCoordinates[topic.topic_id]) {
              prerequisiteLinks.push({
                fromId: prereqId,
                toId: topic.topic_id,
                fromCoords: topicCoordinates[prereqId],
                toCoords: topicCoordinates[topic.topic_id]
              });
            }
          });
        }
      });
    });

    return { nodes, connections, prerequisiteLinks, totalHeight, width: paddingLeft + colWidth * 3.5 };
  }, [data]);

  if (!data || !data.modules) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No knowledge map data available. Upload a syllabus to generate.
      </div>
    );
  }

  const { nodes, connections, prerequisiteLinks, totalHeight, width } = layout;

  const activeNode = hoveredNode || selectedNode;
  const activeTopic = activeNode && activeNode.type === 'topic' ? activeNode.data : null;
  const activeModule = activeNode && activeNode.type === 'module' ? activeNode.data : null;
  const activeSubject = activeNode && activeNode.type === 'subject' ? activeNode.data : null;

  // Zoom & Pan Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    setScale(Math.max(0.3, Math.min(nextScale, 3)));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(s => Math.min(s * 1.15, 3));
  const zoomOut = () => setScale(s => Math.max(s / 1.15, 0.3));
  const resetZoom = () => {
    setScale(0.85);
    setTranslate({ x: 30, y: 10 });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', height: '100%' }}>
      {/* Interactive Visual SVG Canvas */}
      <div 
        className="glass-panel" 
        style={{ 
          overflow: 'hidden', 
          padding: '0', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        {/* Header Bar */}
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          padding: '12px 18px', 
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          zIndex: 5
        }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700' }}>Interactive Knowledge Map</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click any node (Subject, Module, or Topic) to inspect information</span>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              Module Flow
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px dashed var(--color-warning)', backgroundColor: 'transparent' }} />
              Prerequisite
            </span>
          </div>
        </div>

        {/* Floating Zoom & Pan Controls */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 5
        }}>
          <button onClick={zoomIn} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '1rem', width: '36px', height: '36px' }}>+</button>
          <button onClick={zoomOut} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '1rem', width: '36px', height: '36px' }}>-</button>
          <button onClick={resetZoom} className="btn btn-secondary" style={{ padding: '4px 6px', fontSize: '0.7rem', width: '36px', height: '36px' }}>Reset</button>
        </div>

        {/* SVG Drawing Canvas */}
        <div 
          style={{ flex: '1', position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--color-warning)" />
              </marker>
            </defs>

            {/* Transform Group */}
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              
              {/* Render Connections */}
              {connections.map((conn, idx) => {
                const dx = (conn.to.x - conn.from.x) * 0.5;
                const pathStr = `M ${conn.from.x} ${conn.from.y} C ${conn.from.x + dx} ${conn.from.y}, ${conn.to.x - dx} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`;
                const isConnActive = activeNode && (activeNode.id === conn.from.id || activeNode.id === conn.to.id);
                return (
                  <path
                    key={`conn-${idx}`}
                    d={pathStr}
                    fill="none"
                    stroke={isConnActive ? 'var(--color-primary)' : conn.color}
                    strokeWidth={isConnActive ? '2.5' : '1.5'}
                    style={{ opacity: activeNode ? (isConnActive ? 1 : 0.25) : 0.6, transition: 'var(--transition-smooth)' }}
                  />
                );
              })}

              {/* Render Prerequisite Links */}
              {prerequisiteLinks.map((link, idx) => {
                const dx = (link.toCoords.x - link.fromCoords.x) * 0.4;
                const pathStr = `M ${link.fromCoords.x} ${link.fromCoords.y} C ${link.fromCoords.x + dx} ${link.fromCoords.y - 40}, ${link.toCoords.x - dx} ${link.toCoords.y + 40}, ${link.toCoords.x} ${link.toCoords.y}`;
                return (
                  <path
                    key={`prereq-${idx}`}
                    d={pathStr}
                    fill="none"
                    stroke="var(--color-warning)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    markerEnd="url(#arrow)"
                    style={{ opacity: activeTopic ? 0.9 : 0.4 }}
                  />
                );
              })}

              {/* Render Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode && selectedNode.id === node.id;
                const isHovered = hoveredNode && hoveredNode.id === node.id;
                const isActive = isSelected || isHovered;

                let fill = 'var(--bg-elevated)';
                let border = 'var(--border-subtle)';
                let textWeight = '500';

                if (node.type === 'subject') {
                  fill = isActive ? '#C2904B' : 'var(--color-primary)';
                  border = 'rgba(212, 161, 92, 0.5)';
                  textWeight = '700';
                } else if (node.type === 'module') {
                  fill = isActive ? 'rgba(108, 100, 153, 0.25)' : 'var(--bg-elevated)';
                  border = isActive ? 'var(--color-accent)' : 'var(--border-strong)';
                  textWeight = '600';
                } else if (node.type === 'topic') {
                  fill = isActive ? 'rgba(212, 161, 92, 0.3)' : 'var(--bg-elevated)';
                  border = isActive ? 'var(--color-primary)' : 'var(--border-strong)';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(selectedNode?.id === node.id ? null : node);
                    }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {node.type === 'subject' && (
                      <rect 
                        x="0" 
                        y="-35" 
                        width="160" 
                        height="70" 
                        rx="12" 
                        fill={fill} 
                        stroke={border} 
                        strokeWidth={isActive ? "2" : "1"}
                        style={{ transition: 'var(--transition-fast)' }}
                      />
                    )}

                    {node.type === 'module' && (
                      <rect 
                        x="0" 
                        y="-30" 
                        width="160" 
                        height="60" 
                        rx="10" 
                        fill={fill} 
                        stroke={border} 
                        strokeWidth={isActive ? "2" : "1"}
                        style={{ transition: 'var(--transition-fast)' }}
                      />
                    )}

                    {node.type === 'topic' && (
                      <circle
                        r={isActive ? "8" : "6"}
                        fill={fill}
                        stroke={border}
                        strokeWidth={isActive ? "2.5" : "1.5"}
                        style={{ transition: 'var(--transition-fast)' }}
                      />
                    )}

                    <text
                      x={node.type === 'topic' ? 14 : 80}
                      y={4}
                      textAnchor={node.type === 'topic' ? "start" : "middle"}
                      fill={node.type === 'subject' ? '#0D0D0F' : (isActive ? 'var(--color-primary)' : 'var(--text-primary)')}
                      style={{
                        fontSize: node.type === 'subject' ? '0.85rem' : '0.8rem',
                        fontWeight: textWeight,
                        pointerEvents: 'none',
                        fontFamily: node.type === 'subject' ? 'var(--font-serif)' : 'var(--font-sans)',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {node.label.length > 22 ? node.label.slice(0, 20) + '...' : node.label}
                    </text>
                  </g>
                );
              })}

            </g>
          </svg>
        </div>
      </div>

      {/* Info Card Drawer - Handles Subject, Module, or Topic Information */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        
        {/* Case 1: Topic Selected */}
        {activeTopic ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-violet">{activeTopic.topic_id}</span>
                <span className="badge badge-cyan">TOPIC NODE</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', lineHeight: '1.35', fontWeight: '700' }}>{activeTopic.topic_name}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Module: {activeNode?.moduleName || activeTopic.module_name || 'Core Unit'}
              </p>
            </div>

            {/* Importance Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Importance Score</span>
                <strong style={{ color: 'var(--color-accent)' }}>{activeTopic.importance_score}/100</strong>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${activeTopic.importance_score}%`, background: 'var(--color-primary)' }} />
              </div>
            </div>

            {/* Conceptual Depth Ratings */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Conceptual Complexity</span>
                <strong style={{ color: 'var(--color-accent)' }}>{activeTopic.conceptual_depth}/10</strong>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      flex: '1', 
                      height: '5px', 
                      borderRadius: '2px', 
                      backgroundColor: i < activeTopic.conceptual_depth ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)'
                    }} 
                  />
                ))}
              </div>
            </div>

            {/* Bloom's Levels */}
            {activeTopic.suitable_bloom_levels?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Bloom's Taxonomy Levels</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {activeTopic.suitable_bloom_levels.map((lvl) => (
                    <span key={lvl} className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{lvl}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisites */}
            <div>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Prerequisite Requirements</h4>
              {activeTopic.prerequisite_topics?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {activeTopic.prerequisite_topics.map((p) => (
                    <span key={p} className="badge badge-pink" style={{ fontSize: '0.7rem' }}>
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None (Entry level topic)</span>
              )}
            </div>

            {/* Key Concepts List */}
            {activeTopic.important_concepts?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Key Concepts & Competencies</h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {activeTopic.important_concepts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practical Focus & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Est. Study Hours</span>
                <strong style={{ color: 'var(--text-primary)' }}>{activeTopic.estimated_learning_time || '2 hours'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Practical Orientation</span>
                <strong style={{ color: activeTopic.is_practical || activeTopic.is_programming ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                  {activeTopic.is_practical || activeTopic.is_programming ? 'High Practical' : 'Theoretical'}
                </strong>
              </div>
            </div>

            {/* Real World Application */}
            {activeTopic.application_potential && (
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Real-World Application</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {activeTopic.application_potential}
                </p>
              </div>
            )}

            {onForwardToLab && (
              <button
                className="btn btn-primary"
                onClick={() => onForwardToLab(activeTopic.topic_name)}
                style={{ width: '100%', padding: '9px', fontSize: '0.8rem', marginTop: '4px' }}
              >
                Draft Optimized Question
              </button>
            )}
          </div>
        ) : activeModule ? (
          /* Case 2: Module Selected */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-violet">{activeModule.module_id}</span>
                <span className="badge badge-emerald">CURRICULUM MODULE</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', lineHeight: '1.35', fontWeight: '700' }}>{activeModule.module_name}</h3>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Module Topics ({activeModule.topics ? activeModule.topics.length : 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeModule.topics?.map((top) => (
                  <div 
                    key={top.topic_id}
                    onClick={() => setSelectedNode({ id: top.topic_id, type: 'topic', data: top, moduleName: activeModule.module_name })}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{top.topic_name}</span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{top.topic_id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeSubject ? (
          /* Case 3: Subject Selected */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span className="badge badge-violet" style={{ marginBottom: '6px' }}>COURSE OVERVIEW</span>
              <h3 style={{ fontSize: '1.15rem', lineHeight: '1.35', fontWeight: '700' }}>{activeSubject.subject_name}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Modules Count</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{activeSubject.modules_count}</strong>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Outcomes Count</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>{activeSubject.learning_outcomes?.length || 0}</strong>
              </div>
            </div>

            {activeSubject.learning_outcomes?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Target Learning Outcomes</h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeSubject.learning_outcomes.map((out, idx) => (
                    <li key={idx}>{out}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Case 4: Default Empty State */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)', gap: '10px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Select Any Flowchart Node</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.4' }}>
                Click on any Subject, Module, or Topic box in the map to view detailed prerequisite chains, Bloom's levels, and question drafting shortcuts.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
