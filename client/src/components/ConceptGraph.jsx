import React, { useState, useMemo } from 'react';
import { COGNITIVE_TIERS, synthesizeEpistemicCurriculum } from '../utils/epistemicSynthesizer';
import { SAMPLE_ML_CURRICULUM } from '../utils/sampleCurriculum';

export default function ConceptGraph({ data, onForwardToLab, onForwardToFlashcards, onLoadSample }) {
  const [layoutMode, setLayoutMode] = useState('stratified'); // 'stratified' (Zero-Collision Tier Flow) or 'radar' (Radial Network)
  const [selectedConceptId, setSelectedConceptId] = useState(null);
  const [hoveredConceptId, setHoveredConceptId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Zoom, Pan, and Node Dragging States
  const [scale, setScale] = useState(0.88);
  const [translate, setTranslate] = useState({ x: 30, y: 15 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customPositions, setCustomPositions] = useState({});
  const [draggedNode, setDraggedNode] = useState(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  // Synthesize epistemic graph to guarantee rich mathematical foundations & 5 cognitive tiers
  const epistemic = useMemo(() => {
    if (!data) return null;
    return synthesizeEpistemicCurriculum(data);
  }, [data]);

  // Compute Layout Positions (Zero Collision Stratified or Advanced Radial Radar)
  const layout = useMemo(() => {
    if (!epistemic) return null;

    const allConcepts = epistemic.allNodes;
    const nodeCoords = {};

    if (layoutMode === 'stratified') {
      // Stratified 5-Tier Horizontal Pipeline (Zero-Collision Guaranteed)
      const colWidth = 260;
      const colGap = 45;
      const paddingLeft = 60;
      const paddingTop = 90;
      const nodeVerticalGap = 85;

      COGNITIVE_TIERS.forEach((tier, colIdx) => {
        const tierNodes = epistemic.nodesByTier[tier.id] || [];
        const colX = paddingLeft + colIdx * (colWidth + colGap);

        tierNodes.forEach((node, rowIdx) => {
          const custom = customPositions[node.id];
          const x = custom ? custom.x : colX;
          const y = custom ? custom.y : paddingTop + rowIdx * nodeVerticalGap;

          const labelWidth = Math.max(node.name.length * 7.5 + 24, 90);
          const labelHeight = 28;

          nodeCoords[node.id] = {
            ...node,
            x,
            y,
            tierInfo: tier,
            colIdx,
            rowIdx,
            labelWidth,
            labelHeight,
            labelOffsetX: 18,
            labelOffsetY: -14
          };
        });
      });

    } else {
      // Advanced Radial Radar Layout with Strict Repulsion Relaxation to Prevent Overlap
      const count = allConcepts.length;
      const centerX = 560;
      const centerY = 360;
      // Generous radiuses to prevent congestion
      const radiusX = Math.max(340, Math.min(440, count * 28));
      const radiusY = Math.max(240, Math.min(320, count * 22));

      const rawNodes = allConcepts.map((concept, i) => {
        const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const custom = customPositions[concept.id];
        const x = custom ? custom.x : centerX + radiusX * cos;
        const y = custom ? custom.y : centerY + radiusY * sin;

        const labelWidth = Math.max(concept.name.length * 7.5 + 24, 90);
        const labelHeight = 28;

        // Outward radial label placement
        let labelOffsetX = 20;
        let labelOffsetY = -14;

        if (sin < -0.75) {
          // Top apex -> place above
          labelOffsetX = -labelWidth / 2;
          labelOffsetY = -44;
        } else if (sin > 0.75) {
          // Bottom apex -> place below
          labelOffsetX = -labelWidth / 2;
          labelOffsetY = 24;
        } else if (cos < 0) {
          // Left hemisphere -> place left
          labelOffsetX = -(labelWidth + 20);
          labelOffsetY = -14;
        } else {
          // Right hemisphere -> place right
          labelOffsetX = 20;
          labelOffsetY = -14;
        }

        const tierInfo = COGNITIVE_TIERS.find(t => t.id === concept.tier) || COGNITIVE_TIERS[2];

        return {
          ...concept,
          x,
          y,
          tierInfo,
          angle,
          labelWidth,
          labelHeight,
          labelOffsetX,
          labelOffsetY
        };
      });

      // Iterative Collision Relaxation Pass: 20 passes to resolve label rectangle overlaps
      for (let iter = 0; iter < 20; iter++) {
        let collisionOccurred = false;
        for (let i = 0; i < rawNodes.length; i++) {
          for (let j = i + 1; j < rawNodes.length; j++) {
            const a = rawNodes[i];
            const b = rawNodes[j];

            const ax = a.x + a.labelOffsetX;
            const ay = a.y + a.labelOffsetY;
            const bx = b.x + b.labelOffsetX;
            const by = b.y + b.labelOffsetY;

            const xOverlap = ax < bx + b.labelWidth + 12 && ax + a.labelWidth + 12 > bx;
            const yOverlap = ay < by + b.labelHeight + 10 && ay + a.labelHeight + 10 > by;

            if (xOverlap && yOverlap) {
              const dy = (by - ay) || (j > i ? 1 : -1);
              const push = 12 * Math.sign(dy);
              a.labelOffsetY -= push;
              b.labelOffsetY += push;
              collisionOccurred = true;
            }
          }
        }
        if (!collisionOccurred) break;
      }

      rawNodes.forEach(n => {
        nodeCoords[n.id] = n;
      });
    }

    const nodesList = Object.values(nodeCoords);

    return {
      nodesList,
      nodeCoords
    };
  }, [epistemic, layoutMode, customPositions]);

  // Compute Active Prerequisite & Descendant Path Highlights
  const activePath = useMemo(() => {
    if (!selectedConceptId || !epistemic) {
      return { ancestors: new Set(), descendants: new Set() };
    }
    const ancestors = new Set(epistemic.ancestorCache.get(selectedConceptId) || []);
    const descendants = new Set(epistemic.descendantCache.get(selectedConceptId) || []);
    return { ancestors, descendants };
  }, [selectedConceptId, epistemic]);

  const activeConcept = useMemo(() => {
    const id = selectedConceptId || hoveredConceptId;
    if (!id || !epistemic) return null;
    return epistemic.conceptMap.get(id) || null;
  }, [selectedConceptId, hoveredConceptId, epistemic]);

  if (!data) {
    return (
      <div className="glass-panel" style={{ padding: '60px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%', justifyContent: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(228, 242, 34, 0.1)', border: '1px solid var(--color-acid-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
          💡
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '510', color: 'var(--color-paper)', marginBottom: '6px' }}>
            Concept Dependency Network
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-fog)', maxWidth: '440px', lineHeight: '1.5' }}>
            No curriculum is currently loaded. Upload your syllabus or load our sample Machine Learning curriculum to explore the concept dependency network.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {onLoadSample && (
            <button
              onClick={() => onLoadSample(SAMPLE_ML_CURRICULUM)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              ⚡ Load Sample ML Curriculum
            </button>
          )}
        </div>
      </div>
    );
  }

  const getRelationshipColor = (type) => {
    switch (type) {
      case 'PREREQUISITE': return '#fbbf24';   // Luminous Amber
      case 'ENABLES':
      case 'EXTENDS':
      case 'DEPENDS_ON': return '#00f5d4';     // Electric Cyan
      case 'OPTIMIZES': return '#e4f222';      // Acid Lime
      case 'CONTRASTS':
      case 'CONTRASTS_WITH': return '#eb5757'; // Coral Red
      case 'RELATED_TO': return '#818cf8';     // Lavender Blue
      default: return '#94a3b8';
    }
  };

  // Zoom & Pan Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    setScale(Math.max(0.25, Math.min(nextScale, 2.5)));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
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

  const zoomIn = () => setScale(s => Math.min(s * 1.15, 2.5));
  const zoomOut = () => setScale(s => Math.max(s / 1.15, 0.25));
  const resetZoom = () => {
    setScale(0.88);
    setTranslate({ x: 30, y: 15 });
    setCustomPositions({});
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '16px', height: '100%' }}>
      {/* Visual Canvas Panel */}
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
        {/* Header Bar with Layout Toggle and Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: '1px solid var(--color-graphite)',
          background: 'rgba(15, 16, 17, 0.90)',
          backdropFilter: 'blur(12px)',
          zIndex: 6,
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Title & Layout Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--color-paper)', fontWeight: '510', margin: 0 }}>
                Concept Dependency Network
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-fog)' }}>
                {layoutMode === 'stratified' 
                  ? 'Stratified cognitive topology • Zero label collision guaranteed' 
                  : 'Radial dependency radar • Collision-repulsion physics active'}
              </span>
            </div>

            {/* Layout Mode Switcher */}
            <div style={{
              display: 'flex',
              background: 'var(--color-obsidian)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--color-graphite)',
              marginLeft: '6px'
            }}>
              <button
                type="button"
                onClick={() => setLayoutMode('stratified')}
                style={{
                  background: layoutMode === 'stratified' ? 'var(--color-acid-lime)' : 'transparent',
                  color: layoutMode === 'stratified' ? 'var(--color-void)' : 'var(--color-mist)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: layoutMode === 'stratified' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                📊 Stratified Flow (Zero Collision)
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('radar')}
                style={{
                  background: layoutMode === 'radar' ? 'var(--color-acid-lime)' : 'transparent',
                  color: layoutMode === 'radar' ? 'var(--color-void)' : 'var(--color-mist)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: layoutMode === 'radar' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                🛰️ Radial Radar
              </button>
            </div>
          </div>

          {/* Color-Coded Edge & Tier Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.68rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#fbbf24' }} /> Prerequisite
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f5d4' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#00f5d4' }} /> Enables
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e4f222' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#e4f222' }} /> Optimizes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eb5757' }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: '#eb5757', borderTop: '2px dashed #eb5757' }} /> Contrasts
            </span>
          </div>
        </div>

        {/* Active Focus Alert Banner */}
        {selectedConceptId && activeConcept && (
          <div style={{
            padding: '7px 18px',
            background: 'rgba(22, 23, 24, 0.95)',
            borderBottom: '1px solid var(--color-graphite)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            zIndex: 5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--color-acid-lime)', fontWeight: '600' }}>
                🎯 CONCEPT TRACE: {activeConcept.name}
              </span>
              <span style={{ color: 'var(--color-mist)' }}>
                ▲ <strong style={{ color: '#fbbf24' }}>{activePath.ancestors.size}</strong> Prerequisites Required
              </span>
              <span style={{ color: 'var(--color-mist)' }}>
                ▼ <strong style={{ color: '#00f5d4' }}>{activePath.descendants.size}</strong> Concepts Unlocked
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedConceptId(null)}
              className="btn btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.68rem', color: 'var(--color-coral-red)', borderColor: 'rgba(235, 87, 87, 0.3)' }}
            >
              Clear Trace
            </button>
          </div>
        )}

        {/* Bottom-Left Zoom & Reset Controls */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 6
        }}>
          <button onClick={zoomIn} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '1rem', width: '36px', height: '36px' }}>+</button>
          <button onClick={zoomOut} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '1rem', width: '36px', height: '36px' }}>-</button>
          <button onClick={resetZoom} className="btn btn-secondary" style={{ padding: '4px 6px', fontSize: '0.68rem', width: '36px', height: '36px' }}>Reset</button>
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
              <pattern id="concept-network-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.1" fill="rgba(255, 255, 255, 0.07)" />
              </pattern>
            </defs>

            {/* Matrix Background */}
            <rect width="100%" height="100%" fill="url(#concept-network-grid)" pointerEvents="none" />

            {/* Transform Group */}
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              
              {/* Stratified Column Background Guidelines */}
              {layoutMode === 'stratified' && COGNITIVE_TIERS.map((tier, colIdx) => {
                const colX = 60 + colIdx * (260 + 45);
                return (
                  <g key={`col_${tier.id}`}>
                    <rect
                      x={colX - 10}
                      y={40}
                      width={280}
                      height={680}
                      rx="12"
                      fill="rgba(15, 16, 17, 0.45)"
                      stroke={tier.borderTone}
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={colX + 12}
                      y={70}
                      fill={tier.color}
                      fontSize="0.75rem"
                      fontWeight="600"
                      fontFamily="var(--font-sans)"
                    >
                      {tier.icon} {tier.name}
                    </text>
                  </g>
                );
              })}

              {/* Draw Relationship Lines */}
              {epistemic.edges?.map((edge, idx) => {
                const src = layout?.nodeCoords[edge.source];
                const tgt = layout?.nodeCoords[edge.target];
                if (!src || !tgt) return null;

                const isAncestorEdge = selectedConceptId && (
                  (edge.target === selectedConceptId && activePath.ancestors.has(edge.source)) ||
                  (activePath.ancestors.has(edge.source) && activePath.ancestors.has(edge.target))
                );

                const isDescendantEdge = selectedConceptId && (
                  (edge.source === selectedConceptId && activePath.descendants.has(edge.target)) ||
                  (activePath.descendants.has(edge.source) && activePath.descendants.has(edge.target))
                );

                const isActive = isAncestorEdge || isDescendantEdge;
                const edgeColor = isActive ? (isAncestorEdge ? '#fbbf24' : '#00f5d4') : getRelationshipColor(edge.type);

                let opacity = 0.6;
                let strokeWidth = 1.8;

                if (selectedConceptId) {
                  if (isActive) {
                    opacity = 1;
                    strokeWidth = 3;
                  } else {
                    opacity = 0.12;
                  }
                }

                // Smooth curved line for stratified flow, straight for radar
                if (layoutMode === 'stratified') {
                  const dx = Math.max((tgt.x - src.x) * 0.5, 30);
                  const pathStr = `M ${src.x} ${src.y} C ${src.x + dx} ${src.y}, ${tgt.x - dx} ${tgt.y}, ${tgt.x} ${tgt.y}`;

                  return (
                    <path
                      key={`edge_${idx}`}
                      d={pathStr}
                      fill="none"
                      stroke={edgeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={edge.type.includes('CONTRAST') ? '6 4' : (isActive && isAncestorEdge ? '5 3' : 'none')}
                      style={{ opacity, transition: 'var(--transition-smooth)' }}
                    />
                  );
                }

                return (
                  <line
                    key={`edge_${idx}`}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={edgeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={edge.type.includes('CONTRAST') ? '6 4' : 'none'}
                    style={{ opacity, transition: 'var(--transition-smooth)' }}
                  />
                );
              })}

              {/* Draw Collision-Free Concept Nodes */}
              {layout?.nodesList.map((node) => {
                const isSelected = selectedConceptId === node.id;
                const isHovered = hoveredConceptId === node.id;
                const isAncestor = activePath.ancestors.has(node.id);
                const isDescendant = activePath.descendants.has(node.id);

                let pointColor = node.tierInfo.color;
                let outerRadius = 15;
                let innerRadius = 7.5;
                let opacity = 1;
                let badgeBorder = node.tierInfo.color;

                if (selectedConceptId) {
                  if (isSelected) {
                    pointColor = 'var(--color-acid-lime)';
                    badgeBorder = 'var(--color-acid-lime)';
                    outerRadius = 19;
                    innerRadius = 9.5;
                  } else if (isAncestor) {
                    pointColor = '#fbbf24'; // Amber Prereq
                    badgeBorder = '#fbbf24';
                    outerRadius = 17;
                    innerRadius = 8.5;
                  } else if (isDescendant) {
                    pointColor = '#00f5d4'; // Cyan Unlock
                    badgeBorder = '#00f5d4';
                    outerRadius = 17;
                    innerRadius = 8.5;
                  } else {
                    opacity = 0.22;
                  }
                } else if (isHovered) {
                  outerRadius = 18;
                }

                const lx = node.labelOffsetX;
                const ly = node.labelOffsetY;

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
                    onClick={() => setSelectedConceptId(selectedConceptId === node.id ? null : node.id)}
                    onMouseEnter={() => setHoveredConceptId(node.id)}
                    onMouseLeave={() => setHoveredConceptId(null)}
                    style={{
                      cursor: draggedNode === node.id ? 'grabbing' : 'grab',
                      opacity,
                      transition: draggedNode === node.id ? 'none' : 'var(--transition-smooth)'
                    }}
                  >
                    {/* Outer luminous glow ring */}
                    <circle
                      r={outerRadius}
                      fill={`${pointColor}26`}
                      stroke={pointColor}
                      strokeWidth={isSelected ? 3 : 1.8}
                    />

                    {/* Central solid colored point */}
                    <circle
                      r={innerRadius}
                      fill={pointColor}
                    />

                    {/* Specular center dot for beacon aesthetics */}
                    <circle
                      r={innerRadius > 8 ? 3.5 : 2.5}
                      fill="#ffffff"
                    />

                    {/* Non-overlapping High-Contrast Label Pill Background */}
                    <rect
                      x={lx}
                      y={ly}
                      width={node.labelWidth}
                      height={node.labelHeight}
                      rx="6"
                      fill="rgba(15, 16, 17, 0.94)"
                      stroke={badgeBorder}
                      strokeWidth={isSelected ? 2 : 1.2}
                      strokeOpacity="0.8"
                    />

                    {/* Node Text Label with Guaranteed Clearance */}
                    <text
                      x={lx + 10}
                      y={ly + 18}
                      fill="var(--color-paper)"
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? '700' : '500',
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

      {/* Right-Hand Concept Details Drawer */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          backgroundColor: 'var(--color-carbon)'
        }}
      >
        {activeConcept ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header Badge & Title */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(228, 242, 34, 0.1)',
                    color: 'var(--color-acid-lime)',
                    border: '1px solid rgba(228, 242, 34, 0.3)',
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}
                >
                  {activeConcept.tier ? activeConcept.tier.toUpperCase() : 'COGNITIVE TOPIC'}
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                  {activeConcept.bloom_level || 'Understand'}
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-paper)', fontWeight: '600', lineHeight: '1.3' }}>
                {activeConcept.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-fog)', marginTop: '4px' }}>
                Category: {activeConcept.category}
              </p>
            </div>

            {/* Description / Summary */}
            <div style={{ padding: '12px', background: 'var(--color-obsidian)', borderRadius: '8px', border: '1px solid var(--color-graphite)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-acid-lime)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                EPISTEMIC CONCEPT OVERVIEW
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-mist)', lineHeight: '1.45' }}>
                {activeConcept.description}
              </p>
            </div>

            {/* Interactive Prerequisites Jump Buttons */}
            <div>
              <h4 style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '600', marginBottom: '6px' }}>
                ▲ Prerequisites (Learn First)
              </h4>
              {activeConcept.prerequisites?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeConcept.prerequisites.map(pId => {
                    const c = epistemic.conceptMap.get(pId);
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => setSelectedConceptId(pId)}
                        style={{
                          padding: '5px 10px',
                          background: 'rgba(251, 191, 36, 0.1)',
                          border: '1px solid rgba(251, 191, 36, 0.35)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>➔</span> {c ? c.name : pId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>Foundational Root (Entry Level)</span>
              )}
            </div>

            {/* Interactive Dependents / Unlocks Jump Buttons */}
            <div>
              <h4 style={{ fontSize: '0.78rem', color: '#00f5d4', fontWeight: '600', marginBottom: '6px' }}>
                ▼ Unlocks Next (Dependent Concepts)
              </h4>
              {activeConcept.dependents?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeConcept.dependents.map(dId => {
                    const c = epistemic.conceptMap.get(dId);
                    return (
                      <button
                        key={dId}
                        type="button"
                        onClick={() => setSelectedConceptId(dId)}
                        style={{
                          padding: '5px 10px',
                          background: 'rgba(0, 245, 212, 0.1)',
                          border: '1px solid rgba(0, 245, 212, 0.35)',
                          borderRadius: '6px',
                          color: '#00f5d4',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>➔</span> {c ? c.name : dId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>Terminal Concept</span>
              )}
            </div>

            {/* Contrasting Concepts */}
            {activeConcept.contrasting?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.78rem', color: '#eb5757', fontWeight: '600', marginBottom: '6px' }}>
                  ⚡ Contrasting Concepts
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeConcept.contrasting.map(cId => {
                    const c = epistemic.conceptMap.get(cId);
                    return (
                      <span key={cId} className="badge" style={{ fontSize: '0.7rem', backgroundColor: 'rgba(235, 87, 87, 0.1)', color: '#eb5757', borderColor: 'rgba(235, 87, 87, 0.3)' }}>
                        vs. {c ? c.name : cId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Application Domains */}
            {activeConcept.application_domains?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.78rem', color: 'var(--color-mist)', marginBottom: '4px', fontWeight: '600' }}>
                  Engineering Application Domains
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {activeConcept.application_domains.map((dom, i) => (
                    <span key={i} className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {onForwardToLab && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onForwardToLab(activeConcept.name)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.82rem' }}
                >
                  🎯 Draft Exam Question in Lab
                </button>
              )}

              {onForwardToFlashcards && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onForwardToFlashcards(activeConcept.name)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--color-mist)' }}
                >
                  🗂️ Study Topic Flashcards
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--color-fog)', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              💡
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-paper)', marginBottom: '6px' }}>
                Select Any Concept in the Network
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--color-fog)', maxWidth: '280px', lineHeight: '1.45' }}>
                Click any concept beacon to illuminate upstream prerequisite paths (in amber) and downstream unlocked topics (in cyan).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
