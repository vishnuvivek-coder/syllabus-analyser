import React, { useState, useMemo, useRef } from 'react';
import { COGNITIVE_TIERS, synthesizeEpistemicCurriculum } from '../utils/epistemicSynthesizer';
import { SAMPLE_ML_CURRICULUM } from '../utils/sampleCurriculum';

export default function KnowledgeGraph({ data, onForwardToLab, onForwardToFlashcards, onLoadSample }) {
  const [viewMode, setViewMode] = useState('layers'); // 'layers' (Epistemic 5-Tier) or 'roadmap' (Module Units)
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('all');

  // Zoom and Pan States
  const [scale, setScale] = useState(0.85);
  const [translate, setTranslate] = useState({ x: 30, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // Synthesize epistemic knowledge structure from raw syllabus data
  const epistemicData = useMemo(() => {
    if (!data) return null;
    return synthesizeEpistemicCurriculum(data);
  }, [data]);

  // Compute Epistemic Layers Layout (5 Vertical Cognitive Lanes)
  const layersLayout = useMemo(() => {
    if (!epistemicData) return null;

    const laneWidth = 260;
    const laneGap = 36;
    const paddingLeft = 50;
    const paddingTop = 120;
    const cardHeight = 110;
    const cardGap = 20;

    const lanes = COGNITIVE_TIERS.map((tier, laneIdx) => {
      const x = paddingLeft + laneIdx * (laneWidth + laneGap);
      const rawNodes = epistemicData.nodesByTier[tier.id] || [];

      // Filter by search query if any
      const nodes = rawNodes.filter(n => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return n.name.toLowerCase().includes(q) || (n.important_concepts || []).some(c => c.toLowerCase().includes(q));
      });

      const positionedNodes = nodes.map((node, nodeIdx) => {
        const y = paddingTop + nodeIdx * (cardHeight + cardGap);
        return {
          ...node,
          x,
          y,
          width: laneWidth,
          height: cardHeight,
          tierInfo: tier,
          laneIdx
        };
      });

      return {
        ...tier,
        x,
        y: paddingTop - 80,
        width: laneWidth,
        nodes: positionedNodes,
        totalHeight: Math.max(positionedNodes.length * (cardHeight + cardGap) + 140, 600)
      };
    });

    // Node lookup map
    const nodeCoords = {};
    const allPositionedNodes = [];
    let maxLaneHeight = 600;

    lanes.forEach(lane => {
      if (lane.totalHeight > maxLaneHeight) maxLaneHeight = lane.totalHeight;
      lane.nodes.forEach(n => {
        nodeCoords[n.id] = n;
        allPositionedNodes.push(n);
      });
    });

    // Compute Bezier Connection Curves between prerequisites
    const connections = [];
    epistemicData.edges.forEach((edge, idx) => {
      const src = nodeCoords[edge.source];
      const tgt = nodeCoords[edge.target];
      if (src && tgt) {
        connections.push({
          id: `edge_${idx}`,
          source: src,
          target: tgt,
          type: edge.type,
          explanation: edge.explanation
        });
      }
    });

    const totalWidth = paddingLeft + lanes.length * (laneWidth + laneGap) + 60;
    const totalHeight = paddingTop + maxLaneHeight + 100;

    return {
      lanes,
      nodes: allPositionedNodes,
      nodeCoords,
      connections,
      totalWidth,
      totalHeight
    };
  }, [epistemicData, searchQuery]);

  // Compute Syllabus Module Roadmap Layout (Alternative View)
  const roadmapLayout = useMemo(() => {
    if (!epistemicData || !epistemicData.modules) return null;

    const colWidth = 240;
    const rowHeight = 72;
    const paddingLeft = 60;
    const paddingTop = 60;

    const nodes = [];
    const connections = [];
    const nodeCoords = {};

    // Subject Root
    const subjectNode = {
      id: 'subject_root',
      label: epistemicData.subjectName,
      x: paddingLeft,
      y: 200,
      type: 'subject',
      width: 170,
      height: 60
    };
    nodes.push(subjectNode);

    let topicCounter = 0;
    const moduleNodes = [];

    epistemicData.modules.forEach((mod) => {
      const modTopicsCount = mod.topics ? mod.topics.length : 0;
      const modNode = {
        id: mod.module_id,
        label: mod.module_name,
        type: 'module',
        x: paddingLeft + colWidth * 1.1,
        topicsCount: modTopicsCount,
        startIndex: topicCounter,
        width: 180,
        height: 54,
        data: mod
      };
      topicCounter += Math.max(modTopicsCount, 1);
      moduleNodes.push(modNode);
    });

    const totalHeight = Math.max(topicCounter * rowHeight + paddingTop * 2, 600);
    subjectNode.y = totalHeight / 2;

    let currentTopicIndex = 0;

    epistemicData.modules.forEach((mod, modIdx) => {
      const modNode = moduleNodes[modIdx];
      const topics = mod.topics || [];
      const startY = paddingTop + currentTopicIndex * rowHeight;
      const endY = paddingTop + (currentTopicIndex + Math.max(topics.length - 1, 0)) * rowHeight;
      modNode.y = (startY + endY) / 2;
      nodes.push(modNode);
      nodeCoords[modNode.id] = modNode;

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
          x: paddingLeft + colWidth * 2.3,
          y: topicY,
          width: 220,
          height: 48,
          data: epistemicData.conceptMap.get(topic.topic_id) || topic,
          moduleName: mod.module_name
        };
        nodes.push(topicNode);
        nodeCoords[topic.topic_id] = topicNode;

        connections.push({
          from: modNode,
          to: topicNode,
          color: 'var(--border-subtle)'
        });
      });

      currentTopicIndex += Math.max(topics.length, 1);
    });

    return {
      nodes,
      connections,
      nodeCoords,
      totalHeight,
      totalWidth: paddingLeft + colWidth * 3.8
    };
  }, [epistemicData]);

  // Active Selected Node & Epistemic Path Info
  const activeNode = useMemo(() => {
    const id = selectedNodeId || hoveredNodeId;
    if (!id || !epistemicData) return null;
    return epistemicData.conceptMap.get(id) || null;
  }, [selectedNodeId, hoveredNodeId, epistemicData]);

  // Compute active upstream prerequisites (ancestors) & downstream unlocks (descendants)
  const pathHighlightInfo = useMemo(() => {
    if (!selectedNodeId || !epistemicData) {
      return { ancestors: new Set(), descendants: new Set(), activeEdgeIds: new Set() };
    }

    const ancestors = new Set(epistemicData.ancestorCache.get(selectedNodeId) || []);
    const descendants = new Set(epistemicData.descendantCache.get(selectedNodeId) || []);

    const activeEdgeIds = new Set();
    if (layersLayout) {
      layersLayout.connections.forEach(conn => {
        if (
          (conn.source.id === selectedNodeId && descendants.has(conn.target.id)) ||
          (conn.target.id === selectedNodeId && ancestors.has(conn.source.id)) ||
          (ancestors.has(conn.source.id) && (ancestors.has(conn.target.id) || conn.target.id === selectedNodeId))
        ) {
          activeEdgeIds.add(conn.id);
        }
      });
    }

    return { ancestors, descendants, activeEdgeIds };
  }, [selectedNodeId, epistemicData, layersLayout]);

  // Fallback Empty State
  if (!data) {
    return (
      <div className="glass-panel" style={{ padding: '60px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%', justifyContent: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(228, 242, 34, 0.1)', border: '1px solid var(--color-acid-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
          🧠
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '510', color: 'var(--color-paper)', marginBottom: '6px' }}>
            Interactive Epistemic Knowledge Map
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-fog)', maxWidth: '440px', lineHeight: '1.5' }}>
            No curriculum is currently loaded. Upload your syllabus document or immediately load our pre-configured Machine Learning (R24) curriculum to explore the 5 cognitive mastery tiers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {onLoadSample && (
            <button
              onClick={() => onLoadSample(SAMPLE_ML_CURRICULUM)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              ⚡ Load Sample ML (R24) Curriculum
            </button>
          )}
        </div>
      </div>
    );
  }

  // Zoom and Pan Handlers
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
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(s => Math.min(s * 1.15, 2.5));
  const zoomOut = () => setScale(s => Math.max(s / 1.15, 0.25));
  const resetZoom = () => {
    setScale(0.85);
    setTranslate({ x: 30, y: 20 });
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
          backgroundColor: 'var(--color-void)'
        }}
        ref={containerRef}
      >
        {/* Top Control & Perspective Toolbar */}
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
          {/* Title & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--color-paper)', fontWeight: '510', margin: 0 }}>
                  Epistemic Knowledge Map
                </h3>
                <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                  Pedagogical Mastery
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-fog)' }}>
                {viewMode === 'layers' 
                  ? 'Domain cognitive ontology (5 Tiers) • Foundational math & authentic prerequisite flows' 
                  : 'Administrative syllabus roadmap • Module units & cross-unit dependencies'}
              </span>
            </div>

            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--color-obsidian)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--color-graphite)',
              marginLeft: '8px'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('layers')}
                style={{
                  background: viewMode === 'layers' ? 'var(--color-acid-lime)' : 'transparent',
                  color: viewMode === 'layers' ? 'var(--color-void)' : 'var(--color-mist)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: viewMode === 'layers' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                🧠 Cognitive Layers (5 Tiers)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('roadmap')}
                style={{
                  background: viewMode === 'roadmap' ? 'var(--color-acid-lime)' : 'transparent',
                  color: viewMode === 'roadmap' ? 'var(--color-void)' : 'var(--color-mist)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: viewMode === 'roadmap' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                📑 Syllabus Roadmap
              </button>
            </div>
          </div>

          {/* Search Bar & Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search topics & prerequisites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'var(--color-obsidian)',
                  border: '1px solid var(--color-graphite)',
                  borderRadius: '6px',
                  padding: '5px 10px 5px 28px',
                  fontSize: '0.74rem',
                  color: 'var(--color-paper)',
                  outline: 'none',
                  width: '190px'
                }}
              />
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-fog)' }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-fog)', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            {selectedNodeId && (
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem', color: 'var(--color-coral-red)', borderColor: 'rgba(235, 87, 87, 0.3)' }}
                title="Clear selected node filter"
              >
                Clear Focus
              </button>
            )}
          </div>
        </div>

        {/* Active Path Illumination Notification Bar */}
        {selectedNodeId && activeNode && (
          <div style={{
            padding: '8px 18px',
            background: 'rgba(22, 23, 24, 0.95)',
            borderBottom: '1px solid var(--color-graphite)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            zIndex: 5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--color-acid-lime)', fontWeight: '600' }}>
                🎯 ACTIVE PATH FOCUS: {activeNode.name}
              </span>
              <span style={{ color: 'var(--color-mist)' }}>
                • <strong style={{ color: '#fbbf24' }}>{pathHighlightInfo.ancestors.size}</strong> Upstream Prerequisites Required
              </span>
              <span style={{ color: 'var(--color-mist)' }}>
                • <strong style={{ color: '#00f5d4' }}>{pathHighlightInfo.descendants.size}</strong> Downstream Topics Unlocked
              </span>
            </div>
            <span style={{ color: 'var(--color-fog)', fontSize: '0.7rem' }}>
              Golden Amber lines = Ancestor Prereqs | Emerald Cyan lines = Unlocked Future Topics
            </span>
          </div>
        )}

        {/* Bottom-Left Zoom & Pan Controls */}
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

        {/* SVG Visualization Canvas */}
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
              {/* Matrix Background Grid */}
              <pattern id="epistemic-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.1" fill="rgba(255, 255, 255, 0.06)" />
              </pattern>

              {/* Arrow Markers for Prerequisite Links */}
              <marker id="arrow-prereq" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24" />
              </marker>
              <marker id="arrow-unlock" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00f5d4" />
              </marker>
              <marker id="arrow-normal" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(138, 143, 152, 0.4)" />
              </marker>
            </defs>

            {/* Matrix Dot Background */}
            <rect width="100%" height="100%" fill="url(#epistemic-grid)" pointerEvents="none" />

            {/* Transform Group for Pan & Zoom */}
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              
              {/* VIEW MODE 1: EPISTEMIC COGNITIVE LAYERS (5 TIERS) */}
              {viewMode === 'layers' && layersLayout && (
                <>
                  {/* Tier Lane Background Strata & Headers */}
                  {layersLayout.lanes.map((lane) => (
                    <g key={lane.id}>
                      {/* Lane Vertical Glow Column */}
                      <rect
                        x={lane.x - 12}
                        y={lane.y - 10}
                        width={lane.width + 24}
                        height={lane.totalHeight + 100}
                        rx="14"
                        fill="rgba(15, 16, 17, 0.55)"
                        stroke={lane.borderTone}
                        strokeWidth="1"
                        strokeDasharray="4 6"
                      />

                      {/* Lane Header Card */}
                      <g transform={`translate(${lane.x}, ${lane.y})`}>
                        <rect
                          x="0"
                          y="0"
                          width={lane.width}
                          height="74"
                          rx="10"
                          fill="var(--color-carbon)"
                          stroke={lane.borderTone}
                          strokeWidth="1.2"
                        />
                        {/* Lane Icon & Title */}
                        <text x="14" y="24" fontSize="1.1rem">
                          {lane.icon}
                        </text>
                        <text
                          x="42"
                          y="22"
                          fill="var(--color-paper)"
                          fontSize="0.82rem"
                          fontWeight="600"
                          fontFamily="var(--font-sans)"
                        >
                          {lane.name}
                        </text>
                        <text
                          x="42"
                          y="38"
                          fill={lane.color}
                          fontSize="0.63rem"
                          fontWeight="700"
                          fontFamily="var(--font-mono)"
                          letterSpacing="0.04em"
                        >
                          {lane.badge}
                        </text>

                        {/* Lane Subtitle description */}
                        <text
                          x="14"
                          y="58"
                          fill="var(--color-fog)"
                          fontSize="0.65rem"
                          fontFamily="var(--font-sans)"
                        >
                          {lane.nodes.length} topic{lane.nodes.length !== 1 ? 's' : ''} mapped in cognitive tier
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* Bezier Prerequisite Connection Edges */}
                  {layersLayout.connections.map((conn) => {
                    const src = conn.source;
                    const tgt = conn.target;

                    // Compute curved Bezier control points from right edge of src to left edge of tgt
                    const startX = src.x + src.width;
                    const startY = src.y + src.height / 2;
                    const endX = tgt.x;
                    const endY = tgt.y + tgt.height / 2;

                    const dx = Math.max((endX - startX) * 0.5, 40);
                    const pathStr = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                    const isAncestorEdge = selectedNodeId && (
                      (conn.target.id === selectedNodeId && pathHighlightInfo.ancestors.has(conn.source.id)) ||
                      (pathHighlightInfo.ancestors.has(conn.source.id) && pathHighlightInfo.ancestors.has(conn.target.id))
                    );

                    const isDescendantEdge = selectedNodeId && (
                      (conn.source.id === selectedNodeId && pathHighlightInfo.descendants.has(conn.target.id)) ||
                      (pathHighlightInfo.descendants.has(conn.source.id) && pathHighlightInfo.descendants.has(conn.target.id))
                    );

                    const isActive = isAncestorEdge || isDescendantEdge;

                    let strokeColor = 'rgba(138, 143, 152, 0.28)';
                    let strokeWidth = 1.2;
                    let markerEnd = 'url(#arrow-normal)';
                    let opacity = 0.5;

                    if (selectedNodeId) {
                      if (isAncestorEdge) {
                        strokeColor = '#fbbf24'; // Amber Prereq
                        strokeWidth = 2.4;
                        markerEnd = 'url(#arrow-prereq)';
                        opacity = 1;
                      } else if (isDescendantEdge) {
                        strokeColor = '#00f5d4'; // Cyan Unlock
                        strokeWidth = 2.4;
                        markerEnd = 'url(#arrow-unlock)';
                        opacity = 1;
                      } else {
                        opacity = 0.12; // Dim unrelated
                      }
                    }

                    return (
                      <path
                        key={conn.id}
                        d={pathStr}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isActive ? (isAncestorEdge ? '6 4' : 'none') : '3 3'}
                        markerEnd={markerEnd}
                        style={{
                          opacity,
                          transition: 'var(--transition-smooth)'
                        }}
                      />
                    );
                  })}

                  {/* Render Topic Cards within Lanes */}
                  {layersLayout.nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const isAncestor = pathHighlightInfo.ancestors.has(node.id);
                    const isDescendant = pathHighlightInfo.descendants.has(node.id);

                    // Highlighting styles
                    let cardBg = 'var(--color-carbon)';
                    let borderColor = 'var(--color-graphite)';
                    let borderWidth = 1;
                    let opacity = 1;

                    if (selectedNodeId) {
                      if (isSelected) {
                        cardBg = 'var(--color-obsidian)';
                        borderColor = 'var(--color-acid-lime)';
                        borderWidth = 2.2;
                      } else if (isAncestor) {
                        borderColor = '#fbbf24'; // Amber Prereq Glow
                        borderWidth = 2;
                        cardBg = 'rgba(251, 191, 36, 0.08)';
                      } else if (isDescendant) {
                        borderColor = '#00f5d4'; // Cyan Unlock Glow
                        borderWidth = 2;
                        cardBg = 'rgba(0, 245, 212, 0.08)';
                      } else {
                        opacity = 0.25; // Dim non-connected
                      }
                    } else if (isHovered) {
                      borderColor = node.tierInfo.color;
                      cardBg = 'var(--color-obsidian)';
                    }

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        style={{ cursor: 'pointer', opacity, transition: 'var(--transition-fast)' }}
                      >
                        {/* Card Glass Rectangle */}
                        <rect
                          x="0"
                          y="0"
                          width={node.width}
                          height={node.height}
                          rx="10"
                          fill={cardBg}
                          stroke={borderColor}
                          strokeWidth={borderWidth}
                        />

                        {/* Top Indicator Strip */}
                        <rect
                          x="10"
                          y="0"
                          width={node.width - 20}
                          height="2.5"
                          rx="1"
                          fill={node.tierInfo.color}
                        />

                        {/* Prerequisite Origin Pill or Unit Label */}
                        <rect
                          x="12"
                          y="12"
                          width={node.isSynthesizedPrereq ? 134 : 68}
                          height="18"
                          rx="4"
                          fill={node.isSynthesizedPrereq ? 'rgba(139, 92, 246, 0.18)' : 'var(--color-obsidian)'}
                          stroke={node.isSynthesizedPrereq ? 'rgba(139, 92, 246, 0.5)' : 'var(--color-graphite)'}
                          strokeWidth="1"
                        />
                        <text
                          x="18"
                          y="24"
                          fill={node.isSynthesizedPrereq ? '#c4b5fd' : 'var(--color-fog)'}
                          fontSize="0.65rem"
                          fontFamily="var(--font-mono)"
                          fontWeight="500"
                        >
                          {node.isSynthesizedPrereq ? '✦ PREREQUISITE MATH' : (node.module_id || 'CORE UNIT')}
                        </text>

                        {/* Bloom Level Badge */}
                        <rect
                          x={node.width - 78}
                          y="12"
                          width="66"
                          height="18"
                          rx="4"
                          fill="rgba(56, 189, 248, 0.12)"
                          stroke="rgba(56, 189, 248, 0.35)"
                          strokeWidth="1"
                        />
                        <text
                          x={node.width - 45}
                          y="24"
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="0.64rem"
                          fontWeight="600"
                          fontFamily="var(--font-sans)"
                        >
                          {node.bloom_level || 'Understand'}
                        </text>

                        {/* Topic Title */}
                        <text
                          x="14"
                          y="52"
                          fill="var(--color-paper)"
                          fontSize="0.82rem"
                          fontWeight="600"
                          fontFamily="var(--font-sans)"
                          letterSpacing="-0.010em"
                        >
                          {node.name.length > 27 ? node.name.slice(0, 25) + '...' : node.name}
                        </text>

                        {/* Cognitive Depth & Importance Meter */}
                        <text
                          x="14"
                          y="74"
                          fill="var(--color-mist)"
                          fontSize="0.68rem"
                          fontFamily="var(--font-sans)"
                        >
                          Depth: {node.conceptual_depth}/10 • Imp: {node.importance_score}%
                        </text>

                        {/* Prerequisite & Unlock Footprint */}
                        <g transform={`translate(14, 84)`}>
                          {node.prerequisites?.length > 0 && (
                            <text x="0" y="10" fill="#fbbf24" fontSize="0.65rem" fontWeight="600">
                              ▲ {node.prerequisites.length} Prereqs
                            </text>
                          )}
                          {node.dependents?.length > 0 && (
                            <text x={node.prerequisites?.length > 0 ? 76 : 0} y="10" fill="#00f5d4" fontSize="0.65rem" fontWeight="600">
                              ▼ {node.dependents.length} Unlocks
                            </text>
                          )}
                          {(!node.prerequisites?.length && !node.dependents?.length) && (
                            <text x="0" y="10" fill="var(--color-fog)" fontSize="0.65rem">
                              Foundational Entry Point
                            </text>
                          )}
                        </g>

                        {/* Active Selection Glow Ring Indicator */}
                        {isSelected && (
                          <rect
                            x="-2"
                            y="-2"
                            width={node.width + 4}
                            height={node.height + 4}
                            rx="12"
                            fill="none"
                            stroke="var(--color-acid-lime)"
                            strokeWidth="2"
                            strokeOpacity="0.8"
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* VIEW MODE 2: SYLLABUS ROADMAP (MODULES & UNITS) */}
              {viewMode === 'roadmap' && roadmapLayout && (
                <>
                  {/* Roadmaps Connections */}
                  {roadmapLayout.connections.map((conn, idx) => {
                    const dx = (conn.to.x - conn.from.x) * 0.5;
                    const pathStr = `M ${conn.from.x + conn.from.width} ${conn.from.y} C ${conn.from.x + conn.from.width + dx} ${conn.from.y}, ${conn.to.x - dx} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`;
                    return (
                      <path
                        key={`rm_conn_${idx}`}
                        d={pathStr}
                        fill="none"
                        stroke={conn.color}
                        strokeWidth="1.5"
                        opacity="0.4"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {roadmapLayout.nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isTopic = node.type === 'topic';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y - node.height / 2})`}
                        onClick={() => isTopic && setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                        style={{ cursor: isTopic ? 'pointer' : 'default' }}
                      >
                        <rect
                          x="0"
                          y="0"
                          width={node.width}
                          height={node.height}
                          rx={node.type === 'subject' ? '12' : (node.type === 'module' ? '8' : '6')}
                          fill={node.type === 'subject' ? 'var(--color-obsidian)' : (node.type === 'module' ? 'var(--color-carbon)' : 'rgba(22, 23, 24, 0.95)')}
                          stroke={isSelected ? 'var(--color-acid-lime)' : (node.type === 'subject' ? 'var(--color-primary)' : 'var(--color-graphite)')}
                          strokeWidth={isSelected ? '2' : '1'}
                        />
                        <text
                          x="14"
                          y={node.height / 2 + 4}
                          fill="var(--color-paper)"
                          fontSize={node.type === 'subject' ? '0.85rem' : '0.78rem'}
                          fontWeight="500"
                        >
                          {node.label.length > 24 ? node.label.slice(0, 22) + '...' : node.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

            </g>
          </svg>
        </div>
      </div>

      {/* Right-Hand Epistemic Knowledge Inspector Drawer */}
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
        {activeNode ? (
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
                  {activeNode.tierInfo ? activeNode.tierInfo.badge : (activeNode.tier || 'CORE KNOWLEDGE')}
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                  {activeNode.bloom_level || 'Understand'}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-paper)', fontWeight: '600', lineHeight: '1.3' }}>
                {activeNode.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-fog)', marginTop: '4px' }}>
                {activeNode.isSynthesizedPrereq ? 'Synthesized Foundational Prerequisite' : `Syllabus Module: ${activeNode.module_name || activeNode.module_id || 'Core Curriculum'}`}
              </p>
            </div>

            {/* Description / Epistemic Rationale */}
            <div style={{ padding: '12px', background: 'var(--color-obsidian)', borderRadius: '8px', border: '1px solid var(--color-graphite)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-acid-lime)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                EPISTEMIC ROLE & RATIONALE
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-mist)', lineHeight: '1.45' }}>
                {activeNode.description}
              </p>
            </div>

            {/* Interactive Cognitive Flow: Prerequisites Needed First */}
            <div>
              <h4 style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>▲ LEARN FIRST (Prerequisites Needed)</span>
              </h4>
              {activeNode.prerequisites && activeNode.prerequisites.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeNode.prerequisites.map(pId => {
                    const pNode = epistemicData.conceptMap.get(pId);
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => setSelectedNodeId(pId)}
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
                        <span>➔</span> {pNode ? pNode.name : pId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                  Foundational Root Concept (No prior college prerequisite required)
                </span>
              )}
            </div>

            {/* Interactive Cognitive Flow: Concepts Unlocked Next */}
            <div>
              <h4 style={{ fontSize: '0.78rem', color: '#00f5d4', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>▼ UNLOCKS NEXT (Downstream Concepts)</span>
              </h4>
              {activeNode.dependents && activeNode.dependents.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeNode.dependents.map(dId => {
                    const dNode = epistemicData.conceptMap.get(dId);
                    return (
                      <button
                        key={dId}
                        type="button"
                        onClick={() => setSelectedNodeId(dId)}
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
                        <span>➔</span> {dNode ? dNode.name : dId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                  Terminal Synthesis Concept (Consolidates upstream knowledge)
                </span>
              )}
            </div>

            {/* Key Theoretical Principles & Mathematical Core */}
            {activeNode.important_concepts?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.78rem', color: 'var(--color-mist)', marginBottom: '6px', fontWeight: '600' }}>
                  Core Competencies & Theoretical Formulations
                </h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.76rem', color: 'var(--color-paper)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeNode.important_concepts.map((concept, i) => (
                    <li key={i}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Estimated Study Hours & Practical Orientation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--color-graphite)', paddingTop: '12px' }}>
              <div>
                <span style={{ color: 'var(--color-fog)', fontSize: '0.7rem', display: 'block' }}>Est. Mastery Time</span>
                <strong style={{ color: 'var(--color-paper)', fontSize: '0.82rem' }}>{activeNode.estimated_learning_time || '4 hours'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-fog)', fontSize: '0.7rem', display: 'block' }}>Conceptual Depth</span>
                <strong style={{ color: 'var(--color-acid-lime)', fontSize: '0.82rem' }}>{activeNode.conceptual_depth}/10 Depth</strong>
              </div>
            </div>

            {/* Real World Application */}
            {activeNode.application_potential && (
              <div>
                <h4 style={{ fontSize: '0.78rem', color: 'var(--color-mist)', marginBottom: '4px', fontWeight: '600' }}>
                  Engineering Application Potential
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--color-fog)', lineHeight: '1.4' }}>
                  {activeNode.application_potential}
                </p>
              </div>
            )}

            {/* Fast Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {onForwardToLab && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onForwardToLab(activeNode.name)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.82rem' }}
                >
                  🎯 Draft Exam Question in Lab
                </button>
              )}

              {onForwardToFlashcards && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onForwardToFlashcards(activeNode.name)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--color-mist)' }}
                >
                  🗂️ Study Topic Flashcards
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty / Default Inspector State */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'var(--color-fog)', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              🎯
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-paper)', marginBottom: '6px' }}>
                Select Any Topic or Prerequisite
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--color-fog)', maxWidth: '280px', lineHeight: '1.45' }}>
                Click any card in the 5 Cognitive Mastery Tiers to inspect its authentic mathematical prerequisites, unlocked downstream concepts, Bloom's level, and question laboratory shortcuts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
