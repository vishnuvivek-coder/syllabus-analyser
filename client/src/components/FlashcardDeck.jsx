import React, { useState, useEffect, useRef, useMemo } from 'react';
import MathText from './MathText';

export default function FlashcardDeck({ syllabusData, apiKey, modelName, initialTopic, onClearInitialTopic }) {
  // Extract all topics from syllabus data
  const allTopics = useMemo(() => {
    if (!syllabusData || !syllabusData.modules) return [];
    const list = [];
    syllabusData.modules.forEach(m => {
      if (m.topics) {
        m.topics.forEach(t => {
          list.push({
            id: t.topic_id,
            name: t.topic_name,
            moduleId: m.module_id,
            moduleName: m.module_name,
            importance: t.importance_score || 80,
            conceptualDepth: t.conceptual_depth || 6
          });
        });
      }
    });
    return list;
  }, [syllabusData]);

  // Selected module & topic
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedTopicName, setSelectedTopicName] = useState(() => {
    return initialTopic || allTopics[0]?.name || '';
  });

  // Handle incoming initialTopic change
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopicName(initialTopic);
      if (onClearInitialTopic) {
        onClearInitialTopic();
      }
    }
  }, [initialTopic, onClearInitialTopic]);

  // Flashcards storage in localStorage
  const [decksCache, setDecksCache] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_flashcard_decks');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Study progress: { [cardId]: { mastered: boolean, starred: boolean } }
  const [cardProgress, setCardProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_flashcard_progress');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Active study states
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('study'); // 'study' | 'grid'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'STARRED' | 'REVIEW' | 'MASTERED'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchProgress, setBatchProgress] = useState('');
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const cardRef = useRef(null);

  // Filter topics by module
  const filteredTopics = useMemo(() => {
    if (selectedModule === 'ALL') return allTopics;
    return allTopics.filter(t => t.moduleId === selectedModule);
  }, [allTopics, selectedModule]);

  // Current active topic deck
  const currentDeck = decksCache[selectedTopicName] || null;

  // Filtered cards in the current deck
  const activeCards = useMemo(() => {
    if (!currentDeck || !currentDeck.cards) return [];
    return currentDeck.cards.filter(c => {
      if (categoryFilter !== 'ALL' && c.type !== categoryFilter) return false;
      const prog = cardProgress[c.id] || {};
      if (statusFilter === 'STARRED' && !prog.starred) return false;
      if (statusFilter === 'MASTERED' && !prog.mastered) return false;
      if (statusFilter === 'REVIEW' && prog.mastered) return false;
      return true;
    });
  }, [currentDeck, categoryFilter, statusFilter, cardProgress]);

  // Ensure currentCardIndex stays in bounds
  useEffect(() => {
    if (currentCardIndex >= activeCards.length && activeCards.length > 0) {
      setCurrentCardIndex(0);
    }
    setIsFlipped(false);
  }, [activeCards.length, selectedTopicName, categoryFilter, statusFilter]);

  // Save progress helper
  const updateCardStatus = (cardId, key, value) => {
    setCardProgress(prev => {
      const updated = {
        ...prev,
        [cardId]: {
          ...(prev[cardId] || {}),
          [key]: value
        }
      };
      localStorage.setItem('syllabus_flashcard_progress', JSON.stringify(updated));
      return updated;
    });
  };

  // Generate flashcards for a specific topic
  const handleGenerateDeck = async (topicName = selectedTopicName) => {
    if (!topicName) return;

    const topicObj = allTopics.find(t => t.name === topicName);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({
          topicName,
          moduleName: topicObj?.moduleName || '',
          syllabusContext: syllabusData,
          count: 6,
          modelName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate flashcards');
      }

      const data = await response.json();
      
      setDecksCache(prev => {
        const updated = {
          ...prev,
          [topicName]: data
        };
        localStorage.setItem('syllabus_flashcard_decks', JSON.stringify(updated));
        return updated;
      });

      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate all topic decks sequentially
  const handleBatchGenerateAll = async () => {
    if (!allTopics.length) return;
    if (!window.confirm(`Generate flashcards for all ${allTopics.length} topics? This will build a complete study library.`)) return;

    setIsLoading(true);
    setError(null);

    for (let i = 0; i < allTopics.length; i++) {
      const t = allTopics[i];
      if (decksCache[t.name]) continue; // skip already cached

      setBatchProgress(`Generating deck (${i + 1}/${allTopics.length}): ${t.name}...`);
      try {
        const response = await fetch('/api/generate-flashcards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {})
          },
          body: JSON.stringify({
            topicName: t.name,
            moduleName: t.moduleName,
            syllabusContext: syllabusData,
            count: 6,
            modelName
          })
        });

        if (response.ok) {
          const data = await response.json();
          setDecksCache(prev => {
            const updated = { ...prev, [t.name]: data };
            localStorage.setItem('syllabus_flashcard_decks', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (e) {
        console.warn('Batch generation skipped error for:', t.name, e);
      }
    }

    setBatchProgress('');
    setIsLoading(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        handleNextCard();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        handlePrevCard();
      } else if (e.key === 'm') {
        const cur = activeCards[currentCardIndex];
        if (cur) {
          const isMastered = !!cardProgress[cur.id]?.mastered;
          updateCardStatus(cur.id, 'mastered', !isMastered);
        }
      } else if (e.key === 's') {
        const cur = activeCards[currentCardIndex];
        if (cur) {
          const isStarred = !!cardProgress[cur.id]?.starred;
          updateCardStatus(cur.id, 'starred', !isStarred);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCards, currentCardIndex, cardProgress]);

  // Auto-play slideshow timer
  useEffect(() => {
    let timer;
    if (isAutoPlay && activeCards.length > 0) {
      timer = setInterval(() => {
        setIsFlipped(prev => {
          if (!prev) return true; // Flip to answer
          handleNextCard(); // Move to next
          return false;
        });
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isAutoPlay, activeCards.length, currentCardIndex]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex(prev => (prev + 1) % Math.max(1, activeCards.length));
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex(prev => (prev - 1 + activeCards.length) % Math.max(1, activeCards.length));
  };

  const handleShuffle = () => {
    if (!currentDeck?.cards) return;
    const shuffled = [...currentDeck.cards].sort(() => Math.random() - 0.5);
    setDecksCache(prev => ({
      ...prev,
      [selectedTopicName]: {
        ...currentDeck,
        cards: shuffled
      }
    }));
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Text-to-Speech audio read aloud
  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\$+/g, '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Export deck to CSV / Anki
  const handleExportAnki = () => {
    if (!currentDeck?.cards?.length) return;
    let tsv = "Front\tBack\tCategory\tTags\n";
    currentDeck.cards.forEach(c => {
      const front = `"${c.front.replace(/"/g, '""')}"`;
      const back = `"${(c.back + (c.key_takeaway ? '\n\nKey Takeaway: ' + c.key_takeaway : '')).replace(/"/g, '""')}"`;
      const cat = c.type || 'concept';
      const tags = (c.tags || []).join(' ');
      tsv += `${front}\t${back}\t${cat}\t${tags}\n`;
    });

    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTopicName.replace(/[^a-zA-Z0-9]/g, '_')}_flashcards.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentCard = activeCards[currentCardIndex] || null;
  const isCurrentStarred = currentCard ? !!cardProgress[currentCard.id]?.starred : false;
  const isCurrentMastered = currentCard ? !!cardProgress[currentCard.id]?.mastered : false;

  // Deck stats
  const totalCardsInDeck = currentDeck?.cards?.length || 0;
  const masteredCount = currentDeck?.cards?.filter(c => cardProgress[c.id]?.mastered).length || 0;
  const starredCount = currentDeck?.cards?.filter(c => cardProgress[c.id]?.starred).length || 0;
  const masteryPercentage = totalCardsInDeck > 0 ? Math.round((masteredCount / totalCardsInDeck) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '0' }}>
      
      {/* Top Header & Topic Selector Controls */}
      <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Topic & Module Pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Module:</span>
            <select
              className="form-input"
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                const nextTopics = e.target.value === 'ALL' ? allTopics : allTopics.filter(t => t.moduleId === e.target.value);
                if (nextTopics.length && !nextTopics.some(t => t.name === selectedTopicName)) {
                  setSelectedTopicName(nextTopics[0].name);
                }
              }}
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', width: '150px' }}
            >
              <option value="ALL">All Modules</option>
              {syllabusData?.modules?.map(m => (
                <option key={m.module_id} value={m.module_id}>
                  {m.module_id}: {m.module_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Topic:</span>
            <select
              className="form-input"
              value={selectedTopicName}
              onChange={(e) => {
                setSelectedTopicName(e.target.value);
                setCurrentCardIndex(0);
                setIsFlipped(false);
              }}
              style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'var(--bg-secondary)', minWidth: '220px' }}
            >
              {filteredTopics.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name} {decksCache[t.name] ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleGenerateDeck()}
            disabled={isLoading || !selectedTopicName}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isLoading ? (
              <>
                <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Generating...</span>
              </>
            ) : (
              <span>{currentDeck ? '⚡ Regenerate Deck' : '⚡ Generate Flashcards'}</span>
            )}
          </button>
        </div>

        {/* Right: View Mode & Batch Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleBatchGenerateAll}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
            title="Generate flashcard study decks for all syllabus topics"
          >
            📚 Generate All Topics
          </button>

          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('study')}
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: viewMode === 'study' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'study' ? '#0D0D0F' : 'var(--text-secondary)',
                fontWeight: viewMode === 'study' ? '700' : '500',
                borderRadius: '4px'
              }}
            >
              3D Study
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'grid' ? '#0D0D0F' : 'var(--text-secondary)',
                fontWeight: viewMode === 'grid' ? '700' : '500',
                borderRadius: '4px'
              }}
            >
              Grid View
            </button>
          </div>

          {currentDeck && (
            <button
              onClick={handleExportAnki}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
              title="Export this deck for Anki (TSV format)"
            >
              📥 Export Anki
            </button>
          )}
        </div>
      </div>

      {/* Batch Generation Progress Indicator */}
      {batchProgress && (
        <div className="glass-panel" style={{ padding: '8px 16px', background: 'rgba(212, 161, 92, 0.08)', borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '14px', height: '14px', border: '2px solid rgba(212, 161, 92, 0.3)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600' }}>{batchProgress}</span>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderColor: 'var(--color-danger)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Main Flashcard Deck Content */}
      {!currentDeck ? (
        // Empty State: Prompt user to generate
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', textAlign: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(212, 161, 92, 0.12)', border: '1px solid rgba(212, 161, 92, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🗂️
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Flashcards for {selectedTopicName || 'Selected Topic'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
              Generate active-recall study cards including core definitions, mathematical formulas, comparative matrices, and exam trap breakdowns.
            </p>
          </div>
          <button
            onClick={() => handleGenerateDeck()}
            disabled={isLoading || !selectedTopicName}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isLoading ? 'Generating Flashcards...' : '⚡ Generate Flashcard Deck'}
          </button>
        </div>
      ) : (
        // Active Deck View
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '0' }}>
          
          {/* Deck Summary Bar & Filters */}
          <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Left: Mastery & Stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Mastery:</span>
                <div style={{ width: '100px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${masteryPercentage}%`, height: '100%', background: 'var(--color-success)', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-success)' }}>{masteryPercentage}%</span>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {masteredCount} of {totalCardsInDeck} Mastered • {starredCount} Starred ⭐
              </span>
            </div>

            {/* Right: Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="form-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--bg-secondary)' }}
              >
                <option value="ALL">All Categories</option>
                <option value="concept">🧠 Core Definitions</option>
                <option value="formula">⚡ Mathematical Formulas</option>
                <option value="comparison">⚖️ Comparisons</option>
                <option value="application">💡 Applications</option>
                <option value="pitfall">⚠️ Exam Pitfalls</option>
                <option value="deep-dive">🔬 Deep Dive</option>
              </select>

              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--bg-secondary)' }}
              >
                <option value="ALL">All Cards</option>
                <option value="STARRED">⭐ Starred Only</option>
                <option value="REVIEW">🔄 Needs Review</option>
                <option value="MASTERED">✅ Mastered Only</option>
              </select>
            </div>
          </div>

          {/* View Mode Switching: 3D Study or Grid */}
          {viewMode === 'study' ? (
            // ================= 3D STUDY MODE =================
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '0' }}>
              
              {activeCards.length === 0 ? (
                <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No flashcards match the selected filter. Try changing category or status filters.
                </div>
              ) : (
                <>
                  {/* Card Flip Container */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '680px',
                      height: '380px',
                      perspective: '1200px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setIsFlipped(prev => !prev)}
                  >
                    <div
                      ref={cardRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* ============ FRONT OF CARD ============ */}
                      <div
                        className="glass-panel"
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '28px',
                          border: isCurrentMastered ? '2px solid rgba(123, 174, 127, 0.6)' : (isCurrentStarred ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)'),
                          background: 'linear-gradient(145deg, #1A1A1D 0%, #141416 100%)',
                          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                          borderRadius: '16px'
                        }}
                      >
                        {/* Front Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge" style={{
                              background: currentCard.type === 'formula' ? 'rgba(212, 161, 92, 0.18)' : (currentCard.type === 'pitfall' ? 'rgba(244, 63, 94, 0.18)' : 'rgba(108, 100, 153, 0.25)'),
                              color: currentCard.type === 'formula' ? 'var(--color-primary)' : (currentCard.type === 'pitfall' ? 'var(--color-danger)' : 'var(--color-accent)')
                            }}>
                              {currentCard.category_label || currentCard.type?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Card {currentCardIndex + 1} of {activeCards.length}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSpeak(currentCard.front);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              title="Read question aloud (Audio TTS)"
                            >
                              🔊 Listen
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardStatus(currentCard.id, 'starred', !isCurrentStarred);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', color: isCurrentStarred ? 'var(--color-primary)' : 'var(--text-muted)' }}
                              title="Star / Bookmark card"
                            >
                              {isCurrentStarred ? '★' : '☆'}
                            </button>
                          </div>
                        </div>

                        {/* Front Content */}
                        <div style={{ margin: 'auto 0', textAlign: 'center', padding: '10px 0' }}>
                          <h4 style={{ fontSize: '1rem', color: 'var(--color-primary)', fontFamily: 'var(--font-serif)', marginBottom: '12px' }}>
                            {currentCard.title || selectedTopicName}
                          </h4>
                          <div style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--text-primary)', fontWeight: '500' }}>
                            <MathText text={currentCard.front} />
                          </div>
                        </div>

                        {/* Front Footer: Hint to flip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Press <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Space</kbd> or click to reveal answer
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                            Show Answer ➔
                          </span>
                        </div>
                      </div>

                      {/* ============ BACK OF CARD ============ */}
                      <div
                        className="glass-panel"
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '24px',
                          border: isCurrentMastered ? '2px solid var(--color-success)' : '1px solid rgba(212, 161, 92, 0.4)',
                          background: 'linear-gradient(145deg, #141417 0%, #0D0D0F 100%)',
                          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                          borderRadius: '16px',
                          overflowY: 'auto'
                        }}
                      >
                        {/* Back Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge badge-emerald">Model Explanation</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentCard.title}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSpeak(currentCard.back + (currentCard.key_takeaway ? '. ' + currentCard.key_takeaway : ''));
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              title="Read explanation aloud"
                            >
                              🔊 Listen
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardStatus(currentCard.id, 'starred', !isCurrentStarred);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', color: isCurrentStarred ? 'var(--color-primary)' : 'var(--text-muted)' }}
                            >
                              {isCurrentStarred ? '★' : '☆'}
                            </button>
                          </div>
                        </div>

                        {/* Back Answer Content */}
                        <div style={{ margin: '12px 0', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                          <MathText text={currentCard.back} />

                          {currentCard.key_takeaway && (
                            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(212, 161, 92, 0.08)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                              <strong>Key Takeaway:</strong> <MathText text={currentCard.key_takeaway} />
                            </div>
                          )}
                        </div>

                        {/* Back Footer: Self-Assessment Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCardStatus(currentCard.id, 'mastered', false);
                              handleNextCard();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem', color: 'var(--color-danger)' }}
                          >
                            🔄 Review Again
                          </button>

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Click to flip back
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCardStatus(currentCard.id, 'mastered', true);
                              handleNextCard();
                            }}
                            className="btn"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              background: 'var(--color-success)',
                              color: '#fff',
                              fontWeight: '600'
                            }}
                          >
                            ✅ Mastered (+1)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls Below Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <button
                      onClick={handlePrevCard}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      title="Previous Card (Arrow Left)"
                    >
                      ← Previous
                    </button>

                    <button
                      onClick={() => setIsFlipped(prev => !prev)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: '600' }}
                    >
                      🔄 Flip Card
                    </button>

                    <button
                      onClick={handleNextCard}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                      title="Next Card (Arrow Right)"
                    >
                      Next Card →
                    </button>

                    <button
                      onClick={handleShuffle}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      title="Shuffle Card Deck"
                    >
                      🔀 Shuffle
                    </button>

                    <button
                      onClick={() => setIsAutoPlay(prev => !prev)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', color: isAutoPlay ? 'var(--color-primary)' : 'inherit' }}
                      title="Toggle auto-play timer (4s/card)"
                    >
                      {isAutoPlay ? '⏸ Pause' : '▶ Auto-play'}
                    </button>
                  </div>

                  {/* Pagination Dots */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {activeCards.map((c, i) => {
                      const isMast = cardProgress[c.id]?.mastered;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCurrentCardIndex(i);
                            setIsFlipped(false);
                          }}
                          style={{
                            width: i === currentCardIndex ? '20px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: i === currentCardIndex ? 'var(--color-primary)' : (isMast ? 'var(--color-success)' : 'var(--border-strong)'),
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            padding: 0
                          }}
                          title={`Card ${i + 1}`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            // ================= GRID VIEW MODE =================
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '4px' }}>
              {activeCards.map((card, idx) => {
                const isStarred = !!cardProgress[card.id]?.starred;
                const isMastered = !!cardProgress[card.id]?.mastered;

                return (
                  <div
                    key={card.id}
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      border: isMastered ? '1px solid rgba(123, 174, 127, 0.4)' : '1px solid var(--border-glass)',
                      background: 'var(--bg-elevated)',
                      borderRadius: '12px'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge" style={{
                        background: card.type === 'formula' ? 'rgba(212, 161, 92, 0.18)' : (card.type === 'pitfall' ? 'rgba(244, 63, 94, 0.18)' : 'rgba(108, 100, 153, 0.25)'),
                        color: card.type === 'formula' ? 'var(--color-primary)' : (card.type === 'pitfall' ? 'var(--color-danger)' : 'var(--color-accent)')
                      }}>
                        {card.category_label || card.type}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => updateCardStatus(card.id, 'starred', !isStarred)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isStarred ? 'var(--color-primary)' : 'var(--text-muted)', fontSize: '1rem' }}
                        >
                          {isStarred ? '★' : '☆'}
                        </button>
                        <button
                          onClick={() => updateCardStatus(card.id, 'mastered', !isMastered)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isMastered ? 'var(--color-success)' : 'var(--text-muted)', fontSize: '0.9rem' }}
                        >
                          {isMastered ? '✅' : '⚪'}
                        </button>
                      </div>
                    </div>

                    {/* Question / Prompt */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontFamily: 'var(--font-serif)', marginBottom: '6px' }}>
                        {card.title}
                      </h4>
                      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: '600' }}>
                        <MathText text={card.front} />
                      </div>
                    </div>

                    {/* Answer */}
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      <MathText text={card.back} />
                      {card.key_takeaway && (
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', color: 'var(--color-primary)', fontSize: '0.78rem' }}>
                          💡 <strong>Takeaway:</strong> <MathText text={card.key_takeaway} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
