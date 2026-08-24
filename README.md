# 🎓 Syllabus Analyzer & AI Assessment Blueprint Platform

An intelligent, full-stack curriculum analytics, exam blueprint designer, and AI-powered question evaluation platform. Powered by Google Gemini AI with automatic multi-model quota fallback and KaTeX mathematical notation rendering.

---

## ✨ Key Features

- **📑 Intelligent Multi-Source Syllabus Ingestion**:
  - Upload PDF curricula, paste syllabus text, or upload image screenshots.
  - Automatically parses modules, topics, subtopics, importance weights, conceptual depth, prerequisite dependencies, and learning outcomes.

- **🌐 Interactive Syllabus Knowledge Graph**:
  - Force-directed interactive D3/SVG visualization showing module hierarchies, topic connections, and prerequisite dependencies.
  - Search, filter by module, zoom, pan, and view deep topic metadata.

- **📐 Advanced Examination Blueprint Designer**:
  - Customizable blueprint constraints: Total Marks, Duration, Bloom's Taxonomy breakdown, Difficulty distribution (Easy/Medium/Hard), and Module weights.
  - **Question Pattern Constraints**: Explicit configuration for **No. of Questions** and **No. of Sub-Questions per Question** (e.g., Part a, Part b).
  - One-click **Draft All Questions ⚡** with real-time progress.
  - 15-parameter critical review & auto-rewrite engine.

- **🔬 AI Question Lab & Evaluator**:
  - Evaluates 5 competing candidate questions per topic based on reasoning depth, information gain, discrimination power, originality, and application score.
  - Live AI refinement: prompt the AI to tune difficulty, convert to scenario/code, or adjust sub-questions.
  - Saved Question Bank with local persistence.

- **∑ KaTeX Mathematical LaTeX Rendering**:
  - Full support for inline (`$...$`) and block (`$$...$$`) LaTeX equations, powers, roots, fractions, matrices, summations, integrals, and Greek symbols.

- **🛡️ Multi-Model Quota Resilience**:
  - Built-in automatic fallback across Gemini models (`gemini-3.5-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.5-pro`) to ensure 429 rate limits never crash assessment workflows.

- **🎨 Cinematic Dark UI**:
  - Luxury deep palette with Fraunces & Plus Jakarta Sans typography, frosted glassmorphism panels, and gold ambient glows.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Google Gemini API Key](https://aistudio.google.com/)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vishnuvivek-coder/syllabus-analyser.git
   cd syllabus-analyser
   ```

2. **Install Server Dependencies**:
   ```bash
   npm install
   ```

3. **Install Client Dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   PORT=3001
   ```

5. **Start the Backend Server**:
   ```bash
   node server.js
   ```
   *(Server starts at http://localhost:3001)*

6. **Start the Frontend Vite Dev Server**:
   ```bash
   cd client
   npm run dev
   ```
   *(Frontend starts at http://localhost:5173)*

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, KaTeX, Lucide / Custom SVG Icons, CSS Glassmorphism
- **Backend**: Node.js, Express, Multer, `pdf-parse`, `@google/generative-ai`
- **AI Models**: Google Gemini 3.5 Flash, 2.5 Flash, 2.0 Flash, 2.5 Pro with auto-fallback
- **Mathematical Engine**: KaTeX LaTeX Parser & Tokenizer

---

## 📄 License
MIT License.
