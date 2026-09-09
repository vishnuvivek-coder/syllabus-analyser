# 🎓 SyllabiMind — System Architecture & Flowcharts

> Comprehensive Architectural Specification, Component Hierarchy, Multi-Model Failover Chains, and End-to-End Data Flowcharts.

---

## 1. Master System Architecture Flowchart

```mermaid
flowchart TD
    %% Styling classes
    classDef input fill:#2A2418,stroke:#D4A15C,stroke-width:2px,color:#F2F0EB
    classDef server fill:#1E1C28,stroke:#6C6499,stroke-width:2px,color:#F2F0EB
    classDef ai fill:#2B1E1E,stroke:#E06A60,stroke-width:2px,color:#F2F0EB
    classDef client fill:#1B2520,stroke:#7BAE7F,stroke-width:2px,color:#F2F0EB

    %% Ingestion
    User(["👨‍🎓 User (Student / Professor)"]):::input
    User -->|PDF Upload / Image / Paste| InputPanel["InputPanel.jsx"]:::input
    InputPanel -->|POST /api/analyze| Server["Express Backend (server.js:3001)"]:::server

    %% Server Ingestion
    subgraph ServerProcessing ["Backend Processing Pipeline"]
        Server --> Multer["Multer (Memory Ingestion)"]:::server
        Multer --> PDFParse["pdf-parse (Text Extraction)"]:::server
        PDFParse --> FallbackEngine["generateWithFallback() Engine"]:::server
    end

    %% Gemini AI Layer
    subgraph AILayer ["Google Gemini AI Cluster"]
        FallbackEngine -->|1. Try Primary| G1["gemini-3.6-flash"]:::ai
        G1 -.->|429 Rate Limit or 404| G2["gemini-3.5-flash"]:::ai
        G2 -.->|Failover| G3["gemini-3.5-flash-lite"]:::ai
        G3 -.->|Deep Reasoning| G4["gemini-3.1-pro-preview"]:::ai
    end

    %% Self-Healing Parsing
    AILayer --> ResponseText["Raw AI Response String"]:::server
    ResponseText --> RobustJSON["robustJSONParse()\n(Strips markdown fences, fixes trailing commas, auto-balances braces)"]:::server
    RobustJSON --> StructuredData[("Structured Syllabus JSON Schema")]:::client

    %% Client Routing
    StructuredData --> AppRouter["App.jsx Orchestrator"]:::client

    %% Branches
    subgraph ModulesBranch ["Curriculum & Knowledge Domain"]
        AppRouter --> KnowledgeGraph["KnowledgeGraph.jsx (D3 Force Graph)"]:::client
        AppRouter --> ConceptGraph["ConceptGraph.jsx (Prerequisites)"]:::client
        AppRouter --> ModuleList["ModuleList.jsx (Curriculum Hub)"]:::client
    end

    subgraph AssessmentBranch ["Assessment & Exam Architecture"]
        AppRouter --> Blueprint["BlueprintDesigner.jsx\n- Question Count Constraints\n- Sub-question Allocation\n- Bloom's HOTS Report"]:::client
        Blueprint --> QuestionLab["QuestionLab.jsx\n- 5-Candidate Evaluator\n- 15-Parameter Audit"]:::client
        QuestionLab --> Variants["QuestionVariants.jsx\n- Parameter Shift\n- Inverse Problem\n- Case Studies"]:::client
        QuestionLab --> QuestionBank[("Collaborative Bank (Tags, Ratings, JSON Export/Import)")]:::client
    end

    subgraph StudentBranch ["Student Evaluation & Learning"]
        AppRouter --> Evaluator["AnswerEvaluator.jsx\n- Gemini Vision Photo Grading\n- Section-wise Partial Credit"]:::client
        AppRouter --> PastPapers["PaperAnalyzer.jsx\n- Frequency Heatmaps\n- AI Exam Predictions\n- Blindspot Flags"]:::client
        AppRouter --> Flashcards["FlashcardDeck.jsx\n- 3D Flip Cards\n- WebSpeech TTS\n- Anki TSV Export"]:::client
    end

    subgraph AnalyticsSubsystem ["Analytics & Offline PWA"]
        AppRouter --> Analytics["Analytics.jsx\n- 4-Quadrant Priority Matrix\n- Platform KPI Dashboard\n- 7-Day Study Streak"]:::client
        AppRouter --> PWA["sw.js Service Worker\n- Offline Cache for Flashcards\n- Mobile App Install"]:::client
    end
```

---

## 2. Assessment Lifecycle & Data Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Teacher / Student
    participant UI as React UI (Browser)
    participant API as Express API (server.js)
    participant AI as Gemini 3.6 Flash Cluster
    participant Storage as Browser LocalStorage

    User->>UI: Uploads Syllabus PDF
    UI->>API: POST /api/analyze (Multipart FormData)
    API->>API: pdf-parse extracts raw text
    API->>AI: Prompts curriculum extraction
    AI-->>API: Returns structured JSON response
    API->>API: robustJSONParse() sanitizes data
    API-->>UI: Sends Syllabus Graph Schema
    UI->>Storage: Automatically caches session

    Note over UI, User: User configures Exam Blueprint
    User->>UI: Specifies 5 Questions with 2 Sub-questions each
    UI->>API: POST /api/generate-exam-blueprint
    API->>AI: Enforces Question & Sub-Question constraints
    AI-->>API: Returns Blueprint Table + Bloom breakdown
    API-->>UI: Renders Blueprint & HOTS Coverage Report

    Note over UI, User: Student submits answer photo for evaluation
    User->>UI: Uploads handwritten answer photo
    UI->>API: POST /api/evaluate-answer (Image buffer + Question)
    API->>AI: Gemini Multimodal Vision Rubric Analysis
    AI-->>API: Section-wise scores + LaTeX errors
    API-->>UI: Scorecard with % and KaTeX commentary
```

---

## 3. Subsystem Breakdown

| Subsystem | File / Component | Key Responsibility |
|---|---|---|
| **Client Orchestration** | [`App.jsx`](client/src/App.jsx) | Tab navigation, localStorage synchronization, history session drawer. |
| **Document Ingestion** | [`InputPanel.jsx`](client/src/components/InputPanel.jsx) | Handles PDFs, raw text, and pasted screenshots. |
| **Knowledge Visualizer** | [`KnowledgeGraph.jsx`](client/src/components/KnowledgeGraph.jsx) | D3 force-directed knowledge map with topic inspectors. |
| **Concept Graph** | [`ConceptGraph.jsx`](client/src/components/ConceptGraph.jsx) | Visualizes prerequisite flows between foundation and advanced topics. |
| **Exam Blueprint Designer** | [`BlueprintDesigner.jsx`](client/src/components/BlueprintDesigner.jsx) | Generates exam blueprints, enforces sub-questions, and analyzes Bloom's cognitive levels. |
| **AI Question Lab** | [`QuestionLab.jsx`](client/src/components/QuestionLab.jsx) | 5-candidate ranking, 15-parameter rubric reviewer, and collaborative question bank. |
| **Question Variants** | [`QuestionVariants.jsx`](client/src/components/QuestionVariants.jsx) | Generates 4 exam set variations (Parameter shift, Inverse problem, Real-world case). |
| **AI Answer Evaluator** | [`AnswerEvaluator.jsx`](client/src/components/AnswerEvaluator.jsx) | Multimodal answer script grading with partial credit and KaTeX feedback. |
| **Past Paper Analyzer** | [`PaperAnalyzer.jsx`](client/src/components/PaperAnalyzer.jsx) | Maps historical exam questions, computes recurrence heatmaps, and forecasts trends. |
| **Flashcard Deck** | [`FlashcardDeck.jsx`](client/src/components/FlashcardDeck.jsx) | 3D flip active-recall cards, Web Speech TTS, and Anki TSV export. |
| **Platform Analytics** | [`Analytics.jsx`](client/src/components/Analytics.jsx) | Strategic complexity matrix, platform KPI counters, and 7-day study streak. |
| **LaTeX Math Engine** | [`MathText.jsx`](client/src/components/MathText.jsx) | Real-time KaTeX tokenizer rendering formulas in `$inline$` and `$$display$$`. |
| **Backend API** | [`server.js`](server.js) | Express server bound to `0.0.0.0`, multi-model fallback chain, and self-healing parser. |
| **Progressive Web App** | [`manifest.json`](client/public/manifest.json) & [`sw.js`](client/public/sw.js) | Offline asset caching and standalone mobile install. |
