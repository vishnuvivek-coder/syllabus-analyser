// Epistemic Curriculum Synthesizer
// Transforms administrative syllabus structures into true epistemic knowledge ontologies.

export const COGNITIVE_TIERS = [
  {
    id: 'foundations',
    name: 'Foundations & Math',
    shortName: 'Foundations',
    order: 1,
    color: '#8b5cf6', // Lavender / Iris
    glowColor: 'rgba(139, 92, 246, 0.35)',
    borderTone: 'rgba(139, 92, 246, 0.45)',
    bgTone: 'rgba(139, 92, 246, 0.08)',
    icon: '📐',
    badge: 'TIER 1 • PREREQUISITE MATH',
    description: 'Prerequisite mathematics, linear algebra, vector spaces, probability & calculus required before algorithmic study.'
  },
  {
    id: 'core_theory',
    name: 'Core Theory & Paradigms',
    shortName: 'Core Theory',
    order: 2,
    color: '#02b8cc', // Signal Teal
    glowColor: 'rgba(2, 184, 204, 0.35)',
    borderTone: 'rgba(2, 184, 204, 0.45)',
    bgTone: 'rgba(2, 184, 204, 0.08)',
    icon: '💡',
    badge: 'TIER 2 • LEARNING PRINCIPLES',
    description: 'Inductive bias, empirical risk minimization, cost formulations, and fundamental theoretical tradeoffs.'
  },
  {
    id: 'algorithmic',
    name: 'Algorithmic Models',
    shortName: 'Algorithms',
    order: 3,
    color: '#38bdf8', // Electric Sky Blue
    glowColor: 'rgba(56, 189, 248, 0.35)',
    borderTone: 'rgba(56, 189, 248, 0.45)',
    bgTone: 'rgba(56, 189, 248, 0.08)',
    icon: '⚡',
    badge: 'TIER 3 • CORE ALGORITHMS',
    description: 'Primary computational model architectures, classification boundaries, and partitioning algorithms.'
  },
  {
    id: 'optimization',
    name: 'Optimization & Regularization',
    shortName: 'Optimization',
    order: 4,
    color: '#fbbf24', // Luminous Amber
    glowColor: 'rgba(251, 191, 36, 0.35)',
    borderTone: 'rgba(251, 191, 36, 0.45)',
    bgTone: 'rgba(251, 191, 36, 0.08)',
    icon: '🎯',
    badge: 'TIER 4 • OPTIMIZATION & GUARDS',
    description: 'Hyperparameter control, L1/L2 penalties, gradient dynamics, and generalization bounds.'
  },
  {
    id: 'synthesis',
    name: 'Synthesis & Advanced Paradigms',
    shortName: 'Synthesis',
    order: 5,
    color: '#e4f222', // Acid Lime
    glowColor: 'rgba(228, 242, 34, 0.35)',
    borderTone: 'rgba(228, 242, 34, 0.45)',
    bgTone: 'rgba(228, 242, 34, 0.08)',
    icon: '🚀',
    badge: 'TIER 5 • SYNTHESIS & ENSEMBLES',
    description: 'Ensemble bagging/boosting, non-linear manifolds, meta-learning, and production pipelines.'
  }
];

export const TIER_BY_ID = COGNITIVE_TIERS.reduce((acc, tier) => {
  acc[tier.id] = tier;
  return acc;
}, {});

// Classify any topic/concept into its true cognitive mastery tier
export function classifyCognitiveTier(name = '', category = '', rawTier = '') {
  if (rawTier && TIER_BY_ID[rawTier]) return rawTier;

  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();

  // Tier 1: Foundations & Math
  if (
    n.includes('linear algebra') ||
    n.includes('matrix') ||
    n.includes('vector space') ||
    n.includes('eigen') ||
    n.includes('svd') ||
    n.includes('probability') ||
    n.includes('bayes rule') ||
    n.includes('calculus') ||
    n.includes('gradient derivation') ||
    n.includes('convex') ||
    n.includes('mathematical prerequisite') ||
    c.includes('prerequisite') ||
    c.includes('math')
  ) {
    return 'foundations';
  }

  // Tier 5: Synthesis & Advanced
  if (
    n.includes('ensemble') ||
    n.includes('bagging') ||
    n.includes('boosting') ||
    n.includes('random forest') ||
    n.includes('adaboost') ||
    n.includes('xgboost') ||
    n.includes('pca') ||
    n.includes('principal component') ||
    n.includes('manifold') ||
    n.includes('deep learning') ||
    n.includes('neural network') ||
    n.includes('transformer') ||
    n.includes('pipeline') ||
    c.includes('advanced') ||
    c.includes('synthesis')
  ) {
    return 'synthesis';
  }

  // Tier 4: Optimization & Regularization
  if (
    n.includes('regularization') ||
    n.includes('ridge') ||
    n.includes('lasso') ||
    n.includes('gradient descent') ||
    n.includes('sgd') ||
    n.includes('cross-validation') ||
    n.includes('hyperparameter') ||
    n.includes('lda') ||
    n.includes('discriminant') ||
    n.includes('dbscan') ||
    c.includes('optimization')
  ) {
    return 'optimization';
  }

  // Tier 2: Core Learning Theory
  if (
    n.includes('bias-variance') ||
    n.includes('tradeoff') ||
    n.includes('trade-off') ||
    n.includes('inductive bias') ||
    n.includes('empirical risk') ||
    n.includes('generalization') ||
    n.includes('curse of dimensionality') ||
    n.includes('overfitting') ||
    n.includes('supervised learning framework') ||
    n.includes('loss formulation') ||
    c.includes('theory')
  ) {
    return 'core_theory';
  }

  // Tier 3: Algorithmic Models (Default for core algorithms)
  if (
    n.includes('regression') ||
    n.includes('decision tree') ||
    n.includes('support vector') ||
    n.includes('svm') ||
    n.includes('k-means') ||
    n.includes('clustering') ||
    n.includes('naive bayes') ||
    n.includes('knn') ||
    n.includes('nearest neighbor') ||
    c.includes('algorithm') ||
    c.includes('intermediate')
  ) {
    return 'algorithmic';
  }

  // Fallback heuristic based on difficulty / category
  if (c.includes('foundational') || c.includes('basic')) return 'core_theory';
  return 'algorithmic';
}

// Generate foundational mathematical prerequisites if not already present in the syllabus data
export function getDomainPrerequisites(subjectName = '', existingNodes = []) {
  const s = subjectName.toLowerCase();
  const existingNames = new Set(existingNodes.map(n => n.name.toLowerCase()));

  // Machine Learning / AI / Data Science domain prerequisites
  if (
    s.includes('machine learning') ||
    s.includes('data science') ||
    s.includes('artificial intelligence') ||
    s.includes('pattern recognition') ||
    s.includes('neural') ||
    existingNodes.some(n => n.name.toLowerCase().includes('regression') || n.name.toLowerCase().includes('clustering'))
  ) {
    const list = [
      {
        id: 'prereq_linear_algebra',
        name: 'Linear Algebra & Matrix Decompositions',
        tier: 'foundations',
        category: 'mathematical_prerequisite',
        isSynthesizedPrereq: true,
        bloom_level: 'Understand',
        conceptual_depth: 7,
        importance_score: 95,
        estimated_learning_time: '6 hours',
        description: 'Vector spaces, dot products, matrix projections, eigenvalues, and SVD. Foundational for understanding hyperplanes, projections, and dimensionality reduction.',
        important_concepts: ['Vector Projections', 'Matrix Dot Products', 'Eigenvalues & Eigenvectors', 'Singular Value Decomposition (SVD)'],
        application_potential: 'Essential for PCA, Support Vector Machines, and Ordinary Least Squares formulations.'
      },
      {
        id: 'prereq_probability',
        name: 'Probability & Bayes Theorem',
        tier: 'foundations',
        category: 'mathematical_prerequisite',
        isSynthesizedPrereq: true,
        bloom_level: 'Understand',
        conceptual_depth: 6,
        importance_score: 90,
        estimated_learning_time: '5 hours',
        description: 'Conditional probability distributions, Bayes rule, maximum likelihood estimation (MLE), and expectation.',
        important_concepts: ['Conditional Probability', 'Bayes Rule & Posterior', 'Maximum Likelihood Estimation', 'Probability Density Functions'],
        application_potential: 'Direct mathematical basis for Naive Bayes, Logistic Regression log-odds, and Gaussian Mixture Models.'
      },
      {
        id: 'prereq_multivariable_calc',
        name: 'Multivariable Calculus & Loss Gradients',
        tier: 'foundations',
        category: 'mathematical_prerequisite',
        isSynthesizedPrereq: true,
        bloom_level: 'Apply',
        conceptual_depth: 7,
        importance_score: 92,
        estimated_learning_time: '5 hours',
        description: 'Partial derivatives, gradient vectors, convex loss functions, and chain rule optimization.',
        important_concepts: ['Partial Derivatives', 'Gradient Vectors', 'Convexity & Local Minima', 'Chain Rule & Backpropagation'],
        application_potential: 'Underpins Gradient Descent, Cost Function minimization, and Regularization penalties.'
      }
    ];

    return list.filter(p => !existingNames.has(p.name.toLowerCase()));
  }

  // Operating Systems domain prerequisites
  if (s.includes('operating system') || s.includes('os')) {
    const list = [
      {
        id: 'prereq_comp_arch',
        name: 'Computer Architecture & Assembly',
        tier: 'foundations',
        category: 'hardware_prerequisite',
        isSynthesizedPrereq: true,
        bloom_level: 'Understand',
        conceptual_depth: 7,
        importance_score: 94,
        estimated_learning_time: '6 hours',
        description: 'Registers, CPU fetch-decode-execute cycle, interrupt vectors, and cache hierarchy.',
        important_concepts: ['CPU Instruction Cycle', 'Hardware Interrupts', 'Registers & Stack', 'Cache Hierarchy'],
        application_potential: 'Foundational for Context Switching, Interrupt Handling, and Virtual Memory translation.'
      },
      {
        id: 'prereq_memory_org',
        name: 'Process Memory & Paging Fundamentals',
        tier: 'foundations',
        category: 'systems_prerequisite',
        isSynthesizedPrereq: true,
        bloom_level: 'Understand',
        conceptual_depth: 6,
        importance_score: 90,
        estimated_learning_time: '4 hours',
        description: 'Virtual vs physical addressing, page tables, TLBs, and stack/heap segment isolation.',
        important_concepts: ['Virtual Address Translation', 'Paging & TLB', 'Segment Protection', 'Memory Bus'],
        application_potential: 'Required for Virtual Memory Management, Page Replacement, and Isolation.'
      }
    ];
    return list.filter(p => !existingNames.has(p.name.toLowerCase()));
  }

  // Generic domain foundational prerequisite
  return [
    {
      id: 'prereq_domain_core',
      name: 'Fundamental Domain Principles & Notation',
      tier: 'foundations',
      category: 'foundational_prerequisite',
      isSynthesizedPrereq: true,
      bloom_level: 'Understand',
      conceptual_depth: 6,
      importance_score: 88,
      estimated_learning_time: '4 hours',
      description: 'Foundational mathematical notations, core axiomatic definitions, and problem space taxonomy.',
      important_concepts: ['Domain Axioms', 'Mathematical Formalism', 'Problem Taxonomy'],
      application_potential: 'Core prerequisite for subsequent technical modules.'
    }
  ];
}

// Synthesizes a comprehensive, domain-grounded epistemic graph from raw syllabus data
export function synthesizeEpistemicCurriculum(syllabusData) {
  if (!syllabusData) return null;

  const subjectName = syllabusData.subject_name || 'Curriculum Subject';
  const rawConcepts = syllabusData.concept_dependency_graph?.concepts || [];
  const rawRelationships = syllabusData.concept_dependency_graph?.relationships || [];
  const modules = syllabusData.modules || [];

  // 1. Gather all concepts from concept_dependency_graph + topics from modules
  const conceptMap = new Map();

  // Load concepts from concept_dependency_graph
  rawConcepts.forEach(c => {
    const tier = classifyCognitiveTier(c.name, c.category, c.tier);
    conceptMap.set(c.id, {
      ...c,
      id: c.id,
      name: c.name,
      tier,
      category: c.category || tier,
      prerequisites: [...(c.prerequisites || [])],
      dependents: [...(c.dependents || [])],
      related: [...(c.related || [])],
      contrasting: [...(c.contrasting || [])],
      bloom_level: c.bloom_level || 'Understand',
      conceptual_depth: c.conceptual_depth || c.difficulty || 6,
      importance_score: c.importance_score || 85,
      estimated_learning_time: c.estimated_learning_time || '3 hours',
      description: c.description || `Core epistemic topic within ${tier.replace('_', ' ')}.`,
      important_concepts: c.important_concepts || [c.name],
      isSyllabusTopic: true
    });
  });

  // Also harvest topics from modules if they aren't already represented in concepts
  modules.forEach(mod => {
    (mod.topics || []).forEach(t => {
      // Find existing by name or id
      let existing = Array.from(conceptMap.values()).find(
        c => c.name.toLowerCase() === t.topic_name.toLowerCase() || c.id === t.topic_id
      );

      const tier = classifyCognitiveTier(t.topic_name, '', t.tier);

      if (!existing) {
        const id = t.topic_id || `topic_${t.topic_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        existing = {
          id,
          name: t.topic_name,
          tier,
          category: tier,
          module_id: mod.module_id,
          module_name: mod.module_name,
          prerequisites: [...(t.prerequisite_topics || [])],
          dependents: [],
          related: [],
          contrasting: [],
          bloom_level: (t.suitable_bloom_levels && t.suitable_bloom_levels[0]) || 'Understand',
          conceptual_depth: t.conceptual_depth || 6,
          importance_score: t.importance_score || 80,
          estimated_learning_time: t.estimated_learning_time || '3 hours',
          description: t.application_potential || `${t.topic_name} in ${mod.module_name}`,
          important_concepts: t.important_concepts || [t.topic_name],
          isSyllabusTopic: true
        };
        conceptMap.set(id, existing);
      } else {
        existing.module_id = existing.module_id || mod.module_id;
        existing.module_name = existing.module_name || mod.module_name;
        if (t.important_concepts) existing.important_concepts = t.important_concepts;
        if (t.conceptual_depth) existing.conceptual_depth = t.conceptual_depth;
        if (t.importance_score) existing.importance_score = t.importance_score;
      }
    });
  });

  // 2. Add domain mathematical prerequisites if missing in foundations tier
  const existingList = Array.from(conceptMap.values());
  const foundationsCount = existingList.filter(c => c.tier === 'foundations').length;

  if (foundationsCount === 0) {
    const domainPrereqs = getDomainPrerequisites(subjectName, existingList);
    domainPrereqs.forEach(p => {
      conceptMap.set(p.id, {
        ...p,
        prerequisites: [],
        dependents: [],
        related: [],
        contrasting: [],
        isSyllabusTopic: false
      });
    });
  }

  // 3. Build Authentic Prerequisite Edges & Dependencies
  const allNodes = Array.from(conceptMap.values());
  const edges = [];
  const edgeSet = new Set();

  function addEdge(sourceId, targetId, type = 'PREREQUISITE', explanation = '') {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const key = `${sourceId}->${targetId}:${type}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    edges.push({
      source: sourceId,
      target: targetId,
      type,
      explanation
    });

    const src = conceptMap.get(sourceId);
    const tgt = conceptMap.get(targetId);

    if (src && !src.dependents.includes(targetId)) src.dependents.push(targetId);
    if (tgt && !tgt.prerequisites.includes(sourceId)) tgt.prerequisites.push(sourceId);
  }

  // Add existing raw relationships
  rawRelationships.forEach(rel => {
    addEdge(rel.source, rel.target, rel.type || 'PREREQUISITE', rel.explanation || '');
  });

  // Add known epistemic dependency flows across core ML / Engineering concepts
  allNodes.forEach(node => {
    const name = node.name.toLowerCase();

    // Connect synthesized linear algebra foundations to vector models
    if (conceptMap.has('prereq_linear_algebra')) {
      if (
        name.includes('linear regression') ||
        name.includes('support vector') ||
        name.includes('svm') ||
        name.includes('pca') ||
        name.includes('discriminant') ||
        name.includes('hyperplane')
      ) {
        addEdge('prereq_linear_algebra', node.id, 'PREREQUISITE', 'Vector spaces and matrix projections form the mathematical basis.');
      }
    }

    // Connect synthesized probability foundations to probabilistic models
    if (conceptMap.has('prereq_probability')) {
      if (
        name.includes('naive bayes') ||
        name.includes('logistic regression') ||
        name.includes('bayes') ||
        name.includes('mixture') ||
        name.includes('clustering')
      ) {
        addEdge('prereq_probability', node.id, 'PREREQUISITE', 'Probability distributions and likelihood estimation are direct prerequisites.');
      }
    }

    // Connect calculus & loss gradients to optimization and regression
    if (conceptMap.has('prereq_multivariable_calc')) {
      if (
        name.includes('gradient') ||
        name.includes('linear regression') ||
        name.includes('logistic regression') ||
        name.includes('ridge') ||
        name.includes('lasso') ||
        name.includes('regularization')
      ) {
        addEdge('prereq_multivariable_calc', node.id, 'PREREQUISITE', 'Loss functions and gradient derivation guide parameter optimization.');
      }
    }

    // Connect Linear Regression to Regularization & Bias-Variance
    if (name.includes('linear regression')) {
      const reg = allNodes.find(n => n.name.toLowerCase().includes('ridge') || n.name.toLowerCase().includes('regularization'));
      if (reg) addEdge(node.id, reg.id, 'PREREQUISITE', 'L1/L2 penalties penalize Ordinary Least Squares weights.');

      const bv = allNodes.find(n => n.name.toLowerCase().includes('bias-variance'));
      if (bv) addEdge(node.id, bv.id, 'ENABLES', 'Simple linear fits serve as canonical high-bias baseline models.');
    }

    // Connect Decision Trees to Ensembles (Bagging / Boosting)
    if (name.includes('decision tree')) {
      const ens = allNodes.find(n => n.name.toLowerCase().includes('ensemble') || n.name.toLowerCase().includes('random forest') || n.name.toLowerCase().includes('boosting'));
      if (ens) addEdge(node.id, ens.id, 'PREREQUISITE', 'Ensemble trees combine high-variance decision trees.');
    }

    // Connect Bias-Variance Tradeoff to Ensembles & Regularization
    if (name.includes('bias-variance')) {
      const ens = allNodes.find(n => n.name.toLowerCase().includes('ensemble'));
      if (ens) addEdge(node.id, ens.id, 'ENABLES', 'Bagging directly reduces variance while boosting reduces bias.');

      const reg = allNodes.find(n => n.name.toLowerCase().includes('regularization') || n.name.toLowerCase().includes('lasso'));
      if (reg) addEdge(node.id, reg.id, 'OPTIMIZES', 'Regularization manages the variance penalty on complex models.');
    }

    // Connect PCA to Clustering
    if (name.includes('pca') || name.includes('principal component')) {
      const km = allNodes.find(n => n.name.toLowerCase().includes('k-means') || n.name.toLowerCase().includes('clustering'));
      if (km) addEdge(node.id, km.id, 'ENABLES', 'PCA projects high-dimensional data into low-dimensional manifolds for clustering.');
    }
  });

  // 4. Organize nodes into Tiers
  const nodesByTier = {
    foundations: [],
    core_theory: [],
    algorithmic: [],
    optimization: [],
    synthesis: []
  };

  allNodes.forEach(node => {
    const tier = node.tier || 'algorithmic';
    if (nodesByTier[tier]) {
      nodesByTier[tier].push(node);
    } else {
      nodesByTier.algorithmic.push(node);
    }
  });

  // Calculate Ancestor & Descendant graphs for instant path illumination
  const ancestorCache = new Map();
  const descendantCache = new Map();

  function getAncestors(id, visited = new Set()) {
    if (visited.has(id)) return [];
    visited.add(id);
    const n = conceptMap.get(id);
    if (!n) return [];
    let list = [...n.prerequisites];
    n.prerequisites.forEach(pId => {
      list = list.concat(getAncestors(pId, visited));
    });
    return Array.from(new Set(list));
  }

  function getDescendants(id, visited = new Set()) {
    if (visited.has(id)) return [];
    visited.add(id);
    const n = conceptMap.get(id);
    if (!n) return [];
    let list = [...n.dependents];
    n.dependents.forEach(dId => {
      list = list.concat(getDescendants(dId, visited));
    });
    return Array.from(new Set(list));
  }

  allNodes.forEach(n => {
    ancestorCache.set(n.id, getAncestors(n.id));
    descendantCache.set(n.id, getDescendants(n.id));
  });

  return {
    subjectName,
    subjectDomain: syllabusData.subject_domain || 'Engineering & Computing',
    allNodes,
    conceptMap,
    edges,
    nodesByTier,
    ancestorCache,
    descendantCache,
    modules: syllabusData.modules || []
  };
}
