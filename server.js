const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

function robustJSONParse(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*|```$/g, '');
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1'); // strip trailing commas

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    let braceCount = 0;
    let bracketCount = 0;
    let insideString = false;
    let escape = false;
    let cutIndex = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        insideString = !insideString;
        continue;
      }
      if (insideString) {
        continue;
      }
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && bracketCount === 0) {
          cutIndex = i;
          break;
        }
      }
      if (char === '[') bracketCount++;
      if (char === ']') {
        bracketCount--;
        if (braceCount === 0 && bracketCount === 0) {
          cutIndex = i;
          break;
        }
      }
    }

    if (cutIndex !== -1) {
      const trimmedCandidate = cleaned.slice(0, cutIndex + 1);
      try {
        return JSON.parse(trimmedCandidate);
      } catch (innerErr) {
        // Fall back
      }
    }
    throw err;
  }
}

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

async function generateWithFallback(apiKey, requestedModel, contents, systemInstruction, options = {}) {
  // Normalize deprecated or legacy model names
  let normalizedRequested = requestedModel || 'gemini-3.6-flash';
  if (['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(normalizedRequested)) {
    normalizedRequested = 'gemini-3.6-flash';
  }

  const fallbackModels = [
    normalizedRequested,
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastError = null;
  for (const modelName of fallbackModels) {
    try {
      console.log(`[AI Call] Requesting via model "${modelName}"...`);
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const result = await model.generateContent({
        contents,
        systemInstruction
      }, options);

      console.log(`[AI Success] Content generated cleanly using model "${modelName}".`);
      return { response: result.response, modelUsed: modelName };
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      if (
        msg.includes('429') || 
        msg.includes('Quota exceeded') || 
        msg.includes('Too Many Requests') || 
        msg.includes('resource_exhausted') ||
        msg.includes('404') ||
        msg.includes('no longer available') ||
        msg.includes('not found')
      ) {
        console.warn(`[Model Fallback] Model "${modelName}" failed (${msg.substring(0, 120)}). Retrying with next fallback model...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`AI Service Error: All available Gemini models (${fallbackModels.join(', ')}) were exhausted or reached rate limits. Please check your Gemini API key in Settings or try again shortly.`);
}

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for large syllabi
});

app.post('/api/analyze', upload.single('syllabusFile'), async (req, res) => {
  try {
    let syllabusText = req.body.syllabusText || '';
    const classNotes = req.body.classNotes || '';
    const videoLinks = req.body.videoLinks || '';
    const moduleList = req.body.moduleList || '';
    const learningOutcomes = req.body.learningOutcomes || '';
    const clientApiKey = req.headers['x-api-key'];
    
    let modelName = req.body.modelName || 'gemini-3.6-flash';
    let imagePart = null;

    // Handle file upload (PDF or Image)
    if (req.file) {
      const mime = req.file.mimetype;
      if (mime === 'application/pdf') {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          syllabusText = pdfData.text;
        } catch (pdfErr) {
          console.error('PDF parsing error:', pdfErr);
          return res.status(400).json({ error: 'Failed to extract text from the uploaded PDF file.' });
        }
      } else if (mime.startsWith('image/')) {
        imagePart = {
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: mime
          }
        };
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or an image.' });
      }
    }

    if (!syllabusText.trim() && !imagePart) {
      return res.status(400).json({ error: 'Syllabus content is empty. Please upload a PDF, paste syllabus text, or upload/paste a screenshot.' });
    }

    const systemPrompt = `You are an expert academic curriculum analyst.
Your task is to analyze the provided syllabus and convert it into a structured knowledge representation in JSON format.

Do NOT invent topics that are not supported by the syllabus.
If the syllabus is ambiguous, explicitly list the ambiguities in the "ambiguities" array.

Strictly adhere to the following JSON structure:
{
  "subject_name": "Subject name extracted from syllabus",
  "modules": [
    {
      "module_id": "M1",
      "module_name": "Module name or unit title",
      "topics": [
        {
          "topic_id": "M1-T1",
          "topic_name": "Topic name",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "importance_score": 85,
          "conceptual_depth": 7,
          "prerequisite_topics": ["List of topic_ids that should be learned before this topic"],
          "suitable_bloom_levels": ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"],
          "suitable_question_types": ["Multiple Choice", "Short Answer", "Programming Problems", "Case Study", "Mathematical Proof"],
          "estimated_learning_time": "Estimated hours (e.g., '3 hours')",
          "application_potential": "Short description of real-world application",
          "important_concepts": ["Core concept A"],
          "is_practical": true,
          "is_mathematical": false,
          "is_programming": true
        }
      ]
    }
  ],
  "learning_outcomes": ["Outcomes listed in syllabus or inferred from topics"],
  "ambiguities": ["List any ambiguities, missing dependencies, or unclear definitions in the syllabus"],
  
  "concept_dependency_graph": {
    "concepts": [
      {
        "id": "concept_1",
        "name": "Linear Regression",
        "category": "foundational", // "foundational", "intermediate", "advanced", "applied"
        "prerequisites": ["concept_0"],
        "dependents": ["concept_2"],
        "related": ["concept_3"],
        "contrasting": ["concept_4"],
        "application_domains": ["Machine Learning", "Econometrics"],
        "interdisciplinary_connections": ["Statistics", "Calculus"],
        "assessment_suitability": ["synthesis", "application", "comparison"]
      }
    ],
    "relationships": [
      {
        "source": "concept_1",
        "target": "concept_2",
        "type": "PREREQUISITE", // "PREREQUISITE", "DEPENDS_ON", "RELATED_TO", "CONTRASTS_WITH", "EXTENDS", "APPLIES_TO"
        "strength": 0.85 // Float between 0.0 and 1.0
      }
    ]
  }
}`;

    let inputData = `--- SYLLABUS CONTENT ---\n${syllabusText}`;
    if (moduleList) {
      inputData += `\n\n--- MODULE/UNIT LIST FILTER ---\n${moduleList}`;
    }
    if (learningOutcomes) {
      inputData += `\n\n--- TARGET LEARNING OUTCOMES ---\n${learningOutcomes}`;
    }

    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is missing. Please configure it in Settings or the server env file.'
      });
    }

    const parts = [{ text: inputData }];
    if (imagePart) {
      parts.unshift(imagePart);
    }

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model response as JSON. Raw text was:', responseText);
      throw new Error('Syllabus analysis returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error generating analysis:', error);
    res.status(500).json({
      error: 'Failed to analyze syllabus. ' + error.message
    });
  }
});

app.post('/api/generate-exam-blueprint', async (req, res) => {
  try {
    const {
      subjectName,
      syllabusData,
      totalMarks = 100,
      duration = 180,
      totalQuestionsCount = 10,
      subQuestionsCount = 2,
      marksPerQuestion = 10,
      moduleWeights,
      difficultyDistribution,
      bloomDistribution,
      questionTypes,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    const systemPrompt = `You are an expert examination paper designer.
Your task is to create a detailed assessment blueprint based on the provided syllabus and constraints.

Return the result as a structured JSON object representing the blueprint.

EXAM PATTERN CONSTRAINTS:
1. You MUST generate EXACTLY ${totalQuestionsCount} main questions in the "questions" array (question_number 1 through ${totalQuestionsCount}).
2. Every main question MUST contain EXACTLY ${subQuestionsCount} sub-questions (e.g. Part a and Part b for subQuestionsCount=2). Set "number_of_subquestions": ${subQuestionsCount} for every row.
3. Total marks for the paper must equal ${totalMarks} marks, distributed evenly across the ${totalQuestionsCount} main questions (${marksPerQuestion} Marks per main question).
4. The questions fit within the estimated solving time, which must fit within the examination duration (${duration} mins).
5. Module coverage follows the requested module weights distribution.
6. Difficulty distribution is respected.
7. Bloom distribution is respected.

Format the output strictly as JSON following this structure:
{
  "blueprint_summary": {
    "total_questions": ${totalQuestionsCount},
    "total_marks": ${totalMarks},
    "total_duration_minutes": ${duration},
    "estimated_total_solving_time_minutes": 175,
    "subquestions_pattern": "${totalQuestionsCount} main questions with ${subQuestionsCount} sub-questions each (${marksPerQuestion} marks/question)",
    "difficulty_breakdown": {
      "Easy": "Percentage (e.g., '30%')",
      "Medium": "Percentage (e.g., '50%')",
      "Hard": "Percentage (e.g., '20%')"
    },
    "bloom_breakdown": {
      "Remember/Understand": "Percentage",
      "Apply/Analyze": "Percentage",
      "Evaluate/Create": "Percentage"
    }
  },
  "questions": [
    {
      "question_number": 1,
      "module_id": "M1",
      "module_name": "Module name",
      "topic_name": "Topic name",
      "marks": ${marksPerQuestion},
      "number_of_subquestions": ${subQuestionsCount},
      "question_type": "Analytical / Problem Solving",
      "bloom_level": "Apply",
      "difficulty": "Medium",
      "estimated_solving_time_minutes": 15,
      "cognitive_weight": "Medium"
    }
  ]
}`;

    const inputData = `
--- EXAMINATION CONSTRAINTS ---
SUBJECT: ${subjectName}
TOTAL MARKS: ${totalMarks}
DURATION: ${duration} minutes
TOTAL MAIN QUESTIONS: ${totalQuestionsCount}
SUB-QUESTIONS PER MAIN QUESTION: ${subQuestionsCount} (Part a, Part b...)
TARGET MARKS PER MAIN QUESTION: ${marksPerQuestion}
MODULE WEIGHTS: ${typeof moduleWeights === 'object' ? JSON.stringify(moduleWeights) : moduleWeights}
DIFFICULTY DISTRIBUTION: ${typeof difficultyDistribution === 'object' ? JSON.stringify(difficultyDistribution) : difficultyDistribution}
QUESTION TYPES AVAILABLE: ${Array.isArray(questionTypes) ? questionTypes.join(', ') : questionTypes}
BLOOM'S TAXONOMY DISTRIBUTION: ${typeof bloomDistribution === 'object' ? JSON.stringify(bloomDistribution) : bloomDistribution}

--- SYLLABUS DATA ---
${JSON.stringify(syllabusData, null, 2)}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model blueprint response as JSON:', responseText);
      throw new Error('Assessment blueprint returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error generating blueprint:', error);
    res.status(500).json({ error: 'Failed to generate assessment blueprint. ' + error.message });
  }
});

app.post('/api/generate-question', async (req, res) => {
  try {
    const {
      questionBlueprint,
      syllabusContext,
      topic,
      marks = 10,
      subQuestionsCount = 2,
      difficulty,
      bloomLevel,
      reasoningType,
      questionType,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    const systemPrompt = `You are an expert university examination question designer.
Your task is to generate ONE detailed exam question based on the provided blueprint, syllabus context, and constraints.

${subQuestionsCount > 1 ? `IMPORTANT PATTERN DIRECTIVE: Generate this question as a multi-part question containing exactly ${subQuestionsCount} sub-questions (e.g. Part (a) for ${marks / subQuestionsCount} marks and Part (b) for ${marks / subQuestionsCount} marks). Structure question_text clearly with (a) and (b) sub-parts, and provide matching detailed solution outlines for each sub-part.` : 'Generate a single comprehensive question.'}

MATHEMATICAL FORMATTING — STRICT RULES:
1. ALL math expressions MUST be wrapped in LaTeX delimiters: $...$ for inline, $$...$$ for display (block) equations.
2. NEVER use escaped dollar signs like \\$. Use a plain $ to open and $ to close: correct is $X^T X$ not \\$X^T X\\$.
3. NEVER write LaTeX commands like \\implies, \\lambda, \\beta, \\frac, \\sqrt outside of dollar-sign delimiters. Every backslash command must be inside $...$ or $$...$$. Correct: "this gives $\\implies$" or "$\\lambda$".  Wrong: "\\implies" (bare, no delimiters).
4. Use $$ display math for standalone equations on their own line, e.g.: $$\\hat{\\beta} = (X^T X + \\lambda I)^{-1} X^T y$$
5. Use $ inline math for symbols within a sentence, e.g.: "the regularization parameter $\\lambda$ controls..."
6. Example of CORRECT output: "Setting the derivative to zero: $$-X^T y + X^T X \\beta + \\lambda \\beta = 0 \\implies (X^T X + \\lambda I)\\beta = X^T y$$"
7. Example of WRONG output: "-$X^{Ty}$ + $X^{TX}$\\$\\beta$ + \\$\\lambda$\\$\\beta$ = 0"

Return the result as a structured JSON object.

Ensure the question:
- directly assesses the intended concept
- matches the specified cognitive level
- matches the specified difficulty
- is solvable within the estimated time
- is unambiguous
- has a clear expected answer for all sub-parts
- contains enough information to solve the problem

Format the output strictly as JSON following this structure:
{
  "question_text": "The full question prompt containing (a) and (b) sub-questions if multi-part.",
  "expected_answer_outline": "Detailed model answer outline for each sub-question.",
  "key_concepts_tested": ["Core Concept 1", "Core Concept 2"],
  "estimated_solving_time_minutes": 15,
  "difficulty_justification": "Why this question matches the target difficulty.",
  "bloom_justification": "Why this question matches the target Bloom level.",
  "marks_allocation": [
    {
      "criteria": "Part (a): Solution steps",
      "marks": ${marks > 1 ? Math.round(marks / Math.max(1, subQuestionsCount)) : 5}
    },
    {
      "criteria": "Part (b): Solution steps",
      "marks": ${marks > 1 ? Math.round(marks / Math.max(1, subQuestionsCount)) : 5}
    }
  ]
}`;

    const inputData = `
--- QUESTION SPECIFICATION ---
TOPIC: ${topic}
MARKS: ${marks}
DIFFICULTY: ${difficulty}
BLOOM LEVEL: ${bloomLevel}
REASONING TYPE: ${reasoningType || 'Analytical / Concept Integration'}
QUESTION TYPE: ${questionType}

--- BLUEPRINT ROW CONTEXT ---
${JSON.stringify(questionBlueprint, null, 2)}

--- SYLLABUS DATA ---
${JSON.stringify(syllabusContext, null, 2)}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model question response as JSON:', responseText);
      throw new Error('Question generator returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: 'Failed to generate question. ' + error.message });
  }
});

app.post('/api/generate-optimized-question', async (req, res) => {
  try {
    const {
      topic,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    const systemPrompt = `You are a high-level assessment designer.

Generate questions that test deep understanding rather than memorization.

Avoid questions that can be answered through memorization alone.

For the topic, generate 5 candidate questions.

Each candidate should maximize:
- information gain
- reasoning depth
- application
- originality
- conceptual integration
- discrimination between student ability levels
- real-world relevance

For each candidate calculate:
- difficulty (Easy | Medium | Hard)
- reasoning_depth (Float 0-10)
- information_gain (Float 0-10)
- originality (Float 0-10)
- application_score (Float 0-10)
- discrimination_score (Float 0-10)
- concept_coverage (Array of strings)
- estimated_time (Integer minutes)

Then rank the candidates.
Select the strongest question.
Explain why it is stronger than the alternatives (referencing information gain, discrimination, etc.).

Format the output strictly as JSON following this structure:
{
  "topic": "Topic name",
  "candidates": [
    {
      "candidate_id": 1,
      "question_text": "Detailed question text...",
      "metrics": {
        "difficulty": "Easy" | "Medium" | "Hard",
        "reasoning_depth": 9.2,
        "information_gain": 8.5,
        "originality": 9.0,
        "application_score": 9.5,
        "discrimination_score": 8.8,
        "concept_coverage": ["Concept 1", "Concept 2"],
        "estimated_time_minutes": 15
      }
    }
  ],
  "rankings": [1, 3, 2, 5, 4],
  "selected_question": {
    "candidate_id": 1,
    "question_text": "The full text of the winning question...",
    "expected_answer_outline": "Expected answer outline and grading guidelines...",
    "explanation": "Detailed explanation of why this question is stronger than the alternatives (referencing information gain, reasoning depth, discrimination score, etc.)"
  }
}`;

    const inputData = `
--- CONCEPTUAL QUESTION ASSIGNMENT ---
TOPIC: ${topic}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model optimized question response as JSON:', responseText);
      throw new Error('Optimized question generator returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error generating optimized question:', error);
    res.status(500).json({ error: 'Failed to generate optimized questions. ' + error.message });
  }
});

app.post('/api/review-question', async (req, res) => {
  try {
    const {
      question,
      answer,
      blueprint,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    const systemPrompt = `You are a highly critical university examination reviewer.
Your task is to review the provided exam question and expected answer against its target blueprint constraints.

Evaluate the following 15 parameters:
1. Correctness
2. Clarity
3. Ambiguity
4. Difficulty accuracy
5. Bloom alignment
6. Syllabus alignment
7. Marks appropriateness
8. Solving-time appropriateness
9. Information sufficiency
10. Reasoning depth
11. Originality
12. Discrimination power
13. Possibility of multiple unintended answers
14. Possibility of guessing
15. Mathematical/logical correctness

Score every parameter from 0 to 100.
Identify every potential weakness. Do NOT approve the question merely because it is grammatically correct.
Decide on a status: "APPROVE", "REJECT", or "REVISE".
If the question is weak (status is REJECT or REVISE), rewrite it to make it strong, unambiguous, and mathematically/logically correct.

Format the output strictly as JSON following this structure:
{
  "status": "APPROVE" | "REJECT" | "REVISE",
  "scores": {
    "correctness": 85,
    "clarity": 90,
    "ambiguity": 95,
    "difficulty_accuracy": 80,
    "bloom_alignment": 85,
    "syllabus_alignment": 90,
    "marks_appropriateness": 95,
    "solving_time_appropriateness": 90,
    "information_sufficiency": 85,
    "reasoning_depth": 80,
    "originality": 75,
    "discrimination_power": 80,
    "unintended_answers_risk": 90,
    "guessing_resistance": 95,
    "mathematical_logical_correctness": 90
  },
  "weaknesses": [
    "Weakness description 1",
    "Weakness description 2"
  ],
  "detailed_reasons": "Detailed review notes explaining the decision...",
  "rewritten_question": "The complete rewritten question text (null if status is APPROVE)",
  "rewritten_answer_outline": "The updated expected answer outline for the rewritten question (null if status is APPROVE)"
}`;

    const inputData = `
--- EXAMINATION QUESTION UNDER REVIEW ---
QUESTION:
${question}

EXPECTED ANSWER:
${answer}

BLUEPRINT CONSTRAINTS:
${typeof blueprint === 'object' ? JSON.stringify(blueprint, null, 2) : blueprint}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model review response as JSON:', responseText);
      throw new Error('Question reviewer returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error reviewing question:', error);
    res.status(500).json({ error: 'Failed to review question. ' + error.message });
  }
});

app.post('/api/refine-question', async (req, res) => {
  try {
    const {
      question,
      answer,
      instructions,
      topic,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ error: 'Refinement instructions are required.' });
    }

    const systemPrompt = `You are an expert academic test designer.
Your task is to edit and refine an existing exam question and model answer outline strictly following the user's custom instructions.

Ensure the revised question is clear, unambiguous, academically rigorous, and includes a matching updated model solution outline.

Format the output strictly as JSON following this structure:
{
  "revised_question": "The updated question text after applying instructions",
  "revised_answer_outline": "The updated model solution outline corresponding to the revised question",
  "summary_of_changes": "Brief bulleted summary of modifications made"
}`;

    const inputData = `
--- ORIGINAL QUESTION & ANSWER ---
TOPIC: ${topic || 'General'}
QUESTION:
${question}

EXPECTED ANSWER OUTLINE:
${answer || 'None provided'}

--- USER REFINEMENT INSTRUCTIONS ---
${instructions}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model refinement response as JSON:', responseText);
      throw new Error('Question refiner returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error refining question:', error);
    res.status(500).json({ error: 'Failed to refine question. ' + error.message });
  }
});

app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const {
      topicName,
      moduleName,
      syllabusContext,
      count = 6,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    if (!topicName) {
      return res.status(400).json({ error: 'topicName is required to generate flashcards.' });
    }

    const systemPrompt = `You are an expert pedagogical test designer and active-recall specialist.
Your task is to generate a comprehensive, high-yield Flashcard Study Deck for the given academic topic.

Generate exactly ${count} distinct, high-impact flashcards covering:
1. Core Definition & First-Principles Intuition (type: "concept")
2. Mathematical Formula, Equations & Notation with variable meanings (type: "formula")
3. Comparative Distinction vs Adjacent / Confusing Concepts (type: "comparison")
4. Practical Real-World / Engineering Application Scenario (type: "application")
5. Common Exam Pitfall, Counter-Example or Misconception (type: "pitfall")
6. Key Algorithm Steps, Theorem or Deep Synthesis (type: "deep-dive")

MATHEMATICAL FORMATTING — STRICT RULES:
- ALL equations, formulas, powers, fractions, and symbols MUST be wrapped in standard LaTeX delimiters: $...$ for inline or $$...$$ for display equations.
- NEVER use escaped dollars like \\$. Use clean $...$ or $$...$$.
- Never write bare commands like \\lambda or \\implies outside of dollar delimiters.

Format the output strictly as JSON following this structure:
{
  "topic_name": "${topicName}",
  "module_name": "${moduleName || 'Curriculum'}",
  "summary": "1-2 sentence high-level overview of the topic for quick recall",
  "cards": [
    {
      "id": "card_1",
      "type": "concept",
      "category_label": "Core Definition",
      "title": "Short descriptive title of this card",
      "front": "Clear active-recall prompt or conceptual challenge question",
      "back": "Detailed, highly educational answer with formatted LaTeX formulas where relevant, clear steps, and key mechanisms.",
      "key_takeaway": "One-sentence high-impact punchline summary",
      "difficulty": "Easy",
      "tags": ["Core Concept", "Foundational"]
    }
  ]
}`;

    const inputData = `
--- TOPIC SPECIFICATION ---
TOPIC: ${topicName}
MODULE: ${moduleName || 'General'}

--- SYLLABUS CONTEXT ---
${typeof syllabusContext === 'object' ? JSON.stringify(syllabusContext, null, 2) : syllabusContext || 'None'}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse flashcard generator response as JSON:', responseText);
      throw new Error('Flashcard generator returned invalid JSON formatting. Please try again.');
    }

app.post('/api/evaluate-answer', upload.single('answerFile'), async (req, res) => {
  try {
    let answerText = req.body.answerText || '';
    const questionText = req.body.questionText || '';
    const modelAnswer = req.body.modelAnswer || '';
    const totalMarks = parseFloat(req.body.totalMarks) || 10;
    const modelName = req.body.modelName || 'gemini-3.6-flash';
    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    if (!questionText) {
      return res.status(400).json({ error: 'Question text is required for answer evaluation.' });
    }

    let imagePart = null;
    if (req.file) {
      const mime = req.file.mimetype;
      if (mime === 'application/pdf') {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          answerText = (answerText ? answerText + '\n\n' : '') + pdfData.text;
        } catch (pdfErr) {
          console.error('PDF parsing error in answer evaluation:', pdfErr);
          return res.status(400).json({ error: 'Failed to extract text from the uploaded PDF answer sheet.' });
        }
      } else if (mime.startsWith('image/')) {
        imagePart = {
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: mime
          }
        };
      }
    }

    if (!answerText && !imagePart) {
      return res.status(400).json({ error: 'Please provide student answer text or upload an answer sheet image/PDF.' });
    }

    const systemPrompt = `You are a fair, rigorous, and constructive university professor and answer script examiner.
Your task is to thoroughly evaluate the student's submitted answer against the official question and model answer outline.

GRADING PRINCIPLES:
1. Award proportional partial credit for correct steps, formulas, and reasoning.
2. Deduct marks specifically for conceptual errors, calculation mistakes, omissions, or invalid assumptions.
3. Max Marks for this question is: ${totalMarks}. Total score MUST be between 0 and ${totalMarks}.
4. Provide structured, constructive feedback that helps the student master the topic.
5. All mathematical formulas MUST be formatted with LaTeX standard delimiters ($...$ or $$...$$).

Format the output strictly as JSON following this structure:
{
  "total_score": 8.5,
  "max_marks": ${totalMarks},
  "percentage": 85,
  "overall_grade": "A" | "B" | "C" | "D" | "F",
  "summary": "2-3 sentence overview of student performance and conceptual grasp",
  "section_scores": [
    {
      "criterion": "Conceptual Clarity & Definition",
      "score": 3.5,
      "max": 4,
      "feedback": "Specific feedback on this step"
    },
    {
      "criterion": "Derivation & Mathematical Working",
      "score": 3,
      "max": 4,
      "feedback": "Specific feedback on calculations"
    },
    {
      "criterion": "Final Answer & Interpretation",
      "score": 2,
      "max": 2,
      "feedback": "Feedback on final result"
    }
  ],
  "strengths": ["List of what the student did well"],
  "weaknesses": ["List of exact errors or gaps in reasoning"],
  "improvement_tips": ["Actionable study suggestions to improve"],
  "detailed_annotated_feedback": "Comprehensive line-by-line examiner commentary"
}`;

    const promptText = `
--- QUESTION ---
${questionText}

--- MODEL ANSWER / SOLUTION OUTLINE ---
${modelAnswer || 'Use expert standard academic model solution for the question above.'}

--- STUDENT SUBMITTED ANSWER ---
${answerText || 'Please read the attached handwritten/typed answer image.'}
`;

    const userParts = [{ text: promptText }];
    if (imagePart) {
      userParts.unshift(imagePart);
    }

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: userParts }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse answer evaluator response as JSON:', responseText);
      throw new Error('Answer evaluator returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer. ' + error.message });
  }
});

app.post('/api/generate-variants', async (req, res) => {
  try {
    const {
      questionText,
      expectedAnswer,
      topic,
      marks = 10,
      difficulty = 'Medium',
      bloomLevel = 'Apply',
      variantCount = 4,
      modelName = 'gemini-3.6-flash'
    } = req.body;

    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    if (!questionText) {
      return res.status(400).json({ error: 'Original question text is required.' });
    }

    const systemPrompt = `You are an expert assessment variation specialist.
Your task is to generate ${variantCount} structurally distinct variations of an existing examination question.

VARIATION ARCHETYPES:
1. "Parameter & Context Shift": Same underlying theorem/algorithm, but with altered numerical values, dimensions, or variables.
2. "Inverse / Reverse Problem": Given the output or constraint, solve backwards for the initial parameters or conditions.
3. "Real-World Engineering Scenario": Wrap the core theoretical concept in a practical industry case study.
4. "Counter-Example / Edge Case Challenge": Test the boundary conditions where the standard formula or assumption fails.

MATHEMATICAL FORMATTING:
- Wrap all equations in $...$ (inline) or $$...$$ (display).
- NEVER use escaped \\$.

Format the output strictly as JSON following this structure:
{
  "original_question": "...",
  "topic": "${topic || 'General'}",
  "variants": [
    {
      "variant_id": "var_1",
      "variation_type": "Parameter & Context Shift",
      "description": "Explanation of how this variant tests the concept from a different angle",
      "question_text": "Complete question text...",
      "expected_answer_outline": "Step-by-step solution outline...",
      "difficulty": "${difficulty}",
      "bloom_level": "${bloomLevel}",
      "estimated_solving_time": 15
    }
  ]
}`;

    const inputData = `
--- ORIGINAL QUESTION ---
TOPIC: ${topic || 'General'}
MARKS: ${marks}
DIFFICULTY: ${difficulty}
BLOOM LEVEL: ${bloomLevel}

QUESTION:
${questionText}

MODEL ANSWER:
${expectedAnswer || 'None provided'}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse question variants response as JSON:', responseText);
      throw new Error('Variant generator returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error generating question variants:', error);
    res.status(500).json({ error: 'Failed to generate variants. ' + error.message });
  }
});

app.post('/api/analyze-paper', upload.single('paperFile'), async (req, res) => {
  try {
    let paperText = req.body.paperText || '';
    const syllabusContext = req.body.syllabusContext || null;
    const examName = req.body.examName || 'Previous Year Paper';
    const year = req.body.year || '2024';
    const modelName = req.body.modelName || 'gemini-3.6-flash';
    const clientApiKey = req.headers['x-api-key'];
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please configure it in Settings.' });
    }

    if (req.file) {
      const mime = req.file.mimetype;
      if (mime === 'application/pdf') {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          paperText = pdfData.text;
        } catch (pdfErr) {
          console.error('PDF parsing error in paper analyzer:', pdfErr);
          return res.status(400).json({ error: 'Failed to extract text from the uploaded exam paper PDF.' });
        }
      }
    }

    if (!paperText || !paperText.trim()) {
      return res.status(400).json({ error: 'Please upload a PDF or paste past year exam paper text.' });
    }

    const systemPrompt = `You are a high-level academic curriculum auditor and exam trend forecaster.
Your task is to analyze a previous year examination paper against the syllabus curriculum.

OBJECTIVES:
1. Extract every individual question with its question number, marks, and text.
2. Map each question to its corresponding syllabus module and topic.
3. Compute frequency analytics: which topics are repeatedly tested vs neglected.
4. Generate high-probability exam predictions for the upcoming test cycle based on exam cadence patterns.
5. Identify syllabus blind spots (topics present in curriculum that have 0 past questions).

Format the output strictly as JSON following this structure:
{
  "paper_info": {
    "title": "${examName} (${year})",
    "total_marks_extracted": 100,
    "total_questions_extracted": 10
  },
  "extracted_questions": [
    {
      "question_no": "1(a)",
      "question_text": "Exact or cleaned question text...",
      "marks": 5,
      "matched_module": "Module 1: Title",
      "matched_topic": "Topic Name",
      "difficulty": "Easy" | "Medium" | "Hard",
      "bloom_level": "Understand" | "Apply" | "Analyze",
      "conceptual_theme": "Core theme tested"
    }
  ],
  "topic_frequency": [
    {
      "topic_name": "Topic Name",
      "module_name": "Module Name",
      "questions_count": 2,
      "total_marks": 15,
      "weight_percentage": 15.0,
      "tested_cadence": "Repeated Every Year" | "Frequent" | "Occasional"
    }
  ],
  "high_probability_predictions": [
    {
      "topic_name": "Topic Name",
      "prediction_confidence": "High" | "Medium",
      "rationale": "Why this topic is likely to appear in the next exam",
      "predicted_question_prompt": "Suggested mock question prompt for students to prepare"
    }
  ],
  "untested_syllabus_blindspots": [
    {
      "topic_name": "Topic Name",
      "module_name": "Module Name",
      "risk_level": "High" | "Medium",
      "recommendation": "Why students should not skip this despite 0 past appearances"
    }
  ]
}`;

    const inputData = `
--- EXAMINATION PAPER TEXT ---
${paperText}

--- CURRENT SYLLABUS REFERENCE CONTEXT ---
${typeof syllabusContext === 'object' ? JSON.stringify(syllabusContext, null, 2) : syllabusContext || 'General academic curriculum'}
`;

    const { response } = await generateWithFallback(
      apiKey,
      modelName,
      [{ role: 'user', parts: [{ text: inputData }] }],
      systemPrompt,
      { timeout: 300000 }
    );

    const responseText = response.text();
    let parsedData;
    try {
      parsedData = robustJSONParse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse paper analysis response as JSON:', responseText);
      throw new Error('Paper analyzer returned invalid JSON formatting. Please try again.');
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Error analyzing paper:', error);
    res.status(500).json({ error: 'Failed to analyze previous year paper. ' + error.message });
  }
});

// Health check endpoint for Render and monitors
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if present
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Fallback to index.html for SPA client-side routes (non-API)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).send('Syllabus Analyzer API is running. Run npm run build in client to serve frontend.');
      }
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port} (0.0.0.0)`);
});

// Configure long timeouts for parsing large documents via AI
server.timeout = 600000; // 10 minutes
server.headersTimeout = 610000;
server.keepAliveTimeout = 600000;
