import React, { useState, useMemo } from 'react';

export default function ConceptGraph({ data, onForwardToLab }) {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [hoveredConcept, setHoveredConcept] = useState(null);

  // Zoom and Pan States
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const graph = useMemo(() => {
    if (!data || !data.concept_dependency_graph) return null;
    return data.concept_dependency_graph;
  }, [data]);

  const conceptNodes = useMemo(() => {
    if (!graph || !graph.concepts) return [];

    const nodes = [];
    const count = graph.concepts.length;
    const centerX = 350;
    const centerY = 280;
    const radius = 200;

    graph.concepts.forEach((concept, i) => {
      // Position nodes in a clean radial circle layout
      const angle = (i * 2 * Math.PI) / count;
      nodes.push({
        ...concept,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });

    return nodes;
  }, [graph]);

  const conceptMap = useMemo(() => {
    const map = {};
    conceptNodes.forEach(node => {
      map[node.id] = node;
    });
    return map;
  }, [conceptNodes]);

  if (!data || !data.concept_dependency_graph) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No concept dependency graph available. Upload a syllabus and parse to generate.
      </div>
    );
  }

  const activeConcept = hoveredConcept || selectedConcept;

  // Determine if a node should highlight based on active connection
  const getHighlightState = (nodeId) => {
    if (!selectedConcept) return 'normal';
    if (selectedConcept.id === nodeId) return 'active';

    const isPrereq = selectedConcept.prerequisites?.includes(nodeId);
    const isDependent = selectedConcept.dependents?.includes(nodeId);
    const isRelated = selectedConcept.related?.includes(nodeId);

    if (isPrereq) return 'prereq';
    if (isDependent) return 'dependent';
    if (isRelated) return 'related';

    return 'dimmed';
  };

  const getRelationshipColor = (type) => {
    switch (type) {
      case 'PREREQUISITE': return 'var(--color-warning)';
      case 'DEPENDS_ON': return 'var(--color-primary)';
      case 'RELATED_TO': return 'var(--color-accent)';
      case 'CONTRASTS_WITH': return 'var(--color-danger)';
      case 'EXTENDS': return 'var(--color-secondary)';
      case 'APPLIES_TO': return 'var(--color-success)';
      default: return 'var(--border-glass-hover)';
    }
  };

  // Zoom & Pan Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    setScale(Math.max(0.3, Math.min(nextScale, 3)));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
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
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', height: '100%' }}>
      {/* Dynamic SVG Visualizer */}
      <div 
        className="glass-panel" 
        style={{ 
          overflow: 'hidden', 
          padding: '0', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'rgba(0,0,0,0.15)'
        }}
      >
        {/* Floating Headers */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '12px 20px', 
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(8,7,16,0.3)',
          backdropFilter: 'blur(8px)',
          zIndex: 5
        }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>Concept Dependency Network</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.65rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} /> Prereq
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} /> Related
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }} /> Extends
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} /> Contrasts
            </span>
          </div>
        </div>

        {/* Floating Zoom Controls */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 5
        }}>
          <button onClick={zoomIn} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '1rem', width: '40px', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}>+</button>
          <button onClick={zoomOut} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '1rem', width: '40px', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}>-</button>
          <button onClick={resetZoom} className="btn btn-secondary" style={{ padding: '8px 8px', fontSize: '0.7rem', width: '40px', height: '40px', borderRadius: '8px' }}>Reset</button>
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
            {/* Transform Group */}
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              
              {/* Draw Relationships */}
              {graph.relationships?.map((rel, idx) => {
                const srcNode = conceptMap[rel.source];
                const tgtNode = conceptMap[rel.target];
                if (!srcNode || !tgtNode) return null;

                const isLinkActive = selectedConcept && (selectedConcept.id === rel.source || selectedConcept.id === rel.target);
                const color = getRelationshipColor(rel.type);

                return (
                  <line
                    key={`rel-${idx}`}
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={color}
                    strokeWidth={isLinkActive ? 2.5 : 1}
                    strokeDasharray={rel.type === 'CONTRASTS_WITH' ? '4,4' : 'none'}
                    style={{
                      opacity: isLinkActive ? 1 : (selectedConcept ? 0.05 : 0.35),
                      transition: 'var(--transition-smooth)'
                    }}
                  />
                );
              })}

              {/* Draw Concept Nodes */}
              {conceptNodes.map((node) => {
                const highlight = getHighlightState(node.id);
                let fill = 'var(--bg-secondary)';
                let border = 'var(--border-glass)';
                let size = 10;
                let textWeight = 'normal';
                let textColor = 'var(--text-primary)';

                // Category-based base configurations
                if (node.category === 'foundational') {
                  border = 'var(--color-success)';
                  size = 12;
                } else if (node.category === 'intermediate') {
                  border = 'var(--color-accent)';
                  size = 14;
                } else if (node.category === 'advanced') {
                  border = 'var(--color-primary)';
                  size = 16;
                  textWeight = '600';
                }

                // Highlight configurations
                if (highlight === 'active') {
                  fill = 'rgba(139, 92, 246, 0.3)';
                  border = 'var(--color-primary)';
                  size += 4;
                } else if (highlight === 'prereq') {
                  fill = 'rgba(245, 158, 11, 0.2)';
                  border = 'var(--color-warning)';
                  size += 2;
                } else if (highlight === 'dependent') {
                  fill = 'rgba(16, 185, 129, 0.2)';
                  border = 'var(--color-success)';
                  size += 2;
                } else if (highlight === 'related') {
                  fill = 'rgba(6, 182, 212, 0.2)';
                  border = 'var(--color-accent)';
                } else if (highlight === 'dimmed') {
                  border = 'rgba(255,255,255,0.02)';
                  textColor = 'var(--text-muted)';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedConcept(selectedConcept?.id === node.id ? null : node)}
                    onMouseEnter={() => setHoveredConcept(node)}
                    onMouseLeave={() => setHoveredConcept(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r={size}
                      fill={fill}
                      stroke={border}
                      strokeWidth="2"
                      style={{ transition: 'var(--transition-smooth)' }}
                    />
                    <text
                      x={size + 6}
                      y="4"
                      fill={textColor}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: textWeight,
                        pointerEvents: 'none',
                        fontFamily: 'var(--font-sans)',
                        transition: 'var(--transition-smooth)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}

            </g>
          </svg>
        </div>
      </div>

      {/* Concept Details Box */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {activeConcept ? (
          <div>
            <span className="badge badge-cyan" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
              {activeConcept.category} concept
            </span>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>{activeConcept.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Question Suitability tags */}
              {activeConcept.assessment_suitability?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Assessment Profile</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeConcept.assessment_suitability.map(tag => (
                      <span key={tag} className="badge badge-pink" style={{ fontSize: '0.65rem' }}>
                        {tag} questions
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites list */}
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Prerequisites</h4>
                {activeConcept.prerequisites?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeConcept.prerequisites.map(pId => {
                      const c = conceptMap[pId];
                      return (
                        <span key={pId} className="badge badge-violet" style={{ fontSize: '0.7rem' }}>
                          {c ? c.name : pId}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None (Entry point)</span>
                )}
              </div>

              {/* Dependents list */}
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dependent Concepts</h4>
                {activeConcept.dependents?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeConcept.dependents.map(dId => {
                      const c = conceptMap[dId];
                      return (
                        <span key={dId} className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                          {c ? c.name : dId}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                )}
              </div>

              {/* Contrasting concepts list */}
              {activeConcept.contrasting?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Contrasting Concepts</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeConcept.contrasting.map(cId => {
                      const c = conceptMap[cId];
                      return (
                        <span key={cId} className="badge" style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                          vs. {c ? c.name : cId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Application Domains */}
              {activeConcept.application_domains?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Application Domains</h4>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {activeConcept.application_domains.map((dom, i) => (
                      <li key={i}>{dom}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interdisciplinary Connections */}
              {activeConcept.interdisciplinary_connections?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Interdisciplinary Connections</h4>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {activeConcept.interdisciplinary_connections.map((conn, i) => (
                      <li key={i}>{conn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {onForwardToLab && (
                <button
                  className="btn btn-primary"
                  onClick={() => onForwardToLab(activeConcept.name)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: '8px' }}
                >
                  Draft Optimized Question
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <p style={{ fontSize: '0.9rem' }}>Select or hover on a concept node in the network to view dependency chains and assessment suitability.</p>
          </div>
        )}
      </div>
    </div>
  );
}
