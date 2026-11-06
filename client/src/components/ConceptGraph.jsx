import React, { useState, useMemo } from 'react';

export default function ConceptGraph({ data, onForwardToLab, onForwardToFlashcards }) {
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [hoveredConcept, setHoveredConcept] = useState(null);

  // Zoom, Pan, and Node Dragging States
  const [scale, setScale] = useState(0.92);
  const [translate, setTranslate] = useState({ x: 20, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customPositions, setCustomPositions] = useState({});
  const [draggedNode, setDraggedNode] = useState(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  const graph = useMemo(() => {
    if (!data || !data.concept_dependency_graph) return null;
    return data.concept_dependency_graph;
  }, [data]);

  const conceptNodes = useMemo(() => {
    if (!graph || !graph.concepts) return [];

    const count = graph.concepts.length;
    const centerX = 530;
    const centerY = 340;
    const radiusX = Math.max(270, Math.min(320, count * 26));
    const radiusY = Math.max(210, Math.min(240, count * 19));

    const nodes = graph.concepts.map((concept, i) => {
      // Clockwise angle starting from top (-PI/2)
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const custom = customPositions[concept.id];
      const x = custom ? custom.x : centerX + radiusX * cos;
      const y = custom ? custom.y : centerY + radiusY * sin;

      const labelWidth = Math.max(concept.name.length * 7.2 + 16, 68);
      const labelHeight = 24;

      // Smart Outward Label Placement (Zero collision layout):
      // Left side -> label points left
      // Right side -> label points right
      // Top apex -> label centered above
      // Bottom apex -> label centered below
      let placement = 'right';
      let relLabelX = 22;
      let relLabelY = -11;
      let relTextX = 30;
      let relTextY = 4;

      if (sin < -0.80) {
        placement = 'top';
        relLabelX = -labelWidth / 2;
        relLabelY = -40;
        relTextX = -labelWidth / 2 + 8;
        relTextY = -25;
      } else if (sin > 0.80) {
        placement = 'bottom';
        relLabelX = -labelWidth / 2;
        relLabelY = 20;
        relTextX = -labelWidth / 2 + 8;
        relTextY = 35;
      } else if (cos < 0) {
        placement = 'left';
        relLabelX = -(22 + labelWidth);
        relLabelY = -11;
        relTextX = -(22 + labelWidth - 8);
        relTextY = 4;
      } else {
        placement = 'right';
        relLabelX = 22;
        relLabelY = -11;
        relTextX = 30;
        relTextY = 4;
      }

      return {
        ...concept,
        x,
        y,
        angle,
        cos,
        sin,
        placement,
        labelWidth,
        labelHeight,
        relLabelX,
        relLabelY,
        relTextX,
        relTextY,
        labelOffsetX: 0,
        labelOffsetY: 0
      };
    });

    // Iterative collision prevention relaxation pass for vertical label clearance
    for (let iter = 0; iter < 12; iter++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          const ax = a.x + a.relLabelX + a.labelOffsetX;
          const ay = a.y + a.relLabelY + a.labelOffsetY;
          const bx = b.x + b.relLabelX + b.labelOffsetX;
          const by = b.y + b.relLabelY + b.labelOffsetY;

          const xOverlap = ax < bx + b.labelWidth + 6 && ax + a.labelWidth + 6 > bx;
          const yOverlap = ay < by + b.labelHeight + 6 && ay + a.labelHeight + 6 > by;

          if (xOverlap && yOverlap) {
            const dy = (by - ay) || (j > i ? 1 : -1);
            const push = 10 * Math.sign(dy);
            a.labelOffsetY -= push;
            b.labelOffsetY += push;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    return nodes;
  }, [graph, customPositions]);

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
      case 'PREREQUISITE': return '#fbbf24';   // Vibrant Amber
      case 'DEPENDS_ON': return '#38bdf8';     // Electric Sky Blue
      case 'RELATED_TO': return '#a855f7';     // Bright Neon Violet
      case 'CONTRASTS_WITH': return '#f43f5e'; // Bright Coral Red
      case 'EXTENDS': return '#00f5d4';        // Electric Teal
      case 'APPLIES_TO': return '#4ade80';     // Pulse Green
      default: return '#94a3b8';
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
    if (draggedNode) {
      const newX = (e.clientX - translate.x) / scale - nodeDragOffset.x;
      const newY = (e.clientY - translate.y) / scale - nodeDragOffset.y;
      setCustomPositions(prev => ({
        ...prev,
        [draggedNode]: { x: newX, y: newY }
      }));
      return;
    }
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const zoomIn = () => setScale(s => Math.min(s * 1.15, 3));
  const zoomOut = () => setScale(s => Math.max(s / 1.15, 0.3));
  const resetZoom = () => {
    setScale(0.92);
    setTranslate({ x: 20, y: 10 });
    setCustomPositions({});
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
          backgroundColor: 'var(--color-carbon)'
        }}
      >
        {/* Floating Headers with High-Contrast Color Legend */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 20px', 
          borderBottom: '1px solid var(--color-graphite)',
          background: 'rgba(15, 16, 17, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--color-paper)', fontWeight: '510', margin: 0 }}>
              Concept Dependency Network
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-fog)' }}>
              Interactive knowledge topology with category & dependency highlights
            </span>
          </div>

          {/* Color-Coded Point & Relationship Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.7rem', alignItems: 'center' }}>
            {/* Category Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px', borderRight: '1px solid var(--color-graphite)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-paper)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e4f222', boxShadow: '0 0 6px #e4f222' }} /> Advanced
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-paper)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7', boxShadow: '0 0 6px #a855f7' }} /> Intermediate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-paper)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00f5d4', boxShadow: '0 0 6px #00f5d4' }} /> Foundational
              </span>
            </div>

            {/* Relationship Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-mist)' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: '#fbbf24' }} /> Prereq
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-mist)' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: '#818cf8' }} /> Related
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-mist)' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: '#22d3ee' }} /> Extends
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-mist)' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: '#f87171', borderTop: '2px dashed #f87171' }} /> Contrasts
              </span>
            </div>
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
          <button onClick={zoomIn} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '1rem', width: '38px', height: '38px', borderRadius: '6px', fontWeight: '510' }}>+</button>
          <button onClick={zoomOut} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '1rem', width: '38px', height: '38px', borderRadius: '6px', fontWeight: '510' }}>-</button>
          <button onClick={resetZoom} className="btn btn-secondary" style={{ padding: '6px 4px', fontSize: '0.68rem', width: '38px', height: '38px', borderRadius: '6px' }}>Reset</button>
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
              <pattern id="concept-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="rgba(255, 255, 255, 0.08)" />
              </pattern>
            </defs>

            {/* Subtle Matrix Dot Grid Background */}
            <rect width="100%" height="100%" fill="url(#concept-grid)" pointerEvents="none" />

            {/* Transform Group */}
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              
              {/* Draw Relationships with high visibility */}
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
                    strokeWidth={isLinkActive ? 3.2 : 2.0}
                    strokeDasharray={rel.type === 'CONTRASTS_WITH' ? '6,4' : 'none'}
                    style={{
                      opacity: isLinkActive ? 1 : (selectedConcept ? 0.35 : 0.75),
                      transition: 'var(--transition-smooth)'
                    }}
                  />
                );
              })}

              {/* Draw Highly Visible, Luminous Concept Node Points */}
              {conceptNodes.map((node, idx) => {
                const highlight = getHighlightState(node.id);
                
                // Determine rich, high-contrast, vibrant point color
                const VIBRANT_PALETTE = [
                  '#00f5d4', // Electric Cyan
                  '#e4f222', // Acid Lime
                  '#a855f7', // Neon Violet
                  '#38bdf8', // Bright Sky Blue
                  '#fbbf24', // Luminous Amber
                  '#f43f5e', // Hot Coral Pink
                  '#34d399', // Mint Emerald
                  '#f472b6', // Neon Magenta
                  '#60a5fa', // Radiant Blue
                  '#fb923c', // Sunset Orange
                ];

                const cat = (node.category || '').toLowerCase();
                const name = (node.name || '').toLowerCase();
                let categoryColor = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];

                if (cat.includes('adv') || cat.includes('complex') || name.includes('ensemble') || name.includes('boost')) {
                  categoryColor = '#e4f222'; // Acid Lime
                } else if (cat.includes('inter') || cat.includes('core') || name.includes('vector') || name.includes('discriminant')) {
                  categoryColor = '#a855f7'; // Neon Violet
                } else if (cat.includes('found') || cat.includes('basic') || cat.includes('intro') || name.includes('tradeoff')) {
                  categoryColor = '#00f5d4'; // Electric Cyan
                } else if (cat.includes('cluster') || name.includes('cluster') || name.includes('kmeans') || name.includes('dbscan')) {
                  categoryColor = '#34d399'; // Mint Emerald
                } else if (cat.includes('bayes') || name.includes('bayes') || cat.includes('prob')) {
                  categoryColor = '#fbbf24'; // Luminous Amber
                } else if (name.includes('tree')) {
                  categoryColor = '#38bdf8'; // Bright Sky
                } else if (name.includes('regress') || name.includes('lasso') || name.includes('ridge')) {
                  categoryColor = '#fb923c'; // Sunset Orange
                } else if (name.includes('pca') || name.includes('component')) {
                  categoryColor = '#f472b6'; // Neon Magenta
                }

                let outerRadius = 15;
                let innerRadius = 8;
                let outerFill = `${categoryColor}33`; // 20% opacity translucent halo
                let strokeColor = categoryColor;
                let strokeWidth = 2.2;
                let coreColor = categoryColor; // Solid luminous inner center
                let textColor = '#ffffff';
                let textWeight = '600';
                let opacity = 1;

                // Highlight states when user clicks/focuses a node
                if (highlight === 'active') {
                  outerFill = `${categoryColor}55`;
                  strokeColor = '#ffffff';
                  strokeWidth = 3.5;
                  outerRadius = 20;
                  innerRadius = 10;
                  textColor = '#ffffff';
                  textWeight = '700';
                } else if (highlight === 'prereq') {
                  coreColor = '#fbbf24';
                  strokeColor = '#fbbf24';
                  outerFill = 'rgba(251, 191, 36, 0.45)';
                  strokeWidth = 3;
                  outerRadius = 18;
                  innerRadius = 9;
                } else if (highlight === 'dependent') {
                  coreColor = '#4ade80';
                  strokeColor = '#4ade80';
                  outerFill = 'rgba(74, 222, 128, 0.45)';
                  strokeWidth = 3;
                  outerRadius = 18;
                  innerRadius = 9;
                } else if (highlight === 'related') {
                  coreColor = '#a855f7';
                  strokeColor = '#a855f7';
                  outerFill = 'rgba(168, 85, 247, 0.45)';
                  strokeWidth = 2.5;
                  outerRadius = 17;
                } else if (highlight === 'dimmed') {
                  opacity = 0.55; // Keep visibly legible, do not fade out to invisibility
                  textColor = 'var(--color-mist)';
                }

                const lx = node.relLabelX + node.labelOffsetX;
                const ly = node.relLabelY + node.labelOffsetY;
                const tx = node.relTextX + node.labelOffsetX;
                const ty = node.relTextY + node.labelOffsetY;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setDraggedNode(node.id);
                      setNodeDragOffset({
                        x: (e.clientX - translate.x) / scale - node.x,
                        y: (e.clientY - translate.y) / scale - node.y
                      });
                    }}
                    onClick={() => setSelectedConcept(selectedConcept?.id === node.id ? null : node)}
                    onMouseEnter={() => setHoveredConcept(node)}
                    onMouseLeave={() => setHoveredConcept(null)}
                    style={{ 
                      cursor: draggedNode === node.id ? 'grabbing' : 'grab', 
                      opacity, 
                      transition: draggedNode === node.id ? 'none' : 'var(--transition-smooth)' 
                    }}
                  >
                    {/* Outer translucent halo ring with luminous glow */}
                    <circle
                      r={outerRadius}
                      fill={outerFill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                    
                    {/* Inner SOLID glowing colored point - 100% visible on pitch black background */}
                    <circle
                      r={innerRadius}
                      fill={coreColor}
                    />

                    {/* Specular center dot for high-tech radar beacon aesthetic */}
                    <circle
                      r={innerRadius > 8 ? 3.5 : 2.5}
                      fill="#ffffff"
                    />

                    {/* Non-overlapping High-Contrast Label Badge Background */}
                    <rect
                      x={lx}
                      y={ly}
                      width={node.labelWidth}
                      height="22"
                      rx="5"
                      fill="rgba(15, 16, 17, 0.90)"
                      stroke={strokeColor}
                      strokeWidth="1.2"
                      strokeOpacity="0.5"
                    />

                    {/* Node text label with guaranteed clearance */}
                    <text
                      x={tx}
                      y={ty}
                      fill={textColor}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: textWeight,
                        pointerEvents: 'none',
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '-0.010em'
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

              {onForwardToFlashcards && (
                <button
                  className="btn btn-secondary"
                  onClick={() => onForwardToFlashcards(activeConcept.name)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: '6px', color: 'var(--color-primary)' }}
                >
                  🗂️ Study Topic Flashcards
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
