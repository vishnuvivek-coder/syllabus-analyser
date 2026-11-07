// Sample Authentic Machine Learning Curriculum (Autonomous R24 Framework)
// Incorporates explicit foundational mathematics, 5 cognitive mastery tiers, and authentic epistemic dependencies.

export const SAMPLE_ML_CURRICULUM = {
  subject_name: "Machine Learning",
  subject_domain: "Artificial Intelligence & Statistical Computing",
  learning_outcomes: [
    "Formulate supervised and unsupervised learning problems with rigorous mathematical loss functions.",
    "Derive and implement linear models, regularized regressions (Ridge/LASSO), and margin classifiers (SVMs).",
    "Analyze the Bias-Variance Tradeoff and prevent model overfitting via cross-validation and hyperparameter tuning.",
    "Construct tree-based models and assemble high-performance Bagging & Boosting ensemble architectures.",
    "Apply dimensionality reduction (PCA) and density-based clustering to complex feature spaces."
  ],
  modules: [
    {
      module_id: "M1",
      module_name: "Unit 1: Linear Regression & Regularization",
      topics: [
        {
          topic_id: "T1.1",
          topic_name: "Linear Regression",
          tier: "algorithmic",
          conceptual_depth: 6,
          importance_score: 92,
          prerequisite_topics: ["prereq_linear_algebra", "prereq_multivariable_calc"],
          suitable_bloom_levels: ["Understand", "Apply", "Analyze"],
          important_concepts: ["Ordinary Least Squares (OLS)", "Residual Sum of Squares", "Normal Equation Matrix Solution", "Gradient Descent Formulation"],
          estimated_learning_time: "4 hours",
          application_potential: "Predictive econometric modeling, continuous trend forecasting, baseline valuation engines."
        },
        {
          topic_id: "T1.2",
          topic_name: "Ridge and LASSO Regularization",
          tier: "optimization",
          conceptual_depth: 7,
          importance_score: 88,
          prerequisite_topics: ["T1.1", "prereq_multivariable_calc"],
          suitable_bloom_levels: ["Apply", "Analyze", "Evaluate"],
          important_concepts: ["L2 Ridge Weight Shrinkage", "L1 LASSO Sparsity Induction", "Lagrange Multiplier Contours", "Overfitting Penalization"],
          estimated_learning_time: "3.5 hours",
          application_potential: "Feature selection in ultra-high dimensional genomic and biometric datasets."
        }
      ]
    },
    {
      module_id: "M2",
      module_name: "Unit 2: Probabilistic & Linear Classification",
      topics: [
        {
          topic_id: "T2.1",
          topic_name: "Logistic Regression",
          tier: "algorithmic",
          conceptual_depth: 6,
          importance_score: 94,
          prerequisite_topics: ["prereq_probability", "prereq_multivariable_calc"],
          suitable_bloom_levels: ["Understand", "Apply", "Analyze"],
          important_concepts: ["Sigmoid Activation", "Log-Odds / Logit Transform", "Binary Cross-Entropy Loss", "Maximum Likelihood Estimation (MLE)"],
          estimated_learning_time: "4 hours",
          application_potential: "Credit default risk prediction, medical disease diagnosis, spam detection."
        },
        {
          topic_id: "T2.2",
          topic_name: "Naïve Bayes Classifier",
          tier: "algorithmic",
          conceptual_depth: 5,
          importance_score: 80,
          prerequisite_topics: ["prereq_probability"],
          suitable_bloom_levels: ["Understand", "Apply"],
          important_concepts: ["Conditional Independence Assumption", "Prior and Posterior Odds", "Laplace Smoothing", "Gaussian Naive Bayes"],
          estimated_learning_time: "3 hours",
          application_potential: "Real-time document classification, NLP sentiment categorization, spam filtering."
        },
        {
          topic_id: "T2.3",
          topic_name: "Linear Discriminant Analysis",
          tier: "optimization",
          conceptual_depth: 7,
          importance_score: 78,
          prerequisite_topics: ["prereq_linear_algebra", "prereq_probability"],
          suitable_bloom_levels: ["Analyze", "Evaluate"],
          important_concepts: ["Fisher Criterion", "Between-Class vs Within-Class Scatter", "Projection Vector Optimization"],
          estimated_learning_time: "3 hours",
          application_potential: "Supervised dimensionality reduction, facial biometric recognition pipelines."
        }
      ]
    },
    {
      module_id: "M3",
      module_name: "Unit 3: Non-Linear Models & Margin Classifiers",
      topics: [
        {
          topic_id: "T3.1",
          topic_name: "Decision Trees",
          tier: "algorithmic",
          conceptual_depth: 6,
          importance_score: 86,
          prerequisite_topics: ["prereq_probability"],
          suitable_bloom_levels: ["Understand", "Apply", "Analyze"],
          important_concepts: ["Shannon Entropy", "Information Gain (ID3)", "Gini Impurity (CART)", "Recursive Binary Splitting & Pruning"],
          estimated_learning_time: "4.5 hours",
          application_potential: "Interpretable clinical decision support, customer churn categorization."
        },
        {
          topic_id: "T3.2",
          topic_name: "Support Vector Machines",
          tier: "algorithmic",
          conceptual_depth: 8,
          importance_score: 95,
          prerequisite_topics: ["prereq_linear_algebra", "prereq_multivariable_calc"],
          suitable_bloom_levels: ["Apply", "Analyze", "Evaluate"],
          important_concepts: ["Optimal Margin Hyperplane", "Support Vectors", "Primal & Dual Formulations", "Kernel Trick (RBF / Polynomial)"],
          estimated_learning_time: "5 hours",
          application_potential: "Image classification, computational genomics, non-linear defect boundary detection."
        },
        {
          topic_id: "T3.3",
          topic_name: "Bias-Variance Tradeoff",
          tier: "core_theory",
          conceptual_depth: 8,
          importance_score: 98,
          prerequisite_topics: ["T1.1", "T2.1"],
          suitable_bloom_levels: ["Analyze", "Evaluate", "Create"],
          important_concepts: ["Generalization Error Decomposition", "Underfitting vs Overfitting", "Model Complexity Curve", "Irreducible Error"],
          estimated_learning_time: "4 hours",
          application_potential: "Fundamental diagnosis of machine learning system validation performance."
        }
      ]
    },
    {
      module_id: "M4",
      module_name: "Unit 4: Unsupervised Learning & Dimensionality Reduction",
      topics: [
        {
          topic_id: "T4.1",
          topic_name: "K-Means Clustering",
          tier: "algorithmic",
          conceptual_depth: 5,
          importance_score: 84,
          prerequisite_topics: ["prereq_linear_algebra"],
          suitable_bloom_levels: ["Understand", "Apply"],
          important_concepts: ["Voronoi Partitioning", "Centroid Iteration (Lloyd's Algorithm)", "Inertia / Within-Cluster Sum of Squares", "Elbow Method"],
          estimated_learning_time: "3.5 hours",
          application_potential: "Customer segmentation, color quantization, image compression."
        },
        {
          topic_id: "T4.2",
          topic_name: "DBSCAN Clustering",
          tier: "optimization",
          conceptual_depth: 7,
          importance_score: 82,
          prerequisite_topics: ["T4.1"],
          suitable_bloom_levels: ["Apply", "Analyze"],
          important_concepts: ["Density Reachability", "Epsilon Radius & MinPts", "Core, Border, and Noise Points", "Arbitrary Shape Clustering"],
          estimated_learning_time: "3.5 hours",
          application_potential: "Geospatial anomaly detection, radar clustering, astronomical star field grouping."
        },
        {
          topic_id: "T4.3",
          topic_name: "Principal Component Analysis",
          tier: "synthesis",
          conceptual_depth: 8,
          importance_score: 90,
          prerequisite_topics: ["prereq_linear_algebra"],
          suitable_bloom_levels: ["Analyze", "Evaluate"],
          important_concepts: ["Covariance Matrix Computation", "Eigenvector Decomposition", "Variance Maximization Orthogonal Bases", "Scree Plot"],
          estimated_learning_time: "4 hours",
          application_potential: "Compressing high-dimensional sensor streams, noise filtering, visualization."
        }
      ]
    },
    {
      module_id: "M5",
      module_name: "Unit 5: Ensemble Learning & Model Synthesis",
      topics: [
        {
          topic_id: "T5.1",
          topic_name: "Ensemble Methods (Bagging & Boosting)",
          tier: "synthesis",
          conceptual_depth: 8,
          importance_score: 96,
          prerequisite_topics: ["T3.1", "T3.3"],
          suitable_bloom_levels: ["Apply", "Analyze", "Evaluate", "Create"],
          important_concepts: ["Bootstrap Aggregating (Bagging)", "Random Forests Feature Subsampling", "Sequential Gradient Boosting", "AdaBoost Adaptive Weighting"],
          estimated_learning_time: "5 hours",
          application_potential: "State-of-the-art tabular prediction, financial fraud detection, Kaggle competitions."
        }
      ]
    }
  ],
  concept_dependency_graph: {
    subject_domain: "Machine Learning & AI",
    concepts: [
      {
        id: "prereq_linear_algebra",
        name: "Linear Algebra & Matrix Decompositions",
        tier: "foundations",
        category: "mathematical_prerequisite",
        isSynthesizedPrereq: true,
        bloom_level: "Understand",
        difficulty: 7,
        prerequisites: [],
        dependents: ["c_linreg", "c_svm", "c_pca", "c_lda"],
        related: [],
        contrasting: [],
        application_domains: ["Machine Learning", "Linear Transformations"],
        assessment_suitability: ["problem_solving", "derivation"]
      },
      {
        id: "prereq_probability",
        name: "Probability & Bayes Theorem",
        tier: "foundations",
        category: "mathematical_prerequisite",
        isSynthesizedPrereq: true,
        bloom_level: "Understand",
        difficulty: 6,
        prerequisites: [],
        dependents: ["c_logreg", "c_nb", "c_tree"],
        related: [],
        contrasting: [],
        application_domains: ["Probabilistic Modeling"],
        assessment_suitability: ["conceptual", "derivation"]
      },
      {
        id: "prereq_multivariable_calc",
        name: "Multivariable Calculus & Loss Gradients",
        tier: "foundations",
        category: "mathematical_prerequisite",
        isSynthesizedPrereq: true,
        bloom_level: "Apply",
        difficulty: 7,
        prerequisites: [],
        dependents: ["c_linreg", "c_logreg", "c_reg", "c_svm"],
        related: [],
        contrasting: [],
        application_domains: ["Convex Optimization"],
        assessment_suitability: ["derivation", "application"]
      },
      {
        id: "c_bv",
        name: "Bias-Variance Tradeoff",
        tier: "core_theory",
        category: "theoretical_principle",
        bloom_level: "Analyze",
        difficulty: 8,
        prerequisites: ["c_linreg", "c_logreg"],
        dependents: ["c_reg", "c_ens"],
        related: [],
        contrasting: [],
        application_domains: ["Model Validation", "Statistical Learning Theory"],
        assessment_suitability: ["analysis", "case_study"]
      },
      {
        id: "c_linreg",
        name: "Linear Regression",
        tier: "algorithmic",
        category: "supervised_learning",
        bloom_level: "Apply",
        difficulty: 6,
        prerequisites: ["prereq_linear_algebra", "prereq_multivariable_calc"],
        dependents: ["c_reg", "c_bv"],
        related: ["c_logreg"],
        contrasting: [],
        application_domains: ["Predictive Analytics"],
        assessment_suitability: ["derivation", "problem_solving"]
      },
      {
        id: "c_logreg",
        name: "Logistic Regression",
        tier: "algorithmic",
        category: "supervised_learning",
        bloom_level: "Apply",
        difficulty: 6,
        prerequisites: ["prereq_probability", "prereq_multivariable_calc"],
        dependents: ["c_bv"],
        related: ["c_linreg"],
        contrasting: ["c_nb"],
        application_domains: ["Binary Classification"],
        assessment_suitability: ["application", "conceptual"]
      },
      {
        id: "c_reg",
        name: "Ridge and LASSO Regularization",
        tier: "optimization",
        category: "model_optimization",
        bloom_level: "Evaluate",
        difficulty: 7,
        prerequisites: ["c_linreg", "c_bv"],
        dependents: [],
        related: [],
        contrasting: [],
        application_domains: ["Feature Selection"],
        assessment_suitability: ["analysis", "derivation"]
      },
      {
        id: "c_nb",
        name: "Naïve Bayes Classifier",
        tier: "algorithmic",
        category: "supervised_learning",
        bloom_level: "Understand",
        difficulty: 5,
        prerequisites: ["prereq_probability"],
        dependents: [],
        related: ["c_logreg"],
        contrasting: ["c_logreg"],
        application_domains: ["NLP", "Spam Filtering"],
        assessment_suitability: ["problem_solving"]
      },
      {
        id: "c_tree",
        name: "Decision Trees",
        tier: "algorithmic",
        category: "supervised_learning",
        bloom_level: "Apply",
        difficulty: 6,
        prerequisites: ["prereq_probability"],
        dependents: ["c_ens"],
        related: ["c_ens"],
        contrasting: ["c_svm"],
        application_domains: ["Rule Extraction", "Tabular Models"],
        assessment_suitability: ["calculation", "design"]
      },
      {
        id: "c_svm",
        name: "Support Vector Machines",
        tier: "algorithmic",
        category: "supervised_learning",
        bloom_level: "Analyze",
        difficulty: 8,
        prerequisites: ["prereq_linear_algebra", "prereq_multivariable_calc"],
        dependents: ["c_ens"],
        related: ["c_logreg"],
        contrasting: ["c_tree"],
        application_domains: ["Margin Classification"],
        assessment_suitability: ["derivation", "case_study"]
      },
      {
        id: "c_kmeans",
        name: "K-Means Clustering",
        tier: "algorithmic",
        category: "unsupervised_learning",
        bloom_level: "Apply",
        difficulty: 5,
        prerequisites: ["prereq_linear_algebra"],
        dependents: ["c_dbscan"],
        related: ["c_dbscan"],
        contrasting: ["c_dbscan"],
        application_domains: ["Customer Clustering"],
        assessment_suitability: ["step_by_step", "design"]
      },
      {
        id: "c_dbscan",
        name: "DBSCAN Clustering",
        tier: "optimization",
        category: "unsupervised_learning",
        bloom_level: "Analyze",
        difficulty: 7,
        prerequisites: ["c_kmeans"],
        dependents: [],
        related: ["c_kmeans"],
        contrasting: ["c_kmeans"],
        application_domains: ["Spatial Density Analysis"],
        assessment_suitability: ["conceptual", "comparison"]
      },
      {
        id: "c_lda",
        name: "Linear Discriminant Analysis",
        tier: "optimization",
        category: "dimensionality_reduction",
        bloom_level: "Analyze",
        difficulty: 7,
        prerequisites: ["prereq_linear_algebra", "prereq_probability"],
        dependents: [],
        related: ["c_pca"],
        contrasting: ["c_pca"],
        application_domains: ["Supervised Projection"],
        assessment_suitability: ["derivation", "problem_solving"]
      },
      {
        id: "c_pca",
        name: "Principal Component Analysis",
        tier: "synthesis",
        category: "dimensionality_reduction",
        bloom_level: "Evaluate",
        difficulty: 8,
        prerequisites: ["prereq_linear_algebra"],
        dependents: ["c_kmeans"],
        related: ["c_lda"],
        contrasting: ["c_lda"],
        application_domains: ["Feature Compression"],
        assessment_suitability: ["matrix_calc", "interpretation"]
      },
      {
        id: "c_ens",
        name: "Ensemble Methods (Bagging & Boosting)",
        tier: "synthesis",
        category: "model_synthesis",
        bloom_level: "Create",
        difficulty: 8,
        prerequisites: ["c_tree", "c_bv"],
        dependents: [],
        related: ["c_tree"],
        contrasting: [],
        application_domains: ["High Precision Predictive Ensembles"],
        assessment_suitability: ["architecture_design", "evaluation"]
      }
    ],
    relationships: [
      { source: "prereq_linear_algebra", target: "c_linreg", type: "PREREQUISITE", explanation: "Vector dot products form linear equation models" },
      { source: "prereq_linear_algebra", target: "c_svm", type: "PREREQUISITE", explanation: "Hyperplane geometry requires vector orthogonality and dot products" },
      { source: "prereq_linear_algebra", target: "c_pca", type: "PREREQUISITE", explanation: "Covariance matrix eigenvectors form principal orthogonal axes" },
      { source: "prereq_linear_algebra", target: "c_lda", type: "PREREQUISITE", explanation: "Scatter matrix inversion requires linear algebra decomposition" },
      { source: "prereq_probability", target: "c_logreg", type: "PREREQUISITE", explanation: "Sigmoid maps linear outputs to Bernoulli probability distributions" },
      { source: "prereq_probability", target: "c_nb", type: "PREREQUISITE", explanation: "Bayes' theorem calculates conditional class posteriors" },
      { source: "prereq_multivariable_calc", target: "c_linreg", type: "PREREQUISITE", explanation: "Partial derivatives minimize mean squared error" },
      { source: "prereq_multivariable_calc", target: "c_logreg", type: "PREREQUISITE", explanation: "Gradient ascent optimizes cross-entropy log-likelihood" },
      { source: "c_linreg", target: "c_reg", type: "PREREQUISITE", explanation: "Regularization constrains OLS regression coefficients" },
      { source: "c_linreg", target: "c_bv", type: "ENABLES", explanation: "Linear fits demonstrate high bias and low variance" },
      { source: "c_logreg", target: "c_bv", type: "ENABLES", explanation: "Logistic bounds illustrate decision boundary flexibility" },
      { source: "c_bv", target: "c_reg", type: "OPTIMIZES", explanation: "Regularization directly balances variance reduction against bias penalty" },
      { source: "c_bv", target: "c_ens", type: "ENABLES", explanation: "Bagging reduces variance; Boosting reduces bias" },
      { source: "c_tree", target: "c_ens", type: "PREREQUISITE", explanation: "Decision trees serve as individual base learners for Random Forests & Boosting" },
      { source: "c_kmeans", target: "c_dbscan", type: "CONTRASTS_WITH", explanation: "Spherical centroid partitioning vs arbitrary density reachability" },
      { source: "c_pca", target: "c_lda", type: "CONTRASTS_WITH", explanation: "Unsupervised variance maximization vs supervised class separability" }
    ]
  }
};
